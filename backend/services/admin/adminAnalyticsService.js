/**
 * FSO Admin Analytics & Enterprise Settlement Service — Neon PostgreSQL via Prisma
 * Replaces legacy Mongoose aggregation & settlement queries in admin routes.
 */

const prisma = require('../../config/prisma');
const { VENDOR_PLANS } = require('../../config/vendorPlans');

/**
 * Get aggregated vendor analytics.
 */
const getVendorAnalytics = async () => {
  const [total, pending, approved, rejected, suspended] = await Promise.all([
    prisma.vendor.count(),
    prisma.vendor.count({ where: { status: 'PENDING' } }),
    prisma.vendor.count({ where: { status: 'APPROVED' } }),
    prisma.vendor.count({ where: { status: 'REJECTED' } }),
    prisma.vendor.count({ where: { status: 'SUSPENDED' } }),
  ]);

  return {
    totalVendors: total,
    pendingVendors: pending,
    approvedVendors: approved,
    rejectedVendors: rejected,
    suspendedVendors: suspended,
    activeVendors: approved,
  };
};

/**
 * Get overview platform analytics.
 */
const getOverviewAnalytics = async () => {
  const [totalUsers, totalVendors, totalProducts, totalOrders] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);

  return {
    totalUsers,
    totalVendors,
    totalProducts,
    totalOrders,
    platformCurrency: 'INR',
  };
};

/**
 * Get pricing tier configurations.
 */
const getPricingTiers = () => {
  return VENDOR_PLANS || {};
};

/**
 * Get enterprise settlements.
 */
const getEnterpriseSettlements = async ({ year, month }) => {
  const where = {};
  if (year) where.year = parseInt(year, 10);
  if (month) where.month = parseInt(month, 10);

  const settlements = await prisma.enterpriseSettlement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: { select: { id: true, businessName: true, email: true } },
    },
  });

  return settlements.map((s) => ({
    ...s,
    _id: s.id,
    vendor: s.vendor
      ? { _id: s.vendor.id, id: s.vendor.id, businessName: s.vendor.businessName }
      : null,
  }));
};

/**
 * Get pending approvals count and list.
 */
const getPendingApprovals = async () => {
  const [pendingVendors, pendingProducts] = await Promise.all([
    prisma.vendor.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        email: true,
        contactPerson: true,
        createdAt: true,
      },
    }),
    prisma.product.findMany({
      where: { vendorStatus: 'pending', isVendorProduct: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        createdAt: true,
        vendor: { select: { id: true, businessName: true } },
      },
    }),
  ]);

  return {
    pendingVendors: pendingVendors.map((v) => ({ ...v, _id: v.id })),
    pendingProducts: pendingProducts.map((p) => ({ ...p, _id: p.id })),
    totalPending: pendingVendors.length + pendingProducts.length,
  };
};

module.exports = {
  getVendorAnalytics,
  getOverviewAnalytics,
  getPricingTiers,
  getEnterpriseSettlements,
  getPendingApprovals,
};
