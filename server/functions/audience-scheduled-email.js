const { admin, json } = require('./_supabase');
const { configured, deliverCampaign } = require('./_audience-email');

function authorized(event) {
  const secret = process.env.CRON_SECRET;
  return !!secret && event.headers && event.headers.authorization === `Bearer ${secret}`;
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  if (!authorized(event)) return json(401, { error: 'Unauthorized.' });
  if (!configured()) return json(503, { error: 'Email sending is not configured.' });

  const db = admin();
  const now = new Date().toISOString();
  const { data: due, error } = await db.from('audience_campaigns')
    .select('*').eq('channel', 'email').eq('status', 'scheduled')
    .lte('scheduled_for', now).order('scheduled_for', { ascending: true }).limit(10);
  if (error) return json(500, { error: 'Could not load scheduled email.' });

  const results = [];
  for (const campaign of due || []) {
    const { data: claimed, error: claimError } = await db.from('audience_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', campaign.id).eq('status', 'scheduled').select().maybeSingle();
    if (claimError || !claimed) continue;
    try {
      const result = await deliverCampaign(db, claimed);
      results.push({ id: campaign.id, ...result });
    } catch (sendError) {
      await db.from('audience_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', campaign.id);
      results.push({ id: campaign.id, error: sendError.message || 'Scheduled send failed.' });
    }
  }
  return json(200, { ok: true, checked: (due || []).length, results });
};