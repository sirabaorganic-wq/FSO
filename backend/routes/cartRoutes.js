const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect } = require("../middleware/authMiddleware");

/**
 * Strict quantity validation helper
 */
function validateQuantity(quantity) {
  if (quantity === undefined || quantity === null || typeof quantity === "boolean") {
    return { valid: false, error: "Quantity is required" };
  }
  const num = Number(quantity);
  if (!Number.isInteger(num)) {
    return { valid: false, error: "Quantity must be an integer" };
  }
  if (num < 1) {
    return { valid: false, error: "Quantity must be at least 1" };
  }
  if (num > 100) {
    return { valid: false, error: "Quantity cannot exceed 100" };
  }
  return { valid: true, value: num };
}

/**
 * Helper to get or create a Cart for a user (server-authoritative)
 */
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }
  return cart;
}

/**
 * Helper to enrich CartItems with authoritative product data from Neon PostgreSQL
 */
async function enrichCartItems(cartItems) {
  if (!cartItems || cartItems.length === 0) return [];

  const productIds = [...new Set(cartItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      price: true,
      compareAtPrice: true,
      stockQuantity: true,
      isPublic: true,
      isActive: true,
      vendorId: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return cartItems
    .map((item) => {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive || !product.isPublic) return null;

      // Ensure quantity doesn't exceed stock
      const validQuantity = Math.min(item.quantity, Math.max(1, product.stockQuantity));

      return {
        id: item.id,
        productId: product.id,
        product: product.id,
        _id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price, // Authoritative price from PostgreSQL
        compareAtPrice: product.compareAtPrice,
        stockQuantity: product.stockQuantity,
        countInStock: product.stockQuantity,
        quantity: validQuantity,
        qty: validQuantity,
        variant: item.variant || null,
        vendorId: product.vendorId,
      };
    })
    .filter(Boolean);
}

// @desc    Get user cart
// @route   GET /api/cart and /api/v1/cart
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await getOrCreateCart(userId);
    const enriched = await enrichCartItems(cart.items);
    res.json(enriched);
  } catch (error) {
    console.error("Cart retrieval error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve cart", code: "INTERNAL_ERROR" });
  }
});

// @desc    Update/Sync full cart
// @route   PUT /api/cart and /api/v1/cart
// @access  Private
router.put("/", protect, async (req, res) => {
  const { cartItems } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(cartItems)) {
    return res.status(422).json({ success: false, message: "cartItems must be an array", code: "VALIDATION_ERROR" });
  }

  // Validate quantities for all submitted items
  for (const item of cartItems) {
    const qCheck = validateQuantity(item.quantity ?? item.qty ?? 1);
    if (!qCheck.valid) {
      return res.status(422).json({ success: false, message: qCheck.error, code: "VALIDATION_ERROR" });
    }
  }

  try {
    const cart = await getOrCreateCart(userId);

    // Filter and sanitize product IDs/slugs
    const productRefs = cartItems
      .map((item) => item.productId || item.product || item._id)
      .filter(Boolean);

    const products = await prisma.product.findMany({
      where: { OR: [{ id: { in: productRefs } }, { slug: { in: productRefs } }] },
    });

    const productMap = new Map();
    products.forEach((p) => {
      productMap.set(p.id, p);
      productMap.set(p.slug, p);
    });

    // Transaction to replace cart items in PostgreSQL
    await prisma.$transaction(async (tx) => {
      // Clear current items
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Insert validated items
      for (const item of cartItems) {
        const pRef = item.productId || item.product || item._id;
        const product = productMap.get(pRef);
        if (product && product.isActive && product.isPublic && product.stockQuantity > 0) {
          const rawQty = Number(item.quantity ?? item.qty ?? 1);
          const qty = Math.min(rawQty, product.stockQuantity);
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: product.id,
              quantity: qty,
              variant: item.variant || null,
            },
          });
        }
      }
    });

    // Refresh and enrich
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const enriched = await enrichCartItems(updatedCart.items);

    // Also update JSON cart on User model for backward compatibility
    await prisma.user.update({
      where: { id: userId },
      data: { cart: enriched },
    });

    res.json(enriched);
  } catch (error) {
    console.error("Cart sync error:", error);
    res.status(500).json({ success: false, message: "Failed to update cart", code: "INTERNAL_ERROR" });
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/add and /api/cart
// @access  Private
router.post(["/", "/add"], protect, async (req, res) => {
  const { productId, quantity = 1, variant = null } = req.body;
  const pRef = productId || req.body.product;
  const userId = req.user.id;

  if (!pRef) {
    return res.status(422).json({ success: false, message: "Product ID is required", code: "VALIDATION_ERROR" });
  }

  const qCheck = validateQuantity(quantity);
  if (!qCheck.valid) {
    return res.status(422).json({ success: false, message: qCheck.error, code: "VALIDATION_ERROR" });
  }
  const requestedQty = qCheck.value;

  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: pRef }, { slug: pRef }] },
    });

    if (!product || !product.isActive || !product.isPublic) {
      return res.status(404).json({ success: false, message: "Product not found or unavailable", code: "NOT_FOUND" });
    }

    if (product.stockQuantity < 1) {
      return res.status(400).json({ success: false, message: "Product is out of stock", code: "OUT_OF_STOCK" });
    }

    const cart = await getOrCreateCart(userId);
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
        variant: variant || null,
      },
    });

    const newQty = existingItem
      ? Math.min(existingItem.quantity + requestedQty, product.stockQuantity)
      : Math.min(requestedQty, product.stockQuantity);

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: newQty,
          variant: variant || null,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const enriched = await enrichCartItems(updatedCart.items);
    await prisma.user.update({
      where: { id: userId },
      data: { cart: enriched },
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Cart add error:", error);
    res.status(500).json({ success: false, message: "Failed to add item to cart", code: "INTERNAL_ERROR" });
  }
});

