const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const ProductCompliance = require("../models/ProductCompliance");
const ProductBatch = require("../models/ProductBatch");
const complianceService = require("../services/complianceService");

async function audit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("=== CONNECTED TO DB ===");

    const products = await Product.find({}).populate("vendor").lean();
    console.log(`Found ${products.length} total products in database.\n`);

    const auditResults = [];

    for (const prod of products) {
      const vendor = prod.vendor || (prod.vendor ? await Vendor.findById(prod.vendor).lean() : null);
      const compliance = await ProductCompliance.findOne({ product: prod._id }).lean();
      const batch = await ProductBatch.findOne({ product: prod._id, status: "active" }).sort({ createdAt: -1 }).lean();

      // Check Lab Evidence on Batch
      const batchLabEvidence = batch?.laboratoryEvidence || [];
      const hasBatchLabEvidence = batchLabEvidence.length > 0;
      const verifiedBatchLab = batchLabEvidence.filter(e => e.status === "verified");
      const hasVerifiedBatchLab = verifiedBatchLab.length > 0;

      // Check Scientific Verification on Compliance
      const sciStatus = compliance?.scientificVerification?.status || "not_available";
      const isSciVerified = sciStatus === "verified";

      // Check Vendor Documents
      const labDocTypes = [
        "nabl_certificate",
        "laboratory_report_coa",
        "certificate_of_analysis",
        "pesticide_residue_report",
        "heavy_metal_report",
        "microbiological_report",
        "product_quality_report",
      ];
      const vendorLabDocs = (vendor?.complianceDocuments || []).filter(d => labDocTypes.includes(d.type));
      const approvedVendorLabDocs = vendorLabDocs.filter(d => d.status === "approved");

      // Current Trust Status from buildTrustPassportDTO
      const currentTrustPassport = complianceService.buildTrustPassportDTO({
        product: prod,
        vendor: vendor || { businessName: "SIRABA Organic Direct", status: "approved" },
        compliance,
        batch
      });

      const currentPublicDTO = compliance ? complianceService.buildPublicDTO(compliance) : null;

      auditResults.push({
        id: prod._id,
        name: prod.name,
        slug: prod.slug,
        vendorId: vendor?._id || "none",
        vendorName: vendor?.businessName || "Direct / Unassigned",
        vendorStatus: vendor?.status || "none",
        hasBatch: Boolean(batch),
        batchNumber: batch?.batchNumber || "none",
        hasBatchLabEvidence,
        hasVerifiedBatchLab,
        complianceSciStatus: sciStatus,
        vendorLabDocsCount: vendorLabDocs.length,
        approvedVendorLabDocsCount: approvedVendorLabDocs.length,
        currentTrustStatus_isTripleVerified: currentTrustPassport?.verified?.status === "verified",
        currentPublicDTO_isTripleVerified: currentPublicDTO?.trustStatus?.isTripleVerified || false,
        certifiedStatus: currentTrustPassport?.certified?.status,
        verifiedStatus: currentTrustPassport?.verified?.status,
        qualifiedStatus: currentTrustPassport?.qualified?.status,
      });
    }

    console.log(JSON.stringify(auditResults, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Audit error:", err);
    process.exit(1);
  }
}

audit();
