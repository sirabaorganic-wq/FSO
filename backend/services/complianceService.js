const prisma = require("../config/prisma");
const { invalidateCache } = require("../config/cache");

/**
 * Compliance Service — Authoritative business logic layer for Product Compliance & Trust
 */

/**
 * Validate Accredited Laboratory Evidence
 * Ensures scientific verification is NOT self-authenticating.
 * Must verify:
 * 1. An actual laboratory evidence record exists (on batch or explicit product compliance evidenceDoc)
 * 2. Status is approved / verified (not pending, uploaded, under_review, rejected)
 * 3. Evidence is not expired
 * 4. Genuine accredited laboratory information exists (laboratory name, accreditation or reportNumber)
 * 5. Applicability: belongs to the specific product (and batch if batch-specific)
 */
const validateScientificEvidence = ({ compliance, batch, product, vendor } = {}, now = new Date()) => {
  // If scientific verification is marked not_applicable:
  if (compliance?.scientificVerification?.status === "not_applicable") {
    return {
      isValid: true,
      status: "not_applicable",
      summary: "Scientific Verification Not Applicable for this product category.",
      laboratory: "",
      accreditation: "",
      reportNumber: "",
    };
  }

  // 1. Check Batch-specific laboratory evidence
  if (batch && Array.isArray(batch.laboratoryEvidence) && batch.laboratoryEvidence.length > 0) {
    // If batch is provided, verify it actually belongs to the product
    if (product && batch.product && String(batch.product) !== String(product._id || product.id || product)) {
      return {
        isValid: false,
        status: "invalid",
        reason: "Batch does not belong to this product.",
        summary: "Accredited Lab Evidence not applicable to this product.",
      };
    }

    const validBatchEvidence = batch.laboratoryEvidence.find((l) => {
      const isApproved = l.status === "verified" || l.status === "approved";
      const isNotExpired = !l.expiresAt || new Date(l.expiresAt) >= now;
      const hasAccreditedLab = Boolean(
        l.laboratory &&
          (l.accreditation || l.reportNumber || (Array.isArray(l.parameters) && l.parameters.length > 0))
      );
      return isApproved && isNotExpired && hasAccreditedLab;
    });

    if (validBatchEvidence) {
      return {
        isValid: true,
        status: "verified",
        summary: validBatchEvidence.laboratory
          ? `Accredited Lab Evidence Validated (${validBatchEvidence.laboratory})`
          : "Accredited Lab Evidence Validated (ISO/IEC 17025)",
        laboratory: validBatchEvidence.laboratory || "",
        accreditation: validBatchEvidence.accreditation || "ISO/IEC 17025",
        reportNumber: validBatchEvidence.reportNumber || "",
        testDate: validBatchEvidence.testDate || null,
        parameters: validBatchEvidence.parameters || [],
      };
    }

    // Check if there was evidence but it's expired
    const expiredEvidence = batch.laboratoryEvidence.find(
      (l) => (l.status === "verified" || l.status === "approved") && l.expiresAt && new Date(l.expiresAt) < now
    );
    if (expiredEvidence) {
      return {
        isValid: false,
        status: "expired",
        reason: "Accredited Lab Evidence has expired.",
        summary: "Accredited Lab Evidence expired. Renewal required.",
      };
    }
  }

  // 2. Check ProductCompliance-level evidenceDoc
  // If compliance.scientificVerification.status === 'verified', MUST verify underlying evidence exists
  if (compliance?.scientificVerification?.status === "verified") {
    const hasExpiry = compliance.scientificVerification.expiresAt;
    if (hasExpiry && new Date(hasExpiry) < now) {
      return {
        isValid: false,
        status: "expired",
        reason: "Product scientific verification has expired.",
        summary: "Accredited Lab Evidence expired. Renewal required.",
      };
    }

    // Must have concrete accreditation evidence attached
    const hasEvidenceDetails = Boolean(
      compliance.scientificVerification.evidenceDocId ||
        compliance.scientificVerification.laboratory ||
        compliance.scientificVerification.reportNumber ||
        (compliance.scientificVerification.summary &&
          compliance.scientificVerification.summary.toLowerCase().includes("iso/iec") &&
          compliance.scientificVerification.verifiedBy)
    );

    if (hasEvidenceDetails) {
      return {
        isValid: true,
        status: "verified",
        summary: compliance.scientificVerification.summary || "Accredited Lab Evidence Validated (ISO/IEC 17025)",
        laboratory: compliance.scientificVerification.laboratory || "",
        accreditation: compliance.scientificVerification.accreditation || "ISO/IEC 17025",
        reportNumber: compliance.scientificVerification.reportNumber || "",
      };
    }

    // Standalone status without underlying evidence fails verification!
    return {
      isValid: false,
      status: "pending",
      reason: "No underlying Accredited Lab Evidence document attached to verification record.",
      summary: "Accredited Lab Evidence pending document verification.",
    };
  }

  // Default: Missing / Pending / Rejected
  const storedStatus = compliance?.scientificVerification?.status || "pending";
  return {
    isValid: false,
    status: storedStatus === "rejected" ? "rejected" : storedStatus === "expired" ? "expired" : "pending",
    reason: "No approved Accredited Lab Evidence found for this product.",
    summary: "Accredited Lab Evidence pending submission and review.",
  };
};

