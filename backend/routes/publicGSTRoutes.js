const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protect } = require('../middleware/authMiddleware');
const { protectVendor } = require('../middleware/vendorMiddleware');

/**
 * Public GST Settings Routes
 * For users to check if GST is enabled and get GST info
 */

// @desc    Get public GST settings (for everyone)
// @route   GET /api/gst/settings
// @access  Public
router.get('/settings', async (req, res) => {
    try {
        let settings = await prisma.gSTSettings.findFirst();
        if (!settings) {
            settings = await prisma.gSTSettings.create({
                data: {
                    legalName: "Flash Sales Online Private Limited",
                    tradeName: "Flash Sales Online",
                    gstin: null,
                    addressState: "Uttarakhand",
                },
            });
        }

        res.json({
            gst_enabled: Boolean(settings.gstin),
            default_gst_percentage: 5,
            admin_gst_number: settings.gstin || null,
            company_name: settings.tradeName || settings.legalName,
        });
    } catch (error) {
        console.error('Error fetching public GST settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user GST claim status
// @route   PUT /api/gst/claim/user
// @access  Private (User)
router.put('/claim/user', protect, async (req, res) => {
    try {
        const { claim_gst, user_gst_number } = req.body;

        if (claim_gst === undefined) {
            return res.status(400).json({ message: 'claim_gst field is required' });
        }

        const userId = req.user.id || req.user._id;
        const user = await prisma.user.findUnique({ where: { id: String(userId) } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            message: `GST ${claim_gst ? 'claimed' : 'unclaimed'} successfully`,
            claim_gst: Boolean(claim_gst),
            gst_claimed_at: claim_gst ? new Date() : null,
            user_gst_number: user_gst_number || null,
        });
    } catch (error) {
        console.error('Error updating user GST claim:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update vendor GST claim status
// @route   PUT /api/gst/claim/vendor
// @access  Private (Vendor)
router.put('/claim/vendor', protectVendor, async (req, res) => {
    try {
        const { claim_gst } = req.body;

        if (claim_gst === undefined) {
            return res.status(400).json({ message: 'claim_gst field is required' });
        }

        const vendorId = req.vendor.id || req.vendor._id;
        const vendor = await prisma.vendor.findUnique({ where: { id: String(vendorId) } });
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.json({
            success: true,
            message: `GST ${claim_gst ? 'claimed' : 'unclaimed'} successfully`,
            claim_gst: Boolean(claim_gst),
            gst_claimed_at: claim_gst ? new Date() : null,
        });
    } catch (error) {
        console.error('Error updating vendor GST claim:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user's GST claim status
// @route   GET /api/gst/claim/user
// @access  Private (User)
router.get('/claim/user', protect, async (req, res) => {
    try {
        res.json({
            claim_gst: false,
            gst_claimed_at: null,
            user_gst_number: null,
        });
    } catch (error) {
        console.error('Error fetching user GST claim:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get vendor's GST claim status
// @route   GET /api/gst/claim/vendor
// @access  Private (Vendor)
router.get('/claim/vendor', protectVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const vendor = await prisma.vendor.findUnique({
            where: { id: String(vendorId) },
            select: { gstNumber: true },
        });

        res.json({
            claim_gst: Boolean(vendor?.gstNumber),
            gst_claimed_at: null,
            gstNumber: vendor?.gstNumber || null,
        });
    } catch (error) {
        console.error('Error fetching vendor GST claim:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
