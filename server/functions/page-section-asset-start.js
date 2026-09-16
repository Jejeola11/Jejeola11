// ============================================================
// POST /api/page-section-asset-start
// Regenerate media for ONE Fuse Pages section using existing Fuse engines.
// Normal image/video credit pricing and refund logic apply.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

function parseHandler(res){
  let body={};try{body=JSON.parse(res&&res.body||'{}')}catch{}
  return {statusCode:(res&&res.statusCode)||500,body};
}
function clean(v,max=1600){return typeof v==='string'?v.trim().slice(0,max):''}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const projectId=String(body.project_id||'').trim();
    const sectionId=clean(body.section_id,80);
    const kind=body.kind==='video'?'video':'image';
    if(!projectId||!sectionId)return json(400,{error:'Choose a section first.'});

    const db=admin();
    const q=await db.from('page_projects').select('id,site_spec').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data)return json(404,{error:'Website project not found.'});

    const spec=q.data.site_spec||{};
    const sections=Array.isArray(spec.sections)?spec.sections:[];
    const section=sections.find(s=>String(s&&s.id||'')===sectionId);
    if(!section)return json(404,{error:'That section could not be found.'});

    const brand=clean(spec.meta&&spec.meta.title,100)||'the brand';
    const core=clean(body.prompt,1200) || [
      'Premium website visual for '+brand+'.',
      clean(section.eyebrow,120),
      clean(section.title,240),
      clean(section.text,600)
    ].filter(Boolean).join(' ');

    if(kind==='image'){
      const imageHandler=require('./generate');
      const prompt=core+', art-directed commercial website section visual, refined composition, wide framing, no text, no typography, no watermark';
      const ir=await imageHandler.handler({
        ...event,httpMethod:'POST',
        body:JSON.stringify({
          prompt,
          model:'gpt-image-2.5-sunburst',
          aspect:'16:9',
          count:1,
          res:1
        })
      });
      const parsed=parseHandler(ir);
      if(parsed.statusCode<200||parsed.statusCode>=300)return json(parsed.statusCode,parsed.body);
      const id=(parsed.body.request_ids||[parsed.body.request_id]).filter(Boolean)[0];
      if(!id)return json(502,{error:'Image generation did not return a job.'});
      const role='section:'+sectionId+':image';
      const ins=await db.from('page_assets').insert({
        project_id:projectId,user_id:user.id,role,kind:'image',
        model:'gpt-image-2.5-sunburst',prompt:core,request_id:id,status:'processing'
      });
      if(ins.error)throw ins.error;
      await db.from('jobs').update({project_id:projectId}).eq('request_id',id).eq('user_id',user.id);
      return json(200,{ok:true,request_id:id,role,kind:'image'});
    }

    const videoHandler=require('./video-generate');
    const prompt=core+', cinematic website section loop, subtle premium camera motion, seamless feeling, no text, no watermark';
    const vr=await videoHandler.handler({
      ...event,httpMethod:'POST',
      body:JSON.stringify({
        prompt,
        model:'grok-imagine-text-to-video',
        aspect:'16:9',
        duration:'6s',
        resolution:'480p',
        generate_audio:false
      })
    });
    const parsed=parseHandler(vr);
    if(parsed.statusCode<200||parsed.statusCode>=300)return json(parsed.statusCode,parsed.body);
    const id=parsed.body.request_id;
    if(!id)return json(502,{error:'Video generation did not return a job.'});
    const role='section:'+sectionId+':video';
    const ins=await db.from('page_assets').insert({
      project_id:projectId,user_id:user.id,role,kind:'video',
      model:'grok-imagine-text-to-video',prompt:core,request_id:id,status:'processing'
    });
    if(ins.error)throw ins.error;
    await db.from('jobs').update({project_id:projectId}).eq('request_id',id).eq('user_id',user.id);
    return json(200,{ok:true,request_id:id,role,kind:'video'});
  }catch(e){
    console.error('[page-section-asset-start]',e);
    return json(500,{error:(e&&e.message)||'Could not start this section visual.'});
  }
};
