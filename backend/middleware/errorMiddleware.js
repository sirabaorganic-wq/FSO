/**
 * FSO Centralized Error Handling Middleware
 * OWASP A09:2021 – Security Logging and Monitoring Failures
 * OWASP A05:2021 – Security Misconfiguration
 *
 * Never expose stack traces, internal paths, DB errors, or secrets in production.
 */

const { marketplaceConfig } = require('../config/marketplace.config');

/**
 * Standard FSO API error response format.
 *   { success: false, error: { code, message } }
 */
const errorResponse = (res, statusCode, code, message, details) => {
  const errorObj = { code, message };
  if (details) errorObj.details = details;
  return res.status(statusCode).json({
    success: false,
    error: errorObj,
  });
};

/**
 * Standard FSO API success response format.
 *   { success: true, data, message?, meta? }
 */
const successResponse = (res, statusCode, data, message, meta) => {
  const payload = { success: true, data };
  if (message) payload.message = message;
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

/**
 * 404 Not Found handler — mount AFTER all routes.
 */
const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
};

/**
 * Global error handler — mount LAST as 4-arg middleware.
 * Sanitizes all errors before sending to client.
 */
const globalErrorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';

  // Log full error server-side (never to client)
  console.error({
    timestamp: new Date().toISOString(),
    type: 'UNHANDLED_ERROR',
    method: req.method,
    url: req.originalUrl,
    userId: req.user?._id,
    message: err.message,
    // Only log stack in non-production
    ...(isProd ? {} : { stack: err.stack }),
  });

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return errorResponse(res, 409, 'DUPLICATE_VALUE', `A record with this ${target} already exists`);
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return errorResponse(res, 404, 'NOT_FOUND', err.meta?.cause || 'Record not found');
  }

  // Prisma foreign key constraint failure (P2003)
  if (err.code === 'P2003') {
    return errorResponse(res, 400, 'FOREIGN_KEY_VIOLATION', 'Referenced record does not exist');
  }

  // Legacy Mongoose duplicate key error (fallback)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(res, 409, 'DUPLICATE_VALUE', `${field} already exists`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid');
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
  }

  // Express body-parser errors (malformed JSON)
  if (err.type === 'entity.parse.failed') {
    return errorResponse(res, 400, 'MALFORMED_JSON', 'Request body contains invalid JSON');
  }

  // Express body size limit
  if (err.type === 'entity.too.large') {
    return errorResponse(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds size limit');
  }

  // Rate limiter passthrough (should already be handled, just in case)
  if (err.status === 429) {
    return errorResponse(res, 429, 'RATE_LIMITED', 'Too many requests, please try again later');
  }

  // Default 500
  const statusCode = err.statusCode || err.status || 500;
  const message = isProd
    ? 'An unexpected error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      // Only expose details in development
      ...(isProd ? {} : { details: err.message }),
    },
  });
};

/**
 * Async handler wrapper — eliminates try/catch boilerplate in controllers.
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
  errorResponse,
  successResponse,
  asyncHandler,
};
