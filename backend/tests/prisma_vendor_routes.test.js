const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const vendorRoutes = require('../routes/vendorRoutes');

describe('Prisma Vendor Routes & Gate 3 Authentication Architecture', () => {
  let app;
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_phase_2';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    app = express();
    app.use(express.json());
    app.use('/api/vendors', vendorRoutes);
  });

  test('Unauthenticated request to vendor profile returns 401', async () => {
    const res = await request(app).get('/api/vendors/profile');
    expect(res.status).toBe(401);
  });

  test('Unauthenticated request to vendor products returns 401', async () => {
    const res = await request(app).get('/api/vendors/products');
    expect(res.status).toBe(401);
  });

  test('Unauthenticated request to vendor orders returns 401', async () => {
    const res = await request(app).get('/api/vendors/orders');
    expect(res.status).toBe(401);
  });

  test('Gate 3: Vendor authentication verifies credentials on User model, not Vendor model', () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../services/vendor/vendorAuthService.js'),
      'utf8'
    );
    expect(content).toContain("prisma.user.findUnique");
    expect(content).toContain("bcrypt.compare(password, user.password)");
    expect(content).toContain("role: 'PRODUCER_MANAGER'");
  });

  test('Public plans endpoint returns available plans without auth', async () => {
    const res = await request(app).get('/api/vendors/plans');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});
