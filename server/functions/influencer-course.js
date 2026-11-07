const {admin,getUser,json}=require('./_supabase');
const OWNER_EMAIL='riadigitals0@gmail.com';

const MODULES=[
  'FOUNDATION & CHARACTER',
  'SPOT IT. REMIX IT.',
  'Build Content People Watch and Share',
  'Monetize Your Own AI Influencer',
  'Sell AI Influencers and Content to Businesses',
  'Price, Close and Build Repeat Income'
];

exports.handler=async event=>{
  if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Method not allowed'});
  try{
    const user=await getUser(event);
    if(!user)return json(401,{error:'Sign in to view this course.'});
    const {data,error}=await admin().from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    if(error)throw error;
    const isOwner=!!data?.is_admin&&String(user.email||'').trim().toLowerCase()===OWNER_EMAIL;
    if(!isOwner){
      const {data:unlock,error:unlockError}=await admin().from('module_unlocks').select('module_key').eq('user_id',user.id).eq('module_key','ai-influencer-course').maybeSingle();
      if(unlockError)throw unlockError;
      if(!unlock)return json(403,{error:'Unlock this course first.'});
    }
    if(event.httpMethod==='POST'&&!isOwner)return json(403,{error:'Owner access only.'});
    const db=admin();
    if(event.httpMethod==='POST'){
      let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
      const key=String(body.lesson_key||'');
      if(!/^influencer-m[1-6]$/.test(key))return json(400,{error:'Choose one of the six modules.'});
      const url=String(body.url||'').trim();
      if(url){
        let parsed;try{parsed=new URL(url)}catch{return json(400,{error:'Enter a valid HTTPS video URL.'})}
        if(parsed.protocol!=='https:'||!['youtube.com','www.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com','res.cloudinary.com','drive.google.com'].includes(parsed.hostname.toLowerCase()))return json(400,{error:'Use an HTTPS YouTube, Cloudinary or Google Drive video link.'});
      }
      const {error:saveError}=await db.from('course_videos').upsert({lesson_key:key,url:url||null,has_video:!!url,updated_at:new Date().toISOString()},{onConflict:'lesson_key'});
      if(saveError)throw saveError;
      return json(200,{ok:true,lesson_key:key,url});
    }
    const {data:videos,error:videoError}=await db.from('course_videos').select('lesson_key,url,has_video').in('lesson_key',MODULES.map((_,i)=>`influencer-m${i+1}`));
    if(videoError)throw videoError;
    return json(200,{title:'Create & Monetize Viral AI Influencers',modules:MODULES.map((title,index)=>{
      const row=videos?.find(video=>video.lesson_key===`influencer-m${index+1}`);
      return {number:index+1,key:`influencer-m${index+1}`,title,url:row?.has_video&&row.url||'',status:row?.has_video&&row.url?'Video connected':'Video coming soon'};
    })});
  }catch(error){console.error('[Influencer course]',error.message);return json(500,{error:'Could not load this course. Please try again.'});}
};
