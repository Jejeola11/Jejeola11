// POST /api/page-publish
// Publishes the current SiteSpec snapshot and returns a public Fuse Pages URL.
const { admin, getUser, json } = require('./_supabase');

function slugify(v=''){
  return String(v).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,58)||'site';
}

exports.handler = async (event) => {
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const id=String(body.project_id||'').trim();
    if(!id)return json(400,{error:'Missing website project.'});

    const db=admin();
    const found=await db.from('page_projects').select('id,title,site_spec,slug').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(found.error)throw found.error;
    if(!found.data)return json(404,{error:'Website project not found.'});

    let base=slugify(body.slug||found.data.slug||found.data.title);
    let slug=base;
    for(let i=0;i<20;i++){
      const used=await db.from('page_projects').select('id').eq('slug',slug).neq('id',id).maybeSingle();
      if(used.error)throw used.error;
      if(!used.data)break;
      slug=base+'-'+(i+2);
    }

    const upd=await db.from('page_projects').update({
      status:'published',
      slug,
      published_spec:found.data.site_spec
    }).eq('id',id).eq('user_id',user.id).select('id,title,slug,status,updated_at').single();
    if(upd.error)throw upd.error;

    const origin=(event.headers['x-forwarded-host']||event.headers.host||'fuse-atelier.vercel.app');
    const proto=event.headers['x-forwarded-proto']||'https';
    return json(200,{
      ok:true,
      project:upd.data,
      public_url:proto+'://'+origin+'/p/'+encodeURIComponent(slug)
    });
  }catch(e){
    console.error('[page-publish]',e);
    return json(500,{error:(e&&e.message)||'Could not publish this website.'});
  }
};
