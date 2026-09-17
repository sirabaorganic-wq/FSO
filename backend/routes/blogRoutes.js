const express = require('express');
const router = express.Router();
const {
    getBlogs,
    getAdminBlogs,
    getBlogBySlug,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    approveBlog
} = require('../controllers/blogController');
const { protect, admin, adminOrBlogCreator } = require('../middleware/authMiddleware');

router.route('/')
    .get(getBlogs)
    .post(protect, adminOrBlogCreator, createBlog);

router.route('/admin').get(protect, adminOrBlogCreator, getAdminBlogs);

router.route('/:slug').get(getBlogBySlug);

router.route('/id/:id')
    .get(protect, adminOrBlogCreator, getBlogById)
    .put(protect, adminOrBlogCreator, updateBlog)
    .delete(protect, adminOrBlogCreator, deleteBlog);

router.route('/id/:id/approval')
    .put(protect, admin, approveBlog);

module.exports = router;
