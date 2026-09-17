/**
 * FSO Ingredient Controller - Prisma ORM (Neon PostgreSQL)
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

const getIngredients = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 24);
  const skip = (page - 1) * limit;

  const where = { published: true };
  if (req.query.tag) where.tags = { has: req.query.tag };

  const [ingredients, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        hindiName: true,
        descriptor: true,
        image: true,
        tags: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.ingredient.count({ where }),
  ]);

  const formatted = ingredients.map((i) => ({ ...i, _id: i.id }));
  return successResponse(res, 200, formatted, null, { total, page, limit, pages: Math.ceil(total / limit) });
});

const getIngredientBySlug = asyncHandler(async (req, res) => {
  const ingredient = await prisma.ingredient.findUnique({
    where: { slug: req.params.slug },
    include: {
      linkedProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true, price: true },
          },
        },
      },
    },
  });

  if (!ingredient || !ingredient.published) return errorResponse(res, 404, "NOT_FOUND", "Ingredient not found");

  const formatted = {
    ...ingredient,
    _id: ingredient.id,
    linkedProducts: (ingredient.linkedProducts || []).map((lp) => ({ ...lp.product, _id: lp.product.id })),
  };

  return successResponse(res, 200, formatted);
});

const createIngredient = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const ingredient = await prisma.ingredient.create({
    data: {
      ...data,
      createdById: req.user?.id || req.user?._id,
    },
  });

  return successResponse(res, 201, { ...ingredient, _id: ingredient.id }, "Ingredient created");
});

const updateIngredient = asyncHandler(async (req, res) => {
  const existing = await prisma.ingredient.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Ingredient not found");

  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const ingredient = await prisma.ingredient.update({
    where: { id: req.params.id },
    data,
  });

  return successResponse(res, 200, { ...ingredient, _id: ingredient.id }, "Ingredient updated");
});

const deleteIngredient = asyncHandler(async (req, res) => {
  const existing = await prisma.ingredient.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Ingredient not found");

  await prisma.ingredient.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, null, "Ingredient deleted");
});

module.exports = { getIngredients, getIngredientBySlug, createIngredient, updateIngredient, deleteIngredient };
