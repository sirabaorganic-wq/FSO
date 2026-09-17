/**
 * FSO Blog Controller — Neon PostgreSQL via Prisma (Article mapping)
 * Replaces legacy Mongoose BlogPost queries with Prisma Article.
 * Strictly adheres to Amendment 5: Projects response shape faithfully.
 */

const prisma = require('../config/prisma');

const formatArticleAsBlog = (article) => {
  if (!article) return null;
  return {
    _id: article.id,
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    excerpt: article.excerpt || '',
    image: article.image || '',
    category: article.category || 'General',
    author: {
      name: article.authorName || 'FSO Editorial Team',
      title: article.authorBio || 'Heritage Specialist',
      avatar: article.authorImage || '',
    },
    tags: article.tags || [],
    readTime: article.readTime || 5,
    featured: false,
    published: article.published,
    approvalStatus: article.published ? 'approved' : 'pending',
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
};

// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res) => {
  try {
    const { category, tag } = req.query;
    const where = { published: true };

    if (category && category !== 'All') {
      where.category = category;
    }
    if (tag) {
      where.tags = { has: tag };
    }

    const articles = await prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(articles.map(formatArticleAsBlog));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all blog posts (Admin - includes drafts)
// @route   GET /api/blogs/admin
// @access  Private/Admin
const getAdminBlogs = async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(articles.map(formatArticleAsBlog));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single blog post by slug
// @route   GET /api/blogs/:slug
// @access  Public
const getBlogBySlug = async (req, res) => {
  try {
    const article = await prisma.article.findFirst({
      where: { slug: req.params.slug, published: true },
    });

    if (article) {
      res.json(formatArticleAsBlog(article));
    } else {
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single blog post by ID (Admin)
// @route   GET /api/blogs/id/:id
// @access  Private/Admin
const getBlogById = async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
    });

    if (article) {
      res.json(formatArticleAsBlog(article));
    } else {
      res.status(404).json({ message: 'Blog post not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a blog post
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = async (req, res) => {
  try {
    const { title, content, excerpt, image, category, tags } = req.body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const isBlogCreator = req.user && req.user.role === 'blog_creator' && !req.user.isAdmin;

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content: content || '',
        excerpt: excerpt || '',
        image: image || null,
        category: category || 'Kitchen Wisdom',
        tags: Array.isArray(tags) ? tags : [],
        published: !isBlogCreator,
        authorName: req.user?.name || 'FSO Author',
        createdById: req.user?.id || null,
      },
    });

    res.status(201).json(formatArticleAsBlog(article));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = async (req, res) => {
  try {
    const { title, content, excerpt, image, category, tags, published } = req.body;

    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const data = {};
    if (title) data.title = title;
    if (content !== undefined) data.content = content;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (image !== undefined) data.image = image;
    if (category) data.category = category;
    if (tags) data.tags = Array.isArray(tags) ? tags : [];
    if (published !== undefined) data.published = Boolean(published);

    const updated = await prisma.article.update({
      where: { id: req.params.id },
      data,
    });

    res.json(formatArticleAsBlog(updated));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = async (req, res) => {
  try {
    const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    await prisma.article.delete({ where: { id: req.params.id } });
    res.json({ message: 'Blog removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Approve/reject blog post
// @route   PUT /api/blogs/id/:id/approval
// @access  Private/Admin
const approveBlog = async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status value' });
    }

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: { published: approvalStatus === 'approved' },
    });

    res.json({
      message: `Blog post ${approvalStatus} successfully`,
      blog: formatArticleAsBlog(article),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getBlogs,
  getAdminBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  approveBlog,
};
