const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const complianceService = require("../services/complianceService");

console.log("===============================================================");
console.log("🔍 SITE-WIDE CLAIM INTEGRITY & TRUTH VALIDATION SUITE");
console.log("===============================================================\n");

let passed = 0;
let failed = 0;

function runAssertion(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}\n`);
    failed++;
  }
}

async function runSiteWideAudit() {
  // -------------------------------------------------------------
  // 1. FINAL NEGATIVE TEST
  // -------------------------------------------------------------
  runAssertion("Final Negative Test: Valid Cert + Approved Vendor + Missing Lab Evidence -> NEVER Triple-Verified", () => {
    const unverifiedProduct = {
      _id: "prod_neg_001",
      name: "Organic Cumin Tisane",
    };
    const approvedVendor = {
      _id: "vendor_neg_001",
      businessName: "Rapid Organic",
      status: "approved",
      isBusinessRegistered: "yes",
      fssaiNumber: "10822999000123",
      organicCertification: {
        certificationRoute: "usda",
        certificationBody: "OneCert",
        certificateNumber: "NOP/ORG/1409/001649",
        certificateValidUntil: new Date("2027-12-31"),
      },
    };
    const compliance = {
      product: unverifiedProduct._id,
      vendor: approvedVendor._id,
      certification: { status: "verified", standard: "USDA NOP", expiresAt: new Date("2027-12-31") },
      regulatory: { fssai: { status: "verified", licenseNumber: "10822999000123" } },
      productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
      scientificVerification: { status: "pending", summary: "Accredited Lab Evidence pending review." },
      sirabaQualification: { status: "verified", vendorQualified: true, marketplaceApproved: true },
    };

    const trustStatus = complianceService.computeTrustStatus({ compliance, batch: null, product: unverifiedProduct, vendor: approvedVendor });
    assert.strictEqual(trustStatus.isCertified, true, "Certification must be verified");
    assert.strictEqual(trustStatus.isVerified, false, "Verified MUST be false without approved lab evidence");
    assert.strictEqual(trustStatus.isQualified, true, "Qualified is true based on vendor/qualification");
    assert.strictEqual(trustStatus.isTripleVerified, false, "Triple-Verified MUST be false");

    const passportDTO = complianceService.buildTrustPassportDTO({
      product: unverifiedProduct,
      vendor: approvedVendor,
      compliance,
      batch: null,
    });
    assert.strictEqual(passportDTO.verified.safetyTested, false, "safetyTested must be false");
    assert.notStrictEqual(passportDTO.verified.status, "verified", "Card status must not be verified");

    const publicDTO = complianceService.buildPublicDTO(compliance, { batch: null, product: unverifiedProduct, vendor: approvedVendor });
    assert.strictEqual(publicDTO.trustStatus.isTripleVerified, false, "Public DTO must not claim Triple-Verified");
    assert.strictEqual(publicDTO.scientificVerification.status, "pending", "Scientific status must be pending");
  });

  // -------------------------------------------------------------
  // 2. FINAL POSITIVE TEST
  // -------------------------------------------------------------
  runAssertion("Final Positive Test: Valid Cert + Approved Lab Evidence + Valid Batch Scope -> Complete Triple-Verified", () => {
    const verifiedProduct = {
      _id: "prod_pos_001",
      name: "Pure Shilajit Resin",
    };
    const approvedVendor = {
      _id: "vendor_pos_001",
      businessName: "Himalayan Herbs & Organics",
      status: "approved",
      isBusinessRegistered: "yes",
      fssaiNumber: "10016026000833",
      organicCertification: {
        certificationRoute: "usda",
        certificationBody: "Lacon Quality Certifications",
        certificateNumber: "ORG/SC/1409/001649",
        certificateValidUntil: new Date("2027-12-31"),
      },
    };
    const compliance = {
      product: verifiedProduct._id,
      vendor: approvedVendor._id,
      certification: { status: "verified", standard: "USDA NOP", expiresAt: new Date("2027-12-31") },
      regulatory: { fssai: { status: "verified", licenseNumber: "10016026000833", expiresAt: new Date("2027-12-31") } },
      productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
      scientificVerification: {
        status: "verified",
        laboratory: "Eurofins Analytical Services",
        accreditation: "ISO/IEC 17025",
        reportNumber: "EF-IND-2026-8889",
        summary: "Accredited Lab Evidence Validated (ISO/IEC 17025)",
        expiresAt: new Date("2027-12-31"),
        verifiedBy: "6a040e8f41bea15b23584bee",
      },
      sirabaQualification: { status: "verified", vendorQualified: true, marketplaceApproved: true },
    };
    const batch = {
      product: verifiedProduct._id,
      batchNumber: "SHI-2026-B1",
      laboratoryEvidence: [
        {
          status: "verified",
          laboratory: "Eurofins Analytical Services",
          accreditation: "ISO/IEC 17025",
          reportNumber: "EF-IND-2026-8889",
          testDate: new Date("2026-07-01"),
          expiresAt: new Date("2027-12-31"),
          parameters: [{ name: "Heavy Metals Purity", category: "contaminant", status: "pass" }],
        },
      ],
    };

    const trustStatus = complianceService.computeTrustStatus({ compliance, batch, product: verifiedProduct, vendor: approvedVendor });
    assert.strictEqual(trustStatus.isCertified, true);
    assert.strictEqual(trustStatus.isVerified, true, "Verified gate must pass with valid lab evidence");
    assert.strictEqual(trustStatus.isQualified, true);
    assert.strictEqual(trustStatus.isTripleVerified, true, "All 3 gates pass -> Triple-Verified is true");

    const passportDTO = complianceService.buildTrustPassportDTO({
      product: verifiedProduct,
      vendor: approvedVendor,
      compliance,
      batch,
    });
    assert.strictEqual(passportDTO.verified.safetyTested, true);
    assert.strictEqual(passportDTO.verified.status, "verified");

    const publicDTO = complianceService.buildPublicDTO(compliance, { batch, product: verifiedProduct, vendor: approvedVendor });
    assert.strictEqual(publicDTO.trustStatus.isTripleVerified, true);
    assert.strictEqual(publicDTO.scientificVerification.status, "verified");
  });

  // -------------------------------------------------------------
  // 3. LIVE DATABASE INTEGRITY AUDIT
  // -------------------------------------------------------------
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const products = await Product.find({}).populate("vendor").lean();
    console.log(`\nAuditing ${products.length} live database products:`);

    for (const prod of products) {
      const compliance = await ProductCompliance.findOne({ product: prod._id }).lean();
      const batch = await ProductBatch.findOne({ product: prod._id, status: "active" }).sort({ createdAt: -1 }).lean();

      runAssertion(`Live Product "${prod.name.substring(0, 35)}..." has truthful non-inflated trust status`, () => {
        const publicDTO = compliance ? complianceService.buildPublicDTO(compliance, { batch, product: prod, vendor: prod.vendor }) : null;
        const passportDTO = complianceService.buildTrustPassportDTO({ product: prod, vendor: prod.vendor, compliance, batch });

        // Since none of the 8 currently listed live products have approved product-specific lab reports:
        assert.strictEqual(
          passportDTO.verified.safetyTested,
          false,
          `Live product ${prod.name} must not claim safetyTested = true without approved lab evidence`
        );
        assert.notStrictEqual(
          passportDTO.verified.status,
          "verified",
          `Live product ${prod.name} must not claim VERIFIED card status`
        );
        if (publicDTO) {
          assert.strictEqual(
            publicDTO.trustStatus.isTripleVerified,
            false,
            `Live product ${prod.name} public DTO must not claim isTripleVerified = true`
          );
        }
      });
    }

    await mongoose.disconnect();
  } catch (dbErr) {
    console.error("DB check error:", dbErr);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSiteWideAudit();
