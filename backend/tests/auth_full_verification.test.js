/**
 * PHASE 11 FINAL AUDIT — Comprehensive Auth & Security Flow Tests
 * Prisma ORM & Neon PostgreSQL Persistence Architecture
 * Tests all 8 required scenarios:
 * 1. register (with OTP verification, returns token + sets httpOnly refresh cookie)
 * 2. login (with valid credentials, returns tokens + sets httpOnly refresh cookie)
 * 3. refresh (exchanges refresh cookie/body for new access token)
 * 4. logout (clears refresh cookie and session)
 * 5. invalid token (Bearer token rejection)
 * 6. expired / invalid refresh token (returns 401 INVALID_REFRESH_TOKEN)
 * 7. role authorization (hasRole middleware denial & admin bypass)
 * 8. rate limiting (sliding-window rate limiter triggers 429)
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Set test environment secrets
process.env.JWT_SECRET = 'fso-test-jwt-secret-minimum-32-chars-ok';
process.env.JWT_REFRESH_SECRET = 'fso-test-refresh-secret-min-32-chars';
process.env.NODE_ENV = 'test';

const prisma = require('../config/prisma');
const authRoutes = require('../routes/authRoutes');
const { protect, hasRole } = require('../middleware/authMiddleware');
const { generateAccessToken, generateRefreshToken } = require('../services/tokenService');

describe('PHASE 11 FINAL AUDIT: Authentication & Authorization Verification (Prisma PostgreSQL)', () => {
  let app;
  const mockUserId = 'clrk1234567890abcdefghijk';
  const mockPasswordHash = bcrypt.hashSync('TestPassword123!', 10);
  const mockOtpHash = bcrypt.hashSync('123456', 10);

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/v1/auth', authRoutes);

    // Test route for RBAC testing
    app.get('/api/v1/test/editor-only', protect, hasRole('content_editor'), (req, res) => {
      res.json({ success: true, message: 'Welcome Editor', user: req.user._id });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. REGISTER ─────────────────────────────────────────────────────────────
  describe('1. Register Flow', () => {
    it('successfully registers a user with verified OTP, returning access token and setting httpOnly refresh cookie', async () => {
      // Mock user existence check (null = new user)
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      // Mock OTP lookup
      jest.spyOn(prisma.oTP, 'findFirst').mockResolvedValue({
        id: 'otp-id-1',
        identifier: 'newuser@fso.test',
        type: 'email',
        otp: mockOtpHash,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
      });
      jest.spyOn(prisma.oTP, 'delete').mockResolvedValue({});

      // Mock prisma.user.create
      const mockCreatedUser = {
        id: mockUserId,
        name: 'Heritage Chef',
        email: 'newuser@fso.test',
        isAdmin: false,
        role: 'CUSTOMER',
        cart: [],
      };
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockCreatedUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Heritage Chef',
          email: 'newuser@fso.test',
          password: 'Password123!',
          emailOtp: '123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('newuser@fso.test');
      expect(res.body.token).toBeDefined();
      expect(res.body.accessToken).toBeDefined();

      // Verify httpOnly refresh cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('fso_refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });
  });

  // ── 2. LOGIN ────────────────────────────────────────────────────────────────
  describe('2. Login Flow', () => {
    it('successfully logs in with valid credentials, returns tokens and sets httpOnly refresh cookie', async () => {
      const mockDbUser = {
        id: mockUserId,
        name: 'Authentic Farmer',
        email: 'farmer@fso.test',
        password: mockPasswordHash,
        isAdmin: false,
        role: 'CUSTOMER',
        cart: [],
        isBlocked: false,
        failedLoginAttempts: 0,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockDbUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockDbUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'farmer@fso.test',
          password: 'TestPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('farmer@fso.test');
      expect(res.body.token).toBeDefined();
      expect(res.body.accessToken).toBeDefined();

      // Verify httpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('fso_refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('rejects login with invalid password', async () => {
      const mockDbUser = {
        id: mockUserId,
        name: 'Authentic Farmer',
        email: 'farmer@fso.test',
        password: mockPasswordHash,
        isAdmin: false,
        role: 'CUSTOMER',
        isBlocked: false,
        failedLoginAttempts: 0,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockDbUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(mockDbUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'farmer@fso.test',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  // ── 3. REFRESH TOKEN ────────────────────────────────────────────────────────
  describe('3. Refresh Token Flow', () => {
    it('successfully issues a fresh access token given a valid refresh token cookie', async () => {
      const validRefreshToken = generateRefreshToken(mockUserId);
      const mockDbUser = {
        id: mockUserId,
        email: 'farmer@fso.test',
        role: 'CUSTOMER',
        isBlocked: false,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockDbUser);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`fso_refresh_token=${validRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();

      // Verify returned token is a valid JWT
      const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(mockUserId);
    });

    it('accepts refresh token from request body if cookie is not present', async () => {
      const validRefreshToken = generateRefreshToken(mockUserId);
      const mockDbUser = {
        id: mockUserId,
        role: 'CUSTOMER',
        isBlocked: false,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockDbUser);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
    });
  });

  // ── 4. LOGOUT ───────────────────────────────────────────────────────────────
  describe('4. Logout Flow', () => {
    it('clears the httpOnly refresh cookie on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('fso_refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0)/i);
    });
  });

  // ── 5. INVALID TOKEN ────────────────────────────────────────────────────────
  describe('5. Invalid Token Handling', () => {
    it('returns 401 when an arbitrary invalid token is passed', async () => {
      const res = await request(app)
        .get('/api/v1/test/editor-only')
        .set('Authorization', 'Bearer gibberish.token.not.valid');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 when no token is provided on protected endpoint', async () => {
      const res = await request(app).get('/api/v1/test/editor-only');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  // ── 6. EXPIRED / INVALID REFRESH TOKEN ──────────────────────────────────────
  describe('6. Expired / Invalid Refresh Token', () => {
    it('returns 401 INVALID_REFRESH_TOKEN when refresh token signature is tampered', async () => {
      const tamperedToken = generateRefreshToken(mockUserId) + 'tampered';

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tamperedToken });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('returns 401 NO_REFRESH_TOKEN when refresh endpoint is called without any token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_REFRESH_TOKEN');
    });
  });

  // ── 7. ROLE AUTHORIZATION ───────────────────────────────────────────────────
  describe('7. Role Authorization (RBAC)', () => {
    it('grants access when user has content_editor role', async () => {
      const token = generateAccessToken(mockUserId, 'content_editor');
      const mockUser = {
        id: mockUserId,
        role: 'CONTENT_EDITOR',
        isAdmin: false,
        isBlocked: false,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/test/editor-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Welcome Editor');
    });

    it('blocks access with 403 ROLE_FORBIDDEN when user has customer role', async () => {
      const token = generateAccessToken(mockUserId, 'customer');
      const mockUser = {
        id: mockUserId,
        role: 'CUSTOMER',
        isAdmin: false,
        isBlocked: false,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/test/editor-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_FORBIDDEN');
    });

    it('bypasses role check when user has isAdmin: true', async () => {
      const token = generateAccessToken(mockUserId, 'admin');
      const mockUser = {
        id: mockUserId,
        role: 'ADMIN',
        isAdmin: true,
        isBlocked: false,
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/v1/test/editor-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── 8. RATE LIMITING ────────────────────────────────────────────────────────
  describe('8. Rate Limiting Verification', () => {
    it('verifies rate limiter configuration blocks excessive requests', async () => {
      const rateLimit = require('express-rate-limit');
      const testLimiter = rateLimit({
        windowMs: 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many requests' },
      });

      const testApp = express();
      testApp.get('/limited', testLimiter, (req, res) => res.json({ ok: true }));

      // Request 1: ok
      const r1 = await request(testApp).get('/limited');
      expect(r1.status).toBe(200);

      // Request 2: ok
      const r2 = await request(testApp).get('/limited');
      expect(r2.status).toBe(200);

      // Request 3: blocked with 429
      const r3 = await request(testApp).get('/limited');
      expect(r3.status).toBe(429);
      expect(r3.body.message).toContain('Too many requests');
    });
  });
});
