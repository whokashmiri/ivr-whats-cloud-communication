
const service = require('../service/employee.service');
const phoneService = require('../service/phone-provisioning.service');

module.exports = {
  async list(req, res) {
    const result = await service.listUsers(
      req.tenantAccess.tenantUuid
    );

    return res.json(result);
  },

  async create(req, res) {
    const result = await service.createUser(
      req.tenantAccess.tenantUuid,
      req.body
    );

    return res.status(201).json(result);
  },

  async callingSetup(req, res) {
    const result = await service.getCallingSetup(
      req.tenantAccess.tenantUuid
    );

    return res.json(result);
  },

  async previewPhoneSetup(req, res) {
    const result = await service.previewPhoneSetup(
      req.tenantAccess.tenantUuid,
      req.params.userId,
      req.body
    );

    return res.json(result);
  },

  async provisionPhone(req, res) {
    const result = await phoneService.provisionPhone(
      req.tenantAccess.tenantUuid,
      req.params.userId,
      req.body
    );

    return res.status(201).json(result);
  },
};
