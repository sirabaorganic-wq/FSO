/**
 * FSO Vendor Product Service — Neon PostgreSQL via Prisma
 * Strictly scopes all operations by authenticated vendorId.
 */

const prisma = require('../../config/prisma');

const generateUniqueProductSlug = async (name) => {
  let baseSlug = (name || 'artisan-product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) baseSlug = 'artisan-product';

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    });
    if (!existing) break;
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
};

/**
 * List products owned by this vendor.
 */
const listVendorProducts = async (vendorId, { page = 1, limit = 20, status } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = { vendorId };
  if (status) {
    where.vendorStatus = status.toLowerCase();
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({ ...p, _id: p.id })),
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    total,
  };
};

/**
 * Create a new product for this vendor.
 */
const createVendorProduct = async (vendorId, productData) => {
  const slug = await generateUniqueProductSlug(productData.name);

  const product = await prisma.product.create({
    data: {
      name: productData.name.trim(),
      slug,
      description: productData.description || '',
      shortDescription: productData.shortDescription || '',
      price: parseFloat(productData.price) || 0,
      compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : null,
      stockQuantity: parseInt(productData.stockQuantity, 10) || 0,
      category: productData.category || 'General',
      image: productData.image || null,
      images: Array.isArray(productData.images) ? productData.images : [],
      sku: productData.sku || null,
      hsn: productData.hsn || null,
      originState: productData.originState || null,
      originRegion: productData.originRegion || null,
      vendorId,
      isVendorProduct: true,
      vendorStatus: 'pending', // Pending admin approval
      isPublic: false,
      isActive: true,
    },
  });

  return {
    ...product,
    _id: product.id,
  };
};

/**
 * Get single product owned by this vendor.
 */
const getVendorProduct = async (vendorId, productId) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!product) return null;

  return {
    ...product,
    _id: product.id,
  };
};

/**
 * Update an existing product owned by this vendor.
 */
const updateVendorProduct = async (vendorId, productId, updates) => {
  const existing = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!existing) return null;

  const data = {};
  if (updates.name) data.name = updates.name.trim();
  if (updates.description !== undefined) data.description = updates.description;
  if (updates.shortDescription !== undefined) data.shortDescription = updates.shortDescription;
  if (updates.price !== undefined) data.price = parseFloat(updates.price) || 0;
  if (updates.compareAtPrice !== undefined) data.compareAtPrice = updates.compareAtPrice ? parseFloat(updates.compareAtPrice) : null;
  if (updates.stockQuantity !== undefined) {
    const rawStock = updates.stockQuantity;
    if (typeof rawStock === 'string' || typeof rawStock !== 'number' || !Number.isInteger(rawStock) || rawStock < 0 || !Number.isFinite(rawStock)) {
      const err = new Error('stockQuantity must be a non-negative finite integer');
      err.statusCode = 400;
      throw err;
    }
    data.stockQuantity = rawStock;
  }
  if (updates.category) data.category = updates.category;
  if (updates.image !== undefined) data.image = updates.image;
  if (updates.images) data.images = updates.images;
  if (updates.sku !== undefined) data.sku = updates.sku;
  if (updates.hsn !== undefined) data.hsn = updates.hsn;

  const updated = await prisma.product.update({
    where: { id: productId },
    data,
  });

  return {
    ...updated,
    _id: updated.id,
  };
};

/**
 * Delete a product owned by this vendor.
 */
const deleteVendorProduct = async (vendorId, productId) => {
  const existing = await prisma.product.findFirst({
    where: { id: productId, vendorId },
  });

  if (!existing) return { notFound: true };

  await prisma.product.delete({ where: { id: productId } });
  return { success: true };
};

/**
 * List inventory for this vendor.
 */
const listInventory = async (vendorId) => {
  const products = await prisma.product.findMany({
    where: { vendorId },
    select: {
      id: true,
      name: true,
      sku: true,
      stockQuantity: true,
      price: true,
      vendorStatus: true,
      isActive: true,
    },
  });

  return products.map((p) => ({
    _id: p.id,
    id: p.id,
    productId: p.id,
    name: p.name,
    sku: p.sku,
    stock: p.stockQuantity,
    stockQuantity: p.stockQuantity,
    price: p.price,
    status: p.vendorStatus,
    isActive: p.isActive,
  }));
};

/**
 * Create inventory batch (creates or updates product stock).
 */
const createInventoryBatch = async (vendorId, batchData) => {
  if (batchData.productId) {
    const product = await prisma.product.findFirst({
      where: { id: batchData.productId, vendorId },
    });
    if (!product) return null;

    const updated = await prisma.product.update({
      where: { id: batchData.productId },
      data: {
        stockQuantity: (product.stockQuantity || 0) + (parseInt(batchData.stockQuantity, 10) || 0),
      },
    });

    return {
      _id: updated.id,
      id: updated.id,
      stockQuantity: updated.stockQuantity,
      message: 'Inventory batch added successfully',
    };
  }

  return {
    message: 'Inventory batch received',
  };
};

/**
 * Update single inventory stock item.
 */
const updateInventoryItem = async (vendorId, itemId, data) => {
  const product = await prisma.product.findFirst({
    where: { id: itemId, vendorId },
  });

  if (!product) return null;

  const rawStock = data.stock !== undefined ? data.stock : data.stockQuantity;
  if (typeof rawStock === 'string' || typeof rawStock !== 'number' || !Number.isInteger(rawStock) || rawStock < 0 || !Number.isFinite(rawStock)) {
    const err = new Error('stockQuantity must be a non-negative finite integer');
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.product.update({
    where: { id: itemId },
    data: {
      stockQuantity: rawStock,
    },
  });

  return {
    _id: updated.id,
    id: updated.id,
    stock: updated.stockQuantity,
    stockQuantity: updated.stockQuantity,
  };
};

/**
 * Delete inventory item (resets stock or marks inactive).
 */
const deleteInventoryItem = async (vendorId, itemId) => {
  const product = await prisma.product.findFirst({
    where: { id: itemId, vendorId },
  });

  if (!product) return null;

  await prisma.product.update({
    where: { id: itemId },
    data: { isActive: false, stockQuantity: 0 },
  });

  return { message: 'Inventory item removed' };
};

/**
 * Bulk update inventory stocks.
 */
const bulkUpdateInventory = async (vendorId, items) => {
  if (!Array.isArray(items)) throw new Error('Items array is required');

  const results = [];
  for (const item of items) {
    const pId = item.id || item._id || item.productId || item.itemId;
    const rawStock = item.stock !== undefined ? item.stock : item.stockQuantity;
    if (typeof rawStock === 'string' || typeof rawStock !== 'number' || !Number.isInteger(rawStock) || rawStock < 0 || !Number.isFinite(rawStock)) {
      continue;
    }

    const updated = await prisma.product.updateMany({
      where: { id: pId, vendorId },
      data: { stockQuantity: rawStock },
    });

    if (updated.count > 0) {
      results.push({ id: pId, stock: rawStock });
    }
  }

  return {
    message: 'Inventory updated successfully',
    count: results.length,
    items: results,
  };
};

module.exports = {
  listVendorProducts,
  getVendorProduct,
  createVendorProduct,
  updateVendorProduct,
  deleteVendorProduct,
  listInventory,
  getInventory: listInventory,
  createInventoryBatch,
  updateInventoryItem,
  deleteInventoryItem,
  bulkUpdateInventory,
};
