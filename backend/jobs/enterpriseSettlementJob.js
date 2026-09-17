let cron;
try {
  cron = require("node-cron");
} catch (err) {
  console.warn("node-cron package not found, scheduled cron runner disabled.");
}
const prisma = require("../config/prisma");
const { runEnterpriseMonthlySettlement } = require("../services/enterpriseCommitmentService");

/**
 * Month-End Enterprise Commitment Settlement Job — Neon PostgreSQL via Prisma
 * Runs on the 1st of every month at 00:05 AM.
 * Iterates all Enterprise vendors and generates their monthly settlement.
 */
const runMonthEndSettlementForAllEnterpriseVendors = async (targetYear = null, targetMonth = null) => {
  try {
    const now = new Date();
    let year = targetYear;
    let month = targetMonth;

    if (!year || !month) {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      year = prevMonthDate.getFullYear();
      month = prevMonthDate.getMonth() + 1;
    }

    console.log(`[EnterpriseSettlementJob] Starting month-end settlement for ${year}-${String(month).padStart(2, "0")}...`);

    // Find all active vendors in Neon PostgreSQL
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
    });

    // Filter vendors on enterprise plan
    const enterpriseVendors = vendors.filter((v) => {
      const m = typeof v.metrics === 'object' && v.metrics !== null ? v.metrics : {};
      return m.subscriptionPlan === 'enterprise';
    });

    console.log(`[EnterpriseSettlementJob] Found ${enterpriseVendors.length} Enterprise vendor(s) to process.`);

    const results = [];
    for (const vendor of enterpriseVendors) {
      try {
        const result = await runEnterpriseMonthlySettlement(vendor.id, year, month);
        results.push({
          vendorId: vendor.id,
          storeName: vendor.businessName || vendor.email,
          status: "success",
          settlement: result.settlement,
        });
      } catch (err) {
        console.error(`[EnterpriseSettlementJob] Failed processing vendor ${vendor.id}:`, err);
        results.push({
          vendorId: vendor.id,
          status: "failed",
          error: err.message,
        });
      }
    }

    console.log(`[EnterpriseSettlementJob] Settlement job completed. Processed ${results.length} record(s).`);
    return {
      year,
      month,
      processedCount: results.length,
      results,
    };
  } catch (error) {
    console.error("[EnterpriseSettlementJob] Fatal error in settlement job:", error);
    throw error;
  }
};

// Schedule cron job: 00:05 AM on the 1st day of every month
const initEnterpriseSettlementCron = () => {
  if (!cron) return;
  cron.schedule("5 0 1 * *", async () => {
    console.log("[EnterpriseSettlementJob] Cron trigger fired.");
    try {
      await runMonthEndSettlementForAllEnterpriseVendors();
    } catch (err) {
      console.error("[EnterpriseSettlementJob] Scheduled cron failed:", err);
    }
  });
  console.log("[EnterpriseSettlementJob] Cron schedule registered (5 0 1 * *).");
};

module.exports = {
  runMonthEndSettlementForAllEnterpriseVendors,
  initEnterpriseSettlementCron,
};
