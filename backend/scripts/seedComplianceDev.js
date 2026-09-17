/**
 * Development Compliance & Batch Fixture Seed Script
 * 
 * Usage: node scripts/seedComplianceDev.js
 * DO NOT RUN IN PRODUCTION.
 */

const dotenv = require("dotenv");
dotenv.config();

if (process.env.NODE_ENV === "production") {
  console.error("❌ ABORT: This seed script must NOT be executed in production!");
  process.exit(1);
}

const connectDB = require("../config/db");
const Product = require("../models/Product");
const ProductCompliance = require("../models/ProductCompliance");
const ProductBatch = require("../models/ProductBatch");
const TraceIdCounter = require("../models/TraceIdCounter");
const ComplianceAuditLog = require("../models/ComplianceAuditLog");

const seedDevCompliance = async () => {
  try {
    await connectDB();
    console.log("🔌 Connected to Database for Dev Compliance Seeding...");

    // Find sample product (Premium Asafoetida Hing or first available)
    let product = await Product.findOne({ slug: "premium-asafoetida-hing" });
    if (!product) {
      product = await Product.findOne();
    }

    if (!product) {
      console.error("❌ No product found in database. Please run seedProducts.js first.");
      process.exit(1);
    }

    console.log(`📦 Found Product: ${product.name} (_id: ${product._id})`);

    // 1. Create or Update ProductCompliance
    const complianceData = {
      product: product._id,
      vendor: product.vendor || null,
      certification: {
        status: "verified",
        standard: "NPOP (India Organic)",
        certificationBody: "OneCert International Pvt. Ltd.",
        certificateNumber: "NPOP/ORG/23/000123",
        validFrom: new Date("2024-05-12"),
        validUntil: new Date("2027-05-11"),
        productScope: `${product.name} — Handpicked Grade A`,
        verifiedAt: new Date("2026-08-10"),
        expiresAt: new Date("2027-05-11"),
      },
      regulatory: {
        fssai: {
          status: "verified",
          licenseNumber: "10020011000456",
          validUntil: new Date("2028-12-31"),
          verifiedAt: new Date("2026-08-10"),
          expiresAt: new Date("2028-12-31"),
        },
      },
      productVerification: {
        status: "verified",
        labelVerified: true,
        ingredientsVerified: true,
        specificationVerified: true,
        claimsReviewed: true,
        verifiedAt: new Date("2026-08-10"),
      },
      scientificVerification: {
        status: "verified",
        summary: "Accredited Lab Evidence Validated (ISO/IEC 17025)",
        verifiedAt: new Date("2026-08-10"),
      },
      sirabaQualification: {
        status: "verified",
        vendorQualified: true,
        marketplaceApproved: true,
        verifiedAt: new Date("2026-08-10"),
      },
      verifiedClaims: [
        { claim: "100% Pure & Pungent", status: "verified", reviewedAt: new Date("2026-08-10") },
        { claim: "No Artificial Fillers", status: "verified", reviewedAt: new Date("2026-08-10") },
        { claim: "Single Origin Heritage", status: "verified", reviewedAt: new Date("2026-08-10") },
      ],
      trustStatus: {
        isCertified: true,
        isVerified: true,
        isQualified: true,
        isTripleVerified: true,
        computedAt: new Date(),
      },
      adminNotes: [{ note: "DEVELOPMENT TEST DATA — NOT REAL PRODUCTION VERIFICATION" }],
      internalRiskScore: 5,
    };

    let compliance = await ProductCompliance.findOneAndUpdate(
      { product: product._id },
      complianceData,
      { upsert: true, returnDocument: "after" }
    );
    console.log(`✅ ProductCompliance record created/updated (_id: ${compliance._id})`);

    // 2. Create or Update ProductBatch with Trace ID
    const traceId = "SIR-HNG-00021";
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const qrVerificationUrl = `${baseUrl}/verify/${traceId}`;

    const batchData = {
      product: product._id,
      vendor: product.vendor || null,
      compliance: compliance._id,
      batchNumber: "HNG-0826-001",
      status: "active",
      manufacturedAt: new Date("2026-08-01"),
      bestBefore: new Date("2028-08-01"),
      qualityVerification: {
        status: "verified",
        verifiedAt: new Date("2026-08-05"),
      },
      laboratoryEvidence: [
        {
          status: "verified",
          laboratory: "Vedic Analytical Testing Lab",
          accreditation: "ISO/IEC 17025 Accredited",
          reportNumber: "VATL/2026/0821",
          testDate: new Date("2026-08-03"),
          sampleBatch: "HNG-0826-001",
          parameters: [
            { name: "Volatile Oil Content", category: "quality", status: "pass" },
            { name: "Heavy Metals (Lead, Arsenic)", category: "safety", status: "pass" },
            { name: "Pesticide Residue Analysis", category: "contaminant", status: "pass" },
            { name: "Microbiological Safety", category: "safety", status: "pass" },
          ],
          expiresAt: new Date("2027-08-03"),
          verifiedAt: new Date("2026-08-05"),
        },
      ],
      traceability: {
        status: "verified",
        origin: "High-Altitude Arid Region, India",
        region: "Western Heritage Belt",
        producer: "Verified Organic Producer Co-op",
        processing: "Verified Traditional Grinding Facility",
        packaging: "Hygienic Food-Grade Sealed Foil",
        distribution: "Cold-Chain Traceability Maintained",
        verifiedAt: new Date("2026-08-05"),
      },
      traceId,
      traceIdGeneratedAt: new Date("2026-08-05"),
      qrVerificationUrl,
      adminNotes: [{ note: "DEVELOPMENT TEST DATA — BATCH FIXTURE" }],
    };

    let batch = await ProductBatch.findOneAndUpdate(
      { product: product._id, batchNumber: "HNG-0826-001" },
      batchData,
      { upsert: true, returnDocument: "after" }
    );

    // Initialize TraceIdCounter
    await TraceIdCounter.findOneAndUpdate(
      { _id: "HNG" },
      { sequence: 21 },
      { upsert: true }
    );

    console.log(`✅ ProductBatch record created/updated (_id: ${batch._id}, Trace ID: ${traceId})`);
    console.log(`🎉 Development compliance & batch fixture successfully seeded!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedDevCompliance();