// @desc    Update single cart item quantity
// @route   PUT /api/cart/item/:id or PUT /api/cart/:productId
// @access  Private
router.put(["/item/:id", "/:productId"], protect, async (req, res) => {
  const targetId = req.params.id || req.params.productId;
  const { quantity } = req.body;
  const userId = req.user.id;

  const qCheck = validateQuantity(quantity);
  if (!qCheck.valid) {
    return res.status(422).json({ success: false, message: qCheck.error, code: "VALIDATION_ERROR" });
  }
  const requestedQty = qCheck.value;

  try {
    const cart = await getOrCreateCart(userId);
    let item = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ id: targetId }, { productId: targetId }],
      },
    });

    if (!item) {
      const prod = await prisma.product.findUnique({ where: { slug: targetId } });
      if (prod) {
        item = await prisma.cartItem.findFirst({
          where: { cartId: cart.id, productId: prod.id },
        });
      }
    }

    if (!item) {
      return res.status(404).json({ success: false, message: "Cart item not found", code: "NOT_FOUND" });
    }

    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    const maxQty = product ? product.stockQuantity : item.quantity;
    const finalQty = Math.min(requestedQty, maxQty);

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: finalQty },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const enriched = await enrichCartItems(updatedCart.items);
    await prisma.user.update({
      where: { id: userId },
      data: { cart: enriched },
    });

    res.json(enriched);
  } catch (error) {
    console.error("Cart item update error:", error);
    res.status(500).json({ success: false, message: "Failed to update cart item", code: "INTERNAL_ERROR" });
  }
});

// @desc    Remove single cart item
// @route   DELETE /api/cart/item/:id or DELETE /api/cart/:productId
// @access  Private
router.delete(["/item/:id", "/:productId"], protect, async (req, res) => {
  const targetId = req.params.id || req.params.productId;
  const userId = req.user.id;

  try {
    const cart = await getOrCreateCart(userId);
    let item = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ id: targetId }, { productId: targetId }],
      },
    });

    if (!item) {
      const prod = await prisma.product.findUnique({ where: { slug: targetId } });
      if (prod) {
        item = await prisma.cartItem.findFirst({
          where: { cartId: cart.id, productId: prod.id },
        });
      }
    }

    if (item) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      return res.status(404).json({ success: false, message: "Cart item not found", code: "NOT_FOUND" });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const enriched = await enrichCartItems(updatedCart.items);
    await prisma.user.update({
      where: { id: userId },
      data: { cart: enriched },
    });

    res.json(enriched);
  } catch (error) {
    console.error("Cart item delete error:", error);
    res.status(500).json({ success: false, message: "Failed to remove item", code: "INTERNAL_ERROR" });
  }
});

// @desc    Clear user cart
// @route   DELETE /api/cart
// @access  Private
router.delete("/", protect, async (req, res) => {
  const userId = req.user.id;
  try {
    const cart = await getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.user.update({
      where: { id: userId },
      data: { cart: [] },
    });
    res.json([]);
  } catch (error) {
    console.error("Cart clear error:", error);
    res.status(500).json({ success: false, message: "Failed to clear cart", code: "INTERNAL_ERROR" });
  }
});

module.exports = router;
