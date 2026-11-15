const router = require('express').Router();
const controller = require('../controller/ivr.controller');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const { requireTenantAccess } = require('../middleware/tenant-access');
const { validateRequestOrigin } = require('../middleware/validate-request-origin');

router.use(authenticate);
router.get('/tenants/:uuid/ivrs', requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.list));
router.get('/tenants/:uuid/ivrs/:ivrId', requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.get));
router.post('/tenants/:uuid/ivrs', validateRequestOrigin, requireTenantAccess('COMPANY_ADMIN'), wrap(controller.create));

module.exports = router;
