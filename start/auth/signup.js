(() => {
  'use strict';
  // New free-resource signup uses a lighter email-code flow. Keep legacy login and reset intact.
  if(location.pathname.replace(/\/$/,'')==='/signup' && new URLSearchParams(location.search).get('mode')!=='reset')return;
  const sb = window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $ = id => document.getElementById(id), message=$('message');
  const referral=new URLSearchParams(location.search).get('ref');
  const referralReady=(async()=>{if(!referral||!/^[a-z0-9-]{5,80}$/i.test(referral))return;try{const saved=JSON.parse(localStorage.getItem('fuse_pending_referral')||'null');if(saved?.code===referral.toLowerCase()&&/^[0-9a-f-]{36}$/i.test(saved.token))return;const response=await fetch('/api/fuse-earn?ref='+encodeURIComponent(referral.toLowerCase()),{signal:AbortSignal.timeout(5000)});const info=await response.json();if(response.ok)localStorage.setItem('fuse_pending_referral',JSON.stringify({code:referral.toLowerCase(),token:info.token}));}catch{}})();
  const next = new URLSearchParams(location.search).get('next');
  const destination = next&&safeReturn(next)||'/atelier-v2/home.html';
  const requestedReturn=new URLSearchParams(location.search).get('return');
  function safeReturn(value){try{const u=new URL(value,location.origin);if(u.origin!==location.origin||['/signup','/login'].some(p=>u.pathname.startsWith(p))||u.pathname.startsWith('/start/auth/'))return null;return u.pathname+u.search+u.hash;}catch{return null;}}
  const returnTo=(requestedReturn&&safeReturn(requestedReturn))||(next&&safeReturn(next))||(document.referrer&&safeReturn(document.referrer))||'/atelier-v2/home.html';

  const form=$('signup-form'), email=$('email'), name=$('name'), submit=$('submit'), google=$('google'), links=document.querySelector('.signin'), agreement=$('agree').closest('.agreement');
  document.querySelector('.close').href=returnTo;
  const params=new URLSearchParams(location.search), callback=new URL('/signup','https://fuseatelier.com');
  for(const key of ['next','return','ref'])if(params.has(key))callback.searchParams.set(key,params.get(key));
  const row=document.createElement('div');row.className='password-row';row.innerHTML='<input id="password" aria-label="Password" placeholder="Password" type="password"><button type="button" id="eye" aria-label="Show password" aria-pressed="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path id="slash" d="M3 3l18 18"/></svg></button>';
  submit.before(row);
  const confirm=document.createElement('div');confirm.innerHTML='<label for="confirm-code">Email confirmation code</label><input id="confirm-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10">';submit.before(confirm);
  const pw=$('password'), code=$('confirm-code'), eye=$('eye');
  let view,busy=false,resendAt=0;
  const consentKey='fuse_signup_marketing_consent';
  function rememberConsent(){try{localStorage.setItem(consentKey,JSON.stringify({optedIn:$('marketing-opt-in').checked,at:Date.now()}));}catch{}}
  async function saveConsent(session){
    let pending;try{pending=JSON.parse(localStorage.getItem(consentKey)||'null');}catch{}
    if(!pending||Date.now()-pending.at>86400000)return;
    if(pending.optedIn===true){
      try{
        const response=await fetch('/api/marketing-consent',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({optedIn:true}),signal:AbortSignal.timeout(5000)});
        if(!response.ok)throw Error('Consent save failed');
      }catch{return;}
    }
    try{localStorage.removeItem(consentKey);}catch{}
  }
  const recoveryActions=document.createElement('div');recoveryActions.className='signin confirmation-actions';
  recoveryActions.innerHTML='<p id="pending-email"></p><div class="confirmation-action-row"><button type="button" id="resend-confirmation">Resend email</button><button type="button" id="change-email">Change email</button></div><button type="button" id="confirmation-login">Back to login</button>';
  submit.after(recoveryActions);
  const resend=$('resend-confirmation');
  function cooldown(){const seconds=Math.max(0,Math.ceil((resendAt-Date.now())/1000));resend.disabled=busy||seconds>0;resend.textContent=seconds?'Resend in '+seconds+'s':'Resend email';}
  setInterval(cooldown,1000);
  $('change-email').onclick=()=>{if(!busy){render('welcome');email.focus();}};
  $('confirmation-login').onclick=()=>{if(!busy)render('login');};
  resend.onclick=async()=>{if(busy||Date.now()<resendAt)return;busy=true;cooldown();message.textContent='Requesting another email…';try{const {error}=await sb.auth.resend({type:'signup',email:email.value.trim().toLowerCase(),options:{emailRedirectTo:callback.href}});if(error)throw error;resendAt=Date.now()+60000;message.textContent='Enter the newest verification code from your email.';}catch(e){message.textContent=e.message||'The email request failed. Please try again.';}finally{busy=false;cooldown();}};
  eye.onclick=()=>{const show=pw.type==='password';pw.type=show?'text':'password';eye.setAttribute('aria-label',show?'Hide password':'Show password');eye.setAttribute('aria-pressed',String(show));$('slash').style.display=show?'none':'';};
  const back=document.createElement('button');back.type='button';back.textContent='←';back.className='close';back.style.cssText='left:16px;right:auto';back.setAttribute('aria-label','Back');document.querySelector('.close').after(back);
  function render(mode,msg=''){
    view=mode;document.body.dataset.auth=mode;const welcome=mode==='welcome';$('marketing-choice').hidden=!welcome;
    const [title,subtitle,action]={welcome:['Welcome to Fuse Atelier','Sign up and learn AI for free','Continue'],create:['Create an account','Sign up and learn AI for free','Sign up'],login:['Log in to Fuse Atelier','Enter your account and continue creating','Log in'],forgot:['Reset your password','Enter your email to get a reset link','Send reset link'],reset:['Set a new password','Choose a new password','Save password'],confirm:['Check your email','Confirm your email to finish signing up','Verify code']}[mode];
    document.querySelector('h1').textContent=title;document.querySelector('.subheading').textContent=subtitle;submit.textContent=action;
    back.hidden=welcome||mode==='reset';google.hidden=document.querySelector('.divider').hidden=agreement.hidden=name.hidden=name.labels[0].hidden=!welcome;name.required=welcome;
    email.hidden=email.labels[0].hidden=mode==='reset'||mode==='confirm';email.required=!email.hidden;email.readOnly=mode==='create';email.labels[0].hidden=!welcome;
    row.hidden=!['create','login','reset'].includes(mode);pw.required=!row.hidden;pw.minLength=mode==='login'?1:8;pw.autocomplete=mode==='login'?'current-password':'new-password';pw.value='';if(pw.type==='text')eye.click();
    confirm.hidden=mode!=='confirm';code.required=!confirm.hidden;recoveryActions.hidden=confirm.hidden;if(!confirm.hidden){$('pending-email').textContent='Confirmation for '+email.value.trim();cooldown();}
    links.hidden=!['create','login'].includes(mode);links.innerHTML=mode==='create'?'Already have an account? <button type="button" data-mode="login">Log in</button>':'<button type="button" data-mode="forgot">Forgot password?</button><br><br>Don’t have an account? <button type="button" data-mode="welcome">Sign up</button>';
    message.textContent=msg;
  }
  let signupStep='welcome';
  links.onclick=e=>{if(busy||!e.target.dataset.mode)return;if(view==='create')signupStep='create';render(e.target.dataset.mode==='welcome'?signupStep:e.target.dataset.mode);};back.onclick=()=>{if(!busy)render(view==='forgot'?'login':view==='login'?signupStep:'welcome');};
  function agreed(){if(!$('marketing-opt-in').checked){const box=$('marketing-choice');box.classList.remove('needs-attention');void box.offsetWidth;box.classList.add('needs-attention');}if($('agree').checked)return true;message.textContent='';agreement.classList.remove('needs-attention');void agreement.offsetWidth;agreement.classList.add('needs-attention');agreement.scrollIntoView({block:'nearest',behavior:'smooth'});$('agree').focus({preventScroll:true});return false;}
  try{if(localStorage.getItem('fuse_last_auth')==='google'){const badge=document.createElement('span');badge.id='last-used';badge.textContent='Last used';google.append(badge);}}catch{}
  async function finish(session){await saveConsent(session);try{localStorage.setItem('fuse_last_auth',session.user.app_metadata?.provider==='google'?'google':'email')}catch{}location.replace(new URL(destination,'https://fuseatelier.com').href);}
  google.onclick=async()=>{if(busy||!agreed())return;busy=true;google.disabled=true;try{rememberConsent();await referralReady;const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.href}});if(error)throw error;}catch(e){message.textContent=e.message;busy=false;google.disabled=false;}};
  form.noValidate=true;
  submit.addEventListener('click',e=>{if(view==='welcome'&&!agreed())e.preventDefault();});
  form.onsubmit=async e=>{
    e.preventDefault();if(busy)return;
    if(view==='welcome'){if(agreed()&&form.reportValidity()&&name.value.trim()){rememberConsent();render('create');pw.focus();}return;}
    if(!form.reportValidity())return;
    busy=true;submit.disabled=true;message.textContent='';
    try{
      await referralReady;const address=email.value.trim().toLowerCase(),password=pw.value;let result;
      if(view==='create'){
        result=await sb.auth.signUp({email:address,password,options:{data:{name:name.value.trim(),full_name:name.value.trim(),fuse_password_set:true,email_marketing_opt_in:$('marketing-opt-in').checked,email_marketing_opt_in_at:$('marketing-opt-in').checked?new Date().toISOString():null,email_marketing_consent_text:'Send me occasional updates, guides, and promotions.'},emailRedirectTo:callback.href}});
        if(result.error&&['user_already_exists','email_exists'].includes(result.error.code)||!result.error&&!result.data?.session&&Array.isArray(result.data?.user?.identities)&&result.data.user.identities.length===0){signupStep='create';render('login','You already have an account. Log in instead.');pw.focus();return;}
        if(!result.error&&!result.data.session){resendAt=Date.now()+60000;render('confirm','Enter the verification code sent to your email to finish signing up.');return;}
      }else if(view==='login')result=await sb.auth.signInWithPassword({email:address,password});
      else if(view==='confirm')result=await sb.auth.verifyOtp({email:address,token:code.value.trim(),type:'email'});
      else if(view==='forgot'){
        const url=new URL(callback);url.searchParams.set('mode','reset');
        result=await sb.auth.resetPasswordForEmail(address,{redirectTo:url.href});
        if(!result.error){message.textContent='If an account exists, check your email for a reset link.';return;}
      }else if(view==='reset'){
        result=await sb.auth.updateUser({password});
        if(!result.error){finish((await sb.auth.getSession()).data.session);return;}
      }
      if(result.error)throw result.error;if(result.data.session)finish(result.data.session);
    }catch(e){if(view==='login'&&e.code==='email_not_confirmed'){render('confirm','Your email still needs confirmation. Request another email below.');}else{message.textContent=e.message||'Please try again.';}}finally{busy=false;submit.disabled=false;}
  };
  const recovery=params.get('mode')==='reset'||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
  render(location.pathname.startsWith('/login')||location.pathname.endsWith('/login.html')||recovery?'login':'welcome',recovery?'If your reset link expired, request a new one below.':'');
  sb.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){render('reset');return;}if(event==='INITIAL_SESSION'&&session&&!recovery)setTimeout(()=>referralReady.then(()=>finish(session)),0);});
})();

