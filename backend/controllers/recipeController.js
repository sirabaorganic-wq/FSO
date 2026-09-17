/**
 * FSO Recipe Controller - Prisma ORM (Neon PostgreSQL)
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

const getRecipes = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const skip = (page - 1) * limit;

  const where = { published: true };
  if (req.query.region) where.region = req.query.region;
  if (req.query.difficulty) {
    const diffUpper = req.query.difficulty.toUpperCase();
    if (["EASY", "MEDIUM", "HARD"].includes(diffUpper)) {
      where.difficulty = diffUpper;
    }
  }
  if (req.query.tag) where.tags = { has: req.query.tag };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
        region: true,
        cuisine: true,
        difficulty: true,
        totalTime: true,
        servings: true,
        tags: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  const formatted = recipes.map((r) => ({
    ...r,
    _id: r.id,
    difficulty: r.difficulty.toLowerCase(),
  }));

  return successResponse(res, 200, formatted, null, { total, page, limit, pages: Math.ceil(total / limit) });
});

const getRecipeBySlug = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { slug: req.params.slug },
    include: {
      linkedProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true, price: true },
          },
        },
      },
      linkedIngredients: {
        include: {
          ingredient: {
            select: { id: true, name: true, slug: true, image: true, descriptor: true },
          },
        },
      },
    },
  });

  if (!recipe || !recipe.published) return errorResponse(res, 404, "NOT_FOUND", "Recipe not found");

  const formatted = {
    ...recipe,
    _id: recipe.id,
    difficulty: recipe.difficulty.toLowerCase(),
    linkedProducts: (recipe.linkedProducts || []).map((lp) => ({ ...lp.product, _id: lp.product.id })),
    linkedIngredients: (recipe.linkedIngredients || []).map((li) => ({ ...li.ingredient, _id: li.ingredient.id })),
  };

  return successResponse(res, 200, formatted);
});

const createRecipe = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    story,
    excerpt,
    region,
    cuisine,
    difficulty,
    prepTime,
    cookTime,
    totalTime,
    servings,
    image,
    images,
    video,
    ingredients,
    steps,
    tips,
    storageInstructions,
    tags,
    published,
    metaTitle,
    metaDescription,
  } = req.body;

  const diffEnum = (difficulty || "easy").toUpperCase();

  const recipe = await prisma.recipe.create({
    data: {
      title,
      slug,
      story,
      excerpt,
      region,
      cuisine,
      difficulty: ["EASY", "MEDIUM", "HARD"].includes(diffEnum) ? diffEnum : "EASY",
      prepTime: prepTime ? parseInt(prepTime) : null,
      cookTime: cookTime ? parseInt(cookTime) : null,
      totalTime: totalTime ? parseInt(totalTime) : null,
      servings: servings ? parseInt(servings) : null,
      image,
      images: Array.isArray(images) ? images : [],
      video,
      ingredients: ingredients || [],
      steps: steps || [],
      tips: Array.isArray(tips) ? tips : [],
      storageInstructions,
      tags: Array.isArray(tags) ? tags : [],
      published: Boolean(published),
      publishedAt: published ? new Date() : null,
      metaTitle,
      metaDescription,
      createdById: req.user?.id || req.user?._id,
    },
  });

  return successResponse(res, 201, { ...recipe, _id: recipe.id }, "Recipe created");
});

const updateRecipe = asyncHandler(async (req, res) => {
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Recipe not found");

  const data = { ...req.body };
  delete data.id;
  delete data._id;

  if (data.difficulty) {
    const diffUpper = data.difficulty.toUpperCase();
    if (["EASY", "MEDIUM", "HARD"].includes(diffUpper)) {
      data.difficulty = diffUpper;
    }
  }

  if (data.published && !existing.published && !existing.publishedAt) {
    data.publishedAt = new Date();
  }

  const recipe = await prisma.recipe.update({
    where: { id: req.params.id },
    data,
  });

  return successResponse(res, 200, { ...recipe, _id: recipe.id }, "Recipe updated");
});

const deleteRecipe = asyncHandler(async (req, res) => {
  const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Recipe not found");

  await prisma.recipe.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, null, "Recipe deleted");
});

const getAdminRecipes = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.published !== undefined) where.published = req.query.published === "true";

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.recipe.count({ where }),
  ]);

  const formatted = recipes.map((r) => ({ ...r, _id: r.id }));
  return successResponse(res, 200, formatted, null, { total, page, limit });
});

module.exports = { getRecipes, getRecipeBySlug, createRecipe, updateRecipe, deleteRecipe, getAdminRecipes };
