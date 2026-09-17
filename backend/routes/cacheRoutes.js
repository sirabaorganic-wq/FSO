const express = require("express");
const router = express.Router();
const { getCacheStats, invalidateCache } = require("../config/cache");
const { protect, admin } = require("../middleware/authMiddleware");

// @desc    Get cache statistics
// @route   GET /api/cache/stats
// @access  Private/Admin
router.get("/stats", protect, admin, (req, res) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Clear specific cache
// @route   POST /api/cache/clear
// @access  Private/Admin
router.post("/clear", protect, admin, (req, res) => {
  try {
    const { type } = req.body; // products, vendors, orders, settings, or all

    switch (type) {
      case "products":
        invalidateCache.products();
        break;
      case "vendors":
        invalidateCache.vendors();
        break;
      case "orders":
        invalidateCache.orders();
        break;
      case "settings":
        invalidateCache.settings();
        break;
      case "all":
        invalidateCache.all();
        break;
      default:
        return res.status(400).json({ message: "Invalid cache type" });
    }

    res.json({ message: `${type} cache cleared successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
