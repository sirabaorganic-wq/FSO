const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protect, admin } = require('../middleware/authMiddleware');
const { protectVendor, approvedVendor } = require('../middleware/vendorMiddleware');

// @desc    Get User Refund Logs
// @route   GET /api/refunds/my-logs
// @access  Private
router.get('/my-logs', protect, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const logs = await prisma.refundLog.findMany({
            where: {
                order: {
                    userId: String(userId),
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        totalPrice: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            order: l.order ? { ...l.order, _id: l.order.id } : null,
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Vendor Refund Logs
// @route   GET /api/refunds/vendor-logs
// @access  Private/Vendor
router.get('/vendor-logs', protectVendor, approvedVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const logs = await prisma.refundLog.findMany({
            where: {
                order: {
                    vendorOrders: {
                        some: {
                            vendorId: String(vendorId),
                        },
                    },
                },
            },
            include: {
                order: {
                    select: {
                        id: true,
                        totalPrice: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            order: l.order ? { ...l.order, _id: l.order.id } : null,
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Refund Logs (Admin)
// @route   GET /api/refunds/admin-logs
// @access  Private/Admin
router.get('/admin-logs', protect, admin, async (req, res) => {
    try {
        const logs = await prisma.refundLog.findMany({
            include: {
                order: {
                    select: {
                        id: true,
                        totalPrice: true,
                        status: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(logs.map(l => ({
            ...l,
            _id: l.id,
            order: l.order ? {
                ...l.order,
                _id: l.order.id,
                user: l.order.user ? { ...l.order.user, _id: l.order.user.id } : null,
            } : null,
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