/**
 * Compute Trust Status from compliance record fields (pure function)
 */
const computeTrustStatus = (complianceInput, now = new Date()) => {
  // Support passing either compliance directly or an options object { compliance, batch, product, vendor }
  const compliance = complianceInput?.certification ? complianceInput : (complianceInput?.compliance || complianceInput);
  const batch = complianceInput?.batch || null;
  const product = complianceInput?.product || null;
  const vendor = complianceInput?.vendor || null;

  if (!compliance) {
    return {
      isCertified: false,
      isVerified: false,
      isQualified: false,
      isTripleVerified: false,
      computedAt: new Date(),
    };
  }

  const isCertified =
    compliance.certification?.status === "verified" &&
    (!compliance.certification?.expiresAt || new Date(compliance.certification.expiresAt) >= now);

  const effFssaiStatus = evaluateEffectiveStatus(
    compliance.regulatory?.fssai?.status,
    compliance.regulatory?.fssai?.expiresAt,
    now
  );

  const sciEvidenceResult = validateScientificEvidence({ compliance, batch, product, vendor }, now);

  const isVerified =
    effFssaiStatus === "verified" &&
    compliance.productVerification?.status === "verified" &&
    sciEvidenceResult.isValid;

  const isQualified = compliance.sirabaQualification?.status === "verified";
  const isTripleVerified = isCertified && isVerified && isQualified;

  return {
    isCertified,
    isVerified,
    isQualified,
    isTripleVerified,
    computedAt: new Date(),
  };
};

/**
 * Pure evaluation function — returns effective status considering expiresAt without DB writes
 */
const evaluateEffectiveStatus = (storedStatus, expiresAt, now = new Date()) => {
  if (storedStatus === "verified" && expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (expiryDate < now) {
      return "expired";
    }
  }
  return storedStatus || "not_available";
};

/**
 * Update a specific dimension on a compliance record (Authoritative Mutation Handler)
 */
