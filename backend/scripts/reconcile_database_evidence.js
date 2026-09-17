const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const ProductCompliance = require("../models/ProductCompliance");
const ProductBatch = require("../models/ProductBatch");
const complianceService = require("../services/complianceService");

async function reconcile() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Connected to MongoDB for Evidence Reconcilation...");

    const compliances = await ProductCompliance.find({}).populate("product vendor");
    const now = new Date();

    console.log(`Auditing and reconciling ${compliances.length} ProductCompliance records:\n`);

    for (const comp of compliances) {
      const product = comp.product;
      const vendor = comp.vendor;
      const batch = await ProductBatch.findOne({ product: comp.product?._id, status: "active" }).sort({ createdAt: -1 });

      console.log(`-------------------------------------------------------------------`);
      console.log(`Product: "${product?.name}" (ID: ${product?._id})`);
      console.log(`Vendor: "${vendor?.businessName}"`);

      // Check Batch Lab Evidence
      const batchLabs = batch?.laboratoryEvidence || [];
      const validBatchLab = batchLabs.find(l => l.status === "verified" && (!l.expiresAt || new Date(l.expiresAt) >= now));
      const expiredBatchLab = batchLabs.find(l => l.status === "verified" && l.expiresAt && new Date(l.expiresAt) < now);

      let actualSciStatus = "pending";
      let actualSciSummary = "Accredited Lab Evidence pending submission and review.";

      if (validBatchLab) {
        actualSciStatus = "verified";
        actualSciSummary = validBatchLab.laboratory
          ? `Accredited Lab Evidence Validated (${validBatchLab.laboratory})`
          : "Accredited Lab Evidence Validated (ISO/IEC 17025)";
        console.log(`  -> Found valid batch lab evidence: ${validBatchLab.laboratory || validBatchLab.reportNumber}`);
      } else if (expiredBatchLab) {
        actualSciStatus = "expired";
        actualSciSummary = "Accredited Lab Evidence expired. Renewal testing required.";
        console.log(`  -> Batch lab evidence is expired`);
      } else {
        console.log(`  -> NO approved batch lab evidence found.`);
      }

      // Update scientificVerification
      comp.scientificVerification = {
        status: actualSciStatus,
        summary: actualSciSummary,
        lastReviewedAt: now,
        verifiedAt: actualSciStatus === "verified" ? (comp.scientificVerification?.verifiedAt || now) : null,
      };

      // Recompute trust status
      comp.trustStatus = complianceService.computeTrustStatus(comp, now);

      await comp.save();

      console.log(`  [UPDATED STATUS]:`);
      console.log(`    Certified: ${comp.trustStatus.isCertified}`);
      console.log(`    Verified: ${comp.trustStatus.isVerified} (Scientific: ${actualSciStatus})`);
      console.log(`    Qualified: ${comp.trustStatus.isQualified}`);
      console.log(`    Triple-Verified: ${comp.trustStatus.isTripleVerified}`);
    }

    console.log(`\n✅ Database reconciliation complete!`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Reconciliation error:", err);
    process.exit(1);
  }
}

reconcile();
