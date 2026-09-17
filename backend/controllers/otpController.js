/**
 * FSO OTP Controller - Prisma ORM (Neon PostgreSQL)
 */

const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { generateOTP } = require("../utils/otpUtils");
const { sendOTPEmail } = require("../utils/emailService");
const { sendOTPSMS } = require("../utils/smsService");

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;

// Helper to create or replace an OTP entry in PostgreSQL
const createOrReplaceOtp = async (identifier, type, plainOtp) => {
  const normalizedIdentifier =
    type === "email" ? identifier.toLowerCase().trim() : identifier.trim();

  const hashedOtp = await bcrypt.hash(plainOtp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // Replace any existing OTP for this identifier/type
  await prisma.oTP.deleteMany({
    where: { identifier: normalizedIdentifier, type },
  });

  await prisma.oTP.create({
    data: {
      identifier: normalizedIdentifier,
      otp: hashedOtp,
      type,
      attempts: 0,
      expiresAt,
    },
  });
};

// Send OTP to email
const sendEmailOTP = async (req, res) => {
  try {
    const { email, context } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOTP();

    await createOrReplaceOtp(email, "email", otp);
    await sendOTPEmail(email, otp, context || "email verification");

    res.status(200).json({
      message: "OTP sent to email successfully",
    });
  } catch (error) {
    console.error("sendEmailOTP error:", error);
    res.status(500).json({ message: "Failed to send OTP email" });
  }
};

// Verify OTP for email
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const identifier = email.toLowerCase().trim();
    const otpDoc = await prisma.oTP.findFirst({
      where: { identifier, type: "email" },
    });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      if (otpDoc) {
        await prisma.oTP.delete({ where: { id: otpDoc.id } });
      }
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    if (otpDoc.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.oTP.delete({ where: { id: otpDoc.id } });
      return res.status(400).json({
        message: "Maximum verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isMatch = await bcrypt.compare(otp, otpDoc.otp);

    if (!isMatch) {
      await prisma.oTP.update({
        where: { id: otpDoc.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await prisma.oTP.delete({ where: { id: otpDoc.id } });

    res.status(200).json({
      message: "Email OTP verified successfully",
    });
  } catch (error) {
    console.error("verifyEmailOTP error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

// Send OTP to phone via SMS
const sendPhoneOTP = async (req, res) => {
  try {
    const { phone, context } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const otp = generateOTP();

    await createOrReplaceOtp(phone, "phone", otp);
    await sendOTPSMS(phone, otp, context || "phone verification");

    res.status(200).json({
      message: "OTP sent to phone successfully",
    });
  } catch (error) {
    console.error("sendPhoneOTP error:", error);
    res.status(500).json({ message: "Failed to send OTP SMS" });
  }
};

// Verify OTP for phone
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const identifier = phone.trim();
    const otpDoc = await prisma.oTP.findFirst({
      where: { identifier, type: "phone" },
    });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      if (otpDoc) {
        await prisma.oTP.delete({ where: { id: otpDoc.id } });
      }
      return res.status(400).json({ message: "OTP is invalid or has expired" });
    }

    if (otpDoc.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.oTP.delete({ where: { id: otpDoc.id } });
      return res.status(400).json({
        message: "Maximum verification attempts exceeded. Please request a new OTP.",
      });
    }

    const isMatch = await bcrypt.compare(otp, otpDoc.otp);

    if (!isMatch) {
      await prisma.oTP.update({
        where: { id: otpDoc.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await prisma.oTP.delete({ where: { id: otpDoc.id } });

    res.status(200).json({
      message: "Phone OTP verified successfully",
    });
  } catch (error) {
    console.error("verifyPhoneOTP error:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

module.exports = {
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
};
