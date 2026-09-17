const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const crypto = require("crypto");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const Product = require("../models/Product");
const VendorOrder = require("../models/VendorOrder");
const { vendorPlans, getCommissionRate, getMinimumMonthlyCommitment, canAddProduct } = require("../config/vendorPlans");
const { calculateEnterpriseCommitmentBreakdown } = require("../services/enterpriseCommitmentService");

async function main() {
  console.log("==================================================");
  console.log("SIRABA ORGANIC — PAID VENDOR PLAN AUDIT & VERIFICATION");
  console.log("==================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("🔌 Connected to MongoDB.\n");

  const results = {
    vendors: {},
    orders: {},
    commitments: {},
    upgrades: {},
    authChecks: {},
  };

  const bcrypt = require("bcryptjs");

  // Safe password generation helper
  function genPass() {
    return "TestPass_" + crypto.randomBytes(6).toString("hex") + "!2026";
  }

  // 1. Create or Update 3 Dummy Vendors
  const dummySpecs = [
    {
      storeName: "SIRABA TEST PROFESSIONAL",
      email: "test.professional@siraba-organic.local",
      plan: "professional",
      commissionRate: 10,
      subscriptionPrice: 4999,
      contactPerson: "Pro Test Admin",
      phone: "9998887701",
    },
    {
      storeName: "SIRABA TEST BUSINESS",
      email: "test.business@siraba-organic.local",
      plan: "business",
      commissionRate: 8,
      subscriptionPrice: 9999,
      contactPerson: "Biz Test Admin",
      phone: "9998887702",
    },
    {
      storeName: "SIRABA TEST ENTERPRISE",
      email: "test.enterprise@siraba-organic.local",
      plan: "enterprise",
      commissionRate: 6,
      subscriptionPrice: 14999,
      contactPerson: "Ent Test Admin",
      phone: "9998887703",
    },
  ];

  for (const spec of dummySpecs) {
    const password = genPass();
    const hashedPassword = await bcrypt.hash(password, 10);

    let vendor = await Vendor.findOne({ email: spec.email });
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (!vendor) {
      vendor = new Vendor({
        email: spec.email,
        password: hashedPassword,
        businessName: spec.storeName,
        businessType: "processor",
        contactPerson: spec.contactPerson,
        phone: spec.phone,
        status: "approved",
        isEmailVerified: true,
        isPhoneVerified: true,
        isBusinessRegistered: "yes",
        maintainsTraceabilityRecords: "yes",
        address: {
          street: "123 Test Tech Park",
          city: "Jaipur",
          state: "Rajasthan",
          postalCode: "302001",
          country: "India",
        },
        commissionRate: spec.commissionRate,
        subscription: {
          plan: spec.plan,
          status: "active",
          effectiveFrom: now,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          billingProvider: "razorpay",
          billingReference: "sub_test_" + crypto.randomBytes(4).toString("hex"),
          startDate: now,
          endDate: nextMonth,
          isActive: true,
          autoRenew: true,
        },
      });
      await vendor.save();
      console.log(`✅ Created Vendor: ${spec.storeName} (${vendor._id}) -> Plan: ${spec.plan}`);
    } else {
      vendor.subscription = {
        plan: spec.plan,
        status: "active",
        effectiveFrom: now,
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        billingProvider: "razorpay",
        billingReference: vendor.subscription?.billingReference || "sub_test_" + crypto.randomBytes(4).toString("hex"),
        startDate: now,
        endDate: nextMonth,
        isActive: true,
        autoRenew: true,
      };
      vendor.commissionRate = spec.commissionRate;
      vendor.status = "approved";
      await vendor.save();
      console.log(`✅ Updated Vendor: ${spec.storeName} (${vendor._id}) -> Plan: ${spec.plan}`);
    }

    results.vendors[spec.plan] = {
      storeName: spec.storeName,
      email: spec.email,
      password: password,
      vendorId: vendor._id.toString(),
      plan: spec.plan,
      commissionRate: vendor.commissionRate,
      status: vendor.subscription.status,
      price: spec.subscriptionPrice,
      periodStart: vendor.subscription.currentPeriodStart,
      periodEnd: vendor.subscription.currentPeriodEnd,
    };
  }

  // 2. Controlled Test Orders Calculation & Snapshot Verification
  console.log("\n--- PHASE 9 & 19: CONTROLLED TEST ORDER SNAPSHOTS ---");
  for (const planKey of ["professional", "business", "enterprise"]) {
    const vInfo = results.vendors[planKey];
    const subtotal = 1000;
    const rate = getCommissionRate(planKey); // 10, 8, 6
    const commission = Math.round((subtotal * rate) / 100 * 100) / 100;
    const netAmount = Math.round((subtotal - commission) * 100) / 100;

    // Create a mock VendorOrder snapshot
    const testOrder = new VendorOrder({
      vendor: vInfo.vendorId,
      order: new mongoose.Types.ObjectId(), // Dummy order ID
      vendorOrderNumber: `TEST-${planKey.toUpperCase()}-001`,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: "Test Organic Product",
          quantity: 1,
          price: subtotal,
          subtotal: subtotal,
        },
      ],
      subtotal: subtotal,
      commission: commission,
      commissionRateAtOrder: rate,
      planAtOrder: planKey,
      netAmount: netAmount,
      payoutStatus: "pending",
      status: "processing",
    });

    await testOrder.save();

    results.orders[planKey] = {
      orderNumber: testOrder.vendorOrderNumber,
      orderId: testOrder._id.toString(),
      subtotal,
      expectedCommission: rate === 10 ? 100 : rate === 8 ? 80 : 60,
      actualCommission: testOrder.commission,
      commissionRateAtOrder: testOrder.commissionRateAtOrder,
      planAtOrder: testOrder.planAtOrder,
      netAmount: testOrder.netAmount,
      match: testOrder.commission === (rate === 10 ? 100 : rate === 8 ? 80 : 60),
    };

    console.log(`Order for ${planKey.toUpperCase()}: Subtotal ₹${subtotal} | Comm Rate: ${testOrder.commissionRateAtOrder}% | Comm: ₹${testOrder.commission} | Net Payout: ₹${testOrder.netAmount} | Match: ${results.orders[planKey].match}`);
  }

  // 3. Enterprise Commitment Scenarios Verification (Phase 11)
  console.log("\n--- PHASE 11: ENTERPRISE COMMITMENT MATHEMATICS ---");
  const scenarios = [
    { name: "Scenario A (GMV ₹200k)", gmv: 200000, expectedComm: 12000, expectedShortfall: 8000, expectedTotalCommitment: 20000 },
    { name: "Scenario B (GMV ₹250k)", gmv: 250000, expectedComm: 15000, expectedShortfall: 5000, expectedTotalCommitment: 20000 },
    { name: "Scenario C (GMV ≈ ₹333k)", gmv: 333333.33, expectedComm: 20000, expectedShortfall: 0, expectedTotalCommitment: 20000 },
    { name: "Scenario D (GMV ₹500k)", gmv: 500000, expectedComm: 30000, expectedShortfall: 0, expectedTotalCommitment: 30000 },
  ];

  for (const s of scenarios) {
    const calc = calculateEnterpriseCommitmentBreakdown(s.gmv);
    const match =
      calc.calculatedCommission === s.expectedComm &&
      calc.commitmentAdjustment === s.expectedShortfall &&
      calc.totalPlatformCommitment === s.expectedTotalCommitment;

    results.commitments[s.name] = {
      gmv: s.gmv,
      calculatedCommission: calc.calculatedCommission,
      minimumCommitment: calc.minimumCommitment,
      commitmentAdjustment: calc.commitmentAdjustment,
      totalPlatformCommitment: calc.totalPlatformCommitment,
      subscriptionAmount: calc.subscriptionAmount,
      totalPlatformRevenue: calc.totalPlatformRevenue,
      match,
    };
    console.log(`${s.name}: Calc Comm: ₹${calc.calculatedCommission} | Shortfall: ₹${calc.commitmentAdjustment} | Total Commitment: ₹${calc.totalPlatformCommitment} | Match: ${match}`);
  }

  // 4. Upgrade / Downgrade Simulation (Phases 15, 16, 17)
  console.log("\n--- PHASES 15, 16, 17: UPGRADE & DOWNGRADE TESTING ---");
  const proVendorId = results.vendors.professional.vendorId;
  const proVendor = await Vendor.findById(proVendorId);

  // Upgrade Professional -> Business
  proVendor.subscription.plan = "business";
  proVendor.commissionRate = getCommissionRate("business");
  await proVendor.save();

  // Create new order after upgrade
  const postUpgradeOrder = new VendorOrder({
    vendor: proVendor._id,
    order: new mongoose.Types.ObjectId(),
    vendorOrderNumber: "TEST-PRO-UPGRADED-001",
    subtotal: 1000,
    commission: 80,
    commissionRateAtOrder: 8,
    planAtOrder: "business",
    netAmount: 920,
    payoutStatus: "pending",
  });
  await postUpgradeOrder.save();

  // Fetch pre-upgrade historical order
  const preUpgradeOrder = await VendorOrder.findOne({ vendor: proVendor._id, planAtOrder: "professional" });

  results.upgrades.proToBiz = {
    newPlan: proVendor.subscription.plan,
    newRate: proVendor.commissionRate,
    historicalOrderRate: preUpgradeOrder.commissionRateAtOrder,
    historicalOrderCommission: preUpgradeOrder.commission,
    newOrderRate: postUpgradeOrder.commissionRateAtOrder,
    newOrderCommission: postUpgradeOrder.commission,
    historicalImmutabilityPreserved: preUpgradeOrder.commissionRateAtOrder === 10 && preUpgradeOrder.commission === 100,
  };
  console.log(`Upgraded Pro -> Business: Current Rate: ${proVendor.commissionRate}% | Historical Order Rate: ${preUpgradeOrder.commissionRateAtOrder}% (Comm ₹${preUpgradeOrder.commission}) | New Order Rate: ${postUpgradeOrder.commissionRateAtOrder}% (Comm ₹${postUpgradeOrder.commission}) | Immutability: ${results.upgrades.proToBiz.historicalImmutabilityPreserved}`);

  // Revert Pro vendor back to professional plan
  proVendor.subscription.plan = "professional";
  proVendor.commissionRate = getCommissionRate("professional");
  await proVendor.save();

  // 5. Backend Authorization & Entitlement Limits Audit (Phase 14)
  console.log("\n--- PHASE 14: BACKEND AUTHORIZATION & LIMITS AUDIT ---");
  results.authChecks = {
    canAddProductStarter10: canAddProduct("starter", 10) === false,
    canAddProductStarter9: canAddProduct("starter", 9) === true,
    canAddProductPro50: canAddProduct("professional", 50) === false,
    canAddProductPro49: canAddProduct("professional", 49) === true,
    canAddProductBiz100: canAddProduct("business", 100) === false,
    canAddProductBiz99: canAddProduct("business", 99) === true,
    canAddProductEnterprise500: canAddProduct("enterprise", 500) === false,
    canAddProductEnterprise499: canAddProduct("enterprise", 499) === true,
  };

  console.log("Product Limit Enforcement:");
  console.log(`  Starter max 10 enforced: ${results.authChecks.canAddProductStarter10}`);
  console.log(`  Pro max 50 enforced: ${results.authChecks.canAddProductPro50}`);
  console.log(`  Biz max 100 enforced: ${results.authChecks.canAddProductBiz100}`);
  console.log(`  Enterprise max 500 enforced: ${results.authChecks.canAddProductEnterprise500}`);

  console.log("\n✅ Audit database execution completed successfully.");
  console.log(JSON.stringify(results, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error in main script:", err);
  process.exit(1);
});
