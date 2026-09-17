/**
 * FSO Marketplace Central Configuration
 * Flash Sales Online — Heritage Kitchen Marketplace
 *
 * All brand-specific, regional, and feature-flag values live here.
 * Never hardcode marketplace identity in controllers, services, or templates.
 * Source from process.env for any value that must differ between environments.
 */

const marketplaceConfig = {
  // ─── Brand ───────────────────────────────────────────────────────────────
  brand: {
    name: process.env.FSO_BRAND_NAME || 'Flash Sales Online',
    shortName: process.env.FSO_BRAND_SHORT || 'FSO',
    tagline: 'Good Food Begins at the Source.',
    description: 'India\'s Heritage Kitchen Marketplace — connecting you with authentic farmers, artisans, and traditional food producers.',
    website: process.env.FSO_WEBSITE_URL || 'https://flashsalesonline.in',
    supportEmail: process.env.FSO_SUPPORT_EMAIL || 'support@flashsalesonline.in',
    adminEmail: process.env.FSO_ADMIN_EMAIL || 'admin@flashsalesonline.in',
    phone: process.env.PLATFORM_PHONE || '',
  },

  // ─── Email Branding ───────────────────────────────────────────────────────
  email: {
    fromName: process.env.FSO_BRAND_NAME || 'Flash Sales Online',
    fromAddress: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@flashsalesonline.in',
    headerGradient: 'linear-gradient(135deg, #78350f, #d97706)', // Amber/Earth — FSO palette
    headerTextColor: '#f9fafb',
    accentColor: '#d97706',
    accentBgColor: '#fef3c7',
    adminNotificationEmail: process.env.FSO_ADMIN_EMAIL || 'admin@flashsalesonline.in',
  },

  // ─── Producer Terminology ─────────────────────────────────────────────────
  // Use these keys wherever vendor/producer terminology appears in API responses
  producer: {
    singular: 'Producer',
    plural: 'Producers',
    dbModel: 'Vendor',        // Keep DB model name — no destructive migration
    dbCollection: 'vendors',  // Keep DB collection name — no migration needed
    roleInUser: 'vendor',     // Keep existing role strings for auth compatibility
  },

  // ─── Locale & Currency ───────────────────────────────────────────────────
  locale: {
    country: 'IN',
    currency: 'INR',
    currencySymbol: '₹',
    language: 'en-IN',
    timezone: 'Asia/Kolkata',
  },

  // ─── API ─────────────────────────────────────────────────────────────────
  api: {
    prefix: '/api/v1',          // FSO versioned API prefix
    legacyPrefix: '/api',       // Kept for backward compatibility during transition
  },

  // ─── Commerce ────────────────────────────────────────────────────────────
  commerce: {
    defaultCommissionRate: 10,  // percent
    defaultShippingThreshold: 499, // INR — free shipping above this
    minOrderValue: 0,
    maxCartItems: 50,
    maxQuantityPerItem: 10,
    currency: 'INR',
  },

  // ─── Product Categories (FSO Heritage Kitchen) ────────────────────────────
  // These are the FSO default categories — real data must be DB-driven.
  // This list is for documentation/seed reference only.
  defaultCategories: [
    'Heirloom Grains',
    'Cold Pressed Oils',
    'Traditional Spices',
    'Wild Honey & Sweeteners',
    'Pulses & Lentils',
    'Heritage Flours',
    'Pickles & Preserves',
    'Artisan Snacks',
    'Herbal Teas & Beverages',
    'Regional Specialties',
    'Ghee & Dairy',
    'Fermented Foods',
    'Gift Hampers',
  ],

  // ─── Producer Types (FSO-specific) ───────────────────────────────────────
  producerTypes: [
    'artisan',
    'small_farm',
    'cooperative',
    'family_business',
    'traditional_craft',
    'women_collective',
    // Legacy Siraba types preserved for backward compatibility:
    'manufacturer',
    'distributor',
    'farmer',
    'processor',
    'wholesaler',
  ],

  // ─── Content ─────────────────────────────────────────────────────────────
  content: {
    articleCategories: [
      'Kitchen Wisdom',
      'Producer Stories',
      'Ingredient Spotlight',
      'Seasonal Eating',
      'Heritage Cooking',
      'Health & Nutrition',
      'Regional Food Culture',
    ],
    recipeRegions: [
      'North India',
      'South India',
      'East India',
      'West India',
      'Central India',
      'North-East India',
    ],
  },

  // ─── Feature Flags ────────────────────────────────────────────────────────
  // Set to false to disable a feature without deleting code.
  features: {
    otpLogin: true,
    vendorMessaging: true,
    productReviews: true,
    coupons: true,
    invoices: true,
    shiprocket: true,
    b2b: false,           // B2B disabled for FSO Phase 11
    organicCompliance: false, // Optional transparency — not mandatory in FSO
    communityPosts: false,    // Phase 12+
    pantry: false,            // Phase 12+
    festivals: false,         // Phase 12+
    aiSearch: false,          // Phase 12+
    loyaltyPoints: false,     // Phase 12+
  },

  // ─── Security ────────────────────────────────────────────────────────────
  security: {
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES || '7d',
    bcryptRounds: 12,
    maxLoginAttempts: 10,
    loginWindowMs: 15 * 60 * 1000,   // 15 minutes
    otpMaxRequests: 3,
    otpWindowMs: 10 * 60 * 1000,     // 10 minutes
    otpExpiryMs: 10 * 60 * 1000,     // 10 minutes
  },
};

/**
 * Startup validation — called from server.js before app starts.
 * Crashes on missing production-critical secrets.
 */
const validateRequiredSecrets = () => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL SECURITY CONFIGURATION ERROR: Missing required environment variables: ${missing.join(', ')}`;
    console.error('\n❌ ' + errorMsg);
    console.error('Create a .env file based on .env.example and set all required values.\n');
    throw new Error(errorMsg);
  }

  // Warn on missing recommended secrets
  const recommended = [
    'RAZORPAY_WEBHOOK_SECRET',
    'FSO_ADMIN_EMAIL',
  ];

  const missingRecommended = recommended.filter((key) => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn('\n⚠️  WARNING: Missing recommended environment variables:');
    missingRecommended.forEach((key) => console.warn(`   - ${key}`));
    console.warn('   These are not fatal in development but must be set in production.\n');
  }
};

module.exports = { marketplaceConfig, validateRequiredSecrets };
