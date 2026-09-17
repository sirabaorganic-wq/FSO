/**
 * FSO Payment Controller - Prisma ORM (Neon PostgreSQL)
 * Enforces server-authoritative payment states, cryptographic signature verification,
 * provider status validation, strict user ownership, and payment rebinding protection.
 */

const prisma = require("../config/prisma");
const paymentService = require("../services/paymentService");
const { enqueueShipment } = require("../jobs/shiprocketQueue");

/**
 * @desc    Create Razorpay Order
 * @route   POST /api/payment/create-order
 * @access  Private
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderId, receipt } = req.body;
    const targetRef = String(orderId || receipt || "").trim();

    if (!targetRef) {
      return res.status(400).json({ message: "Order reference is required" });
    }

    // Look up order in PostgreSQL
    const localOrder = await prisma.order.findFirst({
      where: {
        OR: [{ id: targetRef }, { orderNumber: targetRef }],
      },
      include: { payments: true },
    });

    if (!localOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Enforce ownership: user can only initialize payment for their own order
    if (localOrder.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
    }

    // COD Isolation: COD orders must not initialize Razorpay payments
    if (localOrder.paymentMethod !== "razorpay") {
      return res.status(400).json({ message: "Order is not configured for online payment" });
    }

    // Check if payment already captured
    if (localOrder.paymentStatus === "CAPTURED") {
      return res.status(400).json({ message: "Payment already captured for this order" });
    }

    // Verify order is in a payable state
    if (localOrder.status !== "PENDING" && localOrder.status !== "PROCESSING") {
      return res.status(400).json({ message: `Order in state ${localOrder.status} cannot be paid` });
    }

    // Authoritative amount strictly derived from server database
    const authoritativeAmount = Number(localOrder.totalPrice);
    if (!authoritativeAmount || authoritativeAmount <= 0) {
      return res.status(400).json({ message: "Invalid order amount" });
    }

    // Deduplication: if order already has an active, valid Razorpay order ID, reuse it
    if (localOrder.razorpayOrderId) {
      return res.json({
        success: true,
        id: localOrder.razorpayOrderId,
        orderId: localOrder.razorpayOrderId,
        amount: Math.round(authoritativeAmount * 100),
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        fsoOrderId: localOrder.id,
        orderNumber: localOrder.orderNumber,
      });
    }

    // Create Razorpay Order with authoritative server amount
    const rzpOrder = await paymentService.createRazorpayOrder(
      authoritativeAmount,
      localOrder.orderNumber || localOrder.id,
      {
        fsoOrderId: localOrder.id,
        fsoOrderNumber: localOrder.orderNumber,
      }
    );

    // Persist provider order ID on FSO Order
    await prisma.order.update({
      where: { id: localOrder.id },
      data: {
        razorpayOrderId: rzpOrder.id,
        paymentStatus: "PENDING",
      },
    });

    return res.json({
      success: true,
      id: rzpOrder.id,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      fsoOrderId: localOrder.id,
      orderNumber: localOrder.orderNumber,
    });
  } catch (error) {
    console.error("Create Order Error:", error.message || error);
    return res.status(500).json({ message: "Payment creation failed", error: error.message });
  }
};

/**
 * @desc    Verify Razorpay Payment Signature and Capture Status
 * @route   POST /api/payment/verify
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, order_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    const targetOrderId = String(orderId || order_id || "").trim();

    // 1. Look up Order in PostgreSQL
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(targetOrderId ? [{ id: targetOrderId }, { orderNumber: targetOrderId }] : []),
          { razorpayOrderId: razorpay_order_id },
        ],
      },
      include: { vendorOrders: true, payments: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found in database" });
    }

    // 2. Ownership check
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden: You do not own this order" });
    }

    // 3. Provider Order Binding check: client razorpay_order_id must match server-stored order
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Razorpay order ID mismatch" });
    }

    // 4. Server-Side Signature Verification: MUST use server-stored order.razorpayOrderId
    const serverStoredOrderId = order.razorpayOrderId || razorpay_order_id;
    const isValidSignature = paymentService.verifyPaymentSignature(
      serverStoredOrderId,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.warn(`Invalid payment signature attempt for order: ${order.id}`);
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 5. Payment ID Rebinding Protection & Idempotency
    const existingPayment = await prisma.payment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id },
    });

    if (existingPayment) {
      if (existingPayment.orderId !== order.id) {
        // Rebinding conflict: payment ID was already bound to another order! ZERO MUTATION!
        return res.status(409).json({ message: "Payment ID is already bound to another order" });
      }

      if (existingPayment.status === "CAPTURED") {
        return res.json({
          success: true,
          message: "Payment already verified and processed",
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: "CAPTURED",
          status: order.status,
        });
      }
    }

    // 6. Fetch authoritative payment details from Razorpay API
    let providerPayment;
    try {
      providerPayment = await paymentService.fetchPaymentDetails(razorpay_payment_id);
    } catch (err) {
      return res.status(400).json({ message: "Could not fetch provider payment details", error: err.message });
    }

    // 7. Provider Payment Integrity Validations
    if (providerPayment.order_id !== serverStoredOrderId) {
      return res.status(400).json({ message: "Provider payment order ID mismatch" });
    }

    if (providerPayment.currency !== "INR") {
      return res.status(400).json({ message: "Invalid payment currency. Expected INR" });
    }

    const expectedPaise = Math.round(Number(order.totalPrice) * 100);
    if (providerPayment.amount !== expectedPaise) {
      return res.status(400).json({ message: "Payment amount mismatch with order total" });
    }

    // 8. Payment Success Authority: only "captured" transitions to CAPTURED and CONFIRMED
    let targetPaymentStatus;
    let targetOrderStatus = order.status;

    if (providerPayment.status === "captured") {
      targetPaymentStatus = "CAPTURED";
      targetOrderStatus = "CONFIRMED";
    } else if (providerPayment.status === "authorized") {
      targetPaymentStatus = "AUTHORIZED";
      targetOrderStatus = order.status; // Remain PENDING
    } else {
      return res.status(400).json({
        message: `Provider payment status is ${providerPayment.status}, cannot confirm order`,
        providerStatus: providerPayment.status,
      });
    }

    // Regression prevention
    if (order.paymentStatus === "CAPTURED" && targetPaymentStatus !== "CAPTURED") {
      return res.json({
        success: true,
        message: "Order payment already captured, regression prevented",
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: "CAPTURED",
        status: order.status,
      });
    }

    // 9. Execute database mutation inside an interactive transaction
    const sanitizedRaw = paymentService.sanitizeRawResponse(providerPayment);

    await prisma.$transaction(async (tx) => {
      // Upsert Payment record
      await tx.payment.upsert({
        where: { razorpayPaymentId: razorpay_payment_id },
        update: {
          razorpayOrderId: serverStoredOrderId,
          razorpaySignature: razorpay_signature,
          status: targetPaymentStatus,
          method: providerPayment.method || null,
          bank: providerPayment.bank || null,
          wallet: providerPayment.wallet || null,
          vpa: providerPayment.vpa || null,
          rawResponse: sanitizedRaw,
        },
        create: {
          orderId: order.id,
          razorpayOrderId: serverStoredOrderId,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          amount: order.totalPrice,
          currency: "INR",
          status: targetPaymentStatus,
          method: providerPayment.method || null,
          bank: providerPayment.bank || null,
          wallet: providerPayment.wallet || null,
          vpa: providerPayment.vpa || null,
          rawResponse: sanitizedRaw,
        },
      });

      // Update Order
      const orderUpdateData = {
        paymentStatus: targetPaymentStatus,
        razorpayOrderId: serverStoredOrderId,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: "razorpay",
      };

      if (targetPaymentStatus === "CAPTURED") {
        orderUpdateData.status = "CONFIRMED";
        orderUpdateData.paidAt = new Date();
      }

      await tx.order.update({
        where: { id: order.id },
        data: orderUpdateData,
      });

      // Update VendorOrders if captured
      if (targetPaymentStatus === "CAPTURED") {
        await tx.vendorOrder.updateMany({
          where: { orderId: order.id },
          data: { status: "ACCEPTED" },
        });
      }
    });

    // 10. Enqueue shipment for vendor orders if Shiprocket is configured
    if (targetPaymentStatus === "CAPTURED") {
      for (const vo of order.vendorOrders || []) {
        try {
          if (enqueueShipment) {
            await enqueueShipment(vo.id, order.id, vo.vendorId);
          }
        } catch (queueErr) {
          console.error("Shiprocket queue notice:", queueErr.message);
        }
      }
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: targetPaymentStatus,
      status: targetOrderStatus,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error.message || error);
    return res.status(500).json({ message: "Payment verification failed", error: error.message });
  }
};

/**
 * @desc    Get Authoritative Payment / Order Status
 * @route   GET /api/payment/status/:orderId
 * @access  Private
 */
const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const targetId = String(req.params.orderId).trim();

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: targetId }, { orderNumber: targetId }, { razorpayOrderId: targetId }],
      },
      include: {
        payments: true,
      },
    });

    if (order) {
      if (order.userId !== userId && !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
      }

      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paidAt: order.paidAt,
        totalPrice: order.totalPrice,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        paymentMethod: order.paymentMethod,
      });
    }

    // Fallback search by Payment directly
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: targetId }, { razorpayOrderId: targetId }, { razorpayPaymentId: targetId }],
      },
      include: {
        order: { select: { id: true, userId: true, orderNumber: true, totalPrice: true, status: true } },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.order && payment.order.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
    }

    return res.json({
      orderId: payment.orderId,
      orderNumber: payment.order?.orderNumber || null,
      status: payment.order?.status || "PENDING",
      paymentStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
};
