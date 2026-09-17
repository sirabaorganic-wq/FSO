const Razorpay = require('razorpay');
const crypto = require('crypto');
const razorpayClient = require('../config/razorpay');

/**
 * Payment Service
 * Handles all direct interactions with the Razorpay API.
 */

/**
 * Create a Razorpay Order
 * @param {number} amount - Amount in INR (will be converted to paise internally)
 * @param {string} receipt - Receipt ID (usually the local Order ID stringified)
 * @param {object} notes - Key-value pair for custom metadata
 * @returns {Promise<Object>} Razorpay Order Object
 */
/**
 * Create a Razorpay Order
 * @param {number} amount - Authoritative amount in INR
 * @param {string} receipt - Receipt identifier (Order ID or Order Number)
 * @param {object} notes - Key-value pair for custom metadata
 * @returns {Promise<Object>} Razorpay Order Object
 */
const createRazorpayOrder = async (amount, receipt, notes = {}) => {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw new Error('Valid positive amount is required to create payment order');
  }

  const amountInPaise = Math.round(amount * 100);
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error('Amount conversion to paise resulted in invalid value');
  }

  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: String(receipt),
    notes,
    payment_capture: 1, // Automatic capture
  };

  try {
    return await razorpayClient.orders.create(options);
  } catch (error) {
    const errorMsg = error.error?.description || error.message || 'Failed to create payment order';
    console.error('Razorpay Error: createRazorpayOrder failed:', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Verify Razorpay Signature (HMAC SHA256) using server-stored order ID
 * @param {string} serverOrderId - Server-authoritative Razorpay Order ID
 * @param {string} paymentId - Razorpay Payment ID
 * @param {string} signature - Razorpay Signature sent from frontend
 * @returns {boolean} True if signature is cryptographically valid
 */
const verifyPaymentSignature = (serverOrderId, paymentId, signature) => {
  if (!serverOrderId || !paymentId || !signature) {
    return false;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET is not configured on server');
    return false;
  }

  const body = `${serverOrderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

/**
 * Sanitize Razorpay Payment response for storage in rawResponse
 * Whitelist safe fields, stripping sensitive headers or internal tokens.
 * @param {object} entity - Razorpay payment entity
 * @returns {object|null} Sanitized payment details
 */
const sanitizeRawResponse = (entity) => {
  if (!entity || typeof entity !== 'object') return null;

  const allowedFields = [
    'id',
    'entity',
    'amount',
    'currency',
    'status',
    'order_id',
    'invoice_id',
    'international',
    'method',
    'amount_refunded',
    'refund_status',
    'captured',
    'description',
    'card_id',
    'bank',
    'wallet',
    'vpa',
    'email',
    'contact',
    'fee',
    'tax',
    'error_code',
    'error_description',
    'error_source',
    'error_step',
    'error_reason',
    'acquirer_data',
    'created_at',
  ];

  const sanitized = {};
  for (const field of allowedFields) {
    if (entity[field] !== undefined) {
      sanitized[field] = entity[field];
    }
  }

  return sanitized;
};

/**
 * Initiate Refund for a Payment
 * @param {string} paymentId - Razorpay Payment ID starting with 'pay_'
 * @param {number} [amount] - Amount to refund in INR (if not provided, fully refunds)
 * @param {string} [reason] - Log reason
 * @param {string} speed - 'normal' (5-7 days) or 'optimum' (instant where possible)
 * @param {string} [receipt] - Idempotency receipt key
 * @returns {Promise<Object>} Razorpay Refund Object
 */
const initiateRefund = async (paymentId, amount = null, reason = 'customer_requested', speed = 'normal', receipt = null) => {
  const prisma = require('../config/prisma');

  // Verify payment and enforce cumulative refund limits (Amendment 6)
  if (paymentId) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { razorpayPaymentId: paymentId },
          { id: paymentId },
        ],
      },
    });

    if (payment) {
      const existingRefunds = await prisma.refundLog.findMany({
        where: {
          OR: [
            { paymentId: payment.id },
            { paymentId: payment.razorpayPaymentId },
            { orderId: payment.orderId },
          ],
        },
      });

      const cumulativeRefunded = existingRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const requestedAmount = amount !== null ? Number(amount) : payment.amount;

      if (cumulativeRefunded + requestedAmount > payment.amount + 0.01) {
        const remainingRefundable = Math.max(0, payment.amount - cumulativeRefunded);
        const err = new Error(`Requested refund of ₹${requestedAmount} exceeds remaining refundable amount of ₹${remainingRefundable.toFixed(2)}`);
        err.code = 'REFUND_EXCEEDS_CAPTURED_AMOUNT';
        throw err;
      }
    }
  }

  const options = {
    speed,
    notes: { reason },
  };

  if (amount) {
    options.amount = Math.round(amount * 100); // Amount in paise
  }

  if (receipt) {
    options.receipt = String(receipt).substring(0, 40);
  }

  try {
    return await razorpayClient.payments.refund(paymentId, options);
  } catch (error) {
    const errorMsg = error.error?.description || error.message || 'Failed to initiate refund';
    console.error('Razorpay Error: initiateRefund failed:', errorMsg);
    const err = new Error(errorMsg);
    err.code = error.code || 'RAZORPAY_REFUND_FAILED';
    throw err;
  }
};

/**
 * Initiate Split Payment Transfers (Razorpay Route)
 * @param {string} paymentId - Captured Razorpay Payment ID
 * @param {Array<Object>} transfers - Array of transfer details
 * @returns {Promise<Object>} Result of the transfer
 */
const initiateTransfer = async (paymentId, transfers) => {
  try {
    const formattedTransfers = transfers.map((t) => ({
      ...t,
      amount: Math.round(t.amount * 100), // convert to paise
    }));

    return await razorpayClient.payments.transfer(paymentId, { transfers: formattedTransfers });
  } catch (error) {
    const errorMsg = error.error?.description || error.message || 'Failed to route payment to vendors';
    console.error('Razorpay Error: initiateTransfer failed:', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Fetch Payment Details directly from Razorpay API
 * @param {string} paymentId - Razorpay Payment ID
 * @returns {Promise<Object>}
 */
const fetchPaymentDetails = async (paymentId) => {
  try {
    return await razorpayClient.payments.fetch(paymentId);
  } catch (error) {
    const errorMsg = error.error?.description || error.message || 'Failed to fetch payment details';
    console.error('Razorpay Error: fetchPaymentDetails failed:', errorMsg);
    throw new Error(errorMsg);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  sanitizeRawResponse,
  initiateRefund,
  initiateTransfer,
  fetchPaymentDetails,
};
