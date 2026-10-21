(() => {
  'use strict';

  const rows=[...document.querySelectorAll('[data-course]')];
  const status=document.getElementById('courseStatus');
  const nameEl=document.getElementById('academyName');
  // Fill these with the individual Nestuge checkout URLs once Ria provides them.
  const checkoutUrls={
    ebook:'https://nestuge.com/zero-to-10million',
    challenge:'https://nestuge.com/challenge_academy_offer',
    money:'https://nestuge.com/academy_money_engine',
    video:'', // Awaiting the AI UGC checkout URL; the supplied URL is for Landing Page Design.
    landing:'https://nestuge.com/academy_landing_page',
    design:'https://nestuge.com/academy_campain_flyer'
  };

  const storedName=(localStorage.getItem('fuse_display_name')||'').trim();
  if(storedName) nameEl.textContent=storedName;

  const range=(prefix,n)=>Array.from({length:n},(_,i)=>prefix+(i+1));
  const required={
    design:range('flyer-m',6),
    video:range('aiv-m',16),
    landing:range('web-m',10).map(k=>k==='web-m3'?'web-m3-current':k),
    money:['money'],
    challenge:['ai-video-client-challenge'],
    ebook:['ai-video-business-guide']
  };

  const courseMeta={
    design:{name:'Design & Flyers',price:4900,href:'academy-v2.html?course=design'},
    video:{name:'AI UGC & Influencer',price:4900,href:'academy-v2.html?course=video'},
    landing:{name:'Landing Page Design',price:4900,href:'academy-v2.html?course=landing'},
    money:{name:'Money Engine',price:4900,href:'academy-v2.html?course=money'},
    challenge:{name:'14-Day AI Video Client Challenge',price:15000,href:'academy-v2.html?course=challenge'},
    ebook:{name:'Zero To First 10 Million With AI Video',price:4900,href:'ai-video-book-home.html'}
  };

  let isFull=false;
  let owned=new Set();
  let isAdmin=false;

  function hasCourseAccess(course){
    if(course==='challenge') return isAdmin || owned.has('ai-video-client-challenge');
    if(course==='ebook') return isAdmin || owned.has('ai-video-business-guide');
    if(isFull) return true;
    const keys=required[course]||[];
    return keys.some(k=>owned.has(k)) || (keys.length>0 && keys.every(k=>owned.has(k)));
  }

  function renderAccess(){
    rows.forEach(row=>{
      const course=row.dataset.course;
      const meta=courseMeta[course];
      if(!meta) return;
      const allowed=hasCourseAccess(course);
      row.hidden=false;
      row.classList.toggle('is-locked',!allowed);
      row.querySelector('.academy-lock-label')?.remove();
      row.href=allowed?meta.href:(checkoutUrls[course]||'#');
      const cta=row.querySelector('.academy-start');
      if(cta) cta.textContent=allowed?'Start':'Unlock · ₦'+(course==='challenge'?'15,000':'4900');
    });
    const list=document.querySelector('.academy-cards');
    if(list){
      // Moving existing nodes keeps their click handlers and their original order within each group.
      rows.filter(row=>hasCourseAccess(row.dataset.course)).forEach(row=>list.appendChild(row));
      rows.filter(row=>!hasCourseAccess(row.dataset.course)).forEach(row=>list.appendChild(row));
    }
  }

  async function loadAccess({keepStatus=false}={}){
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

    isAdmin=!!p.data?.is_admin;
    owned=new Set((u.data||[]).map(r=>r.module_key));
    isFull=!!p.data?.is_admin
      || owned.has('atelier-full')
      || owned.has('atelier-empire')
      || owned.has('atelier-starter')
      || owned.has('atelier-creator');

    renderAccess();
    if(!keepStatus) status.textContent='';
  }

  rows.forEach(row=>{
    row.addEventListener('click',event=>{
      const course=row.dataset.course;
      if(row.classList.contains('is-locked')&&!checkoutUrls[course]){
        event.preventDefault();
        status.textContent='Checkout for '+courseMeta[course].name+' is being added. Please check back shortly.';
        status.scrollIntoView({block:'nearest',behavior:'smooth'});
      }
    });
  });

  (async()=>{
    try{
      await loadAccess();
    }catch(error){
      rows.forEach(row=>{
        row.classList.add('is-locked');
        row.removeAttribute('href');
      });
      status.textContent='Could not check course access. Please reload the page.';
    }
  })();
})();
