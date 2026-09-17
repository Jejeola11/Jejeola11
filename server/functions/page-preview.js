// GET /api/page-preview?id=<project uuid>
// Authenticated HTML preview for a user's Fuse Pages project.
const { admin, getUser } = require('./_supabase');
const { renderSite } = require('./_page-render');
const { applyPageDesign } = require('./_page-design');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return {statusCode:405,body:'Method not allowed'};
  const user=await getUser(event);
  if(!user)return {statusCode:401,body:'Sign in required'};
  const id=String((event.queryStringParameters||{}).id||'').trim();
  if(!id)return {statusCode:400,body:'Missing project id'};
  try{
    const db=admin();
    const q=await db.from('page_projects').select('site_spec').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(q.error)throw q.error;
    if(!q.data)return {statusCode:404,body:'Project not found'};
    const spec=q.data.site_spec||{};
    return {
      statusCode:200,
      headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'SAMEORIGIN'},
      body:applyPageDesign(renderSite(spec,{preview:true}),spec)
    };
  }catch(e){
    console.error('[page-preview]',e);
    return {statusCode:500,body:'Could not render preview'};
  }
};
