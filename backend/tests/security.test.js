/**
 * FSO Security & Error Handling Tests
 */

const { globalErrorHandler, errorResponse, successResponse } = require('../middleware/errorMiddleware');
const { validateRequiredSecrets } = require('../config/marketplace.config');

describe('FSO Security & Error Handling Architecture', () => {
  describe('Error Middleware', () => {
    it('formats success responses correctly', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      successResponse(res, 200, { id: '123' }, 'Item fetched', { total: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item fetched',
        data: { id: '123' },
        meta: { total: 1 },
      });
    });

    it('formats error responses with code and message', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      errorResponse(res, 404, 'NOT_FOUND', 'Entity not found', [{ field: 'slug', message: 'Missing' }]);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Entity not found',
          details: [{ field: 'slug', message: 'Missing' }],
        },
      });
    });

    it('sanitizes production errors to avoid leaking stack traces or internal details', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const err = new Error('Database connection failed at 10.0.0.1:27017');
      err.stack = 'Error: Database connection failed\n    at internalFunction (/app/db.js:45)';
      const req = { originalUrl: '/api/v1/products', method: 'GET', ip: '127.0.0.1' };
      const res = {
        statusCode: 200,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      globalErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INTERNAL_ERROR');
      // Must not leak stack in production
      expect(responseData.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Startup Secrets Validation', () => {
    const origEnv = { ...process.env };

    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/fso-test';
      process.env.JWT_SECRET = 'valid-production-ready-jwt-secret-string';
      process.env.JWT_REFRESH_SECRET = 'valid-production-ready-refresh-secret-string';
    });

    afterAll(() => {
      process.env = origEnv;
    });

    it('throws when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => validateRequiredSecrets()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);
    });

    it('throws when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => validateRequiredSecrets()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);
    });

    it('throws when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      expect(() => validateRequiredSecrets()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);
    });

    it('passes when required secrets are set', () => {
      expect(() => validateRequiredSecrets()).not.toThrow();
    });
  });
});
