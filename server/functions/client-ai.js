// POST /api/client-ai
// AI copilot for one prospect: audit -> outreach -> Loom -> proposal.
// Every claim must be grounded in prospect data already saved in Fuse.
const { admin, getUser, json } = require('./_supabase');

const ACTIONS=new Set(['audit','outreach','loom','proposal']);
function clean(v,max=5000){return typeof v==='string'?v.trim().slice(0,max):''}
function money(v,fallback=0){const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback}
function prospectContext(p={}){
  return {
    business_name:p.brand_name||'',niche:p.niche||'',location:p.location||'',contact_name:p.contact_name||'',
    website:p.website||'',google_maps:p.maps_url||'',rating:p.rating??null,review_count:p.review_count??null,
    visible_problem:p.visible_problem||'',service:p.service||'',offer_price:p.offer_price??null,offer_currency:p.offer_currency||'USD',
    notes:p.notes||'',signals:Array.isArray(p.signals)?p.signals:[],evidence:Array.isArray(p.evidence)?p.evidence:[],
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
  return {score,top_opportunity:top.title,summary:`${p.brand_name} has a pitchable opportunity around ${top.title.toLowerCase()}. Lead with the verified evidence, then ask permission to show the fix.`,findings,offer_angle:p.service||(!p.website?'Landing Page Design':'Google Business Profile Growth'),first_move:'Send an ask-first message and offer a short personalised Loom after they respond.'};
}
function fallbackOutreach(p,audit){
  const first=(audit?.findings||[])[0];
  const evidence=first?.evidence||p.visible_problem||'I noticed an opportunity on your online presence';
  const name=p.contact_name?` ${p.contact_name}`:'';
  const service=audit?.offer_angle||p.service||'online presence';
  return {
    subject:`Quick idea for ${p.brand_name}`,
    email:`Hi${name},\n\nI came across ${p.brand_name} and noticed ${evidence.charAt(0).toLowerCase()+evidence.slice(1)} I have one practical idea around ${service} that could make the next step clearer for potential customers.\n\nWould you like me to record a quick 60–90 second Loom showing exactly what I mean?\n\nNo pressure — happy to send it over if useful.`,
    instagram:`Hi${name} — I found ${p.brand_name} and noticed ${evidence.charAt(0).toLowerCase()+evidence.slice(1)} I have a quick idea that may help. Want me to send a short Loom showing it?`,
    whatsapp:`Hi${name}, I came across ${p.brand_name}. ${evidence} I have one quick improvement idea — can I send you a 60–90 sec Loom showing it?`,
    follow_up:`Hi${name}, just bumping this in case it got buried. Happy to send the quick Loom for ${p.brand_name} if you'd like to see the idea.`
  };
}
function fallbackLoom(p,audit){
  const top=audit?.top_opportunity||p.visible_problem||'one improvement opportunity';
  const service=audit?.offer_angle||p.service||'your online presence';
  return {hook:`Hey — I made this specifically for ${p.brand_name}. I’ll keep it under 90 seconds.`,duration_seconds:75,sections:[
    {time:'0–10s',title:'Personal opener',script:`Show their Google profile or website and say why ${p.brand_name} caught your attention.`,onscreen:'Their profile/site'},
    {time:'10–30s',title:'Show the evidence',script:`Point to the verified issue: ${top}. Do not exaggerate it.`,onscreen:'Exact evidence'},
    {time:'30–55s',title:'Show the fix',script:`Explain one simple ${service} improvement and what a stronger customer journey would look like.`,onscreen:'Simple mockup / example'},
    {time:'55–75s',title:'Ask-first CTA',script:'Invite them to reply if they want you to handle it. Do not force a call.',onscreen:'Your contact / next step'}
  ],cta:`If you'd like, I can take care of this for ${p.brand_name} and keep it maintained monthly. Want me to send the simple scope and price?`};
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
  const system=`You are Fuse Client, a careful client-acquisition strategist for freelancers and small agencies.\nYour job is ${action}.\nReturn valid JSON only, no markdown.\nNever invent website defects, ad activity, founder names, revenue, rankings, customer behaviour, reviews or campaign facts that are not present in the supplied context. Separate verified evidence from recommendations. Use concise natural language, not hype. The outreach must be ask-first and non-spammy. The Loom should be 60–90 seconds unless the user supplied another duration. A proposal must be commercially clear and suitable for a monthly retainer.`;
  const schemas={
    audit:`Return {"score":0,"top_opportunity":"","summary":"","findings":[{"title":"","evidence":"","impact":""}],"offer_angle":"","first_move":""}. Score 0-100 based only on strength of the visible opportunity and contactability.`,
    outreach:`Return {"subject":"","email":"","instagram":"","whatsapp":"","follow_up":""}. Keep the first touch permission-based; ask whether they want the Loom instead of dumping a full pitch.`,
    loom:`Return {"hook":"","duration_seconds":75,"sections":[{"time":"0-10s","title":"","script":"","onscreen":""}],"cta":""}. Give exact screen-recording guidance so a beginner knows what to show and say.`,
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
      const upd=await db.from('client_prospects').update({audit_json:output,audit_summary:summary,offer_angle:angle,opportunity_score:score,status:p.status==='new'?'qualified':p.status,last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id).select('*').single();
      if(upd.error)throw upd.error;
      await activity(db,user.id,p.id,'audit','Audit created',summary,{score,ai_used:aiUsed});
      return json(200,{ok:true,action,ai_used:aiUsed,output,prospect:upd.data});
    }

    const audit=(p.audit_json&&Object.keys(p.audit_json).length)?p.audit_json:fallbackAudit(p);
    if(action==='outreach'){
      output=output||fallbackOutreach(p,audit);
      const upd=await db.from('client_prospects').update({pitch_email:clean(output.email,5000),pitch_instagram:clean(output.instagram,3000),pitch_whatsapp:clean(output.whatsapp,3000),last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',p.id).eq('user_id',user.id).select('*').single();
      if(upd.error)throw upd.error;
      await activity(db,user.id,p.id,'outreach_ready','Outreach ready',clean(output.subject,300),{ai_used:aiUsed,follow_up:clean(output.follow_up,2000)});
      return json(200,{ok:true,action,ai_used:aiUsed,output,prospect:upd.data});
    }
    if(action==='loom'){
      output=output||fallbackLoom(p,audit);
      const ins=await db.from('client_loom_scripts').insert({user_id:user.id,prospect_id:p.id,hook:clean(output.hook,1500),sections:Array.isArray(output.sections)?output.sections.slice(0,8):[],cta:clean(output.cta,1500),duration_seconds:Math.max(30,Math.min(180,Math.round(Number(output.duration_seconds)||75))) }).select('*').single();
      if(ins.error)throw ins.error;
      await activity(db,user.id,p.id,'loom_ready','Loom script ready',clean(output.hook,500),{loom_script_id:ins.data.id,ai_used:aiUsed});
      return json(200,{ok:true,action,ai_used:aiUsed,output:{...output,id:ins.data.id}});
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
