(()=>{'use strict';
 const allowed=['/atelier-v2/ocean-eyes-halloween.html','/atelier-v2/free-ai-tutorial.html','/atelier-v2/realistic-images.html'];
 if(!allowed.includes(location.pathname))return;
 const params=new URLSearchParams(location.search),ref=(params.get('ref')||window.FuseFreeFunnel?.getRef()||'').toLowerCase();
 function signupURL(){
   const dest=location.pathname+location.search+location.hash;
   const q=new URLSearchParams({next:dest,return:dest});
   if(/^[a-z0-9-]{5,80}$/.test(ref))q.set('ref',ref);
   return '/signup?'+q.toString();
 }
 const cover=document.createElement('section');cover.id='freeResourceLock';cover.className='fuse-resource-lock';
 cover.innerHTML='<div class="fuse-resource-lock-inner"><p class="fuse-resource-label">FREE FUSE ATELIER ACCOUNT</p><h2>Unlock these free prompts & workflows</h2><p>Create your free account to see the step-by-step instructions and copy the prompts. No payment required.</p><a id="fuseUnlockLink" href="/signup">Tap to Signup →</a><small>Already registered? <a id="fuseResourceLogin" href="/login">Log in</a></small></div>';
 cover.querySelector('#fuseUnlockLink').href=signupURL();
 cover.querySelector('#fuseResourceLogin').href='/login?next='+encodeURIComponent(location.pathname+location.search);
 cover.querySelector('#fuseUnlockLink').addEventListener('click',()=>window.FuseFreeFunnel?.track('signup_clicked'));
 const style=document.createElement('style');style.textContent=`
 .fuse-resource-lock{max-width:690px;margin:25px auto 130px;padding:0 18px;text-align:center;font-family:Montserrat,Arial,sans-serif}
 .fuse-resource-lock-inner{border:1px solid #315456;background:linear-gradient(145deg,#062125,#001012);border-radius:23px;padding:26px 20px;color:#f5fbf8}
 .fuse-resource-label{color:#dfff4e;font-weight:700;font-size:11px;letter-spacing:.1em}
 .fuse-resource-lock h2{font-size:clamp(19px,5vw,27px);font-weight:700;line-height:1.2;letter-spacing:-.035em}
 .fuse-resource-lock p:not(.fuse-resource-label){color:#b0c9c4;font-size:14px;line-height:1.6;margin:0 auto 19px;max-width:520px}
 .fuse-resource-lock-inner>a{display:flex;align-items:center;justify-content:center;min-height:49px;margin:0 auto 15px;border-radius:16px;background:linear-gradient(110deg,#ffe66a,#dfff4e,#eeffe0);font-size:15px;font-weight:700;color:#001012;text-decoration:none}
 .fuse-resource-lock small{font-size:12px;color:#a2bcbc}.fuse-resource-lock small a{color:#e4ffad}
 html.fuse-resource-open #freeResourceLock{display:none!important}
 `;
 document.head.append(style);
 function insert(){
   const main=document.querySelector('main.book-pages, main.prompt-detail');
   if(!main)return;
   if(main.classList.contains('book-pages'))main.after(cover);
   else main.after(cover);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insert,{once:true});else insert();
 async function check(){
   try{
     if(!window.supabase?.createClient)return;
     const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',
       {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
     const {data,error}=await sb.auth.getUser();
     if(error||!data?.user)return;
     document.documentElement.classList.add('fuse-resource-open');
     const sess=await sb.auth.getSession();
     if(sess.data?.session)window.FuseFreeFunnel?.track('resource_unlocked',sess.data.session.access_token);
   }catch{}
 }
 check();
})();