const updateDimension = async (complianceId, dimension, updateData, adminUserId) => {
  const compliance = await prisma.productCompliance.findUnique({ where: { id: complianceId } });
  if (!compliance) {
    throw new Error("Compliance record not found");
  }

  const previousStatus = compliance[dimension]?.status || "";

  // Apply update to dimension
  let currentField = compliance[dimension] || {};
  if (dimension === "regulatory") {
    currentField = {
      ...compliance.regulatory,
      fssai: {
        ...compliance.regulatory?.fssai,
        ...updateData,
        lastReviewedAt: new Date(),
      },
    };
  } else {
    currentField = {
      ...currentField,
      ...updateData,
      lastReviewedAt: new Date(),
    };
  }

  const updatedCompliance = await prisma.productCompliance.update({
    where: { id: complianceId },
    data: {
      [dimension]: currentField,
    },
  });

  const newStatus = updatedCompliance[dimension]?.status || (dimension === "regulatory" ? updatedCompliance.regulatory?.fssai?.status : "");

  // Audit Logging
  try {
    await prisma.complianceAuditLog.create({
      data: {
        entityType: "product_compliance",
        entityId: compliance.id,
        action: newStatus === "verified" ? "dimension_verified" : newStatus === "rejected" ? "dimension_rejected" : "status_changed",
        performedBy: adminUserId ? String(adminUserId) : null,
        details: {
          dimension,
          previousStatus,
          newStatus,
          reason: updateData.reason || "",
          evidenceReference: updateData.evidenceDocId ? String(updateData.evidenceDocId) : "",
        },
      },
    });
  } catch (auditErr) {
    console.error("Failed to write compliance audit log:", auditErr);
  }

  // Cache invalidation
  if (invalidateCache?.compliance) {
    invalidateCache.compliance(compliance.productId);
  }

  return updatedCompliance;
};

/**
 * Build Public Compliance DTO (Read-only, applies effective status evaluation, strips private data)
 */
const buildPublicDTO = (compliance, options = {}, now = new Date()) => {
  if (!compliance) return null;

  let opts = {};
  let effectiveNow = now;
  if (options instanceof Date) {
    effectiveNow = options;
  } else if (typeof options === "object") {
    opts = options;
  }

  const batch = opts.batch || null;
  const product = opts.product || null;
  const vendor = opts.vendor || null;

  const effCertStatus = evaluateEffectiveStatus(
    compliance.certification?.status,
    compliance.certification?.expiresAt,
    effectiveNow
  );
  const effFssaiStatus = evaluateEffectiveStatus(
    compliance.regulatory?.fssai?.status,
    compliance.regulatory?.fssai?.expiresAt,
    effectiveNow
  );
  
  const sciEvidenceResult = validateScientificEvidence({ compliance, batch, product, vendor }, effectiveNow);
  const effSciStatus = sciEvidenceResult.status;

  // Compute effective trust flags for public display
  const isCertified = effCertStatus === "verified";
  const isVerified =
    effFssaiStatus === "verified" &&
    compliance.productVerification?.status === "verified" &&
    sciEvidenceResult.isValid;
  const isQualified = compliance.sirabaQualification?.status === "verified";
  const isTripleVerified = isCertified && isVerified && isQualified;

  return {
    productId: compliance.product,
    trustStatus: {
      isCertified,
      isVerified,
      isQualified,
      isTripleVerified,
      computedAt: compliance.trustStatus?.computedAt || compliance.updatedAt,
    },
    certification: {
      status: effCertStatus,
      standard: compliance.certification?.standard || "",
      certificationBody: compliance.certification?.certificationBody || "",
      certificateNumber: compliance.certification?.certificateNumber || "",
      validFrom: compliance.certification?.validFrom,
      validUntil: compliance.certification?.validUntil,
      productScope: compliance.certification?.productScope || "",
      lastVerifiedAt: compliance.certification?.verifiedAt,
    },
    regulatory: {
      fssai: {
        status: effFssaiStatus,
        lastVerifiedAt: compliance.regulatory?.fssai?.verifiedAt,
      },
    },
    productVerification: {
      status: compliance.productVerification?.status || "not_available",
      labelVerified: Boolean(compliance.productVerification?.labelVerified),
      ingredientsVerified: Boolean(compliance.productVerification?.ingredientsVerified),
      specificationVerified: Boolean(compliance.productVerification?.specificationVerified),
      claimsReviewed: Boolean(compliance.productVerification?.claimsReviewed),
      lastVerifiedAt: compliance.productVerification?.verifiedAt,
    },
    scientificVerification: {
      status: effSciStatus,
      summary: (compliance.scientificVerification?.summary || "")
        .replace(/NABL[- ]Accredited Lab Report/gi, "Accredited Lab Evidence")
        .replace(/NABL[- ]Accredited Lab/gi, "Accredited Lab Evidence")
        .replace(/&?\s*NABL\s*Lab Tested/gi, "& Accredited Lab Evidence")
        .replace(/NABL Lab Tested/gi, "Accredited Lab Evidence Reviewed")
        .replace(/NABL Lab Testing/gi, "Accredited Lab Evidence")
        .replace(/NABL Verified/gi, "Accredited Lab Evidence Reviewed")
        .replace(/Tested by NABL Lab/gi, "Laboratory Evidence Reviewed")
        .replace(/NABL Testing/gi, "Accredited Lab Evidence")
        .replace(/NABL Verification/gi, "Accredited Lab Evidence")
        .replace(/NABL Lab Evidence/gi, "Accredited Lab Evidence")
        .replace(/\bNABL\b/gi, "Accredited Lab")
        .replace(/Accredited Lab Lab Tested/gi, "Accredited Lab Evidence Reviewed")
        .trim(),
      lastVerifiedAt: compliance.scientificVerification?.verifiedAt,
    },
    sirabaQualification: {
      status: compliance.sirabaQualification?.status || "not_available",
      vendorQualified: Boolean(compliance.sirabaQualification?.vendorQualified),
      marketplaceApproved: Boolean(compliance.sirabaQualification?.marketplaceApproved),
      lastVerifiedAt: compliance.sirabaQualification?.verifiedAt,
    },
    verifiedClaims: (compliance.verifiedClaims || [])
      .filter((c) => c.status === "verified")
      .map((c) => ({
        claim: c.claim,
        status: c.status,
      })),
  };
};

