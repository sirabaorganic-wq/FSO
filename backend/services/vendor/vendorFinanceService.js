/**
 * FSO Vendor Finance & Wallet Service — Neon PostgreSQL via Prisma
 * Strictly derives ownership from authenticated vendorId.
 */

const prisma = require('../../config/prisma');
const { VENDOR_PLANS } = require('../../config/vendorPlans');

/**
 * Get aggregated dashboard statistics for vendor.
 */
const getDashboardStats = async (vendorId) => {
  const [totalOrders, pendingOrders, totalProducts, vendorOrders] = await Promise.all([
    prisma.vendorOrder.count({ where: { vendorId } }),
    prisma.vendorOrder.count({ where: { vendorId, status: { in: ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_TO_SHIP'] } } }),
    prisma.product.count({ where: { vendorId, isActive: true } }),
    prisma.vendorOrder.findMany({
      where: { vendorId },
      select: { subtotal: true, payoutAmount: true, status: true },
    }),
  ]);

  let totalSales = 0;
  let totalEarnings = 0;

  for (const vo of vendorOrders) {
    if (vo.status !== 'CANCELLED') {
      totalSales += vo.subtotal || 0;
      totalEarnings += vo.payoutAmount || 0;
    }
  }

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalOrders,
    pendingOrders,
    totalProducts,
  };
};

/**
 * List vendor payouts / transfers.
 */
const listPayouts = async (vendorId) => {
  const transfers = await prisma.vendorTransfer.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    payouts: transfers.map((t) => ({ ...t, _id: t.id })),
    total: transfers.length,
  };
};

/**
 * Get vendor wallet balance & ledger.
 * Available balance derives strictly from delivered orders net earnings minus non-failed transfers.
 */
const getWalletBalance = async (vendorId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true, isActive: true },
  });

  if (!vendor) return null;

  const [orders, transfers] = await Promise.all([
    prisma.vendorOrder.findMany({
      where: { vendorId },
      select: { status: true, payoutAmount: true, payoutStatus: true },
    }),
    prisma.vendorTransfer.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let deliveredEarnings = 0;
  let pendingEarnings = 0;
  const safeOrders = orders || [];
  const safeTransfers = transfers || [];

  for (const o of safeOrders) {
    if (o.status === 'DELIVERED') {
      deliveredEarnings += o.payoutAmount || 0;
    } else if (o.status !== 'CANCELLED') {
      pendingEarnings += o.payoutAmount || 0;
    }
  }

  let totalDeductions = 0;
  let totalPaidOut = 0;

  for (const t of safeTransfers) {
    const status = (t.status || '').toLowerCase();
    if (status !== 'failed' && status !== 'reversed') {
      totalDeductions += t.amount || 0;
    }
    if (status === 'completed' || status === 'processed') {
      totalPaidOut += t.amount || 0;
    }
  }

  const availableBalance = Math.max(0, Math.round((deliveredEarnings - totalDeductions) * 100) / 100);
  const pendingBalance = Math.round(pendingEarnings * 100) / 100;

  return {
    balance: availableBalance,
    availableBalance,
    pendingBalance,
    totalPaidOut: Math.round(totalPaidOut * 100) / 100,
    transactions: safeTransfers.slice(0, 20).map((t) => ({ ...t, _id: t.id })),
  };
};

/**
 * Request payout from wallet balance.
 * Enforces:
 * - Minimum ₹500
 * - Available balance >= requested amount
 * - Duplicate request protection: 409 if pending/processing payout exists
 * - Status starts at pending
 */
const requestPayout = async (vendorId, amount) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true, isActive: true },
  });

  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const normalizedStatus = (vendor.status || '').toUpperCase();
  if (normalizedStatus !== 'APPROVED' || !vendor.isActive) {
    const err = new Error('Vendor is not approved or active to request payouts');
    err.statusCode = 403;
    throw err;
  }

  const reqAmount = parseFloat(amount);
  if (isNaN(reqAmount) || reqAmount < 500) {
    const err = new Error('Minimum payout amount is ₹500');
    err.statusCode = 400;
    throw err;
  }

  // 1. Concurrency / Duplicate check
  const existingPending = await prisma.vendorTransfer.findFirst({
    where: {
      vendorId,
      status: { in: ['pending', 'processing', 'initiated'] },
    },
  });

  if (existingPending) {
    const err = new Error('PAYOUT_ALREADY_IN_PROGRESS');
    err.statusCode = 409;
    throw err;
  }

  // 2. Available balance check
  const wallet = await getWalletBalance(vendorId);
  if (reqAmount > wallet.availableBalance) {
    const err = new Error('INSUFFICIENT_WALLET_BALANCE');
    err.statusCode = 400;
    throw err;
  }

  // 3. Create transfer in pending status
  const transfer = await prisma.vendorTransfer.create({
    data: {
      vendorId,
      amount: reqAmount,
      status: 'pending',
      transferType: 'manual_request',
    },
  });

  return {
    success: true,
    message: 'Payout request submitted successfully',
    transfer: { ...transfer, _id: transfer.id },
  };
};

