// Vendor Subscription Plans Configuration - Official SIRABA Economics Architecture

const vendorPlans = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 0, // ₹0/month
    priceMonthly: 0,
    priceYearly: null, // Yearly billing disabled
    billingInterval: "monthly",
    commissionRate: 15, // 15% commission
    minimumMonthlyPlatformCommitment: 0,
    positioning: "For emerging vendors.",
    targetGMV: "Emerging vendors",
    logisticsPolicy: "Applicable logistics charges.",
    features: [
      "15% platform commission",
      "List up to 10 products",
      "Basic analytics dashboard",
      "Standard support",
      "Basic shop profile",
      "Manual payout (weekly)",
      "Applicable logistics charges",
    ],
    limits: {
      maxProducts: 10,
      maxImages: 3,
      prioritySupport: false,
      featuredListing: false,
      customShopPage: false,
      autoPayouts: false,
    },
    badge: null,
    color: "#6B7280", // gray
    displayOrder: 1,
    active: true,
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 4999, // ₹4,999/month
    priceMonthly: 4999,
    priceYearly: null, // Yearly billing disabled
    billingInterval: "monthly",
    commissionRate: 10, // 10% commission
    minimumMonthlyPlatformCommitment: 0,
    positioning: "For vendors targeting approximately ₹1–₹2.5 lakh monthly GMV.",
    targetGMV: "₹1–₹2.5L GMV",
    logisticsPolicy: "Applicable logistics charges.",
    features: [
      "10% platform commission",
      "List up to 50 products",
      "Advanced analytics & reports",
      "Priority support",
      "Custom shop page",
      "Featured product slots (3)",
      "Auto payouts (bi-weekly)",
      "Promotional tools",
      "Bulk product upload",
      "Applicable logistics charges",
    ],
    limits: {
      maxProducts: 50,
      maxImages: 5,
      prioritySupport: true,
      featuredListing: true,
      featuredSlots: 3,
      customShopPage: true,
      autoPayouts: true,
      bulkUpload: true,
    },
    badge: "Popular",
    color: "#10B981", // green
    displayOrder: 2,
    active: true,
  },
  business: {
    id: "business",
    name: "Business",
    price: 9999, // ₹9,999/month
    priceMonthly: 9999,
    priceYearly: null, // Yearly billing disabled
    billingInterval: "monthly",
    commissionRate: 8, // 8% commission
    minimumMonthlyPlatformCommitment: 0,
    positioning: "For vendors around ₹2.5–₹5 lakh+ monthly GMV.",
    targetGMV: "₹2.5–₹5L+ GMV",
    logisticsPolicy: "Applicable logistics charges.",
    features: [
      "8% platform commission",
      "List up to 100 products",
      "Comprehensive analytics & market insights",
      "Priority support with dedicated queue",
      "Custom shop page & banner branding",
      "Featured product slots (6)",
      "Auto payouts (weekly)",
      "Promotional tools & campaign access",
      "Bulk product upload",
      "Express product review",
      "Applicable logistics charges",
    ],
    limits: {
      maxProducts: 100,
      maxImages: 8,
      prioritySupport: true,
      featuredListing: true,
      featuredSlots: 6,
      customShopPage: true,
      autoPayouts: true,
      bulkUpload: true,
      priorityApproval: true,
    },
    badge: "High Growth",
    color: "#3B82F6", // blue
    displayOrder: 3,
    active: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 14999, // ₹14,999/month
    priceMonthly: 14999,
    priceYearly: null, // Yearly billing disabled
    billingInterval: "monthly",
    commissionRate: 6, // 6% commission
    minimumMonthlyPlatformCommitment: 20000, // ₹20,000 minimum monthly commitment
    positioning: "For high-volume strategic vendors.",
    targetGMV: "High-volume strategic",
    logisticsPolicy: "Applicable logistics charges.",
    features: [
      "6% platform commission",
      "Minimum monthly platform commitment: ₹20,000",
      "List up to 500 products",
      "Real-time analytics & intelligence",
      "Dedicated account manager",
      "Branded shop storefront",
      "Featured product slots (15)",
      "Auto payouts (on demand)",
      "API access",
      "White-label invoicing",
      "Priority product approval",
      "Custom contract options",
      "Applicable logistics charges",
    ],
    limits: {
      maxProducts: 500,
      maxImages: 10,
      prioritySupport: true,
      dedicatedManager: true,
      featuredListing: true,
      featuredSlots: 15,
      customShopPage: true,
      brandedStorefront: true,
      autoPayouts: true,
      bulkUpload: true,
      apiAccess: true,
      priorityApproval: true,
    },
    badge: "Best Value",
    color: "#8B5CF6", // purple
    displayOrder: 4,
    active: true,
  },
};

// Commission rates by plan
const getCommissionRate = (plan) => {
  return vendorPlans[plan]?.commissionRate || 15;
};

// Minimum monthly platform commitment by plan
const getMinimumMonthlyCommitment = (plan) => {
  return vendorPlans[plan]?.minimumMonthlyPlatformCommitment || 0;
};

// Check if vendor can add more products
const canAddProduct = (plan, currentProductCount) => {
  const limits = vendorPlans[plan]?.limits;
  if (!limits) return false;
  if (limits.maxProducts === -1) return true; // Unlimited
  return currentProductCount < limits.maxProducts;
};

// Get plan features
const getPlanFeatures = (plan) => {
  return vendorPlans[plan] || vendorPlans.starter;
};

module.exports = {
  vendorPlans,
  getCommissionRate,
  getMinimumMonthlyCommitment,
  canAddProduct,
  getPlanFeatures,
};

