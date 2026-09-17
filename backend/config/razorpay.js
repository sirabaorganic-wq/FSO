/**
 * Centralized Razorpay Client
 * Single source of truth for the Razorpay SDK instance.
 *
 * SECURITY: Keys are ONLY read from process.env — never hardcoded.
 * This module validates that both keys are set at startup.
 */

const Razorpay = require('razorpay');

// Validate required env vars on startup  
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!KEY_ID || !KEY_SECRET) {
  throw new Error(
    '[Razorpay] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables. ' +
    'Never hardcode credentials in source code.'
  );
}

// Single shared Razorpay client instance
const razorpayClient = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

module.exports = razorpayClient;
