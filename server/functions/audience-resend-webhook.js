const crypto = require('crypto');
const { admin, json } = require('./_supabase');

function header(headers, name) {
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function validSignature(rawBody, headers) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').replace(/^whsec_/, '');
  const id = header(headers, 'svix-id');
  const timestamp = header(headers, 'svix-timestamp');
  const signatures = String(header(headers, 'svix-signature')).split(' ').map(item => item.trim().replace(/^v1,/, '')).filter(Boolean);
  if (!secret || !id || !timestamp || !signatures.length) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(id + '.' + timestamp + '.' + rawBody).digest('base64');
  return signatures.some(signature => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function statusFor(type) {
  if (type === 'email.delivered') return 'delivered';
  if (type === 'email.opened') return 'opened';
  if (type === 'email.clicked') return 'clicked';
  if (['email.bounced', 'email.failed', 'email.suppressed', 'email.complained'].includes(type)) return 'failed';
  return 'queued';
}

function failureFor(payload) {
  const data = payload.data || {};
  return (data.bounce && data.bounce.message) || (data.error && data.error.message) || data.reason || null;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const raw = typeof event.body === 'string' ? event.body : '';
  if (!validSignature(raw, event.headers || {})) return json(401, { error: 'Invalid webhook signature.' });
  let payload;
  try { payload = JSON.parse(raw); } catch (_) { return json(400, { error: 'Invalid JSON.' }); }
  const eventId = header(event.headers || {}, 'svix-id');
  const type = String(payload.type || '');
  const emailId = payload.data && payload.data.email_id;
  if (!type || !emailId) return json(200, { ok: true, ignored: true });

  const db = admin();
  const { data: seen } = await db.from('audience_message_events').select('id').eq('provider_event_id', eventId).maybeSingle();
  if (seen) return json(200, { ok: true, duplicate: true });

  const { data: recipients, error } = await db.from('audience_campaign_recipients')
    .select('id').eq('provider_message_id', emailId);
  if (error) throw error;

  const now = payload.created_at || new Date().toISOString();
  const status = statusFor(type);
  const updates = { status };
  if (status === 'delivered') updates.delivered_at = now;
  if (status === 'opened') updates.opened_at = now;
  if (status === 'clicked') updates.clicked_at = now;
  if (status === 'failed') updates.failure_reason = failureFor(payload) || 'Email provider reported a delivery failure.';

  for (const recipient of recipients || []) {
    await db.from('audience_campaign_recipients').update(updates).eq('id', recipient.id);
    await db.from('audience_message_events').insert({
      campaign_recipient_id: recipient.id,
      event_type: type,
      provider_event_id: eventId,
      payload
    });
  }
  console.info('[Audience email] Resend delivery event', { type, emailId, recipients: (recipients || []).length });
  return json(200, { ok: true });
};
