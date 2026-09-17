const express = require("express");
const router = express.Router();
const {
  getCollections,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collectionController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public
router.get("/", getCollections);
router.get("/detail/:slug", getCollectionBySlug);
router.get("/:slug", getCollectionBySlug);

// Admin / Curation
router.post("/", protect, admin, createCollection);
router.put("/:id", protect, admin, updateCollection);
router.delete("/:id", protect, admin, deleteCollection);

module.exports = router;
