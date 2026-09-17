const express = require("express");
const router = express.Router();
const {
  getIngredients,
  getIngredientBySlug,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} = require("../controllers/ingredientController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public
router.get("/", getIngredients);
router.get("/detail/:slug", getIngredientBySlug);
router.get("/:slug", getIngredientBySlug);

// Admin / Content Management
router.post("/", protect, admin, createIngredient);
router.put("/:id", protect, admin, updateIngredient);
router.delete("/:id", protect, admin, deleteIngredient);

module.exports = router;
