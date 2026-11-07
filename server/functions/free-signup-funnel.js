'use strict';
const {admin,getUser,json}=require('./_supabase');
const validEvents=new Set(['landing_view','signup_clicked','signup_view','signup_started','signup_code_requested','registration_completed','resource_unlocked']);
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const clean=(v,max)=>typeof v==='string'?v.slice(0,max):null;
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  if((event.body||'').length>2400)return json(413,{error:'Request too large'});
  try{
    const body=JSON.parse(event.body||'{}');
    const type=body.event,visitor=String(body.visitorId||'');
    if(!validEvents.has(type)||!isUuid(visitor))return json(400,{error:'Invalid event'});
    const ref=clean(body.ref,80);
    const path=clean(body.path,260)||'/atelier-v2/free-prompts-workflows.html';
    if(!/^\/(?:atelier-v2\/(?:free-prompts-workflows|ocean-eyes-halloween|free-ai-tutorial|realistic-images)\.html|signup)$/.test(path))return json(400,{error:'Invalid page'});
    if(ref&&!/^[a-z0-9-]{5,80}$/.test(ref))return json(400,{error:'Invalid referral'});
    let user=null;
    if(type==='registration_completed'||type==='resource_unlocked'){
      user=await getUser(event);if(!user||!user.email_confirmed_at)return json(401,{error:'Authentication required'});
      if(type==='registration_completed'){
        const created=new Date(user.created_at).getTime();
        if(!Number.isFinite(created)||Date.now()-created>86400000||created>Date.now()+60000)return json(200,{ok:true,existingAccount:true});
      }
    }
    const record={visitor_id:visitor,event:type,source_path:path,referral_code:ref||null,
      utm_source:clean(body.utmSource,120),utm_campaign:clean(body.utmCampaign,120),
      user_id:user?.id||null};
    const {data,error}=await admin().from('fuse_free_signup_events').upsert(record,{onConflict:'visitor_id,event',ignoreDuplicates:true}).select('id');
    if(error&&error.code!=='23505')throw error;
    return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:true,recorded:!!data?.length})};
  }catch(err){
    console.error('[Free signup funnel]',String(err?.message||err).slice(0,160));
    return json(500,{error:'Event unavailable'});
  }
};
