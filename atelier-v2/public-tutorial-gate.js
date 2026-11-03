(() => {
  'use strict';
  const button=document.getElementById('tutorialSignup');
  const client=window.supabase?.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const current=location.pathname+location.search+location.hash;
  const signup=(next,returnTo=current)=>'/signup?next='+encodeURIComponent(next)+'&return='+encodeURIComponent(returnTo);
  const code=(new URLSearchParams(location.search).get('ref')||'').toLowerCase();
  const referralReady=(async()=>{
    if(!/^[a-z0-9-]{5,80}$/.test(code))return;
    try{
      const response=await fetch('/api/fuse-earn?ref='+encodeURIComponent(code),{cache:'no-store'});
      const data=await response.json();
      if(response.ok&&data.token)localStorage.setItem('fuse_pending_referral',JSON.stringify({code,token:data.token}));
    }catch(_){}
  })();
  const row=document.getElementById('tutorialReferralRow'),input=document.getElementById('tutorialReferralLink'),copy=document.getElementById('tutorialReferralCopy'),status=document.getElementById('tutorialReferralStatus'),signIn=document.getElementById('tutorialReferralSignIn');
  let requestedToken;
  async function showReferral(session){
    if(!row)return;
    if(!session){requestedToken=null;row.hidden=true;signIn.hidden=false;status.textContent='';return;}
    if(requestedToken===session.access_token)return;
    const token=requestedToken=session.access_token;
    signIn.hidden=true;status.textContent='Getting your personal link…';
    try{
      const r=await fetch('/api/fuse-earn',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const data=await r.json();
      if(requestedToken!==token)return;
      if(!r.ok||!data.code)throw Error();
      const link=new URL(location.pathname,location.origin);link.searchParams.set('ref',data.code);
      input.value=link.href;row.hidden=false;status.textContent='';
    }catch(_){if(requestedToken===token)status.textContent='Could not load your link. Refresh the page to try again.';}
  }
  if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);status.textContent='Link copied.';}catch(_){input.select();status.textContent='Select and copy your link.';}};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelectorAll('.showcase-set video').forEach(v=>{v.removeAttribute('autoplay');v.pause();v.controls=true;});
  let signedIn=false,ready=false;
  async function refresh(){
    const {data}=await client.auth.getSession();signedIn=!!data.session;
    button.hidden=signedIn;ready=true;showReferral(data.session);
  }
  if(!client){button.href=signup(current);return;}
  refresh().catch(()=>{ready=true});
  client.auth.onAuthStateChange((_event,session)=>{signedIn=!!session;button.hidden=signedIn;ready=true;setTimeout(()=>showReferral(session),0)});
  button.href=signup(current);
  if(signIn)signIn.href=signup(location.pathname+'#page-6');
  for(const link of [button,signIn].filter(Boolean))link.addEventListener('click',event=>{if(code){event.preventDefault();referralReady.then(()=>location.assign(link.href));}});
  document.addEventListener('click',event=>{
    if(signedIn)return;
    const link=event.target.closest('a[href]');if(!link)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin)return;
    if(['studio.html','create.html','page-create.html','clients.html'].includes(url.pathname.split('/').pop())){
      event.preventDefault();referralReady.then(()=>location.assign(signup(url.pathname+url.search+url.hash)));
    }
  },true);
  setInterval(()=>{
    if(ready&&!signedIn&&!document.hidden)referralReady.then(()=>{if(!signedIn)location.assign(signup(current));});
  },10000);
})();
