const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect } = require("../middleware/authMiddleware");
const fs = require("fs").promises;
const path = require("path");
const handlebars = require("handlebars");

// Helper function to generate invoice HTML
const generateInvoiceHTML = async (order) => {
  const templatePath = path.join(
    __dirname,
    "../templates/invoices/invoice-template.html",
  );
  const logoPath = path.join(__dirname, "../templates/invoices/logo.png");

  let templateContent = "";
  try {
    templateContent = await fs.readFile(templatePath, "utf8");
  } catch (e) {
    templateContent = `<!DOCTYPE html><html><body><h1>Invoice {{invoiceNumber}}</h1><p>Customer: {{customerName}}</p><p>Total: {{grandTotal}}</p></body></html>`;
  }

  // Read logo
  let logoBase64 = "";
  try {
    const logoBuffer = await fs.readFile(logoPath);
    logoBase64 = logoBuffer.toString("base64");
  } catch (error) {
    // logo not found fallback
  }

  // Get GST settings
  const gstSettings = await prisma.gSTSettings.findFirst();

  const shippingPrice = order.shippingPrice || 0;
  const totalPrice = order.totalPrice || 0;
  const vendorGSTIN = gstSettings?.gstin || null;
  const showGST = Boolean(vendorGSTIN);
  const buyerGSTIN = order.gstClaimed && order.buyerGstNumber ? order.buyerGstNumber : null;

  const { marketplaceConfig } = require("../config/marketplace.config");
  const shippingAddress = order.shippingAddress || {};

  const invoiceData = {
    logoBase64,
    companyName: process.env.FSO_BRAND_NAME || marketplaceConfig.brand.name,
    companyAddress: "Heritage Sourcing Network",
    companyCity: "India",
    companyEmail: process.env.FSO_ADMIN_EMAIL || marketplaceConfig.email.adminEmail,
    companyPhone: "+91 99066 93633",
    companyWebsite: marketplaceConfig.brand.website,
    companyTagline: marketplaceConfig.brand.tagline,
    customerName: shippingAddress.name || order.user?.name || "Customer",
    customerAddress: shippingAddress.address || "N/A",
    customerCity: `${shippingAddress.city || "City"}, ${shippingAddress.postalCode || "00000"}`,
    customerCountry: shippingAddress.country || "India",
    customerPhone: shippingAddress.phone || "N/A",
    invoiceNumber: `#${order.orderNumber || order.id.slice(-8).toUpperCase()}`,
    invoiceDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
    orderId: order.id,
    orderStatus: order.status,
    items: (order.orderItems || []).map((item) => ({
      name: item.name,
      description: "Authentic Heritage Producer Selection",
      hsn: item.hsn || "0910",
      quantity: item.quantity,
      price: `₹${(item.price || 0).toFixed(2)}`,
      total: `₹${((item.price || 0) * item.quantity).toFixed(2)}`,
    })),
    subtotal: `₹${(order.subtotal || 0).toFixed(2)}`,
    tax: `₹${(order.taxPrice || 0).toFixed(2)}`,
    shipping: shippingPrice > 0 ? `₹${shippingPrice.toFixed(2)}` : "Free",
    grandTotal: `₹${totalPrice.toFixed(2)}`,
    sellerGST: vendorGSTIN,
    buyerGST: buyerGSTIN,
    showGST: showGST,
    gstPercentage: 5,
    gstAmount: `₹${(order.taxPrice || 0).toFixed(2)}`,
    gstClaimed: Boolean(buyerGSTIN),
  };

  const template = handlebars.compile(templateContent);
  return template(invoiceData);
};

// @desc    Get invoice HTML preview
// @route   GET /api/invoices/:orderId/preview
// @access  Private
router.get("/:orderId/preview", protect, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const userId = req.user.id || req.user._id;
    if (order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to view this invoice" });
    }

    const html = await generateInvoiceHTML(order);
    res.send(html);
  } catch (error) {
    console.error("Invoice preview error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
