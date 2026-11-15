
const express = require('express');

const controller = require('../controller/tenant.controller');

const asyncHandler = require('../utils/asyncHandler');

const {
  authenticate,
} = require('../middleware/authenticate');

const {
  requirePlatformAdmin,
} = require('../middleware/authorize');

const {validateRequestOrigin} = require(
  '../middleware/validate-request-origin'
);

const router = express.Router();

router.use(authenticate);

// Only the platform owner can list all Wazo tenants.
router.get(
  '/',
  requirePlatformAdmin,
  asyncHandler(controller.list)
);

// Only the platform owner can create Wazo tenants directly.
router.post(
  '/',
  requirePlatformAdmin,
  validateRequestOrigin,
  asyncHandler(controller.create)
);

// Administrative repair/setup endpoint.
// Customer setup is handled through approved onboarding.
router.post(
  '/:uuid/calling-setup',
  requirePlatformAdmin,
  validateRequestOrigin,
  asyncHandler(controller.setupCalling)
);

module.exports = router;
