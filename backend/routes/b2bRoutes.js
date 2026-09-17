/**
 * FSO B2B Routes — Legacy Feature Determination (Gate 6)
 *
 * Forensically verified: Zero frontend consumers in client/.
 * No models exist in schema.prisma.
 * As mandated by Gate 6 and Phase 2E, returns truthful HTTP 501 FEATURE_DISABLED
 * responses, decoupling Mongoose completely without inventing phantom Prisma models.
 */

const express = require('express');
const router = express.Router();

const disabledResponse = (res, feature) => {
  return res.status(501).json({
    success: false,
    error: {
      code: 'FEATURE_DISABLED',
      message: `B2B ${feature} functionality is disabled in this deployment.`,
    },
  });
};

// POST /api/b2b/distributors - Submit application
router.post('/distributors', (req, res) => {
  return disabledResponse(res, 'distributor registration');
});

// GET /api/b2b/distributors - Get applications (Admin)
router.get('/distributors', (req, res) => {
  return disabledResponse(res, 'distributor list');
});

// POST /api/b2b/samples - Submit request
router.post('/samples', (req, res) => {
  return disabledResponse(res, 'sample request');
});

// GET /api/b2b/samples - Get requests (Admin)
router.get('/samples', (req, res) => {
  return disabledResponse(res, 'sample list');
});

// GET /api/b2b/settings - Get settings
router.get('/settings', (req, res) => {
  return disabledResponse(res, 'settings');
});

// PUT /api/b2b/settings - Update settings
router.put('/settings', (req, res) => {
  return disabledResponse(res, 'settings update');
});

module.exports = router;
