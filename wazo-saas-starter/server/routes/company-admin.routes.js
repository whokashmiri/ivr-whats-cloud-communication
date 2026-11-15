
const express = require('express');

const controller = require(
  '../controller/company-admin.controller'
);

const {
  authenticate,
} = require('../middleware/authenticate');

const {
  requirePlatformAdmin,
} = require('../middleware/authorize');

const {validateRequestOrigin} = require(
  '../middleware/validate-request-origin'
);

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);
router.use(requirePlatformAdmin);

router.get(
  '/companies',
  asyncHandler(controller.list)
);

router.post(
  '/companies/:id/approve',
  validateRequestOrigin,
  asyncHandler(controller.approve)
);

router.post(
  '/companies/:id/reject',
  validateRequestOrigin,
  asyncHandler(controller.reject)
);

module.exports = router;
