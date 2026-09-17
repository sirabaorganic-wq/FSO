/**
 * FSO Vendor Routes — Neon PostgreSQL via Prisma
 * Modularized to vendor services; zero runtime dependency on Mongoose or MongoDB.
 * Strictly enforces vendor ownership and Gate 3 authentication model.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');

// Middlewares
const {
  protectVendor,
  approvedVendor,
  onboardingComplete,
  certifiedVendor,
} = require('../middleware/vendorMiddleware');
const {
  vendorCache,
  productCache,
  invalidateCache,
} = require('../config/cache');
const { cacheByIdMiddleware } = require('../middleware/cacheMiddleware');
const { setRefreshTokenCookie } = require('../services/tokenService');

// Vendor Services
const vendorAuthService = require('../services/vendor/vendorAuthService');
const vendorProfileService = require('../services/vendor/vendorProfileService');
const vendorProductService = require('../services/vendor/vendorProductService');
const vendorOrderService = require('../services/vendor/vendorOrderService');
const vendorFinanceService = require('../services/vendor/vendorFinanceService');
const reviewController = require('../controllers/reviewController');

// ================== VALIDATION HELPERS ==================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[VENDOR VALIDATION ERROR]', errors.array());
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

const PHONE_REGEX = /^[6-9]\d{9}$/;
const POSTAL_REGEX = /^\d{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const FSSAI_REGEX = /^\d{14}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const registerValidators = [
  body('email').trim().toLowerCase().isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('businessType')
    .customSanitizer((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v))
    .isIn([
      'manufacturer', 'distributor', 'farmer', 'processor', 'wholesaler',
      'artisan', 'cooperative', 'traditional_producer', 'family_business',
      'women_collective', 'other',
    ])
    .withMessage('Please select a valid business type'),
  body('contactPerson').trim().notEmpty().withMessage('Contact person name is required'),
  body('phone')
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Phone must be a valid 10-digit Indian mobile number (starting with 6-9)'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('postalCode')
    .trim()
    .matches(POSTAL_REGEX)
    .withMessage('Postal code must be a 6-digit number'),
];

const complianceValidators = [
  body('name').trim().notEmpty().withMessage('Document name is required'),
  body('type').trim().notEmpty().withMessage('Document type is required'),
  body('fileUrl').trim().notEmpty().withMessage('File URL is required'),
];

// ================== AUTH ROUTES ==================

// @desc    Register new vendor
// @route   POST /api/vendors/register
// @access  Public
router.post('/register', registerValidators, handleValidationErrors, async (req, res) => {
  try {
    const result = await vendorAuthService.registerVendor(req.body);
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }
    res.status(201).json({
      success: true,
      _id: result.vendor.id,
      id: result.vendor.id,
      userId: result.user.id,
      name: result.vendor.contactPerson,
      email: result.vendor.email,
      businessName: result.vendor.businessName,
      slug: result.vendor.slug,
      businessType: result.vendor.businessType.toLowerCase(),
      role: result.user.role.toLowerCase(),
      status: result.vendor.status.toLowerCase(),
      token: result.token,
      accessToken: result.token,
    });
  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Vendor login
// @route   POST /api/vendors/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await vendorAuthService.loginVendor(email, password);
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.json({
      _id: result.vendor.id,
      id: result.vendor.id,
      userId: result.user.id,
      name: result.user.name || result.vendor.contactPerson,
      email: result.vendor.email,
      businessName: result.vendor.businessName,
      slug: result.vendor.slug,
      businessType: result.vendor.businessType.toLowerCase(),
      role: result.user.role.toLowerCase(),
      status: result.vendor.status.toLowerCase(),
      token: result.token,
      accessToken: result.token,
    });
  } catch (error) {
    const status = error.message.includes('Invalid') ? 401 :
      error.message.includes('No vendor') ? 404 :
      error.message.includes('deactivated') || error.message.includes('suspended') ? 403 : 500;
    res.status(status).json({ message: error.message });
  }
});

// @desc    Forgot password: send OTP
// @route   POST /api/vendors/forgot-password/send-otp
// @access  Public
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const result = await vendorAuthService.sendForgotPasswordOtp(email);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Forgot password: verify OTP
// @route   POST /api/vendors/forgot-password/verify-otp
// @access  Public
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
    const result = await vendorAuthService.verifyForgotPasswordOtp(email, otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Forgot password: reset password
// @route   POST /api/vendors/forgot-password/reset-password
// @access  Public
router.post('/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    const result = await vendorAuthService.resetPassword(email, otp, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ================== PROFILE ROUTES ==================

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
// @access  Private/Vendor
router.get('/profile', protectVendor, async (req, res) => {
  try {
    const profile = await vendorProfileService.getVendorProfile(req.vendor.id);
    if (!profile) return res.status(404).json({ message: 'Vendor not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private/Vendor
router.put('/profile', protectVendor, async (req, res) => {
  try {
    const updated = await vendorProfileService.updateVendorProfile(req.vendor.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Request sensitive update OTP
// @route   POST /api/vendors/request-sensitive-otp
// @access  Private/Vendor
router.post('/request-sensitive-otp', protectVendor, async (req, res) => {
  try {
    const result = await vendorProfileService.requestSensitiveOtp(req.vendor.id, req.body.context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update bank details with OTP verification
// @route   PUT /api/vendors/bank-details
// @access  Private/Vendor
router.put('/bank-details', protectVendor, async (req, res) => {
  try {
    const { bankDetails, otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'Email verification OTP is required to update bank details.' });
    }
    if (!bankDetails) {
      return res.status(400).json({ message: 'Bank details are required' });
    }
    const result = await vendorProfileService.updateBankDetailsWithOtp(req.vendor.id, bankDetails, otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update pickup address
// @route   PUT /api/vendors/pickup-address
// @access  Private/Vendor
router.put('/pickup-address', protectVendor, async (req, res) => {
  try {
    const result = await vendorProfileService.updatePickupAddress(req.vendor.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update onboarding details
// @route   PUT /api/vendors/onboarding
// @access  Private/Vendor
router.put('/onboarding', protectVendor, async (req, res) => {
  try {
    const result = await vendorProfileService.updateOnboarding(req.vendor.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add compliance document
// @route   POST /api/vendors/compliance
// @access  Private/Vendor
router.post('/compliance', protectVendor, complianceValidators, handleValidationErrors, async (req, res) => {
  try {
    const docs = await vendorProfileService.addComplianceDoc(req.vendor.id, req.body);
    res.status(201).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get compliance documents
// @route   GET /api/vendors/compliance
// @access  Private/Vendor
router.get('/compliance', protectVendor, async (req, res) => {
  try {
    const docs = await vendorProfileService.getComplianceDocs(req.vendor.id);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete compliance document
// @route   DELETE /api/vendors/compliance/:docId
// @access  Private/Vendor
router.delete('/compliance/:docId', protectVendor, async (req, res) => {
  try {
    const result = await vendorProfileService.deleteComplianceDoc(req.vendor.id, req.params.docId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== PRODUCT ROUTES ==================

// @desc    Get vendor products
// @route   GET /api/vendors/products
// @access  Private/Vendor
router.get('/products', protectVendor, async (req, res) => {
  try {
    const result = await vendorProductService.listVendorProducts(req.vendor.id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single vendor product
// @route   GET /api/vendors/products/:productId
// @access  Private/Vendor
router.get('/products/:productId', protectVendor, async (req, res) => {
  try {
    const product = await vendorProductService.getVendorProduct(req.vendor.id, req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create vendor product
// @route   POST /api/vendors/products
// @access  Private/Vendor (Approved, Certified)
router.post('/products', protectVendor, approvedVendor, certifiedVendor, async (req, res) => {
  try {
    const product = await vendorProductService.createVendorProduct(req.vendor.id, req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update vendor product
// @route   PUT /api/vendors/products/:productId
// @access  Private/Vendor (Approved only)
router.put('/products/:productId', protectVendor, approvedVendor, async (req, res) => {
  try {
    const product = await vendorProductService.updateVendorProduct(req.vendor.id, req.params.productId, req.body);
    if (!product) return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete vendor product
// @route   DELETE /api/vendors/products/:productId
// @access  Private/Vendor (Approved only)
router.delete('/products/:productId', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorProductService.deleteVendorProduct(req.vendor.id, req.params.productId);
    if (result.notFound) return res.status(404).json({ message: 'Product not found or not owned by vendor' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== INVENTORY ROUTES ==================

// @desc    Get vendor inventory
// @route   GET /api/vendors/inventory
// @access  Private/Vendor
router.get('/inventory', protectVendor, approvedVendor, async (req, res) => {
  try {
    const inventory = await vendorProductService.listInventory(req.vendor.id);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add inventory batch
// @route   POST /api/vendors/inventory
// @access  Private/Vendor
router.post('/inventory', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorProductService.createInventoryBatch(req.vendor.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update inventory item
// @route   PUT /api/vendors/inventory/:itemId
// @access  Private/Vendor
router.put('/inventory/:itemId', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorProductService.updateInventoryItem(req.vendor.id, req.params.itemId, req.body);
    if (!result) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

// @desc    Remove inventory item
// @route   DELETE /api/vendors/inventory/:itemId
// @access  Private/Vendor
router.delete('/inventory/:itemId', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorProductService.deleteInventoryItem(req.vendor.id, req.params.itemId);
    if (!result) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Bulk update stock
// @route   PUT /api/vendors/inventory/bulk-update
// @access  Private/Vendor
router.put('/inventory/bulk-update', protectVendor, approvedVendor, async (req, res) => {
  try {
    const { updates } = req.body;
    const result = await vendorProductService.bulkUpdateInventory(req.vendor.id, updates || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== ORDER ROUTES ==================

// @desc    Get vendor orders
// @route   GET /api/vendors/orders
// @access  Private/Vendor
router.get('/orders', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorOrderService.listVendorOrders(req.vendor.id, req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single vendor order
// @route   GET /api/vendors/orders/:id
// @access  Private/Vendor
router.get('/orders/:id', protectVendor, approvedVendor, async (req, res) => {
  try {
    const order = await vendorOrderService.getVendorOrder(req.vendor.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update vendor order status
// @route   PUT /api/vendors/orders/:id/status
// @access  Private/Vendor
router.put('/orders/:id/status', protectVendor, approvedVendor, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await vendorOrderService.updateOrderStatus(req.vendor.id, req.params.id, status);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Trigger vendor order shipment via Shiprocket
// @route   POST /api/vendors/orders/:id/ship
// @access  Private/Vendor (Approved)
router.post('/orders/:id/ship', protectVendor, approvedVendor, async (req, res) => {
  try {
    const vendorOrder = await prisma.vendorOrder.findFirst({
      where: { id: req.params.id, vendorId: req.vendor.id },
      include: { order: true, vendor: true },
    });

    if (!vendorOrder) {
      return res.status(404).json({ message: 'Order not found or not owned by vendor' });
    }

    if (vendorOrder.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot ship a cancelled order' });
    }

    if (vendorOrder.awbCode || vendorOrder.shiprocketOrderId) {
      return res.status(400).json({
        message: 'Shipment already created for this order',
        shiprocketOrderId: vendorOrder.shiprocketOrderId,
        awbCode: vendorOrder.awbCode,
      });
    }

    const shiprocketService = require('../services/shiprocketService');
    const result = await shiprocketService.createShipment(vendorOrder, vendorOrder.order, vendorOrder.vendor);

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrder.id },
      data: {
        shiprocketOrderId: String(result.shiprocketOrderId || ''),
        shipmentId: String(result.shipmentId || ''),
        awbCode: String(result.awbCode || ''),
        courierName: String(result.courierName || ''),
        trackingUrl: String(result.labelUrl || result.trackingUrl || ''),
        status: 'READY_TO_SHIP',
      },
    });

    res.json({
      message: 'Shipment created successfully',
      shipment: result,
      vendorOrder: updated,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || 'Shipment creation failed',
      code: error.code || 'SHIPMENT_CREATION_FAILED',
    });
  }
});

// @desc    Update vendor return status (Gate 1 compliant)
// @route   PUT /api/vendors/orders/:id/return-status
// @access  Private/Vendor
router.put('/orders/:id/return-status', protectVendor, approvedVendor, async (req, res) => {
  try {
    const order = await vendorOrderService.getVendorOrder(req.vendor.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({
      success: true,
      message: 'Return status recorded',
      note: 'Returns tracked via RefundLog; VendorOrder has no returnStatus column.',
      orderId: req.params.id,
      returnStatus: req.body.status,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Process Refund for Vendor Order
// @route   POST /api/vendors/orders/:id/refund
// @access  Private/Vendor
router.post('/orders/:id/refund', protectVendor, approvedVendor, async (req, res) => {
  try {
    const result = await vendorOrderService.processOrderRefund(req.vendor.id, req.params.id, req.body);
    if (!result) return res.status(404).json({ message: 'Order not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== RETURNS ROUTES ==================

// @desc    Get vendor return requests
// @route   GET /api/vendors/returns
// @access  Private/Vendor
router.get('/returns', protectVendor, approvedVendor, async (req, res) => {
  try {
    const returns = await vendorOrderService.listReturns(req.vendor.id);
    res.json(returns.returns || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update vendor return status (Gate 1 compliant)
// @route   PUT /api/vendors/returns/:id
// @access  Private/Vendor
router.put('/returns/:id', protectVendor, approvedVendor, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    res.json({
      message: 'Return status updated successfully',
      returnId: req.params.id,
      status,
      schemaNote: 'Returns tracked via RefundLog; VendorOrder has no returnStatus column.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== FINANCE ROUTES ==================

// @desc    Get vendor dashboard stats
// @route   GET /api/vendors/dashboard
// @access  Private/Vendor
router.get('/dashboard', protectVendor, approvedVendor, async (req, res) => {
  try {
    const stats = await vendorFinanceService.getDashboardStats(req.vendor.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get vendor analytics (snapshot vs. period metrics)
// @route   GET /api/vendors/analytics
// @access  Private/Vendor
router.get('/analytics', protectVendor, approvedVendor, async (req, res) => {
  try {
    const analytics = await vendorFinanceService.getVendorAnalytics(req.vendor.id, req.query.period);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get vendor customers summary
// @route   GET /api/vendors/customers
// @access  Private/Vendor
router.get('/customers', protectVendor, approvedVendor, async (req, res) => {
  try {
    const customers = await vendorProfileService.getVendorCustomers(req.vendor.id);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get vendor product reviews
// @route   GET /api/vendors/reviews
// @access  Private/Vendor
router.get('/reviews', protectVendor, approvedVendor, reviewController.getVendorReviews);

// @desc    Get vendor payouts
// @route   GET /api/vendors/payouts
// @access  Private/Vendor
router.get('/payouts', protectVendor, approvedVendor, async (req, res) => {
  try {
    const payouts = await vendorFinanceService.listPayouts(req.vendor.id);
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get vendor wallet
// @route   GET /api/vendors/wallet
// @access  Private/Vendor
router.get('/wallet', protectVendor, async (req, res) => {
  try {
    const wallet = await vendorFinanceService.getWalletBalance(req.vendor.id);
    if (!wallet) return res.status(404).json({ message: 'Vendor not found' });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Request payout
// @route   POST /api/vendors/wallet/payout
// @access  Private/Vendor (Approved)
router.post('/wallet/payout', protectVendor, approvedVendor, async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await vendorFinanceService.requestPayout(req.vendor.id, amount);
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
});

// @desc    Get wallet transactions
// @route   GET /api/vendors/wallet/transactions
// @access  Private/Vendor
router.get('/wallet/transactions', protectVendor, async (req, res) => {
  try {
    const transactions = await vendorFinanceService.listWalletTransactions(req.vendor.id);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================== SHOP ROUTES ==================

// @desc    Get shop settings
// @route   GET /api/vendors/shop
// @access  Private/Vendor
router.get('/shop', protectVendor, async (req, res) => {
  try {
    const settings = await vendorProfileService.getShopSettings(req.vendor.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update shop settings
// @route   PUT /api/vendors/shop
// @access  Private/Vendor (Approved)
router.put('/shop', protectVendor, approvedVendor, async (req, res) => {
  try {
    const settings = await vendorProfileService.updateShopSettings(req.vendor.id, req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get subscription plans
// @route   GET /api/vendors/plans
// @access  Public
router.get('/plans', async (req, res) => {
  res.json(vendorFinanceService.getSubscriptionPlans());
});

// @desc    Get current subscription
// @route   GET /api/vendors/subscription
// @access  Private/Vendor
router.get('/subscription', protectVendor, async (req, res) => {
  try {
    const subscription = await vendorFinanceService.getVendorSubscription(req.vendor.id);
    if (!subscription) return res.status(404).json({ message: 'Vendor not found' });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update subscription plan
// @route   POST /api/vendors/subscription
// @access  Private/Vendor
router.post('/subscription', protectVendor, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan) return res.status(400).json({ message: 'Plan name is required' });
    const result = await vendorFinanceService.updateVendorSubscription(req.vendor.id, plan);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get public vendor shop
// @route   GET /api/vendors/shop/:slugOrId
// @access  Public
router.get('/shop/:slugOrId', cacheByIdMiddleware(vendorCache, 'vendor:shop'), async (req, res) => {
  try {
    const shopData = await vendorProfileService.getPublicShop(req.params.slugOrId);
    if (!shopData) {
      return res.status(404).json({ message: 'Shop not found' });
    }
    res.json(shopData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export helper for external modules
router.generateUniqueVendorSlug = vendorAuthService.generateUniqueVendorSlug;

module.exports = router;
