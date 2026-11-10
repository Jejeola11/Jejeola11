const { json } = require('./_supabase');
const { requireAdmin, parseBody, clean, publicAppUrl } = require('./_audience');
const { configured, mailHtml, deliverCampaign, eligibleRecipients, audienceSegmentCounts } = require('./_audience-email');
const { normalizeDesign, templates, SEGMENTS } = require('./_audience-email-studio');
const { configured: senderConfigured, deliverSenderCampaign } = require('./_audience-sender');

function subscriberDiscountReadiness(filter) {
  const d=filter&&filter.design;
  if(!d||d.template!=='influencer_discount')return '';
  const blocks=Array.isArray(d.blocks)?d.blocks:[];
  const find=id=>blocks.find(b=>b.id===id)||{};
  if(!find('discount-hero').src)return 'Upload the top flyer image before scheduling or launching this discount campaign.';
  const gif=find('discount-gif').src||'';
  if(!gif||!/\.gif(?:$|[?#])/i.test(gif))return 'Add a valid animated GIF preview (upload one or convert your Cloudinary video) before scheduling or launching.';
  const button=find('discount-button'),destination=String(button.buttonUrl||'');
  if(!/^https:\/\//i.test(destination))return 'Set the discount CTA to a working HTTPS discount checkout page.';
  try{
    const u=new URL(destination);
    if(u.origin!=='https://fuseatelier.com' || !/^\/influencer\/discount\/?$/.test(u.pathname) || u.search){
      return 'Set the chrome discount button to https://fuseatelier.com/influencer/discount so subscribers can redeem EMAIL30.';
    }
  }catch(_){return 'Provide a valid HTTPS coupon checkout link.'}
  return '';
}

function parseScheduledFor(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
  return date.toISOString();
}

function creativeFilter(input,previousProvider){
  const segment=SEGMENTS.includes(input.segment)?input.segment:'all_subscribed';
  const design=normalizeDesign(input.design);
  if(design&&JSON.stringify(design).length>55000)throw new Error('Email design is too large. Remove a few blocks or shorten descriptions.');
  return {segment,design,provider: previousProvider || (senderConfigured() ? 'sender' : 'resend')};
}
async function reconcileQueued(db,campaignId){
  if(!configured())throw new Error('Resend is not configured.');
  let query=db.from('audience_campaign_recipients').select('id,status,provider_message_id,contact_id')
    .eq('status','queued').not('provider_message_id','is',null)
    .order('sent_at',{ascending:true}).limit(25);
  if(campaignId)query=query.eq('campaign_id',campaignId);
  const {data:items,error}=await query;
  if(error)throw error;
  let updated=0,unchanged=0,errors=0;
  for(const row of items||[]){
    try{
      const response=await fetch('https://api.resend.com/emails/'+encodeURIComponent(row.provider_message_id),{
        headers:{authorization:'Bearer '+process.env.RESEND_API_KEY}
      });
      if(!response.ok){errors++;continue}
      const message=await response.json();
      const event=String(message.last_event||'').toLowerCase();
      let status=event==='delivered'?'delivered':(['bounced','complained','suppressed'].includes(event)?'failed':null);
      if(!status){unchanged++;continue}
      const patch={status};
      if(status==='delivered')patch.delivered_at=new Date().toISOString();
      else patch.failure_reason='Resend event: '+event;
      const {error:writeError}=await db.from('audience_campaign_recipients').update(patch).eq('id',row.id).eq('status','queued');
      if(writeError){errors++;continue}
      updated++;
      // Prevent future sends to addresses rejected by the email provider.
      if(status==='failed'){
        const {data:contact}=await db.from('audience_contacts').select('email_normalized').eq('id',row.contact_id).maybeSingle();
        if(contact?.email_normalized){
          await db.from('audience_suppressions').upsert({channel:'email',identifier:contact.email_normalized.toLowerCase(),reason:'Resend: '+event},{onConflict:'channel,identifier',ignoreDuplicates:true});
        }
      }
    }catch(_){errors++}
  }
  return {checked:(items||[]).length,updated,unchanged,errors,batchLimit:25};
}
async function recentDeliveryLog(db, campaigns) {
  const ids = campaigns.map(item => item.id);
  if (!ids.length) return [];
  const { data, error } = await db.from('audience_campaign_recipients')
    .select('id, campaign_id, status, sent_at, delivered_at, opened_at, clicked_at, failure_reason, provider_message_id, contact_id, audience_contacts(first_name, email_normalized)')
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
      .select('id, name, channel, campaign_kind, status, subject, body, action_url, audience_filter, sender_name, sender_email, scheduled_for, created_at')
      .eq('channel', 'email').order('created_at', { ascending: false }).limit(50);
    if (error) return json(500, { error: 'Could not load email campaigns.' });
    let deliveries = [];
    try { deliveries = await recentDeliveryLog(db, data || []); } catch (_) {}
    let audienceCounts = {};
    try { audienceCounts = await audienceSegmentCounts(db); } catch (err) { console.error('[Audience segments]',err.message); }
    const statuses = {};
    for(const d of deliveries){const key=d.status||'pending';statuses[key]=(statuses[key]||0)+1;}
    return json(200, { ok:true, configured:configured()||senderConfigured(), senderProvider:senderConfigured()?'sender':'resend', sender:process.env.FUSE_EMAIL_FROM||null,
      dailyLimit:senderConfigured()?null:100, templates:templates(), segments:SEGMENTS, audienceCounts,
      campaigns:data||[], deliveries, deliverySummary:statuses, deliverySummarySample:deliveries.length });
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const input = parseBody(event);
  if(input.action==='preview'){
    const subject=clean(input.subject,220)||'Fuse Atelier preview';
    let filter;
    try{filter=creativeFilter(input)}catch(err){return json(400,{error:err.message})}
    const campaign={subject,body:clean(input.body,9000)||'Email preview',campaign_kind:'marketing',
      action_url:clean(input.actionUrl,2000),audience_filter:filter};
    const html=mailHtml(campaign,{first_name:'Creator'},publicAppUrl()+'/api/audience-unsubscribe?test=1',null);
    return json(200,{ok:true,html});
  }
  if(input.action==='reconcile'){
    try{const result=await reconcileQueued(db,clean(input.campaignId,100)||null);return json(200,{ok:true,...result})}
    catch(err){return json(502,{error:err.message||'Could not check Resend delivery.'})}
  }
  if (input.action === 'create') {
    const name = clean(input.name, 140);
    const subject = clean(input.subject, 220);
    const body = clean(input.body, 9000);
    const actionUrl = clean(input.actionUrl, 2000);
    const kind = ['marketing', 'repermission', 'transactional'].includes(input.kind) ? input.kind : 'marketing';
    const scheduledFor = parseScheduledFor(input.scheduledFor);
    let audienceFilter;
    try{audienceFilter=creativeFilter(input)}catch(err){return json(400,{error:err.message})}
    if (!name || !subject || !body) return json(400, { error: 'Campaign name, subject and message are required.' });
    if (input.scheduledFor && !scheduledFor) return json(400, { error: 'Choose a future date and time to schedule this email.' });
    if (scheduledFor) { const blocked=subscriberDiscountReadiness(audienceFilter);if(blocked)return json(409,{error:blocked}); }
    if (actionUrl && !/^https:\/\//i.test(actionUrl)) return json(400, { error: 'Your action link must start with https://.' });
    const { data, error } = await db.from('audience_campaigns').insert({
      name, channel: 'email', campaign_kind: kind, status: scheduledFor ? 'scheduled' : 'draft', subject, body,
      action_url: actionUrl || null, audience_filter:audienceFilter, scheduled_for: scheduledFor, sender_name: clean(input.senderName, 100) || null,
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
    const audienceFilter = creativeFilter(input,campaign.audience_filter?.provider);
    if (!name || !subject || !body) return json(400, { error: 'Campaign name, subject and message are required.' });
    if (input.scheduledFor && !scheduledFor) return json(400, { error: 'Choose a future date and time to schedule this email.' });
    if (scheduledFor) { const blocked=subscriberDiscountReadiness(audienceFilter);if(blocked)return json(409,{error:blocked}); }
    if (actionUrl && !/^https:\/\//i.test(actionUrl)) return json(400, { error: 'Your action link must start with https://.' });
    const { data, error } = await db.from('audience_campaigns').update({
      name, subject, body, action_url: actionUrl || null, campaign_kind: kind, audience_filter:audienceFilter,
      scheduled_for: scheduledFor, status: scheduledFor ? 'scheduled' : 'draft',
      updated_at: new Date().toISOString()
    }).eq('id', campaign.id).select().single();
    if (error) return json(500, { error: 'Could not save your changes.' });
    return json(200, { ok: true, campaign: data, message: scheduledFor ? 'Scheduled email updated.' : 'Draft updated.' });
  }

  if (!configured() && !senderConfigured()) return json(409, { error: 'Configure an email provider in Vercel before sending.' });

  if (input.action === 'send_test') {
    if (!configured()) return json(409,{error:'Test email currently requires Resend to be configured.'});
    const email = clean(input.email, 320).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Enter a valid test email.' });
    const html = mailHtml(campaign, { first_name: 'Ria' }, `${publicAppUrl()}/api/audience-unsubscribe?test=1`, `${publicAppUrl()}/api/audience-subscribe?test=1`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.FUSE_EMAIL_FROM, to: [email], subject: `[TEST ${new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14)}-${Math.random().toString(36).slice(2,6)}] ${campaign.subject}`, html, reply_to: process.env.FUSE_EMAIL_REPLY_TO || undefined })
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
  const discountIssue=subscriberDiscountReadiness(campaign.audience_filter);
  if(discountIssue)return json(409,{error:discountIssue});

  const { data: claimed, error: claimError } = await db.from('audience_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaign.id).eq('status', 'draft').select().maybeSingle();
  if (claimError || !claimed) return json(409, { error: 'This campaign is already being processed.' });
  try {
    const result = claimed.audience_filter?.provider === 'sender'
      ? await deliverSenderCampaign(db, claimed) : await deliverCampaign(db, claimed);
    return json(200, { ok: true, ...result });
  } catch (error) {
    await db.from('audience_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', campaign.id);
    return json(500, { error: error.message || 'Could not launch this campaign.' });
  }
};