const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const prisma = require("../config/prisma");
const complianceService = require("../services/complianceService");

// @desc    Verify batch by Trace ID (Public Verification API)
// @route   GET /api/verification/:traceId
// @access  Public
router.get("/:traceId", async (req, res) => {
  try {
    const { traceId } = req.params;

    if (!traceId || typeof traceId !== "string" || !traceId.startsWith("SIR-")) {
      return res.status(400).json({
        found: false,
        verificationStatus: "invalid_format",
        isCurrentlyVerified: false,
        message: "Invalid Trace ID format",
      });
    }

    const batch = await prisma.productBatch.findUnique({
      where: { traceId: traceId.trim().toUpperCase() },
      include: {
        product: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({
        found: false,
        verificationStatus: "not_found",
        isCurrentlyVerified: false,
        message: "Trace ID not found",
      });
    }

    const product = batch.product;
    const vendor = product?.vendor;
    const compliance = await prisma.productCompliance.findUnique({
      where: { productId: batch.productId },
    });

    const publicComplianceDTO = complianceService.buildPublicDTO(compliance, { batch, product, vendor });
    const publicBatchDTO = complianceService.buildPublicBatchDTO(batch);

    // Compute explicit verification status semantics
    let verificationStatus = "not_verified";
    let isCurrentlyVerified = false;

    if (batch.status === "recalled") {
      verificationStatus = "recalled";
    } else if (batch.status === "suspended") {
      verificationStatus = "suspended";
    } else if (batch.status === "expired") {
      verificationStatus = "expired";
    } else if (publicComplianceDTO && publicComplianceDTO.certification?.status === "expired") {
      verificationStatus = "expired";
    } else if (!compliance) {
      verificationStatus = "not_verified";
    } else if (
      publicComplianceDTO?.trustStatus?.isTripleVerified
    ) {
      verificationStatus = "verified";
      isCurrentlyVerified = true;
    } else {
      verificationStatus = "pending";
    }

    res.json({
      found: true,
      verificationStatus,
      isCurrentlyVerified,
      product: product
        ? {
            name: product.name,
            slug: product.slug,
            category: product.category,
            image: product.image,
          }
        : null,
      vendor: vendor ? { businessName: vendor.businessName } : { businessName: "FSO Direct" },
      compliance: publicComplianceDTO,
      batch: publicBatchDTO,
      verification: {
        traceId: batch.traceId,
        batchNumber: batch.batchNumber,
        message: `This verification refers to Batch ${batch.batchNumber}.`,
      },
    });
  } catch (error) {
    console.error("Verification API error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Generate QR Code PNG stream on demand
// @route   GET /api/verification/:traceId/qr
// @access  Public
router.get("/:traceId/qr", async (req, res) => {
  try {
    const { traceId } = req.params;
    const batch = await prisma.productBatch.findUnique({
      where: { traceId: traceId.trim().toUpperCase() },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found for QR generation" });
    }

    const baseUrl = process.env.CLIENT_URL || "https://flashsalesonline.in";
    const verificationUrl = `${baseUrl}/verify/${batch.traceId}`;

    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      width: 250,
      margin: 2,
      color: {
        dark: "#0F3D2E",
        light: "#FFFFFF",
      },
    });

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400"); // Cache QR image stream for 24h
    res.send(qrBuffer);
  } catch (error) {
    console.error("QR Generation error:", error);
    res.status(500).json({ message: "Failed to generate QR code" });
  }
});

module.exports = router;
