(() => {
  'use strict';

  const rows=[...document.querySelectorAll('[data-course]')];
  const status=document.getElementById('courseStatus');
  const nameEl=document.getElementById('academyName');
  // Only server-owned product IDs are sent to Paystack checkout.
  const checkoutUrls={ebook:'academy-ebook',challenge:'academy-challenge',money:'academy-money',video:'academy-video',influencer:'academy-influencer',landing:'academy-landing',design:'academy-design'};
  const params=new URLSearchParams(location.search);
  const returnTo=FuseCourseFunnel.safeReturn(params.get('return')||(params.has('buy')?'/atelier-v2/free-prompts-workflows.html#course-offer':location.pathname));
  function signupToBuy(course){
    const checkout=FuseCourseFunnel.checkoutURL(course,returnTo,location.search);
    location.assign(FuseCourseFunnel.signupURL(checkout,returnTo,location.search));
  }
  let checkoutBusy=false,pendingCourse=null;
  async function openCheckout(course){
    if(checkoutBusy)return;
    checkoutBusy=true;pendingCourse=course;retry.hidden=true;
    status.textContent='Opening secure Paystack checkout for '+courseMeta[course].name+' · ₦'+courseMeta[course].price.toLocaleString('en-NG')+'…';
    try{
      const out=await Fuse.api('paystack-init',{pack:checkoutUrls[course]});
      const url=new URL(out.authorization_url);
      if(url.protocol!=='https:'||url.hostname!=='checkout.paystack.com')throw Error('Could not open secure Paystack checkout. Please try again.');
      location.assign(url.href);
    }catch(error){
      checkoutBusy=false;
      status.textContent=error.message||'Could not start payment. Please try again.';
      retry.hidden=false;
    }
  }
  const retry=document.createElement('button');
  retry.type='button';retry.className='workflow-button';retry.textContent='Try secure checkout again';retry.hidden=true;
  retry.addEventListener('click',()=>{if(pendingCourse)openCheckout(pendingCourse)});
  status.after(retry);


  // Match Profile: full_name is the editable display name; never use a shared local cache.
  function renderName(user){
    const meta=user?.user_metadata||{};
    const name=meta.full_name||meta.name||user?.email?.split('@')[0]||'there';
    if(nameEl) nameEl.textContent=String(name).trim()||'there';
  }

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
    design:{name:'Design & Flyers',price:9900,href:'academy-v2.html?course=design'},
    video:{name:'AI UGC & Influencer',price:9900,href:'academy-v2.html?course=video'},
    influencer:{name:'Create & Monetize Viral AI Influencers',price:9900,href:'influencer-course.html'},
    landing:{name:'Landing Page Design',price:9900,href:'academy-v2.html?course=landing'},
    money:{name:'Money Engine',price:9900,href:'academy-v2.html?course=money'},
    challenge:{name:'14-Day AI Video Client Challenge',price:9900,href:'academy-v2.html?course=challenge'},
    ebook:{name:'Zero To First 10 Million With AI Video',price:9900,href:'ai-video-book.html'}
  };

  for(const offer of window.FuseAgentCourseOffers||[]){courseMeta[offer.key].price=offer.price;}
  let accessReady=false;
  let guest=false;
  let isFull=false;
  let owned=new Set();
  let isAdmin=false;
  let activeCourseTab='all';
  const tabs=[...document.querySelectorAll('[data-course-tab]')];
  tabs.forEach(tab=>tab.addEventListener('click',()=>{activeCourseTab=tab.dataset.courseTab;tabs.forEach(item=>item.setAttribute('aria-pressed',String(item===tab)));renderAccess();}));

  function hasCourseAccess(course){
    if(course==='challenge') return isAdmin || owned.has('ai-video-client-challenge');
    if(course==='ebook') return isAdmin || owned.has('ai-video-business-guide');
    if(course==='influencer') return isAdmin || owned.has('ai-influencer-course');
    if(isFull) return true;
    const keys=required[course]||[];
    return keys.some(k=>owned.has(k)) || (keys.length>0 && keys.every(k=>owned.has(k)));
  }

  function renderAccess(){
    const influencerFeature=document.getElementById('influencerCourseFeature');
    if(influencerFeature){
      const allowed=hasCourseAccess('influencer');
      influencerFeature.hidden=activeCourseTab==='mine'&&!allowed;
      influencerFeature.dataset.courseAccess=allowed?'unlocked':'locked';
      const button=influencerFeature.querySelector('.tutorial-open-button');
      button.innerHTML=allowed?'Tap Here <span aria-hidden="true">↗</span>':'Unlock For ₦9,900';
      button.setAttribute('aria-label',allowed?'Open AI influencer course':'Unlock AI influencer course for ₦9,900');
    }
    rows.forEach(row=>{
      const course=row.dataset.course;
      const meta=courseMeta[course];
      if(!meta) return;
      const allowed=hasCourseAccess(course);
      row.hidden=activeCourseTab==='mine'&&!allowed;
      row.removeAttribute('aria-disabled');
      row.classList.toggle('is-locked',!allowed);
      row.querySelector('.academy-lock-label')?.remove();
      row.href=guest?'#':allowed?meta.href:'#';
      const cta=row.querySelector('.academy-start');
      if(cta) cta.textContent=guest?'Sign up to unlock':allowed?'Start':'Unlock · ₦'+meta.price.toLocaleString('en-NG');
    });
    // Keep the authored course order; the free Steal My Prompts feature stays first in both tabs.
  }

  async function loadAccess({keepStatus=false}={}){
    const sb=await Fuse.client();
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session){accessReady=true;guest=true;renderAccess();status.textContent='Sign up to get full access to the academy page';return;}

    renderName(session.user);
    // Refresh metadata so edits made on Profile are reflected on the next visit.
    try{
      const {data,error}=await sb.auth.getUser();
      if(!error&&data?.user) renderName(data.user);
    }catch{}
    sb.auth.onAuthStateChange((_event,nextSession)=>renderName(nextSession?.user));

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

    accessReady=true;
    renderAccess();
    if(!keepStatus) status.textContent='';
  }

  const influencerFeature=document.getElementById('influencerCourseFeature');
  if(influencerFeature){
    const button=influencerFeature.querySelector('.tutorial-open-button');
    const cover=influencerFeature.querySelector('.tutorial-cover');
    cover.addEventListener('click',event=>{
      if(influencerFeature.dataset.courseAccess==='unlocked')return;
      event.preventDefault();
      button.classList.remove('unlock-nudge');
      void button.offsetWidth;
      button.classList.add('unlock-nudge');
      document.getElementById('influencerCourseStatus').textContent='Unlock this course for ₦9,900 to start.';
    });
    button.addEventListener('click',async event=>{
      if(influencerFeature.dataset.courseAccess==='unlocked')return;
      event.preventDefault();
      if(!accessReady){document.getElementById('influencerCourseStatus').textContent='Checking your course access. Please try again.';return;}
      if(guest){signupToBuy('influencer');return;}
      await openCheckout('influencer');
    });
  }

  rows.forEach(row=>{
    row.addEventListener('click',async event=>{
      if(!accessReady){event.preventDefault();status.textContent='Connect to the internet and reload to check course access.';return;}
      const course=row.dataset.course;
      if(guest){
        event.preventDefault();
        if(course==='challenge'){location.assign('/challenge');return;}
        signupToBuy(course);
        return;
      }
      if(row.classList.contains('is-locked')){
        event.preventDefault();
        if(course==='challenge'){location.assign('/challenge');return;}
        const pack=checkoutUrls[course];if(!pack)return;
        await openCheckout(course);
      }
    });
  });

  (async()=>{
    try{
      await loadAccess();
      const buy=params.get('buy');
      if(buy&&checkoutUrls[buy]){
        if(guest){signupToBuy(buy);return;}
        if(hasCourseAccess(buy)){location.replace(courseMeta[buy].href);return;}
        await openCheckout(buy);
      }else{
        const purchased=params.get('course');
        if(params.get('payment')==='success'&&courseMeta[purchased]&&hasCourseAccess(purchased))location.replace(courseMeta[purchased].href);
      }
    }catch(error){
      rows.forEach(row=>{
        row.classList.add('is-locked');
        row.removeAttribute('href');
        row.setAttribute('aria-disabled','true');
        const cta=row.querySelector('.academy-start');if(cta)cta.textContent='Connect to check access';
      });
      status.textContent='Could not verify course access. Connect to the internet and reload.';
    }
  })();
})();

