/**
 * FSO Collection Controller - Prisma ORM (Neon PostgreSQL)
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

const getCollections = asyncHandler(async (req, res) => {
  const where = { isPublished: true };
  if (req.query.category) where.category = req.query.category;

  const collections = await prisma.collection.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      subtitle: true,
      image: true,
      category: true,
      displayOrder: true,
    },
    orderBy: { displayOrder: "asc" },
  });

  const formatted = collections.map((c) => ({ ...c, _id: c.id }));
  return successResponse(res, 200, formatted);
});

const getCollectionBySlug = asyncHandler(async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: { slug: req.params.slug },
    include: {
      products: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true, price: true, stockQuantity: true, isPublic: true },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!collection || !collection.isPublished) return errorResponse(res, 404, "NOT_FOUND", "Collection not found");

  const formatted = {
    ...collection,
    _id: collection.id,
    products: (collection.products || []).map((cp) => ({ ...cp.product, _id: cp.product.id })),
  };

  return successResponse(res, 200, formatted);
});

const createCollection = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const collection = await prisma.collection.create({
    data: {
      ...data,
      createdById: req.user?.id || req.user?._id,
    },
  });

  return successResponse(res, 201, { ...collection, _id: collection.id }, "Collection created");
});

const updateCollection = asyncHandler(async (req, res) => {
  const existing = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Collection not found");

  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const collection = await prisma.collection.update({
    where: { id: req.params.id },
    data,
  });

  return successResponse(res, 200, { ...collection, _id: collection.id }, "Collection updated");
});

const deleteCollection = asyncHandler(async (req, res) => {
  const existing = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Collection not found");

  await prisma.collection.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, null, "Collection deleted");
});

module.exports = { getCollections, getCollectionBySlug, createCollection, updateCollection, deleteCollection };
