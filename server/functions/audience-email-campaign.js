const { json } = require('./_supabase');
const { requireAdmin, parseBody, clean, escapeHtml, token, publicAppUrl } = require('./_audience');

function configured() {
  return !!(process.env.RESEND_API_KEY && process.env.FUSE_EMAIL_FROM);
}

function mailHtml(campaign, contact, unsubscribeUrl) {
  const greeting = contact.first_name ? `Hi ${escapeHtml(contact.first_name)},` : 'Hi,';
  const body = escapeHtml(campaign.body || '').replace(/\n/g, '<br>');
  const action = campaign.action_url
    ? `<p style="margin:28px 0"><a href="${escapeHtml(campaign.action_url)}" style="display:inline-block;background:#dfff4e;color:#001012;border-radius:8px;padding:13px 18px;font-weight:800;text-decoration:none">${escapeHtml(campaign.action_label || 'Open Fuse Atelier')}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f5f7f5;color:#10221e;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#001012;color:#fff;padding:28px;border-radius:20px 20px 0 0"><strong style="letter-spacing:.1em">FUSE ATELIER</strong></div><main style="background:#fff;padding:30px;border:1px solid #dce4df;border-top:0;border-radius:0 0 20px 20px;font-size:16px;line-height:1.6"><p>${greeting}</p><p>${body}</p>${action}<hr style="border:0;border-top:1px solid #e6ece8;margin:30px 0 18px"><p style="font-size:12px;color:#63736b">You’re receiving this because you registered for Ria’s Phone-to-Client class or requested a Fuse Atelier resource. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#1b4c52">Unsubscribe from Fuse emails</a>.</p></main></div></body></html>`;
}

async function createUnsubscribeTokens(db, contacts) {
  const ids = contacts.map(row => row.id);
  const { data: existing, error } = await db.from('audience_unsubscribe_tokens')
    .select('contact_id, token').eq('channel', 'email').is('used_at', null).in('contact_id', ids);
  if (error) throw error;
  const byContact = new Map((existing || []).map(row => [row.contact_id, row.token]));
  const missing = contacts.filter(row => !byContact.has(row.id)).map(row => ({ contact_id: row.id, channel: 'email', token: token() }));
  if (missing.length) {
    const { data: created, error: createError } = await db.from('audience_unsubscribe_tokens').insert(missing).select('contact_id, token');
    if (createError) throw createError;
    for (const row of created || []) byContact.set(row.contact_id, row.token);
  }
  return byContact;
}

