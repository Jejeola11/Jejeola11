const {admin,getUser,json}=require('./_supabase');
const crypto=require('crypto');
const KEY='learn-ai-from-zero';
exports.handler=async event=>{
 const respond=(code,data)=>({...json(code,data),headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!['GET','POST'].includes(event.httpMethod))return respond(405,{error:'Method not allowed'});
 try{
  const db=admin(),user=await getUser(event);
  if(event.httpMethod==='POST'){
   let b;try{b=JSON.parse(event.body||'{}')}catch{return respond(400,{error:'Invalid request'})}
   if(b.action==='view'){
    if(b.source!=='tutorial-content')return respond(400,{error:'Open the tutorial to record a view.'});
    const paths=['/atelier-v2/free-prompts-workflows.html','/atelier-v2/ocean-eyes-halloween.html','/atelier-v2/free-ai-tutorial.html','/atelier-v2/realistic-images.html'];
    const perContent=b.contentPath!==undefined||b.viewId!==undefined;
    if(perContent&&(!paths.includes(b.contentPath)||!/^[-0-9a-f]{36}$/i.test(b.viewId||'')))return respond(400,{error:'Invalid tutorial view.'});
    const headers=event.headers||{};
    const actor=user?'user:'+user.id:'guest:'+String(headers['x-forwarded-for']||headers['x-real-ip']||'unknown').split(',')[0].trim()+':'+String(headers['user-agent']||'').slice(0,500);
    const hash=crypto.createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY).update(perContent?'content-session:'+b.contentPath+':'+b.viewId:actor).digest('hex');
    const r=await db.from('academy_tutorial_views').upsert({tutorial_key:KEY,viewer_hash:hash},{onConflict:'tutorial_key,viewer_hash',ignoreDuplicates:true});if(r.error)throw r.error;
   }else if(b.action==='like'){
    if(!user)return respond(401,{error:'Sign in to like this tutorial.'});
    if(typeof b.liked!=='boolean')return respond(400,{error:'Choose like or unlike.'});
    const r=b.liked?await db.from('academy_tutorial_likes').upsert({tutorial_key:KEY,user_id:user.id},{onConflict:'tutorial_key,user_id',ignoreDuplicates:true}):await db.from('academy_tutorial_likes').delete().eq('tutorial_key',KEY).eq('user_id',user.id);
    if(r.error)throw r.error;
   }else return respond(400,{error:'Unknown action'});
  }
  const [likes,views,mine]=await Promise.all([
   db.from('academy_tutorial_likes').select('*',{head:true,count:'exact'}).eq('tutorial_key',KEY),
   db.from('academy_tutorial_views').select('*',{head:true,count:'exact'}).eq('tutorial_key',KEY),
   user?db.from('academy_tutorial_likes').select('user_id').eq('tutorial_key',KEY).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null,error:null})
  ]);
  for(const r of [likes,views,mine])if(r.error)throw r.error;
  return respond(200,{likes:likes.count,views:views.count,liked:!!mine.data,signedIn:!!user});
 }catch(error){console.error('[Academy engagement]',error.message);return respond(500,{error:'Counts are temporarily unavailable. Please try again.'})}
};
