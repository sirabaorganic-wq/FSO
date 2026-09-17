/**
 * Review Middleware - Prisma ORM (Neon PostgreSQL)
 * Verifies if user has purchased and received a specific product
 */

const prisma = require("../config/prisma");

const verifyPurchase = async (req, res, next) => {
  try {
    const productId = req.params.id || req.body.productId;
    const userId = req.user.id || req.user._id;

    const purchasedOrder = await prisma.order.findFirst({
      where: {
        userId: String(userId),
        status: "DELIVERED",
        orderItems: {
          some: { productId: String(productId) },
        },
      },
      include: {
        orderItems: {
          where: { productId: String(productId) },
        },
      },
    });

    if (!purchasedOrder) {
      return res.status(403).json({
        message: "You can only review products you have purchased and received",
        canReview: false,
        reason: "NOT_PURCHASED",
      });
    }

    req.purchaseVerified = true;
    req.purchasedOrder = { ...purchasedOrder, _id: purchasedOrder.id };
    next();
  } catch (error) {
    console.error("Purchase verification error:", error);
    res.status(500).json({ message: "Error verifying purchase" });
  }
};

const checkPurchaseStatus = async (userId, productId) => {
  try {
    const purchasedOrder = await prisma.order.findFirst({
      where: {
        userId: String(userId),
        status: "DELIVERED",
        orderItems: {
          some: { productId: String(productId) },
        },
      },
      include: {
        orderItems: {
          where: { productId: String(productId) },
        },
      },
    });

    if (purchasedOrder) {
      const orderItem = purchasedOrder.orderItems[0];
      return {
        canReview: true,
        isPurchased: true,
        orderId: purchasedOrder.id,
        deliveredAt: purchasedOrder.deliveredAt,
        purchaseDate: purchasedOrder.createdAt,
        productQuantity: orderItem?.quantity || 1,
      };
    }

    return {
      canReview: false,
      isPurchased: false,
    };
  } catch (error) {
    console.error("Error checking purchase status:", error);
    return {
      canReview: false,
      isPurchased: false,
      error: error.message,
    };
  }
};

module.exports = { verifyPurchase, checkPurchaseStatus };