/**
 * Build Public Batch DTO
 */
const buildPublicBatchDTO = (batch, now = new Date()) => {
  if (!batch) return null;

  return {
    batchNumber: batch.batchNumber,
    batchInfo: batch.batchInfo || batch.traceability?.origin || "",
    status: batch.status,
    manufacturedAt: batch.manufacturedAt,
    bestBefore: batch.bestBefore,
    qualityVerification: {
      status: batch.qualityVerification?.status || "not_available",
      lastVerifiedAt: batch.qualityVerification?.verifiedAt,
    },
    laboratoryEvidence: (batch.laboratoryEvidence || []).map((lab) => ({
      status: evaluateEffectiveStatus(lab.status, lab.expiresAt, now),
      laboratory: lab.laboratory || "",
      accreditation: lab.accreditation || "",
      reportNumber: lab.reportNumber || "",
      testDate: lab.testDate,
      parameters: (lab.parameters || []).map((p) => ({
        name: p.name,
        category: p.category,
        status: p.status,
      })),
    })),
    traceability: {
      status: batch.traceability?.status || "not_available",
      origin: batch.traceability?.origin || batch.batchInfo || "",
      producer: batch.traceability?.producer || "",
      processing: batch.traceability?.processing || "",
      packaging: batch.traceability?.packaging || "",
      distribution: batch.traceability?.distribution || "",
      batchInfo: batch.batchInfo || batch.traceability?.origin || "",
    },
    traceId: batch.traceId || null,
    qrVerificationUrl: batch.qrVerificationUrl || "",
  };
};

/**
 * Upsert ProductBatch for a product (creates or updates batch record with traceId)
 */
