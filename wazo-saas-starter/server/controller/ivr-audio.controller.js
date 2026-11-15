const service = require('../service/ivr-audio.service');

module.exports = {
  async list(req, res) {
    const items = await service.listIvrAudio(req.tenantAccess.tenantUuid);
    res.json({ items, total: items.length });
  },
  async upload(req, res) {
    const result = await service.uploadIvrAudio(req.tenantAccess.tenantUuid, req.file, req.body?.name);
    res.status(201).json(result);
  },
  async preview(req, res) {
    const wav = await service.getIvrAudioFile(req.tenantAccess.tenantUuid, req.params.audioId);
    res.set('Cache-Control', 'no-store');
    res.type('audio/wav').send(wav);
  },
};
