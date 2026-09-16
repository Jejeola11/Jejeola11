// ============================================================
// POST /api/page-assets-start
// Starts the first real media assets for a Fuse Pages project using the
// existing Fuse image/video engines, so normal generation pricing/refunds
// stay centralized and users are charged exactly the same credits as Create.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

function parseHandler(res){
  let body={};
  try{ body=JSON.parse(res && res.body || '{}'); }catch{}
  return { statusCode:(res&&res.statusCode)||500, body };
}
function safePrompt(v,max=1600){
  return typeof v==='string'?v.trim().slice(0,max):'';
}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const projectId=String(body.project_id||'').trim();
    if(!projectId)return json(400,{error:'Missing website project.'});

    const db=admin();
    const q=await db.from('page_projects').select('id,site_spec').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data)return json(404,{error:'Website project not found.'});

    const spec=q.data.site_spec||{};
    const force=body.force===true;
    const requestedKind=body.kind==='video'?'video':body.kind==='image'?'image':'';
    if((!spec.assets||spec.assets.generate!==true)&&!force){
      return json(200,{ok:true,started:[],skipped:true,message:'AI asset generation is off for this project.'});
    }

    const heroPrompt=safePrompt(
      spec.hero?.visual?.prompt ||
      spec.assets?.requested?.find(x=>x&&x.kind==='image')?.prompt ||
      ('Premium website hero visual for '+(spec.meta?.title||'a modern brand'))
    );

    const started=[];
    const errors=[];

    // Hero image — uses the same 2-credit Sunburst route as Fuse Create.
    if(requestedKind!=='video') try{
      const imageHandler=require('./generate');
      const ir=await imageHandler.handler({
        ...event,
        httpMethod:'POST',
        body:JSON.stringify({
          prompt:heroPrompt+', premium commercial web hero composition, wide framing, no text, no watermark',
          model:'gpt-image-2.5-sunburst',
          aspect:'16:9',
          count:1,
          res:1
        })
      });
      const parsed=parseHandler(ir);
      if(parsed.statusCode>=200&&parsed.statusCode<300){
        const ids=(parsed.body.request_ids||[parsed.body.request_id]).filter(Boolean);
        for(const id of ids.slice(0,1)){
          await db.from('page_assets').insert({
            project_id:projectId,user_id:user.id,role:'hero',kind:'image',
            model:'gpt-image-2.5-sunburst',prompt:heroPrompt,request_id:id,status:'processing'
          });
          await db.from('jobs').update({project_id:projectId}).eq('request_id',id).eq('user_id',user.id);
          started.push({role:'hero',kind:'image',request_id:id,model:'gpt-image-2.5-sunburst'});
        }
      }else{
        errors.push(parsed.body.error||'Hero image could not start.');
      }
    }catch(e){ errors.push((e&&e.message)||'Hero image could not start.'); }

    // Cinematic experiences also get a lightweight 6s loop using the cheapest
    // production video model already exposed in Fuse Create.
    const wantsVideo=requestedKind==='video' || (!requestedKind && (
      spec.theme?.experience==='cinematic' ||
      spec.assets?.requested?.some(x=>x&&x.kind==='video')
    ));

    if(wantsVideo){
      try{
        const videoHandler=require('./video-generate');
        const videoPrompt=safePrompt(
          spec.assets?.requested?.find(x=>x&&x.kind==='video')?.prompt ||
          ('Cinematic ambient brand loop for '+(spec.meta?.title||'a premium brand'))
        );
        const vr=await videoHandler.handler({
          ...event,
          httpMethod:'POST',
          body:JSON.stringify({
            prompt:videoPrompt+', seamless premium website background loop, subtle elegant camera motion, no text, no watermark',
            model:'grok-imagine-text-to-video',
            aspect:'16:9',
            duration:'6s',
            resolution:'480p',
            generate_audio:false
          })
        });
        const parsed=parseHandler(vr);
        if(parsed.statusCode>=200&&parsed.statusCode<300&&parsed.body.request_id){
          const id=parsed.body.request_id;
          await db.from('page_assets').insert({
            project_id:projectId,user_id:user.id,role:'hero-loop',kind:'video',
            model:'grok-imagine-text-to-video',prompt:videoPrompt,request_id:id,status:'processing'
          });
          await db.from('jobs').update({project_id:projectId}).eq('request_id',id).eq('user_id',user.id);
          started.push({role:'hero-loop',kind:'video',request_id:id,model:'grok-imagine-text-to-video'});
        }else{
          errors.push(parsed.body.error||'Hero video could not start.');
        }
      }catch(e){ errors.push((e&&e.message)||'Hero video could not start.'); }
    }

    const bal=await db.from('profiles').select('credits').eq('id',user.id).maybeSingle();
    return json(200,{
      ok:started.length>0,
      started,
      errors,
      balance:Number(bal.data?.credits||0)
    });
  }catch(e){
    console.error('[page-assets-start]',e);
    return json(500,{error:(e&&e.message)||'Could not start website assets.'});
  }
};