async function resendBatch(items, key) {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `fuse-audience/${items[0].campaignId}/${items[0].batch}` },
    body: JSON.stringify(items.map(item => ({ from: item.from, to: [item.email], subject: item.subject, html: item.html, reply_to: item.replyTo || undefined, tags: [{ name: 'campaign_id', value: item.campaignId }, { name: 'recipient_id', value: item.recipientId }] })))
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || 'Resend could not send this batch.');
  return payload;
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
    return json(200, { ok: true, configured: configured(), sender: process.env.FUSE_EMAIL_FROM || null, campaigns: data || [] });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const input = parseBody(event);
  if (input.action === 'create') {
    const name = clean(input.name, 140);
    const subject = clean(input.subject, 220);
    const body = clean(input.body, 9000);
    const actionUrl = clean(input.actionUrl, 2000);
    const kind = ['marketing', 'repermission', 'transactional'].includes(input.kind) ? input.kind : 'marketing';
    if (!name || !subject || !body) return json(400, { error: 'Campaign name, subject and message are required.' });
    if (actionUrl && !/^https:\/\//i.test(actionUrl)) return json(400, { error: 'Your action link must start with https://.' });
    const { data, error } = await db.from('audience_campaigns').insert({
      name, channel: 'email', campaign_kind: kind, status: 'draft', subject, body,
      action_url: actionUrl || null, sender_name: clean(input.senderName, 100) || null,
      sender_email: process.env.FUSE_EMAIL_FROM || null
    }).select().single();
    if (error) return json(500, { error: 'Could not create this draft.' });
    return json(201, { ok: true, campaign: data });
  }

  const campaignId = clean(input.campaignId, 100);
  const { data: campaign, error: campaignError } = await db.from('audience_campaigns').select('*').eq('id', campaignId).eq('channel', 'email').maybeSingle();
  if (campaignError || !campaign) return json(404, { error: 'Email campaign not found.' });
  if (!configured()) return json(409, { error: 'Add RESEND_API_KEY and FUSE_EMAIL_FROM in Vercel before sending.' });

  if (input.action === 'send_test') {
    const email = clean(input.email, 320).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Enter a valid test email.' });
    const html = mailHtml(campaign, { first_name: 'Ria' }, `${publicAppUrl()}/api/audience-unsubscribe?token=test`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.FUSE_EMAIL_FROM, to: [email], subject: `[TEST] ${campaign.subject}`, html, reply_to: process.env.FUSE_EMAIL_REPLY_TO || undefined })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json(502, { error: payload.message || 'Resend rejected the test email.' });
    return json(200, { ok: true, message: 'Test email sent.' });
  }

  if (input.action !== 'send') return json(400, { error: 'Unknown campaign action.' });
  if (input.confirmation !== `SEND ${campaign.id}`) return json(400, { error: `Type SEND ${campaign.id} exactly to launch this campaign.` });
  if (campaign.status !== 'draft') return json(409, { error: 'This campaign has already been sent or is no longer a draft.' });

  const { data: contacts, error: contactsError } = await db.from('audience_contacts')
    .select('id, first_name, email_normalized, email_marketing_status')
    .not('email_normalized', 'is', null)
    .neq('email_marketing_status', 'unsubscribed')
    .limit(1000);
  if (contactsError) return json(500, { error: 'Could not prepare recipients.' });
  const { data: suppressed } = await db.from('audience_suppressions').select('identifier').eq('channel', 'email');
  const suppressedSet = new Set((suppressed || []).map(row => String(row.identifier).toLowerCase()));
  const eligibleByConsent = campaign.campaign_kind === 'repermission'
    ? (contacts || [])
    : (contacts || []).filter(row => row.email_marketing_status === 'subscribed');
  const recipients = eligibleByConsent.filter(row => !suppressedSet.has(String(row.email_normalized).toLowerCase()));
  if (!recipients.length) return json(409, { error: 'There are no eligible email contacts.' });

  const { error: recipientError } = await db.from('audience_campaign_recipients').upsert(
    recipients.map(row => ({ campaign_id: campaign.id, contact_id: row.id, status: 'pending' })),
    { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true }
  );
  if (recipientError) return json(500, { error: 'Could not prepare the campaign recipients.' });
  const { data: prepared } = await db.from('audience_campaign_recipients').select('id, contact_id')
    .eq('campaign_id', campaign.id).in('contact_id', recipients.map(row => row.id));
  const recipientIdByContact = new Map((prepared || []).map(row => [row.contact_id, row.id]));
  const tokens = await createUnsubscribeTokens(db, recipients);
  const from = campaign.sender_email || process.env.FUSE_EMAIL_FROM;
  const batches = [];
  for (let i = 0; i < recipients.length; i += 100) batches.push(recipients.slice(i, i + 100));
  const sentIds = [];
  const failed = [];
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    try {
      await resendBatch(batch.map(contact => ({
        campaignId: campaign.id, batch: index + 1, recipientId: recipientIdByContact.get(contact.id), email: contact.email_normalized,
        from, replyTo: process.env.FUSE_EMAIL_REPLY_TO, subject: campaign.subject,
        html: mailHtml(campaign, contact, `${publicAppUrl()}/api/audience-unsubscribe?token=${tokens.get(contact.id)}`)
      })), process.env.RESEND_API_KEY);
      sentIds.push(...batch.map(row => recipientIdByContact.get(row.id)));
    } catch (error) {
      failed.push({ index: index + 1, message: error.message });
    }
  }
  if (sentIds.length) await db.from('audience_campaign_recipients').update({ status: 'sent', sent_at: new Date().toISOString() }).in('id', sentIds);
  await db.from('audience_campaigns').update({ status: failed.length ? 'partially_sent' : 'sent', updated_at: new Date().toISOString() }).eq('id', campaign.id);
  return json(200, { ok: true, sent: sentIds.length, failed });
};
