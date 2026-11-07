'use strict';
// Public read-only TikTok stats feed for the nine Director Ria showcase clips.
// Configure DIRECTORRIA_TIKTOK_VIDEO_URLS as a JSON array of post URLs in the
// same order as the nine Cloudinary preview videos. Leave unknown entries null.
// Set TIKTOK_ACCESS_TOKEN to a creator-authorized token with video.list scope.
// No token or post mappings are sent to the browser except the public post URLs.
const {json}=require('./_supabase');
const COUNT=9;
const ENDPOINT='https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count';
let cached={until:0,payload:null};

function mappedPosts(){
  let urls=[];
  try{const parsed=JSON.parse(process.env.DIRECTORRIA_TIKTOK_VIDEO_URLS||'[]');if(Array.isArray(parsed))urls=parsed}catch{}
  return Array.from({length:COUNT},(_,i)=>{
    const item={index:i+1,tiktokUrl:null,id:null,views:null,likes:null};
    if(typeof urls[i]!=='string')return item;
    try{
      const u=new URL(urls[i]);
      if(u.protocol!=='https:'||!['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(u.hostname)||u.username||u.password)return item;
      const match=u.pathname.match(/^\/@[\w.]+\/video\/([0-9]{16,22})\/?$/);
      if(!match)return item;
      item.tiktokUrl='https://www.tiktok.com'+u.pathname.replace(/\/$/,'');
      item.id=match[1];
    }catch{}
    return item;
  });
}
function respond(body){
  return {...json(200,body),headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=120, stale-while-revalidate=60'}};
}
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  if(cached.payload&&Date.now()<cached.until)return respond(cached.payload);
  const posts=mappedPosts();
  const items=posts.map(({index,tiktokUrl,views,likes})=>({index,tiktokUrl,views,likes}));
  const linked=posts.filter(p=>p.id);
  const output={status:linked.length?'awaiting_authorization':'awaiting_tiktok_links',updatedAt:null,items};
  const token=(process.env.TIKTOK_ACCESS_TOKEN||'').trim();
  if(linked.length&&token){
    try{
      const res=await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({filters:{video_ids:[...new Set(linked.map(x=>x.id))]}}),
        signal:AbortSignal.timeout(10000)
      });
      if(!res.ok)throw Error('Provider status '+res.status);
      const body=await res.json();
      if(body.error&&body.error.code&&body.error.code!=='ok')throw Error('TikTok provider error');
      if(!Array.isArray(body.data?.videos))throw Error('TikTok returned no video list');
      const byId=new Map(body.data.videos.map(v=>[String(v.id||''),v]));
      let available=0;
      for(const p of linked){
        const v=byId.get(p.id);
        if(!v)continue;
        const view=Number(v.view_count),like=Number(v.like_count);
        const target=items[p.index-1];
        if(Number.isSafeInteger(view)&&view>=0){target.views=view;available++}
        if(Number.isSafeInteger(like)&&like>=0){target.likes=like;available++}
      }
      if(available){output.status='synced';output.updatedAt=new Date().toISOString()}
      else output.status='unavailable';
    }catch(e){console.warn('[Director Ria TikTok stats]',String(e.message||e).slice(0,160));output.status='unavailable'}
  }
  cached={until:Date.now()+120000,payload:output};
  return respond(output);
};
