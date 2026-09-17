// POST /api/client-retainer
// Converts a won prospect into a monthly retainer and creates the recurring
// delivery jobs that Fuse Client will manage inside the app.
const { admin, getUser, json } = require('./_supabase');
function clean(v,max=500){return typeof v==='string'?v.trim().slice(0,max):''}
function num(v,fallback=0){const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback}
function nextDate(freq,from=new Date()){
  const d=new Date(from);
  if(freq==='weekly')d.setDate(d.getDate()+7);
  else if(freq==='biweekly')d.setDate(d.getDate()+14);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString();
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const prospectId=clean(body.prospect_id,80),action=clean(body.action,30)||'start';
    if(!prospectId)return json(400,{error:'Choose a prospect first.'});
    const db=admin();
    const pq=await db.from('client_prospects').select('*').eq('id',prospectId).eq('user_id',user.id).maybeSingle();
    if(pq.error)throw pq.error;if(!pq.data)return json(404,{error:'Prospect not found.'});
    const p=pq.data;

    if(action==='stop'){
      const r=await db.from('client_retainers').update({status:'paused',updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('prospect_id',p.id).select('*').maybeSingle();
      if(r.error)throw r.error;
      await db.from('client_automation_jobs').update({status:'paused',updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('prospect_id',p.id);
      await db.from('client_activities').insert({user_id:user.id,prospect_id:p.id,activity_type:'retainer_paused',title:'Retainer paused'});
      return json(200,{ok:true,retainer:r.data});
    }

    const latest=await db.from('client_proposals').select('monthly_price,currency').eq('user_id',user.id).eq('prospect_id',p.id).order('created_at',{ascending:false}).limit(1);
    if(latest.error)throw latest.error;
    const proposal=latest.data?.[0]||{};
    const fee=num(body.monthly_fee,num(proposal.monthly_price,num(p.offer_price,0)));
    const currency=clean(body.currency,8)||proposal.currency||p.offer_currency||'USD';
    const billingDay=Math.max(1,Math.min(28,Math.round(Number(body.billing_day)||1)));
    const row={user_id:user.id,prospect_id:p.id,client_name:p.brand_name,service:clean(body.service,200)||p.offer_angle||p.service||'Monthly growth support',monthly_fee:fee,currency,billing_day:billingDay,status:'active',payment_method:clean(body.payment_method,80)||null,payment_reference:clean(body.payment_reference,300)||null,updated_at:new Date().toISOString()};
    const up=await db.from('client_retainers').upsert(row,{onConflict:'user_id,prospect_id'}).select('*').single();
    if(up.error)throw up.error;
    const ret=up.data;

    const defaults=[
      {job_type:'weekly_gbp_post',name:'Weekly Google post draft',frequency:'weekly'},
      {job_type:'review_response_pack',name:'Review response pack',frequency:'weekly'},
      {job_type:'profile_audit',name:'Google profile optimisation check',frequency:'monthly'},
      {job_type:'monthly_report',name:'Monthly client report',frequency:'monthly'}
    ];
    const existing=await db.from('client_automation_jobs').select('job_type').eq('user_id',user.id).eq('retainer_id',ret.id);
    if(existing.error)throw existing.error;
    const has=new Set((existing.data||[]).map(x=>x.job_type));
    const jobs=defaults.filter(x=>!has.has(x.job_type)).map(x=>({...x,user_id:user.id,retainer_id:ret.id,prospect_id:p.id,status:'active',config:{publish_mode:'draft_only'},next_run_at:nextDate(x.frequency)}));
    if(jobs.length){const ins=await db.from('client_automation_jobs').insert(jobs);if(ins.error)throw ins.error}
    await db.from('client_prospects').update({status:'won',last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id);
    await db.from('client_activities').insert({user_id:user.id,prospect_id:p.id,activity_type:'retainer_started',title:'Monthly retainer started',body:`${currency} ${fee.toLocaleString()} / month`,metadata:{retainer_id:ret.id,service:ret.service}});
    const jq=await db.from('client_automation_jobs').select('*').eq('user_id',user.id).eq('retainer_id',ret.id).order('created_at');
    return json(200,{ok:true,retainer:ret,jobs:jq.data||[],note:'Fuse will prepare recurring work inside the app. Publishing directly to Google requires the client Google Business Profile connection.'});
  }catch(e){
    console.error('[client-retainer]',e);
    return json(500,{error:e?.message||'Could not start this retainer.'});
  }
};