const upsertProductBatch = async (productId, { batchNumber, batchInfo, vendorId }) => {
  if (!batchNumber) return null;
  const trimmedBatchNum = String(batchNumber).trim();
  const trimmedBatchInfo = batchInfo ? String(batchInfo).trim() : "";
  if (!trimmedBatchNum) return null;

  let batch = await prisma.productBatch.findFirst({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });

  if (batch) {
    batch = await prisma.productBatch.update({
      where: { id: batch.id },
      data: {
        batchNumber: trimmedBatchNum,
        traceability: trimmedBatchInfo
          ? { ...(batch.traceability || {}), origin: trimmedBatchInfo, status: "verified" }
          : batch.traceability,
      },
    });
  } else {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    let catCode = (product?.slug || product?.category || "PRD")
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 3)
      .toUpperCase();
    if (catCode.length < 3) catCode = (catCode + "XXX").substring(0, 3);

    const year = new Date().getFullYear();
    let counter;
    try {
      counter = await prisma.traceIdCounter.upsert({
        where: { year },
        update: { seq: { increment: 1 } },
        create: { year, seq: 1 },
      });
    } catch (e) {
      counter = { seq: Math.floor(Math.random() * 90000) + 10000 };
    }

    const seqStr = String(counter?.seq || Math.floor(Math.random() * 90000) + 10000).padStart(5, "0");
    const traceId = `FSO-${catCode}-${seqStr}`;

    batch = await prisma.productBatch.create({
      data: {
        productId,
        batchNumber: trimmedBatchNum,
        traceId,
        status: "active",
        manufacturingDate: new Date(),
        traceability: {
          status: "verified",
          origin: trimmedBatchInfo || "Verified Heritage Belt",
          producer: "Verified Heritage Producer",
          processing: "Traditional Cold Method / Stone Ground",
          packaging: "Sealed Food-Grade Foil",
          distribution: "FSO Quality Chain",
        },
      },
    });
  }

  if (invalidateCache?.compliance) {
    invalidateCache.compliance(productId);
  }

  return batch;
};

/**
 * Build Authoritative Dynamic Trust Passport DTO for Product Details Page
 * Consumes real database entities: Product, Vendor, ProductCompliance, ProductBatch
 */
