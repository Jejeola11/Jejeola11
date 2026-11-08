const { clean, escapeHtml, token, publicAppUrl } = require('./_audience');
const { renderVisual, SEGMENTS } = require('./_audience-email-studio');

const DAILY_SEND_LIMIT = 100;

function configured() {
  return !!(process.env.RESEND_API_KEY && process.env.FUSE_EMAIL_FROM);
}

function merge(value, contact) {
  return String(value || '').replace(/{{\s*first_name\s*}}/gi, clean(contact.first_name, 80) || 'there');
}

function mailHtml(campaign, contact, unsubscribeUrl, subscribeUrl) {
  const creative = renderVisual(campaign, contact, unsubscribeUrl, subscribeUrl);
  if (creative) return creative;
  const mergedBody = merge(campaign.body, contact);
  const message = mergedBody.replace(/\n\n(?:Ria|Ria Jejeola)\n(?:Founder of Fuse Atelier|Fuse Atelier)\s*$/i, '');
  const body = escapeHtml(message).replace(/\n/g, '<br>');
  const fallbackPlaybook = campaign.campaign_kind === 'repermission' ? 'https://fuseatelier.com/pricing' : '';
  const actionUrl = campaign.action_url || fallbackPlaybook;
  const action = actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#dfff4e;color:#001012;border-radius:8px;padding:13px 18px;font-weight:800;text-decoration:none">${escapeHtml(campaign.action_label || (fallbackPlaybook ? 'See the First Client Playbook' : 'Open Fuse Atelier'))}</a></p>`
    : '';
  const permission = campaign.campaign_kind === 'repermission' && subscribeUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(subscribeUrl)}" style="display:inline-block;background:#001012;color:#fff;border-radius:8px;padding:12px 16px;font-weight:800;text-decoration:none">Yes, keep me updated</a></p>`
    : '';
  const signature = '<p style="margin:28px 0 0">Ria<br><strong>Founder of Fuse Atelier</strong></p>';
  const social = '<p style="margin:22px 0 0">I also share practical AI, skill and client-getting content on Instagram.<br><a href="https://www.instagram.com/dir.ria?stkn=bXV6ZWh6YWFhc3lz" style="color:#1b4c52;font-weight:800">@dir.ria — check it out here</a></p>';
  return `<!doctype html><html><body style="margin:0;background:#f5f7f5;color:#10221e;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#001012;color:#fff;padding:28px;border-radius:20px 20px 0 0"><strong style="letter-spacing:.1em">FUSE ATELIER</strong></div><main style="background:#fff;padding:30px;border:1px solid #dce4df;border-top:0;border-radius:0 0 20px 20px;font-size:16px;line-height:1.6"><p>${body}</p>${action}${permission}${social}${signature}<hr style="border:0;border-top:1px solid #e6ece8;margin:30px 0 18px"><p style="font-size:12px;color:#63736b">You’re receiving this because you subscribed to Fuse updates, created a Fuse Atelier account, registered for a class or requested a resource. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#1b4c52">Unsubscribe from Fuse emails</a>.</p></main></div></body></html>`;
}

function welcomeHtml(contact, unsubscribeUrl) {
  const firstName = clean(contact.first_name, 80) || 'there';
  return `<!doctype html><html><body style="margin:0;background:#f5f7f5;color:#10221e;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#001012;color:#fff;padding:28px;border-radius:20px 20px 0 0"><strong style="letter-spacing:.1em">FUSE ATELIER</strong></div><main style="background:#fff;padding:30px;border:1px solid #dce4df;border-top:0;border-radius:0 0 20px 20px;font-size:16px;line-height:1.6"><p>Hi ${escapeHtml(firstName)},</p><p>You’re in.</p><p>From here, I’ll send you practical notes on turning a skill into income: how to choose a useful skill, make proof, find businesses and pitch with confidence. No empty motivation—just useful moves you can apply.</p><p>Start with this simple path:</p><p><strong>Skill → Sample → Business → Pitch → Client</strong></p><p>You do not need to have everything figured out before you begin. You only need a clear next step.</p><p style="margin:28px 0"><a href="https://fuseatelier.com/atelier" style="display:inline-block;background:#dfff4e;color:#001012;border-radius:8px;padding:13px 18px;font-weight:800;text-decoration:none">See the Fuse Atelier path</a></p><p>I also share practical AI, skill and client-getting content on Instagram.<br><a href="https://www.instagram.com/dir.ria?stkn=bXV6ZWh6YWFhc3lz" style="color:#1b4c52;font-weight:800">@dir.ria — check it out here</a></p><p>Ria<br><strong>Founder of Fuse Atelier</strong></p><hr style="border:0;border-top:1px solid #e6ece8;margin:30px 0 18px"><p style="font-size:12px;color:#63736b">You opted in to Fuse Atelier updates. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#1b4c52">Unsubscribe from Fuse emails</a>.</p></main></div></body></html>`;
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

async function resendBatch(items) {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `fuse-audience/${items[0].campaignId}/${items[0].batch}` },
    body: JSON.stringify(items.map(item => ({ from: item.from, to: [item.email], subject: item.subject, html: item.html, reply_to: item.replyTo || undefined, tags: [{ name: 'campaign_id', value: item.campaignId }, { name: 'recipient_id', value: item.recipientId }] })))
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[Audience email] Resend batch rejected', { status: response.status, batch: items[0]?.batch, campaignId: items[0]?.campaignId, error: payload.message || payload.error || 'unknown' });
    throw new Error(payload.message || payload.error || 'Resend could not send this batch.');
  }
  const accepted = Array.isArray(payload.data) ? payload.data : [];
  console.info('[Audience email] Resend batch accepted', { campaignId: items[0]?.campaignId, batch: items[0]?.batch, requested: items.length, providerIds: accepted.filter(row => row && row.id).length });
  return { payload, accepted };
}

