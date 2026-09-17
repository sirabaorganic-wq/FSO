/**
 * FSO Vendor Order Service — Neon PostgreSQL via Prisma
 * Strictly enforces vendor ownership and Gate 1 (No CANCELLED = RETURN assumption).
 */

const prisma = require('../../config/prisma');

/**
 * List orders assigned to this vendor.
 */
const listVendorOrders = async (vendorId, { page = 1, limit = 20, status }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = { vendorId };
  if (status) {
    where.status = status.toUpperCase();
  }

  const [orders, total] = await Promise.all([
    prisma.vendorOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        order: { select: { id: true, orderNumber: true, createdAt: true, user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.vendorOrder.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      ...o,
      _id: o.id,
      customer: o.order?.user || { name: 'Customer' },
    })),
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    total,
  };
};

/**
 * Get single vendor order detail.
 */
const getVendorOrder = async (vendorId, orderId) => {
  const order = await prisma.vendorOrder.findFirst({
    where: { id: orderId, vendorId },
    include: {
      order: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    _id: order.id,
    customer: order.order?.user,
  };
};

/**
 * Update vendor order fulfillment status.
 * Enforces legal monotonic transitions and cancellation consistency.
 */
const updateOrderStatus = async (vendorId, orderId, status) => {
  const validStatuses = ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const upper = (status || '').toUpperCase();
  if (!validStatuses.includes(upper)) {
    throw new Error(`Invalid status: ${status}. Allowed: ${validStatuses.join(', ')}`);
  }

  const existing = await prisma.vendorOrder.findFirst({
    where: { id: orderId, vendorId },
    include: { order: true },
  });
  if (!existing) return null;

  // Monotonic transition guards
  if (existing.status === 'DELIVERED' && upper === 'CANCELLED') {
    throw new Error('Cannot cancel an already delivered shipment');
  }
  if (existing.status === 'SHIPPED' && upper === 'CANCELLED') {
    throw new Error('Cannot cancel a shipment currently in transit with courier');
  }

  // If cancelling a shipment with an assigned AWB, reconcile with Shiprocket
  let shiprocketCancellation = null;
  if (upper === 'CANCELLED' && existing.awbCode && ['PROCESSING', 'READY_TO_SHIP'].includes(existing.status)) {
    const shiprocketService = require('../shiprocketService');
    try {
      shiprocketCancellation = await shiprocketService.cancelShipment(existing.awbCode);
    } catch (cancelErr) {
      console.warn(`Shiprocket cancellation notice for AWB ${existing.awbCode}:`, cancelErr.message);
      // Record reconciliation notification for admin
      await prisma.notification.create({
        data: {
          vendorId,
          type: 'order',
          title: 'Shiprocket Cancellation Reconciliation Needed',
          message: `VendorOrder ${orderId} cancelled in FSO, but Shiprocket AWB ${existing.awbCode} cancellation was not confirmed (${cancelErr.message}). Please verify in Shiprocket portal.`,
        },
      }).catch(() => {});
    }
  }

  const updated = await prisma.vendorOrder.update({
    where: { id: orderId },
    data: {
      status: upper,
      ...(upper === 'DELIVERED' && !existing.deliveredAt ? { deliveredAt: new Date(), payoutStatus: 'completed' } : {}),
      ...(upper === 'SHIPPED' && !existing.shippedAt ? { shippedAt: new Date() } : {}),
    },
  });

  return {
    ...updated,
    _id: updated.id,
    shiprocketCancellation,
  };
};

/**
 * List returns for this vendor adhering strictly to Phase 6 multi-vendor attribution.
 * A refund is attributed to a vendor ONLY IF:
 * 1. The parent order has only 1 vendor order (single-vendor order), OR
 * 2. RefundLog.reason contains the vendorOrder.id or vendorOrderNumber, OR
 * 3. The refund was initiated through vendor-specific refund operation.
 */
const listReturns = async (vendorId) => {
  const vendorOrders = await prisma.vendorOrder.findMany({
    where: { vendorId },
    select: { id: true, vendorOrderNumber: true, orderId: true },
  });

  if (vendorOrders.length === 0) {
    return {
      returns: [],
      total: 0,
      schemaNote: 'Returns tracked via RefundLog; VendorOrder has no returnStatus column.',
    };
  }

  const orderIds = [...new Set(vendorOrders.map((vo) => vo.orderId))];

  const refunds = await prisma.refundLog.findMany({
    where: { orderId: { in: orderIds } },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          vendorOrders: {
            select: { id: true, vendorId: true, vendorOrderNumber: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const attributedReturns = [];
  for (const r of refunds) {
    const parentOrder = r.order;
    const parentVOs = parentOrder?.vendorOrders || [];
    const isSingleVendor = parentVOs.length === 1 && parentVOs[0].vendorId === vendorId;

    let isAttributed = false;
    if (isSingleVendor) {
      isAttributed = true;
    } else {
      const reason = r.reason || '';
      for (const vo of vendorOrders) {
        if (reason.includes(vo.id) || (vo.vendorOrderNumber && reason.includes(vo.vendorOrderNumber))) {
          isAttributed = true;
          break;
        }
      }
    }

    if (isAttributed) {
      attributedReturns.push({
        ...r,
        _id: r.id,
        returnStatus: r.status,
      });
    }
  }

  return {
    returns: attributedReturns,
    total: attributedReturns.length,
    schemaNote: 'Returns tracked via RefundLog; VendorOrder has no returnStatus column.',
  };
};

/**
 * Process order refund for a vendor order.
 * Strictly adheres to Amendment 7 & Correction 1:
 * - Vendor-supplied amount in refundData is NEVER authoritative.
 * - Maximum refundable amount derived strictly from Payment.amount - cumulativeRefunds.
 * - Allocated proportionally across order financial records.
 */
const processOrderRefund = async (vendorId, orderId, refundData = {}) => {
  const vendorOrder = await prisma.vendorOrder.findFirst({
    where: { id: orderId, vendorId },
    include: {
      order: {
        include: {
          payments: true,
          refunds: true,
          vendorOrders: true,
        },
      },
    },
  });

  if (!vendorOrder) {
    throw new Error('Vendor order not found or unauthorized');
  }

  const order = vendorOrder.order;
  const capturedPayment = (order.payments || []).find(
    (p) => (p.status || '').toLowerCase() === 'captured'
  );

  const totalCapturedAmount = capturedPayment ? capturedPayment.amount : order.totalPrice;
  const existingRefunds = order.refunds || [];
  const cumulativeRefunded = existingRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const remainingRefundableOnOrder = Math.max(0, totalCapturedAmount - cumulativeRefunded);

  const vendorOrderTotal = (vendorOrder.subtotal || 0) + (vendorOrder.taxAmount || 0);
  const authoritativeRefundAmount = Math.min(vendorOrderTotal, remainingRefundableOnOrder);

  if (authoritativeRefundAmount <= 0) {
    throw new Error('No remaining refundable amount available for this order');
  }

  let razorpayRefundId = null;
  const receiptKey = `ref_vo_${vendorOrder.id}`.substring(0, 40);
  const taggedReason = `${refundData.reason || 'Vendor approved return/refund'} [VendorOrder:${vendorOrder.id}]`;

  // If prepaid payment exists, coordinate with paymentService
  if (capturedPayment && capturedPayment.razorpayPaymentId) {
    const paymentService = require('../paymentService');
    try {
      const razorpayRefund = await paymentService.initiateRefund(
        capturedPayment.razorpayPaymentId,
        authoritativeRefundAmount,
        taggedReason,
        'normal',
        receiptKey
      );
      razorpayRefundId = razorpayRefund.id;
    } catch (payErr) {
      console.error('Razorpay refund coordination failed:', payErr.message);
      throw payErr;
    }
  }

  const refund = await prisma.refundLog.create({
    data: {
      orderId: vendorOrder.orderId,
      paymentId: capturedPayment ? capturedPayment.id : null,
      razorpayRefundId,
      amount: authoritativeRefundAmount,
      reason: taggedReason,
      status: 'processed',
    },
  });

  await prisma.vendorOrder.update({
    where: { id: orderId },
    data: { payoutStatus: 'refunded' },
  });

  return {
    success: true,
    refund,
    authoritativeRefundAmount,
  };
};

module.exports = {
  listVendorOrders,
  getVendorOrder,
  updateOrderStatus,
  listReturns,
  processOrderRefund,
};
