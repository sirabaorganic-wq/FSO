/**
 * FSO Auth & Token Service Tests
 */

const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../services/tokenService');
const { hasRole } = require('../middleware/authMiddleware');

describe('FSO Authentication & Token Architecture', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-super-secure-key-32-chars-long' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('tokenService', () => {
    it('generates valid access tokens with expected payload and short expiry', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId, 'customer');

      expect(typeof token).toBe('string');
      const decoded = verifyAccessToken(token);
      expect(decoded.id).toBe(userId);
      expect(decoded.role).toBe('customer');
      expect(decoded.type).toBe('access');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('generates valid refresh tokens with type refresh', () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = generateRefreshToken(userId);

      expect(typeof refreshToken).toBe('string');
      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('rejects tampered access tokens', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);
      const tampered = token.slice(0, -5) + 'abcde';

      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('throws error when JWT_SECRET is not configured (no secret123 fallback)', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => generateAccessToken('507f1f77bcf86cd799439011')).toThrow(
        /JWT_SECRET environment variable is not set/
      );
    });
  });

  describe('hasRole RBAC Middleware', () => {
    it('allows access when user has one of the allowed roles', () => {
      const middleware = hasRole('admin', 'content_editor');
      const req = { user: { role: 'content_editor' }, ip: '127.0.0.1', method: 'POST', path: '/articles', get: () => '' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows admin users access regardless of role parameter if isAdmin is true', () => {
      const middleware = hasRole('content_editor');
      const req = { user: { isAdmin: true, role: 'admin' }, ip: '127.0.0.1', method: 'POST', path: '/articles', get: () => '' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('blocks access when user does not have an allowed role', () => {
      const middleware = hasRole('admin', 'operations_manager');
      const req = { user: { role: 'customer' }, ip: '127.0.0.1', method: 'POST', path: '/admin/orders', get: () => '' };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ROLE_FORBIDDEN' })
      );
    });
  });
});