async function eligibleRecipients(db, campaign) {
  // Marketing sends must be permissioned, deduplicated, and suppression-aware.
  // An account registration or an unknown consent state never confers opt-in.
  const { data: rows, error } = await db.from('audience_contacts')
    .select('id,first_name,email_normalized,email_marketing_status,email_opted_in_at,email_opted_out_at')
    .eq('email_marketing_status','subscribed')
    .not('email_opted_in_at','is',null)
    .is('email_opted_out_at',null)
    .not('email_normalized','is',null).limit(2000);
  if(error)throw error;
  const { data: suppressed, error: suppressionError } = await db.from('audience_suppressions')
    .select('identifier').eq('channel','email').limit(2000);
  if(suppressionError)throw suppressionError;
  const blocked=new Set((suppressed||[]).map(x=>String(x.identifier||'').toLowerCase().trim()));
  const unique=new Map();
  for(const row of rows||[]){
    const email=String(row.email_normalized||'').toLowerCase().trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||blocked.has(email))continue;
    if(!unique.has(email))unique.set(email,{...row,email_normalized:email});
  }
  const contacts=[...unique.values()];
  const segment=SEGMENTS.includes(campaign?.audience_filter?.segment)?campaign.audience_filter.segment:'all_subscribed';
  if(segment==='all_subscribed')return contacts;
  if(segment==='influencer_prospects'||segment==='influencer_students'){
    const {data:unlocks,error:unlockErr}=await db.from('module_unlocks').select('user_id').eq('module_key','ai-influencer-course').limit(1000);
    if(unlockErr)throw unlockErr;
    const ids=[...new Set((unlocks||[]).map(x=>x.user_id))];
    let ownerEmails=new Set();
    if(ids.length){
      const {data:profiles,error:profErr}=await db.from('profiles').select('email').in('id',ids);
      if(profErr)throw profErr;
      ownerEmails=new Set((profiles||[]).map(x=>String(x.email||'').toLowerCase().trim()));
    }
    return contacts.filter(x=>segment==='influencer_students'?ownerEmails.has(x.email_normalized):!ownerEmails.has(x.email_normalized));
  }
  if(segment==='earn_prospects'){
    const {data:members,error:membersErr}=await db.from('affiliate_applications').select('email').limit(1000);
    if(membersErr)throw membersErr;
    const applied=new Set((members||[]).map(x=>String(x.email||'').toLowerCase().trim()));
    return contacts.filter(x=>!applied.has(x.email_normalized));
  }
  if(segment==='registered_subscribers'){
    const {data:profiles,error:profErr}=await db.from('profiles').select('email').limit(2000);
    if(profErr)throw profErr;
    const registered=new Set((profiles||[]).map(x=>String(x.email||'').toLowerCase().trim()));
    return contacts.filter(x=>registered.has(x.email_normalized));
  }
  if(segment==='phone_to_client'){
    const {data:leads,error:leadErr}=await db.from('phone_to_client_leads').select('email_normalized,email').limit(2000);
    if(leadErr)throw leadErr;
    const leadsSet=new Set((leads||[]).map(x=>String(x.email_normalized||x.email||'').toLowerCase().trim()));
    return contacts.filter(x=>leadsSet.has(x.email_normalized));
  }
  return contacts;
}
async function audienceSegmentCounts(db){
  const counts={};
  for(const segment of SEGMENTS){
    counts[segment]=(await eligibleRecipients(db,{audience_filter:{segment}})).length;
  }
  return counts;
}

