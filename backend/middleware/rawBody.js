/**
 * Raw Body Middleware for Razorpay Webhooks
 *
 * CRITICAL: Razorpay webhook signature verification requires the exact raw
 * request body as received. If express.json() parses it first, the body is
 * re-serialized and the signature comparison will always fail.
 *
 * This middleware must be applied BEFORE express.json() on the webhook route.
 */

const express = require('express');

/**
 * Middleware that reads the raw body as a Buffer before JSON parsing,
 * and attaches it to req.rawBody for signature verification.
 */
const rawBodyMiddleware = express.raw({ type: 'application/json' });

module.exports = { rawBodyMiddleware };
