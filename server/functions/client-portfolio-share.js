'use strict';
const {createHash}=require('node:crypto');
const {admin,getUser,json}=require('./_supabase');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
function safeUrl(value){
  try{const u=new URL(value);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)return u.href;}catch{}
  return '';
}
function projectView(p){
  const website=safeUrl(p.website);
  const items=p.media?.length?p.media:p.url?[{url:p.url,name:p.title}]:[];
  return {
    title:String(p.title),role:String(p.role||p.my_role||''),description:String(p.description||''),
    website,media:items.map(m=>({url:safeUrl(m.url),name:String(m.name||'Attachment'),type:String(m.type||'')})).filter(m=>m.url)
  };
}
const fingerprint=p=>createHash('sha256').update(JSON.stringify(p)).digest('hex');
async function projects(db,user){
  const {data,error}=await db.from('client_agent_profiles').select('profile_json').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  const m=user.user_metadata||{};
  const base=(data?.profile_json?.projects||[]).map((p,index)=>({p:{...p,...(m.client_portfolio_overrides||{})[index]},index,source:'base'}))
    .filter(x=>!(m.client_portfolio_hidden||[]).includes(x.index));
  const added=(m.client_portfolio_projects||[]).map((p,index)=>({p,index,source:'added'}));
  return [...base,...added].filter(x=>x.p.title).map(x=>({...x,p:projectView(x.p)}));
}
function mediaHtml(m){
  const path=new URL(m.url).pathname;
  const url=esc(m.url);
  if(m.type.startsWith('video/')||/\.(mp4|webm|mov|m4v)$/i.test(path))return '<video controls playsinline preload="metadata" src="'+url+'"></video>';
  if(m.type.startsWith('image/')||/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path))return '<img alt="'+esc(m.name)+'" src="'+url+'">';
  if(m.type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|aac)$/i.test(path))return '<audio controls preload="metadata" src="'+url+'"></audio>';
  return '<a href="'+url+'" rel="noreferrer" target="_blank">'+esc(m.name)+'</a>';
}
function page(p,status=200){
  const title=esc(p?.title||'Project unavailable');
  const body=p?'<h1>'+title+'</h1>'+(p.role?'<h2>My role</h2><p>'+esc(p.role)+'</p>':'')+
    '<h2>Project description</h2><p>'+esc(p.description)+'</p>'+
    '<div class="media">'+p.media.map(mediaHtml).join('')+'</div>'+
    (p.website&&!p.media.some(m=>m.url===p.website)?'<a target="_blank" rel="noreferrer" href="'+esc(p.website)+'">View website ↗</a>':''):
    '<h1>'+title+'</h1><p>This project link is unavailable. Ask the creator for a current link.</p>';
  return {statusCode:status,headers:{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',
    'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src https: http:; media-src https: http:; base-uri 'none'; frame-ancestors 'none'"
  },body:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+'</title><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#001012;color:#fff;font:16px/1.6 system-ui,sans-serif}main{max-width:680px;margin:12px auto;padding:clamp(20px,5vw,36px);border:1px solid #315456;border-radius:24px;background:linear-gradient(145deg,#0b2a2d,#041719 70%)}h1,h2{line-height:1.2;overflow-wrap:anywhere}h1{margin-top:0;font-size:clamp(24px,6vw,38px)}h2{font-size:17px;color:#e6ff79;margin:24px 0 6px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 18px}a{color:#e6ff79;overflow-wrap:anywhere}.media{display:grid;justify-items:center;gap:14px;margin:16px 0}video,img,audio{max-width:100%;border-radius:14px}video{max-height:75vh}</style></head><body><main>'+body+'</main></body></html>'};
}
exports.handler=async event=>{
  try{
    if(event.httpMethod==='POST'){
      const user=await getUser(event);
      if(!user)return json(401,{error:'Sign in to share a project.'});
      let req;
      try{req=JSON.parse(event.body||'{}');}catch{return json(400,{error:'Invalid request'});}
      if(!Number.isSafeInteger(req?.index)||!['base','added'].includes(req.source))return json(400,{error:'Invalid project'});
      const db=admin();
      const item=(await projects(db,user)).find(x=>x.source===req.source&&x.index===req.index);
      if(!item)return json(404,{error:'Save the project before sharing it.'});
      const {data,error}=await db.from('client_portfolio_shares').upsert({user_id:user.id,fingerprint:fingerprint(item.p)},{onConflict:'user_id,fingerprint'}).select('short_code').single();
      if(error)throw error;
      return json(200,{url:'https://fuseatelier.com/v/'+data.short_code});
    }
    if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
    const {code,project:token}=event.queryStringParameters||{};
    const isShort=typeof code==='string'&&/^[a-f0-9]{12}$/i.test(code);
    const isLegacy=typeof token==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token);
    if(!isShort&&!isLegacy)return page(null,404);
    const db=admin();
    const {data:share,error}=await db.from('client_portfolio_shares').select('user_id,fingerprint').eq(isShort?'short_code':'token',(isShort?code:token).toLowerCase()).maybeSingle();
    if(error)throw error;
    if(!share)return page(null,404);
    const {data}=await db.auth.admin.getUserById(share.user_id);
    if(!data?.user)return page(null,404);
    const item=(await projects(db,data.user)).find(x=>fingerprint(x.p)===share.fingerprint);
    return item?page(item.p):page(null,404);
  }catch(error){
    console.error('[client-portfolio-share]',error.message);
    return event.httpMethod==='GET'?page(null,503):json(503,{error:'Could not create a link. Try again.'});
  }
};
