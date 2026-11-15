
const router = require('express').Router();

const ctrl = require('../controller/employee.controller');
const wrap = require('../utils/asyncHandler');

const {
  authenticate,
} = require('../middleware/authenticate');

const {
  requireTenantAccess,
} = require('../middleware/tenant-access');

const {
  validateRequestOrigin,
} = require('../middleware/validate-request-origin');

// All employee endpoints require a valid SaaS session.
router.use(authenticate);

// ==========================================
// LIST EMPLOYEES
// ==========================================

// Company admin and supervisor can view employees.
// Agents are not given organization-wide user listings.
router.get(
  '/tenants/:uuid/users',
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'),
  wrap(ctrl.list),
);

// ==========================================
// CREATE EMPLOYEE
// ==========================================

router.post(
  '/tenants/:uuid/users',
  validateRequestOrigin,
  requireTenantAccess('COMPANY_ADMIN'),
  wrap(ctrl.create),
);

// ==========================================
// CALLING SETUP
// ==========================================

router.get(
  '/tenants/:uuid/calling-setup',
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'),
  wrap(ctrl.callingSetup),
);

// ==========================================
// PREVIEW SIP PHONE PROVISIONING
// ==========================================

// This operation should be read-only.
router.post(
  '/tenants/:uuid/users/:userId/phone-setup/preview',
  validateRequestOrigin,
  requireTenantAccess('COMPANY_ADMIN'),
  wrap(ctrl.previewPhoneSetup),
);

// ==========================================
// PROVISION SIP PHONE
// ==========================================

// Creates/associates Wazo SIP resources.
router.post(
  '/tenants/:uuid/users/:userId/phone-setup',
  validateRequestOrigin,
  requireTenantAccess('COMPANY_ADMIN'),
  wrap(ctrl.provisionPhone),
);

module.exports = router;
