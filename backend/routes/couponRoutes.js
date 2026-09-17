const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect, admin } = require("../middleware/authMiddleware");

// @desc    Create coupon
// @route   POST /api/coupons and /api/v1/coupons
// @access  Private/Admin
router.post("/", protect, admin, async (req, res) => {
  try {
    const { code, discountType = "PERCENTAGE", discountValue, validUntil, usageLimit, description, minOrderValue, maxDiscount } = req.body;

    if (!code || discountValue === undefined) {
      return res.status(400).json({ message: "Code and discountValue are required" });
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return res.status(400).json({ message: "Coupon already exists" });
    }

    const dType = (discountType || "PERCENTAGE").toUpperCase();

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType: dType === "FIXED" ? "FIXED" : "PERCENTAGE",
        discountValue: Number(discountValue),
        minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: usageLimit ? parseInt(usageLimit) : 100,
      },
    });

    res.status(201).json({ ...coupon, _id: coupon.id });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all coupons
// @route   GET /api/coupons and /api/v1/coupons
// @access  Private/Admin
router.get("/", protect, admin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(coupons.map((c) => ({ ...c, _id: c.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (coupon) {
      await prisma.coupon.delete({ where: { id: req.params.id } });
      res.json({ message: "Coupon removed" });
    } else {
      res.status(404).json({ message: "Coupon not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get available coupons for the logged-in user
// @route   GET /api/coupons/available
// @access  Private
router.get("/available", protect, async (req, res) => {
  try {
    const currentDate = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validUntil: { gt: currentDate },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(coupons.map((c) => ({ ...c, _id: c.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Validate and Apply Coupon
// @route   POST /api/coupons/validate
// @access  Private
router.post("/validate", protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: "Coupon is inactive" });
    }

    if (coupon.validUntil && new Date() > coupon.validUntil) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    res.json({
      code: coupon.code,
      discountType: coupon.discountType.toLowerCase(),
      discountValue: coupon.discountValue,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
