(() => {
  'use strict';
  const URL='https://rgbweaimkcndjznlazho.supabase.co';
  const KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
  async function start(){
    try{
      if(!window.supabase)throw new Error('Sign-in could not load.');
      const client=window.__fuseClient ||= window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      if(!data.session){location.replace('/atelier-v2/login.html');return;}
      const {data:profile}=await client.from('profiles').select('credits').eq('id',data.session.user.id).maybeSingle();
      document.querySelectorAll('[data-balance]').forEach(el=>el.textContent=`✦ ${Number(profile?.credits||0)} credits`);
    }catch(error){location.replace('/atelier-v2/login.html');}
  }
  window.addEventListener('load',()=>setTimeout(start,120));
})();
