const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protect, admin } = require('../middleware/authMiddleware');

/**
 * GST Settings Management Routes (Admin Only)
 */

async function getOrCreateGSTSettings() {
    let settings = await prisma.gSTSettings.findFirst();
    if (!settings) {
        settings = await prisma.gSTSettings.create({
            data: {
                legalName: "Flash Sales Online Private Limited",
                tradeName: "Flash Sales Online",
                gstin: null,
                addressState: "Uttarakhand",
                taxSlabs: {
                    gst_enabled: true,
                    default_gst_percentage: 5,
                    category_gst_rates: [],
                },
            },
        });
    }
    return settings;
}

// @desc    Get GST settings
// @route   GET /api/admin/gst-settings
// @access  Private/Admin
router.get('/gst-settings', protect, admin, async (req, res) => {
    try {
        const settings = await getOrCreateGSTSettings();
        const taxSlabs = (settings.taxSlabs && typeof settings.taxSlabs === 'object') ? settings.taxSlabs : {};
        res.json({
            _id: settings.id,
            id: settings.id,
            legalName: settings.legalName,
            tradeName: settings.tradeName,
            gstin: settings.gstin,
            admin_gst_number: settings.gstin,
            addressState: settings.addressState,
            gst_enabled: taxSlabs.gst_enabled !== false,
            default_gst_percentage: taxSlabs.default_gst_percentage || 5,
            category_gst_rates: taxSlabs.category_gst_rates || [],
        });
    } catch (error) {
        console.error('Error fetching GST settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update GST settings
// @route   PUT /api/admin/gst-settings
// @access  Private/Admin
router.put('/gst-settings', protect, admin, async (req, res) => {
    try {
        const {
            gst_enabled,
            default_gst_percentage,
            admin_gst_number,
            company_name,
            company_address,
            category_gst_rates
        } = req.body;

        const current = await getOrCreateGSTSettings();
        const currentSlabs = (current.taxSlabs && typeof current.taxSlabs === 'object') ? current.taxSlabs : {};

        const updatedSlabs = {
            ...currentSlabs,
            gst_enabled: gst_enabled !== undefined ? gst_enabled : currentSlabs.gst_enabled,
            default_gst_percentage: default_gst_percentage !== undefined ? default_gst_percentage : currentSlabs.default_gst_percentage,
            category_gst_rates: category_gst_rates !== undefined ? category_gst_rates : currentSlabs.category_gst_rates,
        };

        const updated = await prisma.gSTSettings.update({
            where: { id: current.id },
            data: {
                tradeName: company_name || current.tradeName,
                gstin: admin_gst_number !== undefined ? admin_gst_number : current.gstin,
                taxSlabs: updatedSlabs,
            },
        });

        res.json({
            success: true,
            message: 'GST settings updated successfully',
            settings: {
                ...updated,
                _id: updated.id,
                ...updatedSlabs,
            },
        });
    } catch (error) {
        console.error('Error updating GST settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Toggle GST globally
// @route   POST /api/admin/gst-settings/toggle
// @access  Private/Admin
router.post('/gst-settings/toggle', protect, admin, async (req, res) => {
    try {
        const current = await getOrCreateGSTSettings();
        const currentSlabs = (current.taxSlabs && typeof current.taxSlabs === 'object') ? current.taxSlabs : {};
        const newEnabled = !currentSlabs.gst_enabled;

        const updated = await prisma.gSTSettings.update({
            where: { id: current.id },
            data: {
                taxSlabs: {
                    ...currentSlabs,
                    gst_enabled: newEnabled,
                },
            },
        });

        res.json({
            success: true,
            message: `GST ${newEnabled ? 'enabled' : 'disabled'} successfully`,
            gst_enabled: newEnabled,
        });
    } catch (error) {
        console.error('Error toggling GST:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
