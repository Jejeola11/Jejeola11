// Fuse Atelier marketing provider bridge. Resend remains responsible for transactional/welcome mail.
// Sender is only used for addresses with recorded marketing consent.
const { eligibleRecipients, mailHtml } = require('./_audience-email');
const { publicAppUrl } = require('./_audience');
const BASE = 'https://api.sender.net/v2';
const MASTER_TITLE = 'Fuse Atelier - Verified Marketing Subscribers';
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
const norm = value => String(value || '').trim().toLowerCase();
const configured = () => Boolean(process.env.SENDER_API_TOKEN);

async function request(path, method = 'GET', data = undefined, allowNotFound = false) {
  if (!configured()) throw Error('Sender API token is not configured.');
  let response, payload;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(BASE + path, {
      method, headers: { Authorization: 'Bearer ' + process.env.SENDER_API_TOKEN,
        Accept: 'application/json', 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(12500)
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)));
      continue;
    }
    break;
  }
  payload = await response.json().catch(() => ({}));
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok || payload.success === false) {
    const error = new Error(String(payload.message || payload.error || 'Sender API request rejected').slice(0, 230));
    error.status = response.status;
    throw error;
  }
  return payload;
}
function items(payload) { return Array.isArray(payload?.data) ? payload.data : []; }
function remoteState(row) { return norm(row?.status?.email || row?.subscriber_status || row?.status); }
async function listPaged(path, maxPages = 12) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await request(path + sep + 'page=' + page + '&limit=100');
    const rows = items(data);
    out.push(...rows);
    if (data?.meta?.last_page && page >= Number(data.meta.last_page)) break;
    if (!data?.meta?.last_page && (!data?.links?.next || rows.length === 0)) break;
  }
  return out;
}
async function group(title) {
  const groups = await listPaged('/groups', 8);
  const match = groups.find(g => g.title === title);
  if (match) return match;
  const created = await request('/groups', 'POST', {title});
  const result = created?.data;
  if (result?.id) return result;
  const again = await listPaged('/groups', 8);
  const found = again.find(g => g.title === title);
  if (!found) throw Error('Sender group creation did not return an ID.');
  return found;
}
async function members(groupId) {
  const rows = await listPaged('/groups/' + encodeURIComponent(groupId) + '/subscribers', 12);
  return new Map(rows.filter(x => x.email).map(x => [norm(x.email), x]));
}
async function suppressLocal(db, email, reason) {
  if (!validEmail(email)) return;
  await db.from('audience_suppressions').upsert({channel:'email',identifier:norm(email),reason},
    {onConflict:'channel,identifier',ignoreDuplicates:true});
  if (reason === 'Sender unsubscribe') {
    await db.from('audience_contacts')
      .update({email_marketing_status:'unsubscribed',email_opted_out_at:new Date().toISOString()})
      .eq('email_normalized', norm(email));
  }
}
async function syncMaster(db, batchLimit = 20) {
  if (!configured()) return {configured:false, skipped:true};
  const list = await eligibleRecipients(db, {audience_filter:{segment:'all_subscribed'}});
  const allowed = new Map(list.map(x => [x.email_normalized, x]));
  const master = await group(MASTER_TITLE);
  const existing = await members(master.id);
  // Reconcile explicit opt-outs and provider bounces into Supabase. Never reactivate them.
  let remoteSuppressed = 0;
  for (const [email, row] of existing) {
    const status = remoteState(row);
    if (status === 'unsubscribed' || status === 'bounced' || status === 'spam_reported') {
      await suppressLocal(db,email,status === 'unsubscribed' ? 'Sender unsubscribe' : 'Sender ' + status);
      remoteSuppressed++;
      allowed.delete(email);
    }
  }
  // Remove only explicitly ineligible previously synced contacts from the managed master group.
  const stale = [...existing.keys()].filter(email => !allowed.has(email) && remoteState(existing.get(email)) === 'active');
  for (let i=0;i<stale.length;i+=100) {
    await request('/subscribers/groups/' + encodeURIComponent(master.id), 'DELETE',
      {subscribers:stale.slice(i,i+100)});
  }
  const missing = [...allowed.values()].filter(c => !existing.has(c.email_normalized));
  let imported=0, already=0, denied=0;
  const limit = Math.max(1,Math.min(Number(batchLimit) || 20,40));
  // A few concurrent API requests make the import fit within Vercel's execution window.
  for(let i=0;i<Math.min(missing.length,limit);i+=4){
    const batch=missing.slice(i,i+4);
    const outcomes=await Promise.all(batch.map(async contact=>{
      const email=contact.email_normalized;
      try{
        const remote=await request('/subscribers/'+encodeURIComponent(email),'GET',undefined,true);
        const existingContact=remote?.data || remote;
        if(remote && remoteState(existingContact)!=='active'){
          await suppressLocal(db,email,'Sender '+(remoteState(existingContact)||'not-active'));
          return 'denied';
        }
        if(remote){
          await request('/subscribers/groups/'+encodeURIComponent(master.id),'POST',
            {subscribers:[email],trigger_automation:false});
          return 'already';
        }
        await request('/subscribers','POST',{
          email,firstname:String(contact.first_name||'').trim().slice(0,80),
          groups:[master.id],trigger_automation:false
        });
        return 'imported';
      }catch(error){
        console.error('[Sender sync]',{status:error.status||0,message:error.message});
        return {error:error.message};
      }
    }));
    for(const item of outcomes){
      if(item==='imported')imported++;
      else if(item==='already')already++;
      else if(item==='denied')denied++;
      else return {configured:true,groupId:master.id,eligible:list.length,
        imported,already,denied,remoteSuppressed,remaining:missing.length-imported-already-denied,
        partial:true,error:item.error};
    }
  }
  const remaining = Math.max(0,missing.length - imported - already - denied);
  return {configured:true,groupId:master.id,eligible:list.length,imported,already,denied,
    remoteSuppressed,remaining,activeInGroup:[...existing.values()].filter(x=>remoteState(x)==='active').length+imported+already,
    complete:remaining===0 && denied===0};
}
function senderIdentity() {
  const from = String(process.env.FUSE_EMAIL_FROM || '').trim();
  const reply = String(process.env.FUSE_EMAIL_REPLY_TO || '').trim();
  // Sender validates the verified sending domain on this address.
  const email = (from.match(/<([^<>]+@[^<>]+)>/)||from.match(/([^\\s<>]+@[^\\s<>]+)/)||[])[1]
    || (reply.match(/<([^<>]+@[^<>]+)>/)||reply.match(/([^\\s<>]+@[^\\s<>]+)/)||[])[1];
  const name = from.replace(/<[^>]+>/,'').trim().replace(/^["']|["']$/g,'') || 'Fuse Atelier';
  if (!validEmail(email)) throw Error('Sender requires a verified FUSE_EMAIL_FROM or FUSE_EMAIL_REPLY_TO domain address.');
  return {name,email};
}
async function deliverSenderCampaign(db,campaign) {
  if (!configured()) throw Error('Sender marketing is not configured.');
  const audience = await eligibleRecipients(db,campaign);
  if (!audience.length) throw Error('No marketing opt-in recipients in this segment.');
  // Each campaign has its own group. This prevents sending to old course owners or affiliates.
  const master = await group(MASTER_TITLE);
  const all = await members(master.id);
  const awaiting = audience.filter(x => remoteState(all.get(x.email_normalized)) !== 'active');
  if (awaiting.length) return {status:'sending',preparing:true,awaitingSync:awaiting.length,
    message:'Waiting for verified subscribers to finish syncing with Sender.'};
  const target = await group('Fuse Campaign ' + campaign.id);
  const current = await members(target.id);
  const wanted = new Set(audience.map(x=>x.email_normalized));
  const stale = [...current.keys()].filter(email=>!wanted.has(email));
  for(let i=0;i<stale.length;i+=100)
    await request('/subscribers/groups/'+encodeURIComponent(target.id),'DELETE',
      {subscribers:stale.slice(i,i+100)});
  const toAdd = audience.map(x=>x.email_normalized).filter(email=>!current.has(email));
  for(let i=0;i<toAdd.length;i+=100){
    const result = await request('/subscribers/groups/'+encodeURIComponent(target.id),'POST',
      {subscribers:toAdd.slice(i,i+100),trigger_automation:false});
    if(result?.message?.non_existing_subscribers?.length)
      throw Error('Some Sender subscribers could not be added to the campaign group.');
  }
  // Sender's Liquid variables personalize each subscriber; do not render one name for everyone.
  const fields = campaign.audience_filter || {};
  let providerId = fields.sender_campaign_id;
  if (!providerId) {
    const identity = senderIdentity();
    const unsubscribe = '{{ unsubscribe_link }}';
    const html = mailHtml(campaign,{first_name:'{{ firstname }}'},unsubscribe,null)
      .replace(/{{\s*first_name\s*}}/gi,'{{ firstname }}');
    const data = await request('/campaigns','POST',{
      title: campaign.name,
      subject: campaign.subject.replace(/{{\s*first_name\s*}}/gi,'{{ firstname }}'),
      from:campaign.sender_name||identity.name,reply_to:identity.email,
      preheader: String(fields.design?.preheader || campaign.subject || '').slice(0,170),
      content_type:'html', content:html,
      groups:[target.id],google_analytics:1,auto_followup_active:false
    });
    providerId = data?.data?.id;
    if (!providerId) throw Error('Sender did not return a campaign ID.');
    const patch = {...fields,sender_campaign_id:providerId,sender_group_id:target.id};
    const {error}=await db.from('audience_campaigns').update({audience_filter:patch}).eq('id',campaign.id);
    if (error) throw error;
  }
  if (fields.sender_campaign_id) {
    // Recover safely after a timeout between provider acceptance and our DB update.
    const previous = await request('/campaigns/'+encodeURIComponent(providerId));
    const state = String(previous?.data?.status || '').toLowerCase();
    if (['sent','sending','scheduled','queued','finished','completed'].includes(state)) {
      await db.from('audience_campaigns').update({status:'sent',updated_at:new Date().toISOString()}).eq('id',campaign.id);
      return {status:'sent',provider:'sender',recipientCount:audience.length,providerCampaignId:providerId,alreadySubmitted:true};
    }
  }
  // Only invoked by a user-confirmed launch or by an explicitly scheduled campaign.
  await request('/campaigns/'+encodeURIComponent(providerId)+'/send','POST');
  const {error:markError}=await db.from('audience_campaigns')
    .update({status:'sent',updated_at:new Date().toISOString()}).eq('id',campaign.id);
  if (markError) throw markError;
  return {status:'sent',provider:'sender',recipientCount:audience.length,
    providerCampaignId:providerId,message:'Campaign submitted to Sender. Final delivery is reported by Sender.'};
}
module.exports={configured,request,group,members,syncMaster,deliverSenderCampaign,MASTER_TITLE};
