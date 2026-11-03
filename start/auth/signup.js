(() => {
  'use strict';
  const sb = window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $ = id => document.getElementById(id), message=$('message');
  const referral=new URLSearchParams(location.search).get('ref');
  const referralReady=(async()=>{if(!referral||!/^[a-z0-9-]{5,80}$/i.test(referral))return;try{const saved=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');if(saved?.code===referral.toLowerCase()&&/^[0-9a-f-]{36}$/i.test(saved.token))return;const response=await fetch('/api/fuse-earn?ref='+encodeURIComponent(referral.toLowerCase()));const info=await response.json();if(response.ok)localStorage.setItem('fuse_pending_referral',JSON.stringify({code:referral.toLowerCase(),token:info.token}));}catch{}})();
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
    await referralReady;
    const {data:existing}=await sb.auth.getSession();
    if(existing.session){location.assign(destination);return;}
    $('google').disabled=true; message.textContent='Opening Google sign in…';
    try {
      sessionStorage.setItem('fuse_signup_destination',destination);
      const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/atelier-v2/home.html'}});
      if(error)throw error;
    }catch(error){message.textContent=error.message||'Could not start Google sign in.';$('google').disabled=false;}
  });
  const codeForm=document.createElement('form');
  codeForm.hidden=true;
  codeForm.innerHTML='<label for="email-code">Email sign-in code</label><input id="email-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{8}" maxlength="8" required><button class="submit" type="submit">Verify code</button>';
  $('signup-form').after(codeForm);
  const existingCode=document.createElement('button');
  existingCode.type='button';existingCode.className='google';existingCode.textContent='I already have a code';
  codeForm.before(existingCode);
  function showCode(){codeForm.hidden=false;existingCode.hidden=true;$('email-code').focus();}
  existingCode.onclick=()=>{if(!$('email').reportValidity())return;showCode();};
  codeForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!$('email').reportValidity())return;
    const button=codeForm.querySelector('button');button.disabled=true;
    try {
      await referralReady;
      const {error}=await sb.auth.verifyOtp({email:$('email').value.trim().toLowerCase(),token:$('email-code').value.trim(),type:'email'});
      if(error)throw error;
      location.assign(destination);
    }catch(error){message.textContent=error.message||'Could not verify your code.';}
    finally{button.disabled=false;}
  });
  $('signup-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!agreed()) return;
    await referralReady;
    const name=$('name').value.trim(),email=$('email').value.trim().toLowerCase();
    if (!name || !$('email').checkValidity()) return;
    const button=$('submit');button.disabled=true;message.textContent='Creating your account…';
    try {
      sessionStorage.setItem('fuse_signup_destination',destination);
      const response=await fetch('/api/public-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,mode:'signup',next:destination})});
      const result=await response.json(); if(!response.ok)throw new Error(result.error||'Please try again.');
      message.textContent='Check your email and enter the 8-digit code below.';showCode();
    }catch(error){message.textContent=error.message||'Could not create your account.';}
    finally{button.disabled=false;}
  });
  sb.auth.getSession().then(({data})=>{if(data.session)$('google').lastChild.textContent='Continue to Fuse Atelier'}).catch(()=>{});
})();
