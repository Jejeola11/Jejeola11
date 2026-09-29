const { admin } = require('./_supabase');
const { clean, escapeHtml } = require('./_audience');

function page(title, copy) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#001012;color:#fff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px"><main style="width:min(520px,100%);padding:32px;border:1px solid #315456;border-radius:20px;background:#062125"><div style="color:#dfff4e;font-weight:800;letter-spacing:.12em">FUSE ATELIER</div><h1>${escapeHtml(title)}</h1><p style="color:#d5e2dd;line-height:1.6">${escapeHtml(copy)}</p></main></body></html>` };
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed.' };
  const value = clean(event.queryStringParameters && event.queryStringParameters.token, 200);
  if (!value) return page('That link is incomplete.', 'Please use the unsubscribe link from the email you received.');
  const db = admin();
  const { data: item } = await db.from('audience_unsubscribe_tokens').select('id, contact_id, channel, used_at').eq('token', value).maybeSingle();
  if (!item || item.channel !== 'email') return page('That link has expired.', 'You are already safe from future marketing emails, or this link is no longer active.');
  if (!item.used_at) await db.from('audience_unsubscribe_tokens').update({ used_at: new Date().toISOString() }).eq('id', item.id);
  await db.from('audience_contacts').update({ email_marketing_status: 'unsubscribed', email_opted_out_at: new Date().toISOString() }).eq('id', item.contact_id);
  const { data: contact } = await db.from('audience_contacts').select('email_normalized').eq('id', item.contact_id).maybeSingle();
  if (contact && contact.email_normalized) {
    const { data: existing } = await db.from('audience_suppressions').select('id').eq('channel', 'email').eq('identifier', contact.email_normalized).maybeSingle();
    if (!existing) await db.from('audience_suppressions').insert({ channel: 'email', identifier: contact.email_normalized, reason: 'unsubscribe_link' });
  }
  return page('You’re unsubscribed.', 'Fuse Atelier will no longer send marketing emails to this address.');
};