async function deliverCampaign(db, campaign) {
  if (!configured()) throw new Error('Email sending is not configured.');
  const recipients = await eligibleRecipients(db, campaign);
  if (!recipients.length) throw new Error('There are no eligible email contacts.');
  const { error: recipientError } = await db.from('audience_campaign_recipients').upsert(
    recipients.map(row => ({ campaign_id: campaign.id, contact_id: row.id, status: 'pending' })),
    { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true }
  );
  if (recipientError) throw recipientError;
  const { data: prepared, error: preparedError } = await db.from('audience_campaign_recipients').select('id, contact_id, status')
    .eq('campaign_id', campaign.id).in('contact_id', recipients.map(row => row.id));
  if (preparedError) throw preparedError;
  // Only a webhook can prove final delivery. A queued request may still bounce,
  // be suppressed or be delayed, so do not treat it as sent on a retry.
  const pendingContactIds = new Set((prepared || []).filter(row => ['pending', 'failed'].includes(row.status)).map(row => row.contact_id));
  const remaining = recipients.filter(row => pendingContactIds.has(row.id));
  if (!remaining.length) {
    return { sent: 0, failed: [], status: campaign.status, retried: true };
  }
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: alreadyQueuedToday, error: limitError } = await db.from('audience_campaign_recipients')
    .select('id', { count: 'exact', head: true }).gte('sent_at', todayStart.toISOString());
  if (limitError) throw limitError;
  const capacity = Math.max(0, DAILY_SEND_LIMIT - (alreadyQueuedToday || 0));
  if (!capacity) {
    await db.from('audience_campaigns').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', campaign.id);
    return { queued: 0, failed: [], status: 'sending', waitingForDailyLimit: true };
  }
  const toSend = remaining.slice(0, capacity);
  const recipientIdByContact = new Map((prepared || []).map(row => [row.contact_id, row.id]));
  const tokens = await createUnsubscribeTokens(db, toSend);
  const from = campaign.sender_email || process.env.FUSE_EMAIL_FROM;
  const queued = [];
  const failed = [];
  const batchDay = new Date().toISOString().slice(0, 10);
  for (let i = 0; i < toSend.length; i += 100) {
    const batch = toSend.slice(i, i + 100);
    try {
      const requestItems = batch.map(contact => ({
        campaignId: campaign.id, batch: `${batchDay}-${(i / 100) + 1}`, recipientId: recipientIdByContact.get(contact.id), email: contact.email_normalized,
        from, replyTo: process.env.FUSE_EMAIL_REPLY_TO, subject: merge(campaign.subject, contact),
        html: mailHtml(campaign, contact, `${publicAppUrl()}/api/audience-unsubscribe?token=${tokens.get(contact.id)}`, `${publicAppUrl()}/api/audience-subscribe?token=${tokens.get(contact.id)}`)
      }));
      const result = await resendBatch(requestItems);
      const now = new Date().toISOString();
      const providerIdFor = new Map((result.accepted || []).map((row, index) => [requestItems[index]?.recipientId, row && row.id]).filter(([id, providerId]) => id && providerId));
      const recipientIds = requestItems.map(item => item.recipientId).filter(Boolean);
      if (recipientIds.length) {
        const { error: queueError } = await db.from('audience_campaign_recipients').update({ status: 'queued', sent_at: now, failure_reason: null }).in('id', recipientIds);
        if (queueError) throw queueError;
      }
      for (const [recipientId, providerMessageId] of providerIdFor) {
        const { error: idError } = await db.from('audience_campaign_recipients').update({ provider_message_id: providerMessageId }).eq('id', recipientId);
        if (idError) throw idError;
      }
      queued.push(...recipientIds);
    } catch (error) {
      failed.push({ index: (i / 100) + 1, message: error.message });
    }
  }
  const hasMoreToSend = remaining.length > toSend.length;
  const status = failed.length ? 'paused' : (hasMoreToSend ? 'sending' : 'sent');
  await db.from('audience_campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', campaign.id);
  return { queued: queued.length, failed, status, remaining: Math.max(0, remaining.length - toSend.length) };
}

async function sendWelcome(db, contact) {
  if (!configured() || !contact || !contact.email_normalized) return { skipped: true };
  const tokens = await createUnsubscribeTokens(db, [contact]);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `fuse-welcome/${contact.id}/${Date.now()}` },
    body: JSON.stringify({ from: process.env.FUSE_EMAIL_FROM, to: [contact.email_normalized], subject: 'You’re in — welcome to Fuse Atelier', html: welcomeHtml(contact, `${publicAppUrl()}/api/audience-unsubscribe?token=${tokens.get(contact.id)}`), reply_to: process.env.FUSE_EMAIL_REPLY_TO || undefined, tags: [{ name: 'message_type', value: 'welcome' }, { name: 'recipient_id', value: contact.id }] })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || 'Resend could not send the welcome email.');
  return { sent: true, id: payload.id || null };
}

module.exports = { configured, mailHtml, createUnsubscribeTokens, deliverCampaign, sendWelcome, eligibleRecipients, audienceSegmentCounts };