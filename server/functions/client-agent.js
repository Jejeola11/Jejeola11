'use strict';
const {admin,getUser,json}=require('./_supabase');
const agent=require('./_client-agent-v2');
const conversation=require('./_client-agent-conversation');
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
const statuses=new Set(['new','asked','replied','sample_ready','sample_sent','proposal_sent','deposit_paid','in_delivery','delivered','won','lost']);
function response(code,data){const r=json(code,data);r.headers['Cache-Control']='no-store';return r}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return response(405,{error:'Method not allowed'});
  const user=await getUser(event);if(!user)return response(401,{error:'Please sign in to open your Client Agent.'});
  let body;try{if((event.body||'').length>70000)return response(413,{error:'Please shorten your assignments.'});body=JSON.parse(event.body||'{}')}catch{return response(400,{error:'Invalid request'})}
  const db=admin();
  try{
    const [account,grants]=await Promise.all([db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle(),db.from('module_unlocks').select('module_key').eq('user_id',user.id)]);
    if(account.error||grants.error)throw account.error||grants.error;
    const owned=new Set((grants.data||[]).map(row=>row.module_key));
    const allowed=account.data?.is_admin||['money','ai-video-client-challenge','atelier-starter','atelier-creator','atelier-empire','atelier-full'].some(key=>owned.has(key));
    if(!allowed){
      if(body.action==='load')return response(200,{locked:true});
      return response(403,{error:'Unlock Money Engine or the 14-Day Challenge to use the Client Agent.',code:'AGENT_COURSE_REQUIRED'});
    }
    if(body.action==='load'){
      const [profile,prospects,jobs,balance,followups]=await Promise.all([
        db.from('client_agent_profiles').select('*').eq('user_id',user.id).maybeSingle(),
        db.from('client_prospects').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(300),
        db.from('client_agent_jobs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
        db.from('profiles').select('credits').eq('id',user.id).single(),
        db.from('client_agent_followups').select('id,prospect_id,due_at,status,draft,sent_at,last_error').eq('user_id',user.id).order('created_at',{ascending:false}).limit(300)
      ]);for(const r of [profile,prospects,jobs,balance,followups])if(r.error)throw r.error;
      return response(200,{followups:followups.data||[],profile:profile.data?.profile_json||null,prospects:prospects.data||[],jobs:(jobs.data||[]).map(agent.publicJob),credits:balance.data.credits,research_cost:30});
    }
    if(body.action==='organize'){
      if(!agent.clean(body.day1)&&!agent.clean(body.day2))return response(400,{error:'Paste some notes about your skills or service offer first.'});
      // Existing user-owned activity rows provide a small, server-enforced rate limit.
      const recent=await db.from('client_activities').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('activity_type','profile_organized').contains('metadata',{success:true}).gte('created_at',new Date(Date.now()-3600000).toISOString());
      if(recent.error)throw recent.error;if(recent.count>=5)return response(429,{error:'You can organize your answers five times per hour. You can still edit every field manually.'});
      const fields=await agent.organize(body);
      const activity=await db.from('client_activities').insert({user_id:user.id,activity_type:'profile_organized',title:'Organized service notes',metadata:{success:true}});if(activity.error)throw activity.error;
      return response(200,{fields});
    }
    if(body.action==='reset-profile'){
      // Scope the reset to the signed-in user. Research history is independent.
      const saved=await db.from('client_agent_profiles').delete().eq('user_id',user.id);
      if(saved.error)throw saved.error;
      return response(200,{profile:null});
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
    if(body.action==='enrich-contacts'){
      if(!uuid(body.id))return response(400,{error:'Invalid prospect ID'});
      const old=await db.from('client_prospects').select('*').eq('id',body.id).eq('user_id',user.id).maybeSingle();if(old.error)throw old.error;if(!old.data)return response(404,{error:'Prospect not found'});
      const prior=old.data.qualification_json||{};
      if(prior.contact_research?.checked_at&&Date.now()-Date.parse(prior.contact_research.checked_at)<3600000)return response(200,{prospect:old.data,cached:true});
      const recent=await db.from('client_activities').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('activity_type','contact_research').gte('created_at',new Date(Date.now()-3600000).toISOString());if(recent.error)throw recent.error;if(recent.count>=10)return response(429,{error:'You can refresh contacts for ten businesses per hour.'});
      const attempt=await db.from('client_activities').insert({user_id:user.id,activity_type:'contact_research',title:'Researching public business contacts',metadata:{prospect_id:body.id}});if(attempt.error)throw attempt.error;
      const enriched=await agent.enrichContacts({name:old.data.brand_name,website:old.data.website,location:old.data.location});
      const current=await db.from('client_prospects').select('qualification_json').eq('id',body.id).eq('user_id',user.id).single();if(current.error)throw current.error;
      const q=current.data.qualification_json||{};
      const contacts=[...enriched.contacts,...(q.contacts||[]),...['email','instagram','whatsapp'].filter(k=>old.data[k]).map(k=>({kind:k,value:old.data[k],source_url:old.data.website}))].filter(c=>c.kind!=='website').filter((c,i,a)=>a.findIndex(x=>x.kind===c.kind&&x.value===c.value)===i);
      if(!contacts.length)contacts.push({kind:'website',value:old.data.website,source_url:old.data.website});
      const person=enriched.person||q.person||null;
      const patch={qualification_json:{...q,version:2,contacts,person,contact_research:enriched},updated_at:new Date().toISOString()};
      if(person){patch.contact_name=person.name;patch.founder_name=person.name;patch.founder_title=person.role;}
      for(const kind of ['email','instagram','whatsapp']){const found=contacts.find(c=>c.kind===kind);if(found)patch[kind]=found.value;}
      const saved=await db.from('client_prospects').update(patch).eq('id',body.id).eq('user_id',user.id).select('*').single();if(saved.error)throw saved.error;
      return response(200,{prospect:saved.data});
    }
    if(['record-message','draft-reply','refresh-pitch','stop-followups'].includes(body.action)){
      if(!uuid(body.id))return response(400,{error:'Invalid prospect ID'});
      const old=await db.from('client_prospects').select('*').eq('id',body.id).eq('user_id',user.id).maybeSingle();if(old.error)throw old.error;if(!old.data)return response(404,{error:'Prospect not found'});
      let prospect=old.data;
      if(body.action==='stop-followups'){
        const stopped=await db.from('client_agent_followups').update({status:'cancelled',lease_token:null,lease_until:null}).eq('prospect_id',body.id).eq('user_id',user.id).in('status',['pending','working']);if(stopped.error)throw stopped.error;
        const changed=await db.from('client_prospects').update({next_follow_up:null}).eq('id',body.id).eq('user_id',user.id).select('*').single();if(changed.error)throw changed.error;
        return response(200,{prospect:changed.data});
      }
      if(body.action==='record-message'){
        if(!['initial','reply','followup'].includes(body.kind))return response(400,{error:'Choose the message type'});
        const recorded=await db.rpc('client_agent_record_message',{p_user:user.id,p_id:body.id,p_kind:body.kind,p_message:agent.clean(body.message,8000),p_channel:agent.clean(body.channel,30)||'email'});if(recorded.error)return response(400,{error:recorded.error.message});
        return response(200,{prospect:recorded.data});
      }
      const recent=await db.from('client_activities').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('activity_type','conversation_assist').gte('created_at',new Date(Date.now()-3600000).toISOString());if(recent.error)throw recent.error;if(recent.count>=10)return response(429,{error:'You can prepare ten conversation drafts per hour.'});
      const attempt=await db.from('client_activities').insert({user_id:user.id,prospect_id:body.id,activity_type:'conversation_assist',title:'Preparing a draft'});if(attempt.error)throw attempt.error;
      if(body.action==='draft-reply'){
        const actual=agent.clean(body.reply,8000);if(!actual)return response(400,{error:'Paste the actual reply first.'});
        const received=await db.rpc('client_agent_record_message',{p_user:user.id,p_id:body.id,p_kind:'received',p_message:actual,p_channel:agent.clean(body.channel,30)||'email'});if(received.error)throw received.error;prospect=received.data;
      }
      const profile=await db.from('client_agent_profiles').select('profile_json').eq('user_id',user.id).maybeSingle();if(profile.error)throw profile.error;
      const draft=body.action==='refresh-pitch'?await agent.redraft(profile.data?.profile_json||prospect.qualification_json?.approved_offer,prospect):await conversation.draft(prospect,profile.data?.profile_json||prospect.qualification_json?.approved_offer,prospect.conversation_json||[]);
      const q=prospect.qualification_json||{};
      const patch=body.action==='refresh-pitch'?{pitch_email:draft.email,pitch_instagram:draft.dm,pitch_linkedin:draft.dm,qualification_json:{...q,subject:draft.subject,approach:draft.approach,approach_reason:draft.reason}}:{qualification_json:{...q,reply_assist:{...draft,based_on_reply_text:prospect.reply_text,created_at:new Date().toISOString()}},...(draft.stop?{status:'lost'}:{})};
      const saved=await db.from('client_prospects').update({...patch,updated_at:new Date().toISOString()}).eq('id',body.id).eq('user_id',user.id).select('*').single();if(saved.error)throw saved.error;
      return response(200,{prospect:saved.data,draft});
    }
    if(body.action==='update-prospect'){
      if(!uuid(body.id))return response(400,{error:'Invalid prospect ID'});
      const patch={updated_at:new Date().toISOString()};
      if(body.status!==undefined){if(!statuses.has(body.status))return response(400,{error:'Choose a valid status'});patch.status=body.status}
      if(body.notes!==undefined)patch.notes=agent.clean(body.notes,8000);
      if(body.reply_text!==undefined){patch.reply_text=agent.clean(body.reply_text,8000);if(patch.reply_text)patch.replied_at=patch.updated_at}
      for(const field of ['pitch_email','pitch_instagram'])if(body[field]!==undefined)patch[field]=agent.clean(body[field],6000);
      if(body.email_subject!==undefined){const old=await db.from('client_prospects').select('qualification_json').eq('id',body.id).eq('user_id',user.id).maybeSingle();if(old.error)throw old.error;if(!old.data)return response(404,{error:'Prospect not found'});patch.qualification_json={...(old.data.qualification_json||{}),subject:agent.clean(body.email_subject,180)}}
      const r=await db.from('client_prospects').update(patch).eq('id',body.id).eq('user_id',user.id).select('*').maybeSingle();if(r.error)throw r.error;if(!r.data)return response(404,{error:'Prospect not found'});
      return response(200,{prospect:r.data});
    }
    return response(400,{error:'Unknown Client Agent action'});
  }catch(error){console.error('[client-agent]',body.action,error.provider||error.message);return response(500,{error:'Fuse could not complete this step. Your saved work is safe. Please try again.'})}
};

