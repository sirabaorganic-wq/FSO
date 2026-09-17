const axios = require('axios');
const IORedis = require('ioredis');
const prisma = require('../config/prisma');

/**
 * Extracts authoritative shipping weight in kg from an item and its associated product.
 * Strictly adheres to Amendment 1:
 * - Metric mass only (grams/kilograms).
 * - Strictly NO volume-to-mass conversion (e.g. 1 L != 1 kg, 500 ml != 0.5 kg).
 * - Returns null if authoritative weight cannot be established.
 */
function extractAuthoritativeItemWeight(item, product) {
  if (typeof item.weight === 'number' && item.weight > 0) {
    return item.weight;
  }

  const specString = String(
    product?.packSize ||
    item?.variant ||
    item?.packSize ||
    ''
  ).trim().toLowerCase();

  if (specString) {
    // Explicit rejection of volume units per Amendment 1
    if (/(?:^|\s|\d)(?:ml|l|ltr|liter|liters|litre|litres)(?:\s|$)/i.test(specString)) {
      return null;
    }

    // Match kilograms: e.g. "1 kg", "1.5kg", "2 kilograms"
    const kgMatch = specString.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)(?:\s|$)/i);
    if (kgMatch) {
      const val = parseFloat(kgMatch[1]);
      if (val > 0) return val;
    }

    // Match grams: e.g. "500 g", "500g", "250 gm", "100 grams"
    const gMatch = specString.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)(?:\s|$)/i);
    if (gMatch) {
      const val = parseFloat(gMatch[1]);
      if (val > 0) return val / 1000;
    }
  }

  return null;
}

/**
 * Resolves authoritative packaging dimensions.
 * Strictly adheres to Amendment 2:
 * - Configured packaging dimensions only.
 * - No fake 10x10x10 defaults.
 * - Throws MISSING_PACKAGE_DIMENSIONS if unconfigured.
 */
async function getAuthoritativePackageDimensions(vendor) {
  // 1. Check vendor-specific packaging configuration
  if (vendor?.packagingDimensions && typeof vendor.packagingDimensions === 'object') {
    const { length, breadth, height } = vendor.packagingDimensions;
    if (Number(length) > 0 && Number(breadth) > 0 && Number(height) > 0) {
      return { length: Number(length), breadth: Number(breadth), height: Number(height) };
    }
  }

  // 2. Check site-wide configured shipping settings
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { key: 'shippingConfig' },
    });
    const config = settings?.value || {};
    if (config.packageDimensions && typeof config.packageDimensions === 'object') {
      const { length, breadth, height } = config.packageDimensions;
      if (Number(length) > 0 && Number(breadth) > 0 && Number(height) > 0) {
        return { length: Number(length), breadth: Number(breadth), height: Number(height) };
      }
    }
  } catch (err) {
    // Database query failed
  }

  const err = new Error('Configured packaging dimensions are unavailable');
  err.code = 'MISSING_PACKAGE_DIMENSIONS';
  throw err;
}

