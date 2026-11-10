const crypto = require('crypto');
const { admin, json } = require('./_supabase');
const { configured, deliverCampaign } = require('./_audience-email');
const { configured: senderConfigured, syncMaster, deliverSenderCampaign, reconcileSenderCampaign } = require('./_audience-sender');

const OIDC_AUDIENCE = 'fuse-audience-scheduler';
const OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const REPOSITORY = 'Jejeola11/Jejeola11';

function decodeSegment(segment) {
  return JSON.parse(Buffer.from(String(segment || ''), 'base64url').toString('utf8'));
}

async function authorized(event) {
  const authorization = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const value = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  // Production Vercel Cron uses a dedicated secret; GitHub Actions uses signed OIDC.
  const secret = process.env.CRON_SECRET || '';
  if(secret && value.length === secret.length &&
     crypto.timingSafeEqual(Buffer.from(value),Buffer.from(secret))) return true;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = decodeSegment(parts[0]);
    const claims = decodeSegment(parts[1]);
    const allowedEvent = claims.event_name === 'schedule' || claims.event_name === 'workflow_dispatch';
    if (header.alg !== 'RS256' || !header.kid || claims.iss !== OIDC_ISSUER || claims.aud !== OIDC_AUDIENCE || claims.repository !== REPOSITORY || !allowedEvent) return false;
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
  if (!configured() && !senderConfigured()) return json(503, { error: 'Email sending is not configured.' });

  const db = admin();
  let senderSync = null;
  if (senderConfigured()) {
    try { senderSync = await syncMaster(db,20); }
    catch (err) { senderSync = {error:err.message}; console.error('[Sender scheduler sync]',err.message); }
  }
  // Re-check campaigns that Sender may have completed after an API timeout.
  // This only calls GET /campaigns/{id} on Sender; no email is sent here.
  const senderReports=[];
  if(senderConfigured()){
    const {data:tracked,error:trackedError}=await db.from('audience_campaigns')
      .select('id,status,audience_filter').eq('channel','email')
      .in('status',['paused','sending','sent']).order('updated_at',{ascending:false}).limit(20);
    if(trackedError)return json(500,{error:'Unable to inspect saved Sender campaign statuses.'});
    for(const campaign of tracked||[]){
      if(campaign.audience_filter?.provider!=='sender'||campaign.audience_filter?.archived===true||!campaign.audience_filter?.sender_campaign_id)continue;
      try { senderReports.push(await reconcileSenderCampaign(db,campaign)); }
      catch(err){senderReports.push({fuseCampaignId:campaign.id,error:String(err.message||err).slice(0,400)});}
    }
  }
  const now = new Date().toISOString();
  const { data: due, error } = await db.from('audience_campaigns')
    .select('*').eq('channel', 'email')
    // A manually launched campaign has no scheduled_for. Continue its next daily
    // batch without requiring a date, while honoring future schedules.
    .or('status.eq.sending,and(status.eq.scheduled,scheduled_for.lte.' + now + ')')
    .order('created_at', { ascending: true }).limit(10);
  if (error) return json(500, { error: 'Could not load scheduled email.' });

  const results = [];
  for (const campaign of due || []) {
    // Historical campaigns are retained for compliance but must never send again.
    if(campaign.audience_filter?.archived === true) continue;
    const { data: claimed, error: claimError } = await db.from('audience_campaigns')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', campaign.id).in('status', ['scheduled', 'sending']).select().maybeSingle();
    if (claimError || !claimed) continue;
    try {
      const result = claimed.audience_filter?.provider === 'sender'
        ? await deliverSenderCampaign(db, claimed) : await deliverCampaign(db, claimed);
      results.push({ id: campaign.id, ...result });
    } catch (sendError) {
      // Retain the verified provider error for the owner-only dashboard.
      const timestamp = new Date().toISOString();
      const { data: latest } = await db.from('audience_campaigns')
        .select('audience_filter').eq('id',campaign.id).maybeSingle();
      const filter = {...(latest?.audience_filter || claimed.audience_filter || {}),
        sender_last_error: String(sendError.message || 'Scheduled send failed.').slice(0,750),
        sender_failed_at: timestamp};
      await db.from('audience_campaigns').update({status:'paused',audience_filter:filter,updated_at:timestamp})
        .eq('id',campaign.id).eq('status','sending');
      results.push({ id: campaign.id, error: String(sendError.message || 'Scheduled send failed.').slice(0,750) });
    }
  }
  const failures=results.filter(item=>item.error);
  // Do not tell Vercel Cron / GitHub Actions that a rejected send succeeded.
  return json(failures.length?502:200, {ok:failures.length===0,senderSync,checked:(due||[]).length,failures:failures.length,results,senderReports});
};
