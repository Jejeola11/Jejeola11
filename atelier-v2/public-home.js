(() => {
  const signup = document.querySelector('.public-signup');
  const client = window.__fuseClient ||= window.supabase?.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3');
  client?.auth.getSession().then(async ({data}) => {
    if (!data.session || !signup) return;
    signup.hidden = true;
    const user=data.session.user;
    if(user.email && !sessionStorage.getItem('fuse_synced_'+user.id)){
      try{
        const response=await fetch('/api/public-registration-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({name:user.user_metadata?.full_name||user.user_metadata?.name||user.email.split('@')[0],marketingOptIn:false})});
        if(response.ok)sessionStorage.setItem('fuse_synced_'+user.id,'1');
      }catch(_){}
    }
    const next=sessionStorage.getItem('fuse_signup_destination');
    if(next?.startsWith('/atelier-v2/')&&!next.startsWith('//')){sessionStorage.removeItem('fuse_signup_destination');location.replace(next)}
  }).catch(() => {});
  document.querySelectorAll('#accountMenu nav a, .menu-credit a').forEach(a => {
    a.addEventListener('click', async event => {
      if (!client) return;
      const {data} = await client.auth.getSession();
      if (!data.session) {
        event.preventDefault();
        location.href='/signup?next='+encodeURIComponent(new URL(a.href).pathname+new URL(a.href).search+new URL(a.href).hash);
      }
    });
  });
})();
