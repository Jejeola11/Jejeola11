// Supabase Send Email hook. Only authenticated Supabase webhook requests may send.
const crypto = require('node:crypto');
function verify(raw, headers, secret) {
  const id = headers['webhook-id'], ts = headers['webhook-timestamp'];
  if (!id || !/^\d+$/.test(ts || '') || Math.abs(Date.now()/1000-Number(ts))>300) return false;
  const key = Buffer.from(secret.replace(/^v1,whsec_|^whsec_/, ''), 'base64');
  if(key.length<16)return false;
  const expected = crypto.createHmac('sha256',key).update(`${id}.${ts}.${raw}`).digest();
  return String(headers['webhook-signature']||'').split(' ').some(s=>{
    const [version,signature]=s.split(',');const actual=Buffer.from(signature||'','base64');
    return version==='v1'&&actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
  });
}
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emails(payload) {
  const {user,email_data:d}=payload;
  const titles={signup:'Confirm your Fuse Atelier account',recovery:'Reset your Fuse Atelier password',magiclink:'Sign in to Fuse Atelier',invite:'Your Fuse Atelier invitation',email_change:'Confirm your email change',reauthentication:'Confirm your Fuse Atelier action'};
  if(!user||!d||!titles[d.email_action_type])throw Error('Unsupported auth email');
  let recipients=[[user.email,d.token,d.token_hash]];
  if(d.email_action_type==='email_change')recipients=d.token_hash_new?
    [[user.email,d.token,d.token_hash_new],[user.new_email,d.token_new,d.token_hash]]:
    [[user.new_email,d.token_new||d.token,d.token_hash]];
  const redirect=new URL('/signup','https://fuseatelier.com');
  try{const requested=new URL(d.redirect_to);if(requested.origin===redirect.origin&&requested.pathname==='/signup')redirect.search=requested.search;}catch{}
  if(d.email_action_type==='recovery')redirect.searchParams.set('mode','reset');
  return recipients.map(([to,token,hash])=>{
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to||'')||!/^\d{6,10}$/.test(token||'')||!hash)throw Error('Invalid auth email');
    const link=new URL('https://rgbweaimkcndjznlazho.supabase.co/auth/v1/verify');
    link.searchParams.set('token',hash);link.searchParams.set('type',d.email_action_type);link.searchParams.set('redirect_to',redirect.href);
    const subject=titles[d.email_action_type];
    const copyURL='https://fuseatelier.com/start/auth/copy-code.html#code='+encodeURIComponent(token);
    if(d.email_action_type==='signup')return {to:[to],subject:'Your Fuse Atelier verification code',text:`Your Fuse Atelier verification code: ${token}\n\nReturn to Fuse Atelier, enter this code and tap Verify code to sign in. Use only the newest code. Never share it. If you did not request this, ignore this email.`,html:`<div style="background:#00191b;color:#eeffe0;padding:32px;font-family:Arial,sans-serif"><h1>Verify your email</h1><p>Enter this code in Fuse Atelier, then tap Verify code:</p><p style="font-size:32px;letter-spacing:6px;color:#dfff4e">${escape(token)}</p><p><a href="${escape(copyURL)}" style="display:inline-block;background:#dfff4e;color:#00191b;padding:14px 24px;border-radius:10px;font-weight:bold;text-decoration:none">Copy code</a></p><p style="font-size:13px">Opens a Fuse page where you can copy your code. Then return to the signup tab.</p><p>Use only the newest code. Never share it. If you did not request this, ignore this email.</p></div>`};
    return {to:[to],subject,text:`${subject}\n\nYour code: ${token}\n\nContinue securely: ${link.href}\n\nUse only the newest code. Never share it. If you did not request this, ignore this email.`,html:`<div style="background:#00191b;color:#eeffe0;padding:32px;font-family:Arial,sans-serif"><h1>${subject}</h1><p>Your confirmation code:</p><p style="font-size:32px;letter-spacing:6px;color:#dfff4e">${escape(token)}</p><p><a style="color:#dfff4e" href="${escape(link.href)}">Continue securely to Fuse Atelier</a></p><p>Use only the newest code. Never share it. If you did not request this, ignore this email.</p></div>`};
  });
}
module.exports=async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const end=(status,body)=>{res.statusCode=status;return res.end(JSON.stringify(body));};
  if(req.method!=='POST')return end(405,{error:'Method not allowed'});
  if(!process.env.SEND_EMAIL_HOOK_SECRET||!process.env.RESEND_API_KEY||!process.env.FUSE_EMAIL_FROM)return end(503,{error:'Email delivery is not configured'});
  try{
    const chunks=[];let length=0;for await(const chunk of req){length+=Buffer.byteLength(chunk);if(length>65536)return end(413,{error:'Payload too large'});chunks.push(Buffer.from(chunk));}
    const raw=Buffer.concat(chunks).toString('utf8');
    if(!verify(raw,req.headers,process.env.SEND_EMAIL_HOOK_SECRET))return end(401,{error:'Invalid signature'});
    const messages=emails(JSON.parse(raw));
    for(let i=0;i<messages.length;i++){
      const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(4000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`auth-${req.headers['webhook-id']}-${i}`},body:JSON.stringify({from:process.env.FUSE_EMAIL_FROM,...messages[i]})});
      if(!response.ok)return end(502,{error:'Email provider did not accept the message'});
    }
    return end(200,{});
  }catch{return end(500,{error:'Email delivery failed'});}
};
module.exports.config={api:{bodyParser:false}};
module.exports.verify=verify;module.exports.emails=emails;
