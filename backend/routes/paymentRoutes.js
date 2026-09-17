const express = require('express');
const router = express.Router();
const { protect, admin, apiLimiter } = require('../middleware/authMiddleware'); // Wait, apiLimiter is in securityMiddleware usually. 
// We will import it from securityMiddleware to be accurate based on previous check
const { apiLimiter: apiRateLimit } = require('../middleware/securityMiddleware');
const paymentController = require('../controllers/paymentController');

// Define a stricter rate limiter specifically for creating payments
const rateLimit = require('express-rate-limit');
const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 payment initiation requests per minute per IP
    message: { message: "Too many payment attempts, please try again after a minute." }
});

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private
router.post('/create-order', protect, paymentLimiter, paymentController.createOrder);

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payment/verify
// @access  Private
router.post('/verify', protect, paymentController.verifyPayment);

// @desc    Get Payment Status by Order ID
// @route   GET /api/payment/status/:orderId
// @access  Private
router.get('/status/:orderId', protect, paymentController.getPaymentStatus);

// Note: Refund route can stay in refundRoutes.js or be moved here. 
// For now, keeping the interface clean based on plan.

module.exports = router;
