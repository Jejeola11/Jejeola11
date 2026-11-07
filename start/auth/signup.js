(() => {
 'use strict';
 const client=window.supabase?.createClient(
  'https://rgbweaimkcndjznlazho.supabase.co',
  'sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
 );
 const $=id=>document.getElementById(id);
 const main=$('signup-panel'), email=$('email'), submit=$('submit'),
  google=$('google'), terms=$('agree'), marketing=$('marketing-opt-in'),
  info=$('message'), modal=$('auth-modal'), title=$('modal-title'),
  subtitle=$('modal-subtitle'), modalForm=$('modal-form'), loginEmail=$('login-email'),
  loginGroup=$('login-email-group'), codeGroup=$('code-group'),
  modalButton=$('modal-action'), modalInfo=$('modal-message'),
  resend=$('resend-code'), resendActions=$('verify-actions'),
  codeFields=Array.from(document.querySelectorAll('.fuse-code-digit')),
  digitsCount=codeFields.length, query=new URLSearchParams(location.search);
 if(!client||digitsCount!==6)return;
 function safePath(raw) {
  try{
   const url=new URL(raw,location.origin);
   if(url.origin!==location.origin||url.pathname.startsWith('//')||
     ['/signup','/login','/start/auth/'].some(prefix=>url.pathname.startsWith(prefix)))return null;
   return url.pathname+url.search+url.hash;
  }catch{return null}
 }
 const requestedNext=safePath(query.get('next'));
 const destination=requestedNext||'/atelier-v2/home.html';
 const returnPage=safePath(query.get('return'))||requestedNext||safePath(document.referrer)||'/atelier-v2/home.html';
 document.querySelector('.close').href=returnPage;
 const nestedRef=(()=>{try{
   const u=new URL(query.get('next')||'',location.origin);
   return u.origin===location.origin?u.searchParams.get('ref'):'';
  }catch{return ''}})();
 const savedRef=(()=>{try{return JSON.parse(localStorage.getItem('fuse_pending_referral')||'null')?.code||''}catch{return ''}})();
 const possibleRef=(query.get('ref')||nestedRef||window.FuseFreeTracking?.getRef()||savedRef||'').toLowerCase();
 const referral=/^[a-z0-9-]{5,80}$/.test(possibleRef)?possibleRef:'';
 const callback=new URL('/signup',location.origin);
 for(const key of ['next','return','ref','gate'])if(query.has(key))callback.searchParams.set(key,query.get(key));
 if(referral&&!callback.searchParams.has('ref'))callback.searchParams.set('ref',referral);
 const timedTutorialGate=query.get('gate')==='free-view-limit'&&
  /^\/atelier-v2\/(?:free-prompts-workflows|ocean-eyes-halloween|free-ai-tutorial|realistic-images)\.html$/.test(new URL(destination,location.origin).pathname);
 if(timedTutorialGate)$('signup-title').textContent='Sign Up to Continue';
 let state=location.pathname.replace(/\/+$/,'')==='/login'?'login':'signup';
 let requestedEmail='',requestPurpose='signup',busy=false,done=false,resendAt=0,lastFocus=null;
 const codeButtons=()=>resendActions.querySelectorAll('button');
 const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254;
 const track=(name,token)=>window.FuseFreeTracking?.event(name,token)||Promise.resolve({ok:false});
 const referralReady=(async()=>{
  if(!referral)return;
  try{
   const old=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');
   if(old?.code===referral&&/^[0-9a-f-]{36}$/i.test(old.token))return;
   const response=await fetch('/api/fuse-earn?ref='+encodeURIComponent(referral),{signal:AbortSignal.timeout(5000)});
   const data=await response.json();
   if(response.ok&&data.token)localStorage.setItem('fuse_pending_referral',JSON.stringify({code:referral,token:data.token}));
  }catch{}
 })();
 function showError(error,target=modalInfo){
  target.textContent=typeof error==='string'?error:(error?.message||'Something went wrong. Please try again.');
 }
 function agreed(){
  if(terms.checked)return true;
  const box=$('terms-agreement');box.classList.remove('needs-attention');void box.offsetWidth;box.classList.add('needs-attention');
  terms.focus({preventScroll:true});
  showError('Please accept the Terms of Use and Privacy Policy to continue.',info);
  return false;
 }
 function consent(){return !!marketing.checked}
 function saveConsent(){try{localStorage.setItem('fuse_signup_marketing_consent',JSON.stringify({optedIn:consent(),at:Date.now()}))}catch{}}
 function lock(yes){
  busy=yes;submit.disabled=yes;google.disabled=yes;modalButton.disabled=yes;
  for(const el of codeFields)el.disabled=yes;
  loginEmail.disabled=yes;resend.disabled=yes||Date.now()<resendAt;
 }
 function openModal(kind,notice=''){
  lastFocus=document.activeElement;modal.hidden=false;main.setAttribute('aria-hidden','true');
  document.body.classList.add('fuse-modal-open');
  state=kind;modalInfo.textContent=notice;
  const verifying=kind==='code';
  loginGroup.hidden=verifying;codeGroup.hidden=!verifying;resendActions.hidden=!verifying;
  if(verifying){
   requestPurpose=requestPurpose==='login'?'login':'signup';
   title.textContent='Input your verification code';
   subtitle.textContent=requestPurpose==='login'
    ?'Fuse Atelier just sent you a verification code. Check your email and fill it below to securely log in.'
    :'Fuse Atelier just sent you a verification code, check your email and fill it below to create your account';
   modalButton.textContent=requestPurpose==='login'?'Login':'Create Account';
   $('sent-to').textContent='Code sent to '+requestedEmail;
   codeFields.forEach(f=>{f.value='';f.disabled=false});
   codeFields[0].focus({preventScroll:true});
  }else{
   title.textContent='Login to your account';
   subtitle.textContent='Input your email to login.';
   modalButton.textContent='Login';
   loginEmail.value=requestedEmail||email.value.trim();loginEmail.disabled=false;
   loginEmail.focus({preventScroll:true});
  }
 }
 function closeModal(){
  if(busy)return;
  modal.hidden=true;main.removeAttribute('aria-hidden');
  document.body.classList.remove('fuse-modal-open');
  modalInfo.textContent='';state='signup';
  (lastFocus?.isConnected?lastFocus:email).focus({preventScroll:true});
 }
 function homeAfterAuth(){
  // Preserve explicit return destinations for tutorials, purchases and the
  // 10-minute guest gate; otherwise open Fuse Atelier's homepage.
  return destination;
 }
 async function finish(session,source){
  if(done||!session?.access_token||!session?.user?.id)return;
  done=true;lock(true);
  showError('Success! Opening Fuse Atelier…',modal.hidden?info:modalInfo);
  try{
   // Save profile and consent only after the user really verifies the code.
   const pending=(()=>{try{return JSON.parse(localStorage.getItem('fuse_signup_marketing_consent')||'null')}catch{return null}})();
   const selectedOptIn=source==='signup'&&(pending?.optedIn===true)&&Date.now()-Number(pending.at)<86400000;
   try{
    await fetch('/api/public-registration-sync',{
     method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
     body:JSON.stringify({marketingOptIn:selectedOptIn}),
     signal:AbortSignal.timeout(5000)
    });
   }catch{}
   if(source==='signup'){
    try{await window.FuseFreeTracking?.complete(session)}catch{}
   }
   try{
    await referralReady;
    const stored=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');
    if(stored?.token&&/^[0-9a-f-]{36}$/i.test(stored.token)){
     const res=await fetch('/api/fuse-earn',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
      body:JSON.stringify({action:'claim',token:stored.token}),signal:AbortSignal.timeout(4500)
     });
     if(res.ok){const response=await res.json();if(response.claimed===true)localStorage.removeItem('fuse_pending_referral')}
    }
   }catch{}
   try{localStorage.setItem('fuse_last_auth',session.user.app_metadata?.provider==='google'?'google':'email')}catch{}
  }finally{location.replace(homeAfterAuth())}
 }
 async function requestEmailCode(address,purpose){
  if(busy)return;
  if(!validEmail(address)){showError('Enter a valid email address.',purpose==='login'?modalInfo:info);return}
  if(purpose==='signup'&&!agreed())return;
  requestedEmail=address.toLowerCase();requestPurpose=purpose;
  if(purpose==='signup')saveConsent();
  lock(true);
  showError('Sending your verification code…',purpose==='login'?modalInfo:info);
  try{
   if(purpose==='signup')await track('signup_started');
   await referralReady;
   const response=await fetch('/api/public-auth',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode:purpose,email:requestedEmail}),
    signal:AbortSignal.timeout(16000)
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(body.error||'We couldn’t send a code right now.');
   resendAt=Date.now()+60000;
   openModal('code',purpose==='login'?'If an account exists, check your email for the code.':'');
  }catch(error){showError(error,purpose==='login'?modalInfo:info)}
  finally{lock(false)}
 }
 async function verifyCode(){
  if(busy)return;
  const code=codeFields.map(field=>field.value).join('');
  if(!/^\d{6}$/.test(code)){showError('Enter the 6-digit code from your email.');return}
  lock(true);showError('Verifying your code…');
  try{
   const {data,error}=await client.auth.verifyOtp({email:requestedEmail,token:code,type:'email'});
   if(error)throw Error('The code is incorrect or expired. Try the newest code or request another.');
   if(!data?.session)throw Error('Your email was verified, but sign-in could not finish. Please request another code.');
   await finish(data.session,requestPurpose);
  }catch(error){showError(error)}
  finally{if(!done)lock(false)}
 }
 // The six boxes accept Android OTP autofill, pasted codes and backspace.
 function fillDigits(text,start=0){
  const value=String(text||'').replace(/\D/g,'').slice(0,6-start);
  if(!value)return;
  for(let i=0;i<value.length&&i+start<digitsCount;i++)codeFields[i+start].value=value[i];
  codeFields[Math.min(5,start+value.length)].focus({preventScroll:true});
 }
 codeFields.forEach((field,i)=>{
  field.addEventListener('input',()=>{
   const value=field.value.replace(/\D/g,'');
   if(value.length>1){field.value='';fillDigits(value,i);return}
   field.value=value.slice(0,1);
   if(field.value&&i<5)codeFields[i+1].focus({preventScroll:true});
  });
  field.addEventListener('keydown',event=>{
   if(event.key==='Backspace'&&!field.value&&i>0){codeFields[i-1].value='';codeFields[i-1].focus({preventScroll:true})}
   if(event.key==='ArrowLeft'&&i>0)codeFields[i-1].focus({preventScroll:true});
   if(event.key==='ArrowRight'&&i<5)codeFields[i+1].focus({preventScroll:true});
  });
  field.addEventListener('paste',event=>{const value=event.clipboardData?.getData('text')||'';event.preventDefault();fillDigits(value,i)});
 });
 $('signup-form').addEventListener('submit',event=>{event.preventDefault();if(busy)return;requestEmailCode(email.value.trim().toLowerCase(),'signup')});
 $('open-login').addEventListener('click',()=>openModal('login'));
 $('modal-close').addEventListener('click',closeModal);
 $('modal-backdrop').addEventListener('click',closeModal);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden){event.preventDefault();closeModal()}});
 modalForm.addEventListener('submit',event=>{
  event.preventDefault();if(busy)return;
  if(state==='login')requestEmailCode(loginEmail.value.trim().toLowerCase(),'login');
  else if(state==='code')verifyCode();
 });
 $('change-email').addEventListener('click',()=>{if(!busy){if(requestPurpose==='login')openModal('login');else closeModal()}});
 resend.addEventListener('click',async()=>{
  if(busy||Date.now()<resendAt)return;
  const purpose=requestPurpose;
  await requestEmailCode(requestedEmail,purpose);
 });
 setInterval(()=>{
  if(modal.hidden||state!=='code')return;
  const wait=Math.max(0,Math.ceil((resendAt-Date.now())/1000));
  resend.disabled=busy||wait>0;resend.textContent=wait?'Resend in '+wait+'s':'Resend code';
 },1000);
 google.addEventListener('click',async()=>{
  if(busy||!agreed())return;
  lock(true);saveConsent();showError('Opening Google…',info);
  try{
   await track('signup_started');await referralReady;
   const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.href}});
   if(error)throw error;
  }catch(error){showError(error,info);lock(false)}
 });
 // Auto-open the login panel when /login is opened directly.
 if(location.pathname.replace(/\/+$/,'')==='/login')openModal('login');
 const recovery=query.get('mode')==='reset'||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
 if(recovery){
  // Legacy recovery links remain a safe fallback to email-code login.
  if(modal.hidden)openModal('login');
  showError('Use your email address to receive a fresh one-time login code.');
 }
 client.auth.onAuthStateChange((event,session)=>{
  if(!session||recovery)return;
  // Google OAuth returns via /signup and Supabase may emit INITIAL_SESSION
  // before SIGNED_IN. Both must use the same registration classification.
  const source=location.pathname.replace(/\/+$/,'')==='/signup'?'signup':'login';
  if(event==='INITIAL_SESSION'||(event==='SIGNED_IN'&&modal.hidden))
   setTimeout(()=>finish(session,source),0);
 });
})();