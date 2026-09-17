const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect, admin } = require("../middleware/authMiddleware");

// @desc    Create new inquiry
// @route   POST /api/inquiries and /api/v1/inquiries
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
      },
    });
    res.status(201).json({ ...inquiry, _id: inquiry.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all inquiries
// @route   GET /api/inquiries and /api/v1/inquiries
// @access  Private/Admin
router.get("/", protect, admin, async (req, res) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(inquiries.map((i) => ({ ...i, _id: i.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update inquiry status
// @route   PUT /api/inquiries/:id/status
// @access  Private/Admin
router.put("/:id/status", protect, admin, async (req, res) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (inquiry) {
      const updated = await prisma.inquiry.update({
        where: { id: req.params.id },
        data: { status: req.body.status || inquiry.status },
      });
      res.json({ ...updated, _id: updated.id });
    } else {
      res.status(404).json({ message: "Inquiry not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete inquiry
// @route   DELETE /api/inquiries/:id
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } });
    if (inquiry) {
      await prisma.inquiry.delete({ where: { id: req.params.id } });
      res.json({ message: "Inquiry removed" });
    } else {
      res.status(404).json({ message: "Inquiry not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
