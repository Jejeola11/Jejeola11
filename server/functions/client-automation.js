// POST /api/client-automation
// Runs one recurring client-delivery job and stores its draft/result in Fuse.
// V1 is draft-first: it does not publish to a client's Google profile without OAuth.
const { admin, getUser, json } = require('./_supabase');
function clean(v,max=5000){return typeof v==='string'?v.trim().slice(0,max):''}
function nextDate(freq,from=new Date()){
  const d=new Date(from);
  if(freq==='weekly')d.setDate(d.getDate()+7);
  else if(freq==='biweekly')d.setDate(d.getDate()+14);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString();
}
function fallback(job,p){
  const brand=p.brand_name||'the client';
  if(job.job_type==='weekly_gbp_post')return {title:`Weekly Google post for ${brand}`,status:'draft',copy:`This week at ${brand}: highlight one current service, one customer benefit, and one simple next step. Keep the post specific to something the client can verify before publishing.`,checklist:['Choose one real offer or update','Add one current image','Use one clear CTA','Verify dates/prices before publishing']};
  if(job.job_type==='review_response_pack')return {title:'Review response workflow',status:'draft',guidance:'Open the newest Google reviews, paste each review into Fuse, then respond specifically to what the customer mentioned. Never invent details.',templates:['Positive: Thank them for the specific thing they mentioned and invite them back naturally.','Neutral: Thank them, acknowledge the point raised, and explain the next practical step.','Negative: Acknowledge the experience, avoid arguing publicly, and move resolution to a private channel.']};
  if(job.job_type==='profile_audit')return {title:'Monthly Google profile check',status:'ready',checklist:['Confirm hours and contact details','Review primary/secondary categories','Check website and appointment links','Review recent photos','Review unanswered reviews','Check current services/products','Check whether the latest offer is represented']};
  return {title:`Monthly report for ${brand}`,status:'draft',summary:'Summarise work completed, visible profile changes, review activity supplied by the client, and next-month priorities. Do not claim ranking or lead improvements unless they were actually tracked.',sections:['Work completed','Profile/review observations','Assets published by the client','Next priorities']};
}
async function gemini(job,p,ret){
  const key=(process.env.GEMINI_API_KEY||'').trim();if(!key)return null;
  const instruction=`You are Fuse Client's recurring delivery agent. Create one client-ready DRAFT for the job type ${job.job_type}. Return JSON only. Never invent current Google rankings, new reviews, leads, calls, revenue, offers, opening hours or business facts. If fresh data is required and has not been supplied, make a checklist or clearly labelled draft instead of pretending the action happened. This is an internal workflow; do not say it was published.`;
  const context={job:{type:job.job_type,name:job.name,frequency:job.frequency,config:job.config||{}},client:{name:p.brand_name,niche:p.niche,location:p.location,website:p.website,rating:p.rating,review_count:p.review_count,audit_summary:p.audit_summary,service:ret?.service||p.service},retainer:ret?{service:ret.service,monthly_fee:ret.monthly_fee,currency:ret.currency}:null};
  const payload={system_instruction:{parts:[{text:instruction}]},contents:[{role:'user',parts:[{text:JSON.stringify(context)}]}],generationConfig:{temperature:.45,response_mime_type:'application/json',maxOutputTokens:3000}};
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const body=await res.json().catch(()=>({}));if(!res.ok)throw Error(body?.error?.message||'Automation model failed.');
  const text=body?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';return text?JSON.parse(text):null;
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const id=clean(body.job_id,80),action=clean(body.action,30)||'run';if(!id)return json(400,{error:'Choose an automation job.'});
    const db=admin();
    const jq=await db.from('client_automation_jobs').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(jq.error)throw jq.error;if(!jq.data)return json(404,{error:'Automation job not found.'});
    const job=jq.data;
    if(action==='toggle'){
      const status=job.status==='active'?'paused':'active';
      const up=await db.from('client_automation_jobs').update({status,updated_at:new Date().toISOString()}).eq('id',job.id).eq('user_id',user.id).select('*').single();if(up.error)throw up.error;
      return json(200,{ok:true,job:up.data});
    }
    const pq=await db.from('client_prospects').select('*').eq('id',job.prospect_id).eq('user_id',user.id).maybeSingle();if(pq.error)throw pq.error;if(!pq.data)return json(404,{error:'Client record not found.'});
    let ret=null;if(job.retainer_id){const rq=await db.from('client_retainers').select('*').eq('id',job.retainer_id).eq('user_id',user.id).maybeSingle();if(!rq.error)ret=rq.data||null}
    let result=null,aiUsed=false;try{result=await gemini(job,pq.data,ret);aiUsed=!!result}catch(e){console.error('[client-automation] Gemini fallback',e?.message)}
    result=result||fallback(job,pq.data);
    const now=new Date();
    const up=await db.from('client_automation_jobs').update({last_result:result,last_run_at:now.toISOString(),next_run_at:nextDate(job.frequency,now),updated_at:now.toISOString()}).eq('id',job.id).eq('user_id',user.id).select('*').single();if(up.error)throw up.error;
    await db.from('client_activities').insert({user_id:user.id,prospect_id:job.prospect_id,activity_type:'automation_run',title:job.name,body:'A new draft/result was prepared inside Fuse Client.',metadata:{job_id:job.id,job_type:job.job_type,ai_used:aiUsed}});
    return json(200,{ok:true,ai_used:aiUsed,job:up.data,result,note:'This result is prepared inside Fuse. Direct Google Business Profile publishing requires the client profile OAuth connection.'});
  }catch(e){console.error('[client-automation]',e);return json(500,{error:e?.message||'Could not run this automation.'})}
};
