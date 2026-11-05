(()=>{'use strict';
 const paths=new Set(['/atelier-v2/free-prompts-workflows.html','/atelier-v2/ocean-eyes-halloween.html','/atelier-v2/free-ai-tutorial.html','/atelier-v2/realistic-images.html']);
 const contentPath=location.pathname;if(!paths.has(contentPath))return;
 let viewId;try{viewId=sessionStorage.getItem('fuse-tutorial-view-session');if(!/^[0-9a-f-]{36}$/i.test(viewId||'')){viewId=crypto.randomUUID();sessionStorage.setItem('fuse-tutorial-view-session',viewId);}}catch{viewId=crypto.randomUUID();}
 const marker='fuse-tutorial-seen:'+contentPath;
 let recorded=false,recording=false,timer,retries=0;
 try{recorded=sessionStorage.getItem(marker)===viewId;}catch{}
 async function record(){
  if(recorded||recording||document.hidden)return;recording=true;
  try{
   const response=await fetch('/api/academy-engagement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'view',source:'tutorial-content',contentPath,viewId}),cache:'no-store',keepalive:true});
   if(!response.ok)throw Error('View unavailable');
   recorded=true;try{sessionStorage.setItem(marker,viewId);}catch{}
  }catch{if(retries++<2)timer=setTimeout(record,3000);}
  finally{recording=false;}
 }
 function schedule(){clearTimeout(timer);if(!document.hidden&&!recorded)timer=setTimeout(record,1000);}
 document.addEventListener('visibilitychange',schedule);window.addEventListener('pageshow',schedule);schedule();
})();