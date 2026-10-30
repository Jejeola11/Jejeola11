(() => {
  'use strict';

  if(['/atelier-v2/create.html','/atelier-v2/studio.html','/atelier-v2/clients.html','/atelier-v2/earn.html','/atelier-v2/profile.html','/atelier-v2/home.html'].includes(location.pathname)){document.documentElement.style.setProperty('background','#00090b','important');document.addEventListener('DOMContentLoaded',()=>document.body.style.setProperty('background','linear-gradient(145deg,#000709 0%,#001012 65%,#00191b 100%) fixed','important'));}
  const darkStyles=document.createElement('style');
  darkStyles.textContent='html:has(body[data-page="home"]),html:has(body[data-page="create"]),html:has(body[data-page="clients"]),html:has(body[data-page="earn"]),html:has(body[data-page="profile"]){background:#00090b!important}body[data-page="home"],body[data-page="create"],body[data-page="clients"],body[data-page="earn"],body[data-page="profile"],body[data-page="studio"],body[data-page="client"]{background:linear-gradient(145deg,#000709 0%,#001012 65%,#00191b 100%) fixed!important;min-height:100svh}';
  document.head.append(darkStyles);
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
      width:18px!important;height:18px!important;padding:0!important;border-radius:0!important;
      background:transparent!important;color:currentColor!important;box-shadow:none!important;
      fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;
      stroke-linecap:round!important;stroke-linejoin:round!important;
    }
    body .fuse-nav a span{
      color:currentColor!important;background:none!important;-webkit-background-clip:border-box!important;
      background-clip:border-box!important;font-weight:400!important;white-space:nowrap!important;
    }
    body .fuse-nav a.nav-create{color:#a8b8b7!important}
    body .fuse-nav a.nav-create svg{
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
    body .fuse-nav a.nav-create[aria-current="page"] span{
      background:var(--fuse-nav-chrome)!important;-webkit-background-clip:text!important;background-clip:text!important;
      color:transparent!important;font-weight:500!important;
    }
    @media(max-width:430px){
      body .fuse-nav{height:calc(80px + env(safe-area-inset-bottom))!important}
      body .fuse-nav a.nav-create svg{width:50px!important;height:48px!important;padding:11px!important;border-radius:14px!important}
    }
    body .fuse-program-top{
      height:72px!important;min-height:72px!important;padding:9px 28px!important;
      background:#001012!important;border-bottom:1px solid rgba(49,84,86,.45)!important;
      position:relative!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
    }
    body .fuse-program-top .program-logo{display:grid!important;place-items:center!important;width:50px!important;height:50px!important;border-radius:14px!important;overflow:hidden!important}
    body .fuse-program-top .program-logo img{display:block!important;width:50px!important;height:50px!important;object-fit:cover!important}
    body .fuse-program-top .program-actions{display:flex!important;align-items:center!important;gap:18px!important;height:100%!important}
    body .fuse-program-top .program-instagram{display:grid!important;place-items:center!important;width:34px!important;height:38px!important;color:#f2fffb!important}
    body .fuse-program-top .program-instagram svg{width:32px!important;height:32px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important}
    body .fuse-program-top .program-pricing{position:relative!important;display:flex!important;align-items:center!important;gap:12px!important;height:44px!important;padding:0 17px!important;border-radius:13px!important;background:linear-gradient(145deg,#092c2e,#062125)!important;border:1px solid rgba(49,84,86,.36)!important;color:#f4faf9!important;font-size:18px!important;font-weight:500!important}
    body .fuse-program-top .program-pricing svg{width:21px!important;height:21px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important}
    body .fuse-program-top .program-pricing small{position:absolute!important;left:50%!important;bottom:-15px!important;transform:translateX(-50%)!important;padding:4px 13px!important;border-radius:10px!important;background:linear-gradient(110deg,#FFE66A,#DFFF4E,#EEFFE0)!important;color:#001012!important;font-size:10px!important;font-weight:700!important;white-space:nowrap!important}
    body .fuse-program-top .program-close{width:32px!important;height:36px!important;border:0!important;background:transparent!important;color:#f4faf9!important;font-size:32px!important;font-weight:300!important;line-height:1!important;padding:0!important}
    @media(max-width:560px){
      body .fuse-program-top{height:64px!important;min-height:64px!important;padding:8px 20px!important}
      body .fuse-program-top .program-logo,body .fuse-program-top .program-logo img{width:44px!important;height:44px!important;border-radius:12px!important}
      body .fuse-program-top .program-actions{gap:18px!important}
      body .fuse-program-top .program-instagram{width:30px!important}
      body .fuse-program-top .program-instagram svg{width:28px!important;height:28px!important}
      body .fuse-program-top .program-pricing{height:38px!important;padding:0 12px!important;gap:6px!important;border-radius:11px!important;font-size:16px!important}
      body .fuse-program-top .program-pricing svg{width:23px!important;height:23px!important}
      body .fuse-program-top .program-pricing small{bottom:-10px!important;padding:2px 7px!important;font-size:9px!important;border-radius:6px!important}
      body .fuse-program-top .program-close{width:28px!important;height:34px!important;font-size:30px!important}
    }
  `;
  document.head.append(navStyles);

  const root='/atelier-v2/';
  const currentFile=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const paths={
    home:{path:'home.html',label:'Home'},
    academy:{path:'learn.html',label:'Academy'},
    create:{path:'studio.html',label:'Create'},
    client:{path:'clients.html',label:'Client'},
    earn:{path:'earn.html',label:'Earn'}
  };
  const icons={
    client:'M3 7h18v13H3z M8 7V4h8v3 M3 11h18',
    home:'M3 10 12 3 21 10v11h-6v-7H9v7H3z',
    academy:'m2 9 10-5 10 5-10 5z M5 11v7q7 5 14 0v-7',
    create:'M12 4v16 M4 12h16',
    earn:'M4 20h16 M5 17l4-5 3 3 6-8 M16 7h2v2'
  };

  const programHeader = ['earn.html','affiliate-dashboard.html','creator-submit.html','creator-admin.html','profile.html'].includes(currentFile);
  document.querySelectorAll('[data-fuse-header]').forEach(el=>{
    if(programHeader){
      el.innerHTML=`<header class="fuse-top fuse-program-top">
        <a class="program-logo" href="${root}home.html" aria-label="Fuse Atelier home"><img src="/atelier-v2/media/fuse-mark-palette.webp" alt="Fuse Atelier"></a>
        <div class="program-actions">
          <a class="program-instagram" href="https://www.tiktok.com/@director_ria" target="_blank" rel="noopener noreferrer" aria-label="Director Ria on TikTok">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v12a5 5 0 1 1-4-4.9V14a2 2 0 1 0 1 1V3h3c.4 2.4 2.1 4 5 4.4V10a9 9 0 0 1-5-2"/></svg>
          </a>
          <a class="program-pricing" href="/credits" aria-label="Open pricing">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 12 9-9h7l2 2v7l-9 9z"/><circle cx="16.5" cy="7.5" r="1"/></svg><span>Pricing</span><small>23% OFF</small>
          </a>
          <button class="program-close" type="button" aria-label="Go back">×</button>
        </div>
      </header>`;
      el.querySelector('.program-close').addEventListener('click',()=>{ if(currentFile==='affiliate-dashboard.html') location.href=root+'home.html'; else if(currentFile==='creator-submit.html') location.href=root+'affiliate-dashboard.html'; else if(history.length>1) history.back(); else location.href=root+'home.html'; });
    }else{
      el.innerHTML=`<header class="fuse-top"><a class="fuse-brand" href="${root}home.html">FUSE <span>ATELIER</span></a><div class="fuse-account"><a class="fuse-wallet" data-balance href="${root}profile.html">My credits</a><a class="fuse-avatar" aria-label="Open profile" href="${root}profile.html"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 7 0 0 1 16 0v3"/></svg></a></div></header>`;
    }
  });

  document.querySelectorAll('.fuse-nav').forEach(n=>n.remove());
  const nav=document.createElement('nav');
  nav.className='fuse-nav';
  nav.setAttribute('aria-label','Main navigation');
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
      const client=await this.client();
      const session=await this.session();
      const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,apikey:client.supabaseKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000)});
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
  if(currentFile==='page-workspace.html'){
    const pageControls=document.createElement('script');
    pageControls.src='/atelier-v2/page-workspace-controls.js?v=design-v3';
    pageControls.async=false;
    document.body.append(pageControls);
  }

  if(['studio.html','learn.html','earn.html','clients.html'].includes(currentFile)){
    const old=document.querySelector('.academy-top,.reference-header,[data-fuse-header],.fuse-top');
    document.getElementById('accountMenu')?.remove();document.getElementById('menuShade')?.remove();
    const wrap=document.createElement('div');wrap.className='reference-home shared-home-header';wrap.innerHTML="<header class=\"reference-header\"><a class=\"logo-link\" href=\"home.html\" aria-label=\"Fuse Atelier home\"><img src=\"media/fuse-mark-palette.webp\" width=\"40\" height=\"40\" alt=\"Fuse Atelier\"></a><div class=\"header-actions\"><a class=\"instagram-link\" href=\"https://www.tiktok.com/@director_ria\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Director Ria on TikTok\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14 3v12a5 5 0 1 1-4-4.9V14a2 2 0 1 0 1 1V3h3c.4 2.4 2.1 4 5 4.4V10a9 9 0 0 1-5-2\"/></svg></a><a class=\"pricing-link\" href=\"/credits\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m3 12 9-9h7l2 2v7l-9 9z\"/><circle cx=\"16.5\" cy=\"7.5\" r=\"1\"/></svg><span>Pricing</span><small>FROM ₦1,000</small></a><button class=\"menu-toggle\" id=\"menuToggle\" aria-label=\"Open account menu\" aria-controls=\"accountMenu\" aria-expanded=\"false\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 5h18M3 12h18M3 19h18\"/></svg></button></div></header>\n<div id=\"menuShade\" hidden></div><section id=\"accountMenu\" class=\"account-menu\" aria-label=\"Account menu\" hidden><div class=\"menu-identity\"><img src=\"media/fuse-mark-palette.webp\" width=\"38\" height=\"38\" alt=\"\"><div><strong id=\"menuName\">Your account</strong><p id=\"menuCourses\">Loading courses…</p></div></div><div class=\"menu-credit\"><div><strong>Credits</strong><span id=\"menuCredits\">—</span></div><a href=\"profile.html#topups\">Top up ↗</a></div><nav aria-label=\"Account links\"><a href=\"profile.html\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-2a8 6 0 0 1 16 0v2\"/></svg>View profile <span>›</span></a><a href=\"library.html\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 5h7l2 3h9v13H3z\"/></svg>Library <span>›</span></a><a href=\"earn.html\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20h16 M5 17l4-5 3 3 6-8 M16 7h2v2\"/></svg>Fuse Earn<span>›</span></a><a href=\"create.html\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3v18M3 12h18\"/></svg>Fuse Create <span>›</span></a></nav><p id=\"menuStatus\" role=\"status\"></p></section>\n";

    const critical=document.createElement('style');critical.textContent=`
.shared-home-header{background:transparent!important;min-height:0!important;color:#fff}
.shared-home-header [hidden]{display:none!important}
.shared-home-header .reference-header{display:flex;align-items:center;justify-content:space-between;width:min(900px,calc(100% - 32px));height:66px;margin:auto;position:relative;z-index:40}
.shared-home-header .logo-link{display:flex;align-items:center}
.shared-home-header .logo-link img{width:36px;height:36px;object-fit:contain}
.shared-home-header .header-actions{display:flex;align-items:center;gap:14px}
.shared-home-header .header-actions svg{width:24px;height:24px;flex:none}
.shared-home-header .instagram-link,.shared-home-header .menu-toggle{display:grid;place-items:center;min-width:32px;min-height:44px}
.shared-home-header .menu-toggle{background:none;border:0;color:#fff;padding:0}
.shared-home-header .pricing-link{display:flex;align-items:center;gap:7px;position:relative;padding:8px 12px;border-radius:12px;background:linear-gradient(145deg,#092c2e,#062125);color:#fff;text-decoration:none;font-size:18px}
.shared-home-header .pricing-link small{position:absolute;left:50%;bottom:-10px;transform:translateX(-50%);white-space:nowrap;padding:2px 7px;border-radius:6px;background:linear-gradient(110deg,#FFE66A,#DFFF4E,#EEFFE0);color:#001012;font-size:10px;font-weight:700}
.shared-home-header .account-menu svg{width:17px;height:17px;flex:none}
`;document.head.append(critical);
    if(old)old.replaceWith(wrap);else document.body.prepend(wrap);
    for(const file of ['home-reference.css?v=hero-user-art-3','home-polish.css?v=compact-menu-9']){const l=document.createElement('link');l.rel='stylesheet';l.href=root+file;document.head.append(l)}
    const st=document.createElement('style');st.textContent='.shared-home-header{background:transparent!important;min-height:0!important}.shared-home-header .reference-header{width:min(900px,calc(100% - 32px));height:66px}.shared-home-header .account-menu{top:74px}';document.head.append(st);
    const menu=wrap.querySelector('#accountMenu'),toggle=wrap.querySelector('#menuToggle'),shade=wrap.querySelector('#menuShade');
    const open=async value=>{menu.hidden=!value;shade.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value){menu.style.top=(toggle.getBoundingClientRect().bottom+scrollY+8)+'px';try{const sb=await Fuse.client(),s=await Fuse.session();const {data}=await sb.from('profiles').select('credits').eq('id',s.user.id).maybeSingle();wrap.querySelector('#menuName').textContent=s.user.user_metadata?.full_name||s.user.email?.split('@')[0]||'Fuse creator';wrap.querySelector('#menuCourses').textContent='Your Fuse account';wrap.querySelector('#menuCredits').textContent=(data?.credits??0)+' left'}catch{wrap.querySelector('#menuCourses').textContent='Sign in to your account'}}};
    toggle.onclick=()=>open(menu.hidden);shade.onclick=()=>open(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
  }

  if(window.supabase)Fuse.balance().catch(()=>{});

  (async function keepPlaybookOnlyAccountsInThePlaybook(){
    try{
      const session=await Fuse.session();
      const email=String(session.user.email||'').trim().toLowerCase();
      if(email==='riadigitals0@gmail.com')return;
      const sb=await Fuse.client();
      const {data:unlocks,error}=await sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id);
      if(error)return;
      const keys=new Set((unlocks||[]).map(row=>row.module_key));
      const playbookOnly=keys.size===1&&keys.has('first-client-playbook');
      if(playbookOnly)location.replace('/playbook');
    }catch{}
  })();
  async function publicSignupGate(){
    const sb=await Fuse.client().catch(()=>null);
    if(!sb)return;
    const {data}=await sb.auth.getSession().catch(()=>({data:{}}));
    if(data?.session){document.querySelectorAll('.public-signup').forEach(anchor=>anchor.hidden=true);return;}
    const protectedPages=new Set(['studio.html','create.html','page-create.html','clients.html','earn.html','page-workspace.html']);
    if(protectedPages.has(currentFile)){
      location.replace('/signup?next='+encodeURIComponent(location.pathname+location.search+location.hash));return;
    }
    document.querySelectorAll('.public-signup').forEach(anchor=>anchor.hidden=false);
     if(!document.querySelector('.public-signup')){
      const anchor=document.createElement('a');anchor.className='public-signup';anchor.textContent='Sign up';anchor.href='/signup?next='+encodeURIComponent(location.pathname+location.search+location.hash);
      const target=document.querySelector('.reference-header .header-actions,.academy-top,.course-top,.create-top,[data-fuse-header] header,.top');
      if(target?.querySelector('#menuToggle'))target.insertBefore(anchor,target.querySelector('#menuToggle'));else (target||document.body).append(anchor);
      if(!target)anchor.classList.add('public-signup-floating');
    }
    document.addEventListener('click',event=>{
      const anchor=event.target.closest('a[href]');if(!anchor)return;
      const url=new URL(anchor.href,location.href);
      if(url.origin!==location.origin||!protectedPages.has(url.pathname.split('/').pop()))return;
      event.preventDefault();location.assign('/signup?next='+encodeURIComponent(url.pathname+url.search+url.hash));
    },true);
  }
  const signupStyle=document.createElement('style');signupStyle.textContent='.public-signup{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 13px;border-radius:12px;background:linear-gradient(110deg,#FFE66A,#DFFF4E,#EEFFE0);color:#001012!important;font:700 13px Montserrat,Arial,sans-serif;text-decoration:none;white-space:nowrap;position:relative;z-index:20}.public-signup[hidden]{display:none!important}.public-signup-floating{position:fixed;right:12px;top:12px;z-index:9999}';document.head.append(signupStyle);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',publicSignupGate,{once:true});else publicSignupGate();
})();
