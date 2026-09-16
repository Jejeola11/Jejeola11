// POST /api/page-render
// Authenticated JSON wrapper returning safe HTML for iframe srcdoc preview.
const { admin, getUser, json } = require('./_supabase');
const { renderSite } = require('./_page-render');

exports.handler = async (event) => {
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const id=String(body.project_id||'').trim();
    if(!id)return json(400,{error:'Missing website project.'});
    const db=admin();
    const q=await db.from('page_projects').select('id,title,site_spec,status,slug').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data)return json(404,{error:'Website project not found.'});
    return json(200,{ok:true,html:renderSite(q.data.site_spec||{}, {preview:true}),project:{id:q.data.id,title:q.data.title,status:q.data.status,slug:q.data.slug}});
  }catch(e){
    console.error('[page-render]',e);
    return json(500,{error:(e&&e.message)||'Could not render this website.'});
  }
};
