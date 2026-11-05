(()=>{
  'use strict';
  const feature=document.getElementById('influencerCourseFeature');
  if(!feature)return;
  const like=feature.querySelector('#influencerCourseLike');
  const status=feature.querySelector('#influencerCourseStatus');
  let signedIn=false,liked=false,busy=false,client;
  const pretty=n=>new Intl.NumberFormat('en',{notation:Number(n)>=10000?'compact':'standard',maximumFractionDigits:1}).format(n);
  async function request(body){
    client ||= await Fuse.client();
    const {data}=await client.auth.getSession();
    const token=data?.session?.access_token;
    const response=await fetch('/api/academy-engagement?course=influencer',{
      method:body?'POST':'GET',
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
      ...(body?{body:JSON.stringify({...body,course:'influencer'})}:{}),cache:'no-store'
    });
    const out=await response.json();
    if(!response.ok)throw Error(out.error||'Could not load counts.');
    signedIn=out.signedIn;liked=out.liked;
    like.setAttribute('aria-pressed',String(liked));
    like.setAttribute('aria-label',(liked?'Unlike':'Like')+' AI influencer course, '+out.likes+' likes');
    feature.querySelector('#influencerCourseLikes').textContent=pretty(out.likes);
    feature.querySelector('#influencerCourseViews').textContent=pretty(out.views);
    return out;
  }
  request().catch(()=>{status.textContent='Counts are temporarily unavailable.'});
  like.addEventListener('click',async()=>{
    if(busy)return;
    if(!signedIn){await FuseExplore.requireAccount({reason:'Create your free account to like this course.'});return;}
    busy=true;like.disabled=true;
    try{await request({action:'like',liked:!liked});status.textContent='';}
    catch(e){status.textContent=e.message;}
    finally{busy=false;like.disabled=false;}
  });
  feature.querySelectorAll('a[href*="academy-v2.html?course=video"]').forEach(link=>{
    link.addEventListener('click',async event=>{
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      if(!link.href.includes('academy-v2.html?course=video'))return;
      event.preventDefault();
      const destination=link.href;
      try{await request({action:'view',source:'influencer-course',contentPath:'/atelier-v2/academy-v2.html?course=video'});}
      catch{}
      location.assign(destination);
    });
  });
  window.addEventListener('pageshow',event=>{if(event.persisted)request().catch(()=>{});});
})();
