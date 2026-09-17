const NodeCache = require("node-cache");

/**
 * Cache Configuration
 *
 * stdTTL: Standard time to live for cached items (in seconds)
 * checkperiod: Automatically delete expired items every X seconds
 * useClones: Clone variables on get/set to avoid reference issues
 */

// General cache with 5-minute TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance, but be careful with mutations
});

// Product cache with longer TTL (products don't change frequently)
const productCache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120,
});

// Vendor cache with moderate TTL
const vendorCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
});

// Order cache with shorter TTL (orders change more frequently)
const orderCache = new NodeCache({
  stdTTL: 120, // 2 minutes
  checkperiod: 30,
});

// Compliance cache with 5-minute TTL
const complianceCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
});

// Settings cache with long TTL (rarely changes)
const settingsCache = new NodeCache({
  stdTTL: 1800, // 30 minutes
  checkperiod: 300,
});

/**
 * Helper function to generate cache keys
 */
const generateCacheKey = (prefix, params) => {
  if (typeof params === "string") {
    return `${prefix}:${params}`;
  }
  if (!params || typeof params !== "object") {
    return `${prefix}:all`;
  }
  const paramString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `${prefix}:${paramString || "all"}`;
};

/**
 * Clear all related cache when data changes
 */
const invalidateCache = {
  products: () => {
    productCache.flushAll();
    console.log("Product cache cleared");
  },
  compliance: (productId) => {
    complianceCache.flushAll();
    productCache.flushAll();
    console.log(`Compliance cache cleared for product: ${productId || "all"}`);
  },
  vendors: () => {
    vendorCache.flushAll();
    console.log("Vendor cache cleared");
  },
  orders: () => {
    orderCache.flushAll();
    console.log("Order cache cleared");
  },
  settings: () => {
    settingsCache.flushAll();
    console.log("Settings cache cleared");
  },
  all: () => {
    cache.flushAll();
    productCache.flushAll();
    complianceCache.flushAll();
    vendorCache.flushAll();
    orderCache.flushAll();
    settingsCache.flushAll();
    console.log("All caches cleared");
  },
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return {
    general: cache.getStats(),
    products: productCache.getStats(),
    compliance: complianceCache.getStats(),
    vendors: vendorCache.getStats(),
    orders: orderCache.getStats(),
    settings: settingsCache.getStats(),
  };
};

module.exports = {
  cache,
  productCache,
  complianceCache,
  vendorCache,
  orderCache,
  settingsCache,
  generateCacheKey,
  invalidateCache,
  getCacheStats,
};
