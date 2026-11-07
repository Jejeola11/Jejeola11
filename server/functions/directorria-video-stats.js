'use strict';
// Public read-only TikTok stats feed for the nine Director Ria showcase clips.
// TikTok posts are mapped in the same order as the nine Cloudinary previews.
// Video 7 is intentionally not yet published. The public short URLs are clickable.
// Official view/like metrics require an authorized TikTok video.list access token.
// Optional DIRECTORRIA_TIKTOK_VIDEO_URLS environment JSON can supply canonical
// post URLs later without changing code. Never return any secret token to clients.
const {json}=require('./_supabase');
const DEFAULT_POSTS=[
  "https://vt.tiktok.com/ZSprHPFt6/",
  "https://vt.tiktok.com/ZSprHyjre/",
  "https://vt.tiktok.com/ZSprHuePh/",
  "https://vt.tiktok.com/ZSprH9WxU/",
  "https://vt.tiktok.com/ZSprHV6cE/",
  "https://vt.tiktok.com/ZSprH5WMk/",
  null,
  "https://vt.tiktok.com/ZSprHPDEt/",
  "https://vt.tiktok.com/ZSprHHg5Y/"
];
const COUNT=DEFAULT_POSTS.length;
const ENDPOINT='https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count';
let cached={until:0,payload:null};
const resolvedIds=new Map();

function mappedPosts(){
  let urls=DEFAULT_POSTS.slice();
  try{
    const custom=JSON.parse(process.env.DIRECTORRIA_TIKTOK_VIDEO_URLS||'null');
    if(Array.isArray(custom))urls=DEFAULT_POSTS.map((url,i)=>typeof custom[i]==='string'&&custom[i].trim()?custom[i]:url);
  }catch{}
  return Array.from({length:COUNT},(_,i)=>{
    const item={index:i+1,tiktokUrl:null,id:null,views:null,likes:null};
    if(typeof urls[i]!=='string')return item;
    try{
      const u=new URL(urls[i]);
      if(u.protocol!=='https:'||u.username||u.password)return item;
      if(['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(u.hostname)){
        const match=u.pathname.match(/^\/@[\w.]+\/video\/([0-9]{16,22})\/?$/);
        if(!match)return item;
        item.tiktokUrl='https://www.tiktok.com'+u.pathname.replace(/\/$/,'');
        item.id=match[1];
      }else if(u.hostname==='vt.tiktok.com'&&/^\/[A-Za-z0-9]{6,20}\/?$/.test(u.pathname)){
        item.tiktokUrl='https://vt.tiktok.com/'+u.pathname.replace(/^\/+|\/+$/g,'')+'/';
      }
    }catch{}
    return item;
  });
}
async function resolveShortId(url){
  if(!url||!url.startsWith('https://vt.tiktok.com/'))return null;
  const existing=resolvedIds.get(url);
  if(existing&&Date.now()<existing.until)return existing.id;
  let current=url,id=null;
  try{
    for(let tries=0;tries<5;tries++){
      const response=await fetch(current,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(4500),headers:{'User-Agent':'Mozilla/5.0'}});
      const location=response.headers.get('location');
      if(!location)break;
      const next=new URL(location,current);
      if(next.protocol!=='https:'||next.username||next.password||!/(^|\.)tiktok\.com$/.test(next.hostname))break;
      const match=next.pathname.match(/\/video\/([0-9]{16,22})(?:\/|$)/);
      if(match){id=match[1];break}
      current=next.href;
    }
  }catch(e){console.warn('[Director Ria short-link resolution]',String(e.message||e).slice(0,90))}
  resolvedIds.set(url,{id,until:Date.now()+(id?3600000:600000)});
  return id;
}
function respond(body){
  return {...json(200,body),headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=120, stale-while-revalidate=60'}};
}
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  if(cached.payload&&Date.now()<cached.until)return respond(cached.payload);
  const posts=mappedPosts();
  const items=posts.map(({index,tiktokUrl,views,likes})=>({index,tiktokUrl,views,likes}));
  const linked=posts.filter(p=>p.tiktokUrl);
  const output={status:linked.length?'awaiting_authorization':'awaiting_tiktok_links',updatedAt:null,items};
  const token=(process.env.TIKTOK_ACCESS_TOKEN||'').trim();
  if(linked.length&&token){
    try{
      const ids=await Promise.all(linked.map(async post=>({post,id:post.id||await resolveShortId(post.tiktokUrl)})));
      const queriable=ids.filter(x=>x.id);
      if(!queriable.length){output.status='awaiting_video_ids';return respond(output)}
      const res=await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({filters:{video_ids:[...new Set(queriable.map(x=>x.id))]}}),
        signal:AbortSignal.timeout(10000)
      });
      if(!res.ok)throw Error('Provider status '+res.status);
      const body=await res.json();
      if(body.error&&body.error.code&&body.error.code!=='ok')throw Error('TikTok provider error');
      if(!Array.isArray(body.data?.videos))throw Error('TikTok returned no video list');
      const byId=new Map(body.data.videos.map(v=>[String(v.id||''),v]));
      let available=0;
      for(const {post:p,id} of queriable){
        const v=byId.get(id);
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
