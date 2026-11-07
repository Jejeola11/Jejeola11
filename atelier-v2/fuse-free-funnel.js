(function(){
  'use strict';
  if(window.FuseFreeFunnel)return;
  const KEY='fuse_free_signup_visitor_id';
  const REFKEY='fuse_free_signup_ref';
  const allowed=new Set(['landing_view','signup_clicked','signup_view','signup_started','signup_code_requested','registration_completed','resource_unlocked']);
  let visitorId;
  try{
    visitorId=sessionStorage.getItem(KEY);
    if(!/^[0-9a-f-]{36}$/i.test(visitorId||'')){visitorId=crypto.randomUUID();sessionStorage.setItem(KEY,visitorId);}
  }catch{visitorId=crypto.randomUUID();}
  const params=new URLSearchParams(location.search);
  let ref=params.get('ref')||'';
  if(!ref&&params.get('next'))try{ref=new URL(params.get('next'),location.origin).searchParams.get('ref')||''}catch{}
  if(!/^[a-z0-9-]{5,80}$/i.test(ref))ref='';
  try{if(ref)sessionStorage.setItem(REFKEY,ref.toLowerCase());else ref=sessionStorage.getItem(REFKEY)||''}catch{}
  const utmSource=params.get('utm_source')||'';
  const utmCampaign=params.get('utm_campaign')||'';
  function track(event,token){
    if(!allowed.has(event))return Promise.resolve(false);
    if(event==='signup_clicked')window.FuseFreePixel?.trackClick();
    if(event==='signup_started')window.FuseFreePixel?.trackStart();
    const data={event,visitorId,ref:ref.toLowerCase(),path:location.pathname,utmSource,utmCampaign};
    const headers={'Content-Type':'application/json'};
    if(token)headers.Authorization='Bearer '+token;
    return fetch('/api/free-signup-funnel',{method:'POST',headers,body:JSON.stringify(data),cache:'no-store',keepalive:true})
      .then(async r=>r.ok?await r.json():{ok:false}).catch(()=>({ok:false}));
  }
  window.FuseFreeFunnel=Object.freeze({track,getRef:()=>ref.toLowerCase(),getVisitorId:()=>visitorId});
})();
