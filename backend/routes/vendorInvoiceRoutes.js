const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { protectVendor, approvedVendor } = require('../middleware/vendorMiddleware');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');

// Helper function to generate vendor invoice HTML
const generateVendorInvoiceHTML = async (vendorOrder, vendor) => {
    const templatePath = path.join(__dirname, '../templates/invoices/vendor-invoice-template.html');
    const logoPath = path.join(__dirname, '../templates/invoices/logo.png');

    let templateContent;
    try {
        templateContent = await fs.readFile(templatePath, 'utf8');
    } catch (error) {
        try {
            const customerTemplatePath = path.join(__dirname, '../templates/invoices/invoice-template.html');
            templateContent = await fs.readFile(customerTemplatePath, 'utf8');
        } catch (_) {
            templateContent = '<html><body><h1>Invoice {{invoiceNumber}}</h1><p>Vendor: {{companyName}}</p><p>Subtotal: ₹{{subtotal}}</p><p>Net: ₹{{netAmount}}</p></body></html>';
        }
    }

    let logoBase64 = '';
    try {
        const logoBuffer = await fs.readFile(logoPath);
        logoBase64 = logoBuffer.toString('base64');
    } catch (_) {}

    const gstSettings = await prisma.gSTSettings.findFirst();
    const showGST = Boolean(gstSettings?.gstin) && Boolean(vendor.gstNumber);

    const rawItems = Array.isArray(vendorOrder.items) ? vendorOrder.items : [];
    const itemsTotal = rawItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
    const subtotal = vendorOrder.subtotal || itemsTotal;
    const commission = vendorOrder.commission || 0;
    const netAmount = subtotal - commission;

    const invoiceData = {
        logoBase64,
        companyName: vendor.businessName || 'Producer',
        companyAddress: vendor.addressStreet || vendor.addressCity || '',
        companyCity: `${vendor.addressCity || ''}, ${vendor.addressState || ''} ${vendor.addressPostalCode || ''}`,
        companyEmail: vendor.email || '',
        companyPhone: vendor.phone || '',
        gstNumber: showGST ? (vendor.gstNumber || gstSettings.gstin) : 'N/A',
        customerName: 'Customer',
        customerEmail: '',
        customerPhone: '',
        shippingAddress: '',
        shippingCity: '',
        invoiceNumber: `VND-${vendorOrder.id.slice(-8).toUpperCase()}`,
        orderNumber: vendorOrder.id,
        invoiceDate: new Date(vendorOrder.createdAt).toLocaleDateString('en-IN'),
        orderDate: new Date(vendorOrder.createdAt).toLocaleDateString('en-IN'),
        paymentMethod: 'ONLINE',
        paymentStatus: 'PAID',
        items: rawItems.map(item => ({
            name: item.name || 'Heritage Item',
            sku: item.sku || 'FSO-SKU',
            hsn: item.hsn || '0909',
            quantity: item.quantity || 1,
            price: (Number(item.price) || 0).toFixed(2),
            total: ((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2),
        })),
        itemsTotal: itemsTotal.toFixed(2),
        subtotal: subtotal.toFixed(2),
        platformCommission: commission.toFixed(2),
        netAmount: netAmount.toFixed(2),
        year: new Date().getFullYear(),
    };

    const template = handlebars.compile(templateContent);
    return template(invoiceData);
};

// @desc    Get vendor invoice HTML preview
// @route   GET /api/vendors/invoices/:orderId/preview
// @access  Private/Vendor
router.get('/:orderId/preview', protectVendor, approvedVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const vendorOrder = await prisma.vendorOrder.findFirst({
            where: {
                id: req.params.orderId,
                vendorId: String(vendorId),
            },
        });

        if (!vendorOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: String(vendorId) } });
        const html = await generateVendorInvoiceHTML(vendorOrder, vendor);
        res.send(html);
    } catch (error) {
        console.error('Vendor invoice preview error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all vendor invoices (list)
// @route   GET /api/vendors/invoices
// @access  Private/Vendor
router.get('/', protectVendor, approvedVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const { page = 1, limit = 20, status } = req.query;

        const where = { vendorId: String(vendorId) };
        if (status) where.status = status;

        const orders = await prisma.vendorOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });

        const total = await prisma.vendorOrder.count({ where });

        const invoices = orders.map(order => {
            const rawItems = Array.isArray(order.items) ? order.items : [];
            const subtotal = order.subtotal || 0;
            const commission = order.commission || 0;
            return {
                _id: order.id,
                id: order.id,
                invoiceNumber: `VND-${order.id.slice(-8).toUpperCase()}`,
                date: order.createdAt,
                status: order.status,
                subtotal,
                commission,
                netAmount: subtotal - commission,
                paymentStatus: order.payoutStatus,
                itemsCount: rawItems.length,
            };
        });

        res.json({
            invoices,
            page: parseInt(page),
            pages: Math.ceil(total / Number(limit)),
            total,
        });
    } catch (error) {
        console.error('Vendor invoices list error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get vendor invoice summary/stats
// @route   GET /api/vendors/invoices/stats
// @access  Private/Vendor
router.get('/stats', protectVendor, approvedVendor, async (req, res) => {
    try {
        const vendorId = req.vendor.id || req.vendor._id;
        const orders = await prisma.vendorOrder.findMany({
            where: { vendorId: String(vendorId) },
        });

        const stats = {
            totalInvoices: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
            totalCommission: orders.reduce((sum, o) => sum + (o.commission || 0), 0),
            totalNetAmount: orders.reduce((sum, o) => sum + ((o.subtotal || 0) - (o.commission || 0)), 0),
            pendingPayments: orders.filter(o => o.payoutStatus === 'pending').length,
            paidInvoices: orders.filter(o => o.payoutStatus === 'paid').length,
            statusBreakdown: {
                pending: orders.filter(o => o.status === 'PENDING').length,
                confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
                processing: orders.filter(o => o.status === 'PROCESSING').length,
                shipped: orders.filter(o => o.status === 'SHIPPED').length,
                delivered: orders.filter(o => o.status === 'DELIVERED').length,
                cancelled: orders.filter(o => o.status === 'CANCELLED').length,
            },
        };

        res.json(stats);
    } catch (error) {
        console.error('Vendor invoice stats error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
