// POST /api/client-ai
// AI copilot for one prospect: audit -> ask-first -> sample -> proposal.
// Every claim must be grounded in prospect data already saved in Fuse.
const { admin, getUser, json } = require('./_supabase');

const ACTIONS=new Set(['audit','outreach','sample','proposal']);
function clean(v,max=5000){return typeof v==='string'?v.trim().slice(0,max):''}
function money(v,fallback=0){const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback}
function prospectContext(p={}){
  return {
    business_name:p.brand_name||'',niche:p.niche||'',location:p.location||'',contact_name:p.contact_name||'',
    founder_name:p.founder_name||'',founder_title:p.founder_title||'',founder_linkedin:p.founder_linkedin||'',founder_email:p.founder_email||'',founder_phone:p.founder_phone||'',founder_instagram:p.founder_instagram||'',
    website:p.website||'',google_maps:p.maps_url||'',rating:p.rating??null,review_count:p.review_count??null,
    visible_problem:p.visible_problem||'',service:p.service||'',offer_price:p.offer_price??null,offer_currency:p.offer_currency||'USD',
    notes:p.notes||'',current_activity:p.current_activity||'',current_activity_url:p.current_activity_url||'',funding_total_usd:p.funding_total_usd??null,funding_source_url:p.funding_source_url||'',
    signals:Array.isArray(p.signals)?p.signals:[],evidence:Array.isArray(p.evidence)?p.evidence:[],source_links:Array.isArray(p.source_links)?p.source_links:[],qualification:p.qualification_json||{},ad_signal:p.ad_signal_json||{},
    existing_audit:p.audit_json||{},existing_summary:p.audit_summary||'',research_summary:p.research_summary||''
  };
}
function fallbackAudit(p){
  const findings=[];
  if(!p.website)findings.push({title:'No website listed',evidence:'No website URL is currently saved from the Google Business Profile.',impact:'A focused landing page could give enquiries a clearer next step.'});
  if(Number.isFinite(Number(p.rating))&&Number(p.rating)<4.4)findings.push({title:'Rating opportunity',evidence:`Google rating: ${Number(p.rating).toFixed(1)}.`,impact:'A stronger review-response and reputation workflow may improve trust over time.'});
  if(Number.isFinite(Number(p.review_count))&&Number(p.review_count)<50)findings.push({title:'Low review volume',evidence:`Google review count: ${Number(p.review_count)}.`,impact:'A consistent review-request system could strengthen local proof.'});
  if(p.visible_problem)findings.push({title:'Visible opportunity',evidence:p.visible_problem,impact:'Use this as the specific opening for outreach rather than a generic pitch.'});
  if(!findings.length)findings.push({title:'Needs a manual visual check',evidence:'Fuse has the business record but not enough verified marketing evidence yet.',impact:'Open the website and Google profile before sending a claim-heavy pitch.'});
  const score=Math.max(35,Math.min(95,Number(p.opportunity_score)||55));
  const top=findings[0];
  return {score,top_opportunity:top.title,summary:`${p.brand_name} has a pitchable opportunity around ${top.title.toLowerCase()}. Lead with the verified evidence, then ask permission to show the fix.`,findings,offer_angle:p.service||(!p.website?'Landing Page Design':'Google Business Profile Growth'),first_move:'Send an ask-first message. Only create one focused sample after they respond positively.'};
}
function fallbackOutreach(p,audit){
  const first=(audit?.findings||[])[0];
  const evidence=first?.evidence||p.current_activity||p.visible_problem||'I noticed a specific opportunity in your current marketing';
  const name=p.founder_name||p.contact_name||'';
  const hello=name?'Hi '+name:'Hi';
  const service=audit?.offer_angle||p.service||'a focused creative improvement';
  const line=hello+', I came across '+p.brand_name+' and noticed '+evidence.charAt(0).toLowerCase()+evidence.slice(1)+' I have one idea for '+service+' that could make that campaign/customer journey clearer. Would you be open to seeing a quick concept?';
  return {
    subject:'Quick idea for '+p.brand_name,
    email:line,
    instagram:line,
    linkedin:line,
    whatsapp:line,
    follow_up:hello+', just following up in case this got buried. I still have the quick concept idea for '+p.brand_name+' if you would like to see it.'
  };
}
function sampleRoute(service=''){
  const s=String(service).toLowerCase();
  if(s.includes('landing')||s.includes('page')||s.includes('website'))return {type:'Landing page concept',route:'/atelier-v2/page-create.html'};
  if(s.includes('video')||s.includes('ugc')||s.includes('ad'))return {type:'Short video / ad concept',route:'/atelier-v2/video-create.html'};
  if(s.includes('flyer')||s.includes('design')||s.includes('brand')||s.includes('creative'))return {type:'Visual creative concept',route:'/atelier-v2/image-create.html'};
  if(s.includes('google business')||s.includes('profile'))return {type:'Google Business Profile content concept',route:'/atelier-v2/image-create.html'};
  return {type:'Creative sample',route:'/atelier-v2/studio.html'};
}
function fallbackSample(p,audit){
  const offer=audit?.offer_angle||p.service||'creative improvement';
  const evidence=p.current_activity||p.visible_problem||audit?.top_opportunity||'the verified opportunity in the audit';
  const route=sampleRoute(offer);
  return {
    sample_type:route.type,
    create_route:route.route,
    objective:'Show '+p.brand_name+' one concrete version of the idea they gave permission to see.',
    what_to_make:'One focused sample only — enough to demonstrate the direction, not free full project delivery.',
    prompt:'Create ONE polished sample for '+p.brand_name+'. Service: '+offer+'. Verified context: '+evidence+'. Solve one narrow visible problem and keep it clearly labelled as a concept. Do not invent performance claims, offers, testimonials, prices or business facts.',
    proof_points:[evidence],
    constraints:['Do not claim it is live or approved.','Do not invent business facts.','Keep the scope intentionally small.'],
    next_steps:['Send the sample with a short explanation.','Ask if they want the full implementation.','If they agree, prepare the proposal.'],
    submission_message:'Hi '+(p.founder_name||p.contact_name||'')+((p.founder_name||p.contact_name)?', ':'')+'here is the quick concept I mentioned for '+p.brand_name+'. I kept it focused so you can see the direction without overcomplicating it. If this feels aligned, the next step is for me to turn it into the complete version and manage the agreed work. Want me to send the scope and price?'
  };
}
function fallbackProposal(p,audit){
  const cur=p.offer_currency||'USD';
  const monthly=money(p.offer_price,cur==='NGN'?100000:500);
  const service=audit?.offer_angle||p.service||'Local growth support';
  const scope=[
    {title:'Initial optimisation',text:`Fix the highest-priority ${service} opportunity identified in the audit.`},
    {title:'Monthly upkeep',text:'Maintain the agreed assets/profile workflow and keep the client-facing experience current.'},
    {title:'Monthly report',text:'Share completed work, key observations and next actions in one simple report.'}
  ];
  return {title:`${p.brand_name} — Monthly Growth Proposal`,summary:`A focused monthly service built around the specific opportunity identified for ${p.brand_name}, without adding unnecessary deliverables.`,scope,monthly_price:monthly,setup_fee:0,currency:cur,proposal_copy:`Hi ${p.contact_name||p.brand_name},\n\nBased on the audit, I’d recommend a simple monthly ${service} engagement.\n\nThe focus is to fix the priority issue first, then keep the system maintained each month so it does not become another one-off project.\n\nMonthly investment: ${cur} ${monthly.toLocaleString()}\n\nIf that works for you, I can send the onboarding steps and begin with the first optimisation.`};
}
async function gemini(action,p,extra={}){
  const key=(process.env.GEMINI_API_KEY||'').trim();
  if(!key)return null;
  const context=prospectContext(p);
  const system=`You are Fuse Client, a careful client-acquisition strategist for freelancers and small agencies.\nYour job is ${action}.\nReturn valid JSON only, no markdown.\nNever invent website defects, ad activity, founder names, funding, revenue, rankings, customer behaviour, reviews or campaign facts that are not present in the supplied context. Separate verified evidence from recommendations. Use concise natural language, not hype. The acquisition order is find -> audit -> ask-first -> create one sample only after a positive reply -> submit sample -> proposal -> contract -> retainer -> automation. The first outreach must ask whether they want to see the idea and must never claim a sample already exists. A proposal must be commercially clear and suitable for a monthly retainer.`;
  const schemas={
    audit:`Return {"score":0,"top_opportunity":"","summary":"","findings":[{"title":"","evidence":"","impact":""}],"offer_angle":"","first_move":""}. Score 0-100 based only on strength of the visible opportunity and contactability.`,
    outreach:`Return {"subject":"","email":"","instagram":"","linkedin":"","whatsapp":"","follow_up":""}. Keep the first touch permission-based; end by asking whether they want to see a quick concept. Do not say the concept already exists.`,
    sample:`Return {"sample_type":"","create_route":"","objective":"","what_to_make":"","prompt":"","proof_points":[""],"constraints":[""],"next_steps":[""],"submission_message":""}. Make ONE useful sample only after a positive reply, not a full free project.`,
    proposal:`Return {"title":"","summary":"","scope":[{"title":"","text":""}],"monthly_price":0,"setup_fee":0,"currency":"USD","proposal_copy":""}. Keep 3-5 clear deliverables and position it as a monthly outcome-focused service.`
  };
  const payload={system_instruction:{parts:[{text:system+'\n'+schemas[action]}]},contents:[{role:'user',parts:[{text:JSON.stringify({context,extra})}]}],generationConfig:{temperature:.45,response_mime_type:'application/json',maxOutputTokens:4500}};
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(body?.error?.message||'Fuse Client AI could not finish this step.');
  const text=body?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')||'';
  if(!text)throw new Error('Fuse Client AI returned no content.');
  return JSON.parse(text);
}
async function activity(db,userId,prospectId,type,title,body='',metadata={}){
  await db.from('client_activities').insert({user_id:userId,prospect_id:prospectId,activity_type:type,title,body,metadata});
}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const action=clean(body.action,30).toLowerCase(),prospectId=clean(body.prospect_id,80);
    if(!ACTIONS.has(action)||!prospectId)return json(400,{error:'Choose a prospect and a valid Fuse Client action.'});
    const db=admin();
    const q=await db.from('client_prospects').select('*').eq('id',prospectId).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;if(!q.data)return json(404,{error:'Prospect not found.'});
    const p=q.data;
    let output=null,aiUsed=false;
    try{output=await gemini(action,p,body.extra||{});aiUsed=!!output}catch(e){console.error('[client-ai] Gemini fallback',action,e?.message)}

    if(action==='audit'){
      output=output||fallbackAudit(p);
      const score=Math.max(0,Math.min(100,Math.round(Number(output.score)||Number(p.opportunity_score)||55)));
      const summary=clean(output.summary,3000),angle=clean(output.offer_angle,300);
      const upd=await db.from('client_prospects').update({audit_json:output,audit_summary:summary,offer_angle:angle,opportunity_score:score,status:p.status==='new'?'audited':p.status,last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id).select('*').single();
      if(upd.error)throw upd.error;
      await activity(db,user.id,p.id,'audit','Audit created',summary,{score,ai_used:aiUsed});
      return json(200,{ok:true,action,ai_used:aiUsed,output,prospect:upd.data});
    }

    const audit=(p.audit_json&&Object.keys(p.audit_json).length)?p.audit_json:fallbackAudit(p);
    if(action==='outreach'){
      output=output||fallbackOutreach(p,audit);
      const upd=await db.from('client_prospects').update({pitch_email:clean(output.email,5000),pitch_instagram:clean(output.instagram,3000),pitch_linkedin:clean(output.linkedin,3000),pitch_whatsapp:clean(output.whatsapp,3000),last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id).select('*').single();
      if(upd.error)throw upd.error;
      await activity(db,user.id,p.id,'outreach_ready','Outreach ready',clean(output.subject,300),{ai_used:aiUsed,follow_up:clean(output.follow_up,2000)});
      return json(200,{ok:true,action,ai_used:aiUsed,output,prospect:upd.data});
    }
    if(action==='sample'){
      output=output||fallbackSample(p,audit);
      const brief={
        sample_type:clean(output.sample_type,180),
        create_route:clean(output.create_route,500),
        objective:clean(output.objective,1200),
        what_to_make:clean(output.what_to_make,1200),
        prompt:clean(output.prompt,6000),
        proof_points:Array.isArray(output.proof_points)?output.proof_points.slice(0,8):[],
        constraints:Array.isArray(output.constraints)?output.constraints.slice(0,8):[],
        next_steps:Array.isArray(output.next_steps)?output.next_steps.slice(0,8):[]
      };
      const upd=await db.from('client_prospects').update({
        sample_brief:brief,
        sample_type:brief.sample_type||null,
        sample_status:'brief_ready',
        sample_submission_copy:clean(output.submission_message,5000),
        sample_created_at:new Date().toISOString(),
        status:p.status==='replied'?'sample_ready':p.status,
        last_activity_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq('id',p.id).eq('user_id',user.id).select('*').single();
      if(upd.error)throw upd.error;
      await activity(db,user.id,p.id,'sample_ready','Sample brief ready',brief.what_to_make,{ai_used:aiUsed,sample_type:brief.sample_type});
      return json(200,{ok:true,action,ai_used:aiUsed,output:{...output,...brief},prospect:upd.data});
    }
    if(action==='proposal'){
      output=output||fallbackProposal(p,audit);
      const currency=clean(output.currency,8)||p.offer_currency||'USD';
      const monthly=money(output.monthly_price,money(p.offer_price,0));
      const ins=await db.from('client_proposals').insert({user_id:user.id,prospect_id:p.id,title:clean(output.title,220)||`${p.brand_name} — Proposal`,summary:clean(output.summary,4000),scope:Array.isArray(output.scope)?output.scope.slice(0,8):[],monthly_price:monthly,setup_fee:money(output.setup_fee,0),currency,proposal_copy:clean(output.proposal_copy,10000)}).select('*').single();
      if(ins.error)throw ins.error;
      await db.from('client_prospects').update({proposal_copy:clean(output.proposal_copy,10000),last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id);
      await activity(db,user.id,p.id,'proposal_ready','Proposal ready',clean(output.summary,700),{proposal_id:ins.data.id,monthly_price:monthly,currency,ai_used:aiUsed});
      return json(200,{ok:true,action,ai_used:aiUsed,output:{...output,id:ins.data.id,public_token:ins.data.public_token}});
    }
    return json(400,{error:'Unsupported action.'});
  }catch(e){
    console.error('[client-ai]',e);
    return json(500,{error:e?.message||'Fuse Client could not finish this step.'});
  }
};
