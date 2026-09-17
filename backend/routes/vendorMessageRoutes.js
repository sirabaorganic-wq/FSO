const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect, admin } = require("../middleware/authMiddleware");
const { protectVendor } = require("../middleware/vendorMiddleware");

// @desc    Get messages for logged in vendor
// @route   GET /api/vendor-messages/vendor
// @access  Private/Vendor
router.get("/vendor", protectVendor, async (req, res) => {
  try {
    const vendorId = req.vendor.id || req.vendor._id;
    const messages = await prisma.vendorMessage.findMany({
      where: { vendorId: String(vendorId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(messages.map(m => ({ ...m, _id: m.id, vendor: m.vendorId })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Send message from vendor
// @route   POST /api/vendor-messages/vendor
// @access  Private/Vendor
router.post("/vendor", protectVendor, async (req, res) => {
  const { message } = req.body;
  try {
    const vendorId = req.vendor.id || req.vendor._id;
    const newMessage = await prisma.vendorMessage.create({
      data: {
        vendorId: String(vendorId),
        sender: "vendor",
        message: message || "",
      },
    });

    const formatted = { ...newMessage, _id: newMessage.id, vendor: newMessage.vendorId };

    // Emit real-time update
    if (req.io) {
      req.io.to(`vendor_${vendorId}`).emit("receive_message", formatted);
    }

    res.status(201).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get messages for admin with a specific vendor
// @route   GET /api/vendor-messages/admin/:vendorId
// @access  Private/Admin
router.get("/admin/:vendorId", protect, admin, async (req, res) => {
  try {
    const messages = await prisma.vendorMessage.findMany({
      where: { vendorId: String(req.params.vendorId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(messages.map(m => ({ ...m, _id: m.id, vendor: m.vendorId })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Send message from admin to vendor
// @route   POST /api/vendor-messages/admin/:vendorId
// @access  Private/Admin
router.post("/admin/:vendorId", protect, admin, async (req, res) => {
  const { message } = req.body;
  try {
    const newMessage = await prisma.vendorMessage.create({
      data: {
        vendorId: String(req.params.vendorId),
        sender: "admin",
        message: message || "",
      },
    });

    const formatted = { ...newMessage, _id: newMessage.id, vendor: newMessage.vendorId };

    // Emit real-time update
    if (req.io) {
      req.io.to(`vendor_${req.params.vendorId}`).emit("receive_message", formatted);
    }

    res.status(201).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
