// ============================================================
// POST /api/page-assets-sync
// Advances pending Fuse Pages media jobs through the existing /job-status
// poller and attaches completed URLs to the current SiteSpec.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

function parse(res){
  let body={};try{body=JSON.parse(res&&res.body||'{}')}catch{}
  return {statusCode:(res&&res.statusCode)||500,body};
}
async function persistAsset(db,userId,asset,url){
  try{
    const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!r.ok)return url;
    const len=Number(r.headers.get('content-length')||0);
    if(len>40*1024*1024)return url;
    const buf=Buffer.from(await r.arrayBuffer());
    if(buf.length>40*1024*1024)return url;
    const type=(r.headers.get('content-type')||'').split(';')[0] || (asset.kind==='video'?'video/mp4':'image/png');
    const ext=type.includes('webm')?'webm':type.includes('jpeg')?'jpg':type.includes('webp')?'webp':type.includes('video')?'mp4':'png';
    const path=userId+'/pages/generated/'+asset.project_id+'/'+asset.role+'-'+Date.now()+'.'+ext;
    const up=await db.storage.from('landing-assets').upload(path,buf,{contentType:type,upsert:false});
    if(up.error)return url;
    return db.storage.from('landing-assets').getPublicUrl(path).data.publicUrl||url;
  }catch{return url}
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
    const p=await db.from('page_projects').select('id,site_spec').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(p.error)throw p.error;
    if(!p.data)return json(404,{error:'Website project not found.'});

    const assetsRes=await db.from('page_assets').select('*').eq('project_id',projectId).eq('user_id',user.id).order('created_at',{ascending:true});
    if(assetsRes.error)throw assetsRes.error;
    const assets=assetsRes.data||[];
    const jobStatus=require('./job-status');
    let changed=false;

    for(const asset of assets){
      if(asset.status!=='processing'||!asset.request_id)continue;
      try{
        const rr=await jobStatus.handler({
          ...event,
          httpMethod:'GET',
          queryStringParameters:{id:asset.request_id}
        });
        const result=parse(rr).body;
        if(result.status==='completed'&&result.url){
          const durableUrl=await persistAsset(db,user.id,asset,result.url);
          await db.from('page_assets').update({status:'completed',url:durableUrl}).eq('id',asset.id).eq('user_id',user.id);
          asset.status='completed';asset.url=durableUrl;changed=true;
        }else if(result.status==='failed'){
          await db.from('page_assets').update({status:'failed'}).eq('id',asset.id).eq('user_id',user.id);
          asset.status='failed';changed=true;
        }
      }catch(e){
        // Provider polling is intentionally retryable. Keep processing.
      }
    }

    if(changed){
      const spec=JSON.parse(JSON.stringify(p.data.site_spec||{}));
      spec.hero=spec.hero||{};
      spec.hero.visual=spec.hero.visual||{};
      spec.assets=spec.assets||{};
      spec.assets.generated=(assets.filter(a=>a.status==='completed'&&a.url)).map(a=>({
        role:a.role,kind:a.kind,url:a.url,model:a.model
      }));
      const heroVideo=assets.filter(a=>a.role==='hero-loop'&&a.kind==='video'&&a.status==='completed'&&a.url).at(-1);
      const heroImage=assets.filter(a=>a.role==='hero'&&a.kind==='image'&&a.status==='completed'&&a.url).at(-1);
      if(heroImage)spec.hero.visual.image_url=heroImage.url;
      if(heroVideo)spec.hero.visual.video_url=heroVideo.url;

      // Section-specific media roles are stable because every SiteSpec section
      // carries an id: section:<sectionId>:image|video.
      const sections=Array.isArray(spec.sections)?spec.sections:[];
      for(const section of sections){
        if(!section||!section.id)continue;
        const image=assets.filter(a=>a.role==='section:'+section.id+':image'&&a.status==='completed'&&a.url).at(-1);
        const video=assets.filter(a=>a.role==='section:'+section.id+':video'&&a.status==='completed'&&a.url).at(-1);
        if(image||video)section.media={...(section.media||{})};
        if(image)section.media.image_url=image.url;
        if(video)section.media.video_url=video.url;
      }

      const upd=await db.from('page_projects').update({site_spec:spec}).eq('id',projectId).eq('user_id',user.id);
      if(upd.error)throw upd.error;

      const latest=await db.from('page_versions').select('id,version_no').eq('project_id',projectId).eq('user_id',user.id).order('version_no',{ascending:false}).limit(1);
      if(!latest.error&&latest.data&&latest.data[0]){
        await db.from('page_versions').update({site_spec:spec}).eq('id',latest.data[0].id).eq('user_id',user.id);
      }
    }

    const latestAssets=await db.from('page_assets').select('id,role,kind,status,url,model,request_id,created_at').eq('project_id',projectId).eq('user_id',user.id).order('created_at',{ascending:true});
    if(latestAssets.error)throw latestAssets.error;
    const out=latestAssets.data||[];
    return json(200,{
      ok:true,
      assets:out,
      processing:out.filter(a=>a.status==='processing').length,
      completed:out.filter(a=>a.status==='completed').length,
      failed:out.filter(a=>a.status==='failed').length
    });
  }catch(e){
    console.error('[page-assets-sync]',e);
    return json(500,{error:(e&&e.message)||'Could not update website assets.'});
  }
};
