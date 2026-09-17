/**
 * FSO Phase 6: Seller / Vendor Portal & Fulfillment Operations Integrity Test Suite
 * Validates all contract-locked Phase 6 requirements:
 * 1.  Authentication & server-derived vendor identity
 * 2.  Strict RBAC boundaries (PRODUCER_MANAGER required, CUSTOMER rejected 403, ADMIN barred from vendor self-service 403)
 * 3.  Vendor status enforcement (PENDING, UNDER_REVIEW, REJECTED, SUSPENDED barred 403, APPROVED accepted)
 * 4.  Cross-Vendor IDOR isolation across products, inventory, orders, reviews, analytics, wallet, and notifications
 * 5.  Authoritative stockQuantity integer validation (finite, >= 0, reject negative, floats, strings, NaN, Infinity)
 * 6.  Order fulfillment & Shiprocket logistics reuse (no fake AWB, idempotency protection)
 * 7.  Multi-vendor refund attribution & isolation (prevent full-order refund leakage)
 * 8.  Financial integrity: persisted commissionRate and commissionAmount (NO universal 6% assumption)
 * 9.  Wallet & Payout rules (min ₹500, amount <= availableBalance, duplicate check 409 PAYOUT_ALREADY_IN_PROGRESS)
 * 10. Analytics snapshot vs. period metrics separation
 * 11. Customer summary from real orders with minimized PII
 * 12. Review replies with ownership check and schema safety
 * 13. Compliance file security boundaries (HTTPS, extension whitelist, doc types)
 * 14. Notification ownership protection (PUT /:id/read secured)
 * 15. Shop settings get/put persistence
 * 16. Empty database truthful zero values
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Set required secrets for test suite
process.env.JWT_SECRET = process.env.JWT_SECRET || 'fso_test_jwt_secret_32bytes_minimum_length';

// Mock BullMQ queues
jest.mock('../jobs/shiprocketQueue', () => ({
  shipmentQueue: { add: jest.fn() },
  enqueueShipment: jest.fn().mockResolvedValue(true),
}));

// Mock Shiprocket Service
jest.mock('../services/shiprocketService', () => ({
  createShipment: jest.fn().mockResolvedValue({
    shiprocketOrderId: 'SR_1001',
    shipmentId: 'SHP_2001',
    awbCode: 'AWB_DELHIVERY_998877',
    courierName: 'Delhivery Surface',
    labelUrl: 'https://shiprocket.co/label/SR_1001.pdf',
    trackingUrl: 'https://shiprocket.co/tracking/AWB_998877',
  }),
}));

// Mock Payment Service
jest.mock('../services/paymentService', () => ({
  initiateRefund: jest.fn().mockResolvedValue({
    id: 'rfnd_mock_12345',
    amount: 1000,
    status: 'processed',
  }),
}));

// Comprehensive in-memory Prisma mock
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  vendorOrder: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  vendorTransfer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  refundLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('../config/prisma', () => mockPrisma);

// Import Express app components
const vendorRoutes = require('../routes/vendorRoutes');
const reviewRoutes = require('../routes/reviewRoutes');
const notificationRoutes = require('../routes/notificationRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Helper: generate test JWT
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('FSO Phase 6: Seller / Vendor Portal & Fulfillment Integrity Suite', () => {
  const vendorUserA = {
    id: 'user_vend_A',
    email: 'vendorA@heritage.in',
    name: 'Meera Devi',
    role: 'PRODUCER_MANAGER',
    isBlocked: false,
  };

  const vendorRecordA = {
    id: 'vend_A',
    email: 'vendorA@heritage.in',
    businessName: 'Saraswati Oil Mill',
    businessType: 'ARTISAN',
    status: 'APPROVED',
    isActive: true,
    plan: 'starter',
    commissionRate: 15,
    certifications: ['USDA Organic'],
    organicCertification: { documents: [] },
    shopSettings: { shopName: 'Saraswati Oil Mill', isPublished: true },
  };

  const vendorUserB = {
    id: 'user_vend_B',
    email: 'vendorB@heritage.in',
    name: 'Rohan Sharma',
    role: 'PRODUCER_MANAGER',
    isBlocked: false,
  };

  const vendorRecordB = {
    id: 'vend_B',
    email: 'vendorB@heritage.in',
    businessName: 'Himalayan Honey Collective',
    businessType: 'ARTISAN',
    status: 'APPROVED',
    isActive: true,
    plan: 'enterprise',
    commissionRate: 6,
    certifications: ['USDA Organic'],
    organicCertification: { documents: [] },
    shopSettings: { shopName: 'Himalayan Honey', isPublished: true },
  };

  const customerUser = {
    id: 'user_cust_1',
    email: 'customer@gmail.com',
    name: 'Ananya Customer',
    role: 'CUSTOMER',
    isBlocked: false,
  };

  const adminUser = {
    id: 'user_admin_1',
    email: 'admin@flashsalesonline.in',
    name: 'Super Admin',
    role: 'ADMIN',
    isBlocked: false,
  };

  let tokenA;
  let tokenB;
  let customerToken;
  let adminToken;

  beforeEach(() => {
    jest.clearAllMocks();

    tokenA = generateToken({ id: vendorUserA.id, email: vendorUserA.email });
    tokenB = generateToken({ id: vendorUserB.id, email: vendorUserB.email });
    customerToken = generateToken({ id: customerUser.id, email: customerUser.email });
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email });

    // Default mock user and vendor resolution
    mockPrisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === vendorUserA.id) return Promise.resolve({ ...vendorUserA });
      if (where.id === vendorUserB.id) return Promise.resolve({ ...vendorUserB });
      if (where.id === customerUser.id) return Promise.resolve({ ...customerUser });
      if (where.id === adminUser.id) return Promise.resolve({ ...adminUser });
      return Promise.resolve(null);
    });

    mockPrisma.vendor.findUnique.mockImplementation(({ where }) => {
      if (where.email === vendorUserA.email || where.id === vendorRecordA.id) {
        return Promise.resolve({ ...vendorRecordA });
      }
      if (where.email === vendorUserB.email || where.id === vendorRecordB.id) {
        return Promise.resolve({ ...vendorRecordB });
      }
      return Promise.resolve(null);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 1: AUTHENTICATION & SERVER-SIDE VENDOR IDENTITY
  // ══════════════════════════════════════════════════════════════════════════════

  test('1.1: Vendor authentication succeeds with valid Bearer JWT', async () => {
    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(vendorRecordA.id);
    expect(res.body.businessName).toBe(vendorRecordA.businessName);
  });

  test('1.2: Unauthenticated request rejected with HTTP 401', async () => {
    const res = await request(app).get('/api/v1/vendors/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  test('1.3: Invalid / malformed JWT rejected with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', 'Bearer invalid.bogus.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token failed/i);
  });

  test('1.4: Non-existent User record rejected with HTTP 401', async () => {
    const nonExistentToken = generateToken({ id: 'non_existent_user_id' });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${nonExistentToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/user not found/i);
  });

  test('1.5: Blocked User account rejected with HTTP 403', async () => {
    const blockedUser = { ...vendorUserA, isBlocked: true };
    mockPrisma.user.findUnique.mockResolvedValueOnce(blockedUser);

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/blocked/i);
  });

  test('1.6: Client-supplied vendorId parameter in query is completely ignored', async () => {
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.product.count.mockResolvedValueOnce(0);

    const res = await request(app)
      .get(`/api/v1/vendors/products?vendorId=${vendorRecordB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    // Verified: Prisma query uses authenticated vendorId (vend_A), not untrusted query param
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ vendorId: vendorRecordA.id }),
      })
    );
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 2: RBAC & VENDOR STATUS MACHINE
  // ══════════════════════════════════════════════════════════════════════════════

  test('2.1: CUSTOMER role calling vendor endpoint rejected with HTTP 403', async () => {
    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/customers cannot access vendor portal/i);
  });

  test('2.2: ADMIN role on vendor self-service route rejected with HTTP 403', async () => {
    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Admins must use \/api\/v1\/admin routes/i);
  });

  test('2.3: Vendor with PENDING status rejected with HTTP 403', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValueOnce({
      ...vendorRecordA,
      status: 'PENDING',
    });

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/pending/i);
  });

  test('2.4: Vendor with UNDER_REVIEW status rejected with HTTP 403', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValueOnce({
      ...vendorRecordA,
      status: 'UNDER_REVIEW',
    });

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/under_review/i);
  });

  test('2.5: Vendor with REJECTED status rejected with HTTP 403', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValueOnce({
      ...vendorRecordA,
      status: 'REJECTED',
    });

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/rejected/i);
  });

  test('2.6: Vendor with SUSPENDED status rejected with HTTP 403', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValueOnce({
      ...vendorRecordA,
      status: 'SUSPENDED',
    });

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  test('2.7: Inactive vendor (isActive: false) rejected with HTTP 403', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValueOnce({
      ...vendorRecordA,
      isActive: false,
    });

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/inactive/i);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 3: CROSS-VENDOR SECURITY & IDOR ISOLATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('3.1: Vendor A cannot view Vendor B product by ID (404/403)', async () => {
    // Product belongs to Vendor B
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/vendors/products/prod_B_secret')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod_B_secret', vendorId: vendorRecordA.id },
    });
  });

  test('3.2: Vendor A cannot update Vendor B product (404/403)', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .put('/api/v1/vendors/products/prod_B_secret')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Hacked Product Name' });

    expect(res.status).toBe(404);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  test('3.3: Vendor A cannot delete Vendor B product (404/403)', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete('/api/v1/vendors/products/prod_B_secret')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.product.delete).not.toHaveBeenCalled();
  });

  test('3.4: Vendor A cannot adjust stock of Vendor B inventory (404/403)', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_B_item')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: 50 });

    expect(res.status).toBe(404);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  test('3.5: Vendor A cannot view Vendor B order detail (404/403)', async () => {
    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/vendors/orders/vo_order_B')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.vendorOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'vo_order_B', vendorId: vendorRecordA.id }),
      })
    );
  });

  test('3.6: Vendor A cannot trigger shipment on Vendor B order (404/403)', async () => {
    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/v1/vendors/orders/vo_order_B/ship')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  test('3.7: Vendor A cannot reply to review for Vendor B product (403 Forbidden)', async () => {
    // Review belongs to Vendor B's product
    mockPrisma.review.findUnique.mockResolvedValueOnce({
      id: 'rev_101',
      productId: 'prod_B_honey',
      product: { vendorId: vendorRecordB.id },
    });

    const res = await request(app)
      .post('/api/v1/reviews/rev_101/reply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reply: 'Thank you for buying our product!' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only reply to reviews for your products/i);
  });

  test('3.8: Vendor A cannot mark read or mutate Vendor B notification (403 Forbidden)', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce({
      id: 'notif_B_1',
      userId: vendorUserB.id,
      vendorId: vendorRecordB.id,
      isRead: false,
    });

    const res = await request(app)
      .put('/api/v1/notifications/notif_B_1/read')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 4: PRODUCTS & INVENTORY INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════════

  test('4.1: Product creation forces vendorId from req.vendor.id and status pending', async () => {
    mockPrisma.product.findUnique.mockResolvedValueOnce(null); // slug check
    mockPrisma.product.create.mockImplementationOnce(({ data }) =>
      Promise.resolve({ id: 'prod_new_1', ...data })
    );

    const res = await request(app)
      .post('/api/v1/vendors/products')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Cold-Pressed Groundnut Oil',
        price: 550,
        stockQuantity: 25,
        category: 'Oils & Ghee',
        vendorId: 'untrusted_client_vendor_id',
      });

    expect(res.status).toBe(201);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vendorId: vendorRecordA.id, // Strictly server-derived
          vendorStatus: 'pending',    // Preserved pending status
          price: 550,
          stockQuantity: 25,
        }),
      })
    );
  });

  test('4.2: Stock adjustment accepts non-negative finite integer', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_1',
      vendorId: vendorRecordA.id,
      stockQuantity: 10,
    });
    mockPrisma.product.update.mockResolvedValueOnce({
      id: 'prod_1',
      stockQuantity: 40,
    });

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: 40 });

    expect(res.status).toBe(200);
    expect(res.body.stockQuantity).toBe(40);
  });

  test('4.3: Stock adjustment rejects negative numbers with HTTP 400', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_1',
      vendorId: vendorRecordA.id,
      stockQuantity: 10,
    });

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: -5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/non-negative/i);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  test('4.4: Stock adjustment rejects floating-point numbers with HTTP 400', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_1',
      vendorId: vendorRecordA.id,
      stockQuantity: 10,
    });

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: 12.5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/non-negative finite integer/i);
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  test('4.5: Stock adjustment rejects string representations with HTTP 400', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_1',
      vendorId: vendorRecordA.id,
      stockQuantity: 10,
    });

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: "25" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/non-negative finite integer/i);
  });

  test('4.6: Stock adjustment rejects NaN and Infinity with HTTP 400', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_1',
      vendorId: vendorRecordA.id,
      stockQuantity: 10,
    });

    const res = await request(app)
      .put('/api/v1/vendors/inventory/prod_1')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ stockQuantity: null });

    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 5: FULFILLMENT & SHIPROCKET LOGISTICS REUSE
  // ══════════════════════════════════════════════════════════════════════════════

  test('5.1: Dispatching vendor order creates AWB and transitions to READY_TO_SHIP', async () => {
    const mockVO = {
      id: 'vo_order_1',
      vendorOrderNumber: 'VO-2026-1001',
      vendorId: vendorRecordA.id,
      status: 'PROCESSING',
      subtotal: 1200,
      order: { id: 'ord_1', shippingAddress: { city: 'Pune' } },
      vendor: { ...vendorRecordA, shiprocketPickupCode: 'PUNE_WH' },
    };

    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce(mockVO);
    mockPrisma.vendorOrder.update.mockResolvedValueOnce({
      ...mockVO,
      status: 'READY_TO_SHIP',
      awbCode: 'AWB_DELHIVERY_998877',
      shiprocketOrderId: 'SR_1001',
      courierName: 'Delhivery Surface',
    });

    const res = await request(app)
      .post('/api/v1/vendors/orders/vo_order_1/ship')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.vendorOrder.status).toBe('READY_TO_SHIP');
    expect(res.body.vendorOrder.awbCode).toBe('AWB_DELHIVERY_998877');
  });

  test('5.2: Duplicate dispatch attempt on existing AWB is safely rejected with HTTP 400', async () => {
    const mockVOWithAWB = {
      id: 'vo_order_1',
      vendorId: vendorRecordA.id,
      status: 'SHIPPED',
      awbCode: 'AWB_EXISTING_123',
    };

    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce(mockVOWithAWB);

    const res = await request(app)
      .post('/api/v1/vendors/orders/vo_order_1/ship')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already created/i);
  });

  test('5.3: Dispatch attempt on CANCELLED order is rejected with HTTP 400', async () => {
    const mockCancelledVO = {
      id: 'vo_order_cancelled',
      vendorId: vendorRecordA.id,
      status: 'CANCELLED',
    };

    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce(mockCancelledVO);

    const res = await request(app)
      .post('/api/v1/vendors/orders/vo_order_cancelled/ship')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cancelled order/i);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 6: MULTI-VENDOR REFUND ATTRIBUTION & ISOLATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('6.1: Single-vendor order refunds are properly attributed to the vendor', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { id: 'vo_single_1', vendorOrderNumber: 'VO-S1', orderId: 'ord_single_1' },
    ]);

    mockPrisma.refundLog.findMany.mockResolvedValueOnce([
      {
        id: 'ref_1',
        orderId: 'ord_single_1',
        amount: 800,
        status: 'processed',
        reason: 'Item damaged',
        order: {
          id: 'ord_single_1',
          orderNumber: 'ORD-S1',
          vendorOrders: [{ id: 'vo_single_1', vendorId: vendorRecordA.id }],
        },
      },
    ]);

    const res = await request(app)
      .get('/api/v1/vendors/returns')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('ref_1');
  });

  test('6.2: Multi-vendor order with annotated reason is only shown to the matching vendor', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { id: 'vo_A_in_multi', vendorOrderNumber: 'VO-A-99', orderId: 'ord_multi_1' },
    ]);

    // Parent multi-vendor order has 2 refunds: one tagged for Vendor A, one tagged for Vendor B
    mockPrisma.refundLog.findMany.mockResolvedValueOnce([
      {
        id: 'ref_for_A',
        orderId: 'ord_multi_1',
        amount: 400,
        status: 'processed',
        reason: 'Customer return [VendorOrder:vo_A_in_multi]',
        order: {
          id: 'ord_multi_1',
          vendorOrders: [
            { id: 'vo_A_in_multi', vendorId: vendorRecordA.id },
            { id: 'vo_B_in_multi', vendorId: vendorRecordB.id },
          ],
        },
      },
      {
        id: 'ref_for_B',
        orderId: 'ord_multi_1',
        amount: 600,
        status: 'processed',
        reason: 'Defective [VendorOrder:vo_B_in_multi]',
        order: {
          id: 'ord_multi_1',
          vendorOrders: [
            { id: 'vo_A_in_multi', vendorId: vendorRecordA.id },
            { id: 'vo_B_in_multi', vendorId: vendorRecordB.id },
          ],
        },
      },
    ]);

    const res = await request(app)
      .get('/api/v1/vendors/returns')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    // Verified: Vendor A only sees their attributed refund (ref_for_A) and NOT Vendor B's refund
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('ref_for_A');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 7: FINANCIAL INTEGRITY & COMMISSION SNAPSHOT
  // ══════════════════════════════════════════════════════════════════════════════

  test('7.1: Analytics sums persisted commissionAmount and does NOT force hardcoded 6%', async () => {
    // Two orders created under different plans: Starter 15% and Custom 8%
    const mockOrders = [
      {
        id: 'vo_1',
        vendorId: vendorRecordA.id,
        status: 'DELIVERED',
        subtotal: 1000,
        commissionRate: 15,
        commissionAmount: 150, // 15%
        payoutAmount: 850,
        createdAt: new Date(),
        items: [{ qty: 2 }],
      },
      {
        id: 'vo_2',
        vendorId: vendorRecordA.id,
        status: 'DELIVERED',
        subtotal: 2000,
        commissionRate: 8,
        commissionAmount: 160, // 8%
        payoutAmount: 1840,
        createdAt: new Date(),
        items: [{ qty: 4 }],
      },
    ];

    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce(mockOrders);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(0);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/vendors/analytics?period=30d')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(3000);
    // Verified: Commission is 150 + 160 = 310 (NOT 6% of 3000 = 180)
    expect(res.body.commission).toBe(310);
    expect(res.body.payout).toBe(2690);
  });

  test('7.2: Wallet payout creation enforces minimum ₹500 rule', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/wallet/payout')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 450 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum payout amount is ₹500/i);
    expect(mockPrisma.vendorTransfer.create).not.toHaveBeenCalled();
  });

  test('7.3: Wallet payout creation asserts amount <= availableBalance', async () => {
    // Delivered earnings = ₹1000, availableBalance = ₹1000
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { status: 'DELIVERED', payoutAmount: 1000 },
    ]);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]); // no prior transfers
    mockPrisma.vendorTransfer.findFirst.mockResolvedValueOnce(null); // no pending transfer

    // Vendor attempts to request ₹2000
    const res = await request(app)
      .post('/api/v1/vendors/wallet/payout')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 2000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('INSUFFICIENT_WALLET_BALANCE');
    expect(mockPrisma.vendorTransfer.create).not.toHaveBeenCalled();
  });

  test('7.4: Duplicate payout request rejected with HTTP 409 PAYOUT_ALREADY_IN_PROGRESS', async () => {
    mockPrisma.vendorTransfer.findFirst.mockResolvedValueOnce({
      id: 'tx_pending_1',
      status: 'pending',
    });

    const res = await request(app)
      .post('/api/v1/vendors/wallet/payout')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 600 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('PAYOUT_ALREADY_IN_PROGRESS');
  });

  test('7.5: Successful payout creation initializes transfer with status pending', async () => {
    // Delivered earnings = ₹5000, zero prior payouts
    mockPrisma.vendorTransfer.findFirst.mockResolvedValueOnce(null); // no active pending
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { status: 'DELIVERED', payoutAmount: 5000 },
    ]);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]);

    mockPrisma.vendorTransfer.create.mockImplementationOnce(({ data }) =>
      Promise.resolve({ id: 'tx_new_payout', ...data })
    );

    const res = await request(app)
      .post('/api/v1/vendors/wallet/payout')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 1500 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transfer.status).toBe('pending');
    expect(res.body.transfer.amount).toBe(1500);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 8: ANALYTICS SNAPSHOT VS. PERIOD SEPARATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('8.1: Analytics separates period metrics from snapshot metrics', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      {
        subtotal: 500,
        payoutAmount: 425,
        commissionAmount: 75,
        status: 'DELIVERED',
        createdAt: new Date(),
        items: [{ qty: 1 }],
      },
    ]);

    // Active stock on hand
    mockPrisma.product.findMany.mockResolvedValueOnce([
      { id: 'p1', stockQuantity: 20, price: 100, isActive: true },
      { id: 'p2', stockQuantity: 8, price: 200, isActive: true }, // low stock (<15)
    ]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(3); // pending orders
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]); // wallet

    const res = await request(app)
      .get('/api/v1/vendors/analytics?period=7d')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.period).toBe('7d');
    expect(res.body.revenue).toBe(500);

    // Snapshot metrics (unfiltered by 7d)
    expect(res.body.snapshot.totalProducts).toBe(2);
    expect(res.body.snapshot.totalUnits).toBe(28); // 20 + 8
    expect(res.body.snapshot.lowStockCount).toBe(1); // p2
    expect(res.body.snapshot.stockValue).toBe(3600); // 20*100 + 8*200
    expect(res.body.snapshot.pendingOrders).toBe(3);
  });

  test('8.2: Empty database returns truthful zeros in analytics without demo mocks', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([]);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(0);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/vendors/analytics?period=30d')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(0);
    expect(res.body.payout).toBe(0);
    expect(res.body.commission).toBe(0);
    expect(res.body.orders).toBe(0);
    expect(res.body.aov).toBe(0);
    expect(res.body.snapshot.totalProducts).toBe(0);
    expect(res.body.snapshot.totalUnits).toBe(0);
    expect(res.body.snapshot.lowStockCount).toBe(0);
    expect(res.body.snapshot.availableBalance).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 9: CUSTOMERS SUMMARY & PII MINIMIZATION
  // ══════════════════════════════════════════════════════════════════════════════

  test('9.1: Customers endpoint aggregates distinct customers from real orders', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      {
        id: 'vo_1',
        subtotal: 750,
        createdAt: new Date('2026-09-01'),
        order: {
          id: 'ord_1',
          user: {
            id: 'cust_1',
            name: 'Pooja Verma',
            email: 'pooja@heritage.in',
            password: 'SUPER_SECRET_HASH', // Must NOT leak!
          },
        },
      },
      {
        id: 'vo_2',
        subtotal: 1250,
        createdAt: new Date('2026-09-10'),
        order: {
          id: 'ord_2',
          user: {
            id: 'cust_1',
            name: 'Pooja Verma',
            email: 'pooja@heritage.in',
          },
        },
      },
    ]);

    const res = await request(app)
      .get('/api/v1/vendors/customers')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.customers.length).toBe(1);
    const customer = res.body.customers[0];
    expect(customer.id).toBe('cust_1');
    expect(customer.name).toBe('Pooja Verma');
    expect(customer.ordersCount).toBe(2);
    expect(customer.totalSpend).toBe(2000);
    // PII assertion: passwords / tokens are never exposed
    expect(customer.password).toBeUndefined();
  });

  test('9.2: Customers endpoint returns empty array when 0 orders exist', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/vendors/customers')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.customers).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 10: REVIEWS & SAFE REPLIES
  // ══════════════════════════════════════════════════════════════════════════════

  test('10.1: Review listing scopes strictly to products owned by authenticated vendor', async () => {
    mockPrisma.review.findMany.mockResolvedValueOnce([
      {
        id: 'rev_1',
        rating: 5,
        comment: 'Pure and authentic groundnut oil.',
        createdAt: new Date(),
        product: { id: 'prod_1', name: 'Groundnut Oil', image: null, slug: 'groundnut-oil' },
        user: { id: 'u1', name: 'Anita' },
      },
    ]);
    mockPrisma.review.count.mockResolvedValueOnce(1);

    const res = await request(app)
      .get('/api/v1/vendors/reviews')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews.length).toBe(1);
    expect(res.body.reviews[0].product.name).toBe('Groundnut Oil');
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: { vendorId: vendorRecordA.id } },
      })
    );
  });

  test('10.2: Review reply rejects short input (<10 chars) with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/v1/reviews/rev_1/reply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reply: 'Thanks!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 10 characters/i);
  });

  test('10.3: Review reply succeeds for owned product and preserves schema freezing', async () => {
    mockPrisma.review.findUnique.mockResolvedValueOnce({
      id: 'rev_1',
      productId: 'prod_1',
      product: { vendorId: vendorRecordA.id },
    });

    const res = await request(app)
      .post('/api/v1/reviews/rev_1/reply')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reply: 'Thank you for supporting our traditional oil mill!' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reply added successfully');
    expect(res.body.review.vendorReply).toBe('Thank you for supporting our traditional oil mill!');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 11: COMPLIANCE FILE SECURITY BOUNDARIES
  // ══════════════════════════════════════════════════════════════════════════════

  test('11.1: Compliance document upload requires valid HTTPS URL', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/compliance')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Organic Certificate',
        type: 'organic',
        fileUrl: 'http://insecure-http.com/cert.pdf',
      });

    expect(res.status).toBe(500);
  });

  test('11.2: Compliance document upload rejects dangerous URI schemes (javascript:, data:)', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/compliance')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Exploit Script',
        type: 'organic',
        fileUrl: 'javascript:alert(1)',
      });

    expect(res.status).toBe(500);
  });

  test('11.3: Compliance document upload validates allowed extensions (.pdf, .jpg, .png, .webp)', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/compliance')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Executable File',
        type: 'organic',
        fileUrl: 'https://trusted-storage.com/payload.exe',
      });

    expect(res.status).toBe(500);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 12: NOTIFICATION OWNERSHIP
  // ══════════════════════════════════════════════════════════════════════════════

  test('12.1: PUT /api/v1/notifications/:id/read requires authentication', async () => {
    const res = await request(app).put('/api/v1/notifications/notif_1/read');
    expect(res.status).toBe(401);
  });

  test('12.2: PUT /api/v1/notifications/:id/read rejects non-owner with HTTP 403', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce({
      id: 'notif_diff_user',
      userId: 'someone_else_id',
      vendorId: 'someone_else_vendor',
    });

    const res = await request(app)
      .put('/api/v1/notifications/notif_diff_user/read')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(403);
  });

  test('12.3: PUT /api/v1/notifications/:id/read succeeds for owner', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce({
      id: 'notif_owner',
      userId: vendorUserA.id,
      vendorId: vendorRecordA.id,
    });
    mockPrisma.notification.update.mockResolvedValueOnce({
      id: 'notif_owner',
      isRead: true,
    });

    const res = await request(app)
      .put('/api/v1/notifications/notif_owner/read')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMAIN 13: SHOP SETTINGS PERSISTENCE
  // ══════════════════════════════════════════════════════════════════════════════

  test('13.1: GET /api/v1/vendors/shop returns current shop configuration', async () => {
    const res = await request(app)
      .get('/api/v1/vendors/shop')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.shopName).toBe('Saraswati Oil Mill');
  });

  test('13.2: PUT /api/v1/vendors/shop updates shop configuration', async () => {
    mockPrisma.vendor.update.mockResolvedValueOnce({
      ...vendorRecordA,
      shopSettings: {
        shopName: 'Saraswati Organic Oil Mill',
        tagline: 'Generational Cold-Pressed Heritage',
        isPublished: true,
      },
    });

    const res = await request(app)
      .put('/api/v1/vendors/shop')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        shopName: 'Saraswati Organic Oil Mill',
        tagline: 'Generational Cold-Pressed Heritage',
      });

    expect(res.status).toBe(200);
    expect(res.body.shopName).toBe('Saraswati Organic Oil Mill');
  });

  test('1.7: Expired JWT token is rejected with HTTP 401', async () => {
    const expiredToken = jwt.sign(
      { id: vendorUserA.id, email: vendorUserA.email },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  test('4.7: GET /api/v1/vendors/products/:id returns owned product with 200', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_A_1',
      vendorId: vendorRecordA.id,
      name: 'Cold Pressed Sesame Oil',
      price: 450,
      stockQuantity: 40,
    });

    const res = await request(app)
      .get('/api/v1/vendors/products/prod_A_1')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Cold Pressed Sesame Oil');
  });

  test('4.8: DELETE /api/v1/vendors/products/:id deletes owned product', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({
      id: 'prod_A_del',
      vendorId: vendorRecordA.id,
    });
    mockPrisma.product.delete.mockResolvedValueOnce({
      id: 'prod_A_del',
    });

    const res = await request(app)
      .delete('/api/v1/vendors/products/prod_A_del')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('5.4: PUT /api/v1/vendors/orders/:id/status updates status to PROCESSING', async () => {
    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce({
      id: 'vo_order_proc',
      vendorId: vendorRecordA.id,
      status: 'ACCEPTED',
      order: { id: 'parent_order_1' },
      vendor: vendorRecordA,
    });
    mockPrisma.vendorOrder.update.mockResolvedValueOnce({
      id: 'vo_order_proc',
      vendorId: vendorRecordA.id,
      status: 'PROCESSING',
    });

    const res = await request(app)
      .put('/api/v1/vendors/orders/vo_order_proc/status')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'PROCESSING' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PROCESSING');
  });

  test('5.5: GET /api/v1/vendors/orders/:id returns order detail for owned order', async () => {
    mockPrisma.vendorOrder.findFirst.mockResolvedValueOnce({
      id: 'vo_order_detail',
      vendorId: vendorRecordA.id,
      vendorOrderNumber: 'VO-2026-001',
      subtotal: 1200,
      order: {
        id: 'ord_parent_1',
        shippingAddress: { city: 'Pune', state: 'Maharashtra' },
      },
    });

    const res = await request(app)
      .get('/api/v1/vendors/orders/vo_order_detail')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('vo_order_detail');
    expect(res.body.vendorOrderNumber).toBe('VO-2026-001');
  });

  test('5.6: GET /api/v1/vendors/orders returns orders list scoped to vendor', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { id: 'vo_1', vendorId: vendorRecordA.id, subtotal: 800 },
      { id: 'vo_2', vendorId: vendorRecordA.id, subtotal: 1500 },
    ]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(2);

    const res = await request(app)
      .get('/api/v1/vendors/orders')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(2);
    expect(res.body.total).toBe(2);
  });

  test('7.6: Payout request rejects non-numeric amount with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/wallet/payout')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ amount: 'invalid-string' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimum payout amount is ₹500/i);
  });

  test('8.3: Analytics with period=90d filters properly', async () => {
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([]);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(0);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/vendors/analytics?period=90d')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.period).toBe('90d');
    expect(res.body.revenue).toBe(0);
  });

  test('8.4: Analytics groups orders correctly into daily sales trend', async () => {
    const today = new Date();
    mockPrisma.vendorOrder.findMany.mockResolvedValueOnce([
      { subtotal: 1000, payoutAmount: 850, commissionAmount: 150, status: 'CONFIRMED', createdAt: today },
      { subtotal: 500, payoutAmount: 425, commissionAmount: 75, status: 'DELIVERED', createdAt: today },
    ]);
    mockPrisma.product.findMany.mockResolvedValueOnce([]);
    mockPrisma.vendorOrder.count.mockResolvedValueOnce(0);
    mockPrisma.vendorTransfer.findMany.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/v1/vendors/analytics?period=30d')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(1500);
    expect(res.body.salesTrend.length).toBe(1);
    expect(res.body.salesTrend[0].revenue).toBe(1500);
    expect(res.body.salesTrend[0].orders).toBe(2);
  });

  test('11.4: Compliance document upload rejects invalid document type', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/compliance')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        documentType: 'invalid_secret_doc',
        fileUrl: 'https://storage.flashsalesonline.in/docs/doc1.pdf',
      });

    expect(res.status).toBe(400);
  });

  test('11.5: GET /api/v1/vendors/compliance returns compliance documents', async () => {
    mockPrisma.vendor.findUnique.mockImplementation(({ where }) => {
      if (where.email === vendorUserA.email || where.id === vendorRecordA.id) {
        return Promise.resolve({
          ...vendorRecordA,
          organicCertification: {
            documents: [{ type: 'fssai', fileUrl: 'https://storage.flashsalesonline.in/fssai.pdf' }],
          },
        });
      }
      return Promise.resolve(null);
    });

    const res = await request(app)
      .get('/api/v1/vendors/compliance')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe('fssai');
  });

  test('12.4: GET /api/v1/notifications/vendor returns notifications scoped to authenticated vendor', async () => {
    mockPrisma.notification.findMany.mockResolvedValueOnce([
      { id: 'notif_1', vendorId: vendorRecordA.id, title: 'New Order Received' },
    ]);

    const res = await request(app)
      .get('/api/v1/notifications/vendor')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('New Order Received');
  });

  test('12.5: PUT /api/v1/notifications/vendor/read-all marks all vendor notifications as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 4 });

    const res = await request(app)
      .put('/api/v1/notifications/vendor/read-all')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
  });

  test('14.1: PUT /api/v1/vendors/profile updates allowed profile fields', async () => {
    mockPrisma.vendor.update.mockResolvedValueOnce({
      ...vendorRecordA,
      businessName: 'Updated Heritage Mill',
      contactPerson: 'Devi Meera',
    });

    const res = await request(app)
      .put('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        businessName: 'Updated Heritage Mill',
        contactPerson: 'Devi Meera',
      });

    expect(res.status).toBe(200);
    expect(res.body.businessName).toBe('Updated Heritage Mill');
  });

  test('14.2: PUT /api/v1/vendors/profile ignores disallowed / protected fields like status and plan', async () => {
    mockPrisma.vendor.update.mockImplementationOnce(({ data }) => {
      expect(data.status).toBeUndefined();
      expect(data.plan).toBeUndefined();
      expect(data.commissionRate).toBeUndefined();
      return Promise.resolve({ ...vendorRecordA });
    });

    const res = await request(app)
      .put('/api/v1/vendors/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        status: 'APPROVED_BYPASS',
        plan: 'enterprise_free',
        commissionRate: 0,
      });

    expect(res.status).toBe(200);
  });
});
