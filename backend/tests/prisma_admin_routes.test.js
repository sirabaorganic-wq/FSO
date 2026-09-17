const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

const adminRoutes = require('../routes/adminRoutes');
const { admin } = require('../middleware/authMiddleware');

describe('Prisma Admin Routes & RBAC Architecture', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  test('Unauthenticated request to admin vendors returns 401', async () => {
    const res = await request(app).get('/api/admin/vendors');
    expect(res.status).toBe(401);
  });

  test('RBAC: Non-admin user is rejected with 403 Forbidden by admin middleware', () => {
    const req = {
      user: { id: 'cust_1', isAdmin: false, role: 'CUSTOMER' },
      method: 'GET',
      path: '/vendors',
      originalUrl: '/api/admin/vendors',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    admin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Not authorized as an admin'),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('Gate 2: Operational subadmin strictly targets VENDOR_ONBOARDER and BLOG_CREATOR', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../services/admin/adminSubadminService.js'),
      'utf8'
    );
    expect(content).toContain("ALLOWED_SUBADMIN_ROLES = ['VENDOR_ONBOARDER', 'BLOG_CREATOR']");
    expect(content).toContain("role: { in: ALLOWED_SUBADMIN_ROLES }");
    expect(content).not.toContain("role: { not: 'CUSTOMER' }");
  });

  test('Gate 1: Order returns service does not assume CANCELLED = RETURN', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../services/admin/adminOrderService.js'),
      'utf8'
    );
    expect(content).toContain("RefundLog");
    expect(content).toContain("schemaNote: 'Returns tracked via RefundLog. VendorOrder schema does not conflate cancellations with returns.'");
    expect(content).not.toContain("status: 'CANCELLED'");
  });
});
