// Public double opt-in only: never email the unverified master audience automatically.
const crypto = require('crypto');
const { admin } = require('./_supabase');
const { clean, escapeHtml, publicAppUrl } = require('./_audience');
const { sendWelcome } = require('./_audience-email');

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRY_HOURS = 48;
const encode = x => escapeHtml(String(x||''));
const normalize = email => String(email||'').trim().toLowerCase();
const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const standardHeaders = {'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex,nofollow','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
function response(title,message, button, statusCode=200){
  const action=button ? '<div class="actions">'+button+'</div>':'';
  return {statusCode,headers:standardHeaders,body:`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#001012"><title>${encode(title)} · Fuse Atelier</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:22px;background:#001012;color:#f5fffa;font:16px/1.6 system-ui,Arial,sans-serif}.card{max-width:520px;width:100%;background:#062428;border:1px solid #365b5e;border-radius:26px;padding:clamp(26px,5vw,44px)}.brand{font-weight:900;letter-spacing:.14em;color:#dfff4e;font-size:13px}h1{font-size:clamp(27px,5vw,38px);line-height:1.12;margin:22px 0}p{color:#bad0ca}.btn{display:inline-block;background:#dfff4e;color:#03191b;border:0;border-radius:999px;font-weight:850;font-size:15px;padding:15px 24px;text-decoration:none;cursor:pointer}.actions{margin:26px 0 0}.small{color:#9db5b0;font-size:13px;margin-top:24px}</style></head><body><main class="card"><div class="brand">FUSE ATELIER</div><h1>${encode(title)}</h1><p>${encode(message)}</p>${action}<p class="small">Your choice. Your inbox. No automatic marketing subscription.</p></main></body></html>`};
}
function confirmForm(token) {
  return `<form method="post" action="/api/audience-email-optin"><input type="hidden" name="action" value="confirm"><input type="hidden" name="token" value="${encode(token)}"><button class="btn" type="submit">Yes, subscribe me</button></form>`;
}
function actionBody(event){
  const contentType=String(event.headers?.['content-type']||event.headers?.['Content-Type']||'');
  const body=String(event.body||'');
  if(body.length>5000)throw Error('Request too large');
  if(contentType.includes('application/json'))return JSON.parse(body);
  if(contentType.includes('application/x-www-form-urlencoded')){
    const params=new URLSearchParams(body);return Object.fromEntries(params.entries());
  }
  throw Error('Unsupported request type');
}
function safeOrigin(event) {
  const origin=event.headers?.origin || event.headers?.Origin;
  if(!origin)return true; // Ordinary form submissions may omit Origin on some clients.
  try{
    const incoming=new URL(origin).origin;
    const allowed=new Set([new URL(publicAppUrl()).origin,'https://fuseatelier.com','https://www.fuseatelier.com']);
    return allowed.has(incoming);
  }catch(_){return false}
}
async function isBlocked(db,email){
  const [s,c] = await Promise.all([
    db.from('audience_suppressions').select('id').eq('channel','email').eq('identifier',email).limit(1),
    db.from('audience_contacts').select('id,email_marketing_status,email_opted_out_at')
      .eq('email_normalized',email).maybeSingle()
  ]);
  if(s.error)throw s.error;
  if(c.error)throw c.error;
  return {blocked:Boolean(s.data?.length || c.data?.email_marketing_status==='unsubscribed' || c.data?.email_opted_out_at),contact:c.data};
}
async function requestOptin(db,input,event){
  // No unchecked or prechecked mailing-list enrollment.
  if(input.website)return response('Please check your inbox','If eligible, a verification message will be sent.');
  const email=normalize(clean(input.email,320));
  if(!VALID_EMAIL.test(email)||input.consent!=='yes')return response('One more step','Enter a valid email and tick the optional email-updates agreement.', '<a class="btn" href="/join-emails">Back to signup</a>',400);
  const generic=response('Check your inbox','If this address is eligible, we have sent a confirmation link. Open that email and choose “Yes, subscribe me” to join Fuse Atelier updates. If you did not request this, no action is needed.','<a class="btn" href="https://fuseatelier.com">Return to Fuse</a>');
  const state=await isBlocked(db,email);
  if(state.blocked || state.contact?.email_marketing_status==='subscribed')return generic;
  // Limit unrequested confirmation-email abuse without exposing whether an address exists.
  const previous=new Date(Date.now()-24*60*60*1000).toISOString();
  const ip=String(event.headers?.['x-forwarded-for']||'').split(',')[0].trim().slice(0,80);
  const salt=process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ipHash=ip?digest(salt+':'+ip):null;
  const [perEmail,perIp]=await Promise.all([
    db.from('audience_email_optin_requests').select('id',{count:'exact',head:true})
      .eq('email_normalized',email).gte('created_at',previous),
    ipHash?db.from('audience_email_optin_requests').select('id',{count:'exact',head:true})
      .eq('request_ip_hash',ipHash).gte('created_at',previous):Promise.resolve({count:0})
  ]);
  if(perEmail.error)throw perEmail.error;
  if(perIp.error)throw perIp.error;
  if((perEmail.count||0)>=2 || (perIp.count||0)>=20)return generic;
  if(!process.env.RESEND_API_KEY||!process.env.FUSE_EMAIL_FROM){
    console.error('[Fuse optin] confirmation email provider unavailable');
    return response('Unable to send right now','The confirmation service is unavailable. Please try again later.','<a class="btn" href="/join-emails">Try again</a>',503);
  }
  const token=crypto.randomBytes(32).toString('base64url');
  const {error:createError}=await db.from('audience_email_optin_requests').insert({
    email_normalized:email, token_hash:digest(token), request_ip_hash:ipHash,
    source:'join_emails_self_serve',expires_at:new Date(Date.now()+EXPIRY_HOURS*3600*1000).toISOString()
  });
  if(createError)throw createError;
  const link=publicAppUrl()+'/api/audience-email-optin?token='+encodeURIComponent(token);
  const html=`<!doctype html><html><body style="background:#f1f5f3;padding:24px;margin:0;font-family:Arial,sans-serif;color:#092123"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:auto;background:white;border-radius:20px;overflow:hidden"><tr><td style="background:#00191b;color:#dfff4e;padding:32px;font-size:15px;font-weight:900;letter-spacing:3px">FUSE ATELIER</td></tr><tr><td style="padding:36px"><h1 style="font-size:30px;line-height:1.1;color:#00191b">One click to confirm your choice.</h1><p style="line-height:1.65;color:#324d48">You asked to receive email updates from Fuse Atelier, a place to learn creative skills, build projects and follow useful opportunities. Please confirm that you want occasional emails from us.</p><p style="margin:30px 0"><a href="${encode(link)}" style="display:inline-block;border-radius:50px;padding:15px 23px;background:#dfff4e;color:#00191b;font-weight:800;text-decoration:none">Confirm my email preference</a></p><p style="line-height:1.55;color:#536762;font-size:13px">This link expires in 48 hours. If you did not request these emails, ignore this message. You will not be subscribed.</p></td></tr></table></body></html>`;
  const res=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'content-type':'application/json'},
    body:JSON.stringify({
      from:process.env.FUSE_EMAIL_FROM,
      to:[email],
      subject:'Confirm your choice to receive Fuse Atelier emails',
      html, reply_to:process.env.FUSE_EMAIL_REPLY_TO||undefined
    }),
    signal:AbortSignal.timeout(12000)
  });
  if(!res.ok){
    const error=await res.json().catch(()=>({}));
    console.error('[Fuse optin] confirmation mail delivery request failed',{status:res.status,message:String(error.message||'unknown').slice(0,150)});
    return response('Unable to send right now','The confirmation email could not be submitted. Please try later.','<a class="btn" href="/join-emails">Back to signup</a>',503);
  }
  return generic;
}
async function showConfirmation(db,token){
  if(!/^[a-zA-Z0-9_-]{30,128}$/.test(token))return response('Link unavailable','This confirmation link is invalid or has expired.','<a class="btn" href="/join-emails">Request another link</a>');
  const {data:r,error}=await db.from('audience_email_optin_requests')
    .select('status,expires_at').eq('token_hash',digest(token)).maybeSingle();
  if(error)throw error;
  if(!r||r.status!=='pending'||new Date(r.expires_at).getTime()<=Date.now()){
    return response('Link unavailable','This confirmation link was already used or has expired.','<a class="btn" href="/join-emails">Request another link</a>');
  }
  return response('Would you like Fuse emails?','By pressing the button below, you agree to receive occasional learning resources, product news, offers and community updates from Fuse Atelier. You can unsubscribe whenever you want.',confirmForm(token));
}
async function confirmOptin(db,token){
  if(!/^[a-zA-Z0-9_-]{30,128}$/.test(token))return response('Link unavailable','Please request a fresh confirmation link.', '<a class="btn" href="/join-emails">Try again</a>',400);
  const {data:r,error}=await db.from('audience_email_optin_requests')
    .select('id,email_normalized,status,expires_at').eq('token_hash',digest(token)).maybeSingle();
  if(error)throw error;
  if(!r||r.status!=='pending'||new Date(r.expires_at).getTime()<=Date.now()){
    return response('Link unavailable','This link has expired or was already used.','<a class="btn" href="/join-emails">Request another link</a>');
  }
  const state=await isBlocked(db,r.email_normalized);
  if(state.blocked)return response('Preference preserved','This email is on our do-not-contact list. We have not changed your preferences.');
  const now=new Date().toISOString();
  let newlyOptedIn=null;
  if(state.contact?.email_marketing_status==='subscribed'){
    newlyOptedIn=null;
  }else if(state.contact){
    const {data,error:updateError}=await db.from('audience_contacts')
      .update({email_marketing_status:'subscribed',email_opted_in_at:now})
      .eq('id',state.contact.id).eq('email_marketing_status','unknown')
      .is('email_opted_out_at',null).select('id,first_name,email_normalized').maybeSingle();
    if(updateError)throw updateError;
    newlyOptedIn=data;
  }else{
    const {data,error:insertError}=await db.from('audience_contacts')
      .insert({email_normalized:r.email_normalized,email_marketing_status:'subscribed',email_opted_in_at:now})
      .select('id,first_name,email_normalized').single();
    if(insertError)throw insertError;
    newlyOptedIn=data;
  }
  const {error:consumeError}=await db.from('audience_email_optin_requests')
    .update({status:'confirmed',confirmed_at:now}).eq('id',r.id).eq('status','pending');
  if(consumeError)throw consumeError;
  // Sender imports will pick up this verified consent; no marketing campaign is launched here.
  if(newlyOptedIn){
    try{await sendWelcome(db,newlyOptedIn)}
    catch(err){console.error('[Fuse optin] welcome email failed',err.message)}
  }
  return response('You are on the list!','Thank you for choosing Fuse Atelier emails. You can unsubscribe at any time, and we will only email you after your confirmation.','<a class="btn" href="https://fuseatelier.com">Explore Fuse Atelier</a>');
}
exports.handler=async event=>{
  const method=event.httpMethod||'GET';
  const db=admin();
  try{
    if(method==='GET'){
      const token=clean(event.queryStringParameters?.token,200);
      return token?await showConfirmation(db,token):
        response('Choose your email updates','To join Fuse Atelier emails, please use the signup form.','<a class="btn" href="/join-emails">Join Fuse emails</a>');
    }
    if(method!=='POST')return response('Method not allowed','This action is unavailable.',null,405);
    if(!safeOrigin(event))return response('Request blocked','Please submit from the Fuse Atelier website.',null,403);
    const input=actionBody(event);
    if(input.action==='request')return await requestOptin(db,input,event);
    if(input.action==='confirm')return await confirmOptin(db,clean(input.token,200));
    return response('Unknown action','Please try again from the signup page.',null,400);
  }catch(err){
    console.error('[Fuse email optin]',String(err?.message||err).slice(0,180));
    return response('Something went wrong','Your request could not be completed. Please try again later.','<a class="btn" href="/join-emails">Go back</a>',500);
  }
};