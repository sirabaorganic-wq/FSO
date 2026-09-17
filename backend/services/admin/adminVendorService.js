/**
 * FSO Admin Vendor Service — Neon PostgreSQL via Prisma
 * Replaces legacy Mongoose Vendor queries in admin routes.
 */

const prisma = require('../../config/prisma');

/**
 * List vendors with optional status filter, case-insensitive search, and pagination.
 */
const listVendors = async ({ status, search, page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status.toUpperCase();
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { businessName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { contactPerson: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  const formattedVendors = vendors.map((v) => ({
    ...v,
    _id: v.id,
    status: v.status.toLowerCase(),
    businessType: v.businessType.toLowerCase(),
  }));

  return {
    vendors: formattedVendors,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    total,
  };
};

/**
 * Get single vendor detail with notes and verification relations.
 */
const getVendorById = async (id) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      adminNotes: {
        include: { addedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      verificationBadges: true,
      approvedBy: { select: { id: true, name: true, email: true } },
      subadminApprovedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!vendor) return null;

  return {
    ...vendor,
    _id: vendor.id,
    status: vendor.status.toLowerCase(),
    businessType: vendor.businessType.toLowerCase(),
  };
};

/**
 * Update vendor approval status.
 */
const updateVendorStatus = async (id, status, rejectionReason, adminUserId) => {
  const upperStatus = status.toUpperCase();
  const isApproved = upperStatus === 'APPROVED';

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      status: upperStatus,
      rejectionReason: upperStatus === 'REJECTED' ? rejectionReason : null,
      approvedById: isApproved ? adminUserId : undefined,
      approvedAt: isApproved ? new Date() : undefined,
    },
    include: {
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    ...updated,
    _id: updated.id,
    status: updated.status.toLowerCase(),
  };
};

/**
 * Update vendor commission rate.
 */
const updateVendorCommission = async (id, commissionRate) => {
  const rate = parseFloat(commissionRate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    throw new Error('Commission rate must be a number between 0 and 100');
  }

  // Stored in metrics JSON / shopSettings
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return null;

  const metrics = typeof vendor.metrics === 'object' && vendor.metrics !== null ? vendor.metrics : {};
  metrics.commissionRate = rate;

  const updated = await prisma.vendor.update({
    where: { id },
    data: { metrics },
  });

  return {
    vendorId: updated.id,
    _id: updated.id,
    commissionRate: rate,
  };
};

/**
 * Update vendor allowed categories (stored in vendor tags array).
 */
const updateVendorCategories = async (id, categories) => {
  const cats = Array.isArray(categories) ? categories : [];
  const updated = await prisma.vendor.update({
    where: { id },
    data: { tags: cats },
  });

  return {
    allowedCategories: updated.tags,
  };
};

/**
 * Add an administrative note to a vendor.
 */
const addVendorNote = async (id, note, authorId) => {
  const createdNote = await prisma.vendorAdminNote.create({
    data: {
      vendorId: id,
      note,
      addedById: authorId,
    },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  });

  const allNotes = await prisma.vendorAdminNote.findMany({
    where: { vendorId: id },
    orderBy: { createdAt: 'desc' },
  });

  return allNotes;
};

/**
 * Update vendor organic certifications.
 */
const updateVendorCertifications = async (id, certifications, verified, adminUserId) => {
  const certList = Array.isArray(certifications) ? certifications : [];

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      certifications: certList,
      certificationsVerified: Boolean(verified),
      certificationsVerifiedAt: verified ? new Date() : null,
    },
  });

  if (adminUserId) {
    await prisma.vendorAdminNote.create({
      data: {
        vendorId: id,
        note: `Certifications ${verified ? 'verified' : 'updated'}: ${certList.join(', ')}`,
        addedById: adminUserId,
      },
    }).catch(() => {});
  }

  return {
    certifications: updated.certifications,
    certificationsVerified: updated.certificationsVerified,
    certificationsVerifiedAt: updated.certificationsVerifiedAt,
    message: `Vendor certifications ${verified ? 'verified' : 'updated'} successfully`,
  };
};

/**
 * Safe vendor deletion adhering to Gate 3:
 * Never hard-delete vendors with historical orders, transfers, or settlements.
 */
const deleteVendor = async (id) => {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) return { notFound: true };

  const [orderCount, transferCount, settlementCount] = await Promise.all([
    prisma.vendorOrder.count({ where: { vendorId: id } }),
    prisma.vendorTransfer.count({ where: { vendorId: id } }),
    prisma.enterpriseSettlement.count({ where: { vendorId: id } }),
  ]);

  const hasHistoricalRecords = orderCount > 0 || transferCount > 0 || settlementCount > 0;

  if (hasHistoricalRecords) {
    // Soft-delete to preserve audit trails & financial history
    await prisma.vendor.update({
      where: { id },
      data: {
        isActive: false,
        status: 'SUSPENDED',
      },
    });

    return {
      success: true,
      softDeleted: true,
      message: `Vendor '${vendor.businessName}' has historical records (${orderCount} orders, ${transferCount} payouts). Account deactivated and suspended to preserve financial audit trail.`,
    };
  }

  // Safe hard delete for un-onboarded draft vendors with 0 orders/transfers
  await prisma.$transaction([
    prisma.vendorAdminNote.deleteMany({ where: { vendorId: id } }),
    prisma.vendorVerificationBadge.deleteMany({ where: { vendorId: id } }),
    prisma.product.updateMany({ where: { vendorId: id }, data: { vendorId: null } }),
    prisma.vendor.delete({ where: { id } }),
  ]);

  return {
    success: true,
    softDeleted: false,
    message: `Vendor '${vendor.businessName}' and associated draft data removed successfully.`,
  };
};

/**
 * Bulk delete vendors with safety audit protection.
 */
const bulkDeleteVendors = async (vendorIds) => {
  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw new Error('No vendor IDs provided for deletion');
  }

  const results = [];
  for (const id of vendorIds) {
    const res = await deleteVendor(id);
    if (!res.notFound) {
      results.push({ id, ...res });
    }
  }

  return {
    message: `Processed deletion for ${results.length} vendor(s)`,
    count: results.length,
    details: results,
  };
};

module.exports = {
  listVendors,
  getVendorById,
  updateVendorStatus,
  updateVendorCommission,
  updateVendorCategories,
  addVendorNote,
  updateVendorCertifications,
  deleteVendor,
  bulkDeleteVendors,
};
