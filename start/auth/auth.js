(() => {
 'use strict';
 const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const signup=location.pathname.replace(/\/$/,'')==='/signup';
 const requestedNext=new URLSearchParams(location.search).get('next');
 const loginNext=requestedNext?.startsWith('/atelier-v2/')&&!requestedNext.startsWith('//')?requestedNext:'/atelier-v2/home.html';
 const hash=new URLSearchParams(location.hash.slice(1));
 let token=hash.get('token_hash');
 // Keep callback tokens in the URL until Supabase has finished initializing.
 const title=document.getElementById('title'),description=document.getElementById('description'),button=document.getElementById('submit'),message=document.getElementById('message'),switcher=document.getElementById('switch');
 const optIn=document.getElementById('marketingOptIn');
 let touchedOptIn=false;
 optIn?.addEventListener('change',()=>{touchedOptIn=true;});
 document.getElementById('email').addEventListener('input',()=>{if(!optIn||signup||touchedOptIn)return;try{const saved=JSON.parse(sessionStorage.getItem('fuse_signup_email_choice')||'null');optIn.checked=!!(saved&&saved.email===document.getElementById('email').value.trim().toLowerCase()&&saved.consent);}catch(_){}});
 let session=null;
 const ready=sb.auth.getSession().then(({data,error})=>{
  if(error)throw error;
  session=data.session;
  // getSession waits for URL token processing and persistence before cleanup.
  if(location.hash&&!token)history.replaceState(null,'',location.pathname+location.search);
  if(session&&!signup&&!token){location.replace(loginNext);return;}
 });
 if(token&&!signup){
  button.disabled=true;message.textContent='Signing you in securely…';
  ready.then(async()=>{
   const {data,error}=await sb.auth.verifyOtp({token_hash:token,type:'email'});
   if(error)throw error;
   const user=data.user;
   const name=user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'Fuse creator';
   try{await fetch('/api/public-registration-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({name,marketingOptIn:false})});}catch(_){}
   const next=sessionStorage.getItem('fuse_signup_destination');sessionStorage.removeItem('fuse_signup_destination');
   location.replace(next?.startsWith('/atelier-v2/')&&!next.startsWith('//')?next:loginNext);
  }).catch(error=>{message.textContent=error.message||'This link expired. Request another sign-in email.';button.disabled=false;token=null});
 }
 if(!signup&&!document.body.dataset.originalLogin){title.textContent='Welcome to Fuse Atelier';document.title='Log in — Fuse Atelier';switcher.textContent='New to Fuse? Create an account';switcher.href='/signup';description.textContent=token?'Enter your name and the email you just verified to log in.':'Enter your details to receive a secure login button by email.';button.textContent=token?'Verify and log in':'Send login email';}

 const form=document.getElementById('auth-form'),emailInput=document.getElementById('email'),nameInput=document.getElementById('name');
 let pendingEmail='',pendingName='',resendAt=0;
 const codeField=document.createElement('div');codeField.className='field';codeField.hidden=true;
 codeField.innerHTML='<label for="email-code">Email sign-in code</label><div class="input-wrap"><input id="email-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" placeholder="Enter your code"></div>';
 form.insertBefore(codeField,button);const codeInput=codeField.querySelector('input');
 const actions=document.createElement('p');actions.hidden=true;
 const resend=document.createElement('button'),change=document.createElement('button');
 for(const el of [resend,change]){el.type='button';el.style.cssText='background:transparent;border:0;color:#dfff4e;padding:10px;cursor:pointer;font:inherit;font-size:13px';actions.appendChild(el);}
 resend.textContent='Resend code';change.textContent='Change email';form.appendChild(actions);
 async function requestCode(){
  const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:pendingEmail,name:pendingName,mode:signup?'signup':'login',next:loginNext})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');
  resendAt=Date.now()+60000;resend.disabled=true;setTimeout(()=>resend.disabled=false,60000);
  codeField.hidden=false;actions.hidden=false;codeInput.required=true;emailInput.readOnly=true;nameInput.readOnly=true;
  button.textContent='Verify code & enter Fuse';description.textContent='Enter the code sent to '+pendingEmail+'. You can read the email on any device.';
  message.textContent='Code sent. Check your inbox or spam folder. Use the newest code.';codeInput.focus();
 }
 change.onclick=()=>{pendingEmail='';codeField.hidden=true;actions.hidden=true;codeInput.required=false;codeInput.value='';emailInput.readOnly=false;nameInput.readOnly=false;button.textContent='Send sign-in code';description.textContent='Enter your name and email to receive a sign-in code.';message.textContent='';emailInput.focus();};
 resend.onclick=async()=>{if(Date.now()<resendAt)return;resend.disabled=true;try{await requestCode()}catch(error){message.textContent=error.message;resend.disabled=false;}};
 if(!token){description.textContent='Enter your name and email to receive a sign-in code.';button.textContent='Send sign-in code';}
 async function enter(sessionData){
  session=sessionData;
  let consent=!!optIn?.checked;try{const saved=JSON.parse(sessionStorage.getItem('fuse_signup_email_choice')||'null');if(!optIn&&saved?.email===pendingEmail)consent=!!saved.consent;}catch(_){}
  try{await fetch('/api/public-registration-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({name:pendingName,marketingOptIn:consent})});}catch(_){}
  sessionStorage.removeItem('fuse_signup_email_choice');
  const next=sessionStorage.getItem('fuse_signup_destination');sessionStorage.removeItem('fuse_signup_destination');
  location.replace(next?.startsWith('/atelier-v2/')&&!next.startsWith('//')?next:loginNext);
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();button.disabled=true;message.textContent='';
  try{
   await ready;
   if(!codeField.hidden){
    const value=codeInput.value.replace(/\s/g,'');if(!/^[0-9]{6,10}$/.test(value))throw new Error('Enter the code from your email.');
    const {data,error}=await sb.auth.verifyOtp({email:pendingEmail,token:value,type:'email'});
    if(error)throw new Error('That code is invalid, expired or already used. Try the newest code, or tap Resend code.');
    await enter(data.session);return;
   }
   pendingEmail=emailInput.value.trim().toLowerCase();pendingName=nameInput.value.trim();
   if(!signup&&session&&session.user.email.trim().toLowerCase()===pendingEmail){await enter(session);return;}
   if(signup)sessionStorage.setItem('fuse_signup_email_choice',JSON.stringify({email:pendingEmail,consent:!!optIn?.checked}));
   await requestCode();
  }catch(error){message.textContent=error.message||'Could not sign in. Please try again.';}
  finally{button.disabled=false;}
 });
})();
