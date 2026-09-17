/**
 * FSO Order Routes - Prisma ORM (Neon PostgreSQL)
 * Preserves multi-vendor marketplace split logic:
 * Order -> OrderItem -> VendorOrder -> Payment -> Producer Settlement
 */

const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { protect, admin } = require("../middleware/authMiddleware");
const { invalidateCache } = require("../config/cache");

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
 * Helper to format an Order for backward compatibility
 */
function formatOrder(order) {
  if (!order) return null;
  return {
    ...order,
    _id: order.id,
    user: order.user ? { ...order.user, _id: order.user.id } : order.userId,
    orderItems: (order.orderItems || []).map((item) => ({
      ...item,
      _id: item.id,
      product: item.productId,
    })),
    vendorOrders: (order.vendorOrders || []).map((vo) => ({
      ...vo,
      _id: vo.id,
      vendor: vo.vendor ? { ...vo.vendor, _id: vo.vendor.id } : vo.vendorId,
      order: vo.orderId,
    })),
  };
}

// @desc    Create new order
// @route   POST /api/orders and /api/v1/orders
// @access  Private
router.post("/", protect, async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod = "razorpay",
    couponCode,
    gstClaimed = false,
    buyerGstNumber = null,
    businessName = null,
  } = req.body;

  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({ success: false, message: "No order items", code: "EMPTY_CART" });
  }

  const userId = req.user.id;

  try {
    // 1. Validate quantities and extract product references
    for (const item of orderItems) {
      const qCheck = validateQuantity(item.quantity ?? item.qty);
      if (!qCheck.valid) {
        return res.status(422).json({ success: false, message: qCheck.error, code: "VALIDATION_ERROR" });
      }
      const ref = item.productId || item.product || item._id;
      if (!ref) {
        return res.status(422).json({ success: false, message: "Product reference is required for all items", code: "VALIDATION_ERROR" });
      }
    }

    // 2. Authoritative Catalog Validation & Pricing
    const productRefs = [...new Set(orderItems.map((item) => item.productId || item.product || item._id).filter(Boolean))];
    const dbProducts = await prisma.product.findMany({
      where: { OR: [{ id: { in: productRefs } }, { slug: { in: productRefs } }] },
      include: { vendor: true },
    });

    const productMap = new Map();
    dbProducts.forEach((p) => {
      productMap.set(p.id, p);
      productMap.set(p.slug, p);
    });

    let calculatedSubtotal = 0;
    const validatedItems = [];

    // Process items preserving input ordering
    for (const item of orderItems) {
      const pRef = item.productId || item.product || item._id;
      const dbProduct = productMap.get(pRef);

      if (!dbProduct || !dbProduct.isActive || !dbProduct.isPublic) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name || pRef} is not available for purchase`,
          code: "PRODUCT_UNAVAILABLE",
        });
      }

      const qty = Number(item.quantity ?? item.qty);
      if (dbProduct.stockQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${dbProduct.name}. Available: ${dbProduct.stockQuantity}`,
          code: "INSUFFICIENT_STOCK",
        });
      }

      // Variant price check if specified
      let unitPrice = dbProduct.price;
      if (item.selectedOption && Array.isArray(dbProduct.options)) {
        const matchedOpt = dbProduct.options.find((o) => o.label === item.selectedOption.label);
        if (matchedOpt && matchedOpt.price) unitPrice = matchedOpt.price;
      }

      const lineTotal = unitPrice * qty;
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        productId: dbProduct.id,
        vendorId: dbProduct.vendorId,
        name: dbProduct.name,
        image: item.image || dbProduct.image,
        quantity: qty,
        price: unitPrice,
        total: lineTotal,
        hsn: dbProduct.hsn,
        variant: item.variant || item.selectedOption?.label || null,
      });
    }

    // 3. Authoritative Coupon Validation (Client discountAmount is NEVER trusted)
    let finalDiscount = 0;
    let verifiedCoupon = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode },
      });

      if (!coupon || !coupon.isActive) {
        return res.status(400).json({ success: false, message: "Invalid or inactive coupon code", code: "INVALID_COUPON" });
      }

      if (coupon.validUntil && new Date() > coupon.validUntil) {
        return res.status(400).json({ success: false, message: "Coupon has expired", code: "EXPIRED_COUPON" });
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ success: false, message: "Coupon usage limit reached", code: "COUPON_LIMIT_REACHED" });
      }

      if (coupon.minOrderValue && calculatedSubtotal < coupon.minOrderValue) {
        return res.status(400).json({
          success: false,
          message: `Minimum order value of ₹${coupon.minOrderValue} not met`,
          code: "COUPON_MIN_ORDER",
        });
      }

      if (coupon.discountType === "PERCENTAGE") {
        finalDiscount = Math.round((calculatedSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount) finalDiscount = Math.min(finalDiscount, coupon.maxDiscount);
      } else {
        finalDiscount = Math.min(calculatedSubtotal, coupon.discountValue);
      }

      verifiedCoupon = coupon;
    }

    // 4. Authoritative Tax & Shipping Calculations with Deterministic Line-Item Apportionment
    // item taxable base -> line tax -> subtotal tax -> order tax -> grand total
    let remainingDiscount = finalDiscount;
    let accumulatedItemTax = 0;

    const itemsWithTax = validatedItems.map((item, index) => {
      let itemDiscount = 0;
      if (finalDiscount > 0 && calculatedSubtotal > 0) {
        if (index === validatedItems.length - 1) {
          itemDiscount = Math.min(item.total, Math.round(remainingDiscount * 100) / 100);
        } else {
          itemDiscount = Math.min(
            item.total,
            Math.round(((item.total / calculatedSubtotal) * finalDiscount) * 100) / 100
          );
          remainingDiscount = Math.max(0, remainingDiscount - itemDiscount);
        }
      }

      const itemTaxableBase = Math.max(0, item.total - itemDiscount);
      const itemTax = Math.round(itemTaxableBase * 0.05 * 100) / 100; // 5% GST standard on food
      accumulatedItemTax += itemTax;

      return {
        ...item,
        taxRate: 5,
        taxAmount: itemTax,
      };
    });

    const discountedSubtotal = Math.max(0, calculatedSubtotal - finalDiscount);
    const taxPrice = Math.round(accumulatedItemTax * 100) / 100; // Sum of line-item taxes
    const shippingPrice = discountedSubtotal >= 500 ? 0 : 70; // Free delivery over ₹500, else ₹70
    const totalPrice = Math.round((discountedSubtotal + taxPrice + shippingPrice) * 100) / 100;

    const orderNumber = `FSO-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. ATOMIC TRANSACTION: Concurrency-safe stock deduction, Order, OrderItems, VendorOrders, Cart Clearing
    const result = await prisma.$transaction(async (tx) => {
      // Concurrency-safe conditional stock decrement
      for (const item of itemsWithTax) {
        const updateRes = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (updateRes.count !== 1) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.name}`);
        }
      }

      // Concurrency-safe coupon usage increment inside transaction
      if (verifiedCoupon) {
        if (verifiedCoupon.usageLimit) {
          const couponUpdateRes = await tx.coupon.updateMany({
            where: {
              id: verifiedCoupon.id,
              usageCount: { lt: verifiedCoupon.usageLimit },
            },
            data: { usageCount: { increment: 1 } },
          });

          if (couponUpdateRes.count !== 1) {
            throw new Error("COUPON_LIMIT_REACHED");
          }
        } else {
          await tx.coupon.update({
            where: { id: verifiedCoupon.id },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal: calculatedSubtotal,
          discountPrice: finalDiscount,
          taxPrice,
          shippingPrice,
          totalPrice,
          couponApplied: verifiedCoupon ? verifiedCoupon.code : null,
          shippingAddress: shippingAddress || {},
          paymentMethod: paymentMethod.toLowerCase(),
          gstClaimed: Boolean(gstClaimed),
          buyerGstNumber,
          businessName,
        },
      });

      // Create OrderItems with authoritative snapshot fields
      for (const item of itemsWithTax) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            vendorId: item.vendorId,
            name: item.name,
            image: item.image,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            hsn: item.hsn,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            variant: item.variant,
          },
        });
      }

      // Multi-vendor partitioning derived strictly from product.vendorId
      const vendorGroups = new Map();
      for (const item of itemsWithTax) {
        if (item.vendorId) {
          if (!vendorGroups.has(item.vendorId)) {
            vendorGroups.set(item.vendorId, []);
          }
          vendorGroups.get(item.vendorId).push(item);
        }
      }

      for (const [vId, vItems] of vendorGroups) {
        const vSubtotal = vItems.reduce((acc, i) => acc + i.total, 0);
        const commissionRate = 10; // 10% platform commission default
        const commissionAmount = Math.round((vSubtotal * commissionRate) / 100);
        const payoutAmount = vSubtotal - commissionAmount;
        const vendorOrderNumber = `VO-${newOrder.orderNumber}-${vId.slice(-4)}`;

        await tx.vendorOrder.create({
          data: {
            vendorOrderNumber,
            orderId: newOrder.id,
            vendorId: vId,
            status: "PENDING",
            subtotal: vSubtotal,
            commissionRate,
            commissionAmount,
            payoutAmount,
            payoutStatus: "pending",
            items: vItems,
          },
        });
      }

      // Authoritative transactional cart clearing
      const userCart = await tx.cart.findUnique({ where: { userId } });
      if (userCart) {
        await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
      }
      await tx.user.update({ where: { id: userId }, data: { cart: [] } });

      return newOrder;
    }, { maxWait: 15000, timeout: 30000 });

    if (invalidateCache?.orders) invalidateCache.orders();

    const fullOrder = await prisma.order.findUnique({
      where: { id: result.id },
      include: {
        orderItems: true,
        vendorOrders: true,
      },
    });

    if (req.io) {
      req.io.emit("new-order", fullOrder);
    }

    res.status(201).json(formatOrder(fullOrder));
  } catch (error) {
    if (error.message && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INSUFFICIENT_STOCK",
      });
    }
    if (error.message === "COUPON_LIMIT_REACHED") {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached",
        code: "COUPON_LIMIT_REACHED",
      });
    }
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create order", code: "INTERNAL_ERROR" });
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders and /api/v1/orders/myorders
// @access  Private
router.get("/myorders", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: true,
        vendorOrders: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error("Get myorders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders", code: "INTERNAL_ERROR" });
  }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders and /api/v1/orders
