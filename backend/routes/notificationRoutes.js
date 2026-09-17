const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protectVendor } = require('../middleware/vendorMiddleware');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get my notifications (Vendor/Producer)
// @route   GET /api/notifications/vendor
// @access  Private/Vendor
router.get('/vendor', protectVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const notifications = await prisma.notification.findMany({
            where: { vendorId: String(vendorId) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.json(notifications.map(n => ({ ...n, _id: n.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get my notifications (User/Admin)
// @route   GET /api/notifications/user
// @access  Private/User
router.get('/user', protect, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const notifications = await prisma.notification.findMany({
            where: { userId: String(userId) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.json(notifications.map(n => ({ ...n, _id: n.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const notification = await prisma.notification.findUnique({
            where: { id: req.params.id },
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        // Check user ownership or vendor ownership
        let isOwner = notification.userId === userId;
        if (!isOwner && req.user.email) {
            const vendor = await prisma.vendor.findUnique({
                where: { email: req.user.email },
                select: { id: true },
            });
            if (vendor && notification.vendorId === vendor.id) {
                isOwner = true;
            }
        }

        if (!isOwner) {
            return res.status(403).json({ message: 'Forbidden: You do not own this notification' });
        }

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mark all as read (Vendor)
// @route   PUT /api/notifications/vendor/read-all
// @access  Private/Vendor
router.put('/vendor/read-all', protectVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const result = await prisma.notification.updateMany({
            where: { vendorId: String(vendorId), isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'All notifications marked as read', count: result.count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
