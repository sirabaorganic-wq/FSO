/**
 * FSO Razorpay Webhook Controller - Prisma ORM (Neon PostgreSQL)
 * Handles incoming webhooks with cryptographic HMAC signature verification,
 * authoritative X-Razorpay-Event-ID idempotency, order-independent processing,
 * raw response privacy filtering, and payment rebinding protection in PostgreSQL.
 */

const Razorpay = require("razorpay");
const prisma = require("../config/prisma");
const { sanitizeRawResponse } = require("../services/paymentService");
const { enqueueShipment } = require("../jobs/shiprocketQueue");

/**
 * Handle incoming Razorpay Webhooks
 */
const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature) {
      console.warn("Webhook blocked: Missing secret or signature");
      return res.status(400).send("Missing signature or secret not configured");
    }

    const rawBody = req.body;
    if (!rawBody || !(Buffer.isBuffer(rawBody) || typeof rawBody === "string")) {
      return res.status(400).send("Invalid raw body");
    }

    const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);

    let isValid = false;
    try {
      isValid = Razorpay.validateWebhookSignature(rawBodyStr, signature, secret);
    } catch (e) {
      console.error("Webhook signature validation threw error:", e.message || e);
      return res.status(400).send("Signature validation failed");
    }

    if (!isValid) {
      console.warn("Webhook blocked: Invalid signature");
      return res.status(400).send("Invalid signature");
    }

    // MANDATORY AMENDMENT 3: Webhook event ID MUST come from X-Razorpay-Event-ID header
    const eventIdHeader = req.headers["x-razorpay-event-id"] || req.headers["X-Razorpay-Event-ID"];
    if (!eventIdHeader || typeof eventIdHeader !== "string" || !eventIdHeader.trim()) {
      console.warn("Webhook blocked: Missing X-Razorpay-Event-ID header");
      return res.status(400).send("Missing X-Razorpay-Event-ID header");
    }

    const eventId = eventIdHeader.trim();

    // Parse verified payload
    let payload;
    try {
      payload = JSON.parse(rawBodyStr);
    } catch (parseErr) {
      return res.status(400).send("Malformed JSON payload");
    }

    // Idempotency check backed by PostgreSQL WebhookLog
    const existingLog = await prisma.webhookLog.findUnique({
      where: { eventId },
    });

    if (existingLog) {
      return res.status(200).send("Event already processed");
    }

    const currentEvent = payload.event;

    // Log immediately in processing state
    const logEntry = await prisma.webhookLog.create({
      data: {
        eventId,
        provider: "razorpay",
        eventType: currentEvent || "unknown",
        status: "processing",
        payload: payload,
      },
    });

    // Authoritative event processing
    try {
      await processEvent(currentEvent, payload.payload);
      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: { status: "processed" },
      });
      return res.status(200).send("Webhook processed successfully");
    } catch (processError) {
      console.error(`Webhook processing failed for event ${currentEvent}:`, processError.message || processError);
      await prisma.webhookLog.update({
        where: { id: logEntry.id },
        data: { status: "failed" },
      });
      return res.status(500).send("Webhook event processing failed");
    }
  } catch (error) {
    console.error("Webhook Handler Error:", error.message || error);
    return res.status(500).send("Internal Error");
  }
};

/**
 * Event Processor
 */
async function processEvent(event, data) {
  if (!data) return;

  switch (event) {
    case "payment.captured":
    case "order.paid":
      await handlePaymentCaptured(data);
      break;
    case "payment.failed":
      await handlePaymentFailed(data);
      break;
    case "refund.processed":
      await handleRefundProcessed(data);
      break;
    default:
      console.log(`Unhandled Razorpay event: ${event}`);
  }
}

/**
 * Handle payment.captured and order.paid
 */
