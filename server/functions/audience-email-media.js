// Sign short-lived image / GIF uploads into the private admin's public email media bucket.
// The file bytes go straight from the browser to Supabase Storage, never through Vercel.
const crypto=require('crypto');
const {json}=require('./_supabase');
const {requireAdmin,parseBody}=require('./_audience');
const BUCKET='fuse-email-media';
const TYPES={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed.'});
  const access=await requireAdmin(event);if(access.error)return access.error;
  const input=parseBody(event),mime=String(input.type||'').toLowerCase().trim(),size=Number(input.size||0);
  if(!TYPES[mime])return json(400,{error:'Upload a PNG, JPG, WebP or animated GIF.'});
  if(!Number.isFinite(size)||size<=0||size>15*1024*1024)return json(400,{error:'Images and GIFs must be 15 MB or smaller.'});
  const path='campaigns/'+new Date().toISOString().slice(0,7)+'/'+crypto.randomBytes(16).toString('hex')+'.'+TYPES[mime];
  const {data,error}=await access.db.storage.from(BUCKET).createSignedUploadUrl(path);
  if(error)return json(502,{error:'Could not prepare secure media upload: '+error.message});
  const publicUrl=access.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return json(200,{ok:true,bucket:BUCKET,path,token:data.token,publicUrl});
};
