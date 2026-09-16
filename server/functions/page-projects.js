// GET /api/page-projects[?id=<uuid>]
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    const db=admin();
    const q=event.queryStringParameters||{};
    const id=String(q.id||'').trim();

    if(id){
      const project=await db.from('page_projects')
        .select('id,title,page_type,status,slug,site_spec,created_at,updated_at')
        .eq('id',id).eq('user_id',user.id).maybeSingle();
      if(project.error)throw project.error;
      if(!project.data)return json(404,{error:'Website project not found.'});
      const versions=await db.from('page_versions')
        .select('id,version_no,note,created_at')
        .eq('project_id',id).eq('user_id',user.id)
        .order('version_no',{ascending:false}).limit(20);
      if(versions.error)throw versions.error;
      return json(200,{project:project.data,versions:versions.data||[]});
    }

    const rows=await db.from('page_projects')
      .select('id,title,page_type,status,slug,created_at,updated_at')
      .eq('user_id',user.id)
      .neq('status','archived')
      .order('updated_at',{ascending:false})
      .limit(24);
    if(rows.error)throw rows.error;
    return json(200,{projects:rows.data||[]});
  } catch(e) {
    console.error('[page-projects]',e);
    return json(500,{error:(e&&e.message)||'Could not load your websites.'});
  }
};
