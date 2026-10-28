(() => {
 'use strict';
 const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const signup=location.pathname.replace(/\/$/,'')==='/signup';
 const hash=new URLSearchParams(location.hash.slice(1));
 let token=hash.get('token_hash');
 if(location.hash)history.replaceState(null,'',location.pathname);
 const title=document.getElementById('title'),description=document.getElementById('description'),button=document.getElementById('submit'),message=document.getElementById('message'),switcher=document.getElementById('switch');
 let session=null;
 const ready=sb.auth.getSession().then(({data})=>{session=data.session;if(session&&!signup&&!token){button.textContent='Log in';description.textContent='You’re already verified on this device. Enter your name and account email to continue.';}});
 if(!signup){title.textContent='Welcome to Fuse Atelier';document.title='Log in — Fuse Atelier';switcher.textContent='New to Fuse? Create an account';switcher.href='/signup';description.textContent=token?'Enter your name and the email you just verified to log in.':'Enter your details to receive a secure login button by email.';button.textContent=token?'Verify and log in':'Send login email';}
 document.getElementById('auth-form').addEventListener('submit',async e=>{
  e.preventDefault();await ready;button.disabled=true;message.textContent='';
  const email=document.getElementById('email').value.trim().toLowerCase(),name=document.getElementById('name').value.trim();
  try{
   if(token){
    const {data,error}=await sb.auth.verifyOtp({token_hash:token,type:'email'});
    if(error)throw new Error('This verification button has expired or was already used. Open Login to request a new email.');
    session=data.session;token=null;
   }
   if(!signup&&session){
    if(session.user.email.toLowerCase()!==email)throw new Error('Use the email address this verification button was sent to.');
    localStorage.setItem('fuse_display_name',name);location.replace('/atelier-v2/home.html');return;
   }
   const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,name,mode:signup?'signup':'login'})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');
   message.textContent='Check your inbox (and spam folder). Tap the verification button, then enter your details to log in.';
  }catch(error){message.textContent=error.message;}
  finally{button.disabled=false;}
 });
})();
