'use strict';
// Records first-party, non-PII funnel events. A new registration is counted
// ONLY after Supabase authenticates a confirmed user created after signup began.
// Uses the already-existing RLS-protected fuse_free_signup_events table.
const {admin,getUser,json}=require('./_supabase');
const validEvents=new Set(['landing_view','signup_clicked','signup_view','signup_started','registration_completed']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const short=(v,max)=>typeof v==='string'?v.trim().slice(0,max):null;
const refPattern=/^[a-z0-9-]{5,80}$/;
const allowedPath=/^\/(?:atelier-v2\/free-prompts-workflows\.html|signup)$/;
const DAY=86400000;
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const origin=event.headers?.origin||event.headers?.Origin;
 if(origin&&!['https://fuseatelier.com','https://www.fuseatelier.com'].includes(origin))return json(403,{error:'Origin not allowed'});
 if((event.body||'').length>2048)return json(413,{error:'Request too large'});
 let b;
 try{b=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid request'})}
 const type=b.event,visitor=String(b.visitorId||'').toLowerCase(),path=short(b.path,260),ref=short(b.ref,80)?.toLowerCase()||null;
 if(!validEvents.has(type)||!uuid.test(visitor)||!allowedPath.test(path||''))return json(400,{error:'Invalid event'});
 if(ref&&!refPattern.test(ref))return json(400,{error:'Invalid referral'});
 try{
  const db=admin();let userId=null;
  if(type==='registration_completed'){
   const user=await getUser(event);
   if(!user?.id||!user.email_confirmed_at)return json(401,{error:'Verified account required'});
   if(path!=='/signup')return json(400,{error:'Registration must be completed on signup'});
   const created=Date.parse(user.created_at||'');
   if(!Number.isFinite(created)||created>Date.now()+60000||Date.now()-created>7*DAY)
    return json(200,{ok:true,recorded:false,reason:'existing_account'});
   // Must have started on this browser before account creation; returning logins
   // do not count as registrations even if the login is newly verified.
   const started=await db.from('fuse_free_signup_events').select('created_at')
     .eq('visitor_id',visitor).eq('event','signup_started').maybeSingle();
   if(started.error)throw started.error;
   const start=Date.parse(started.data?.created_at||'');
   if(!Number.isFinite(start)||created<start-120000||created>start+2*DAY)
    return json(200,{ok:true,recorded:false,reason:'no_new_signup_start'});
   userId=user.id;
  }
  const record={
   visitor_id:visitor,event:type,source_path:path,referral_code:ref,
   utm_source:short(b.utmSource,120),utm_campaign:short(b.utmCampaign,120),user_id:userId
  };
  // Plain INSERT + unique constraints dedupe both visitor/event and user signup.
  const {data,error}=await db.from('fuse_free_signup_events').insert(record).select('id').single();
  if(error?.code==='23505')return json(200,{ok:true,recorded:false});
  if(error)throw error;
  return json(200,{ok:true,recorded:!!data?.id});
 }catch(err){
  console.warn('[Fuse free signup tracker]',String(err?.message||err).slice(0,180));
  return json(500,{error:'Tracking temporarily unavailable'});
 }
};
