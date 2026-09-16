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
          await db.from('page_assets').update({status:'completed',url:result.url}).eq('id',asset.id).eq('user_id',user.id);
          asset.status='completed';asset.url=result.url;changed=true;
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
