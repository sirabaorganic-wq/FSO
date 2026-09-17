const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/razorpayWebhook');
const { rawBodyMiddleware } = require('../middleware/rawBody');

// WARNING: This route uses raw body parsing middleware BEFORE express.json()
// is applied at the application level.

// @desc    Razorpay Webhook Endpoint
// @route   POST /webhooks/razorpay
// @access  Public (verified via signature)
router.post('/', rawBodyMiddleware, handleWebhook);

module.exports = router;
