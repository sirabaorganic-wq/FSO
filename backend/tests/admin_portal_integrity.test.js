const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_fso_phase7_integrity';

// In-memory Prisma mock store
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
  },
  vendor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { totalPrice: 0 } }),
  },
  vendorOrder: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  vendorTransfer: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  payment: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null }, _count: { id: 0 } }),
  },
  refundLog: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
  orderReturn: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  siteSettings: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  gSTSettings: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => {
    if (typeof cb === 'function') {
      return await cb(mockPrisma);
    }
    return cb;
  }),
};

jest.mock('../config/prisma', () => mockPrisma);

// Import Express app and routes
const adminRoutes = require('../routes/adminRoutes');
const authRoutes = require('../routes/authRoutes');
const productRoutes = require('../routes/productRoutes');
const orderRoutes = require('../routes/orderRoutes');
const reviewRoutes = require('../routes/reviewRoutes');
const refundRoutes = require('../routes/refundRoutes');
const notificationRoutes = require('../routes/notificationRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/refunds', refundRoutes);
app.use('/api/v1/notifications', notificationRoutes);

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('FSO Phase 7: Admin Portal Integration & Operations Test Suite', () => {
  const adminUser = {
    id: 'user_admin_1',
    email: 'admin@fso.in',
    name: 'Admin Aarav',
    role: 'ADMIN',
    isAdmin: true,
    isBlocked: false,
  };

  const customerUser = {
    id: 'user_cust_1',
    email: 'cust@heritage.in',
    name: 'Customer Priya',
    role: 'CUSTOMER',
    isAdmin: false,
    isBlocked: false,
  };

  const vendorUser = {
    id: 'user_vend_1',
    email: 'vendor@heritage.in',
    name: 'Vendor Govind',
    role: 'PRODUCER_MANAGER',
    isAdmin: false,
    isBlocked: false,
  };

  let adminToken;
  let customerToken;
  let vendorToken;

  beforeAll(() => {
    adminToken = generateToken({ id: adminUser.id, role: adminUser.role, isAdmin: true });
    customerToken = generateToken({ id: customerUser.id, role: customerUser.role, isAdmin: false });
    vendorToken = generateToken({ id: vendorUser.id, role: vendorUser.role, isAdmin: false });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default user lookup mock
    mockPrisma.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === adminUser.id || where.email === adminUser.email) return Promise.resolve(adminUser);
      if (where.id === customerUser.id || where.email === customerUser.email) return Promise.resolve(customerUser);
      if (where.id === vendorUser.id || where.email === vendorUser.email) return Promise.resolve(vendorUser);
      return Promise.resolve(null);
    });

    // Reset default returns
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.vendor.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.review.findMany.mockResolvedValue([]);
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { id: 0 } });
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalPrice: 0 } });
    mockPrisma.vendorOrder.updateMany.mockResolvedValue({ count: 1 });
  });

  // ── 1. RBAC: Authentication & Authorization ──────────────────────────────────
  describe('1. RBAC: Authentication & Admin Authorization Boundaries', () => {
    test('1.1: GET /api/v1/admin/dashboard rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect([401, 403]).toContain(res.status);
    });

    test('1.2: GET /api/v1/admin/dashboard rejects CUSTOMER role with 401 or 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    test('1.3: GET /api/v1/admin/dashboard rejects PRODUCER_MANAGER role with 401 or 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${vendorToken}`);
      expect([401, 403]).toContain(res.status);
    });

    test('1.4: GET /api/v1/admin/dashboard grants access to ADMIN role and returns metrics', async () => {
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.vendor.count.mockResolvedValue(3);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalUsers', 2);
      expect(res.body).toHaveProperty('totalVendors', 3);
      expect(res.body).toHaveProperty('totalProducts', 0);
      expect(res.body).toHaveProperty('totalOrders', 0);
      expect(res.body).toHaveProperty('totalRevenue', 0);
    });

    test('1.5: GET /api/v1/admin/reviews rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/admin/reviews');
      expect([401, 403]).toContain(res.status);
    });

    test('1.6: GET /api/v1/admin/reviews rejects non-admin users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reviews')
        .set('Authorization', `Bearer ${customerToken}`);
      expect([401, 403]).toContain(res.status);
    });
  });

  // ── 2. Review Moderation & Deletion Hardening ───────────────────────────────
  describe('2. Review Moderation & Deletion Authorization & Hardening', () => {
    const mockReview = {
      id: 'rev_101',
      productId: 'prod_1',
      userId: customerUser.id,
      rating: 5,
      comment: 'Authentic taste',
      isApproved: false,
      createdAt: new Date().toISOString(),
      user: customerUser,
      product: { id: 'prod_1', title: 'A2 Ghee', averageRating: 5, reviewCount: 1 },
    };

    test('2.1: PUT /api/v1/admin/reviews/:id/status rejects non-admin with 401/403', async () => {
      const res = await request(app)
        .put('/api/v1/admin/reviews/rev_101/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isApproved: true });

      expect([401, 403]).toContain(res.status);
    });

    test('2.2: PUT /api/v1/admin/reviews/:id/status approves review when called by Admin', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      mockPrisma.review.update.mockResolvedValue({ ...mockReview, isApproved: true });

      const res = await request(app)
        .put('/api/v1/admin/reviews/rev_101/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isApproved: true });

      expect(res.status).toBe(200);
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev_101' },
        data: { isApproved: true },
      });
    });

    test('2.3: DELETE /api/v1/admin/reviews/:id rejects non-admin with 401/403', async () => {
      const res = await request(app)
        .delete('/api/v1/admin/reviews/rev_101')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([401, 403]).toContain(res.status);
    });

    test('2.4: DELETE /api/v1/admin/reviews/:id deletes review and updates product stats for Admin', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      mockPrisma.review.delete.mockResolvedValue(mockReview);
      mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { id: 0 } });
      mockPrisma.product.update.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/v1/admin/reviews/rev_101')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev_101' } });
      expect(mockPrisma.product.update).toHaveBeenCalled();
    });
  });

  // ── 3. IDOR & Access Control Across Resource Classes ────────────────────────
  describe('3. IDOR & Access Control Across Resource Classes', () => {
    test('3.1 Vendor Moderation: PUT /api/v1/admin/vendors/:id/status requires Admin', async () => {
      const res = await request(app)
        .put('/api/v1/admin/vendors/vend_test/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'APPROVED' });

      expect([401, 403]).toContain(res.status);
    });

    test('3.2 Vendor Moderation: PUT /api/v1/admin/vendors/:id/status updates vendor status for Admin', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 'vend_test', status: 'PENDING', isActive: false });
      mockPrisma.vendor.update.mockResolvedValue({ id: 'vend_test', status: 'APPROVED', isActive: true });

      const res = await request(app)
        .put('/api/v1/admin/vendors/vend_test/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(mockPrisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vend_test' },
          data: expect.objectContaining({ status: 'APPROVED' }),
        })
      );
    });

    test('3.3 User Directory: GET /api/v1/auth/users rejects non-admin with 401/403', async () => {
      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([401, 403]).toContain(res.status);
    });

    test('3.4 User Directory: GET /api/v1/auth/users returns user list with stats for Admin', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: customerUser.id,
          name: customerUser.name,
          email: customerUser.email,
          isAdmin: false,
          role: customerUser.role,
          isBlocked: false,
          createdAt: new Date().toISOString(),
          _count: { orders: 0 },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe(customerUser.id);
      expect(res.body[0].totalOrders).toBe(0);
    });

    test('3.5 Order Moderation: PUT /api/v1/orders/:id/status rejects non-admin', async () => {
      const res = await request(app)
        .put('/api/v1/orders/ord_1/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'PROCESSING' });

      expect([401, 403]).toContain(res.status);
    });

    test('3.6 Order Moderation: PUT /api/v1/orders/:id/status succeeds for Admin', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'ord_1', status: 'PENDING' });
      mockPrisma.order.update.mockResolvedValue({ id: 'ord_1', status: 'PROCESSING' });

      const res = await request(app)
        .put('/api/v1/orders/ord_1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PROCESSING' });

      expect(res.status).toBe(200);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord_1' },
          data: expect.objectContaining({ status: 'PROCESSING' }),
        })
      );
    });

    test('3.7 Refund Logs: GET /api/v1/refunds/admin-logs rejects non-admin', async () => {
      const res = await request(app)
        .get('/api/v1/refunds/admin-logs')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([401, 403]).toContain(res.status);
    });

    test('3.8 Refund Logs: GET /api/v1/refunds/admin-logs returns refund entries for Admin', async () => {
      mockPrisma.refundLog.findMany.mockResolvedValue([
        { id: 'rfnd_1', amount: 1500, status: 'PROCESSED', createdAt: new Date().toISOString() },
      ]);

      const res = await request(app)
        .get('/api/v1/refunds/admin-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('rfnd_1');
    });

    test('3.9 Notifications IDOR: PUT /api/v1/notifications/:id/read rejects non-owner with 403', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif_cust',
        userId: customerUser.id,
        read: false,
      });

      const res = await request(app)
        .put('/api/v1/notifications/notif_cust/read')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(403);
    });

    test('3.10 Notifications: PUT /api/v1/notifications/:id/read allows notification owner', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif_cust',
        userId: customerUser.id,
        read: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif_cust',
        userId: customerUser.id,
        read: true,
      });

      const res = await request(app)
        .put('/api/v1/notifications/notif_cust/read')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ── 4. Real Mutation Persistence Proof ──────────────────────────────────────
  describe('4. Mutation Persistence Verification: Write -> Subsequent Read', () => {
    test('4.1 Shipping Settings: PUT updates SiteSettings and GET reflects persisted config', async () => {
      const updatedConfig = {
        freeShippingThreshold: 999,
        standardShippingFee: 75,
        expressShippingFee: 150,
      };

      let storedConfig = { freeShippingThreshold: 500, standardShippingFee: 50 };

      mockPrisma.siteSettings.upsert.mockImplementation(({ update }) => {
        storedConfig = update.value;
        return Promise.resolve({ key: 'shippingConfig', value: storedConfig });
      });

      mockPrisma.siteSettings.findUnique.mockImplementation(({ where }) => {
        if (where.key === 'shippingConfig') {
          return Promise.resolve({ key: 'shippingConfig', value: storedConfig });
        }
        return Promise.resolve(null);
      });

      // 1. Update via Admin endpoint
      const putRes = await request(app)
        .put('/api/v1/admin/shipping-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedConfig);

      expect(putRes.status).toBe(200);
      expect(putRes.body.shippingConfig).toEqual(updatedConfig);

      // 2. Subsequent read reflects persisted result
      const getRes = await request(app)
        .get('/api/v1/admin/shipping-settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty('freeShippingThreshold', 999);
      expect(getRes.body).toHaveProperty('standardShippingFee', 75);
      expect(getRes.body).toHaveProperty('expressShippingFee', 150);
    });
  });

  // ── 5. Review Reply Freeze Limitation ───────────────────────────────────────
  describe('5. Review Reply Freeze Contract Confirmation', () => {
    test('5.1 Prisma schema Review model does NOT contain vendorReply field', () => {
      const fs = require('fs');
      const path = require('path');
      const schemaContent = fs.readFileSync(
        path.join(__dirname, '..', 'prisma', 'schema.prisma'),
        'utf8'
      );

      const reviewModelMatch = schemaContent.match(/model Review\s*\{([\s\S]*?)\}/);
      expect(reviewModelMatch).not.toBeNull();
      const reviewModelBody = reviewModelMatch[1];

      expect(reviewModelBody).not.toContain('vendorReply');
      expect(reviewModelBody).not.toContain('reply');
    });
  });
});
