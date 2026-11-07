(function(root,doc){
 'use strict';
 const pages=new Set([
  '/atelier-v2/free-prompts-workflows.html',
  '/atelier-v2/ocean-eyes-halloween.html',
  '/atelier-v2/free-ai-tutorial.html',
  '/atelier-v2/realistic-images.html'
 ]);
 if(!pages.has(root.location.pathname))return;
 const guestHeading='LEARN HIGH PAYING AI SKILLS AND BRING YOUR IDEAS TO LIVE WITH FUSE ATELIER';
 const guestButton='Sign Up to Get 4 Free Credits';
 const validRef=value=>typeof value==='string'&&/^[a-z0-9-]{5,80}$/i.test(value)?value.toLowerCase():'';
 function referral(){
  const fromURL=validRef(new URLSearchParams(root.location.search).get('ref'));
  if(fromURL)return fromURL;
  try{
   const context=JSON.parse(root.sessionStorage.getItem('fuse_free_funnel_attribution')||'null');
   if(validRef(context?.ref))return validRef(context.ref);
  }catch{}
  try{
   const pending=JSON.parse(root.localStorage.getItem('fuse_pending_referral')||'null');
   if(validRef(pending?.code))return validRef(pending.code);
  }catch{}
  return '';
 }
 function signupURL(afterViewingLimit=false){
  const url=new URL(root.location.href),ref=referral();
  if(ref&&!url.searchParams.has('ref'))url.searchParams.set('ref',ref);
  const destination=url.pathname+url.search+url.hash;
  const q=new URLSearchParams({next:destination,return:destination});
  if(ref)q.set('ref',ref);
  if(afterViewingLimit)q.set('gate','free-view-limit');
  return '/signup?'+q.toString();
 }
 function init(){
  const banner=doc.querySelector('aside.viral-banner');
  const heading=banner?.querySelector('p'),button=banner?.querySelector('a');
  if(!banner||!heading||!button){doc.documentElement.classList.remove('fuse-banner-pending');return}
  const signedMarkup=heading.innerHTML, signedButton=button.textContent, signedHref=button.getAttribute('href')||'/influencer',signedLabel=banner.getAttribute('aria-label')||'AI Influencer course';
  let guestState=null,client=null;
  const VIEW_LIMIT_MS=10*60*1000;
  const TIME_KEY='fuse_free_tutorial_guest_view_ms_v1';
  let timer=null,lastTick=0,elapsed=0,redirecting=false;
  function readElapsed(){
   try{
    const value=Number(root.sessionStorage.getItem(TIME_KEY)||0);
    return Number.isFinite(value)&&value>=0?Math.min(VIEW_LIMIT_MS,value):0;
   }catch{return elapsed}
  }
  function saveElapsed(){
   try{root.sessionStorage.setItem(TIME_KEY,String(Math.min(VIEW_LIMIT_MS,Math.floor(elapsed))))}catch{}
  }
  function sendToSignup(){
   if(redirecting||guestState!==true)return;
   redirecting=true;saveElapsed();
   root.location.assign(signupURL(true));
  }
  function tick(){
   if(guestState!==true||redirecting)return;
   const now=Date.now();
   if(!doc.hidden){
    // Only count time with this page visible. Cap delayed mobile-browser
    // ticks so a backgrounded/suspended tab cannot consume the allowance.
    elapsed=Math.max(elapsed,readElapsed())+Math.max(0,Math.min(2500,now-lastTick));
    saveElapsed();
    if(elapsed>=VIEW_LIMIT_MS){sendToSignup();return}
   }
   lastTick=now;
  }
  function startTimer(){
   if(timer!==null||redirecting)return;
   elapsed=readElapsed();lastTick=Date.now();
   if(elapsed>=VIEW_LIMIT_MS){sendToSignup();return}
   timer=root.setInterval(tick,1000);
  }
  function stopTimer(){
   if(timer!==null)root.clearInterval(timer);
   timer=null;lastTick=0;redirecting=false;elapsed=0;
   try{root.sessionStorage.removeItem(TIME_KEY)}catch{}
  }
  function render(isGuest){
   if(isGuest===guestState)return;
   guestState=isGuest;
   if(isGuest)startTimer();else stopTimer();
   banner.classList.toggle('fuse-banner-guest',isGuest);
   if(isGuest){
    heading.textContent=guestHeading;button.textContent=guestButton;
    button.href=signupURL();banner.setAttribute('aria-label','Sign up for 4 free Fuse Atelier credits');
   }else{
    heading.innerHTML=signedMarkup;button.textContent=signedButton;
    button.setAttribute('href',signedHref);banner.setAttribute('aria-label',signedLabel);
   }
   doc.documentElement.classList.remove('fuse-banner-pending');
  }
  async function refresh(){
   try{
    const instance=client||root.__fuseClient||await root.Fuse?.client();
    if(instance){
     client=instance;
     const {data,error}=await instance.auth.getSession();
     if(error)throw error;
     render(!data?.session?.user);
     return;
    }
    const session=await root.FuseExplore?.session();
    render(!session?.user);
   }catch{render(true)}
  }
  const pendingFallback=root.setTimeout(()=>render(true),4500);
  // The timeout is a safety fallback if the auth bundle fails to initialize.
  // Refresh on sign-in, sign-out, tab return, and history navigation.
  (async()=>{
   await refresh();
   root.clearTimeout(pendingFallback);
   try{
    client=client||root.__fuseClient||await root.Fuse?.client();
    if(client?.auth?.onAuthStateChange){
     client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT')render(true);
      else if(['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))render(!session?.user);
     });
    }
   }catch{}
  })();
  root.addEventListener('pageshow',()=>refresh());
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){lastTick=Date.now()}else{lastTick=Date.now();refresh()}});
  root.addEventListener('pagehide',()=>{if(guestState===true)tick();if(timer!==null){root.clearInterval(timer);timer=null}});
  root.addEventListener('storage',event=>{
   if(event.key&&/supabase|auth-token|fuse_pending_referral/i.test(event.key))refresh();
  });
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window,document);
