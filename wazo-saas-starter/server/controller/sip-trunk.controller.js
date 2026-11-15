
const service = require('../service/sip-trunk.service');

module.exports = {
  async list(req, res) {
    res.json(await service.list(req.params.uuid));
  },

  async get(req, res) {
    res.json(
      await service.get(
        req.params.uuid,
        req.params.id
      )
    );
  },

  async createLocalTest(req, res) {
    const result = await service.createLocalTest(
      req.params.uuid
    );

    res.status(201).json(result);
  },

  async activate(req, res) {
    res.json(
      await service.activate(
        req.params.uuid,
        req.params.id
      )
    );
  },
};