class ShiprocketService {
  constructor() {
    this.inMemoryToken = null;
    this.inMemoryTokenExpiry = 0;
    this.loginPromise = null; // Concurrency mutex for login
    this.inFlightShipments = new Map(); // Mutex for concurrent shipment creation (Scenario 13)

    // Safe Redis Initialization with error handler
    try {
      this.redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        retryStrategy() {
          return null; // Stop retrying if Redis is not available
        },
      });
      this.redis.on('error', () => {
        // Fallback silently to in-memory caching
      });
    } catch (e) {
      this.redis = null;
    }

    // Official Shiprocket Base API URL (sanitize /v1/payload -> /v1/external)
    let envBase = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
    if (envBase.includes('/v1/payload')) {
      envBase = envBase.replace('/v1/payload', '/v1/external');
    }
    this.baseUrl = envBase;

    // Universal Axios Instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Authenticates with Shiprocket API and caches the JWT token.
   * Concurrency-safe: simultaneous calls share a single in-flight promise.
   */
  async login() {
    // 1. Check in-memory cache
    if (this.inMemoryToken && Date.now() < this.inMemoryTokenExpiry) {
      return this.inMemoryToken;
    }

    // 2. Check Redis cache if connected
    if (this.redis && this.redis.status === 'ready') {
      try {
        const cachedToken = await this.redis.get('shiprocket_token');
        if (cachedToken) {
          this.inMemoryToken = cachedToken;
          this.inMemoryTokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000;
          return cachedToken;
        }
      } catch (redisErr) {
        // Ignore Redis error and proceed to API login
      }
    }

    // 3. Concurrency mutex: if login is already in flight, reuse promise
    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = (async () => {
      try {
        const response = await this.client.post('/auth/login', {
          email: process.env.SHIPROCKET_API_EMAIL,
          password: process.env.SHIPROCKET_API_PASSWORD,
        });

        const token = response.data?.token;
        if (!token) {
          throw new Error('No token returned from Shiprocket API');
        }

        this.inMemoryToken = token;
        this.inMemoryTokenExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000;

        if (this.redis && this.redis.status === 'ready') {
          try {
            await this.redis.set('shiprocket_token', token, 'EX', 8 * 24 * 60 * 60);
          } catch (e) {}
        }

        return token;
      } catch (error) {
        console.error('Shiprocket Auth Error:', error.response?.data || error.message);
        const err = new Error('Failed to authenticate with Shiprocket');
        err.code = 'SHIPROCKET_AUTH_FAILED';
        throw err;
      }
    })().finally(() => {
      this.loginPromise = null;
    });

    return this.loginPromise;
  }

  /**
   * Register Vendor Pickup Location with Shiprocket API
   * POST /settings/company/addpickup
   */
  async registerPickupLocation(vendor) {
    if (!vendor || !vendor.pickupAddress) {
      throw new Error('Vendor pickup address is required');
    }

    const addr = vendor.pickupAddress;
    if (!addr.pincode || !addr.addressLine1 || !addr.city || !addr.state) {
      throw new Error('Incomplete vendor pickup address: addressLine1, city, state, and pincode required');
    }

    const token = await this.login();

    const sanitizeName = (str) => (str || '').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30);
    const locationName =
      vendor.shiprocketPickupCode ||
      vendor.shiprocket_pickup_code ||
      addr.shiprocketLocationName ||
      `V_${sanitizeName(vendor.businessName)}_${String(vendor.id || vendor._id || '').substring(18)}`;

    const payload = {
      pickup_location: locationName,
      name: addr.contactPerson || vendor.contactPerson || vendor.businessName,
      email: vendor.email,
      phone: addr.phone || vendor.phone,
      address: addr.addressLine1,
      address_2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      country: addr.country || 'India',
      pin_code: String(addr.pincode).trim(),
    };

    try {
      const response = await this.client.post('/settings/company/addpickup', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return {
        success: true,
        locationName,
        shiprocketResponse: response.data,
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Shiprocket addpickup failed for vendor ${vendor.id || vendor._id}:`, error.response?.data || error.message);

      if (errorMsg && (errorMsg.includes('already exists') || errorMsg.includes('Location name already'))) {
        return {
          success: true,
          locationName,
          alreadyExists: true,
        };
      }

      return {
        success: false,
        locationName,
        error: errorMsg,
      };
    }
  }

  /**
   * Checks options and returns the best courier 
   */
  async checkServiceability({ pickup_postcode, delivery_postcode, weight, cod }) {
    if (typeof weight !== 'number' || weight <= 0) {
      const err = new Error('Valid numeric shipping weight is required');
      err.code = 'INVALID_SHIPPING_WEIGHT';
      throw err;
    }

    const token = await this.login();
    try {
      const response = await this.client.get('/courier/serviceability/', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          pickup_postcode,
          delivery_postcode,
          weight,
          cod: cod ? 1 : 0,
        },
      });

      const couriers = response.data.data?.available_courier_companies || [];
      if (couriers.length === 0) {
        throw new Error('No couriers available for this route');
      }

      couriers.sort((a, b) => {
        if (a.etd_hours !== b.etd_hours) return a.etd_hours - b.etd_hours;
        if (a.rating !== b.rating) return b.rating - a.rating;
        return a.rate - b.rate;
      });

      return couriers[0];
    } catch (error) {
      console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verifies if a pickup location name exists in the Shiprocket account
   */
  async verifyPickupLocation(locationName) {
    if (!locationName) {
      return { verified: false, reason: 'MISSING_LOCATION_NAME', message: 'Pickup location name is required' };
    }

    const token = await this.login();
    try {
      const response = await this.client.get('/settings/company/pickup', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const shippingAddresses = response.data?.data?.shipping_address || [];
      const recentAddresses = response.data?.data?.recent_addresses || [];
      const allAddresses = [
        ...(Array.isArray(shippingAddresses) ? shippingAddresses : []),
        ...(Array.isArray(recentAddresses) ? recentAddresses : [])
      ];

      const matched = allAddresses.find((addr) =>
        (addr.pickup_location || addr.location_name || addr.pickup_code || '').trim().toLowerCase() === locationName.trim().toLowerCase()
      );

      if (matched) {
        return {
          verified: true,
          locationName: matched.pickup_location || matched.location_name || locationName,
          locationId: matched.id || matched.address_id || null,
          verifiedAt: new Date(),
        };
      }

      return {
        verified: false,
        reason: 'PICKUP_LOCATION_NOT_REGISTERED',
        message: `Pickup location '${locationName}' is not registered in Shiprocket.`,
      };
    } catch (error) {
      console.error('Verify Pickup Location API error:', error.response?.data || error.message);
      return {
        verified: false,
        reason: 'SHIPROCKET_VERIFICATION_API_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Assign AWB Code for a created shipment
   */
  async assignAwb(shipmentId, courierId = null) {
    const token = await this.login();
    try {
      const payload = { shipment_id: String(shipmentId) };
      if (courierId) payload.courier_id = String(courierId);

      const response = await this.client.post('/courier/assign/awb', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data?.response?.data || response.data;
    } catch (error) {
      console.error('Shiprocket Assign AWB Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Request / Generate Pickup for a shipment
   */
  async generatePickup(shipmentId) {
    const token = await this.login();
    try {
      const response = await this.client.post('/courier/generate/pickup', {
        shipment_id: [String(shipmentId)],
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      console.error('Shiprocket Generate Pickup Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Translates FSO records to Shiprocket Payload to create an adhoc shipment.
   * Concurrency-safe & Idempotent (Scenario 13 & 14):
   * - Mutex per vendorOrderId prevents concurrent duplicate calls.
   * - Reuses existing shipmentId/shiprocketOrderId if present.
   * - Derives authoritative package weight & dimensions.
   */
  async createShipment(vendorOrder, order, vendor) {
    const vendorOrderId = String(vendorOrder?.id || vendorOrder?._id || '');

    // Scenario 13: Mutex for concurrent createShipment calls on the same VendorOrder
    if (vendorOrderId && this.inFlightShipments.has(vendorOrderId)) {
      return this.inFlightShipments.get(vendorOrderId);
    }

    const shipmentPromise = this._executeCreateShipment(vendorOrder, order, vendor)
      .finally(() => {
        if (vendorOrderId) {
          this.inFlightShipments.delete(vendorOrderId);
        }
      });

    if (vendorOrderId) {
      this.inFlightShipments.set(vendorOrderId, shipmentPromise);
    }

    return shipmentPromise;
  }

  async _executeCreateShipment(vendorOrder, order, vendor) {
    const token = await this.login();

    // 1. Authoritative Vendor Pickup Location Resolution
    const pickupLocation =
      vendor?.shiprocketPickupCode ||
      vendor?.shiprocket_pickup_code ||
      vendor?.pickupAddress?.shiprocketLocationName ||
      vendor?.shiprocketLocationName;

    if (!pickupLocation) {
      const err = new Error(`Vendor ${vendor?.businessName || vendor?.id || 'Unknown'} has no configured pickup location code`);
      err.code = 'PICKUP_LOCATION_NOT_REGISTERED';
      throw err;
    }

    // Verify location exists in Shiprocket account
    const verification = await this.verifyPickupLocation(pickupLocation);
    if (!verification.verified) {
      const err = new Error(verification.message || `Pickup location '${pickupLocation}' is not registered in Shiprocket.`);
      err.code = verification.reason || 'PICKUP_LOCATION_NOT_REGISTERED';
      throw err;
    }

    // 2. Idempotency & Safe Reuse (Scenario 14)
    // If shipmentId or shiprocketOrderId already exists, NEVER call /orders/create/adhoc again
    if (vendorOrder.shipmentId || vendorOrder.shiprocketOrderId) {
      const shipmentData = {
        shiprocketOrderId: String(vendorOrder.shiprocketOrderId || ''),
        shipmentId: String(vendorOrder.shipmentId || ''),
        awbCode: vendorOrder.awbCode || '',
        courierName: vendorOrder.courierName || '',
        courierId: vendorOrder.courierId || '',
        routingCode: vendorOrder.shippingRoutingCode || '',
        labelUrl: vendorOrder.trackingUrl || vendorOrder.labelUrl || '',
      };

      if (!shipmentData.awbCode && shipmentData.shipmentId) {
        try {
          const awbRes = await this.assignAwb(shipmentData.shipmentId);
          if (awbRes?.awb_code) {
            shipmentData.awbCode = awbRes.awb_code;
            shipmentData.courierName = awbRes.courier_name || awbRes.courier_company_id || '';
            shipmentData.courierId = String(awbRes.courier_company_id || '');
          }
        } catch (awbErr) {
          console.warn(`AWB assignment notice for shipment ${shipmentData.shipmentId}:`, awbErr.message);
        }
      }

      if (shipmentData.awbCode && shipmentData.shipmentId) {
        try {
          await this.generatePickup(shipmentData.shipmentId);
          shipmentData.pickupScheduled = true;
        } catch (pErr) {
          console.warn(`Pickup generation notice for shipment ${shipmentData.shipmentId}:`, pErr.message);
        }
      }

      return shipmentData;
    }

    // 3. Authoritative Package Weight Derivation (Amendment 1)
    const items = Array.isArray(vendorOrder.items) ? vendorOrder.items : [];
    if (items.length === 0) {
      const err = new Error('VendorOrder has no line items');
      err.code = 'EMPTY_LINE_ITEMS';
      throw err;
    }

    let totalWeight = 0;
    for (const item of items) {
      const qty = Number(item.quantity || item.units || 1);
      const unitWeight = extractAuthoritativeItemWeight(item, item.product || {});

      if (unitWeight === null || unitWeight <= 0) {
        const err = new Error(`Authoritative shipping weight missing for item: "${item.name || item.productId}"`);
        err.code = 'MISSING_PACKAGE_WEIGHT';
        throw err;
      }

      totalWeight += unitWeight * qty;
    }

    // 4. Authoritative Package Dimensions (Amendment 2)
    const dimensions = await getAuthoritativePackageDimensions(vendor);

    // 5. Authoritative Customer Shipping Address
    const shippingAddress =
      vendorOrder.shippingAddress ||
      order?.shippingAddress ||
      {};

    const cleanPostalCode = String(shippingAddress.postalCode || shippingAddress.pinCode || '').trim();
    const addressLine = String(shippingAddress.address || shippingAddress.street || '').trim();
    const city = String(shippingAddress.city || '').trim();
    const state = String(shippingAddress.state || '').trim();
    const country = String(shippingAddress.country || 'India').trim();

    const rawPhone = String(shippingAddress.phone || order?.user?.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 ? rawPhone : (rawPhone.length > 10 ? rawPhone.slice(-10) : '');

    const customerEmail = String(shippingAddress.email || order?.user?.email || order?.userEmail || order?.billingAddress?.email || '').trim();

    if (!addressLine || !city || !state || !cleanPostalCode || !cleanPhone || !customerEmail) {
      const err = new Error('Incomplete customer shipping address: address, city, state, postalCode, phone, and email are required');
      err.code = 'INCOMPLETE_SHIPPING_ADDRESS';
      throw err;
    }

    const isPrepaid = order?.isPaid === true || order?.paymentStatus === 'CAPTURED' || order?.paymentStatus === 'captured';
    const paymentMethod = isPrepaid ? 'Prepaid' : 'COD';

    // 6. Build Provider Payload
    const payload = {
      order_id: String(vendorOrder.id || vendorOrder._id || vendorOrder.vendorOrderNumber),
      order_date: new Date(vendorOrder.createdAt || Date.now()).toISOString().split('T')[0],
      pickup_location: verification.locationName || pickupLocation,
      billing_customer_name: shippingAddress.name || shippingAddress.fullName || order?.user?.name || 'Customer',
      billing_last_name: '',
      billing_address: addressLine,
      billing_city: city,
      billing_pincode: cleanPostalCode,
      billing_state: state,
      billing_country: country,
      billing_email: customerEmail,
      billing_phone: cleanPhone,
      shipping_is_billing: true,
      order_items: items.map((item) => ({
        name: item.name,
        sku: item.sku || 'SKU',
        units: Number(item.quantity || item.units || 1),
        selling_price: Number(item.price || 0),
        discount: 0,
      })),
      payment_method: paymentMethod,
      sub_total: Number(vendorOrder.subtotal || 0),
      length: dimensions.length,
      breadth: dimensions.breadth,
      height: dimensions.height,
      weight: Math.round(totalWeight * 1000) / 1000,
    };

    // 7. External Operation (Outside Prisma transaction per Amendment 5)
    try {
      const response = await this.client.post('/orders/create/adhoc', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = response.data;

      const shipmentData = {
        shiprocketOrderId: String(result.order_id || ''),
        shipmentId: String(result.shipment_id || ''),
        awbCode: result.awb_code || '',
        courierName: result.courier_name || '',
        courierId: result.courier_company_id ? String(result.courier_company_id) : '',
        routingCode: result.routing_code || '',
        labelUrl: result.label_url || '',
      };

      // Auto-assign AWB if not returned immediately
      if (!shipmentData.awbCode && shipmentData.shipmentId) {
        try {
          const awbRes = await this.assignAwb(shipmentData.shipmentId);
          if (awbRes?.awb_code) {
            shipmentData.awbCode = awbRes.awb_code;
            shipmentData.courierName = awbRes.courier_name || awbRes.courier_company_id || '';
            shipmentData.courierId = String(awbRes.courier_company_id || '');
          }
        } catch (awbErr) {
          console.warn(`Auto AWB assignment notice for shipment ${shipmentData.shipmentId}:`, awbErr.message);
        }
      }

      return shipmentData;
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'));
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;

      console.error('Shiprocket Create Shipment Error:', error.response?.data || error.message);
      const err = new Error(`Shiprocket order creation failed: ${errorMsg}`);
      err.code = isTimeout ? 'EXTERNAL_TIMEOUT' : (error.response?.status === 400 ? 'SHIPROCKET_ORDER_CREATE_FAILED' : 'SHIPROCKET_API_ERROR');
      err.response = error.response;
      throw err;
    }
  }

  /**
   * Cancel shipment using AWB Code
   */
  async cancelShipment(awbCode) {
    if (!awbCode) {
      throw new Error('AWB code is required to cancel a shipment');
    }

    const token = await this.login();
    try {
      const response = await this.client.post(
        '/orders/cancel/awb',
        { awbs: [String(awbCode)] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return {
        success: true,
        awbCode,
        data: response.data,
      };
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'));
      const errorMsg = error.response?.data?.message || error.message;
      console.error('Shiprocket Cancel Shipment Error:', errorMsg);

      const err = new Error(`Shiprocket shipment cancellation failed: ${errorMsg}`);
      err.code = isTimeout ? 'EXTERNAL_TIMEOUT' : 'SHIPROCKET_CANCEL_FAILED';
      throw err;
    }
  }

  /**
   * Track order by AWB
   */
  async trackOrder(awbCode) {
    if (!awbCode) {
      throw new Error('AWB code is required');
    }

    const token = await this.login();
    try {
      const response = await this.client.get(`/courier/track/awb/${encodeURIComponent(awbCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Track Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Helper export for unit testing weight derivation
   */
  _extractItemWeight(item, product) {
    return extractAuthoritativeItemWeight(item, product);
  }
}

module.exports = new ShiprocketService();
