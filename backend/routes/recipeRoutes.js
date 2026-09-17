const express = require("express");
const router = express.Router();
const {
  getRecipes,
  getRecipeBySlug,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getAdminRecipes,
} = require("../controllers/recipeController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public
router.get("/", getRecipes);
router.get("/detail/:slug", getRecipeBySlug);
router.get("/:slug", getRecipeBySlug);

// Admin / Content Management
router.get("/admin/all", protect, admin, getAdminRecipes);
router.post("/", protect, admin, createRecipe);
router.put("/:id", protect, admin, updateRecipe);
router.delete("/:id", protect, admin, deleteRecipe);

module.exports = router;
