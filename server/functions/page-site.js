// GET /api/page-site?slug=<public slug>
// Public published Fuse Pages website.
const { admin } = require('./_supabase');
const { renderSite } = require('./_page-render');

exports.handler = async (event) => {
  if(event.httpMethod!=='GET')return {statusCode:405,body:'Method not allowed'};
  const slug=String((event.queryStringParameters||{}).slug||'').trim().toLowerCase();
  if(!slug)return {statusCode:404,body:'Website not found'};
  try{
    const db=admin();
    const q=await db.from('page_projects')
      .select('published_spec,status,title')
      .eq('slug',slug).eq('status','published').maybeSingle();
    if(q.error)throw q.error;
    if(!q.data||!q.data.published_spec)return {statusCode:404,body:'Website not found'};
    return {
      statusCode:200,
      headers:{
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'public, max-age=60, s-maxage=300',
        'X-Content-Type-Options':'nosniff'
      },
      body:renderSite(q.data.published_spec,{published:true})
    };
  }catch(e){
    console.error('[page-site]',e);
    return {statusCode:500,body:'Website unavailable'};
  }
};
