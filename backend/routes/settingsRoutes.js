const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// @desc    Get Home Page Settings
// @route   GET /api/settings/home
// @access  Public
router.get('/home', async (req, res) => {
    try {
        let settings = await prisma.siteSettings.findUnique({
            where: { key: 'home' },
        });

        if (!settings) {
            const defaultHome = {
                subheading: "Curated Excellence",
                heading: "Signature Collection",
                signatureProducts: [],
            };
            settings = await prisma.siteSettings.create({
                data: {
                    key: 'home',
                    value: { homeContent: defaultHome },
                },
            });
            return res.json(defaultHome);
        }

        const val = settings.value || {};
        res.json(val.homeContent || {
            subheading: "Curated Excellence",
            heading: "Signature Collection",
            signatureProducts: [],
        });
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update Home Page Settings
// @route   PUT /api/settings/home
// @access  Private/Admin
router.put('/home', async (req, res) => {
    try {
        const { subheading, heading, signatureProducts } = req.body;
        const existing = await prisma.siteSettings.findUnique({ where: { key: 'home' } });
        const currentVal = (existing && existing.value && typeof existing.value === 'object') ? existing.value : {};

        const updatedVal = {
            ...currentVal,
            homeContent: {
                subheading,
                heading,
                signatureProducts: signatureProducts || [],
            },
        };

        await prisma.siteSettings.upsert({
            where: { key: 'home' },
            create: { key: 'home', value: updatedVal },
            update: { value: updatedVal },
        });

        res.json(updatedVal.homeContent);
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get Certifications Settings
// @route   GET /api/settings/certifications
// @access  Public
router.get('/certifications', async (req, res) => {
    try {
        const settings = await prisma.siteSettings.findUnique({ where: { key: 'home' } });
        const val = (settings && settings.value && typeof settings.value === 'object') ? settings.value : {};
        res.json(val.certificationsContent || {});
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Update Certifications Settings
// @route   PUT /api/settings/certifications
// @access  Private/Admin
router.put('/certifications', async (req, res) => {
    try {
        const { title, description, images, sectionTitle, sectionDescription, cards } = req.body;
        const existing = await prisma.siteSettings.findUnique({ where: { key: 'home' } });
        const currentVal = (existing && existing.value && typeof existing.value === 'object') ? existing.value : {};

        const updatedVal = {
            ...currentVal,
            certificationsContent: {
                title,
                description,
                images: images || [],
                sectionTitle,
                sectionDescription,
                cards: cards || [],
            },
        };

        await prisma.siteSettings.upsert({
            where: { key: 'home' },
            create: { key: 'home', value: updatedVal },
            update: { value: updatedVal },
        });

        res.json(updatedVal.certificationsContent);
    } catch (error) {
        console.error('Settings error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
