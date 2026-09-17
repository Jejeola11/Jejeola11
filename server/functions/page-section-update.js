// ============================================================
// POST /api/page-section-update
// Deterministic visual-editor mutations for Fuse Pages.
// Saves every change as a new version; no AI/credits needed for text/layout.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const PAGE_FONTS=new Set([
  'Montserrat','Inter','Poppins','Manrope','DM Sans','Space Grotesk',
  'Playfair Display','Cormorant Garamond','Lora','Bebas Neue','Oswald'
]);
function clean(v,max=1800){return typeof v==='string'?v.trim().slice(0,max):''}
function clone(v){return JSON.parse(JSON.stringify(v||{}))}
function safeUrl(v=''){
  try{const u=new URL(String(v));return u.protocol==='https:'?u.toString():''}catch{return ''}
}
function color(v){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:''}
function cleanFont(v,fallback='Montserrat'){const f=clean(v,80);return PAGE_FONTS.has(f)?f:fallback}
function clampNum(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function newId(type='section'){return 'sec-'+clean(type,24).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function ensureIds(spec){
  spec.sections=(Array.isArray(spec.sections)?spec.sections:[]).map((s,i)=>({...s,id:clean(s&&s.id,80)||newId((s&&s.type)||('section-'+i))}));
  return spec;
}
function defaults(type){
  const map={
    features:{type:'features',eyebrow:'FEATURES',title:'What makes this different',text:'Highlight the strongest reasons to choose this offer.',items:[
      {title:'Clear value',text:'Explain one meaningful benefit.'},
      {title:'Premium experience',text:'Show how the experience feels.'},
      {title:'Easy next step',text:'Make the action simple.'}
    ]},
    services:{type:'services',eyebrow:'SERVICES',title:'How we can help',text:'Present the main services clearly.',items:[
      {title:'Signature service',text:'Describe the core service.'},
      {title:'Premium option',text:'Show the higher-value option.'},
      {title:'Custom support',text:'Give visitors another route forward.'}
    ]},
    projects:{type:'projects',eyebrow:'SELECTED WORK',title:'Work that shows the standard',text:'Showcase proof through selected projects.',items:[
      {title:'Project One',text:'Add a short outcome or case-study summary.'},
      {title:'Project Two',text:'Add a short outcome or case-study summary.'},
      {title:'Project Three',text:'Add a short outcome or case-study summary.'}
    ]},
    testimonials:{type:'testimonials',eyebrow:'PROOF',title:'What people say',text:'Add real testimonials when you have them.',items:[
      {quote:'Add a real customer quote here.',name:'Customer name'},
      {quote:'Add another real customer quote here.',name:'Customer name'}
    ]},
    faq:{type:'faq',eyebrow:'FAQ',title:'Questions, answered',text:'Remove friction before the next step.',items:[
      {q:'What happens next?',a:'Explain the next step clearly.'},
      {q:'How do I get started?',a:'Tell visitors exactly what to do.'}
    ]},
    cta:{type:'cta',eyebrow:'READY?',title:'Turn interest into the next step',text:'Make the decision easy with one clear action.',button:'Get started'},
    problem:{type:'problem',eyebrow:'THE PROBLEM',title:'Name the problem clearly',text:'Show visitors that you understand what is getting in their way.'},
    offer:{type:'offer',eyebrow:'THE OFFER',title:'Everything included',text:'Make the value easy to scan.',items:['Core deliverable','Support or bonus','Clear next step']},
    immersive:{type:'immersive',eyebrow:'INTERACTIVE',title:'Create an experience with depth',text:'Use motion and 3D intentionally to make the page memorable.'}
  };
  return {...(map[type]||map.features),id:newId(type)};
}
function sanitizeItems(items){
  if(!Array.isArray(items))return undefined;
  return items.slice(0,8).map(it=>{
    if(typeof it==='string')return clean(it,220);
    if(!it||typeof it!=='object')return '';
    const out={};
    for(const k of ['title','text','quote','name','q','a']){
      if(typeof it[k]==='string')out[k]=clean(it[k],500);
    }
    return out;
  }).filter(Boolean);
}
async function saveVersion(db,user,projectId,spec,note){
  const latest=await db.from('page_versions').select('version_no').eq('project_id',projectId).eq('user_id',user.id).order('version_no',{ascending:false}).limit(1);
  if(latest.error)throw latest.error;
  const versionNo=((latest.data&&latest.data[0]&&latest.data[0].version_no)||0)+1;
  const upd=await db.from('page_projects').update({site_spec:spec,status:'draft'}).eq('id',projectId).eq('user_id',user.id).select('*').single();
  if(upd.error)throw upd.error;
  const ver=await db.from('page_versions').insert({
    project_id:projectId,user_id:user.id,version_no:versionNo,site_spec:spec,note:clean(note,120)
  }).select('id,version_no,note,created_at').single();
  if(ver.error)throw ver.error;
  return {project:upd.data,version:ver.data};
}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const projectId=String(body.project_id||'').trim();
    const operation=clean(body.operation,40)||'update';
    if(!projectId)return json(400,{error:'Missing website project.'});

    const db=admin();
    const q=await db.from('page_projects').select('id,site_spec').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data)return json(404,{error:'Website project not found.'});

    const spec=ensureIds(clone(q.data.site_spec||{}));
    const sections=spec.sections;
    const target=clean(body.target,80);
    let note='Visual editor update';

    if(target==='site'){
      if(operation!=='update')return json(400,{error:'Site settings support direct edits only.'});
      const patch=body.patch&&typeof body.patch==='object'?body.patch:{};
      spec.meta=spec.meta||{};
      spec.nav=spec.nav||{};
      spec.contact=spec.contact||{};
      spec.theme=spec.theme||{};
      spec.design=spec.design||{};
      spec.design.colors=spec.design.colors||{};
      spec.design.typography=spec.design.typography||{};
      spec.design.buttons=spec.design.buttons||{};
      if(patch.brand!==undefined){
        const brand=clean(patch.brand,100);
        spec.nav.brand=brand;
        spec.meta.title=brand||spec.meta.title;
      }
      if(patch.objective!==undefined)spec.meta.objective=clean(patch.objective,500);
      if(patch.audience!==undefined)spec.meta.audience=clean(patch.audience,500);
      if(patch.cta!==undefined)spec.nav.cta=clean(patch.cta,100);
      if(patch.cta_url!==undefined)spec.contact.cta_url=safeUrl(patch.cta_url);
      if(patch.email!==undefined)spec.contact.email=clean(patch.email,180);
      if(patch.phone!==undefined)spec.contact.phone=clean(patch.phone,80);
      if(patch.mode==='dark'||patch.mode==='light')spec.theme.mode=patch.mode;

      const accent=color(patch.accent);
      const secondary=color(patch.secondary);
      if(accent){spec.theme.accent=accent;spec.design.colors.accent=accent}
      if(secondary){spec.theme.secondary=secondary;spec.design.colors.secondary_accent=secondary}
      for(const [patchKey,designKey] of [
        ['background','background'],['surface','surface'],['primary_text','primary_text'],
        ['secondary_text','secondary_text'],['button_bg','button_bg'],['button_text','button_text']
      ]){
        const value=color(patch[patchKey]);if(value)spec.design.colors[designKey]=value;
      }

      const currentType=spec.design.typography;
      if(patch.primary_font!==undefined)currentType.primary_font=cleanFont(patch.primary_font,currentType.primary_font||'Montserrat');
      if(patch.secondary_font!==undefined)currentType.secondary_font=cleanFont(patch.secondary_font,currentType.secondary_font||currentType.primary_font||'Montserrat');
      if(patch.body_font!==undefined)currentType.body_font=cleanFont(patch.body_font,currentType.body_font||'Montserrat');
      if(patch.button_font!==undefined)currentType.button_font=cleanFont(patch.button_font,currentType.button_font||currentType.body_font||'Montserrat');
      if(patch.primary_size!==undefined)currentType.primary_size=clampNum(patch.primary_size,30,110,currentType.primary_size||72);
      if(patch.secondary_size!==undefined)currentType.secondary_size=clampNum(patch.secondary_size,22,72,currentType.secondary_size||48);
      if(patch.body_size!==undefined)currentType.body_size=clampNum(patch.body_size,12,24,currentType.body_size||16);
      if(patch.button_size!==undefined)currentType.button_size=clampNum(patch.button_size,11,22,currentType.button_size||14);
      if(patch.primary_weight!==undefined)currentType.primary_weight=clampNum(patch.primary_weight,300,800,currentType.primary_weight||500);
      if(patch.secondary_weight!==undefined)currentType.secondary_weight=clampNum(patch.secondary_weight,300,800,currentType.secondary_weight||500);
      if(patch.body_weight!==undefined)currentType.body_weight=clampNum(patch.body_weight,300,700,currentType.body_weight||300);
      if(patch.button_weight!==undefined)currentType.button_weight=clampNum(patch.button_weight,300,800,currentType.button_weight||500);
      if(patch.button_radius!==undefined)spec.design.buttons.radius=clampNum(patch.button_radius,0,48,spec.design.buttons.radius??999);
      if(patch.button_padding_x!==undefined)spec.design.buttons.padding_x=clampNum(patch.button_padding_x,10,40,spec.design.buttons.padding_x||19);
      if(patch.button_padding_y!==undefined)spec.design.buttons.padding_y=clampNum(patch.button_padding_y,8,24,spec.design.buttons.padding_y||13);
      note='Updated site design';
    }else if(target==='hero'){
      if(operation!=='update')return json(400,{error:'Hero supports direct edits only.'});
      spec.hero=spec.hero||{};
      const patch=body.patch&&typeof body.patch==='object'?body.patch:{};
      for(const k of ['eyebrow','headline','subheadline','primary_cta','secondary_cta']){
        if(k in patch)spec.hero[k]=clean(patch[k],k==='headline'?180:500);
      }
      if(patch.image_url!==undefined||patch.video_url!==undefined){
        spec.hero.visual=spec.hero.visual||{};
        if(patch.image_url!==undefined)spec.hero.visual.image_url=safeUrl(patch.image_url);
        if(patch.video_url!==undefined)spec.hero.visual.video_url=safeUrl(patch.video_url);
      }
      note='Edited hero';
    }else if(operation==='add'){
      if(sections.length>=12)return json(400,{error:'This page already has the maximum of 12 sections.'});
      const type=clean(body.section_type,40)||'features';
      const section=defaults(type);
      const at=Math.max(0,Math.min(sections.length,Number.isFinite(Number(body.index))?Number(body.index):sections.length));
      sections.splice(at,0,section);
      note='Added '+type+' section';
    }else{
      const index=sections.findIndex((s,i)=>clean(s&&s.id,80)===target || String(i)===target);
      if(index<0)return json(404,{error:'That section could not be found.'});

      if(operation==='delete'){
        sections.splice(index,1);
        note='Deleted section';
      }else if(operation==='duplicate'){
        if(sections.length>=12)return json(400,{error:'This page already has the maximum of 12 sections.'});
        const copy=clone(sections[index]);
        copy.id=newId(copy.type||'section');
        sections.splice(index+1,0,copy);
        note='Duplicated section';
      }else if(operation==='move'){
        const direction=clean(body.direction,12);
        let to=index;
        if(direction==='up')to=Math.max(0,index-1);
        else if(direction==='down')to=Math.min(sections.length-1,index+1);
        else if(Number.isFinite(Number(body.to_index)))to=Math.max(0,Math.min(sections.length-1,Number(body.to_index)));
        if(to!==index){
          const [moved]=sections.splice(index,1);
          sections.splice(to,0,moved);
        }
        note='Reordered sections';
      }else if(operation==='update'){
        const patch=body.patch&&typeof body.patch==='object'?body.patch:{};
        const section=sections[index];
        for(const k of ['eyebrow','title','text','button']){
          if(k in patch)section[k]=clean(patch[k],k==='title'?180:800);
        }
        if(patch.type!==undefined)section.type=clean(patch.type,40)||section.type;
        const items=sanitizeItems(patch.items);
        if(items!==undefined)section.items=items;
        if(patch.image_url!==undefined||patch.video_url!==undefined){
          section.media=section.media||{};
          if(patch.image_url!==undefined)section.media.image_url=safeUrl(patch.image_url);
          if(patch.video_url!==undefined)section.media.video_url=safeUrl(patch.video_url);
        }
        note='Edited '+(section.type||'section');
      }else{
        return json(400,{error:'Unknown section operation.'});
      }
    }

    const saved=await saveVersion(db,user,projectId,spec,note);
    return json(200,{ok:true,...saved,spec});
  }catch(e){
    console.error('[page-section-update]',e);
    return json(500,{error:(e&&e.message)||'Could not update this section.'});
  }
};
