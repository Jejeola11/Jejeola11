const {admin,getUser,json}=require('./_supabase');
const OWNER_EMAIL='riadigitals0@gmail.com';
const KEYS=['challenge-start',...Array.from({length:14},(_,i)=>`challenge-day-${i+1}`),'challenge-day-4-part-2'];

exports.handler=async event=>{
  try{
    if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Method not allowed.'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    if(String(user.email||'').trim().toLowerCase()!==OWNER_EMAIL)return json(403,{error:'Owner access only.'});
    const db=admin();
    if(event.httpMethod==='GET'){
      const {data,error}=await db.from('course_videos').select('lesson_key,url,has_video').in('lesson_key',KEYS);
      if(error)throw error;
      return json(200,{lessons:KEYS.map(key=>({key,url:data?.find(row=>row.lesson_key===key)?.url||''}))});
    }
    let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const key=String(body.lesson_key||'');
    if(!KEYS.includes(key))return json(400,{error:'Invalid challenge lesson.'});
    const url=String(body.url||'').trim();
    if(url){
      let parsed;try{parsed=new URL(url)}catch{return json(400,{error:'Enter a valid HTTPS video URL.'})}
      if(parsed.protocol!=='https:'||!['youtube.com','www.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','res.cloudinary.com','drive.google.com'].includes(parsed.hostname.toLowerCase())){
        return json(400,{error:'Use an HTTPS YouTube, Cloudinary or Google Drive video link.'});
      }
    }
    const {error}=await db.from('course_videos').upsert({lesson_key:key,url:url||null,updated_at:new Date().toISOString()},{onConflict:'lesson_key'});
    if(error)throw error;
    return json(200,{ok:true,lesson_key:key,url});
  }catch(e){console.error('owner-challenge-videos',e);return json(500,{error:e.message||'Could not update the lesson.'})}
};
