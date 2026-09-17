/**
 * FSO Unified Search Controller - Prisma ORM (Neon PostgreSQL)
 * Searches across products, producers, articles, recipes, ingredients, and collections.
 * Uses PostgreSQL-compatible case-insensitive matching.
 */

const prisma = require("../config/prisma");
const { asyncHandler, successResponse } = require("../middleware/errorMiddleware");

// GET /api/v1/search?q=query&types=products,producers,articles,recipes,ingredients,collections&limit=6
const search = asyncHandler(async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query) {
    return successResponse(res, 200, {
      query: "",
      results: {
        products: [],
        producers: [],
        articles: [],
        recipes: [],
        ingredients: [],
        collections: [],
      },
      counts: {
        products: 0,
        producers: 0,
        articles: 0,
        recipes: 0,
        ingredients: 0,
        collections: 0,
        total: 0,
      },
    });
  }

  const requestedTypes = req.query.types
    ? req.query.types.split(",").map((t) => t.trim().toLowerCase())
    : ["products", "producers", "articles", "recipes", "ingredients", "collections"];

  const limitPerType = Math.min(20, Math.max(1, parseInt(req.query.limit) || 6));

  const results = {};
  const counts = {};
  const searches = [];

  if (requestedTypes.includes("products")) {
    searches.push(
      prisma.product
        .findMany({
          where: {
            isPublic: true,
            isActive: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { originState: { contains: query, mode: "insensitive" } },
              { originDistrict: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            price: true,
            compareAtPrice: true,
            category: true,
            originVillage: true,
            originDistrict: true,
            originState: true,
            originRegion: true,
            rating: true,
            numReviews: true,
            packSize: true,
          },
          take: limitPerType,
        })
        .then((items) => {
          results.products = items.map((p) => ({
            ...p,
            _id: p.id,
            origin: {
              village: p.originVillage,
              district: p.originDistrict,
              state: p.originState,
              region: p.originRegion,
            },
          }));
          counts.products = items.length;
        })
    );
  }

  if (requestedTypes.includes("producers")) {
    searches.push(
      prisma.vendor
        .findMany({
          where: {
            status: "APPROVED",
            isActive: true,
            OR: [
              { businessName: { contains: query, mode: "insensitive" } },
              { businessDescription: { contains: query, mode: "insensitive" } },
              { addressState: { contains: query, mode: "insensitive" } },
              { region: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            businessName: true,
            businessType: true,
            logo: true,
            addressStreet: true,
            addressCity: true,
            addressState: true,
            addressPostalCode: true,
            addressCountry: true,
            village: true,
            district: true,
            region: true,
            tags: true,
          },
          take: limitPerType,
        })
        .then((items) => {
          results.producers = items.map((p) => ({
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
          counts.producers = items.length;
        })
    );
  }

  if (requestedTypes.includes("articles")) {
    searches.push(
      prisma.article
        .findMany({
          where: {
            published: true,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            image: true,
            category: true,
            tags: true,
            readTime: true,
            publishedAt: true,
            authorName: true,
            authorImage: true,
          },
          take: limitPerType,
        })
        .then((items) => {
          results.articles = items.map((a) => ({
            ...a,
            _id: a.id,
            author: { name: a.authorName, image: a.authorImage },
          }));
          counts.articles = items.length;
        })
    );
  }

  if (requestedTypes.includes("recipes")) {
    searches.push(
      prisma.recipe
        .findMany({
          where: {
            published: true,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
              { region: { contains: query, mode: "insensitive" } },
              { cuisine: { contains: query, mode: "insensitive" } },
            ],
          },
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
          },
          take: limitPerType,
        })
        .then((items) => {
          results.recipes = items.map((r) => ({
            ...r,
            _id: r.id,
            difficulty: r.difficulty.toLowerCase(),
          }));
          counts.recipes = items.length;
        })
    );
  }

  if (requestedTypes.includes("ingredients")) {
    searches.push(
      prisma.ingredient
        .findMany({
          where: {
            published: true,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { hindiName: { contains: query, mode: "insensitive" } },
              { descriptor: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
            hindiName: true,
            descriptor: true,
            image: true,
            tags: true,
          },
          take: limitPerType,
        })
        .then((items) => {
          results.ingredients = items.map((i) => ({ ...i, _id: i.id }));
          counts.ingredients = items.length;
        })
    );
  }

  if (requestedTypes.includes("collections")) {
    searches.push(
      prisma.collection
        .findMany({
          where: {
            isPublished: true,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { subtitle: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            subtitle: true,
            image: true,
            category: true,
            displayOrder: true,
          },
          take: limitPerType,
        })
        .then((items) => {
          results.collections = items.map((c) => ({ ...c, _id: c.id }));
          counts.collections = items.length;
        })
    );
  }

  await Promise.all(searches);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return successResponse(res, 200, {
    query,
    results,
    counts: { ...counts, total },
  });
});

module.exports = { search };
