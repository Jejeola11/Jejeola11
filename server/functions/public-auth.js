const crypto = require('crypto');
const {admin,json} = require('./_supabase');
const {captureSignup}=require('./_platform-audience');
const neutral = () => json(200,{ok:true,message:'Check your inbox for your verification button. If you already have an account, use the same email as before.'});
exports.handler = async event => {
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
  const body=JSON.parse(event.body||'{}');
  const email=String(body.email||'').trim().toLowerCase();
  const name=String(body.name||'').trim().slice(0,120);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name)return json(400,{error:'Enter your name and a valid email address.'});
  if(!process.env.RESEND_API_KEY||!process.env.FUSE_EMAIL_FROM)return json(503,{error:'Email delivery is temporarily unavailable. Please try again later.'});
  const sb=admin();
  const ip=String(event.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
  const emailKey=hash(email),ipKey=hash(ip);
  const since=new Date(Date.now()-3600000).toISOString();
  const [{count:byEmail,error:e1},{count:byIp,error:e2}]=await Promise.all([
   sb.from('public_auth_requests').select('id',{count:'exact',head:true}).eq('email_hash',emailKey).gte('created_at',since),
   sb.from('public_auth_requests').select('id',{count:'exact',head:true}).eq('ip_hash',ipKey).gte('created_at',since)
  ]);
  if(e1||e2)throw new Error('Rate limit unavailable');
  if(byEmail>=3||byIp>=15)return json(429,{error:'Too many requests. Please wait before requesting another email.'});
  const {error:recordError}=await sb.from('public_auth_requests').insert({email_hash:emailKey,ip_hash:ipKey});if(recordError)throw recordError;
  if(body.mode!=='signup'){
   const {data,error}=await sb.from('profiles').select('id').ilike('email',email).maybeSingle();if(error)throw error;if(!data)return neutral();
  }
  const {data,error}=await sb.auth.admin.generateLink({type:'magiclink',email,options:{data:{full_name:name,name}}});
  if(error)throw error;
  await captureSignup(sb,{id:data?.user?.id,email,name});
  const token=data?.properties?.hashed_token;if(!token)throw new Error('Verification unavailable');
  const link='https://fuseatelier.com/login#token_hash='+encodeURIComponent(token);
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FUSE_EMAIL_FROM,to:[email],subject:'Verify your email to enter Fuse Atelier',html:`<div style="background:#021418;color:#f4f4f4;padding:32px;font-family:Arial,sans-serif"><h1>Welcome to Fuse Atelier</h1><p>Verify your email, then enter your name and email on the login page to continue.</p><p><a href="${link}" style="display:inline-block;background:#eef4bd;color:#021418;padding:16px 24px;border-radius:24px;text-decoration:none">Verify email &amp; continue</a></p><p>This button is single-use and expires shortly. If you didn’t request it, ignore this email.</p></div>`})});
  if(!response.ok)return json(502,{error:'We couldn’t send the verification email. Please try again shortly.'});
  return neutral();
 }catch(_){return json(500,{error:'We couldn’t send your verification email. Please try again shortly.'});}
};
