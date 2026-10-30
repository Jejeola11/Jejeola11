(() => {
  'use strict';
  const sb = window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $ = id => document.getElementById(id), message=$('message');
  const referral=new URLSearchParams(location.search).get('ref');
  if(referral&&/^[a-z0-9-]{5,80}$/i.test(referral))localStorage.setItem('fuse_pending_referral',referral.toLowerCase());
  const next = new URLSearchParams(location.search).get('next');
  const destination = next?.startsWith('/atelier-v2/') && !next.startsWith('//') ? next : '/atelier-v2/home.html';
  const requestedReturn=new URLSearchParams(location.search).get('return');
  const returnTo=requestedReturn?.startsWith('/atelier-v2/')&&!requestedReturn.startsWith('//')?requestedReturn:'/';
  document.querySelector('.close').href=returnTo;
  document.querySelector('.signin a').href='/login?next='+encodeURIComponent(destination);
  fetch('https://rgbweaimkcndjznlazho.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3'}}).then(r=>r.json()).then(settings=>{
    if(settings.external?.google)return;
    sb.auth.getSession().then(({data})=>{if(data.session){$('google').disabled=false;$('google').lastChild.textContent='Continue to Fuse Atelier'}});
    $('google').disabled=true;
    $('google').lastChild.textContent='Google sign-in coming soon';
    $('google').title='Google sign-in is being connected';
  }).catch(()=>{});
  const agreement=document.querySelector('.agreement');
  $('agree').addEventListener('change',()=>{if($('agree').checked){agreement.classList.remove('needs-attention');message.textContent='';}});
  function agreed() {
    if ($('agree').checked) return true;
    message.textContent='Please agree to the terms and privacy policy to continue.';
    agreement.classList.remove('needs-attention');
    void agreement.offsetWidth;
    agreement.classList.add('needs-attention');
    agreement.scrollIntoView({block:'nearest',behavior:'smooth'});
    $('agree').focus({preventScroll:true});
    return false;
  }
  $('google').addEventListener('click', async () => {
    if (!agreed()) return;
    const {data:existing}=await sb.auth.getSession();
    if(existing.session){location.assign(destination);return;}
    $('google').disabled=true; message.textContent='Opening Google sign in…';
    try {
      sessionStorage.setItem('fuse_signup_destination',destination);
      const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/atelier-v2/home.html'}});
      if(error)throw error;
    }catch(error){message.textContent=error.message||'Could not start Google sign in.';$('google').disabled=false;}
  });
  $('signup-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!agreed()) return;
    const name=$('name').value.trim(),email=$('email').value.trim().toLowerCase();
    if (!name || !$('email').checkValidity()) return;
    const button=$('submit');button.disabled=true;message.textContent='Creating your account…';
    try {
      sessionStorage.setItem('fuse_signup_destination',destination);
      const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,mode:'signup',next:destination})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||'Please try again.');
      message.textContent='Check your email and tap the secure sign-in button. You’ll enter Fuse Atelier automatically.';
    }catch(error){message.textContent=error.message||'Could not create your account.';}
    finally{button.disabled=false;}
  });
  sb.auth.getSession().then(({data})=>{if(data.session)$('google').lastChild.textContent='Continue to Fuse Atelier'}).catch(()=>{});
})();