/**
 * Get vendor analytics distinguishing period metrics from snapshot metrics.
 */
const getVendorAnalytics = async (vendorId, period = '30d') => {
  const now = new Date();
  let startDate = null;

  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      startDate = null;
      break;
  }

  const orderWhere = {
    vendorId,
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };

  const [periodOrders, allProducts, pendingOrdersCount, wallet] = await Promise.all([
    prisma.vendorOrder.findMany({
      where: orderWhere,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { vendorId },
      select: { id: true, stockQuantity: true, price: true, isActive: true },
    }),
    prisma.vendorOrder.count({
      where: { vendorId, status: { in: ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_TO_SHIP'] } },
    }),
    getWalletBalance(vendorId),
  ]);

  // Period Metrics
  let revenue = 0;
  let payout = 0;
  let commission = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let productsSold = 0;
  const safePeriodOrders = periodOrders || [];
  const safeAllProducts = allProducts || [];
  const trendMap = {};

  for (const vo of safePeriodOrders) {
    const isCancelled = vo.status === 'CANCELLED';
    if (!isCancelled) {
      revenue += vo.subtotal || 0;
      payout += vo.payoutAmount || 0;
      commission += vo.commissionAmount || 0;
      if (vo.status === 'DELIVERED') {
        completedOrders += 1;
      }

      // Products sold from items JSON snapshot
      if (Array.isArray(vo.items)) {
        for (const item of vo.items) {
          productsSold += parseInt(item.quantity || item.qty, 10) || 1;
        }
      }
    } else {
      cancelledOrders += 1;
    }

    // Trend grouping by YYYY-MM-DD
    const dateKey = vo.createdAt instanceof Date
      ? vo.createdAt.toISOString().split('T')[0]
      : String(vo.createdAt).split('T')[0];
    if (!trendMap[dateKey]) {
      trendMap[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
    }
    if (!isCancelled) {
      trendMap[dateKey].revenue += vo.subtotal || 0;
    }
    trendMap[dateKey].orders += 1;
  }

  const validOrderCount = safePeriodOrders.length - cancelledOrders;
  const aov = validOrderCount > 0 ? Math.round((revenue / validOrderCount) * 100) / 100 : 0;

  const salesTrend = Object.values(trendMap).map((t) => ({
    ...t,
    revenue: Math.round(t.revenue * 100) / 100,
  }));

  // Snapshot Metrics (Unconstrained by Date Period)
  let totalUnits = 0;
  let lowStockCount = 0;
  let stockValue = 0;
  let activeProducts = 0;

  for (const p of safeAllProducts) {
    if (p.isActive) activeProducts += 1;
    const stock = p.stockQuantity || 0;
    totalUnits += stock;
    if (stock < 15) lowStockCount += 1;
    stockValue += (p.price || 0) * stock;
  }

  return {
    period,
    revenue: Math.round(revenue * 100) / 100,
    payout: Math.round(payout * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    orders: safePeriodOrders.length,
    completedOrders,
    cancelledOrders,
    aov,
    productsSold,
    salesTrend,
    snapshot: {
      totalProducts: activeProducts,
      totalUnits,
      lowStockCount,
      stockValue: Math.round(stockValue * 100) / 100,
      pendingOrders: pendingOrdersCount,
      availableBalance: wallet?.availableBalance || 0,
    },
  };
};

/**
 * List wallet transactions.
 */
const listWalletTransactions = async (vendorId) => {
  const transfers = await prisma.vendorTransfer.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    transactions: transfers.map((t) => ({ ...t, _id: t.id })),
    total: transfers.length,
  };
};

/**
 * Get available vendor subscription plans.
 */
const getSubscriptionPlans = () => {
  return VENDOR_PLANS || {};
};

/**
 * Get vendor current subscription plan.
 */
const getVendorSubscription = async (vendorId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, businessName: true, metrics: true },
  });

  if (!vendor) return null;

  const metrics = typeof vendor.metrics === 'object' && vendor.metrics !== null ? vendor.metrics : {};
  return {
    plan: metrics.subscriptionPlan || 'starter',
    status: 'active',
  };
};

/**
 * Update vendor subscription plan.
 */
const updateVendorSubscription = async (vendorId, plan) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return null;

  const metrics = typeof vendor.metrics === 'object' && vendor.metrics !== null ? vendor.metrics : {};
  metrics.subscriptionPlan = plan.toLowerCase();

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { metrics },
  });

  return {
    plan: metrics.subscriptionPlan,
    message: `Vendor plan updated to ${plan}`,
  };
};

module.exports = {
  getDashboardStats,
  listPayouts,
  getWalletBalance,
  requestPayout,
  getVendorAnalytics,
  listWalletTransactions,
  getSubscriptionPlans,
  getVendorSubscription,
  updateVendorSubscription,
};
