const { json } = require('./_supabase');
const { requireAdmin, parseBody, clean, publicAppUrl } = require('./_audience');
const { configured, mailHtml, deliverCampaign } = require('./_audience-email');

function parseScheduledFor(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  return date.toISOString();
}

async function recentDeliveryLog(db, campaigns) {
  const ids = campaigns.map(item => item.id);
  if (!ids.length) return [];
  const { data, error } = await db.from('audience_campaign_recipients')
    .select('id, campaign_id, status, sent_at, contact_id, audience_contacts(first_name, email_normalized)')
    .in('campaign_id', ids).order('sent_at', { ascending: false, nullsFirst: false }).limit(500);
  if (error) throw error;
  return data || [];
}

exports.handler = async event => {
  const access = await requireAdmin(event);
  if (access.error) return access.error;
  const { db } = access;

  if (event.httpMethod === 'GET') {
    const { data, error } = await db.from('audience_campaigns')
      .select('id, name, channel, campaign_kind, status, subject, body, action_url, sender_name, sender_email, scheduled_for, created_at')
      .eq('channel', 'email').order('created_at', { ascending: false }).limit(50);
    if (error) return json(500, { error: 'Could not load email campaigns.' });
    let deliveries = [];
    try { deliveries = await recentDeliveryLog(db, data || []); } catch (_) {}
    return json(200, { ok: true, configured: configured(), sender: process.env.FUSE_EMAIL_FROM || null, campaigns: data || [], deliveries });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const input = parseBody(event);
  if (input.action === 'create') {
    const name = clean(input.name, 140);
    const subject = clean(input.subject, 220);
    const body = clean(input.body, 9000);
    const actionUrl = clean(input.actionUrl, 2000);
    const kind = ['marketing', 'repermission', 'transactional'].includes(input.kind) ? input.kind : 'marketing';
    const scheduledFor = parseScheduledFor(input.scheduledFor);
    if (!name || !subject || !body) return json(400, { error: 'Campaign name, subject and message are required.' });
    if (input.scheduledFor && !scheduledFor) return json(400, { error: 'Choose a future date and time to schedule this email.' });
    if (actionUrl && !/^https:\/\//i.test(actionUrl)) return json(400, { error: 'Your action link must start with https://.' });
    const { data, error } = await db.from('audience_campaigns').insert({
      name, channel: 'email', campaign_kind: kind, status: scheduledFor ? 'scheduled' : 'draft', subject, body,
      action_url: actionUrl || null, scheduled_for: scheduledFor, sender_name: clean(input.senderName, 100) || null,
      sender_email: process.env.FUSE_EMAIL_FROM || null
    }).select().single();
    if (error) return json(500, { error: 'Could not create this draft.' });
    return json(201, { ok: true, campaign: data, message: scheduledFor ? 'Email scheduled.' : 'Draft saved.' });
  }

  const campaignId = clean(input.campaignId, 100);
  const { data: campaign, error: campaignError } = await db.from('audience_campaigns').select('*').eq('id', campaignId).eq('channel', 'email').maybeSingle();
  if (campaignError || !campaign) return json(404, { error: 'Email campaign not found.' });

  if (input.action === 'update') {
    if (!['draft', 'scheduled', 'paused', 'cancelled'].includes(campaign.status)) return json(409, { error: 'Sent or active emails cannot be edited.' });
    const name = clean(input.name, 140);
    const subject = clean(input.subject, 220);
    const body = clean(input.body, 9000);
    const actionUrl = clean(input.actionUrl, 2000);
    const kind = ['marketing', 'repermission', 'transactional'].includes(input.kind) ? input.kind : 'marketing';
    const scheduledFor = parseScheduledFor(input.scheduledFor);
    if (!name || !subject || !body) return json(400, { error: 'Campaign name, subject and message are required.' });
    if (input.scheduledFor && !scheduledFor) return json(400, { error: 'Choose a future date and time to schedule this email.' });
    if (actionUrl && !/^https:\/\//i.test(actionUrl)) return json(400, { error: 'Your action link must start with https://.' });
    const { data, error } = await db.from('audience_campaigns').update({
      name, subject, body, action_url: actionUrl || null, campaign_kind: kind,
      scheduled_for: scheduledFor, status: scheduledFor ? 'scheduled' : 'draft',
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id).select().single();
    if (error) return json(500, { error: 'Could not save your changes.' });
    return json(200, { ok: true, campaign: data, message: scheduledFor ? 'Scheduled email updated.' : 'Draft updated.' });
  }

  if (!configured()) return json(409, { error: 'Add RESEND_API_KEY and FUSE_EMAIL_FROM in Vercel before sending.' });

  if (input.action === 'send_test') {
    const email = clean(input.email, 320).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Enter a valid test email.' });
    const html = mailHtml(campaign, { first_name: 'Ria' }, `${publicAppUrl()}/api/audience-unsubscribe?test=1`, `${publicAppUrl()}/api/audience-subscribe?test=1`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.FUSE_EMAIL_FROM, to: [email], subject: `[TEST] ${campaign.subject}`, html, reply_to: process.env.FUSE_EMAIL_REPLY_TO || undefined })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json(502, { error: payload.message || 'Resend rejected the test email.' });
    return json(200, { ok: true, message: 'Test email sent.' });
  }

  if (input.action === 'cancel_schedule') {
    if (campaign.status !== 'scheduled') return json(409, { error: 'Only scheduled emails can be cancelled.' });
    const { error } = await db.from('audience_campaigns').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', campaign.id).eq('status', 'scheduled');
    if (error) return json(500, { error: 'Could not cancel this scheduled email.' });
    return json(200, { ok: true, message: 'Scheduled email cancelled.' });
  }

  if (input.action !== 'send') return json(400, { error: 'Unknown campaign action.' });
  if (input.confirmation !== `SEND ${campaign.id}`) return json(400, { error: `Type SEND ${campaign.id} exactly to launch this campaign.` });
  if (campaign.status !== 'draft') return json(409, { error: 'This campaign is no longer a draft.' });

  const { data: claimed, error: claimError } = await db.from('audience_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaign.id).eq('status', 'draft').select().maybeSingle();
  if (claimError || !claimed) return json(409, { error: 'This campaign is already being processed.' });
  try {
    const result = await deliverCampaign(db, claimed);
    return json(200, { ok: true, ...result });
  } catch (error) {
    await db.from('audience_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', campaign.id);
    return json(500, { error: error.message || 'Could not launch this campaign.' });
  }
};