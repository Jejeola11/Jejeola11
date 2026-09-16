// POST /api/page-version-restore
// Restores an older SiteSpec by creating a NEW version, preserving history.
const { admin, getUser, json } = require('./_supabase');

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const projectId=String(body.project_id||'').trim();
    const versionNo=Math.max(1,parseInt(body.version_no,10)||0);
    if(!projectId||!versionNo)return json(400,{error:'Choose a version to restore.'});

    const db=admin();
    const project=await db.from('page_projects').select('id').eq('id',projectId).eq('user_id',user.id).maybeSingle();
    if(project.error)throw project.error;
    if(!project.data)return json(404,{error:'Website project not found.'});

    const source=await db.from('page_versions').select('site_spec,version_no').eq('project_id',projectId).eq('user_id',user.id).eq('version_no',versionNo).maybeSingle();
    if(source.error)throw source.error;
    if(!source.data)return json(404,{error:'That version is no longer available.'});

    const latest=await db.from('page_versions').select('version_no').eq('project_id',projectId).eq('user_id',user.id).order('version_no',{ascending:false}).limit(1);
    if(latest.error)throw latest.error;
    const next=((latest.data&&latest.data[0]&&latest.data[0].version_no)||0)+1;

    const upd=await db.from('page_projects').update({site_spec:source.data.site_spec,status:'draft'}).eq('id',projectId).eq('user_id',user.id).select('*').single();
    if(upd.error)throw upd.error;
    const ver=await db.from('page_versions').insert({
      project_id:projectId,user_id:user.id,version_no:next,site_spec:source.data.site_spec,note:'Restored from v'+versionNo
    }).select('id,version_no,note,created_at').single();
    if(ver.error)throw ver.error;

    return json(200,{ok:true,project:upd.data,version:ver.data});
  }catch(e){
    console.error('[page-version-restore]',e);
    return json(500,{error:(e&&e.message)||'Could not restore that version.'});
  }
};
