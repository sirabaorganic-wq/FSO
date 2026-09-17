/**
 * FSO Admin Product & Compliance Service — Neon PostgreSQL via Prisma
 * Replaces legacy Mongoose Product, ProductCompliance, ProductBatch, ComplianceAuditLog queries.
 */

const prisma = require('../../config/prisma');

/**
 * List vendor products with optional filters and pagination.
 */
const listVendorProducts = async ({ vendorId, status, page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = { isVendorProduct: true };
  if (vendorId) {
    where.vendorId = vendorId;
  }
  if (status) {
    where.vendorStatus = status.toLowerCase();
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        vendor: { select: { id: true, businessName: true, email: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const formatted = products.map((p) => ({
    ...p,
    _id: p.id,
    vendor: p.vendor
      ? { _id: p.vendor.id, id: p.vendor.id, businessName: p.vendor.businessName }
      : null,
  }));

  return {
    products: formatted,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    total,
  };
};

/**
 * Update vendor product status (approval, rejection).
 */
const updateVendorProduct = async (productId, updates) => {
  const data = {};
  if (updates.vendorStatus) data.vendorStatus = updates.vendorStatus.toLowerCase();
  if (updates.vendorRejectionReason !== undefined) data.vendorRejectionReason = updates.vendorRejectionReason;
  if (updates.isPublic !== undefined) data.isPublic = Boolean(updates.isPublic);
  if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);

  const updated = await prisma.product.update({
    where: { id: productId },
    data,
    include: {
      vendor: { select: { id: true, businessName: true } },
    },
  });

  return {
    ...updated,
    _id: updated.id,
  };
};

/**
 * Delete product.
 */
const deleteProduct = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { notFound: true };

  await prisma.$transaction([
    prisma.productCompliance.deleteMany({ where: { productId } }),
    prisma.productBatch.deleteMany({ where: { productId } }),
    prisma.complianceAuditLog.deleteMany({ where: { productId } }),
    prisma.review.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);

  return { success: true };
};

/**
 * Get product compliance record.
 */
const getProductCompliance = async (productId) => {
  const compliance = await prisma.productCompliance.findUnique({
    where: { productId },
  });

  if (!compliance) return null;
  return {
    ...compliance,
    _id: compliance.id,
  };
};

/**
 * Create or initialize product compliance record.
 */
const createProductCompliance = async (productId, data) => {
  const compliance = await prisma.productCompliance.create({
    data: {
      productId,
      overallStatus: data.overallStatus || 'PENDING_REVIEW',
      score: data.score || 0,
      provenance: data.provenance || {},
      testing: data.testing || {},
      certification: data.certification || {},
      traceability: data.traceability || {},
    },
  });

  return {
    ...compliance,
    _id: compliance.id,
  };
};

/**
 * Update a specific compliance dimension (provenance, testing, certification, traceability).
 */
const updateComplianceDimension = async (productId, dimension, data) => {
  const validDimensions = ['provenance', 'testing', 'certification', 'traceability'];
  if (!validDimensions.includes(dimension)) {
    throw new Error(`Invalid compliance dimension: ${dimension}`);
  }

  const existing = await prisma.productCompliance.findUnique({ where: { productId } });
  if (!existing) return null;

  const updateData = {};
  updateData[dimension] = data;

  const updated = await prisma.productCompliance.update({
    where: { productId },
    data: updateData,
  });

  return {
    ...updated,
    _id: updated.id,
  };
};

/**
 * Get product batches.
 */
const getProductBatches = async (productId) => {
  const batches = await prisma.productBatch.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  });

  return batches.map((b) => ({
    ...b,
    _id: b.id,
  }));
};

/**
 * Create product batch.
 */
const createProductBatch = async (productId, batchData) => {
  const batch = await prisma.productBatch.create({
    data: {
      productId,
      batchNumber: batchData.batchNumber,
      manufacturingDate: batchData.manufacturingDate ? new Date(batchData.manufacturingDate) : new Date(),
      expiryDate: batchData.expiryDate ? new Date(batchData.expiryDate) : null,
      quantityProduced: batchData.quantityProduced || 0,
      quantityRemaining: batchData.quantityRemaining || batchData.quantityProduced || 0,
      coaUrl: batchData.coaUrl || null,
      labResults: batchData.labResults || {},
      status: batchData.status || 'RELEASED',
    },
  });

  return {
    ...batch,
    _id: batch.id,
  };
};

/**
 * Update product batch.
 */
const updateProductBatch = async (productId, batchId, batchData) => {
  const data = {};
  if (batchData.status) data.status = batchData.status;
  if (batchData.quantityRemaining !== undefined) data.quantityRemaining = batchData.quantityRemaining;
  if (batchData.coaUrl) data.coaUrl = batchData.coaUrl;
  if (batchData.labResults) data.labResults = batchData.labResults;

  const updated = await prisma.productBatch.update({
    where: { id: batchId },
    data,
  });

  return {
    ...updated,
    _id: updated.id,
  };
};

/**
 * Get compliance audit logs for a product.
 */
const getComplianceAuditLog = async (productId) => {
  const logs = await prisma.complianceAuditLog.findMany({
    where: { productId },
    orderBy: { timestamp: 'desc' },
  });

  return logs.map((l) => ({
    ...l,
    _id: l.id,
  }));
};

module.exports = {
  listVendorProducts,
  updateVendorProduct,
  deleteProduct,
  getProductCompliance,
  createProductCompliance,
  updateComplianceDimension,
  getProductBatches,
  createProductBatch,
  updateProductBatch,
  getComplianceAuditLog,
};