// @access  Private/Admin
router.get("/", protect, admin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: true,
        vendorOrders: {
          include: {
            vendor: { select: { id: true, businessName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders.map(formatOrder));
  } catch (error) {
    console.error("Get All Orders Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders", code: "INTERNAL_ERROR" });
  }
});

// @desc    Get order analytics (Admin)
// @route   GET /api/orders/analytics and /api/v1/orders/analytics
// @access  Private/Admin
router.get("/analytics", protect, admin, async (req, res) => {
  try {
    const [totalOrders, totalUsers, allOrders] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.findMany({
        select: {
          id: true,
          totalPrice: true,
          status: true,
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    const nonCancelled = allOrders.filter((o) => o.status !== "CANCELLED");
    const totalRevenue = nonCancelled.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
    const uniqueCustomers = new Set(allOrders.map((o) => o.userId)).size;

    const ordersByStatus = allOrders.reduce((acc, order) => {
      const st = order.status || "PENDING";
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    const completedOrders = allOrders.filter((o) => ["DELIVERED", "SHIPPED"].includes(o.status)).length;
    const pendingOrders = allOrders.filter((o) => ["PENDING", "CONFIRMED", "PROCESSING"].includes(o.status)).length;

    res.json({
      totalOrders,
      totalRevenue,
      totalUsers,
      uniqueCustomers,
      completedOrders,
      pendingOrders,
      ordersByStatus,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: "Analytics Failed", code: "INTERNAL_ERROR" });
  }
});

// @desc    Track order by ID (Public — Sanitized Zero-PII Projection per Amendment 8)
// @route   GET /api/orders/track/:id
// @access  Public
router.get("/track/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: targetId }, { orderNumber: targetId }],
      },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
        orderItems: {
          select: {
            name: true,
            quantity: true,
            image: true,
          },
        },
        vendorOrders: {
          select: {
            status: true,
            courierName: true,
            awbCode: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
      },
    });

    if (order) {
      res.json({
        success: true,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        items: order.orderItems,
        shipments: order.vendorOrders.map((vo) => ({
          status: vo.status,
          courierName: vo.courierName,
          awbCode: vo.awbCode,
          shippedAt: vo.shippedAt,
          deliveredAt: vo.deliveredAt,
        })),
      });
    } else {
      res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
    }
  } catch (error) {
    res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id and /api/v1/orders/:id
// @access  Private (Owner or Admin)
router.get("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.id;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: targetId }, { orderNumber: targetId }],
      },
      include: {
        orderItems: true,
        vendorOrders: {
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                logo: true,
                addressState: true,
                village: true,
                district: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
    }

    if (order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to view this order", code: "FORBIDDEN" });
    }

    res.json(formatOrder(order));
  } catch (error) {
    console.error("Get order by ID error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve order", code: "INTERNAL_ERROR" });
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put("/:id/status", protect, admin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
    }

    const newStatusUpper = (req.body.status || "PENDING").toUpperCase();
    const data = { status: newStatusUpper };

    if (newStatusUpper === "DELIVERED") {
      data.deliveredAt = new Date();
      data.paymentStatus = "CAPTURED";
      data.paidAt = order.paidAt || new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const upOrder = await tx.order.update({
        where: { id: req.params.id },
        data,
      });

      // Update related VendorOrders
      const voStatus = newStatusUpper === "DELIVERED" ? "DELIVERED" : newStatusUpper === "SHIPPED" ? "SHIPPED" : "PROCESSING";
      await tx.vendorOrder.updateMany({
        where: { orderId: order.id },
        data: {
          status: voStatus,
          deliveredAt: newStatusUpper === "DELIVERED" ? new Date() : undefined,
          payoutStatus: newStatusUpper === "DELIVERED" ? "completed" : undefined,
        },
      });

      return upOrder;
    });

    if (req.io) {
      req.io.emit("order-status-updated", updated);
    }

    if (invalidateCache?.orders) invalidateCache.orders();
    res.json(formatOrder(updated));
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({ success: false, message: "Failed to update order status", code: "INTERNAL_ERROR" });
  }
});

