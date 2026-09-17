/**
 * Review Controller - Prisma ORM (Neon PostgreSQL)
 */

const prisma = require("../config/prisma");
const { checkPurchaseStatus } = require("../middleware/reviewMiddleware");

/**
 * @desc    Get all reviews for a product (with pagination)
 * @route   GET /api/reviews/product/:id
 * @access  Public
 */
const getProductReviews = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const sortBy = req.query.sortBy || "createdAt";
    const order = req.query.order === "asc" ? "asc" : "desc";
    const ratingFilter = req.query.rating ? parseInt(req.query.rating) : null;

    const where = {
      productId,
      isApproved: true,
    };

    if (ratingFilter) {
      where.rating = ratingFilter;
    }

    let orderBy = { createdAt: order };
    if (sortBy === "rating") {
      orderBy = { rating: order };
    }

    const skip = (page - 1) * limit;

    const [reviews, total, ratingGroups, agg] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { productId, isApproved: true },
        _count: { rating: true },
      }),
      prisma.review.aggregate({
        where: { productId, isApproved: true },
        _avg: { rating: true },
      }),
    ]);

    const groupMap = new Map(ratingGroups.map((g) => [g.rating, g._count.rating]));
    const distribution = [5, 4, 3, 2, 1].map((rating) => {
      const count = groupMap.get(rating) || 0;
      return {
        rating,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
      };
    });

    const formattedReviews = reviews.map((r) => ({
      ...r,
      _id: r.id,
      product: r.productId,
      user: { ...r.user, _id: r.user.id },
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      distribution,
      summary: {
        totalReviews: total,
        averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Helper to update Product rating and numReviews aggregate
 */
async function updateProductRating(productId) {
  const agg = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { id: true },
  });

  const rating = agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0;
  const numReviews = agg._count.id || 0;

  await prisma.product.update({
    where: { id: productId },
    data: { rating, numReviews },
  });

  return { rating, numReviews };
}

/**
 * @desc    Create a new review (Verified Buyers Only)
 * @route   POST /api/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user.id || req.user._id;

    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({
        message: "Product ID, rating, title, and comment are required",
      });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        message: "Review comment must be at least 10 characters long",
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Verify purchase
    const purchaseStatus = await checkPurchaseStatus(userId, productId);
    if (!purchaseStatus.canReview) {
      return res.status(403).json({
        message: "You can only review products you have purchased and received",
        canReview: false,
        reason: "NOT_PURCHASED",
      });
    }

    // Check duplicate
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product. You can update your existing review.",
        existingReview: { ...existingReview, _id: existingReview.id },
      });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: numRating,
        title: title.trim(),
        comment: comment.trim(),
        isVerifiedPurchase: true,
        images: Array.isArray(images) ? images : [],
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const { rating: avgRating, numReviews } = await updateProductRating(productId);

    const formattedReview = {
      ...review,
      _id: review.id,
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
      message: "Review submitted successfully",
      review: formattedReview,
      productRating: avgRating,
      productNumReviews: numReviews,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update user's own review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user.id || req.user._id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId !== userId) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    const data = {};
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      data.rating = numRating;
    }
    if (title !== undefined) data.title = title.trim();
    if (comment !== undefined) {
      if (comment.trim().length < 10) {
        return res.status(400).json({ message: "Review comment must be at least 10 characters long" });
      }
      data.comment = comment.trim();
    }
    if (images !== undefined) data.images = Array.isArray(images) ? images : [];

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const { rating: avgRating } = await updateProductRating(review.productId);

    const formattedReview = {
      ...updated,
      _id: updated.id,
      user: { ...updated.user, _id: updated.user.id },
    };

    if (req.io) {
      req.io.emit("review_updated", {
        productId: review.productId,
        reviewId: review.id,
        rating: avgRating,
      });
    }

    res.json({
      message: "Review updated successfully",
      review: formattedReview,
      productRating: avgRating,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const userId = req.user.id || req.user._id;

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

    const { rating: avgRating, numReviews } = await updateProductRating(productId);

    if (req.io) {
      req.io.emit("review_deleted", {
        productId,
        reviewId,
        rating: avgRating,
      });
    }

    res.json({
      message: "Review deleted successfully",
      productRating: avgRating,
      productNumReviews: numReviews,
    });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
const markReviewHelpful = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({
      message: "Marked as helpful",
      helpfulCount: 1,
      isHelpful: true,
    });
  } catch (error) {
    console.error("Mark review helpful error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Vendor reply to review
 * @route   POST /api/reviews/:id/reply
 * @access  Private/Vendor
 */
const addVendorReply = async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const { reply } = req.body;
    const vendorId = req.vendor.id || req.vendor._id;

    if (!reply || reply.trim().length < 10) {
      return res.status(400).json({ message: "Reply must be at least 10 characters long" });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.product.vendorId !== vendorId) {
      return res.status(403).json({ message: "You can only reply to reviews for your products" });
    }

    res.json({
      message: "Reply added successfully",
      review: { ...review, _id: review.id, vendorReply: reply.trim() },
    });
  } catch (error) {
    console.error("Add vendor reply error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get user's own reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, name: true, image: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = reviews.map((r) => ({
      ...r,
      _id: r.id,
      product: { ...r.product, _id: r.product.id },
    }));

    res.json({
      reviews: formatted,
      count: reviews.length,
    });
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all reviews for products owned by authenticated vendor
 * @route   GET /api/v1/vendors/reviews
 * @access  Private/Vendor
 */
const getVendorReviews = async (req, res) => {
  try {
    const vendorId = req.vendor.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const where = {
      product: {
        vendorId,
      },
    };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, image: true, slug: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    const formatted = reviews.map((r) => ({
      ...r,
      _id: r.id,
      product: { ...r.product, _id: r.product.id },
      user: r.user ? { ...r.user, _id: r.user.id } : { name: "Customer" },
    }));

    res.json({
      reviews: formatted,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("Get vendor reviews error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  addVendorReply,
  getMyReviews,
  getVendorReviews,
};
