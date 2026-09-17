const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductBatch = require("../models/ProductBatch");
const Vendor = require("../models/Vendor");
const ProductCompliance = require("../models/ProductCompliance");

async function checkDocs() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const vendors = await Vendor.find({}).lean();
  console.log("=== VENDOR COMPLIANCE DOCUMENTS ===");
  for (const v of vendors) {
    console.log(`\nVendor: ${v.businessName} (_id: ${v._id}, status: ${v.status})`);
    console.log("Documents:", JSON.stringify(v.complianceDocuments, null, 2));
  }

  const compliances = await ProductCompliance.find({}).populate("product").lean();
  console.log("\n=== PRODUCT COMPLIANCE RECORDS ===");
  for (const c of compliances) {
    console.log(`\nProduct: ${c.product?.name} (Slug: ${c.product?.slug})`);
    console.log("Certification:", c.certification?.status, c.certification?.standard);
    console.log("Regulatory:", c.regulatory?.fssai?.status, c.regulatory?.fssai?.licenseNumber);
    console.log("ProductVerification:", c.productVerification?.status);
    console.log("ScientificVerification:", c.scientificVerification?.status, c.scientificVerification?.summary);
    console.log("SirabaQualification:", c.sirabaQualification?.status);
    console.log("TrustStatus:", c.trustStatus);
  }

  await mongoose.disconnect();
}

checkDocs();