// @desc    User Cancel Order
// @route   POST /api/orders/:id/cancel
// @access  Private
router.post("/:id/cancel", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: true,
        vendorOrders: true,
        payments: true,
        refunds: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
    }

    if (order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this order", code: "FORBIDDEN" });
    }

    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`,
        code: "INVALID_ORDER_STATE",
      });
    }

    // 1. External Shiprocket Cancellation Reconciliation (Amendment 11 & Scenario 17)
    // External calls are executed outside database transactions (Amendment 5)
    const shiprocketService = require("../services/shiprocketService");
    for (const vo of order.vendorOrders || []) {
      if (vo.awbCode && ["PROCESSING", "READY_TO_SHIP"].includes(vo.status)) {
        try {
          await shiprocketService.cancelShipment(vo.awbCode);
        } catch (srErr) {
          console.warn(`Shiprocket cancellation notice for AWB ${vo.awbCode}:`, srErr.message);
          // Provider timeout/loss is UNKNOWN; record reconciliation alert without failing FSO cancellation
          await prisma.notification.create({
            data: {
              vendorId: vo.vendorId,
              type: "order",
              title: "Shiprocket Cancellation Reconciliation Needed",
              message: `Order ${order.orderNumber} (VendorOrder ${vo.vendorOrderNumber}) was cancelled in FSO, but Shiprocket AWB ${vo.awbCode} cancellation timed out or failed (${srErr.message}). Please verify in Shiprocket portal.`,
            },
          }).catch(() => {});
        }
      }
    }

    // 2. External Refund Reconciliation if prepaid (Amendment 6 & Correction 3)
    const capturedPayment = (order.payments || []).find((p) => p.status === "CAPTURED") || order.payments?.[0];
    const isPrepaid = order.isPaid === true || (capturedPayment && capturedPayment.status === "CAPTURED");
    let razorpayRefund = null;
    let refundAmount = 0;

    if (isPrepaid && capturedPayment && capturedPayment.razorpayPaymentId) {
      const cumulativeRefunded = (order.refunds || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const remainingRefundable = Math.max(0, Number(capturedPayment.amount || order.totalPrice) - cumulativeRefunded);

      if (remainingRefundable > 0) {
        refundAmount = remainingRefundable;
        const paymentService = require("../services/paymentService");
        const receiptKey = `ref_ord_${order.id}`.substring(0, 40);

        try {
          razorpayRefund = await paymentService.initiateRefund(
            capturedPayment.razorpayPaymentId,
            remainingRefundable,
            req.body.reason || "Order cancelled by customer",
            "normal",
            receiptKey
          );
        } catch (refundErr) {
          console.error("Razorpay refund coordination notice on cancel:", refundErr.message);
          await prisma.notification.create({
            data: {
              type: "payment",
              title: "Refund Reconciliation Needed",
              message: `Order ${order.orderNumber} was cancelled, but automated Razorpay refund of ₹${remainingRefundable} could not be confirmed (${refundErr.message}). Payment ID: ${capturedPayment.razorpayPaymentId}.`,
            },
          }).catch(() => {});
        }
      }
    }

    // 3. Atomic Local FSO State Transaction
    await prisma.$transaction(async (tx) => {
      // Rollback stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      // Update Order
      const orderUpdateData = {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: req.body.reason || "Cancelled by customer",
      };

      if (razorpayRefund && razorpayRefund.id) {
        orderUpdateData.paymentStatus = "REFUNDED";
      }

      await tx.order.update({
        where: { id: order.id },
        data: orderUpdateData,
      });

      // Update Vendor Orders
      await tx.vendorOrder.updateMany({
        where: { orderId: order.id },
        data: {
          status: "CANCELLED",
          ...(razorpayRefund && razorpayRefund.id ? { payoutStatus: "refunded" } : {}),
        },
      });

      // Record RefundLog if refund was executed
      if (razorpayRefund && razorpayRefund.id) {
        await tx.refundLog.create({
          data: {
            orderId: order.id,
            paymentId: capturedPayment ? capturedPayment.id : null,
            razorpayRefundId: razorpayRefund.id,
            amount: refundAmount,
            reason: req.body.reason || "Order cancelled by customer",
            status: "processed",
          },
        });
      }
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { orderItems: true, vendorOrders: true, refunds: true },
    });

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: formatOrder(updated),
      refund: razorpayRefund ? { id: razorpayRefund.id, amount: refundAmount } : null,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({ success: false, message: "Server error preventing cancellation", code: "INTERNAL_ERROR" });
  }
});

// @desc    Admin Force Refund Order
// @route   POST /api/orders/:id/admin/refund
// @access  Private/Admin
router.post("/:id/admin/refund", protect, admin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found", code: "NOT_FOUND" });
    }

    const refundAmount = order.totalPrice;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
        },
      });

      await tx.refundLog.create({
        data: {
          orderId: order.id,
          amount: refundAmount,
          reason: req.body.reason || "Admin Force Refund",
          status: "processed",
        },
      });
    });

    res.json({ success: true, message: "Order refunded successfully", orderId: order.id, amount: refundAmount });
  } catch (error) {
    console.error("Admin Refund Error:", error);
    res.status(500).json({ success: false, message: "Server error", code: "INTERNAL_ERROR" });
  }
});

module.exports = router;
