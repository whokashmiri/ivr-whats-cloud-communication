
const service = require('../service/phone-number.service');

module.exports = {
  async list(req, res) {
    res.json(await service.list(req.params.uuid));
  },

  async get(req, res) {
    res.json(
      await service.get(req.params.uuid, req.params.id)
    );
  },

  async create(req, res) {
    const result = await service.create(
      req.params.uuid,
      req.body
    );

    res.status(result.created ? 201 : 200).json(result);
  },


async activate(req, res) {
  const result = await service.activate(
    req.params.uuid,
    req.params.id
  );

  res.json(result);
},


};