async function handlePaymentCaptured(data) {
  const paymentEntity = data.payment?.entity;
  if (!paymentEntity) return;

  const rzpOrderId = paymentEntity.order_id;
  const rzpPaymentId = paymentEntity.id;

  if (!rzpOrderId || !rzpPaymentId) {
    console.warn("Webhook: Missing order_id or payment id in payment entity");
    return;
  }

  // MANDATORY AMENDMENT 9: Resolve FSO Order exclusively through authoritative Razorpay order ID
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: rzpOrderId },
    include: { vendorOrders: true },
  });

  if (!order) {
    console.warn(`Webhook Warning: Order not found for Razorpay order ${rzpOrderId}. Zero mutation.`);
    return;
  }

  // MANDATORY AMENDMENT 7: Provider order binding
  if (paymentEntity.order_id !== order.razorpayOrderId) {
    console.warn(`Webhook: Order ID mismatch between provider and FSO Order. Zero mutation.`);
    return;
  }

  // Provider amount and currency verification
  const expectedPaise = Math.round(Number(order.totalPrice) * 100);
  if (paymentEntity.amount && paymentEntity.amount !== expectedPaise) {
    console.warn(`Webhook: Amount mismatch (${paymentEntity.amount} vs ${expectedPaise}). Zero mutation.`);
    return;
  }

  if (paymentEntity.currency && paymentEntity.currency !== "INR") {
    console.warn(`Webhook: Currency is not INR (${paymentEntity.currency}). Zero mutation.`);
    return;
  }

  // MANDATORY AMENDMENT 6: Payment ID Rebinding Protection
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: rzpPaymentId },
  });

  if (existingPayment) {
    if (existingPayment.orderId !== order.id) {
      console.warn(`Webhook: Payment ID ${rzpPaymentId} is already bound to order ${existingPayment.orderId}. Zero mutation.`);
      return;
    }
    if (existingPayment.status === "CAPTURED" && order.paymentStatus === "CAPTURED") {
      return; // Already processed
    }
  }

  // Sanitize rawResponse
  const sanitizedRaw = sanitizeRawResponse(paymentEntity);

  // Execute database mutation inside an interactive transaction
  await prisma.$transaction(async (tx) => {
    // Upsert payment record
    await tx.payment.upsert({
      where: { razorpayPaymentId: rzpPaymentId },
      update: {
        razorpayOrderId: rzpOrderId,
        status: "CAPTURED",
        method: paymentEntity.method || null,
        bank: paymentEntity.bank || null,
        wallet: paymentEntity.wallet || null,
        vpa: paymentEntity.vpa || null,
        rawResponse: sanitizedRaw,
      },
      create: {
        orderId: order.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        amount: order.totalPrice,
        currency: "INR",
        status: "CAPTURED",
        method: paymentEntity.method || null,
        bank: paymentEntity.bank || null,
        wallet: paymentEntity.wallet || null,
        vpa: paymentEntity.vpa || null,
        rawResponse: sanitizedRaw,
      },
    });

    // Update main order
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMED",
        paymentStatus: "CAPTURED",
        paidAt: order.paidAt || new Date(),
        razorpayPaymentId: rzpPaymentId,
        paymentMethod: "razorpay",
      },
    });

    // Update vendor orders
    await tx.vendorOrder.updateMany({
      where: { orderId: order.id },
      data: { status: "ACCEPTED" },
    });
  });

  // Enqueue shipment jobs
  for (const vo of order.vendorOrders || []) {
    try {
      if (enqueueShipment) {
        await enqueueShipment(vo.id, order.id, vo.vendorId);
      }
    } catch (err) {
      console.error("Post-payment shipment enqueue notice:", err.message);
    }
  }
}

/**
 * Handle payment.failed
 */
async function handlePaymentFailed(data) {
  const paymentEntity = data.payment?.entity;
  if (!paymentEntity) return;

  const rzpOrderId = paymentEntity.order_id;
  const rzpPaymentId = paymentEntity.id;

  if (!rzpPaymentId || typeof rzpPaymentId !== "string" || !rzpPaymentId.startsWith("pay_")) {
    console.warn("Webhook: Invalid or non-provider payment ID in payment.failed");
    return;
  }

  // Resolve FSO Order
  let order = null;
  if (rzpOrderId) {
    order = await prisma.order.findFirst({
      where: { razorpayOrderId: rzpOrderId },
    });
  }

  if (!order) {
    const existingP = await prisma.payment.findUnique({
      where: { razorpayPaymentId: rzpPaymentId },
      include: { order: true },
    });
    order = existingP?.order;
  }

  if (!order) {
    console.warn(`Webhook: Could not resolve order for failed payment ${rzpPaymentId}. Zero mutation.`);
    return;
  }

  // Rebinding check
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: rzpPaymentId },
  });

  if (existingPayment && existingPayment.orderId !== order.id) {
    console.warn(`Webhook: Rebinding mismatch in payment.failed. Zero mutation.`);
    return;
  }

  // MANDATORY AMENDMENT 4: Regression Prevention
  // Never allow CAPTURED -> FAILED or CONFIRMED -> payment regression
  if (order.paymentStatus === "CAPTURED") {
    console.warn(`Webhook: Order ${order.id} is already CAPTURED. Regression to FAILED prohibited.`);
    return;
  }

  const sanitizedRaw = sanitizeRawResponse(paymentEntity);

  // Persist failed payment with real pay_... ID
  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { razorpayPaymentId: rzpPaymentId },
      update: {
        status: "FAILED",
        errorReason: paymentEntity.error_description || "Payment failed",
        rawResponse: sanitizedRaw,
      },
      create: {
        orderId: order.id,
        razorpayOrderId: rzpOrderId || order.razorpayOrderId || "",
        razorpayPaymentId: rzpPaymentId,
        amount: order.totalPrice,
        currency: "INR",
        status: "FAILED",
        errorReason: paymentEntity.error_description || "Payment failed",
        rawResponse: sanitizedRaw,
      },
    });

    if (order.paymentStatus !== "CAPTURED") {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });
    }
  });
}

/**
 * Handle refund.processed
 */
async function handleRefundProcessed(data) {
  const refundEntity = data.refund?.entity;
  if (!refundEntity) return;

  const rzpRefundId = refundEntity.id;
  if (!rzpRefundId) return;

  const refundLog = await prisma.refundLog.findUnique({
    where: { razorpayRefundId: rzpRefundId },
  });

  if (refundLog) {
    await prisma.refundLog.update({
      where: { id: refundLog.id },
      data: { status: "processed" },
    });
  }
}

module.exports = {
  handleWebhook,
};
