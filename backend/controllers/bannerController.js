/**
 * FSO Banner Controller - Prisma ORM (Neon PostgreSQL)
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

const getBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const where = {
    isActive: true,
    AND: [
      {
        OR: [{ activeFrom: null }, { activeFrom: { lte: now } }],
      },
      {
        OR: [{ activeTo: null }, { activeTo: { gte: now } }],
      },
    ],
  };

  if (req.query.position) where.position = req.query.position;

  const banners = await prisma.banner.findMany({
    where,
    orderBy: { displayOrder: "asc" },
  });

  const formatted = banners.map((b) => ({ ...b, _id: b.id }));
  return successResponse(res, 200, formatted);
});

const createBanner = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const banner = await prisma.banner.create({
    data: {
      ...data,
      createdById: req.user?.id || req.user?._id,
    },
  });

  return successResponse(res, 201, { ...banner, _id: banner.id }, "Banner created");
});

const updateBanner = asyncHandler(async (req, res) => {
  const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Banner not found");

  const data = { ...req.body };
  delete data.id;
  delete data._id;

  const banner = await prisma.banner.update({
    where: { id: req.params.id },
    data,
  });

  return successResponse(res, 200, { ...banner, _id: banner.id }, "Banner updated");
});

const deleteBanner = asyncHandler(async (req, res) => {
  const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Banner not found");

  await prisma.banner.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, null, "Banner deleted");
});

const getAllBannersAdmin = asyncHandler(async (req, res) => {
  const banners = await prisma.banner.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const formatted = banners.map((b) => ({ ...b, _id: b.id }));
  return successResponse(res, 200, formatted);
});

module.exports = { getBanners, createBanner, updateBanner, deleteBanner, getAllBannersAdmin };
