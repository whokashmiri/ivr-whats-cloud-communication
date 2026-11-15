


//server/integrations/meta/meta.client.js

const { decryptedToken } = require('../../utils/wa-security');
const VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
async function send(channel, to, payload) {
  const response = await fetch(`https://graph.facebook.com/${VERSION}/${encodeURIComponent(channel.phoneNumberId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decryptedToken(channel)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...payload }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(`Meta API ${response.status}: ${data.error?.message || 'Unknown error'}`);
    err.status = response.status;
    throw err;
  }
  return data.messages?.[0]?.id || null;
}
const sendText = (channel, to, text) => send(channel, to, { type: 'text', text: { body: text.slice(0, 4096) } });
const sendTemplate = (channel, to, name, params = []) => send(channel, to, {
  type: 'template', template: { name, language: { code: process.env.WA_NOTIFICATION_LANGUAGE || 'en_US' },
    ...(params.length ? { components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: String(text) })) }] } : {}) },
});
const sendMenu = (channel, to, departments) => {
  if (departments.length > 10) throw new Error('Meta list supports at most 10 departments');
  return send(channel, to, { type: 'interactive', interactive: { type: 'list', body: { text: 'Select a department to contact:' },
    action: { button: 'Departments', sections: [{ title: 'Teams', rows: departments.map(d => ({ id: `dept:${d.code}`, title: d.name.slice(0, 24) })) }] } } });
};
module.exports = { sendText, sendTemplate, sendMenu };