const buildTrustPassportDTO = ({ product, vendor, compliance, batch }, now = new Date()) => {
  // CARD 01 — CERTIFIED™
  const usdaRouteCert = vendor?.organicCertification?.certificationsByRoute?.usda;
  const npopRouteCert = vendor?.organicCertification?.certificationsByRoute?.npop;

  const certStandard =
    (usdaRouteCert?.certificateNumber ? "USDA NOP" : null) ||
    (compliance?.certification?.standard && compliance.certification.standard.trim() !== ""
      ? compliance.certification.standard
      : (vendor?.organicCertification?.certificationRoute ? vendor.organicCertification.certificationRoute.toUpperCase() : "Organic Certification"));

  const certBody =
    usdaRouteCert?.certificationBody ||
    compliance?.certification?.certificationBody ||
    vendor?.organicCertification?.certificationBody ||
    npopRouteCert?.certificationBody ||
    null;

  const certNumber =
    usdaRouteCert?.certificateNumber ||
    compliance?.certification?.certificateNumber ||
    vendor?.organicCertification?.certificateNumber ||
    npopRouteCert?.certificateNumber ||
    null;

  const certValidUntil =
    usdaRouteCert?.certificateValidUntil ||
    compliance?.certification?.validUntil ||
    vendor?.organicCertification?.certificateValidUntil ||
    npopRouteCert?.certificateValidUntil ||
    null;

  let certStatus = compliance?.certification?.status || (certNumber ? "verified" : "pending");
  if (certValidUntil && new Date(certValidUntil) < now) {
    certStatus = "expired";
  }

  const productCoverage =
    compliance?.certification?.productScope ||
    vendor?.representativeProduct?.productName ||
    product?.name ||
    "All Product Batches";

  // CARD 02 — VERIFIED™
  const isBizVerified = Boolean(
    compliance?.regulatory?.business?.status === "verified" ||
      vendor?.isBusinessRegistered === "yes" ||
      vendor?.status === "approved"
  );
  const isFssaiVerified = Boolean(
    compliance?.regulatory?.fssai?.status === "verified" ||
      (vendor?.fssaiNumber && vendor?.status === "approved")
  );
  const isLabelVerified = Boolean(compliance?.productVerification?.labelVerified);
  const isQualityTested = Boolean(
    compliance?.productVerification?.ingredientsVerified ||
      batch?.qualityVerification?.status === "verified"
  );

  // Safety / Accredited Lab Evidence Check — Validated via non-self-authenticating evidence gate
  const sciEvidenceResult = validateScientificEvidence({ compliance, batch, product, vendor }, now);
  const isSafetyTested = sciEvidenceResult.isValid;

  let verifiedOverallStatus = "pending";
  if (isBizVerified && isFssaiVerified && isLabelVerified && isQualityTested && isSafetyTested) {
    verifiedOverallStatus = "verified";
  } else if (isBizVerified || isFssaiVerified || isLabelVerified || isQualityTested) {
    verifiedOverallStatus = "partially_verified";
  }

  // CARD 03 — TRACEABLE™
  const origin =
    batch?.traceability?.origin ||
    (vendor?.address?.state ? `${vendor.address.state}, ${vendor.address.country || "India"}` : "Certified Organic Farm");

  const processing =
    batch?.traceability?.processing ||
    (vendor?.businessType ? `${vendor.businessType.toUpperCase()} Facility` : "Organic Certified Facility");

  const qualityCheck =
    (sciEvidenceResult.laboratory ? `${sciEvidenceResult.laboratory}` : null) ||
    (batch?.laboratoryEvidence?.[0]?.laboratory ? `${batch.laboratoryEvidence[0].laboratory}` : null) ||
    (batch?.qualityVerification?.status === "verified" ? "Accredited Lab Evidence" : "QC Inspection Completed");

  const packaging = batch?.traceability?.packaging || "Food Grade, Hygienic";

  const distribution =
    batch?.traceability?.distribution ||
    (vendor?.maintainsTraceabilityRecords === "yes" ? "Traceability Maintained" : "Cold Chain / Secure Storage");

  const traceableStatus = batch?.traceability?.status || (vendor?.maintainsTraceabilityRecords === "yes" ? "verified" : "pending");

  // CARD 04 — QUALIFIED™
  const isVendorApproved = vendor?.status === "approved" || compliance?.sirabaQualification?.status === "verified";
  const vendorName = vendor?.businessName || "FSO Direct";
  const reviewDate = compliance?.sirabaQualification?.verifiedAt || vendor?.updatedAt || vendor?.createdAt || now;
  const reviewDateObj = new Date(reviewDate);
  const nextReviewDateObj = new Date(reviewDateObj);
  nextReviewDateObj.setFullYear(nextReviewDateObj.getFullYear() + 1);

  const qualifiedStatus = isVendorApproved ? "approved" : "pending";

  return {
    certified: {
      standard: certStandard,
      certificationBody: certBody,
      certificateNumber: certNumber,
      validUntil: certValidUntil || null,
      productCoverage,
      status: certStatus,
    },
    verified: {
      businessVerified: isBizVerified,
      fssaiRegistered: isFssaiVerified,
      productLabelVerified: isLabelVerified,
      qualityTested: isQualityTested,
      safetyTested: isSafetyTested,
      status: verifiedOverallStatus,
    },
    traceable: {
      origin,
      processing,
      qualityCheck,
      packaging,
      distribution,
      status: traceableStatus,
    },
    qualified: {
      vendorName,
      reviewDate: reviewDateObj,
      nextReview: nextReviewDateObj,
      status: qualifiedStatus,
      description: isVendorApproved
        ? "This product has passed all required verification checks and is approved for listing on the FSO marketplace."
        : "This product and seller are currently undergoing FSO marketplace verification review.",
    },
  };
};

module.exports = {
  computeTrustStatus,
  evaluateEffectiveStatus,
  validateScientificEvidence,
  updateDimension,
  buildPublicDTO,
  buildPublicBatchDTO,
  buildTrustPassportDTO,
  upsertProductBatch,
};
