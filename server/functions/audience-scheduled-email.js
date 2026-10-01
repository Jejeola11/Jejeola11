const crypto = require('crypto');
const { admin, json } = require('./_supabase');
const { configured, deliverCampaign } = require('./_audience-email');

const OIDC_AUDIENCE = 'fuse-audience-scheduler';
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const REPOSITORY = 'Jejeola11/Jejeola11';

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(String(segment || ''), 'base64url').toString('utf8'));
}

async function authorized(event) {
  const authorization = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const value = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = decodeSegment(parts[0]);
    const claims = decodeSegment(parts[1]);
    if (header.alg !== 'RS256' || !header.kid || claims.iss !== OIDC_ISSUER || claims.aud !== OIDC_AUDIENCE || claims.repository !== REPOSITORY || claims.event_name !== 'schedule') return false;
    if (!claims.exp || (claims.exp * 1000) < Date.now()) return false;
    const configResponse = await fetch(OIDC_ISSUER + '/.well-known/openid-configuration');
    const config = await configResponse.json();
    if (!configResponse.ok || !config.jwks_uri) return false;
    const keyResponse = await fetch(config.jwks_uri);
    const keys = await keyResponse.json();
    const jwk = (keys.keys || []).find(item => item.kid === header.kid);
    if (!keyResponse.ok || !jwk) return false;
    return crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  } catch (_) {
    return false;
  }
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  if (!(await authorized(event))) return json(401, { error: 'Unauthorized.' });
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