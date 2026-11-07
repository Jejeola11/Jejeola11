(function(w,d){
 'use strict';
 if(w.FuseFreeTracking)return;
 const pixelId='1865426751496318';
 const landing='/atelier-v2/free-prompts-workflows.html';
 const path=w.location.pathname;
 if(path!==landing&&path!=='/signup')return;
 const params=new URLSearchParams(w.location.search);
 function validRef(value){return typeof value==='string'&&/^[a-z0-9-]{5,80}$/i.test(value)?value.toLowerCase():''}
 function nestedRef(){
  try{const next=params.get('next');if(!next)return '';
   const url=new URL(next,w.location.origin);
   return url.origin===w.location.origin?validRef(url.searchParams.get('ref')):'';
  }catch{return ''}
 }
 let ref=validRef(params.get('ref'))||nestedRef();
 try{
  if(!ref){
   const pending=JSON.parse(w.localStorage.getItem('fuse_pending_referral')||'null');
   ref=validRef(pending?.code);
  }
 }catch{}
 const contextKey='fuse_free_funnel_attribution';
 let context={};
 try{context=JSON.parse(w.sessionStorage.getItem(contextKey)||'{}')||{}}catch{}
 if(!ref)ref=validRef(context.ref);
 const utmSource=(params.get('utm_source')||context.utmSource||'').slice(0,120);
 const utmCampaign=(params.get('utm_campaign')||context.utmCampaign||'').slice(0,120);
 try{w.sessionStorage.setItem(contextKey,JSON.stringify({ref,utmSource,utmCampaign}))}catch{}
 const key='fuse_free_funnel_visitor';
 let visitorId;
 try{
  const existing=JSON.parse(w.localStorage.getItem(key)||'null');
  if(typeof existing?.id==='string'&&/^[0-9a-f-]{36}$/i.test(existing.id)&&
      Date.now()-Number(existing.at)<7*86400000&&Number(existing.at)<=Date.now())visitorId=existing.id;
  if(!visitorId){
   visitorId=w.crypto.randomUUID();
   w.localStorage.setItem(key,JSON.stringify({id:visitorId,at:Date.now()}));
  }
 }catch{visitorId=w.crypto.randomUUID()}
 // Use the site's existing Meta Pixel; never initialize this ID twice on one page.
 if(!w.fbq){
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
 }
 if(!w.__fuseFreePixelInit){w.fbq('init',pixelId);w.__fuseFreePixelInit=true}
 if(!w.__fuseFreePageView){w.fbq('track','PageView');w.__fuseFreePageView=true}
 const sent=new Map();
 function event(type,token){
  if(!['landing_view','signup_clicked','signup_view','signup_started','registration_completed'].includes(type))return Promise.resolve({ok:false});
  if(type!=='registration_completed'&&sent.has(type))return sent.get(type);
  if(type==='signup_clicked')w.fbq?.('trackCustom','FreeSignupClick',{funnel:'free_prompts_workflows'});
  if(type==='signup_started')w.fbq?.('trackCustom','FreeSignupStarted',{funnel:'free_prompts_workflows'});
  const payload={event:type,visitorId,ref,path,utmSource,utmCampaign};
  const headers={'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const task=w.fetch('/api/free-signup-funnel',{
   method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',keepalive:true
  }).then(async response=>response.ok?response.json():{ok:false,recorded:false})
    .catch(()=>({ok:false,recorded:false}));
  if(type!=='registration_completed')sent.set(type,task);
  return task;
 }
 let completionPromise;
 function complete(session){
  if(!session?.access_token)return Promise.resolve(false);
  if(completionPromise)return completionPromise;
  completionPromise=event('registration_completed',session.access_token).then(result=>{
   if(result?.recorded===true){
    w.fbq?.('track','CompleteRegistration',{content_name:'Fuse Atelier Free Prompts & Workflows',status:'complete'});
    return true;
   }
   return false;
  });
  return completionPromise;
 }
 w.FuseFreeTracking=Object.freeze({event,complete,getRef:()=>ref});
 if(path===landing){
  event('landing_view');
  // Capture header signup link inserted later by fuse-shell.js and any
  // other existing signup anchors. Do not change their appearance/behavior.
  d.addEventListener('click',e=>{
   const anchor=e.target?.closest?.('a[href]');
   if(!anchor)return;
   try{const url=new URL(anchor.href,w.location.origin);if(url.origin===w.location.origin&&url.pathname==='/signup')event('signup_clicked');}catch{}
  },true);
 }else{
  event('signup_view');
 }
})(window,document);
