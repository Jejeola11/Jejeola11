'use strict';
const {admin,getUser,json}=require('./_supabase');
const agent=require('./_client-agent-v2');
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
const statuses=new Set(['new','asked','replied','sample_ready','sample_sent','proposal_sent','deposit_paid','in_delivery','delivered','won','lost']);
function response(code,data){const r=json(code,data);r.headers['Cache-Control']='no-store';return r}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return response(405,{error:'Method not allowed'});
  const user=await getUser(event);if(!user)return response(401,{error:'Please sign in to open your Client Agent.'});
  let body;try{if((event.body||'').length>70000)return response(413,{error:'Please shorten your assignments.'});body=JSON.parse(event.body||'{}')}catch{return response(400,{error:'Invalid request'})}
  const db=admin();
  try{
    if(body.action==='load'){
      const [profile,prospects,jobs,balance]=await Promise.all([
        db.from('client_agent_profiles').select('*').eq('user_id',user.id).maybeSingle(),
        db.from('client_prospects').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(300),
        db.from('client_agent_jobs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
        db.from('profiles').select('credits').eq('id',user.id).single()
      ]);for(const r of [profile,prospects,jobs,balance])if(r.error)throw r.error;
      return response(200,{profile:profile.data?.profile_json||null,prospects:prospects.data||[],jobs:(jobs.data||[]).map(agent.publicJob),credits:balance.data.credits,research_cost:30});
    }
    if(body.action==='organize'){
      if(!agent.clean(body.day1)&&!agent.clean(body.day2))return response(400,{error:'Paste some notes about your skills or service offer first.'});
      // Existing user-owned activity rows provide a small, server-enforced rate limit.
      const recent=await db.from('client_activities').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('activity_type','profile_organized').gte('created_at',new Date(Date.now()-3600000).toISOString());
      if(recent.error)throw recent.error;if(recent.count>=5)return response(429,{error:'You can organize your answers five times per hour. You can still edit every field manually.'});
      const activity=await db.from('client_activities').insert({user_id:user.id,activity_type:'profile_organized',title:'Organized service notes'});if(activity.error)throw activity.error;
      return response(200,{fields:await agent.organize(body)});
    }
    if(body.action==='profile'){
      const p=agent.profile(body.profile),missing=agent.missing(p);
      if(missing.length)return response(400,{error:'Complete: '+missing.join(', ')});
      if(!p.approved)return response(400,{error:'Review and confirm your offer first.'});
      p.approved_at=new Date().toISOString();
      const row={user_id:user.id,profile_json:p,memory_summary:[p.skill,p.buyer,p.offer_title,p.currency+' '+p.price_amount,p.market].join(' · '),portfolio_urls:[p.portfolio,...p.projects.map(x=>x.url)].filter(Boolean),updated_at:p.approved_at};
      const saved=await db.from('client_agent_profiles').upsert(row,{onConflict:'user_id'});if(saved.error)throw saved.error;
      return response(200,{profile:p});
    }
    if(body.action==='start'){
      if(!uuid(body.request_key))return response(400,{error:'Please refresh and start the research again.'});
      if(!process.env.OPENAI_API_KEY)return response(503,{error:'The research connection is not configured. Please contact Ria.'});
      const saved=await db.from('client_agent_profiles').select('profile_json').eq('user_id',user.id).single();if(saved.error)throw saved.error;
      const p=agent.profile(saved.data.profile_json);
      if(!p.approved||agent.missing(p).length)return response(400,{error:'Review and confirm your complete offer before researching.'});
      const market=agent.clean(body.market,180)||p.market;
      const started=await db.rpc('client_agent_start',{p_user:user.id,p_key:body.request_key,p_profile:p,p_market:market});
      if(started.error){return response(/credits/i.test(started.error.message)?402:400,{error:started.error.message})}
      // Kick the durable queue; the scheduler continues even when this page closes.
      await db.rpc('client_agent_dispatch');
      return response(202,{job:agent.publicJob(started.data.job),credits:started.data.credits,reused:started.data.reused});
    }
    if(body.action==='status'){
      if(!uuid(body.id))return response(400,{error:'Invalid research ID'});
      const r=await db.from('client_agent_jobs').select('*').eq('id',body.id).eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return response(404,{error:'Research not found'});
      if(agent.ACTIVE.includes(r.data.status))await db.rpc('client_agent_dispatch');
      return response(200,{job:agent.publicJob(r.data)});
    }
    if(body.action==='update-prospect'){
      if(!uuid(body.id))return response(400,{error:'Invalid prospect ID'});
      const patch={updated_at:new Date().toISOString()};
      if(body.status!==undefined){if(!statuses.has(body.status))return response(400,{error:'Choose a valid status'});patch.status=body.status;if(body.status==='asked')patch.last_contacted_at=patch.updated_at}
      if(body.notes!==undefined)patch.notes=agent.clean(body.notes,8000);
      if(body.reply_text!==undefined){patch.reply_text=agent.clean(body.reply_text,8000);if(patch.reply_text)patch.replied_at=patch.updated_at}
      if(body.next_follow_up!==undefined){if(body.next_follow_up&&!Number.isFinite(Date.parse(body.next_follow_up)))return response(400,{error:'Choose a valid follow-up date'});patch.next_follow_up=body.next_follow_up?new Date(body.next_follow_up).toISOString():null}
      for(const field of ['pitch_email','pitch_instagram'])if(body[field]!==undefined)patch[field]=agent.clean(body[field],6000);
      if(body.email_subject!==undefined){const old=await db.from('client_prospects').select('qualification_json').eq('id',body.id).eq('user_id',user.id).maybeSingle();if(old.error)throw old.error;if(!old.data)return response(404,{error:'Prospect not found'});patch.qualification_json={...(old.data.qualification_json||{}),subject:agent.clean(body.email_subject,180)}}
      const r=await db.from('client_prospects').update(patch).eq('id',body.id).eq('user_id',user.id).select('*').maybeSingle();if(r.error)throw r.error;if(!r.data)return response(404,{error:'Prospect not found'});
      return response(200,{prospect:r.data});
    }
    return response(400,{error:'Unknown Client Agent action'});
  }catch(error){console.error('[client-agent]',body.action,error.provider||error.message);return response(500,{error:'Fuse could not complete this step. Your saved work is safe. Please try again.'})}
};
