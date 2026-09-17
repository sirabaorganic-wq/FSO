/**
 * FSO Producer Controller - Prisma ORM (Neon PostgreSQL)
 * Public-facing producer/vendor discovery APIs
 * Internal commerce remains at /api/vendors (Vendor model)
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

// GET /api/v1/producers
const getProducers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const skip = (page - 1) * limit;

  const where = {
    status: "APPROVED",
    isActive: true,
  };

  if (req.query.state) {
    where.addressState = { equals: req.query.state, mode: "insensitive" };
  }
  if (req.query.region) {
    where.region = { equals: req.query.region, mode: "insensitive" };
  }
  if (req.query.businessType) {
    where.businessType = req.query.businessType.toUpperCase();
  }
  if (req.query.tag) {
    where.tags = { has: req.query.tag };
  }

  if (req.query.q) {
    const q = req.query.q.trim();
    where.OR = [
      { businessName: { contains: q, mode: "insensitive" } },
      { businessDescription: { contains: q, mode: "insensitive" } },
      { addressState: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
    ];
  }

  const [producers, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      select: {
        id: true,
        slug: true,
        businessName: true,
        businessDescription: true,
        businessType: true,
        producerType: true,
        logo: true,
        gallery: true,
        addressStreet: true,
        addressCity: true,
        addressState: true,
        addressPostalCode: true,
        addressCountry: true,
        village: true,
        district: true,
        region: true,
        producerStory: true,
        traditionalExpertise: true,
        processingMethods: true,
        yearsInOperation: true,
        generationCount: true,
        certifications: true,
        certificationsVerified: true,
        tags: true,
        socialLinks: true,
        shopSettings: true,
        metrics: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.vendor.count({ where }),
  ]);

  const formatted = producers.map((p) => ({
    ...p,
    _id: p.id,
    address: {
      street: p.addressStreet,
      city: p.addressCity,
      state: p.addressState,
      postalCode: p.addressPostalCode,
      country: p.addressCountry,
    },
  }));

  return successResponse(res, 200, formatted, null, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/v1/producers/:id
const getProducerById = asyncHandler(async (req, res) => {
  const idOrSlug = req.params.id;
  const producer = await prisma.vendor.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      status: "APPROVED",
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      businessName: true,
      businessDescription: true,
      businessType: true,
      producerType: true,
      logo: true,
      gallery: true,
      addressStreet: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      addressCountry: true,
      village: true,
      district: true,
      region: true,
      producerStory: true,
      traditionalExpertise: true,
      processingMethods: true,
      yearsInOperation: true,
      generationCount: true,
      certifications: true,
      certificationsVerified: true,
      tags: true,
      socialLinks: true,
      shopSettings: true,
      metrics: true,
      createdAt: true,
    },
  });

  if (!producer) return errorResponse(res, 404, "NOT_FOUND", "Producer not found");

  const formatted = {
    ...producer,
    _id: producer.id,
    address: {
      street: producer.addressStreet,
      city: producer.addressCity,
      state: producer.addressState,
      postalCode: producer.addressPostalCode,
      country: producer.addressCountry,
    },
  };

  return successResponse(res, 200, formatted);
});

// GET /api/v1/producers/:id/products
const getProducerProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);
  const skip = (page - 1) * limit;

  // Verify producer is public & approved
  const idOrSlug = req.params.id;
  const producer = await prisma.vendor.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      status: "APPROVED",
      isActive: true,
    },
    select: { id: true, slug: true, businessName: true },
  });

  if (!producer) return errorResponse(res, 404, "NOT_FOUND", "Producer not found");

  const where = {
    vendorId: producer.id,
    isPublic: true,
    isActive: true,
  };

  if (req.query.category) {
    where.category = req.query.category;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        images: true,
        price: true,
        compareAtPrice: true,
        category: true,
        rating: true,
        numReviews: true,
        originVillage: true,
        originDistrict: true,
        originState: true,
        originRegion: true,
        tags: true,
        eyebrow: true,
        packSize: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const formattedProducts = products.map((p) => ({
    ...p,
    _id: p.id,
    origin: {
      village: p.originVillage,
      district: p.originDistrict,
      state: p.originState,
      region: p.originRegion,
    },
  }));

  return successResponse(
    res,
    200,
    { producer: { _id: producer.id, id: producer.id, slug: producer.slug, businessName: producer.businessName }, products: formattedProducts },
    null,
    {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  );
});

module.exports = { getProducers, getProducerById, getProducerProducts };
