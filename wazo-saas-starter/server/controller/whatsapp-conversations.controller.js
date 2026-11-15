'use strict';
const prisma = require('../config/prisma');

async function getChannel(req, channelId) {
  if (!channelId || channelId.length > 128) return null;
  return prisma.waChannel.findFirst({
    where: { id: channelId, organizationId: req.params.organizationId },
    select: { id: true },
  });
}
async function listConversations(req, res, next) {
  try {
    const channelId = String(req.query.channelId || '');
    if (!channelId || channelId.length > 128) return res.status(400).json({ error: 'Invalid channelId' });
    const channel = await getChannel(req, channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const page = Number(req.query.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return res.status(400).json({ error: 'Invalid page' });
    const pageSize = 20;
    const where = { channelId: channel.id };
    const [total, rows] = await prisma.$transaction([
      prisma.waConversation.count({ where }),
      prisma.waConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, channelId: true, customerPhone: true, departmentCode: true,
          status: true, assignedWazoUserId: true, createdAt: true, updatedAt: true,
          inbound: {
            orderBy: { createdAt: 'desc' }, take: 1,
            select: { messageText: true, createdAt: true },
          },
        },
      }),
    ]);
    return res.json({ items: rows.map(({ inbound, ...row }) => ({
      ...row, lastMessage: inbound[0]?.messageText || null,
    })), total, page, pageSize });
  } catch (error) { next(error); }
}
async function listMessages(req, res, next) {
  try {
    const channelId = String(req.query.channelId || '');
    const channel = await getChannel(req, channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const conversation = await prisma.waConversation.findFirst({
      where: { id: req.params.conversationId, channelId: channel.id },
      select: { id: true, customerPhone: true, channelId: true },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const limit = 100;
    const rows = await prisma.waInbound.findMany({
      where: { conversationId: conversation.id, channelId: channel.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit,
      select: { id: true, providerMessageId: true, senderPhone: true,
        messageText: true, createdAt: true, payload: true },
    });
    const messages = rows.reverse().map(({ payload, ...row }) => {
      const text = row.messageText || '';
      const staffReply = row.senderPhone !== conversation.customerPhone &&
        /^\s*REPLY\s+[a-z0-9]{10,40}\s+/i.test(text);
      return {
        id: row.id, providerMessageId: row.providerMessageId,
        direction: staffReply ? 'OUTBOUND' : row.senderPhone === conversation.customerPhone ? 'INBOUND' : 'STAFF',
        senderPhone: row.senderPhone,
        text: staffReply ? text.replace(/^\s*REPLY\s+[a-z0-9]{10,40}\s+/i, '') : text || '[Non-text message]',
        createdAt: row.createdAt,
      };
    });
    return res.json({ items: messages, limit, hasMore: rows.length === limit });
  } catch (error) { next(error); }
}
module.exports = { listConversations, listMessages };
