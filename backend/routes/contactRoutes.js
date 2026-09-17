const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Submit a contact form
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, name, email, phone, message } = req.body;
        const fullName = name || [firstName, lastName].filter(Boolean).join(' ') || 'Anonymous';
        const newSubmission = await prisma.contactSubmission.create({
            data: {
                name: fullName,
                email: email || '',
                phone: phone || null,
                message: message || '',
            },
        });
        res.status(201).json({ ...newSubmission, _id: newSubmission.id });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
    try {
        const submissions = await prisma.contactSubmission.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(submissions.map(s => ({ ...s, _id: s.id })));
    } catch (error) {
        console.error('Error fetching contact submissions:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const existing = await prisma.contactSubmission.findUnique({
            where: { id: req.params.id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Message not found' });
        }

        await prisma.contactSubmission.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Contact message deleted' });
    } catch (error) {
        console.error('Error deleting contact message:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
