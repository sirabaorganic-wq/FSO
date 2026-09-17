const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const ProductCompliance = require("../models/ProductCompliance");

async function run() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected.");

    // 1. Update Rapid Organic Vendor
    const rapidVendor = await Vendor.findOne({ businessName: /Rapid Organic/i });
    if (rapidVendor) {
      console.log(`Updating Rapid Organic vendor (ID: ${rapidVendor._id})...`);
      rapidVendor.fssaiNumber = rapidVendor.fssaiNumber || "10822999000123";
      rapidVendor.status = "approved";
      rapidVendor.isBusinessRegistered = "yes";
      rapidVendor.maintainsTraceabilityRecords = "yes";

      rapidVendor.organicCertification = {
        certificationRoute: "usda",
        certificationBody: "OneCert / Lacon",
        certificateNumber: "NOP/ORG/1409/001649",
        certificateValidUntil: new Date("2026-09-03"),
        certificationsByRoute: {
          usda: {
            certificationBody: "OneCert International",
            certificateNumber: "NOP/ORG/1409/001649",
            certificateValidUntil: new Date("2026-09-03"),
          },
          npop: {
            certificationBody: "Lacon",
            certificateNumber: "ORG\\SC\\1409\\001649",
            certificateValidUntil: new Date("2026-09-03"),
          },
        },
      };

      await rapidVendor.save();
      console.log("✅ Rapid Organic vendor record updated with FSSAI & NOP Organic Certification!");
    } else {
      console.log("⚠️ Rapid Organic vendor not found by name.");
    }

    // 2. Also ensure Organic Wellness Products has NOP certification details populated
    const wellnessVendor = await Vendor.findOne({ businessName: /Organic Wellness/i });
    if (wellnessVendor) {
      console.log(`Updating Organic Wellness vendor (ID: ${wellnessVendor._id})...`);
      wellnessVendor.fssaiNumber = wellnessVendor.fssaiNumber || "10016026000833";
      wellnessVendor.status = "approved";
      wellnessVendor.organicCertification = {
        certificationRoute: "usda",
        certificationBody: "OneCert",
        certificateNumber: "4920002333",
        certificateValidUntil: new Date("2027-05-12"),
        certificationsByRoute: {
          usda: {
            certificationBody: "OneCert",
            certificateNumber: "4920002333",
            certificateValidUntil: new Date("2027-05-12"),
          },
          npop: {
            certificationBody: "RSOCA",
            certificateNumber: "ORG/SC/1708/001757",
            certificateValidUntil: new Date("2026-08-23"),
          },
        },
      };
      await wellnessVendor.save();
      console.log("✅ Organic Wellness vendor record updated.");
    }

    // 3. Upsert ProductCompliance records for all products
    const products = await Product.find({}).lean();
    console.log(`Creating/Updating compliance records for ${products.length} products...`);

    for (const p of products) {
      const v = p.vendor ? await Vendor.findById(p.vendor).lean() : null;
      const certBody = v?.organicCertification?.certificationsByRoute?.usda?.certificationBody || v?.organicCertification?.certificationBody || "";
      const certNum = v?.organicCertification?.certificationsByRoute?.usda?.certificateNumber || v?.organicCertification?.certificateNumber || "";
      const validUntil = v?.organicCertification?.certificateValidUntil || null;
      const isApproved = v?.status === "approved";

      await ProductCompliance.findOneAndUpdate(
        { product: p._id },
        {
          $set: {
            product: p._id,
            vendor: p.vendor || null,
            certification: {
              status: (certNum && isApproved) ? "verified" : "pending",
              standard: v?.organicCertification?.certificationRoute ? v.organicCertification.certificationRoute.toUpperCase() : "Organic Certification",
              certificationBody: certBody,
              certificateNumber: certNum,
              validUntil: validUntil,
              productScope: p.name,
              verifiedAt: isApproved ? new Date() : null,
            },
            regulatory: {
              fssai: {
                status: v?.fssaiNumber ? "verified" : "pending",
                licenseNumber: v?.fssaiNumber || "",
                verifiedAt: v?.fssaiNumber ? new Date() : null,
              },
            },
            productVerification: {
              status: isApproved ? "verified" : "pending",
              labelVerified: isApproved,
              ingredientsVerified: isApproved,
              specificationVerified: isApproved,
              claimsReviewed: isApproved,
              verifiedAt: isApproved ? new Date() : null,
            },
            scientificVerification: {
              status: "pending",
              summary: "Accredited Lab Evidence pending submission and review.",
            },
            sirabaQualification: {
              status: "verified",
              vendorQualified: true,
              marketplaceApproved: true,
              verifiedAt: new Date(),
            },
            trustStatus: {
              isCertified: true,
              isVerified: false,
              isQualified: true,
              isTripleVerified: false,
              computedAt: new Date(),
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    console.log("✅ All product compliance records updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating compliance:", err);
    process.exit(1);
  }
}

run();
