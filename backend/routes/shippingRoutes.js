const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');
const shiprocketService = require('../services/shiprocketService');

/**
 * Default shipping config used when SiteSettings has no shippingConfig doc yet.
 */
const DEFAULT_SHIPPING_CONFIG = {
  freeShippingThreshold: 499,
  thresholdScope: 'PER_VENDOR_ORDER',
  belowThresholdMode: 'CUSTOMER_PAYS',
  platformHandlingFeeFlat: 25,
  platformHandlingFeePercent: 5,
  codSurcharge: 40,
  flatRateFallback: 70,
  weightPerItem: 0.5,
  isEnabled: true,
};

/**
 * Load shipping config from DB or fall back to defaults.
 */
async function getShippingConfig() {
  try {
    const settings = await prisma.siteSettings.findFirst({ where: { type: 'home' } });
    if (settings?.shippingConfig && typeof settings.shippingConfig === 'object') {
      return { ...DEFAULT_SHIPPING_CONFIG, ...settings.shippingConfig };
    }
  } catch (err) {
    console.error('Failed to load SiteSettings for shipping:', err.message);
  }
  return { ...DEFAULT_SHIPPING_CONFIG };
}

/**
 * Core vendor-wise shipping estimation logic.
 * Applied per vendor fulfillment group, NOT blindly against the parent cart total.
 *
 * @param {Array}  cartItems       - [{ product: String, quantity: Number, price: Number }]
 * @param {String} deliveryPincode - Customer's postal code
 * @param {String} paymentMethod   - 'ONLINE' | 'COD'
 */
async function calculateShipping(cartItems, deliveryPincode, paymentMethod = 'ONLINE') {
  const config = await getShippingConfig();

  if (!config.isEnabled) {
    return {
      totalShipping: 0,
      isFreeShipping: true,
      freeShippingThreshold: config.freeShippingThreshold,
      amountToFreeShipping: 0,
      codSurcharge: 0,
      vendorBreakdown: [],
      _note: 'Shipping charges disabled by admin',
    };
  }

  // 1. Fetch products with vendor details from PostgreSQL
  const productIds = cartItems.map(item => String(item.product || item.productId));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { vendor: true },
  });

  // 2. Group items into Vendor Fulfillment Groups
  const vendorGroupMap = new Map();

  for (const cartItem of cartItems) {
    const targetId = String(cartItem.product || cartItem.productId);
    const product = products.find(p => p.id === targetId);
    if (!product) continue;

    const unitPrice = cartItem.price || product.price;
    const itemTotal = unitPrice * cartItem.quantity;

    const vendorId = (product.isVendorProduct && product.vendor)
      ? product.vendor.id
      : '__platform__';

    if (!vendorGroupMap.has(vendorId)) {
      const vendorName = vendorId === '__platform__'
        ? 'FSO Direct'
        : (product.vendor.businessName || 'Vendor');

      const pickupPincode = vendorId === '__platform__'
        ? null
        : (product.vendor.addressPostalCode || product.vendor.pickupPincode);

      vendorGroupMap.set(vendorId, {
        vendorId,
        vendorName,
        pickupPincode,
        items: [],
        vendorSubtotal: 0,
        totalWeight: 0,
      });
    }

    const group = vendorGroupMap.get(vendorId);
    group.items.push({
      productId: product.id,
      name: product.name,
      quantity: cartItem.quantity,
      price: unitPrice,
      weight: config.weightPerItem * cartItem.quantity,
    });
    group.vendorSubtotal += itemTotal;
    group.totalWeight += config.weightPerItem * cartItem.quantity;
  }

  // 3. Process each Vendor Fulfillment Group independently
  const vendorBreakdown = [];
  let totalCustomerShipping = 0;
  const isCOD = paymentMethod === 'COD';

  for (const [, group] of vendorGroupMap) {
    let courierRate = config.flatRateFallback;
    let courierName = 'Standard Delivery';
    let estimatedDays = '3-5 days';

    // Query Shiprocket serviceability if pincodes available
    if (group.pickupPincode && deliveryPincode) {
      try {
        const courier = await shiprocketService.checkServiceability({
          pickup_postcode: String(group.pickupPincode).trim(),
          delivery_postcode: String(deliveryPincode).trim(),
          weight: group.totalWeight > 0 ? group.totalWeight : 0.5,
          cod: isCOD,
        });

        if (courier) {
          courierRate = courier.rate || config.flatRateFallback;
          courierName = courier.courier_name || 'Standard Delivery';
          estimatedDays = courier.etd || '3-5 days';
        }
      } catch (err) {
        console.error(`Shipping estimate failed for vendor ${group.vendorName}:`, err.message);
        courierRate = config.flatRateFallback;
        courierName = 'Standard Delivery (est.)';
        estimatedDays = '5-7 days';
      }
    } else {
      courierRate = config.flatRateFallback;
    }

    // Calculate platform handling fee & total estimated logistics cost
    const handlingFee = Math.round(
      config.platformHandlingFeeFlat + (courierRate * config.platformHandlingFeePercent / 100)
    );
    const estimatedShippingCost = Math.round(courierRate + handlingFee);

    // Apply PER_VENDOR_ORDER free shipping threshold rule
    const isFreeShippingEligible = (group.vendorSubtotal >= config.freeShippingThreshold);
    const customerShippingCharge = isFreeShippingEligible ? 0 : estimatedShippingCost;
    const shippingSubsidy = Math.max(0, estimatedShippingCost - customerShippingCharge);
    const amountToFreeShipping = isFreeShippingEligible
      ? 0
      : Math.max(0, config.freeShippingThreshold - group.vendorSubtotal);

    totalCustomerShipping += customerShippingCharge;

    vendorBreakdown.push({
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      vendorSubtotal: Math.round(group.vendorSubtotal * 100) / 100,
      threshold: config.freeShippingThreshold,
      isFreeShippingEligible,
      courierRate: Math.round(courierRate),
      handlingFee,
      estimatedShippingCost,
      customerShippingCharge,
      shippingSubsidy,
      amountToFreeShipping: Math.round(amountToFreeShipping * 100) / 100,
      courierName,
      estimatedDays,
    });
  }

  // 4. Add COD surcharge if applicable
  const codSurcharge = isCOD ? config.codSurcharge : 0;
  totalCustomerShipping += codSurcharge;

  return {
    totalShipping: Math.round(totalCustomerShipping),
    isFreeShipping: totalCustomerShipping === 0,
    freeShippingThreshold: config.freeShippingThreshold,
    codSurcharge,
    vendorBreakdown,
  };
}

// ─── ROUTE: POST /api/shipping/estimate ───────────────────────
// @desc    Calculate vendor-wise shipping charges for a cart + delivery address
// @access  Private (logged-in users)
router.post('/estimate', protect, async (req, res) => {
  try {
    const { cartItems, deliveryPincode, paymentMethod } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (!deliveryPincode) {
      return res.status(400).json({ message: 'Delivery pincode is required' });
    }

    const result = await calculateShipping(cartItems, deliveryPincode, paymentMethod);
    res.json(result);
  } catch (error) {
    console.error('Shipping Estimate Error:', error);
    res.status(500).json({ message: 'Failed to estimate shipping', error: error.message });
  }
});

module.exports = router;
module.exports.calculateShipping = calculateShipping;
module.exports.getShippingConfig = getShippingConfig;
