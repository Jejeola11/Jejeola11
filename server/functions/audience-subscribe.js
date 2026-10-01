const { admin } = require('./_supabase');
const { clean, escapeHtml } = require('./_audience');
const { sendWelcome } = require('./_audience-email');

function page(title, copy) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }, body: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#001012;color:#fff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px"><main style="width:min(520px,100%);padding:32px;border:1px solid #315456;border-radius:20px;background:#062125"><div style="color:#dfff4e;font-weight:800;letter-spacing:.12em">FUSE ATELIER</div><h1>${escapeHtml(title)}</h1><p style="color:#d5e2dd;line-height:1.6">${escapeHtml(copy)}</p></main></body></html>` };
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed.' };
  if (event.queryStringParameters && event.queryStringParameters.test === '1') {
    return page('Test link works.', 'In a real email, this button will safely add that recipient to Fuse updates. This test did not change any subscription.');
  }
  const value = clean(event.queryStringParameters && event.queryStringParameters.token, 200);
  if (!value) return page('That link is incomplete.', 'Please use the link from the email you received.');
  const db = admin();
  const { data: item } = await db.from('audience_unsubscribe_tokens').select('contact_id, channel').eq('token', value).maybeSingle();
  if (!item || item.channel !== 'email') return page('That link has expired.', 'Please use a more recent Fuse Atelier email.');
  const { data: contact } = await db.from('audience_contacts').select('id, first_name, email_normalized, email_marketing_status').eq('id', item.contact_id).maybeSingle();
  if (!contact || !contact.email_normalized) return page('That link has expired.', 'Please use a more recent Fuse Atelier email.');
  const { data: newlyOptedIn, error } = await db.from('audience_contacts')
    .update({ email_marketing_status: 'subscribed', email_opted_in_at: new Date().toISOString(), email_opted_out_at: null })
    .eq('id', contact.id).neq('email_marketing_status', 'subscribed')
    .select('id, first_name, email_normalized').maybeSingle();
  if (error) return page('Something went wrong.', 'Please try the link again in a moment.');
  if (newlyOptedIn) {
    try { await sendWelcome(db, newlyOptedIn); } catch (welcomeError) { console.error('Fuse welcome email failed', welcomeError.message); }
  }
  return page('You’re on the Fuse list.', 'You’ll receive future Fuse Atelier updates, resources and offers. You can unsubscribe at any time from an email footer.');
};