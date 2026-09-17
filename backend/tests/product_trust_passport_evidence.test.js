const assert = require("assert");
const complianceService = require("../services/complianceService");

console.log("===============================================================");
console.log("🧪 PRODUCT TRUST PASSPORT EVIDENCE GATE AUTOMATED TEST SUITE");
console.log("===============================================================\n");

let passedCount = 0;
let failedCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${err.message}\n`);
    failedCount++;
  }
}

const baseVendorApproved = {
  _id: "vendor_123",
  businessName: "Test Organic Vendor Ltd",
  status: "approved",
  isBusinessRegistered: "yes",
  fssaiNumber: "10822999000123",
  maintainsTraceabilityRecords: "yes",
  organicCertification: {
    certificationRoute: "usda",
    certificationBody: "OneCert International",
    certificateNumber: "NOP/ORG/1409/001649",
    certificateValidUntil: new Date("2027-12-31"),
  },
};

const baseProduct = {
  _id: "prod_001",
  name: "Organic Raw Honey",
  slug: "organic-raw-honey",
};

// -----------------------------------------------------------------
// Test A: Vendor approved + no lab evidence
// -----------------------------------------------------------------
runTest("Test A: Vendor approved + no lab evidence -> Product NOT fully verified", () => {
  const compliance = {
    certification: { status: "verified", standard: "USDA NOP", expiresAt: new Date("2027-12-31") },
    regulatory: { fssai: { status: "verified", expiresAt: new Date("2027-12-31") } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending", summary: "Accredited Lab Evidence pending review." },
    sirabaQualification: { status: "verified" },
  };

  const trustStatus = complianceService.computeTrustStatus(compliance);
  assert.strictEqual(trustStatus.isCertified, true, "Certification should be verified");
  assert.strictEqual(trustStatus.isVerified, false, "Verified gate MUST NOT pass without lab evidence");
  assert.strictEqual(trustStatus.isTripleVerified, false, "Triple-Verified MUST be false");

  const passportDTO = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch: null,
  });

  assert.strictEqual(passportDTO.verified.safetyTested, false, "safetyTested must be false");
  assert.notStrictEqual(passportDTO.verified.status, "verified", "Verified card status must NOT be verified");
});

// -----------------------------------------------------------------
// Test B: Vendor approved + lab evidence pending
// -----------------------------------------------------------------
runTest("Test B: Vendor approved + lab evidence pending -> Product NOT fully verified", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const trustStatus = complianceService.computeTrustStatus(compliance);
  assert.strictEqual(trustStatus.isVerified, false);
  assert.strictEqual(trustStatus.isTripleVerified, false);

  const publicDTO = complianceService.buildPublicDTO(compliance);
  assert.strictEqual(publicDTO.trustStatus.isVerified, false);
  assert.strictEqual(publicDTO.trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test C: Vendor approved + lab evidence rejected
// -----------------------------------------------------------------
runTest("Test C: Vendor approved + lab evidence rejected -> Product NOT fully verified", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "rejected" },
    sirabaQualification: { status: "verified" },
  };

  const trustStatus = complianceService.computeTrustStatus(compliance);
  assert.strictEqual(trustStatus.isVerified, false);
  assert.strictEqual(trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test D: Vendor approved + lab evidence expired
// -----------------------------------------------------------------
runTest("Test D: Vendor approved + lab evidence expired -> Product NOT currently verified", () => {
  const pastDate = new Date("2020-01-01");
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "verified", expiresAt: pastDate },
    sirabaQualification: { status: "verified" },
  };

  const trustStatus = complianceService.computeTrustStatus(compliance, new Date());
  assert.strictEqual(trustStatus.isVerified, false, "Expired scientific verification must fail Verified gate");
  assert.strictEqual(trustStatus.isTripleVerified, false);

  const publicDTO = complianceService.buildPublicDTO(compliance, new Date());
  assert.strictEqual(publicDTO.scientificVerification.status, "expired");
  assert.strictEqual(publicDTO.trustStatus.isVerified, false);
  assert.strictEqual(publicDTO.trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test E: Vendor approved + approved valid lab evidence
// -----------------------------------------------------------------
runTest("Test E: Vendor approved + approved valid lab evidence -> VERIFIED gate may pass", () => {
  const futureDate = new Date("2027-12-31");
  const compliance = {
    certification: { status: "verified", expiresAt: futureDate },
    regulatory: { fssai: { status: "verified", expiresAt: futureDate } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: {
      status: "verified",
      expiresAt: futureDate,
      laboratory: "Eurofins Food Testing",
      accreditation: "ISO/IEC 17025",
      reportNumber: "EF-2026-001",
      summary: "ISO/IEC 17025 Accredited Lab Tested",
    },
    sirabaQualification: { status: "verified" },
  };

  const batch = {
    product: baseProduct._id,
    batchNumber: "B-2026-01",
    laboratoryEvidence: [
      {
        status: "verified",
        laboratory: "Eurofins Food Testing",
        accreditation: "ISO/IEC 17025",
        reportNumber: "EF-2026-001",
        expiresAt: futureDate,
      },
    ],
  };

  const trustStatus = complianceService.computeTrustStatus({ compliance, batch, product: baseProduct }, new Date());
  assert.strictEqual(trustStatus.isCertified, true);
  assert.strictEqual(trustStatus.isVerified, true, "Valid approved lab evidence allows Verified gate to pass");
  assert.strictEqual(trustStatus.isQualified, true);
  assert.strictEqual(trustStatus.isTripleVerified, true);

  const passportDTO = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch,
  });

  assert.strictEqual(passportDTO.verified.safetyTested, true);
  assert.strictEqual(passportDTO.verified.status, "verified");
});

// -----------------------------------------------------------------
// Test F: Vendor qualified + no product-level lab evidence
// -----------------------------------------------------------------
runTest("Test F: Vendor qualified + no product-level lab evidence -> NOT automatically Triple-Verified", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const passportDTO = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved, // vendor is qualified/approved
    compliance,
    batch: null,
  });

  assert.strictEqual(passportDTO.qualified.status, "approved", "Vendor is qualified");
  assert.strictEqual(passportDTO.verified.safetyTested, false, "Product lacks lab evidence");
  assert.notStrictEqual(passportDTO.verified.status, "verified", "Product cannot be verified");
});

// -----------------------------------------------------------------
// Test G: Product A has valid lab evidence, Product B does not
// -----------------------------------------------------------------
runTest("Test G: Product A has valid lab evidence, Product B does not -> A verified, B not verified", () => {
  const futureDate = new Date("2027-12-31");
  const complianceA = {
    certification: { status: "verified", expiresAt: futureDate },
    regulatory: { fssai: { status: "verified", expiresAt: futureDate } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: {
      status: "verified",
      expiresAt: futureDate,
      laboratory: "Eurofins Food Testing",
      accreditation: "ISO/IEC 17025",
      reportNumber: "EF-2026-101",
    },
    sirabaQualification: { status: "verified" },
  };

  const complianceB = {
    certification: { status: "verified", expiresAt: futureDate },
    regulatory: { fssai: { status: "verified", expiresAt: futureDate } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const statusA = complianceService.computeTrustStatus({ compliance: complianceA, product: baseProduct });
  const statusB = complianceService.computeTrustStatus({ compliance: complianceB, product: baseProduct });

  assert.strictEqual(statusA.isTripleVerified, true, "Product A with lab evidence is Triple-Verified");
  assert.strictEqual(statusB.isTripleVerified, false, "Product B without lab evidence is NOT Triple-Verified");
});

// -----------------------------------------------------------------
// Test H: Same vendor, different batches -> Batch applicability respected
// -----------------------------------------------------------------
runTest("Test H: Same vendor, different batches -> Batch applicability respected", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const batchWithLab = {
    product: baseProduct._id,
    batchNumber: "BATCH-TESTED-01",
    laboratoryEvidence: [
      {
        status: "verified",
        laboratory: "Eurofins Food Testing",
        accreditation: "ISO/IEC 17025",
        reportNumber: "EF-2026-001",
        expiresAt: new Date("2027-01-01"),
      },
    ],
  };

  const batchWithoutLab = {
    product: baseProduct._id,
    batchNumber: "BATCH-UNTESTED-02",
    laboratoryEvidence: [],
  };

  const passport1 = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch: batchWithLab,
  });

  const passport2 = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch: batchWithoutLab,
  });

  assert.strictEqual(passport1.verified.safetyTested, true, "Batch with verified lab evidence passes safetyTested");
  assert.strictEqual(passport2.verified.safetyTested, false, "Batch without lab evidence fails safetyTested");
});

// -----------------------------------------------------------------
// Test I: High VQI / Vendor approved but missing mandatory evidence -> Cannot bypass VERIFIED gate
// -----------------------------------------------------------------
runTest("Test I: High VQI / Vendor approved but missing mandatory evidence -> Cannot bypass VERIFIED gate", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "pending", labelVerified: false, ingredientsVerified: false },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
    internalRiskScore: 98, // High VQI score
  };

  const trustStatus = complianceService.computeTrustStatus(compliance);
  assert.strictEqual(trustStatus.isVerified, false, "High score cannot bypass missing evidence");
  assert.strictEqual(trustStatus.isTripleVerified, false, "Cannot bypass Triple-Verified gate");
});

// -----------------------------------------------------------------
// Test J: scientificVerification.status = 'verified' BUT no actual lab document -> VERIFIED false
// -----------------------------------------------------------------
runTest("Test J: scientificVerification.status = 'verified' BUT no actual lab document -> VERIFIED must be false", () => {
  const compliance = {
    certification: { status: "verified", standard: "USDA NOP" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    // Standalone status without underlying document/details
    scientificVerification: { status: "verified", summary: "Arbitrary unbacked claim" },
    sirabaQualification: { status: "verified" },
  };

  const trustStatus = complianceService.computeTrustStatus({ compliance, batch: null, product: baseProduct });
  assert.strictEqual(trustStatus.isVerified, false, "Standalone scientificVerification status cannot self-authenticate");
  assert.strictEqual(trustStatus.isTripleVerified, false, "Triple-Verified must be false without underlying evidence");
});

// -----------------------------------------------------------------
// Test K: lab document exists BUT accreditation invalid/missing -> VERIFIED false
// -----------------------------------------------------------------
runTest("Test K: lab document exists BUT accreditation invalid/missing -> VERIFIED false", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const batchWithInvalidLab = {
    product: baseProduct._id,
    batchNumber: "B-INVALID-01",
    laboratoryEvidence: [
      {
        status: "verified",
        laboratory: "", // Missing laboratory name
        accreditation: "", // Missing accreditation
        reportNumber: "", // Missing report number
        parameters: [], // No parameters
      }
    ],
  };

  const trustStatus = complianceService.computeTrustStatus({
    compliance,
    batch: batchWithInvalidLab,
    product: baseProduct,
  });

  assert.strictEqual(trustStatus.isVerified, false, "Missing laboratory accreditation details must fail verification");
  assert.strictEqual(trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test L: approved lab document BUT wrong product -> VERIFIED false
// -----------------------------------------------------------------
runTest("Test L: approved lab document BUT wrong product -> VERIFIED false", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const batchOfDifferentProduct = {
    product: "different_product_999", // Belongs to a different product
    batchNumber: "B-DIFF-01",
    laboratoryEvidence: [
      {
        status: "verified",
        laboratory: "Eurofins Food Testing",
        accreditation: "ISO/IEC 17025",
        reportNumber: "EF-2026-9999",
      }
    ],
  };

  const trustStatus = complianceService.computeTrustStatus({
    compliance,
    batch: batchOfDifferentProduct,
    product: baseProduct,
  });

  assert.strictEqual(trustStatus.isVerified, false, "Evidence for Product A cannot verify Product B");
  assert.strictEqual(trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test M: approved lab document BUT wrong batch -> VERIFIED false where batch specificity is required
// -----------------------------------------------------------------
runTest("Test M: approved lab document BUT wrong batch -> VERIFIED false", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  // Current batch being queried has no lab evidence
  const unverifiedBatch = {
    product: baseProduct._id,
    batchNumber: "B-UNTESTED-888",
    laboratoryEvidence: [],
  };

  const passportDTO = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch: unverifiedBatch,
  });

  assert.strictEqual(passportDTO.verified.safetyTested, false, "Untested batch must fail safetyTested");
  assert.notStrictEqual(passportDTO.verified.status, "verified");
});

// -----------------------------------------------------------------
// Test N: approved document BUT expired -> VERIFIED false
// -----------------------------------------------------------------
runTest("Test N: approved document BUT expired -> VERIFIED false", () => {
  const pastDate = new Date("2021-06-15");
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const expiredBatch = {
    product: baseProduct._id,
    batchNumber: "B-EXPIRED-777",
    laboratoryEvidence: [
      {
        status: "verified",
        laboratory: "SGS India Laboratories",
        accreditation: "ISO/IEC 17025",
        reportNumber: "SGS-2021-777",
        expiresAt: pastDate,
      }
    ],
  };

  const trustStatus = complianceService.computeTrustStatus({
    compliance,
    batch: expiredBatch,
    product: baseProduct,
  }, new Date());

  assert.strictEqual(trustStatus.isVerified, false, "Expired batch evidence must fail Verified gate");
  assert.strictEqual(trustStatus.isTripleVerified, false);
});

// -----------------------------------------------------------------
// Test O: vendor approved BUT no scientific evidence -> QUALIFIED true, Triple-Verified false
// -----------------------------------------------------------------
runTest("Test O: vendor approved BUT no scientific evidence -> QUALIFIED true, Triple-Verified false", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
  };

  const passportDTO = complianceService.buildTrustPassportDTO({
    product: baseProduct,
    vendor: baseVendorApproved,
    compliance,
    batch: null,
  });

  assert.strictEqual(passportDTO.qualified.status, "approved", "Vendor is marketplace approved/qualified");
  assert.strictEqual(passportDTO.verified.safetyTested, false, "Safety testing is not satisfied");
  assert.notStrictEqual(passportDTO.verified.status, "verified");

  const trustStatus = complianceService.computeTrustStatus({ compliance, batch: null, product: baseProduct });
  assert.strictEqual(trustStatus.isQualified, true);
  assert.strictEqual(trustStatus.isTripleVerified, false, "Triple-Verified must be false");
});

// -----------------------------------------------------------------
// Test P: high VQI score BUT no scientific evidence -> Triple-Verified false
// -----------------------------------------------------------------
runTest("Test P: high VQI score BUT no scientific evidence -> Triple-Verified false", () => {
  const compliance = {
    certification: { status: "verified" },
    regulatory: { fssai: { status: "verified" } },
    productVerification: { status: "verified", labelVerified: true, ingredientsVerified: true },
    scientificVerification: { status: "pending" },
    sirabaQualification: { status: "verified" },
    internalRiskScore: 99.5,
  };

  const trustStatus = complianceService.computeTrustStatus({ compliance, batch: null, product: baseProduct });
  assert.strictEqual(trustStatus.isVerified, false);
  assert.strictEqual(trustStatus.isTripleVerified, false);
});

console.log("\n===============================================================");
console.log(`RESULTS: ${passedCount} Passed, ${failedCount} Failed`);
console.log("===============================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
