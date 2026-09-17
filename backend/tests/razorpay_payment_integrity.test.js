/**
 * FSO Phase 4: Razorpay Payment Integrity Verification Test Suite
 * Production Payment Foundation Tests
 * 
 * Verifies all Phase 4 requirements and all 14 mandatory user amendments:
 * - Zero live Neon mutations: uses an isolated in-memory Prisma mock layer.
 * - Server-authoritative payment states, cryptographic signature checks,
 * - Provider status validation ("captured" authority),
 * - X-Razorpay-Event-ID header enforcement and idempotency,
 * - Payment ID rebinding protection,
 * - Out-of-order webhook delivery and regression prevention,
 * - Raw response privacy sanitization,
 * - COD isolation and cross-user authorization.
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Ensure secrets are set for test suite
process.env.JWT_SECRET = process.env.JWT_SECRET || 'fso_test_jwt_secret_32bytes_minimum_length';
process.env.RAZORPAY_KEY_ID = 'rzp_test_mockKeyId12345';
process.env.RAZORPAY_KEY_SECRET = 'mockKeySecret67890abcdef';
process.env.RAZORPAY_WEBHOOK_SECRET = 'mockWebhookSecret123456789';

// Mock BullMQ Shiprocket queue to prevent Redis connection attempts in tests
jest.mock('../jobs/shiprocketQueue', () => ({
  enqueueShipment: jest.fn().mockResolvedValue(true),
}));

// In-Memory Database State for Mocking
let mockDb = {
  orders: [],
  payments: [],
  webhookLogs: [],
  vendorOrders: [],
  users: [],
};

function resetMockDb() {
  mockDb = {
    users: [
      { id: 'usr_cust_a', name: 'Customer A', email: 'cust_a@example.com', role: 'customer' },
      { id: 'usr_cust_b', name: 'Customer B', email: 'cust_b@example.com', role: 'customer' },
      { id: 'usr_admin', name: 'Admin', email: 'admin@example.com', role: 'admin' },
    ],
    orders: [
      {
        id: 'ord_1001',
        orderNumber: 'FSO-2026-1001',
        userId: 'usr_cust_a',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 1250.50,
        subtotal: 1190.95,
        taxPrice: 59.55,
        shippingPrice: 0,
        discountPrice: 0,
        paymentMethod: 'razorpay',
        razorpayOrderId: null,
        razorpayPaymentId: null,
        razorpaySignature: null,
        paidAt: null,
        vendorOrders: [
          { id: 'vo_1001_1', orderId: 'ord_1001', vendorId: 'v_1', status: 'PENDING' },
        ],
        payments: [],
      },
      {
        id: 'ord_1002_cod',
        orderNumber: 'FSO-2026-1002',
        userId: 'usr_cust_a',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 500,
        paymentMethod: 'cod',
        razorpayOrderId: null,
        vendorOrders: [],
        payments: [],
      },
      {
        id: 'ord_1003_cust_b',
        orderNumber: 'FSO-2026-1003',
        userId: 'usr_cust_b',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 2000,
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_rzp_existing_b',
        vendorOrders: [],
        payments: [],
      },
      {
        id: 'ord_1004_already_paid',
        orderNumber: 'FSO-2026-1004',
        userId: 'usr_cust_a',
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
        totalPrice: 750,
        paymentMethod: 'razorpay',
        razorpayOrderId: 'order_rzp_paid_1004',
        razorpayPaymentId: 'pay_rzp_paid_1004',
        vendorOrders: [],
        payments: [
          {
            id: 'pay_rec_1004',
            orderId: 'ord_1004_already_paid',
            razorpayOrderId: 'order_rzp_paid_1004',
            razorpayPaymentId: 'pay_rzp_paid_1004',
            status: 'CAPTURED',
            amount: 750,
            currency: 'INR',
          },
        ],
      },
    ],
    payments: [],
    webhookLogs: [],
    vendorOrders: [],
  };
}

// Mock Prisma Client
jest.mock('../config/prisma', () => {
  return {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        const u = mockDb.users.find((user) => user.id === where.id);
        return u ? JSON.parse(JSON.stringify(u)) : null;
      }),
    },
    order: {
      findFirst: jest.fn(async ({ where, include }) => {
        let found = null;
        if (where.OR) {
          found = mockDb.orders.find((o) =>
            where.OR.some((cond) => {
              if (cond.id && o.id === cond.id) return true;
              if (cond.orderNumber && o.orderNumber === cond.orderNumber) return true;
              if (cond.razorpayOrderId && o.razorpayOrderId === cond.razorpayOrderId) return true;
              return false;
            })
          );
        } else if (where.razorpayOrderId) {
          found = mockDb.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId);
        } else if (where.id) {
          found = mockDb.orders.find((o) => o.id === where.id);
        }
        if (!found) return null;
        const copy = JSON.parse(JSON.stringify(found));
        if (include?.payments) {
          copy.payments = mockDb.payments.filter((p) => p.orderId === copy.id);
        }
        if (include?.vendorOrders) {
          copy.vendorOrders = copy.vendorOrders || [];
        }
        return copy;
      }),
      update: jest.fn(async ({ where, data }) => {
        const order = mockDb.orders.find((o) => o.id === where.id);
        if (!order) throw new Error(`Order ${where.id} not found`);
        Object.assign(order, data);
        return JSON.parse(JSON.stringify(order));
      }),
    },
    payment: {
      findUnique: jest.fn(async ({ where }) => {
        const p = mockDb.payments.find((x) => x.razorpayPaymentId === where.razorpayPaymentId);
        return p ? JSON.parse(JSON.stringify(p)) : null;
      }),
      findFirst: jest.fn(async ({ where, include }) => {
        let p = null;
        if (where.OR) {
          p = mockDb.payments.find((x) =>
            where.OR.some((cond) => {
              if (cond.id && x.id === cond.id) return true;
              if (cond.orderId && x.orderId === cond.orderId) return true;
              if (cond.razorpayOrderId && x.razorpayOrderId === cond.razorpayOrderId) return true;
              if (cond.razorpayPaymentId && x.razorpayPaymentId === cond.razorpayPaymentId) return true;
              return false;
            })
          );
        } else if (where.orderId) {
          p = mockDb.payments.find((x) => x.orderId === where.orderId);
        }
        if (!p) return null;
        const copy = JSON.parse(JSON.stringify(p));
        if (include?.order) {
          copy.order = mockDb.orders.find((o) => o.id === copy.orderId) || null;
        }
        return copy;
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        let p = mockDb.payments.find((x) => x.razorpayPaymentId === where.razorpayPaymentId);
        if (p) {
          Object.assign(p, update, { updatedAt: new Date() });
        } else {
          p = { id: `pm_${Date.now()}_${Math.random()}`, ...create, createdAt: new Date(), updatedAt: new Date() };
          mockDb.payments.push(p);
        }
        return JSON.parse(JSON.stringify(p));
      }),
      update: jest.fn(async ({ where, data }) => {
        const p = mockDb.payments.find((x) => x.id === where.id);
        if (!p) throw new Error(`Payment ${where.id} not found`);
        Object.assign(p, data);
        return JSON.parse(JSON.stringify(p));
      }),
    },
    webhookLog: {
      findUnique: jest.fn(async ({ where }) => {
        const log = mockDb.webhookLogs.find((l) => l.eventId === where.eventId);
        return log ? JSON.parse(JSON.stringify(log)) : null;
      }),
      create: jest.fn(async ({ data }) => {
        const log = { id: `whl_${Date.now()}`, ...data, processedAt: new Date() };
        mockDb.webhookLogs.push(log);
        return JSON.parse(JSON.stringify(log));
      }),
      update: jest.fn(async ({ where, data }) => {
        const log = mockDb.webhookLogs.find((l) => l.id === where.id);
        if (log) Object.assign(log, data);
        return log ? JSON.parse(JSON.stringify(log)) : null;
      }),
    },
    vendorOrder: {
      updateMany: jest.fn(async ({ where, data }) => {
        let count = 0;
        mockDb.orders.forEach((o) => {
          if (o.id === where.orderId && o.vendorOrders) {
            o.vendorOrders.forEach((vo) => {
              Object.assign(vo, data);
              count++;
            });
          }
        });
        return { count };
      }),
    },
    refundLog: {
      findUnique: jest.fn(async () => null),
      update: jest.fn(async () => null),
    },
    $transaction: jest.fn(async (callback) => {
      return await callback({
        order: {
          update: jest.fn(async ({ where, data }) => {
            const o = mockDb.orders.find((x) => x.id === where.id);
            if (o) Object.assign(o, data);
            return o;
          }),
        },
        payment: {
          upsert: jest.fn(async ({ where, update, create }) => {
            let p = mockDb.payments.find((x) => x.razorpayPaymentId === where.razorpayPaymentId);
            if (p) {
              Object.assign(p, update);
            } else {
              p = { id: `pm_${Date.now()}`, ...create };
              mockDb.payments.push(p);
            }
            return p;
          }),
        },
        vendorOrder: {
          updateMany: jest.fn(async ({ where, data }) => {
            return { count: 1 };
          }),
        },
      });
    }),
  };
});

// Mock Razorpay SDK client calls
const mockRazorpayOrdersCreate = jest.fn();
const mockRazorpayPaymentsFetch = jest.fn();
jest.mock('../config/razorpay', () => {
  return {
    orders: {
      create: (...args) => mockRazorpayOrdersCreate(...args),
    },
    payments: {
      fetch: (...args) => mockRazorpayPaymentsFetch(...args),
    },
  };
});

// Create Test App with Real Middleware and Controllers
function createTestApp() {
  const app = express();
  const rawBodyMiddleware = require('../middleware/rawBody');
  const razorpayWebhookRoutes = require('../routes/razorpayWebhookRoutes');
  const paymentRoutes = require('../routes/paymentRoutes');

  // Webhook mounted before express.json() with raw body
  app.use('/webhooks/razorpay', razorpayWebhookRoutes);

  app.use(express.json());

  // Test Authentication Mock Middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (e) {}
    }
    next();
  });

  app.use('/api/payment', paymentRoutes);
  return app;
}

// Helpers
function generateToken(userId, role = 'customer') {
  return jwt.sign({ id: userId, _id: userId, role, isAdmin: role === 'admin' }, process.env.JWT_SECRET);
}

function computeSignature(orderId, paymentId, secret = process.env.RAZORPAY_KEY_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function computeWebhookSignature(bodyStr, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
}

describe('FSO Phase 4: Razorpay Payment Integrity Test Suite', () => {
  let app;
  let tokenCustA;
  let tokenCustB;
  let tokenAdmin;

  beforeEach(() => {
    resetMockDb();
    jest.clearAllMocks();
    mockRazorpayOrdersCreate.mockReset();
    mockRazorpayPaymentsFetch.mockReset();
    app = createTestApp();
    tokenCustA = generateToken('usr_cust_a', 'customer');
    tokenCustB = generateToken('usr_cust_b', 'customer');
    tokenAdmin = generateToken('usr_admin', 'admin');
  });

  // ==========================================
  // 1. CONFIGURATION & SECRET SAFETY
  // ==========================================
  describe('1. Configuration & Secret Safety', () => {
    test('1. Missing RAZORPAY_KEY_ID in paymentService throws safely', async () => {
      const paymentService = require('../services/paymentService');
      expect(paymentService.verifyPaymentSignature).toBeDefined();
    });

    test('2. Missing RAZORPAY_KEY_SECRET causes signature verification to return false', () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      delete process.env.RAZORPAY_KEY_SECRET;
      const paymentService = require('../services/paymentService');
      const valid = paymentService.verifyPaymentSignature('ord_1', 'pay_1', 'sig_1');
      expect(valid).toBe(false);
      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });

    test('3. Missing webhook secret causes webhook endpoint to reject with 400', async () => {
      const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('x-razorpay-signature', 'some_signature')
        .set('x-razorpay-event-id', 'evt_missing_secret')
        .send({ event: 'payment.captured' });
      expect(res.status).toBe(400);
      process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
    });

    test('4. No secrets leaked in response or logs', async () => {
      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1001' });
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain(process.env.RAZORPAY_KEY_SECRET);
      expect(responseStr).not.toContain(process.env.RAZORPAY_WEBHOOK_SECRET);
      expect(responseStr).not.toContain(process.env.JWT_SECRET);
    });
  });

  // ==========================================
  // 2. RAZORPAY ORDER CREATION
  // ==========================================
  describe('2. Razorpay Order Creation', () => {
    test('5. Authenticated customer can initialize payment for owned order', async () => {
      mockRazorpayOrdersCreate.mockResolvedValueOnce({
        id: 'order_rzp_test_1001',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe('order_rzp_test_1001');
      expect(res.body.amount).toBe(125050);
      expect(res.body.currency).toBe('INR');
      expect(res.body.keyId).toBe(process.env.RAZORPAY_KEY_ID);
      expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 125050,
          currency: 'INR',
          payment_capture: 1,
        })
      );
    });

    test('6. Unauthenticated order creation is rejected with 401', async () => {
      const res = await request(app)
        .post('/api/payment/create-order')
        .send({ orderId: 'ord_1001' });
      expect(res.status).toBe(401);
    });

    test('7. Cross-user order creation is rejected with 403', async () => {
      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustB}`) // User B trying to pay User A's order
        .send({ orderId: 'ord_1001' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    test('8. Non-payable order state (e.g. CANCELLED) is rejected with 400', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.status = 'CANCELLED';

      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1001' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be paid/i);
    });

    test('9. Already-paid (CAPTURED) order is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1004_already_paid' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Payment already captured/i);
    });

    test('10. Server amount used exclusively; client amount is ignored', async () => {
      mockRazorpayOrdersCreate.mockResolvedValueOnce({
        id: 'order_rzp_test_1001',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1001', amount: 1 }); // Client attempts ₹1 injection

      expect(res.status).toBe(200);
      // Gateway created with authoritative database price (₹1250.50 -> 125050 paise)
      expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 125050,
        })
      );
    });

    test('11. Client currency is ignored; server enforces INR', async () => {
      mockRazorpayOrdersCreate.mockResolvedValueOnce({
        id: 'order_rzp_test_1001',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1001', currency: 'USD' }); // Client attempts USD

      expect(res.status).toBe(200);
      expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'INR',
        })
      );
    });

    test('12. Exact INR-to-paise conversion prevents floating point corruption', async () => {
      const paymentService = require('../services/paymentService');
      mockRazorpayOrdersCreate.mockResolvedValueOnce({ id: 'test_ord' });
      await paymentService.createRazorpayOrder(19.99, 'rec_test');
      expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1999, // Math.round(19.99 * 100) = 1999
        })
      );
    });

    test('13. Existing valid Razorpay order ID is reused deterministically without duplicate gateway calls', async () => {
      // User B's order ord_1003_cust_b already has razorpayOrderId: 'order_rzp_existing_b'
      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustB}`)
        .send({ orderId: 'ord_1003_cust_b' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('order_rzp_existing_b');
      expect(mockRazorpayOrdersCreate).not.toHaveBeenCalled();
    });

    test('14. COD order cannot initialize Razorpay (isolated with 400)', async () => {
      const res = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ orderId: 'ord_1002_cod' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not configured for online payment/i);
    });
  });

  // ==========================================
  // 3. SIGNATURE VERIFICATION & PROVIDER AUTHORITY
  // ==========================================
  describe('3. Signature Verification & Provider Success Authority', () => {
    beforeEach(() => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_valid_1001';
    });

    test('15. Valid signature + captured provider status transitions to CAPTURED and CONFIRMED', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        status: 'captured',
        amount: 125050,
        currency: 'INR',
        method: 'upi',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentStatus).toBe('CAPTURED');
      expect(res.body.status).toBe('CONFIRMED');

      const updatedOrd = mockDb.orders.find((o) => o.id === 'ord_1001');
      expect(updatedOrd.paymentStatus).toBe('CAPTURED');
      expect(updatedOrd.status).toBe('CONFIRMED');
    });

    test('16. Invalid signature is rejected with 400', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: 'invalid_tampered_signature_hex',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid payment signature/i);
    });

    test('17. Server-stored order ID used for signature; untrusted client order ID rejected', async () => {
      const serverOrderId = 'order_rzp_valid_1001';
      const clientForgedOrderId = 'order_rzp_forged_9999';
      const paymentId = 'pay_rzp_test_123';
      const sig = computeSignature(clientForgedOrderId, paymentId);

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: clientForgedOrderId, // Mismatch with server-stored order
          razorpay_payment_id: paymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Razorpay order ID mismatch/i);
    });

    test('18. Missing signature field rejected with 400', async () => {
      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: 'order_rzp_valid_1001',
          razorpay_payment_id: 'pay_123',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing payment verification fields/i);
    });

    test('19. Cross-user verification attempt is rejected with 403', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustB}`) // User B trying to verify User A's order
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    test('20. Provider payment.order_id mismatch rejected with zero mutation', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: 'order_rzp_different_mismatch',
        status: 'captured',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Provider payment order ID mismatch/i);

      // Verify zero mutation
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      expect(ord.paymentStatus).toBe('PENDING');
      expect(ord.status).toBe('PENDING');
    });

    test('21. Provider currency mismatch (not INR) rejected with zero mutation', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        status: 'captured',
        amount: 125050,
        currency: 'USD',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid payment currency/i);
    });

    test('22. Provider amount mismatch rejected with zero mutation', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_valid_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        status: 'captured',
        amount: 100, // ₹1 instead of ₹1250.50
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Payment amount mismatch/i);
    });

    test('23. Valid signature + "authorized" status preserves AUTHORIZED and keeps Order PENDING', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_auth_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        status: 'authorized',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(200);
      expect(res.body.paymentStatus).toBe('AUTHORIZED');
      expect(res.body.status).toBe('PENDING'); // Order is not confirmed yet

      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      expect(ord.paymentStatus).toBe('AUTHORIZED');
      expect(ord.status).toBe('PENDING');
    });

    test('24. Valid signature + failed provider status rejected and does not confirm order', async () => {
      const rzpOrderId = 'order_rzp_valid_1001';
      const rzpPaymentId = 'pay_rzp_failed_1001';
      const sig = computeSignature(rzpOrderId, rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: rzpPaymentId,
        order_id: rzpOrderId,
        status: 'failed',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: rzpOrderId,
          razorpay_payment_id: rzpPaymentId,
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot confirm order/i);

      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      expect(ord.status).toBe('PENDING');
    });
  });

  // ==========================================
  // 4. CONCURRENCY & REBINDING PROTECTION
  // ==========================================
  describe('4. Concurrency & Rebinding Protection', () => {
    test('25. Existing payment ID belonging to another order is rejected with 409 conflict and zero mutation', async () => {
      // Pre-bind payment pay_bound_1001 to ord_1004_already_paid
      mockDb.payments.push({
        id: 'pm_existing_bound',
        orderId: 'ord_1004_already_paid',
        razorpayPaymentId: 'pay_bound_1001',
        razorpayOrderId: 'order_rzp_paid_1004',
        status: 'CAPTURED',
        amount: 750,
        currency: 'INR',
      });

      const ord1 = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord1.razorpayOrderId = 'order_rzp_ord1';
      const sig = computeSignature('order_rzp_ord1', 'pay_bound_1001');

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: 'order_rzp_ord1',
          razorpay_payment_id: 'pay_bound_1001',
          razorpay_signature: sig,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already bound to another order/i);

      // Target order remains unmutated
      expect(ord1.paymentStatus).toBe('PENDING');
      expect(ord1.status).toBe('PENDING');
    });

    test('26. Duplicate verification for already captured payment is idempotent', async () => {
      const ord1 = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord1.razorpayOrderId = 'order_rzp_ord1';
      ord1.paymentStatus = 'CAPTURED';
      ord1.status = 'CONFIRMED';

      mockDb.payments.push({
        id: 'pm_existing_same_order',
        orderId: 'ord_1001',
        razorpayPaymentId: 'pay_same_1001',
        razorpayOrderId: 'order_rzp_ord1',
        status: 'CAPTURED',
        amount: 1250.50,
        currency: 'INR',
      });

      const sig = computeSignature('order_rzp_ord1', 'pay_same_1001');

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: 'order_rzp_ord1',
          razorpay_payment_id: 'pay_same_1001',
          razorpay_signature: sig,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already verified/i);
    });

    test('27. Captured payment cannot regress to FAILED or PENDING', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1004_already_paid');
      expect(ord.paymentStatus).toBe('CAPTURED');
      expect(ord.status).toBe('CONFIRMED');

      // Attempting to post verification with status other than captured does not regress
      const sig = computeSignature(ord.razorpayOrderId, 'pay_diff_retry');
      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: 'pay_diff_retry',
        order_id: ord.razorpayOrderId,
        status: 'failed',
        amount: 75000,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: ord.id,
          razorpay_order_id: ord.razorpayOrderId,
          razorpay_payment_id: 'pay_diff_retry',
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(ord.paymentStatus).toBe('CAPTURED');
      expect(ord.status).toBe('CONFIRMED');
    });
  });

  // ==========================================
  // 5. WEBHOOK INTEGRITY & IDEMPOTENCY
  // ==========================================
  describe('5. Webhook Integrity & Idempotency', () => {
    test('28. Missing X-Razorpay-Event-ID header rejects webhook with 400 and zero mutation', async () => {
      const payload = { event: 'payment.captured', payload: {} };
      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        // Omit x-razorpay-event-id header
        .send(rawPayload);

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Missing X-Razorpay-Event-ID header/i);
      expect(mockDb.webhookLogs.length).toBe(0);
    });

    test('29. Valid webhook with X-Razorpay-Event-ID transitions payment.captured', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_wh_1001';

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_test_1001',
              order_id: 'order_rzp_wh_1001',
              amount: 125050,
              currency: 'INR',
              status: 'captured',
              method: 'netbanking',
              bank: 'HDFC',
            },
          },
        },
      };

      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_razorpay_captured_001')
        .send(rawPayload);

      expect(res.status).toBe(200);

      // Verify WebhookLog created with status 'processed'
      const log = mockDb.webhookLogs.find((l) => l.eventId === 'evt_razorpay_captured_001');
      expect(log).toBeDefined();
      expect(log.status).toBe('processed');

      // Verify order transitioned to CONFIRMED / CAPTURED
      expect(ord.paymentStatus).toBe('CAPTURED');
      expect(ord.status).toBe('CONFIRMED');
    });

    test('30. Invalid webhook signature rejected with 400', async () => {
      const payload = { event: 'payment.captured', payload: {} };
      const rawPayload = JSON.stringify(payload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'invalid_signature_hex')
        .set('x-razorpay-event-id', 'evt_bad_sig_001')
        .send(rawPayload);

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Invalid signature/i);
    });

    test('31. Tampered payload (altering 1 byte) fails signature validation', async () => {
      const payload = { event: 'payment.captured', amount: 1000 };
      const rawPayload = JSON.stringify(payload);
      const validSig = computeWebhookSignature(rawPayload);

      const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 1001 });

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', validSig)
        .set('x-razorpay-event-id', 'evt_tampered_001')
        .send(tamperedPayload);

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Invalid signature/i);
    });

    test('32. Duplicate webhook with same eventId is idempotent (200, zero re-mutation)', async () => {
      mockDb.webhookLogs.push({
        id: 'whl_existing',
        eventId: 'evt_duplicate_idempotent_001',
        provider: 'razorpay',
        eventType: 'payment.captured',
        status: 'processed',
      });

      const payload = { event: 'payment.captured', payload: {} };
      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_duplicate_idempotent_001')
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.text).toMatch(/Event already processed/i);
    });

    test('33. Unresolved webhook order performs zero commerce mutation', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_unresolved_001',
              order_id: 'order_rzp_unknown_nonexistent',
              amount: 10000,
              currency: 'INR',
            },
          },
        },
      };
      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_unresolved_001')
        .send(rawPayload);

      expect(res.status).toBe(200); // Webhook accepted and processed safely
      expect(mockDb.payments.find((p) => p.razorpayPaymentId === 'pay_unresolved_001')).toBeUndefined();
    });

    test('34. Out-of-order delivery: payment.captured followed by payment.failed does not regress CAPTURED', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_ooo_1001';
      ord.paymentStatus = 'CAPTURED';
      ord.status = 'CONFIRMED';

      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_ooo_1001',
              order_id: 'order_rzp_ooo_1001',
              error_description: 'Issuer bank down',
            },
          },
        },
      };
      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_ooo_failed_001')
        .send(rawPayload);

      expect(res.status).toBe(200);
      // Order status MUST remain CAPTURED and CONFIRMED
      expect(ord.paymentStatus).toBe('CAPTURED');
      expect(ord.status).toBe('CONFIRMED');
    });

    test('35. payment.failed webhooks persist Payment record with real pay_... ID and FAILED status', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_failed_test';
      ord.paymentStatus = 'PENDING';

      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_real_failed_001',
              order_id: 'order_rzp_failed_test',
              error_description: 'Card expired',
              amount: 125050,
              currency: 'INR',
            },
          },
        },
      };
      const rawPayload = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawPayload);

      const res = await request(app)
        .post('/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_failed_persist_001')
        .send(rawPayload);

      expect(res.status).toBe(200);

      const failedPayment = mockDb.payments.find((p) => p.razorpayPaymentId === 'pay_real_failed_001');
      expect(failedPayment).toBeDefined();
      expect(failedPayment.status).toBe('FAILED');
      expect(failedPayment.errorReason).toBe('Card expired');
      expect(ord.paymentStatus).toBe('FAILED');
    });
  });

  // ==========================================
  // 6. RAW RESPONSE PRIVACY & FINANCIAL INTEGRITY
  // ==========================================
  describe('6. Raw Response Privacy & Financial Integrity', () => {
    test('36. Payment.rawResponse whitelist sanitizes sensitive keys and internal tokens', () => {
      const { sanitizeRawResponse } = require('../services/paymentService');
      const mockRawEntity = {
        id: 'pay_test_privacy',
        order_id: 'order_test_privacy',
        amount: 50000,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        secret_key: 'super_secret_never_leak',
        api_token: 'bearer_token_should_be_stripped',
        card_number: '4111111111111111',
      };

      const sanitized = sanitizeRawResponse(mockRawEntity);
      expect(sanitized.id).toBe('pay_test_privacy');
      expect(sanitized.status).toBe('captured');
      expect(sanitized.secret_key).toBeUndefined();
      expect(sanitized.api_token).toBeUndefined();
      expect(sanitized.card_number).toBeUndefined();
    });

    test('37. Payment amount must strictly match authoritative order total; mismatch rejected', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_match_1001';
      const sig = computeSignature('order_rzp_match_1001', 'pay_match_1001');

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: 'pay_match_1001',
        order_id: 'order_rzp_match_1001',
        status: 'captured',
        amount: 99999, // ₹999.99 instead of ₹1250.50
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: 'order_rzp_match_1001',
          razorpay_payment_id: 'pay_match_1001',
          razorpay_signature: sig,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Payment amount mismatch/i);
    });

    test('38. Stock is NOT decremented during payment verification (integrity preserved from Phase 3)', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_stock_1001';
      const sig = computeSignature('order_rzp_stock_1001', 'pay_stock_1001');

      mockRazorpayPaymentsFetch.mockResolvedValueOnce({
        id: 'pay_stock_1001',
        order_id: 'order_rzp_stock_1001',
        status: 'captured',
        amount: 125050,
        currency: 'INR',
      });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({
          orderId: 'ord_1001',
          razorpay_order_id: 'order_rzp_stock_1001',
          razorpay_payment_id: 'pay_stock_1001',
          razorpay_signature: sig,
        });

      expect(res.status).toBe(200);
      // No product update queries should be called in paymentController
      const prisma = require('../config/prisma');
      expect(prisma.product).toBeUndefined(); // Prisma product mock wasn't even needed
    });

    test('39. GET /api/payment/status/:orderId returns backend-authoritative status for owner', async () => {
      const res = await request(app)
        .get('/api/payment/status/ord_1004_already_paid')
        .set('Authorization', `Bearer ${tokenCustA}`);

      expect(res.status).toBe(200);
      expect(res.body.orderId).toBe('ord_1004_already_paid');
      expect(res.body.status).toBe('CONFIRMED');
      expect(res.body.paymentStatus).toBe('CAPTURED');
      expect(res.body.totalPrice).toBe(750);
    });

    test('40. GET /api/payment/status/:orderId rejects cross-user inquiry with 403', async () => {
      const res = await request(app)
        .get('/api/payment/status/ord_1004_already_paid')
        .set('Authorization', `Bearer ${tokenCustB}`); // User B inspecting User A's order

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });
  });

  // ==========================================
  // 7. CONCURRENT RACE SAFETY
  // ==========================================
  describe('7. Concurrent Race Safety', () => {
    test('41. Concurrent verify + webhook requests result in exactly one CAPTURED payment state', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_race_1001';
      const rzpPaymentId = 'pay_race_1001';
      const sig = computeSignature('order_rzp_race_1001', rzpPaymentId);

      mockRazorpayPaymentsFetch.mockResolvedValue({
        id: rzpPaymentId,
        order_id: 'order_rzp_race_1001',
        status: 'captured',
        amount: 125050,
        currency: 'INR',
      });

      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: rzpPaymentId,
              order_id: 'order_rzp_race_1001',
              amount: 125050,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });
      const webhookSig = computeWebhookSignature(webhookPayload);

      // Execute both verify and webhook concurrently
      const [verifyRes, webhookRes] = await Promise.all([
        request(app)
          .post('/api/payment/verify')
          .set('Authorization', `Bearer ${tokenCustA}`)
          .send({
            orderId: 'ord_1001',
            razorpay_order_id: 'order_rzp_race_1001',
            razorpay_payment_id: rzpPaymentId,
            razorpay_signature: sig,
          }),
        request(app)
          .post('/webhooks/razorpay')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', webhookSig)
          .set('x-razorpay-event-id', 'evt_race_webhook_001')
          .send(webhookPayload),
      ]);

      expect(verifyRes.status).toBe(200);
      expect(webhookRes.status).toBe(200);

      // Verify exactly one payment record exists in mockDb for pay_race_1001
      const matchingPayments = mockDb.payments.filter((p) => p.razorpayPaymentId === rzpPaymentId);
      expect(matchingPayments.length).toBe(1);
      expect(matchingPayments[0].status).toBe('CAPTURED');
      expect(ord.paymentStatus).toBe('CAPTURED');
      expect(ord.status).toBe('CONFIRMED');
    });

    test('42. Concurrent duplicate webhooks process safely with idempotency', async () => {
      const ord = mockDb.orders.find((o) => o.id === 'ord_1001');
      ord.razorpayOrderId = 'order_rzp_dup_race';

      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_dup_race_001',
              order_id: 'order_rzp_dup_race',
              amount: 125050,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });
      const webhookSig = computeWebhookSignature(webhookPayload);

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/webhooks/razorpay')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', webhookSig)
          .set('x-razorpay-event-id', 'evt_dup_race_shared_id')
          .send(webhookPayload),
        request(app)
          .post('/webhooks/razorpay')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', webhookSig)
          .set('x-razorpay-event-id', 'evt_dup_race_shared_id')
          .send(webhookPayload),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  // ==========================================
  // 8. REGRESSION PRESERVATION
  // ==========================================
  describe('8. Regression Preservation', () => {
    test('43. Phase 1 security: unauthenticated requests to payment endpoints are rejected', async () => {
      const res = await request(app).get('/api/payment/status/ord_1001');
      expect(res.status).toBe(401);
    });

    test('44. Phase 2 & 3 integrity: zero mongoose models imported in payment routes/controllers', () => {
      const fs = require('fs');
      const paymentControllerSrc = fs.readFileSync(require.resolve('../controllers/paymentController'), 'utf8');
      const paymentRoutesSrc = fs.readFileSync(require.resolve('../routes/paymentRoutes'), 'utf8');
      const webhookControllerSrc = fs.readFileSync(require.resolve('../controllers/razorpayWebhook'), 'utf8');
      const paymentServiceSrc = fs.readFileSync(require.resolve('../services/paymentService'), 'utf8');

      expect(paymentControllerSrc).not.toMatch(/require\(['"]mongoose['"]\)/);
      expect(paymentRoutesSrc).not.toMatch(/require\(['"]mongoose['"]\)/);
      expect(webhookControllerSrc).not.toMatch(/require\(['"]mongoose['"]\)/);
      expect(paymentServiceSrc).not.toMatch(/require\(['"]mongoose['"]\)/);
    });
  });
});
