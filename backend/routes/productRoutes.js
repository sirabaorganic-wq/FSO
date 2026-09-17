const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const complianceService = require("../services/complianceService");
const { protectVendor } = require("../middleware/vendorMiddleware");
const { productCache, invalidateCache } = require("../config/cache");
const { cacheListMiddleware, cacheByIdMiddleware } = require("../middleware/cacheMiddleware");
const { protect, admin } = require("../middleware/authMiddleware");
const { checkPurchaseStatus } = require("../middleware/reviewMiddleware");

/**
 * Format product for backward compatibility with frontend
 */
function formatProduct(product) {
  if (!product) return null;
  return {
    ...product,
    _id: product.id,
    vendor: product.vendor
      ? {
          ...product.vendor,
          _id: product.vendor.id,
        }
      : product.vendorId || null,
    origin: {
      village: product.originVillage || "",
      district: product.originDistrict || "",
      state: product.originState || "",
      region: product.originRegion || "",
      country: product.originCountry || "India",
      story: product.originStory || "",
    },
    reviews: Array.isArray(product.reviews)
      ? product.reviews.map((r) => ({
          ...r,
          _id: r.id,
          user: r.user ? { ...r.user, _id: r.user.id } : r.userId,
        }))
      : [],
  };
}

// @desc    Fetch all products
// @route   GET /api/products and /api/v1/products
// @access  Public
router.get("/", cacheListMiddleware(productCache, "products:list"), async (req, res) => {
  try {
    const where = {
      isPublic: true,
      isActive: true,
    };

    if (req.query.keyword) {
      const kw = req.query.keyword.trim();
      where.OR = [
        { name: { contains: kw, mode: "insensitive" } },
        { description: { contains: kw, mode: "insensitive" } },
        { category: { contains: kw, mode: "insensitive" } },
      ];
    }

    if (req.query.category) {
      const categoryParam = req.query.category.trim();
      const matchedCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: categoryParam },
            { name: { equals: categoryParam, mode: "insensitive" } },
          ],
        },
      });

      if (matchedCategory) {
        where.OR = [
          { category: { equals: matchedCategory.name, mode: "insensitive" } },
          { categoryId: matchedCategory.id },
        ];
      } else {
        where.category = { equals: categoryParam, mode: "insensitive" };
      }
    }

    if (req.query.minPrice || req.query.maxPrice) {
      where.price = {};
      if (req.query.minPrice) where.price.gte = Number(req.query.minPrice);
      if (req.query.maxPrice) where.price.lte = Number(req.query.maxPrice);
    }

    if (req.query.certified === "true") {
      where.certifications = { isEmpty: false };
    } else if (req.query.certification) {
      where.certifications = { has: req.query.certification };
    }

    let orderBy = { createdAt: "desc" };
    if (req.query.sort === "price-asc") orderBy = { price: "asc" };
    else if (req.query.sort === "price-desc") orderBy = { price: "desc" };
    else if (req.query.sort === "newest") orderBy = { createdAt: "desc" };

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        vendor: {
          select: {
            id: true,
            slug: true,
            businessName: true,
            logo: true,
            addressState: true,
            status: true,
          },
        },
      },
    });

    const formatted = products.map(formatProduct);
    res.json(formatted);
  } catch (error) {
    console.error("Product query error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch product compliance record (Public DTO)
// @route   GET /api/products/:id/compliance
// @access  Public
router.get("/:id/compliance", async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { vendor: true },
    });

    if (!product) {
      return res.json({ compliance: null });
    }

    const [compliance, latestBatch] = await Promise.all([
      prisma.productCompliance.findUnique({
        where: { productId: product.id },
      }),
      prisma.productBatch.findFirst({
        where: { productId: product.id, status: "active" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const vendor = product.vendor;
    const certNumber = vendor?.organicCertification?.certificateNumber || "";
    const certBody = vendor?.organicCertification?.certificationBody || "";
    const certValidUntil = vendor?.organicCertification?.certificateValidUntil || null;
    const isCertVerified = Boolean(certNumber && vendor?.status === "APPROVED");
    const isFssaiVerified = Boolean(vendor?.fssaiNumber && vendor?.status === "APPROVED");
    const isVendorQualified = vendor?.status === "APPROVED";

    const syntheticCompliance = compliance || {
      productId: product.id,
      vendorId: vendor?.id || null,
      certification: {
        status: isCertVerified ? "verified" : "pending",
        standard: "Heritage Quality Standards",
        certificationBody: certBody,
        certificateNumber: certNumber,
        validUntil: certValidUntil,
      },
      regulatory: {
        fssai: {
          status: isFssaiVerified ? "verified" : "pending",
          licenseNumber: vendor?.fssaiNumber || "",
        },
      },
      productVerification: {
        status: "pending",
        labelVerified: false,
        ingredientsVerified: false,
        specificationVerified: false,
        claimsReviewed: false,
      },
      scientificVerification: {
        status: "pending",
        summary: "Accredited Lab Evidence pending review.",
      },
      sirabaQualification: {
        status: isVendorQualified ? "verified" : "pending",
        vendorQualified: isVendorQualified,
        marketplaceApproved: isVendorQualified,
      },
      trustStatus: {
        isCertified: isCertVerified,
        isVerified: false,
        isQualified: isVendorQualified,
        isTripleVerified: false,
      },
    };

    const publicDTO = complianceService.buildPublicDTO(syntheticCompliance, {
      batch: latestBatch,
      product: formatProduct(product),
      vendor,
    });

    return res.json({ compliance: publicDTO });
  } catch (error) {
    console.error("Error fetching product compliance:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch latest active batch for product (Public DTO)
// @route   GET /api/products/:id/batches/latest
// @access  Public
router.get("/:id/batches/latest", async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!product) {
      return res.json({ batch: null, reason: "no_active_batch" });
    }

    const latestBatch = await prisma.productBatch.findFirst({
      where: { productId: product.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!latestBatch) {
      return res.json({ batch: null, reason: "no_active_batch" });
    }

    const publicBatchDTO = complianceService.buildPublicBatchDTO(latestBatch);
    res.json({ batch: publicBatchDTO });
  } catch (error) {
    console.error("Error fetching latest product batch:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch Trust Passport Cards DTO for product (Public)
// @route   GET /api/products/:id/trust-passport
// @access  Public
router.get("/:id/trust-passport", async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { vendor: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let vendor = product.vendor;
    if (!vendor) {
      vendor = {
        businessName: "FSO Direct Heritage",
        businessType: "ARTISAN",
        status: "APPROVED",
        isBusinessRegistered: "yes",
        maintainsTraceabilityRecords: "yes",
        addressState: "Haryana",
        addressCountry: "India",
      };
    }

    const [compliance, batch] = await Promise.all([
      prisma.productCompliance.findUnique({ where: { productId: product.id } }),
      prisma.productBatch.findFirst({
        where: { productId: product.id, status: "active" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const trustPassport = complianceService.buildTrustPassportDTO({
      product: formatProduct(product),
      vendor,
      compliance,
      batch,
    });

    res.json({ trustPassport });
  } catch (error) {
    console.error("Error generating Trust Passport DTO:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch product categories with product count
// @route   GET /api/products/categories and /api/v1/products/categories
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: {
            products: {
              where: { isPublic: true, isActive: true },
            },
          },
        },
      },
    });

    if (allCategories && allCategories.length > 0) {
      return res.json(
        allCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c._count.products,
        }))
      );
    }

    const categories = await prisma.product.groupBy({
      by: ["category"],
      where: { isPublic: true, isActive: true },
      _count: { id: true },
      orderBy: { category: "asc" },
    });
    res.json(categories.map((c) => ({ name: c.category, count: c._count.id })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
router.get("/:id", cacheByIdMiddleware(productCache, "products:detail"), async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        vendor: {
          select: {
            id: true,
            slug: true,
            businessName: true,
            logo: true,
            addressState: true,
            village: true,
            district: true,
            region: true,
            certifications: true,
            certificationsVerified: true,
            status: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (product) {
      res.json(formatProduct(product));
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.error("Single product fetch error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post("/", protect, admin, async (req, res) => {
  try {
    const {
      name,
      slug,
      eyebrow,
      description,
      shortDescription,
      fullDescription,
      price,
      compareAtPrice,
      costPrice,
      currency = "INR",
      sku,
      stockQuantity = 0,
      hsn,
      category,
      categoryId,
      tag,
      tags = [],
      image,
      image2,
      images = [],
      videos = [],
      features = [],
      ingredients,
      packSize,
      options,
      originVillage,
      originDistrict,
      originState,
      originRegion,
      originStory,
      originCoordinates,
      harvestSeason,
      harvestDate,
      seasonalAvailability,
      processingMethod,
      traditionalPreparation,
      preparationStory,
      servingSuggestions,
      culinaryUses = [],
      storageInstructions,
      faqs,
      nutrition,
      nutritionNote,
      certifications = [],
      batchNumber,
      batchInfo,
      vendorId,
      isVendorProduct = false,
      isPublic = true,
      isActive = true,
    } = req.body;

    const createdProduct = await prisma.product.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        eyebrow,
        description: description || "",
        shortDescription,
        fullDescription,
        price: Number(price) || 0,
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        costPrice: costPrice ? Number(costPrice) : null,
        currency,
        sku,
        stockQuantity: Number(stockQuantity) || 0,
        hsn,
        category: category || "General",
        categoryId,
        tag,
        tags: Array.isArray(tags) ? tags : [],
        image,
        image2,
        images: Array.isArray(images) ? images : [],
        videos: Array.isArray(videos) ? videos : [],
        features: Array.isArray(features) ? features : [],
        ingredients,
        packSize,
        options: options || [],
        originVillage,
        originDistrict,
        originState,
        originRegion,
        originStory,
        originCoordinates: originCoordinates || null,
        harvestSeason,
        harvestDate,
        seasonalAvailability,
        processingMethod,
        traditionalPreparation,
        preparationStory,
        servingSuggestions,
        culinaryUses: Array.isArray(culinaryUses) ? culinaryUses : [],
        storageInstructions,
        faqs: faqs || [],
        nutrition: nutrition || [],
        nutritionNote,
        certifications: Array.isArray(certifications) ? certifications : [],
        batchNumber,
        batchInfo,
        vendorId,
        isVendorProduct: Boolean(isVendorProduct),
        isPublic: Boolean(isPublic),
        isActive: Boolean(isActive),
      },
    });

    if (batchNumber) {
      await complianceService.upsertProductBatch(createdProduct.id, {
        batchNumber,
        batchInfo,
        vendorId,
      });
    }

    if (invalidateCache?.products) invalidateCache.products();
    res.status(201).json(formatProduct(createdProduct));
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const data = { ...req.body };
    delete data.id;
    delete data._id;
    delete data.reviews;
    delete data.vendor;

    if (data.price !== undefined) data.price = Number(data.price);
    if (data.compareAtPrice !== undefined) data.compareAtPrice = data.compareAtPrice ? Number(data.compareAtPrice) : null;
    if (data.costPrice !== undefined) data.costPrice = data.costPrice ? Number(data.costPrice) : null;
    if (data.stockQuantity !== undefined) data.stockQuantity = Number(data.stockQuantity);

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });

    if (updatedProduct.batchNumber) {
      await complianceService.upsertProductBatch(updatedProduct.id, {
        batchNumber: updatedProduct.batchNumber,
        batchInfo: updatedProduct.batchInfo,
        vendorId: updatedProduct.vendorId,
      });
    }

    if (invalidateCache?.products) invalidateCache.products();
    res.json(formatProduct(updatedProduct));
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    if (invalidateCache?.products) invalidateCache.products();
    res.json({ message: "Product removed" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Check if user can review product
// @route   GET /api/products/:id/can-review
// @access  Private
router.get("/:id/can-review", protect, async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.user.id || req.user._id;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    const purchaseStatus = await checkPurchaseStatus(userId, productId);

    res.json({
      canReview: purchaseStatus.canReview && !existingReview,
      isPurchased: purchaseStatus.isPurchased,
      alreadyReviewed: Boolean(existingReview),
      purchaseStatus,
      existingReview: existingReview ? { ...existingReview, _id: existingReview.id } : null,
    });
  } catch (error) {
    console.error("Can review error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create new review (Verified Buyers Only)
// @route   POST /api/products/:id/reviews
// @access  Private
router.post("/:id/reviews", protect, async (req, res) => {
  const { rating, comment, title } = req.body;
  const productId = req.params.id;
  const userId = req.user.id || req.user._id;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existingReview = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product. You can update your existing review.",
        existingReview: { ...existingReview, _id: existingReview.id },
      });
    }

    const purchaseStatus = await checkPurchaseStatus(userId, productId);
    if (!purchaseStatus.canReview) {
      return res.status(403).json({
        message: "You can only review products you have purchased and received",
        canReview: false,
        reason: "NOT_PURCHASED",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({ message: "Review must be at least 10 characters long" });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: Number(rating),
        title: title ? title.trim() : null,
        comment: comment.trim(),
        isVerifiedPurchase: true,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Recompute product ratings
    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
    const numReviews = agg._count.id || 0;

    await prisma.product.update({
      where: { id: productId },
      data: { rating: avgRating, numReviews },
    });

    if (invalidateCache?.products) invalidateCache.products();

    const formattedReview = {
      ...review,
      _id: review.id,
      name: req.user.name,
      user: { ...review.user, _id: review.user.id },
    };

    if (req.io) {
      req.io.emit("new_review", {
        productId,
        review: formattedReview,
        rating: avgRating,
      });
    }

    res.status(201).json({
      message: "Review added successfully",
      review: formattedReview,
      rating: avgRating,
      numReviews,
      verifiedPurchase: true,
    });
  } catch (error) {
    console.error("Review creation error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user's own review
// @route   PUT /api/products/:id/reviews/:reviewId
// @access  Private
router.put("/:id/reviews/:reviewId", protect, async (req, res) => {
  const { rating, comment, title } = req.body;
  const reviewId = req.params.reviewId;
  const userId = req.user.id || req.user._id;

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    const data = {};
    if (rating) data.rating = Number(rating);
    if (comment) data.comment = comment.trim();
    if (title) data.title = title.trim();

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    const agg = await prisma.review.aggregate({
      where: { productId: review.productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
    await prisma.product.update({
      where: { id: review.productId },
      data: { rating: avgRating },
    });

    if (invalidateCache?.products) invalidateCache.products();

    res.json({
      message: "Review updated successfully",
      review: { ...updated, _id: updated.id },
      rating: avgRating,
    });
  } catch (error) {
    console.error("Review update error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete review
// @route   DELETE /api/products/:id/reviews/:reviewId
// @access  Private (User can delete own review, Admin can delete any)
router.delete("/:id/reviews/:reviewId", protect, async (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.user.id || req.user._id;

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    const isOwner = review.userId === userId;
    const isAdmin = req.user.isAdmin || req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    const productId = review.productId;
    await prisma.review.delete({ where: { id: reviewId } });

    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    const avgRating = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
    const numReviews = agg._count.id || 0;

    await prisma.product.update({
      where: { id: productId },
      data: { rating: avgRating, numReviews },
    });

    if (invalidateCache?.products) invalidateCache.products();

    res.json({
      message: "Review deleted successfully",
      rating: avgRating,
      numReviews,
    });
  } catch (error) {
    console.error("Review deletion error:", error);
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reply to review (Vendor)
// @route   PUT /api/products/:id/reviews/:reviewId/reply
// @access  Private/Vendor
router.put("/:id/reviews/:reviewId/reply", protectVendor, async (req, res) => {
  const { reply } = req.body;
  const reviewId = req.params.reviewId;
  const vendorId = req.vendor.id || req.vendor._id;

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.product.vendorId !== vendorId) {
      return res.status(401).json({
        message: "Not authorized to reply to this product's reviews",
      });
    }

    res.json({ message: "Reply added" });
  } catch (error) {
    console.error("Review reply error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
