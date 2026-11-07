(() => {
 'use strict';
 const authPath=location.pathname.replace(/\/$/,'');
 const isLogin=authPath==='/login';
 const query=new URLSearchParams(location.search);
 if(!['/signup','/login'].includes(authPath)||query.get('mode')==='reset'||query.get('method')==='password')return;
 const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',
   {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const $=id=>document.getElementById(id),form=$('signup-form'),email=$('email'),name=$('name'),
  google=$('google'),submit=$('submit'),message=$('message'),terms=$('agree'),marketing=$('marketing-opt-in');
 const params=new URLSearchParams(location.search);
 const safePath=s=>{try{const u=new URL(s,location.origin);
   if(u.origin!==location.origin||!u.pathname.startsWith('/atelier-v2/')||u.pathname.startsWith('//'))return null;
   return u.pathname+u.search+u.hash;
 }catch{return null}};
 let destination=safePath(params.get('next'))||'/atelier-v2/free-prompts-workflows.html';
 let referral=(params.get('ref')||new URL(destination,location.origin).searchParams.get('ref')||window.FuseFreeFunnel?.getRef()||'').toLowerCase();
 if(!/^[a-z0-9-]{5,80}$/.test(referral))referral='';
 if(referral&&!new URL(destination,location.origin).searchParams.has('ref')){
   const u=new URL(destination,location.origin);u.searchParams.set('ref',referral);destination=u.pathname+u.search+u.hash;
 }
 const returnPath=safePath(params.get('return'))||destination;
 document.querySelector('.close').href=returnPath;
 const callback=new URL('/signup',location.origin);
 callback.searchParams.set('next',destination);
 callback.searchParams.set('return',returnPath);
 if(referral)callback.searchParams.set('ref',referral);
 const codeBox=document.createElement('div');codeBox.className='fuse-otp-field';codeBox.hidden=true;
 codeBox.innerHTML='<label for="fuse-email-code">Verification code</label><input id="fuse-email-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]{6,10}" placeholder="6-digit code"><p class="otp-help">Check your email for your one-time Fuse sign-in code.</p>';
 submit.before(codeBox);
 const code=$('fuse-email-code');
 const actions=document.createElement('div');actions.className='fuse-otp-actions';actions.hidden=true;
 actions.innerHTML='<button type="button" id="fuse-resend">Resend code</button><button type="button" id="fuse-change-email">Change email</button>';
 submit.after(actions);
 const resend=$('fuse-resend'),change=$('fuse-change-email');
 const login=document.createElement('p');login.className='signin';
 const switchLink='/login?'+new URLSearchParams({next:destination,ref:referral});
 const signupLink='/signup?'+new URLSearchParams({next:destination,ref:referral});
 const passwordLink='/login?'+new URLSearchParams({method:'password',next:destination,ref:referral});
 login.innerHTML=isLogin
  ?'Prefer your password? <a href="'+passwordLink+'">Log in with password</a><br><a href="'+signupLink+'">Create a free account</a>'
  :'Already have an account? <a href="'+switchLink+'">Log in</a>';
 document.querySelector('.signup-panel').append(login);
 if(isLogin){name.required=false;name.hidden=true;form.querySelector('label[for=name]').hidden=true;terms.closest('.agreement').hidden=true;$('marketing-choice').hidden=true;}
 const note=document.createElement('p');note.className='fuse-signup-note';
 note.textContent=isLogin?'Secure email-code login · No password needed':'Free account · No payment required · No password needed for email signup';
 google.before(note);
 const textTitle=document.querySelector('h1'),subtitle=document.querySelector('.subheading'),divider=document.querySelector('.divider');
 const share=window.FuseFreeFunnel;
 let mode='start',busy=false,resendUntil=0,finished=false,requestedEmail='',requestedName='';
 const consentKey='fuse_signup_marketing_consent';
 function track(event,token){return share?.track(event,token)||Promise.resolve(false)}
 function readMarketing(){return !!marketing?.checked}
 function saveChoice(){try{localStorage.setItem(consentKey,JSON.stringify({optedIn:readMarketing(),at:Date.now()}))}catch{}}
 function showError(err){message.textContent=typeof err==='string'?err:(err?.message||'Something went wrong. Please try again.')}
 const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
 function agreed(){
   if(isLogin||terms.checked)return true;
   const box=terms.closest('.agreement');box.classList.remove('needs-attention');void box.offsetWidth;box.classList.add('needs-attention');
   terms.focus({preventScroll:true});message.textContent='Please accept the Terms and Privacy Policy to continue.';return false;
 }
 function setBusy(yes){busy=yes;submit.disabled=yes;google.disabled=yes;resend.disabled=yes||Date.now()<resendUntil;}
 function render(next,msg=''){
   mode=next;document.body.dataset.auth=next;
   const confirming=next==='confirm';
   textTitle.textContent=confirming?'Check your email':isLogin?'Log in to Fuse Atelier':'Get Your Free AI Resources';
   subtitle.textContent=confirming?'Enter the verification code sent to your email.':isLogin?'Enter your email to receive a one-time sign-in code.':'Create a free Fuse Atelier account to unlock my prompts and step-by-step workflows.';
   document.title=confirming?'Verify email · Fuse Atelier':'Free AI Resources · Fuse Atelier';
   google.hidden=divider.hidden=confirming;form.querySelector('label[for=name]').hidden=confirming||isLogin;name.hidden=confirming||isLogin;
   form.querySelector('label[for=email]').hidden=confirming;email.hidden=confirming;
   codeBox.hidden=!confirming;code.required=confirming;actions.hidden=!confirming;
   $('marketing-choice').hidden=confirming||isLogin;
   submit.textContent=confirming?'Verify code & unlock':isLogin?'Send Sign-in Code':'Send Verification Code';
   message.textContent=msg;
   if(confirming)code.focus();
 }
 const referralReady=(async()=>{
   if(!referral)return;
   try{
     const existing=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');
     if(existing?.code===referral&&/^[0-9a-f-]{36}$/i.test(existing.token))return;
     const res=await fetch('/api/fuse-earn?ref='+encodeURIComponent(referral),{cache:'no-store',signal:AbortSignal.timeout(5000)});
     const json=await res.json();if(res.ok&&json.token)localStorage.setItem('fuse_pending_referral',JSON.stringify({code:referral,token:json.token}));
   }catch{}
 })();
 async function complete(session){
   if(finished||!session?.access_token)return;
   finished=true;setBusy(true);message.textContent='Your free account is ready. Opening your resources…';
   try{
     const u=await sb.auth.getUser();const user=u?.data?.user;
     if(user){
       const fullName=requestedName||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Fuse creator';
       try{await fetch('/api/public-registration-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({name:fullName,marketingOptIn:readMarketing()}),signal:AbortSignal.timeout(6500)})}catch{}
       const recorded=await track('registration_completed',session.access_token);
       if(recorded?.recorded)window.FuseFreePixel?.trackComplete();
     }
     try{
       const p=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');
       if(p?.token&&/^[0-9a-f-]{36}$/i.test(p.token)){
         const res=await fetch('/api/fuse-earn',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'claim',token:p.token}),signal:AbortSignal.timeout(4000)});
         if(res.ok)localStorage.removeItem('fuse_pending_referral');
       }
     }catch{}
   }finally{location.replace(destination)}
 }
 async function requestCode(){
   if(!agreed()||!form.reportValidity())return;
   const address=email.value.trim().toLowerCase(),fullName=isLogin?(name.value.trim()||email.value.trim().split('@')[0]):name.value.trim();
   if(!fullName||!validEmail(address)){message.textContent='Enter your name and a valid email.';return}
   requestedEmail=address;requestedName=fullName;saveChoice();
   setBusy(true);message.textContent='Sending your verification code…';
   await track('signup_started');await referralReady;
   try{
     const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:isLogin?'login':'signup',email:address,name:fullName,next:destination}),signal:AbortSignal.timeout(15000)});
     const data=await response.json();if(!response.ok)throw Error(data.error||'Could not send the code. Please retry.');
     resendUntil=Date.now()+60000;
     await track('signup_code_requested');
     render('confirm','Enter the newest verification code sent to '+address+'. Check spam if needed.');
   }catch(err){showError(err)}
   finally{setBusy(false);resend.disabled=Date.now()<resendUntil;}
 }
 form.noValidate=true;
 form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy)return;
   if(mode!=='confirm'){await requestCode();return}
   const value=code.value.replace(/\s/g,'');
   if(!/^[0-9]{6,10}$/.test(value)){message.textContent='Enter the verification code from your email.';return}
   setBusy(true);message.textContent='Verifying your code…';
   try{
     const {data,error}=await sb.auth.verifyOtp({email:requestedEmail,token:value,type:'email'});
     if(error)throw Error('The code is invalid or expired. Enter the newest code or tap Resend code.');
     if(!data.session)throw Error('Email verified, but your session is not ready. Please try logging in.');
     await complete(data.session);
   }catch(err){showError(err);finished=false}
   finally{if(!finished)setBusy(false)}
 });
 resend.addEventListener('click',async()=>{
   if(busy||Date.now()<resendUntil)return;
   render('start');name.value=requestedName;email.value=requestedEmail;
   await requestCode();
 });
 change.addEventListener('click',()=>{
   if(busy)return;render('start');code.value='';email.readOnly=false;email.focus();
 });
 google.addEventListener('click',async()=>{
   if(busy||!agreed())return;
   saveChoice();setBusy(true);message.textContent='Opening Google signup…';
   await track('signup_started');await referralReady;
   try{
     const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.href}});
     if(error)throw error;
   }catch(err){showError(err);setBusy(false)}
 });
 track('signup_view');
 render('start');
 sb.auth.onAuthStateChange((event,session)=>{
   if(event==='INITIAL_SESSION'&&session)setTimeout(()=>complete(session),0);
   if(event==='SIGNED_IN'&&session&&mode!=='confirm')setTimeout(()=>complete(session),0);
 });
})();
