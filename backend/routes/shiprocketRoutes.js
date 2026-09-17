const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const shiprocketService = require("../services/shiprocketService");
const { protect, adminOrVendorOnboarder } = require("../middleware/authMiddleware");

// @desc    Track shipment by AWB Code
// @route   GET /api/shiprocket/track/:awbCode
// @access  Private / Authenticated Owner or Admin (PII Protected)
router.get("/track/:awbCode", protect, async (req, res) => {
  try {
    const { awbCode } = req.params;
    if (!awbCode) {
      return res.status(400).json({ message: "AWB Code is required" });
    }

    // Ownership check: Find VendorOrder referencing this AWB
    const vendorOrder = await prisma.vendorOrder.findFirst({
      where: { awbCode: String(awbCode) },
      include: { order: true },
    });

    if (vendorOrder) {
      const isOwner = vendorOrder.order?.userId === req.user.id;
      const isAdmin = req.user.isAdmin || req.user.role === "ADMIN";
      const isAssignedVendor = req.user.vendorId && req.user.vendorId === vendorOrder.vendorId;

      if (!isOwner && !isAdmin && !isAssignedVendor) {
        return res.status(403).json({ message: "Not authorized to view tracking for this shipment" });
      }
    } else {
      // If no VendorOrder is linked yet, only admins can query arbitrary AWBs
      const isAdmin = req.user.isAdmin || req.user.role === "ADMIN";
      if (!isAdmin) {
        return res.status(404).json({ message: "Shipment not found" });
      }
    }

    const trackingData = await shiprocketService.trackOrder(awbCode);
    res.json(trackingData);
  } catch (error) {
    console.error("Tracking API error:", error);
    res.status(500).json({ message: error.message || "Failed to fetch tracking details" });
  }
});

// @desc    Check courier serviceability between pincodes
// @route   GET /api/shiprocket/serviceability
// @access  Public
router.get("/serviceability", async (req, res) => {
  try {
    const { pickup_postcode, delivery_postcode, weight, cod } = req.query;
    if (!pickup_postcode || !delivery_postcode) {
      return res.status(400).json({ message: "pickup_postcode and delivery_postcode are required" });
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      return res.status(400).json({ message: "Valid positive numeric weight is required" });
    }

    const courier = await shiprocketService.checkServiceability({
      pickup_postcode: String(pickup_postcode).trim(),
      delivery_postcode: String(delivery_postcode).trim(),
      weight: parsedWeight,
      cod: cod === "1" || cod === "true",
    });

    res.json(courier);
  } catch (error) {
    res.status(error.code === "INVALID_SHIPPING_WEIGHT" ? 400 : 500).json({ message: error.message });
  }
});

// @desc    Retry failed shipment creation (Idempotent Admin endpoint)
// @route   POST /api/shiprocket/retry/:vendorOrderId
// @access  Private/Admin or VendorOnboarder
router.post("/retry/:vendorOrderId", protect, adminOrVendorOnboarder, async (req, res) => {
  try {
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: req.params.vendorOrderId },
      include: {
        order: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
        vendor: true,
      },
    });

    if (!vendorOrder) {
      return res.status(404).json({ message: "VendorOrder not found" });
    }

    if (vendorOrder.shiprocketOrderId && vendorOrder.awbCode) {
      return res.status(400).json({
        message: "Shipment already created for this order",
        shiprocketOrderId: vendorOrder.shiprocketOrderId,
        awbCode: vendorOrder.awbCode,
      });
    }

    const order = vendorOrder.order;
    const vendor = vendorOrder.vendor;

    if (!vendor) {
      return res.status(400).json({ message: "Vendor record is missing for this VendorOrder" });
    }

    const result = await shiprocketService.createShipment(vendorOrder, order, vendor);

    const updated = await prisma.vendorOrder.update({
      where: { id: vendorOrder.id },
      data: {
        shiprocketOrderId: String(result.shiprocketOrderId || ""),
        shipmentId: String(result.shipmentId || ""),
        awbCode: String(result.awbCode || ""),
        courierName: String(result.courierName || ""),
        trackingUrl: String(result.labelUrl || ""),
        status: "PROCESSING",
      },
    });

    res.json({
      message: "Shipment retry successful!",
      shipment: result,
      vendorOrder: updated,
    });
  } catch (error) {
    console.error("Retry Shipment Error:", error);
    res.status(400).json({
      message: error.message || "Shipment creation retry failed",
      code: error.code || "SHIPMENT_RETRY_FAILED",
    });
  }
});

module.exports = router;
