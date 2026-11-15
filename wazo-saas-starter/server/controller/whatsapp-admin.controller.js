'use strict';
const prisma = require('../config/prisma');
const { encryptedToken, phone } = require('../utils/wa-security');
const wazo = require('../integrations/wazo/whatsapp-team.adapter');
const digits = v => typeof v === 'string' && /^\d{5,30}$/.test(v);
const validCode = v => typeof v === 'string' && /^[a-z0-9_-]{1,30}$/.test(v);

async function getOrg(organizationId) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org || org.status !== 'ACTIVE' || !org.wazoTenantUuid) throw new Error('Organization must be active and provisioned with Wazo');
  return org;
}
async function connect(req, res, next) {
  try {
    const organizationId = req.params.organizationId;
    const { phoneNumberId, wabaId, accessToken, displayNumber } = req.body || {};
    await getOrg(organizationId);
    if (!digits(phoneNumberId) || !digits(wabaId) || typeof accessToken !== 'string' || accessToken.length < 20) {
      return res.status(400).json({ error: 'Valid phoneNumberId, wabaId and accessToken required' });
    }
    const existing = await prisma.waChannel.findUnique({ where: { phoneNumberId } });
    if (existing && existing.organizationId !== organizationId) return res.sendStatus(409);
    // Graph asset-ownership verification is required before public self-service launch.
    const data = { wabaId, displayNumber: typeof displayNumber === 'string' ? displayNumber : null,
      ...encryptedToken(accessToken), enabled: true };
    const channel = await prisma.waChannel.upsert({ where: { phoneNumberId },
      create: { ...data, organizationId, phoneNumberId }, update: data });
    return res.json({ id: channel.id, phoneNumberId, wabaId, enabled: channel.enabled });
  } catch (e) { next(e); }
}
async function addDepartment(req, res, next) {
  try {
    const { channelId, externalDepartmentId, code } = req.body || {};
    const organizationId = req.params.organizationId;
    const channel = await prisma.waChannel.findFirst({ where: { id: channelId, organizationId } });
    if (!channel) return res.sendStatus(404);
    if (!validCode(code)) return res.status(400).json({ error: 'Invalid department code' });
    const queue = await wazo.getQueue(await getOrg(organizationId), externalDepartmentId);
    const row = await prisma.waDepartment.upsert({
      where: { channelId_externalDepartmentId: { channelId, externalDepartmentId: String(queue.id) } },
      create: { channelId, externalDepartmentId: String(queue.id), name: queue.label || queue.name, code },
      update: { name: queue.label || queue.name, code, enabled: true },
    });
    return res.json(row);
  } catch (e) { next(e); }
}
async function addMember(req, res, next) {
  try {
    const { channelId, wazoUserId, departmentCode, personalWhatsApp, optedIn } = req.body || {};
    const organizationId = req.params.organizationId;
    const channel = await prisma.waChannel.findFirst({ where: { id: channelId, organizationId } });
    if (!channel) return res.sendStatus(404);
    if (optedIn !== true) return res.status(400).json({ error: 'Employee opt-in required' });
    let department = null;
    if (departmentCode != null) {
      if (!validCode(departmentCode)) return res.sendStatus(400);
      department = await prisma.waDepartment.findUnique({ where: { channelId_code: { channelId, code: departmentCode } } });
      if (!department?.enabled) return res.status(400).json({ error: 'Department is not configured' });
    }
    const org = await getOrg(organizationId);
    const user = await wazo.validateMember(org, wazoUserId, department?.externalDepartmentId ?? null);
    let normalized;
    try { normalized = phone(personalWhatsApp); } catch (e) { return res.status(400).json({ error: e.message }); }
    const row = await prisma.waMember.upsert({
      where: { channelId_wazoUserId: { channelId, wazoUserId: Number(user.id) } },
      create: { channelId, wazoUserId: Number(user.id), departmentCode: departmentCode || null, phone: normalized, optedIn: true, optInAt: new Date() },
      update: { departmentCode: departmentCode || null, phone: normalized, optedIn: true, optInAt: new Date(), enabled: true },
    });
    return res.json({ id: row.id, wazoUserId: row.wazoUserId, departmentCode: row.departmentCode, phone: row.phone });
  } catch (e) { next(e); }
}
async function list(req, res, next) {
  try {
    const data = await prisma.waChannel.findMany({ where: { organizationId: req.params.organizationId },
      select: { id: true, phoneNumberId: true, wabaId: true, displayNumber: true, enabled: true,
        departments: true, members: { select: { id: true, wazoUserId: true, departmentCode: true, phone: true, optedIn: true, enabled: true } } } });
    return res.json(data);
  } catch (e) { next(e); }
}
module.exports = { connect, addDepartment, addMember, list };
