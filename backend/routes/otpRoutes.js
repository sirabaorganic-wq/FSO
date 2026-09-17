const express = require("express");
const { default: rateLimit, ipKeyGenerator } = require("express-rate-limit");
const {
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
} = require("../controllers/otpController");

const router = express.Router();

// Rate limit OTP send endpoints per email/phone to prevent abuse
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 5 : 50, // Generous in development, secure in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many OTP requests from this email/phone. Please try again after 15 minutes.",
  },
  keyGenerator: (req, res) => {
    const email = req.body?.email;
    const phone = req.body?.phone;
    if (email) return email.toLowerCase();
    if (phone) return phone;
    // IPv6-safe fallback using helper from express-rate-limit
    return ipKeyGenerator(req, res);
  },
});

// Email OTP routes
router.post("/send-email", otpSendLimiter, sendEmailOTP);
router.post("/verify-email", verifyEmailOTP);

// Phone OTP routes
router.post("/send-phone", otpSendLimiter, sendPhoneOTP);
router.post("/verify-phone", verifyPhoneOTP);

module.exports = router;

