const router = require('express').Router();
const multer = require('multer');
const controller = require('../controller/ivr-audio.controller');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/authenticate');
const { requireTenantAccess } = require('../middleware/tenant-access');
const { validateRequestOrigin } = require('../middleware/validate-request-origin');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

router.use(authenticate);
router.get('/tenants/:uuid/ivr/audio', requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.list));
router.get('/tenants/:uuid/ivr/audio/:audioId/file', requireTenantAccess('COMPANY_ADMIN', 'SUPERVISOR'), wrap(controller.preview));
router.post('/tenants/:uuid/ivr/audio', validateRequestOrigin, requireTenantAccess('COMPANY_ADMIN'), upload.single('file'), wrap(controller.upload));

module.exports = router;
