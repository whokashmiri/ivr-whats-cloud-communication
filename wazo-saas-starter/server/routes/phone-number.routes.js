const router = require('express').Router();
const controller = require('../controller/phone-number.controller');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const { requireTenantAccess } = require('../middleware/tenant-access');
const { validateRequestOrigin } = require('../middleware/validate-request-origin');

const base = '/tenants/:uuid/phone-numbers';

router.use(authenticate);

router.get(
  base,
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'),
  wrap(controller.list)
);

router.get(
  `${base}/:id`,
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'),
  wrap(controller.get)
);

// These operations modify Wazo/Asterisk configuration.
router.post(
  base,
  validateRequestOrigin,
  requireTenantAccess('COMPANY_ADMIN'),
  wrap(controller.create)
);

router.post(
  `${base}/:id/activate`,
  validateRequestOrigin,
  requireTenantAccess('COMPANY_ADMIN'),
  wrap(controller.activate)
);

module.exports = router;
