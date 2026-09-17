/**
 * FSO Token Service
 * Implements short-lived access tokens + long-lived refresh tokens.
 *
 * Access Token:  JWT, 15 minutes (or JWT_ACCESS_EXPIRES env)
 * Refresh Token: JWT, 7 days (or JWT_REFRESH_EXPIRES env), sent as httpOnly cookie
 *
 * OWASP A07:2021 – Identification and Authentication Failures
 */

const jwt = require('jsonwebtoken');
const { marketplaceConfig } = require('../config/marketplace.config');

const ACCESS_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is not set');
  return s;
};

const REFRESH_SECRET = () => {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  return s;
};

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRES || marketplaceConfig.security.accessTokenExpiry;
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES || marketplaceConfig.security.refreshTokenExpiry;

/**
 * Generate a short-lived access token.
 * @param {string|ObjectId} userId
 * @param {string} [role] - optional role hint
 * @returns {string} signed JWT
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId.toString(), role, type: 'access' },
    ACCESS_SECRET(),
    { expiresIn: ACCESS_EXPIRY }
  );
};

/**
 * Generate a long-lived refresh token.
 * @param {string|ObjectId} userId
 * @returns {string} signed JWT
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId.toString(), type: 'refresh' },
    REFRESH_SECRET(),
    { expiresIn: REFRESH_EXPIRY }
  );
};

/**
 * Verify an access token.
 * Throws on invalid/expired token.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET());
};

/**
 * Verify a refresh token.
 * Throws on invalid/expired token.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET());
};

/**
 * Set the refresh token as a secure httpOnly cookie.
 * @param {Response} res - Express response object
 * @param {string} refreshToken
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  res.cookie('fso_refresh_token', refreshToken, {
    httpOnly: true,           // Not accessible to JavaScript
    secure: isProd,           // HTTPS only in production
    sameSite: isProd ? 'strict' : 'lax', // CSRF protection
    maxAge: sevenDaysMs,
    path: '/api',             // Scoped to API paths
  });
};

/**
 * Clear the refresh token cookie (logout).
 * @param {Response} res - Express response object
 */
const clearRefreshTokenCookie = (res) => {
  res.cookie('fso_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 0,
    path: '/api',
  });
};

/**
 * Parse refresh token from httpOnly cookie.
 * @param {Request} req - Express request object
 * @returns {string|null}
 */
const getRefreshTokenFromCookie = (req) => {
  return req.cookies?.fso_refresh_token || null;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  ACCESS_SECRET,
  REFRESH_SECRET,
};
