/**
 * FSO Enterprise Commitment Service — Neon PostgreSQL via Prisma
 * Strictly adheres to Gate 5 & Amendment 7:
 * Preserves all financial formulas, minimum commitments, and 2-decimal rounding.
 */

const prisma = require("../config/prisma");

/**
 * Calculate Commissionable GMV for a vendor during a specific billing window.
 * Formula: Sum of subtotal for non-cancelled VendorOrders.
 */
const calculateMonthlyGMV = async (vendorId, startDate, endDate) => {
  const vendorOrders = await prisma.vendorOrder.findMany({
    where: {
      vendorId,
      createdAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    },
  });

  let eligibleGMV = 0;
  let baseCommissionGenerated = 0;
  let eligibleOrderCount = 0;

  for (const vo of vendorOrders) {
    if (vo.payoutStatus === "refunded" && vo.subtotal <= 0) {
      continue;
    }

    const orderSubtotal = Math.max(0, vo.subtotal || 0);
    const orderCommission = Math.max(0, vo.commissionAmount || 0);

    eligibleGMV += orderSubtotal;
    baseCommissionGenerated += orderCommission;
    eligibleOrderCount++;
  }

  // Ensure deterministic 2-decimal money rounding
  eligibleGMV = Math.round(eligibleGMV * 100) / 100;
  baseCommissionGenerated = Math.round(baseCommissionGenerated * 100) / 100;

  return {
    eligibleGMV,
    baseCommissionGenerated,
    eligibleOrderCount,
  };
};

/**
 * Enterprise Commitment Mathematics Engine
 * Enforces:
 * - 6% Calculated Platform Commission
 * - Minimum Commitment: MAX(6% GMV, ₹20,000)
 * - Commitment Adjustment: MAX(₹20,000 - 6% GMV, 0)
 * - Subscription Fee: ₹14,999/month
 * - Minimum Recurring Platform Revenue: ₹34,999/month
 */
const calculateEnterpriseCommitmentBreakdown = (eligibleGMV, baseCommissionOverride = null) => {
  const gmv = Math.max(0, Number(eligibleGMV) || 0);
  const commissionRate = 6; // 6%
  const minimumCommitment = 20000; // ₹20,000
  const subscriptionAmount = 14999; // ₹14,999

  const calculatedCommission =
    baseCommissionOverride !== null
      ? Math.round(Number(baseCommissionOverride) * 100) / 100
      : Math.round(((gmv * commissionRate) / 100) * 100) / 100;

  const commitmentAdjustment = Math.max(
    0,
    Math.round((minimumCommitment - calculatedCommission) * 100) / 100
  );

  const totalPlatformCommitment = Math.max(calculatedCommission, minimumCommitment);

  const totalPlatformRevenue = Math.round((subscriptionAmount + totalPlatformCommitment) * 100) / 100;

  return {
    eligibleGMV: gmv,
    commissionRate,
    calculatedCommission,
    minimumCommitment,
    commitmentAdjustment,
    totalPlatformCommitment,
    subscriptionAmount,
    totalPlatformRevenue,
  };
};

/**
 * Run Monthly Enterprise Settlement (IDEMPOTENT - Gate 5)
 * Closed at month-end for Enterprise vendors.
 */
const runEnterpriseMonthlySettlement = async (vendorId, year, month) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    throw new Error("Vendor not found");
  }

  // Define billing period dates (1st of month 00:00:00 to last day 23:59:59)
  const billingPeriodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const billingPeriodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Calculate eligible GMV and order stats
  const { eligibleGMV, baseCommissionGenerated } = await calculateMonthlyGMV(
    vendorId,
    billingPeriodStart,
    billingPeriodEnd
  );

  const breakdown = calculateEnterpriseCommitmentBreakdown(
    eligibleGMV,
    baseCommissionGenerated
  );

  // Check if settlement already exists for idempotency
  let settlement = await prisma.enterpriseSettlement.findFirst({
    where: {
      vendorId,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
    },
  });

  const invoiceId = `INV-ENT-${year}${String(month).padStart(2, "0")}-${vendorId.slice(-6).toUpperCase()}`;

  if (!settlement) {
    settlement = await prisma.enterpriseSettlement.create({
      data: {
        vendorId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        billingPeriodStart,
        billingPeriodEnd,
        eligibleGMV: breakdown.eligibleGMV,
        commissionRate: breakdown.commissionRate,
        baseCommission: breakdown.calculatedCommission,
        minimumCommitment: breakdown.minimumCommitment,
        commitmentAdjustment: breakdown.commitmentAdjustment,
        totalPlatformCommitment: breakdown.totalPlatformCommitment,
        subscriptionAmount: breakdown.subscriptionAmount,
        totalPlatformRevenue: breakdown.totalPlatformRevenue,
        status: breakdown.commitmentAdjustment > 0 ? "COMMITMENT_INVOICED" : "COMMITMENT_PAID",
        invoiceId,
        isFinalized: false,
      },
    });
  } else {
    // Update non-finalized settlement values idempotently
    if (!settlement.isFinalized) {
      settlement = await prisma.enterpriseSettlement.update({
        where: { id: settlement.id },
        data: {
          eligibleGMV: breakdown.eligibleGMV,
          baseCommission: breakdown.calculatedCommission,
          commitmentAdjustment: breakdown.commitmentAdjustment,
          totalPlatformCommitment: breakdown.totalPlatformCommitment,
          totalPlatformRevenue: breakdown.totalPlatformRevenue,
        },
      });
    }
  }

  return {
    settlement,
    breakdown,
  };
};

/**
 * Get current real-time month commitment status for vendor dashboard.
 */
const getEnterpriseCommitmentStatus = async (vendorId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const billingPeriodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const billingPeriodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const { eligibleGMV, baseCommissionGenerated, eligibleOrderCount } = await calculateMonthlyGMV(
    vendorId,
    billingPeriodStart,
    billingPeriodEnd
  );

  const breakdown = calculateEnterpriseCommitmentBreakdown(
    eligibleGMV,
    baseCommissionGenerated
  );

  const breakEvenGMV = 333333.33;
  const remainingGMVForCommitmentCover = Math.max(
    0,
    Math.round((breakEvenGMV - eligibleGMV) * 100) / 100
  );

  return {
    year,
    month,
    billingPeriodStart,
    billingPeriodEnd,
    eligibleOrderCount,
    ...breakdown,
    breakEvenGMV,
    remainingGMVForCommitmentCover,
  };
};

module.exports = {
  calculateMonthlyGMV,
  calculateEnterpriseCommitmentBreakdown,
  runEnterpriseMonthlySettlement,
  getEnterpriseCommitmentStatus,
};
