const express = require("express");
const router = express.Router();
const {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getAllBannersAdmin,
} = require("../controllers/bannerController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public
router.get("/", getBanners);

// Admin
router.get("/admin/all", protect, admin, getAllBannersAdmin);
router.post("/", protect, admin, createBanner);
router.put("/:id", protect, admin, updateBanner);
router.delete("/:id", protect, admin, deleteBanner);

module.exports = router;
