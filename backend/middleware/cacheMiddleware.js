const { generateCacheKey } = require("../config/cache");

/**
 * Middleware factory for caching responses
 * @param {NodeCache} cacheInstance - The cache instance to use
 * @param {string} keyPrefix - Prefix for cache keys
 * @param {function} keyGenerator - Optional custom key generator function
 */
const cacheMiddleware = (cacheInstance, keyPrefix, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching for authenticated admin/vendor requests that might have personalized data
      const skipCacheHeader = req.headers["x-skip-cache"];
      if (skipCacheHeader === "true") {
        return next();
      }

      // Generate cache key based on URL parameters
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === "function") {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generator uses query params and route params
        const params = {
          ...req.query,
          ...req.params,
        };
        cacheKey = generateCacheKey(keyPrefix, params);
      }

      // Try to get cached response
      const cachedResponse = cacheInstance.get(cacheKey);

      if (cachedResponse) {
        console.log(`Cache HIT: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      console.log(`Cache MISS: ${cacheKey}`);

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheInstance.set(cacheKey, data);
          console.log(`Cached: ${cacheKey}`);
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      // Continue without caching if there's an error
      next();
    }
  };
};

/**
 * Middleware to skip cache for specific conditions
 */
const skipCacheIf = (condition) => {
  return (req, res, next) => {
    if (condition(req)) {
      req.headers["x-skip-cache"] = "true";
    }
    next();
  };
};

/**
 * Cache middleware specifically for list endpoints with pagination
 */
const cacheListMiddleware = (cacheInstance, keyPrefix) => {
  return cacheMiddleware(cacheInstance, keyPrefix, (req) => {
    const params = {
      page: req.query.page || "1",
      limit: req.query.limit || "10",
      sort: req.query.sort || "",
      keyword: req.query.keyword || "",
      category: req.query.category || "",
      minPrice: req.query.minPrice || "",
      maxPrice: req.query.maxPrice || "",
    };
    return generateCacheKey(keyPrefix, params);
  });
};

/**
 * Cache middleware for single item by ID
 */
const cacheByIdMiddleware = (cacheInstance, keyPrefix) => {
  return cacheMiddleware(cacheInstance, keyPrefix, (req) => {
    return generateCacheKey(keyPrefix, req.params.id || req.params._id);
  });
};

module.exports = {
  cacheMiddleware,
  skipCacheIf,
  cacheListMiddleware,
  cacheByIdMiddleware,
};
