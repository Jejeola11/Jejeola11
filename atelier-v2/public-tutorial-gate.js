(() => {
  'use strict';
  const button=document.getElementById('tutorialSignup');
  const client=window.supabase?.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const current=location.pathname+location.search+location.hash;
  const signup=(next,returnTo=current)=>'/signup?next='+encodeURIComponent(next)+'&return='+encodeURIComponent(returnTo);
  let signedIn=false,ready=false;
  async function refresh(){
    const {data}=await client.auth.getSession();signedIn=!!data.session;
    button.hidden=signedIn;ready=true;
  }
  if(!client){button.href=signup(current);return;}
  refresh().catch(()=>{ready=true});
  client.auth.onAuthStateChange((_event,session)=>{signedIn=!!session;button.hidden=signedIn;ready=true});
  button.href=signup(current);
  document.addEventListener('click',event=>{
    if(signedIn)return;
    const link=event.target.closest('a[href]');if(!link)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin)return;
    if(['studio.html','create.html','page-create.html','clients.html'].includes(url.pathname.split('/').pop())){
      event.preventDefault();location.assign(signup(url.pathname+url.search+url.hash));
    }
  },true);
  setInterval(()=>{
    if(ready&&!signedIn&&!document.hidden)location.assign(signup(current));
  },10000);
})();
