// ============================================================
// POST /api/page-generate
// Fuse Pages V1: brief -> structured SiteSpec -> saved project + version.
//
// Uses OpenAI when OPENAI_API_KEY is configured, with a deterministic premium
// fallback so the builder still works if the text model is temporarily
// unavailable. V1 does NOT deduct credits yet; generation pricing will be
// attached after the product flow is approved.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const ALLOWED_TYPES = new Set(['landing','sales','business','portfolio','3d']);
const ALLOWED_EXPERIENCES = new Set(['clean','animated','cinematic','3d']);

function cleanText(v, max=5000) {
  return typeof v === 'string' ? v.trim().slice(0,max) : '';
}
function safeUrl(v='') {
  try {
    const u=new URL(String(v));
    return u.protocol==='https:' ? u.toString() : '';
  } catch { return ''; }
}
function contactFromPrompt(prompt=''){
  const url=(prompt.match(/https?:\/\/[^\s)\]}>,]+/i)||[])[0]||'';
  const email=(prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';
  const phone=(prompt.match(/(?:\+?\d[\d\s().-]{7,}\d)/)||[])[0]||'';
  return {cta_url:safeUrl(url),email,phone:phone.trim()};
}
function titleCase(s='') {
  return s.replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase()).trim();
}
function inferBrand(prompt='') {
  const patterns=[
    /(?:called|named|for)\s+["“']?([A-Z][A-Za-z0-9&' .-]{1,42})["”']?(?:[,.]|\s+(?:with|that|a|an|brand|business))/,
    /^\s*([A-Z][A-Za-z0-9&' .-]{2,36})\s+(?:is|—|-)/
  ];
  for(const p of patterns){const m=prompt.match(p);if(m&&m[1])return m[1].trim()}
  return 'Your Brand';
}
function shortLead(prompt='') {
  const first=(prompt.split(/[.!?\n]/)[0]||'').trim();
  return first.length>92?first.slice(0,89)+'…':first;
}
function typeLabel(type) {
  return ({landing:'AI Landing Page',sales:'Sales Page',business:'Business Website',portfolio:'Portfolio','3d':'3D Interactive Website'})[type]||'Website';
}
function defaultSections(type, brand) {
  const common=[
    {type:'trust',title:'Why people choose '+brand,items:['Clear value','Premium experience','Built for action']},
    {type:'features',eyebrow:'WHAT YOU GET',title:'Everything designed around the outcome',items:[
      {title:'Focused offer',text:'A clear path from attention to action.'},
      {title:'Premium presentation',text:'Strong hierarchy, spacing and visual direction.'},
      {title:'Mobile first',text:'A polished experience across phone and desktop.'}
    ]},
    {type:'testimonials',eyebrow:'PROOF',title:'Built to earn trust',items:[
      {quote:'A clear, polished experience that makes the offer easy to understand.',name:'Client review'},
      {quote:'Premium enough to feel established, simple enough to take action.',name:'Customer feedback'}
    ]},
    {type:'faq',title:'Questions, answered',items:[
      {q:'What happens next?',a:'Use the primary call to action to get started.'},
      {q:'Can I ask a question first?',a:'Yes — reach out through the contact option on this page.'}
    ]},
    {type:'cta',eyebrow:'READY?',title:'Turn interest into the next step',text:'Make the decision easy with one clear action.',button:'Get started'}
  ];
  if(type==='sales'){
    common.splice(1,0,{type:'problem',eyebrow:'THE SHIFT',title:'From interest to a confident yes',text:'Show the problem, the desired outcome, and why this offer is the bridge.'});
    common.splice(3,0,{type:'offer',eyebrow:'THE OFFER',title:'What is included',items:['Core deliverable','Support or bonus','Clear next step']});
  }
  if(type==='business'){
    common.splice(2,0,{type:'services',eyebrow:'SERVICES',title:'How we can help',items:[
      {title:'Signature service',text:'Describe the strongest service clearly.'},
      {title:'Premium service',text:'Show the higher-value option.'},
      {title:'Custom support',text:'Give clients an easy route to ask.'}
    ]});
  }
  if(type==='portfolio'){
    common.splice(1,0,{type:'projects',eyebrow:'SELECTED WORK',title:'Work that shows the standard',items:[
      {title:'Project One',text:'A short case-study outcome.'},
      {title:'Project Two',text:'A short case-study outcome.'},
      {title:'Project Three',text:'A short case-study outcome.'}
    ]});
  }
  if(type==='3d'){
    common.splice(1,0,{type:'immersive',eyebrow:'INTERACTIVE',title:'A site with depth, motion and presence',text:'Layered visuals, scroll-led reveals and lightweight 3D moments make the experience feel cinematic.'});
  }
  return common;
}
function fallbackSpec(brief) {
  const brand=inferBrand(brief.prompt);
  const lead=shortLead(brief.prompt);
  const experience=brief.experience||'clean';
  const uploadedImage=(brief.attachments||[]).find(x=>x&&String(x.type||'').startsWith('image/')&&x.url);
  const uploadedVideo=(brief.attachments||[]).find(x=>x&&String(x.type||'').startsWith('video/')&&x.url);
  const contact=contactFromPrompt(brief.prompt);
  const headline=lead || (
    brief.type==='portfolio' ? 'Make the work impossible to overlook.' :
    brief.type==='business' ? 'A premium digital home for '+brand+'.' :
    brief.type==='sales' ? 'Turn attention into a confident yes.' :
    brief.type==='3d' ? 'Build an experience people remember.' :
    'A landing page designed to move people.'
  );
  return {
    schema_version:1,
    meta:{
      title:brand,
      page_type:brief.type,
      objective:brief.type==='sales'?'Sell one clear offer':brief.type==='portfolio'?'Showcase expertise and convert enquiries':brief.type==='business'?'Build trust and generate leads':brief.type==='3d'?'Create an immersive brand experience':'Convert visitors around one focused CTA',
      audience:'People most likely to need this offer',
      source_prompt:brief.prompt
    },
    theme:{
      mode:'dark',
      accent:'#DFFF4E',
      secondary:'#FFE66A',
      surface:'#062125',
      font_style:'modern',
      experience,
      radius:'soft',
      density:'airy'
    },
    nav:{brand,items:['About','Proof','FAQ'],cta:'Get started'},
    contact,
    hero:{
      eyebrow:typeLabel(brief.type).toUpperCase(),
      headline,
      subheadline:'A clear, premium experience built around the offer, the audience and the next action.',
      primary_cta:'Get started',
      secondary_cta:'See more',
      visual:{
        type: brief.type==='3d' || experience==='3d' ? 'orb-3d' : experience==='cinematic' ? 'cinematic-gradient' : 'editorial-gradient',
        prompt:'Premium brand hero visual for '+brand+', clean composition, commercial art direction',
        image_url:uploadedImage?uploadedImage.url:'',
        video_url:uploadedVideo?uploadedVideo.url:''
      }
    },
    sections:defaultSections(brief.type,brand),
    motion:{
      level:experience,
      parallax:experience!=='clean',
      reveal:experience!=='clean',
      three_d:brief.type==='3d'||experience==='3d'
    },
    assets:{
      generate:!!brief.generateAssets,
      requested:[
        {role:'hero',kind:'image',prompt:'Premium hero campaign visual for '+brand},
        ...(experience==='cinematic'?[{role:'hero-loop',kind:'video',prompt:'5 second cinematic brand loop for '+brand}]:[]),
        ...(brief.type==='3d'||experience==='3d'?[{role:'interactive-object',kind:'3d-direction',prompt:'Floating premium object / product scene for '+brand}]:[])
      ]
    }
  };
}
function normalizeSpec(raw, brief) {
  const fallback=fallbackSpec(brief);
  if(!raw || typeof raw!=='object') return fallback;
  const spec={...fallback,...raw};
  spec.schema_version=1;
  spec.meta={...fallback.meta,...(raw.meta||{}),page_type:brief.type,source_prompt:brief.prompt};
  spec.theme={...fallback.theme,...(raw.theme||{}),experience:brief.experience||fallback.theme.experience};
  spec.nav={...fallback.nav,...(raw.nav||{})};
  spec.contact={...fallback.contact,...(raw.contact||{})};
  spec.hero={...fallback.hero,...(raw.hero||{}),visual:{...fallback.hero.visual,...((raw.hero&&raw.hero.visual)||{})}};
  spec.sections=Array.isArray(raw.sections)&&raw.sections.length?raw.sections.slice(0,12):fallback.sections;
  spec.motion={...fallback.motion,...(raw.motion||{})};
  spec.assets={...fallback.assets,...(raw.assets||{}),generate:!!brief.generateAssets};
  return spec;
}
async function openAiSpec(brief) {
  const apiKey=(process.env.OPENAI_API_KEY||'').trim();
  if(!apiKey) return null;
  const instruction=`You are Fuse Pages Creative Director. Turn a website brief into a concise JSON SiteSpec for a premium, mobile-first website. Return JSON only, never markdown. Include meta, theme, nav, contact, hero, 5-9 sections, motion and assets. Use specific conversion-focused copy based on the actual brief. Never invent statistics or real testimonials. For 3D, use a lightweight orb/product-depth direction with a mobile fallback.`;
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({model:process.env.OPENAI_PAGE_MODEL||'gpt-4.1-mini',input:[
      {role:'system',content:[{type:'input_text',text:instruction}]},
      {role:'user',content:[{type:'input_text',text:JSON.stringify({page_type:brief.type,experience:brief.experience,generate_assets:brief.generateAssets,prompt:brief.prompt,attachment_names:(brief.attachments||[]).map(x=>x.name).slice(0,8)})}]}
    ]})
  });
  const body=await response.json();
  if(!response.ok) throw new Error((body.error&&body.error.message)||'OpenAI website planning request failed.');
  const output=String(body.output_text||'').trim();
  if(!output) throw new Error('OpenAI website planner returned no content.');
  return JSON.parse(output.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
}

function ensureSectionIds(spec){
  const out={...spec};
  out.sections=(Array.isArray(spec.sections)?spec.sections:[]).map((s,i)=>({
    ...s,
    id: cleanText(s&&s.id,80) || ('sec-'+Date.now().toString(36)+'-'+(i+1)+'-'+Math.random().toString(36).slice(2,7))
  }));
  return out;
}
function projectTitle(spec,brief){
  const t=cleanText(spec?.meta?.title,80);
  return t&&t!=='Your Brand'?t:typeLabel(brief.type);
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const b=body.brief&&typeof body.brief==='object'?body.brief:body;
    const brief={
      prompt:cleanText(b.prompt,5000),
      type:ALLOWED_TYPES.has(String(b.type||'').toLowerCase())?String(b.type).toLowerCase():'landing',
      experience:ALLOWED_EXPERIENCES.has(String(b.experience||'').toLowerCase())?String(b.experience).toLowerCase():'clean',
      generateAssets:b.generateAssets===true,
      attachments:Array.isArray(b.attachments)?b.attachments.slice(0,8).map(x=>({
        name:cleanText(x&&x.name,120),
        type:cleanText(x&&x.type,80),
        url:safeUrl(x&&x.url)
      })).filter(x=>x.name||x.url):[]
    };
    if(!brief.prompt)return json(400,{error:'Describe the website you want to build first.'});

    let aiUsed=false,raw=null;
    try{raw=await openAiSpec(brief);aiUsed=!!raw}catch(e){console.error('[page-generate] OpenAI fallback:',e&&e.message)}
    const spec=ensureSectionIds(normalizeSpec(raw,brief));
    const db=admin();
    const requestedProject=cleanText(body.project_id,80);
    let project=null;

    if(requestedProject){
      const existing=await db.from('page_projects').select('id,user_id,title').eq('id',requestedProject).eq('user_id',user.id).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data){
        const nextVersionRes=await db.from('page_versions').select('version_no').eq('project_id',requestedProject).order('version_no',{ascending:false}).limit(1);
        if(nextVersionRes.error)throw nextVersionRes.error;
        const next=((nextVersionRes.data&&nextVersionRes.data[0]&&nextVersionRes.data[0].version_no)||0)+1;
        const upd=await db.from('page_projects').update({
          title:projectTitle(spec,brief),page_type:brief.type,site_spec:spec,status:'draft'
        }).eq('id',requestedProject).eq('user_id',user.id).select('*').single();
        if(upd.error)throw upd.error;
        project=upd.data;
        const ver=await db.from('page_versions').insert({
          project_id:project.id,user_id:user.id,version_no:next,site_spec:spec,note:'AI revision'
        }).select('id,version_no').single();
        if(ver.error)throw ver.error;
        return json(200,{ok:true,project,version:ver.data,spec,ai_used:aiUsed,beta:true});
      }
    }

    const created=await db.from('page_projects').insert({
      user_id:user.id,title:projectTitle(spec,brief),page_type:brief.type,status:'draft',site_spec:spec
    }).select('*').single();
    if(created.error)throw created.error;
    project=created.data;
    const ver=await db.from('page_versions').insert({
      project_id:project.id,user_id:user.id,version_no:1,site_spec:spec,note:'First AI draft'
    }).select('id,version_no').single();
    if(ver.error)throw ver.error;

    return json(200,{ok:true,project,version:ver.data,spec,ai_used:aiUsed,beta:true});
  }catch(e){
    console.error('[page-generate]',e);
    return json(500,{error:(e&&e.message)||'Could not generate this website.'});
  }
};
