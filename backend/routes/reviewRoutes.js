const express = require('express');
const router = express.Router();
const {
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    markReviewHelpful,
    addVendorReply,
    getMyReviews,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { protectVendor } = require('../middleware/vendorMiddleware');
const { verifyPurchase } = require('../middleware/reviewMiddleware');

/**
 * Review Routes
 * All review operations with proper authentication and authorization
 */

// @desc    Get all reviews for a product (with pagination, filtering, sorting)
// @route   GET /api/reviews/product/:id
// @access  Public
router.get('/product/:id', getProductReviews);

// @desc    Create a new review (Verified Buyers Only)
// @route   POST /api/reviews
// @access  Private
router.post('/', protect, createReview);

// @desc    Get user's own reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
router.get('/my-reviews', protect, getMyReviews);

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (User can update own review)
router.put('/:id', protect, updateReview);

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (User can delete own review, Admin can delete any)
router.delete('/:id', protect, deleteReview);

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
router.post('/:id/helpful', protect, markReviewHelpful);

// @desc    Vendor reply to review
// @route   POST /api/reviews/:id/reply
// @access  Private/Vendor
router.post('/:id/reply', protectVendor, addVendorReply);

module.exports = router;
