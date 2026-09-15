(() => {
  'use strict';
  const rows=[...document.querySelectorAll('[data-course]')];
  const status=document.getElementById('courseStatus');
  const nameEl=document.getElementById('academyName');
  const storedName=(localStorage.getItem('fuse_display_name')||'').trim();
  if(storedName) nameEl.textContent=storedName;

  const range=(prefix,n)=>Array.from({length:n},(_,i)=>prefix+(i+1));
  const required={
    design:range('flyer-m',6),
    video:range('aiv-m',16),
    landing:range('web-m',10).map(k=>k==='web-m3'?'web-m3-current':k),
    money:['money']
  };

  (async()=>{
    try{
      const sb=await Fuse.client();
      const session=await Fuse.session();
      if(!storedName){
        const meta=session.user?.user_metadata||{};
        const fallback=(meta.name||meta.full_name||session.user?.email?.split('@')[0]||'there').trim();
        nameEl.textContent=fallback;
      }
      const [p,u]=await Promise.all([
        sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle(),
        sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id)
      ]);
      if(p.error||u.error) throw (p.error||u.error);
      const owned=new Set((u.data||[]).map(r=>r.module_key));
      const full=p.data?.is_admin||owned.has('atelier-full')||owned.has('atelier-empire');
      const bundle=owned.has('atelier-starter')||owned.has('atelier-creator');
      let visible=0;
      rows.forEach(row=>{
        const keys=required[row.dataset.course]||[];
        const hasAccess=full||bundle||keys.some(k=>owned.has(k))||keys.every(k=>owned.has(k));
        row.hidden=!hasAccess;
        if(hasAccess) visible++;
      });
      status.textContent=visible?'':'No courses are unlocked on this account yet.';
    }catch(error){
      rows.forEach(row=>row.hidden=false);
      status.textContent='';
    }
  })();
})();
