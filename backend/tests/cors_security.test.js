/**
 * FSO Phase 1: Security Hardening Verification Tests
 * Tests for:
 * 1. CORS Origin validation (strict exact match, prefix spoofing rejection, 'null' origin rejection, no-origin handling)
 * 2. JWT_REFRESH_SECRET strict requirement (no fallback)
 * 3. Token Service security contracts
 */

const { buildAllowedOrigins, corsOptions } = require('../server');
const tokenService = require('../services/tokenService');

describe('FSO Phase 1: CORS & Secret Security Hardening', () => {
  describe('CORS Origin Allowlist Builder', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...origEnv };
    });

    it('returns default development origins when no environment variables are set', () => {
      delete process.env.CLIENT_URL;
      delete process.env.CORS_ORIGINS;

      const origins = buildAllowedOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://localhost:5174');
      expect(origins).toContain('http://localhost:5000');
    });

    it('normalizes origins by stripping trailing slashes', () => {
      process.env.CLIENT_URL = 'https://custom-client.com/';
      process.env.CORS_ORIGINS = 'https://portal.custom-client.com/, https://admin.custom-client.com/';

      const origins = buildAllowedOrigins();
      expect(origins).toContain('https://custom-client.com');
      expect(origins).not.toContain('https://custom-client.com/');
      expect(origins).toContain('https://portal.custom-client.com');
      expect(origins).toContain('https://admin.custom-client.com');
    });

    it('adds production domains when configured in CORS_ORIGINS', () => {
      process.env.CORS_ORIGINS = 'https://flashsalesonline.in, https://www.flashsalesonline.in';
      const origins = buildAllowedOrigins();
      expect(origins).toContain('https://flashsalesonline.in');
      expect(origins).toContain('https://www.flashsalesonline.in');
    });
  });

  describe('CORS Origin Policy Enforcement (Exact Match vs Prefix Attacks)', () => {
    const originChecker = corsOptions.origin;

    it('allows exact authorized origin (e.g. http://localhost:3000)', (done) => {
      originChecker('http://localhost:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('allows localhost:5173 (client development server)', (done) => {
      originChecker('http://localhost:5173', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        done();
      });
    });

    it('BLOCKS prefix-based spoofing attack (http://localhost:3000.evil.com)', (done) => {
      originChecker('http://localhost:3000.evil.com', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/CORS policy: Origin http:\/\/localhost:3000\.evil\.com not allowed/);
        expect(allow).toBeUndefined();
        done();
      });
    });

    it('BLOCKS port spoofing attack (http://localhost:30000)', (done) => {
      originChecker('http://localhost:30000', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/CORS policy: Origin http:\/\/localhost:30000 not allowed/);
        done();
      });
    });

    it('BLOCKS subdomain prefix attack (https://localhost:3000.attacker.org)', (done) => {
      originChecker('https://localhost:3000.attacker.org', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/CORS policy: Origin .+ not allowed/);
        done();
      });
    });

    it('BLOCKS explicit string "null" origin', (done) => {
      originChecker('null', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/CORS policy: Origin 'null' not allowed/);
        done();
      });
    });

    it('safely handles non-browser / no-origin requests (CLI/curl/backend-to-backend)', (done) => {
      originChecker(undefined, (err, allow) => {
        expect(err).toBeNull();
        // callback(null, false) allows request through without reflecting an ACAO header
        expect(allow).toBe(false);
        done();
      });
    });
  });

  describe('JWT_REFRESH_SECRET Hardening & Zero-Fallback Verification', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...origEnv };
    });

    it('returns JWT_REFRESH_SECRET when configured', () => {
      process.env.JWT_REFRESH_SECRET = 'explicitly-configured-refresh-secret-string';
      process.env.JWT_SECRET = 'main-jwt-secret';

      expect(tokenService.REFRESH_SECRET()).toBe('explicitly-configured-refresh-secret-string');
    });

    it('CRITICALLY THROWS and REFUSES to fall back to JWT_SECRET when JWT_REFRESH_SECRET is unset', () => {
      delete process.env.JWT_REFRESH_SECRET;
      process.env.JWT_SECRET = 'main-jwt-secret';

      expect(() => tokenService.REFRESH_SECRET()).toThrow(
        /JWT_REFRESH_SECRET environment variable is not set/
      );
    });

    it('generates and verifies access token using JWT_SECRET', () => {
      process.env.JWT_SECRET = 'unit-test-access-token-secret-12345';
      const userId = 'usr_test_1';
      const role = 'CUSTOMER';
      const token = tokenService.generateAccessToken(userId, role);

      expect(typeof token).toBe('string');
      const verified = tokenService.verifyAccessToken(token);
      expect(verified.id).toBe(userId);
      expect(verified.role).toBe(role);
      expect(verified.type).toBe('access');
    });

    it('generates and verifies refresh token using strictly JWT_REFRESH_SECRET', () => {
      process.env.JWT_SECRET = 'main-jwt-secret';
      process.env.JWT_REFRESH_SECRET = 'strictly-separate-refresh-secret';

      const userId = 'usr_test_2';
      const refreshToken = tokenService.generateRefreshToken(userId);

      expect(typeof refreshToken).toBe('string');
      const verified = tokenService.verifyRefreshToken(refreshToken);
      expect(verified.id).toBe(userId);
      expect(verified.type).toBe('refresh');

      // Verify that access token secret CANNOT verify refresh token
      expect(() => tokenService.verifyAccessToken(refreshToken)).toThrow();
    });
  });
});
