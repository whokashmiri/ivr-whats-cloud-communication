const router = require('express').Router();
const controller = require('../controller/department.controller');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const { requireTenantAccess } = require('../middleware/tenant-access');
const { validateRequestOrigin } = require('../middleware/validate-request-origin');

router.use(authenticate);

router.get('/tenants/:uuid/departments',
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.list));
router.get('/tenants/:uuid/departments/:queueId',
  requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.get));
router.post('/tenants/:uuid/departments',
  validateRequestOrigin, requireTenantAccess('COMPANY_ADMIN'), wrap(controller.create));
router.post('/tenants/:uuid/departments/:queueId/members',
  validateRequestOrigin, requireTenantAccess('COMPANY_ADMIN'), wrap(controller.addMember));
router.post('/tenants/:uuid/departments/:queueId/extension',
  validateRequestOrigin, requireTenantAccess('COMPANY_ADMIN'), wrap(controller.setupExtension));

module.exports = router;
