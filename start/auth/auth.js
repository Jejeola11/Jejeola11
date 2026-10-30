(() => {
 'use strict';
 const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const signup=location.pathname.replace(/\/$/,'')==='/signup';
 const requestedNext=new URLSearchParams(location.search).get('next');
 const loginNext=requestedNext?.startsWith('/atelier-v2/')&&!requestedNext.startsWith('//')?requestedNext:'/atelier-v2/home.html';
 const hash=new URLSearchParams(location.hash.slice(1));
 let token=hash.get('token_hash');
 if(location.hash)history.replaceState(null,'',location.pathname);
 const title=document.getElementById('title'),description=document.getElementById('description'),button=document.getElementById('submit'),message=document.getElementById('message'),switcher=document.getElementById('switch');
 const optIn=document.getElementById('marketingOptIn');
 let touchedOptIn=false;
 optIn?.addEventListener('change',()=>{touchedOptIn=true;});
 document.getElementById('email').addEventListener('input',()=>{if(!optIn||signup||touchedOptIn)return;try{const saved=JSON.parse(sessionStorage.getItem('fuse_signup_email_choice')||'null');optIn.checked=!!(saved&&saved.email===document.getElementById('email').value.trim().toLowerCase()&&saved.consent);}catch(_){}});
 let session=null;
 const ready=sb.auth.getSession().then(({data})=>{session=data.session;if(session&&!signup&&!token){button.textContent='Log in';description.textContent='Continue with your saved account, or enter another email to switch accounts.';document.getElementById('email').value=session.user.email||'';document.getElementById('name').value=session.user.user_metadata?.full_name||session.user.user_metadata?.name||'';}});
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
 document.getElementById('auth-form').addEventListener('submit',async e=>{
  e.preventDefault();await ready;button.disabled=true;message.textContent='';
  const email=document.getElementById('email').value.trim().toLowerCase(),name=document.getElementById('name').value.trim();
  try{
   if(token){
    const {data,error}=await sb.auth.verifyOtp({token_hash:token,type:'email'});
    if(error)throw new Error('This verification button has expired or was already used. Open Login to request a new email.');
    session=data.session;token=null;
   }
   if(!signup&&session&&session.user.email.trim().toLowerCase()===email){
    localStorage.setItem('fuse_display_name',name);
    // Signup already saved the contact; this authenticated call records the optional email choice.
    let consent=!!optIn?.checked;try{const saved=JSON.parse(sessionStorage.getItem('fuse_signup_email_choice')||'null');if(!optIn&&saved?.email===email)consent=!!saved.consent;}catch(_){}
    try{await fetch('/api/public-registration-sync',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({name,marketingOptIn:consent})});}catch(_){}
    sessionStorage.removeItem('fuse_signup_email_choice');location.replace(loginNext);return;
   }
   if(signup)sessionStorage.setItem('fuse_signup_email_choice',JSON.stringify({email,consent:optIn?.checked}));
   const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,name,mode:signup?'signup':'login'})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');
   message.textContent='Check your inbox (and spam folder). Tap the verification button, then enter your details to log in.';
  }catch(error){message.textContent=error.message;}
  finally{button.disabled=false;}
 });
})();
