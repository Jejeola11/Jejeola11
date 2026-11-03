(()=>{
  // Record only after the actual tutorial content is visible, including direct links.
  let recorded=false,recording=false,viewTimer;
  async function recordContentView(){
    if(recorded||recording||document.hidden)return;
    recording=true;
    try{
      const client=window.supabase?.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      if(!client)return;
      const {data}=await client.auth.getSession();
      if(document.hidden)return;
      const token=data?.session?.access_token;
      const response=await fetch('/api/academy-engagement',{method:'POST',headers:{'Content-Type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({action:'view',source:'tutorial-content'}),cache:'no-store',keepalive:true});
      if(!response.ok)throw Error('View unavailable');
      recorded=true;
    }catch(_){/* Retry on the next visible visit without interrupting learning. */}
    finally{recording=false;}
  }
  function scheduleView(){clearTimeout(viewTimer);if(!document.hidden&&!recorded)viewTimer=setTimeout(recordContentView,1000);}
  document.addEventListener('visibilitychange',scheduleView);
  window.addEventListener('pageshow',scheduleView);
  scheduleView();

})();