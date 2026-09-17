const express = require("express");
const router = express.Router();
const {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  getAdminArticles,
} = require("../controllers/articleController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public
router.get("/", getArticles);
router.get("/detail/:slug", getArticleBySlug);
router.get("/:slug", getArticleBySlug);

// Admin / Content Management
router.get("/admin/all", protect, admin, getAdminArticles);
router.post("/", protect, admin, createArticle);
router.put("/:id", protect, admin, updateArticle);
router.delete("/:id", protect, admin, deleteArticle);

module.exports = router;
