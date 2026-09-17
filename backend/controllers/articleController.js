/**
 * FSO Article Controller - Prisma ORM (Neon PostgreSQL)
 * Public read + admin mutation endpoints
 */

const prisma = require("../config/prisma");
const { asyncHandler, errorResponse, successResponse } = require("../middleware/errorMiddleware");

// ─── Public Endpoints ─────────────────────────────────────────────────────────

// GET /api/v1/articles
const getArticles = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const skip = (page - 1) * limit;

  const where = { published: true };

  if (req.query.category) where.category = req.query.category;
  if (req.query.tag) {
    where.tags = { has: req.query.tag };
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
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
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  // Backward compatibility formatting
  const formatted = articles.map((a) => ({
    ...a,
    _id: a.id,
    author: { name: a.authorName, image: a.authorImage },
  }));

  return successResponse(res, 200, formatted, null, {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/v1/articles/:slug
const getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await prisma.article.findUnique({
    where: { slug: req.params.slug },
    include: {
      linkedProducts: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, image: true, price: true },
          },
        },
      },
      linkedRecipes: {
        include: {
          recipe: {
            select: { id: true, title: true, slug: true, image: true },
          },
        },
      },
      linkedProducers: {
        include: {
          vendor: {
            select: { id: true, businessName: true, logo: true },
          },
        },
      },
    },
  });

  if (!article || !article.published) {
    return errorResponse(res, 404, "NOT_FOUND", "Article not found");
  }

  const formatted = {
    ...article,
    _id: article.id,
    linkedProducts: (article.linkedProducts || []).map((lp) => ({
      ...lp.product,
      _id: lp.product.id,
    })),
    linkedRecipes: (article.linkedRecipes || []).map((lr) => ({
      ...lr.recipe,
      _id: lr.recipe.id,
    })),
    linkedProducers: (article.linkedProducers || []).map((lp) => ({
      ...lp.vendor,
      _id: lp.vendor.id,
    })),
  };

  return successResponse(res, 200, formatted);
});

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

// POST /api/v1/admin/articles
const createArticle = asyncHandler(async (req, res) => {
  const { title, slug, excerpt, content, image, images, category, authorName, authorImage, authorBio, readTime, published, tags, metaTitle, metaDescription } = req.body;

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      excerpt,
      content: content || "",
      image,
      images: Array.isArray(images) ? images : [],
      category: category || "Kitchen Wisdom",
      authorName,
      authorImage,
      authorBio,
      readTime: readTime ? parseInt(readTime) : null,
      published: Boolean(published),
      publishedAt: published ? new Date() : null,
      tags: Array.isArray(tags) ? tags : [],
      metaTitle,
      metaDescription,
      createdById: req.user?.id || req.user?._id,
    },
  });

  return successResponse(res, 201, { ...article, _id: article.id }, "Article created");
});

// PUT /api/v1/admin/articles/:id
const updateArticle = asyncHandler(async (req, res) => {
  const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Article not found");

  const data = { ...req.body };
  delete data.id;
  delete data._id;

  if (data.published && !existing.published && !existing.publishedAt) {
    data.publishedAt = new Date();
  }

  const article = await prisma.article.update({
    where: { id: req.params.id },
    data,
  });

  return successResponse(res, 200, { ...article, _id: article.id }, "Article updated");
});

// DELETE /api/v1/admin/articles/:id
const deleteArticle = asyncHandler(async (req, res) => {
  const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
  if (!existing) return errorResponse(res, 404, "NOT_FOUND", "Article not found");

  await prisma.article.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, null, "Article deleted");
});

// GET /api/v1/admin/articles (all including drafts)
const getAdminArticles = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.published !== undefined) where.published = req.query.published === "true";
  if (req.query.category) where.category = req.query.category;

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  const formatted = articles.map((a) => ({ ...a, _id: a.id }));
  return successResponse(res, 200, formatted, null, { total, page, limit });
});

module.exports = { getArticles, getArticleBySlug, createArticle, updateArticle, deleteArticle, getAdminArticles };
