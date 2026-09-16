// ============================================================
// POST /api/page-revise
// Natural-language edits for Fuse Pages. Produces a new saved version.
// V1 text revisions do not spend credits; media generations keep using their
// normal Image/Video credit pricing.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

function clean(v,max=1800){return typeof v==='string'?v.trim().slice(0,max):''}
function clone(v){return JSON.parse(JSON.stringify(v||{}))}
function colorFromInstruction(s){
  const t=s.toLowerCase();
  if(/lime|chartreuse/.test(t))return '#DFFF4E';
  if(/yellow|gold/.test(t))return '#FFE66A';
  if(/white|cream/.test(t))return '#EEFFE0';
  if(/light teal/.test(t))return '#1B4C52';
  if(/deep teal|dark teal|black teal/.test(t))return '#001012';
  return '';
}
function fallbackRevision(spec,instruction){
  const next=clone(spec);
  next.theme=next.theme||{};
  next.motion=next.motion||{};
  next.hero=next.hero||{};
  const t=instruction.toLowerCase();
  if(/\blight (mode|theme|background)\b/.test(t))next.theme.mode='light';
  if(/\b(dark|black) (mode|theme|background)\b/.test(t))next.theme.mode='dark';
  const color=colorFromInstruction(instruction);
  if(color)next.theme.accent=color;
  if(/\b3d\b/.test(t)){next.theme.experience='3d';next.motion.level='3d';next.motion.three_d=true;next.motion.parallax=true;next.motion.reveal=true}
  else if(/cinematic/.test(t)){next.theme.experience='cinematic';next.motion.level='cinematic';next.motion.reveal=true;next.motion.parallax=true}
  else if(/animated|animation/.test(t)){next.theme.experience='animated';next.motion.level='animated';next.motion.reveal=true}
  else if(/minimal|clean/.test(t)){next.theme.experience='clean';next.motion.level='clean';next.motion.reveal=false;next.motion.parallax=false}
  const quoted=instruction.match(/(?:headline|title)\s+(?:to|as)\s+[“"']([^”"']{3,140})[”"']/i);
  if(quoted)next.hero.headline=quoted[1].trim();
  next.meta=next.meta||{};
  next.meta.last_revision_instruction=instruction;
  return next;
}
async function aiRevision(spec,instruction){
  const key=(process.env.GEMINI_API_KEY||'').trim();
  if(!key)return null;
  const system=`You are Fuse Pages' senior web creative director.
Edit the supplied SiteSpec according to the user's instruction.
Return the COMPLETE updated SiteSpec as JSON only, no markdown.
Preserve facts the user did not ask to change. Never invent verifiable statistics, real client names, awards, or testimonials.
Do not output HTML, JavaScript, CSS, external scripts, or executable code.
Allowed structure is the existing JSON SiteSpec only. Keep 5-10 useful sections and concise premium conversion copy.
If asked for 3D, set theme.experience/motion appropriately but keep the content usable on mobile.`;
  const payload={
    system_instruction:{parts:[{text:system}]},
    contents:[{role:'user',parts:[{text:JSON.stringify({instruction,current_site_spec:spec})}]}],
    generationConfig:{temperature:.55,response_mime_type:'application/json',maxOutputTokens:7500}
  };
  const url='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key);
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const j=await r.json();
  if(!r.ok)throw new Error((j.error&&j.error.message)||'AI edit failed.');
  const txt=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  return txt?JSON.parse(txt):null;
}
function normalize(candidate,base,instruction){
  if(!candidate||typeof candidate!=='object')return fallbackRevision(base,instruction);
  const next={...clone(base),...candidate};
  next.meta={...(base.meta||{}),...(candidate.meta||{}),last_revision_instruction:instruction};
  next.theme={...(base.theme||{}),...(candidate.theme||{})};
  next.nav={...(base.nav||{}),...(candidate.nav||{})};
  next.hero={...(base.hero||{}),...(candidate.hero||{}),visual:{...(base.hero?.visual||{}),...(candidate.hero?.visual||{})}};
  next.motion={...(base.motion||{}),...(candidate.motion||{})};
  next.assets={...(base.assets||{}),...(candidate.assets||{})};
  next.sections=Array.isArray(candidate.sections)&&candidate.sections.length?candidate.sections.slice(0,12):(base.sections||[]);
  return next;
}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const projectId=String(body.project_id||'').trim();
    const instruction=clean(body.instruction,1800);
    if(!projectId)return json(400,{error:'Missing website project.'});
    if(!instruction)return json(400,{error:'Tell Fuse what you want to change.'});

    const db=admin();
    const current=await db.from('page_projects').select('id,title,page_type,site_spec').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(current.error)throw current.error;
    if(!current.data)return json(404,{error:'Website project not found.'});

    let raw=null,aiUsed=false;
    try{raw=await aiRevision(current.data.site_spec||{},instruction);aiUsed=!!raw}catch(e){console.error('[page-revise] Gemini fallback:',e&&e.message)}
    const spec=normalize(raw,current.data.site_spec||{},instruction);

    const latest=await db.from('page_versions').select('version_no').eq('project_id',projectId).eq('user_id',user.id).order('version_no',{ascending:false}).limit(1);
    if(latest.error)throw latest.error;
    const versionNo=((latest.data&&latest.data[0]&&latest.data[0].version_no)||0)+1;

    const upd=await db.from('page_projects').update({site_spec:spec,status:'draft'}).eq('id',projectId).eq('user_id',user.id).select('*').single();
    if(upd.error)throw upd.error;
    const ver=await db.from('page_versions').insert({
      project_id:projectId,user_id:user.id,version_no:versionNo,site_spec:spec,note:'Ask Fuse: '+instruction.slice(0,80)
    }).select('id,version_no,note,created_at').single();
    if(ver.error)throw ver.error;

    return json(200,{ok:true,project:upd.data,version:ver.data,spec,ai_used:aiUsed});
  }catch(e){
    console.error('[page-revise]',e);
    return json(500,{error:(e&&e.message)||'Could not update this website.'});
  }
};
