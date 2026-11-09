const { json } = require('./_supabase');
const { requireAdmin, parseBody } = require('./_audience');
const sender = require('./_audience-sender');
const { eligibleRecipients } = require('./_audience-email');

async function audienceSummary(db) {
  const [contacts,leads,profiles,suppressions] = await Promise.all([
    db.from('audience_contacts').select('email_normalized,email_marketing_status,email_opted_out_at').limit(2000),
    db.from('phone_to_client_leads').select('email,email_normalized').limit(2000),
    db.from('profiles').select('email').limit(2000),
    db.from('audience_suppressions').select('identifier').eq('channel','email').limit(2000)
  ]);
  for (const result of [contacts,leads,profiles,suppressions]) if (result.error) throw result.error;
  const clean = v => String(v||'').trim().toLowerCase();
  const all = new Set();
  for (const row of contacts.data||[]) if (row.email_normalized) all.add(clean(row.email_normalized));
  for (const row of leads.data||[]) if (row.email_normalized||row.email) all.add(clean(row.email_normalized||row.email));
  for (const row of profiles.data||[]) if (row.email) all.add(clean(row.email));
  const blocked = new Set((suppressions.data||[]).map(x=>clean(x.identifier)));
  for (const row of contacts.data||[])
    if(row.email_marketing_status==='unsubscribed'||row.email_opted_out_at)blocked.add(clean(row.email_normalized));
  const eligible = await eligibleRecipients(db,{audience_filter:{segment:'all_subscribed'}});
  const allowed = new Set(eligible.map(x=>x.email_normalized));
  const suppressed = [...all].filter(x=>blocked.has(x)).length;
  return {total:all.size,marketingEligible:eligible.length,suppressed,
    needsConsent:[...all].filter(x=>!allowed.has(x)&&!blocked.has(x)).length};
}
exports.handler=async event=>{
  const access=await requireAdmin(event);
  if(access.error)return access.error;
  const {db}=access;
  if(event.httpMethod==='GET'){
    try{
      if(event.queryStringParameters?.reports==='1'){
        if(!sender.configured()) return json(200,{ok:true,reports:[]});
        const {data:campaigns,error:dbError}=await db.from('audience_campaigns')
          .select('id,name,audience_filter,status').eq('channel','email')
          .order('created_at',{ascending:false}).limit(40);
        if(dbError)throw dbError;
        const relevant=(campaigns||[]).filter(x=>x.audience_filter?.sender_campaign_id).slice(0,12);
        const reports=await Promise.all(relevant.map(async campaign=>{
          const id=campaign.audience_filter.sender_campaign_id;
          try{
            const payload=await sender.request('/campaigns/'+encodeURIComponent(id));
            const p=payload.data||{};
            return {fuseCampaignId:campaign.id,name:campaign.name,providerCampaignId:id,
              status:String(p.status||campaign.status),recipients:Number(p.recipient_count||0),
              sent:Number(p.sent_count||0),opens:Number(p.opens||0),
              clicks:Number(p.clicks||0),bounces:Number(p.bounces_count||0)};
          }catch(err){return {fuseCampaignId:campaign.id,name:campaign.name,error:err.message}}
        }));
        return json(200,{ok:true,reports});
      }
      const summary=await audienceSummary(db);
      let connection={configured:sender.configured()};
      if(sender.configured()){
        try{
          const response=await sender.request('/groups?limit=100');
          const master=(response.data||[]).find(x=>x.title===sender.MASTER_TITLE);
          connection={configured:true,connected:true,masterGroupId:master?.id||null,
            importedCount:master?.active_subscribers||0};
        }catch(err){connection={configured:true,connected:false,error:err.message}}
      }
      return json(200,{ok:true,summary,connection,note:'Only confirmed opted-in contacts sync as active marketing subscribers.'});
    }catch(err){return json(500,{error:err.message||'Could not load audience status.'})}
  }
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed.'});
  const input=parseBody(event);
  if(input.action!=='sync')return json(400,{error:'Unknown Sender action.'});
  try{
    const result=await sender.syncMaster(db,Math.min(40,Math.max(1,Number(input.limit)||20)));
    return json(200,{ok:true,...result});
  }catch(err){console.error('[Sender admin sync]',err.message);return json(502,{error:err.message||'Sender sync failed.'})}
};
