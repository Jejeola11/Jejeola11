// ============================================================
// POST /api/page-section-update
// Deterministic visual-editor mutations for Fuse Pages.
// Saves every change as a new version; no AI/credits needed for text/layout.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

function clean(v,max=1800){return typeof v==='string'?v.trim().slice(0,max):''}
function clone(v){return JSON.parse(JSON.stringify(v||{}))}
function safeUrl(v=''){
  try{const u=new URL(String(v));return u.protocol==='https:'?u.toString():''}catch{return ''}
}
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

    if(target==='hero'){
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
