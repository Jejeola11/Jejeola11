(() => {
  'use strict';

  const mobileStyles=document.createElement('link');
  mobileStyles.rel='stylesheet';
  mobileStyles.href='/atelier-v2/mobile-refinement.css?v=teal-1';
  document.head.append(mobileStyles);

  const navStyles=document.createElement('style');
  navStyles.id='fuse-unified-footer-v7';
  navStyles.textContent=`
    :root{--fuse-nav-chrome:linear-gradient(110deg,#FFE66A 0%,#DFFF4E 52%,#EEFFE0 100%)}
    body>.bottom,
    .bottom[aria-label="Fuse navigation"]{display:none!important}
    body .fuse-nav{
      position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:1000!important;
      display:grid!important;grid-template-columns:repeat(5,1fr)!important;align-items:center!important;
      height:calc(82px + env(safe-area-inset-bottom))!important;
      padding:6px max(8px,calc((100vw - 700px)/2)) calc(6px + env(safe-area-inset-bottom))!important;
      background:linear-gradient(105deg,rgba(0,16,18,.99) 0%,rgba(0,25,27,.99) 64%,rgba(27,76,82,.99) 100%)!important;
      border-top:1px solid rgba(49,84,86,.92)!important;
      backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;
    }
    body .fuse-nav a{
      display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
      gap:5px!important;min-width:0!important;height:100%!important;text-decoration:none!important;
      color:#a8b8b7!important;opacity:1!important;font-family:Montserrat,Arial,sans-serif!important;
      font-size:11px!important;font-weight:400!important;line-height:1!important;
    }
    body .fuse-nav svg{
      width:23px!important;height:23px!important;padding:0!important;border-radius:0!important;
      background:transparent!important;color:currentColor!important;box-shadow:none!important;
      fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;
      stroke-linecap:round!important;stroke-linejoin:round!important;
    }
    body .fuse-nav a span{
      color:currentColor!important;background:none!important;-webkit-background-clip:border-box!important;
      background-clip:border-box!important;font-weight:400!important;white-space:nowrap!important;
    }
    body .fuse-nav .nav-create{color:#a8b8b7!important}
    body .fuse-nav .nav-create svg{
      width:52px!important;height:50px!important;padding:12px!important;border-radius:15px!important;
      background:var(--fuse-nav-chrome)!important;color:#001012!important;
      box-shadow:0 7px 18px rgba(223,255,78,.13),inset 0 1px 0 rgba(255,255,255,.7)!important;
      stroke-width:1.8!important;
    }
    body .fuse-nav a[aria-current="page"]:not(.nav-create){color:#DFFF4E!important}
    body .fuse-nav a[aria-current="page"]:not(.nav-create) svg{
      width:23px!important;height:23px!important;padding:0!important;border-radius:0!important;
      background:transparent!important;color:#DFFF4E!important;box-shadow:none!important;
    }
    body .fuse-nav a[aria-current="page"]:not(.nav-create) span,
    body .fuse-nav .nav-create[aria-current="page"] span{
      background:var(--fuse-nav-chrome)!important;-webkit-background-clip:text!important;background-clip:text!important;
      color:transparent!important;font-weight:500!important;
    }
    @media(max-width:430px){
      body .fuse-nav{height:calc(80px + env(safe-area-inset-bottom))!important}
      body .fuse-nav .nav-create svg{width:50px!important;height:48px!important;padding:11px!important;border-radius:14px!important}
    }
  `;
  document.head.append(navStyles);

  const root='/atelier-v2/';
  const paths={
    home:{path:'home.html',label:'Home'},
    academy:{path:'learn.html',label:'Academy'},
    create:{path:'studio.html',label:'Create'},
    client:{path:'clients.html',label:'Client'},
    profile:{path:'profile.html',label:'Profile'}
  };
  const icons={
    client:'M3 7h18v13H3z M8 7V4h8v3 M3 11h18',
    home:'M3 10 12 3 21 10v11h-6v-7H9v7H3z',
    academy:'m2 9 10-5 10 5-10 5z M5 11v7q7 5 14 0v-7',
    create:'M12 4v16 M4 12h16',
    profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-3a8 6 0 0 1 16 0v3'
  };

  document.querySelectorAll('[data-fuse-header]').forEach(el=>{
    el.innerHTML=`<header class="fuse-top"><a class="fuse-brand" href="${root}home.html">FUSE <span>ATELIER</span></a><div class="fuse-account"><a class="fuse-wallet" data-balance href="${root}profile.html">My credits</a><a class="fuse-avatar" aria-label="Open profile" href="${root}profile.html"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 7 0 0 1 16 0v3"/></svg></a></div></header>`;
  });

  document.querySelectorAll('.fuse-nav').forEach(n=>n.remove());
  const nav=document.createElement('nav');
  nav.className='fuse-nav';
  nav.setAttribute('aria-label','Main navigation');
  const currentFile=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const matchedKey=Object.entries(paths).find(([,item])=>currentFile===item.path.toLowerCase())?.[0]||null;
  nav.innerHTML=Object.entries(paths).map(([key,item])=>{
    const active=matchedKey?key===matchedKey:document.body.dataset.page===key;
    return `<a class="nav-${key}" ${active?'aria-current="page"':''} href="${root+item.path}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[key]}"/></svg><span>${item.label}</span></a>`;
  }).join('');
  document.body.append(nav);

  const videos=[...document.querySelectorAll('video[data-preview]')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const visible=new Set();
  function update(){
    const allowed=!reduce.matches&&!navigator.connection?.saveData&&!document.hidden;
    visible.forEach(v=>{
      if(allowed){
        if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.load()}
        v.muted=true;v.play().catch(()=>{});
      }else v.pause();
    });
  }
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting)visible.add(e.target);else{visible.delete(e.target);e.target.pause()}});
      update();
    },{threshold:.35});
    videos.forEach(v=>{v.muted=true;v.loop=true;v.playsInline=true;v.preload='metadata';observer.observe(v)});
  }
  document.addEventListener('visibilitychange',update);
  reduce.addEventListener?.('change',update);

  window.Fuse={
    root,
    async client(){
      if(!window.supabase)throw Error('Sign-in could not load. Please reload.');
      return window.__fuseClient ||= window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3');
    },
    async session(){
      const sb=await this.client();
      const{data,error}=await sb.auth.getSession();
      if(error)throw error;
      if(!data.session)throw Error('Please sign in from Home first.');
      return data.session;
    },
    async api(path,body){
      const session=await this.session();
      const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000)});
      let data;try{data=await response.json()}catch{throw Error('The server did not respond correctly. Please try again.')}
      if(!response.ok)throw Error(data.error||'Request failed.');
      return data;
    },
    async balance(){
      const sb=await this.client();
      const session=await this.session();
      const{data,error}=await sb.from('profiles').select('credits').eq('id',session.user.id).single();
      if(error)throw error;
      document.querySelectorAll('[data-balance]').forEach(el=>el.textContent=`${data.credits} credits`);
      return data.credits;
    }
  };
  if(window.supabase)Fuse.balance().catch(()=>{});
})();