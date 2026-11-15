
const express = require('express');

const controller = require(
  '../controller/company-onboarding.controller'
);

const {
  authenticate,
} = require('../middleware/authenticate');

const {validateRequestOrigin} = require(
  '../middleware/validate-request-origin'
);

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

// Customer sees only organizations to which they belong.
router.get(
  '/companies',
  asyncHandler(controller.listMine)
);

// Customer submits a company for platform approval.
router.post(
  '/companies',
  validateRequestOrigin,
  asyncHandler(controller.create)
);

module.exports = router;
