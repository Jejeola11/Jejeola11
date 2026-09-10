(() => {
  'use strict';
  const mobileStyles=document.createElement('link');
  mobileStyles.rel='stylesheet';mobileStyles.href='/atelier-v2/mobile-refinement.css?v=teal-1';document.head.append(mobileStyles);
  const root='/atelier-v2/';
  const paths={home:'home.html',academy:'learn.html',create:'studio.html',community:'community.html',profile:'profile.html'};
  const icons={home:'M3 10 12 3 21 10v11h-6v-7H9v7H3z',academy:'m2 9 10-5 10 5-10 5z M5 11v7q7 5 14 0v-7',create:'M12 4v16 M4 12h16',community:'M21 11a9 8 0 0 1-9 8H5l-3 3V11a9 8 0 0 1 19 0z',profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 22v-3a8 6 0 0 1 16 0v3'};
  document.querySelectorAll('[data-fuse-header]').forEach(el=>{el.innerHTML=`<header class="fuse-top"><a class="fuse-brand" href="${root}home.html">FUSE <span>ATELIER</span></a><div class="fuse-account"><a class="fuse-wallet" data-balance href="${root}profile.html">My credits</a><a class="fuse-avatar" aria-label="Open profile" href="${root}profile.html"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 7 0 0 1 16 0v3"/></svg></a></div></header>`});
  const nav=document.createElement('nav');nav.className='fuse-nav';nav.setAttribute('aria-label','Main navigation');
  nav.innerHTML=Object.entries(paths).map(([key,path])=>`<a class="nav-${key}" ${document.body.dataset.page===key?'aria-current="page"':''} href="${root+path}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[key]}"/></svg><span>${key[0].toUpperCase()+key.slice(1)}</span></a>`).join('');document.body.append(nav);
  const videos=[...document.querySelectorAll('video[data-preview]')];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const visible=new Set();
  function update(){const allowed=!reduce.matches&&!navigator.connection?.saveData&&!document.hidden;visible.forEach(v=>{if(allowed){if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.load()}v.muted=true;v.play().catch(()=>{v.controls=true})}else v.pause()})}
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visible.add(e.target);else{visible.delete(e.target);e.target.pause()}});update()},{threshold:.4});videos.forEach(v=>{v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';observer.observe(v)})}
  document.addEventListener('visibilitychange',update);reduce.addEventListener('change',update);
  window.Fuse={root,async client(){if(!window.supabase)throw Error('Sign-in could not load. Please reload.');return window.__fuseClient ||= window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3')},async session(){const sb=await this.client();const{data,error}=await sb.auth.getSession();if(error)throw error;if(!data.session)throw Error('Please sign in from Home first.');return data.session},async api(path,body){const session=await this.session();const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(55000)});let data;try{data=await response.json()}catch{throw Error('The server did not respond correctly. Please try again.')}if(!response.ok)throw Error(data.error||'Request failed.');return data},async balance(){const sb=await this.client();const session=await this.session();const{data,error}=await sb.from('profiles').select('credits').eq('id',session.user.id).single();if(error)throw error;document.querySelectorAll('[data-balance]').forEach(el=>el.textContent=`${data.credits} credits`);return data.credits}};
  if(window.supabase)Fuse.balance().catch(()=>{});
})();
