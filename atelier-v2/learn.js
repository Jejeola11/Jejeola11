(() => {
  'use strict';

  const rows=[...document.querySelectorAll('[data-course]')];
  const status=document.getElementById('courseStatus');
  const nameEl=document.getElementById('academyName');
  const bundle=document.getElementById('academyBundle');
  const bundleCopy=document.getElementById('academyBundleCopy');
  const bundleButton=document.getElementById('academyBundleButton');
  const bundlePriceEl=document.getElementById('academyBundlePrice');

  const modal=document.getElementById('courseUnlockModal');
  const modalBackdrop=document.getElementById('courseUnlockBackdrop');
  const modalClose=document.getElementById('courseUnlockClose');
  const modalTitle=document.getElementById('courseUnlockTitle');
  const modalCopy=document.getElementById('courseUnlockCopy');
  const modalPrice=document.getElementById('courseUnlockPrice');
  const modalBalance=document.getElementById('courseUnlockBalance');
  const modalNote=document.getElementById('courseUnlockNote');
  const modalConfirm=document.getElementById('courseUnlockConfirm');
  const modalTopup=document.getElementById('courseUnlockTopup');

  const storedName=(localStorage.getItem('fuse_display_name')||'').trim();
  if(storedName) nameEl.textContent=storedName;

  const range=(prefix,n)=>Array.from({length:n},(_,i)=>prefix+(i+1));
  const required={
    design:range('flyer-m',6),
    video:range('aiv-m',16),
    landing:range('web-m',10).map(k=>k==='web-m3'?'web-m3-current':k),
    money:['money']
  };

  const courseMeta={
    design:{name:'Design & Flyers',credits:115,href:'academy-v2.html?course=design'},
    video:{name:'AI UGC & Influencer',credits:115,href:'academy-v2.html?course=video'},
    landing:{name:'Landing Page Design',credits:80,href:'academy-v2.html?course=landing'},
    money:{name:'Money Engine',credits:80,href:'academy-v2.html?course=money'}
  };

  let currentCredits=0;
  let isFull=false;
  let owned=new Set();
  let activePurchase=null;

  function hasCourseAccess(course){
    if(isFull) return true;
    const keys=required[course]||[];
    return keys.some(k=>owned.has(k)) || (keys.length>0 && keys.every(k=>owned.has(k)));
  }

  function missingCourses(){
    return Object.keys(courseMeta).filter(k=>!hasCourseAccess(k));
  }

  function bundlePrice(){
    const missing=missingCourses();
    const separate=missing.reduce((n,k)=>n+courseMeta[k].credits,0);
    return {missing,separate,price:Math.min(280,separate)};
  }

  function ensureLockLabel(row,course){
    let label=row.querySelector('.academy-lock-label');
    if(!label){
      label=document.createElement('span');
      label.className='academy-lock-label';
      const copy=row.querySelector('.academy-copy');
      const heading=copy&&copy.querySelector('h2');
      if(copy&&heading) copy.insertBefore(label,heading);
    }
    label.textContent='LOCKED · '+courseMeta[course].credits+' CREDITS';
  }

  function removeLockLabel(row){
    row.querySelector('.academy-lock-label')?.remove();
  }

  function renderAccess(){
    rows.forEach(row=>{
      const course=row.dataset.course;
      const meta=courseMeta[course];
      if(!meta) return;
      const allowed=hasCourseAccess(course);
      row.hidden=false;

      if(allowed){
        row.classList.remove('is-locked');
        row.removeAttribute('aria-disabled');
        row.href=meta.href;
        removeLockLabel(row);
        const cta=row.querySelector('.academy-start');
        if(cta) cta.textContent='Start';
      }else{
        row.classList.add('is-locked');
        row.setAttribute('aria-disabled','true');
        row.href='#';
        ensureLockLabel(row,course);
        const cta=row.querySelector('.academy-start');
        if(cta) cta.textContent='Unlock · '+meta.credits+' credits';
      }
    });

    const b=bundlePrice();
    if(b.missing.length>=2){
      bundle.hidden=false;
      bundlePriceEl.textContent=b.price+' credits';
      const names=b.missing.map(k=>courseMeta[k].name);
      const saving=b.separate-b.price;
      bundleCopy.textContent=saving>0
        ? 'Unlock '+names.length+' remaining courses in one purchase and save '+saving+' credits versus unlocking them separately.'
        : 'Unlock '+names.length+' remaining courses together in one purchase.';
    }else{
      bundle.hidden=true;
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
      sb.from('profiles').select('is_admin,credits').eq('id',session.user.id).maybeSingle(),
      sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id)
    ]);
    if(p.error||u.error) throw (p.error||u.error);

    currentCredits=Number(p.data?.credits||0);
    owned=new Set((u.data||[]).map(r=>r.module_key));
    isFull=!!p.data?.is_admin
      || owned.has('atelier-full')
      || owned.has('atelier-empire')
      || owned.has('atelier-starter')
      || owned.has('atelier-creator');

    renderAccess();
    if(!keepStatus) status.textContent='';
  }

  function closeModal(){
    modal.hidden=true;
    document.body.classList.remove('course-unlock-open');
    activePurchase=null;
  }

  function openModal(course){
    let label='';
    let price=0;
    if(course==='all'){
      const b=bundlePrice();
      if(!b.missing.length) return;
      label='All remaining courses';
      price=b.price;
      modalCopy.textContent='Unlock every course still locked on your account in one credit purchase.';
    }else{
      const meta=courseMeta[course];
      if(!meta||hasCourseAccess(course)) return;
      label=meta.name;
      price=meta.credits;
      modalCopy.textContent='Use your Fuse credits to get permanent access to '+meta.name+'.';
    }

    activePurchase={course,label,price};
    modalTitle.textContent=course==='all'?'Unlock all remaining courses':'Unlock '+label;
    modalPrice.textContent=price+' credits';
    modalBalance.textContent=currentCredits.toLocaleString()+' credits';

    const short=Math.max(0,price-currentCredits);
    if(short>0){
      modalNote.textContent='You need '+short+' more credits to unlock this.';
      modalConfirm.disabled=true;
      modalConfirm.textContent='Not enough credits';
      modalTopup.hidden=false;
    }else{
      modalNote.textContent='Credits will be deducted instantly and access will open immediately.';
      modalConfirm.disabled=false;
      modalConfirm.textContent='Unlock for '+price+' credits';
      modalTopup.hidden=true;
    }

    modal.hidden=false;
    document.body.classList.add('course-unlock-open');
  }

  async function purchaseActive(){
    if(!activePurchase||modalConfirm.disabled) return;
    const purchase={...activePurchase};

    modalConfirm.disabled=true;
    modalConfirm.textContent='Unlocking…';
    modalNote.textContent='Securing your course access…';

    try{
      const result=await Fuse.api('course-purchase',{course:purchase.course});
      currentCredits=Number(result.balance||0);

      if(result.status==='insufficient'){
        const need=Math.max(0,Number(result.credits_spent||purchase.price)-currentCredits);
        modalBalance.textContent=currentCredits.toLocaleString()+' credits';
        modalNote.textContent='You need '+need+' more credits to unlock this.';
        modalConfirm.textContent='Not enough credits';
        modalTopup.hidden=false;
        return;
      }

      await loadAccess({keepStatus:true});
      closeModal();

      if(result.status==='already_owned'){
        status.textContent='This course is already unlocked on your account.';
      }else{
        const spent=Number(result.credits_spent||purchase.price);
        status.textContent='Unlocked ✓ '+spent+' credits used · '+currentCredits.toLocaleString()+' credits remaining.';
      }
    }catch(error){
      modalConfirm.disabled=false;
      modalConfirm.textContent='Try again';
      modalNote.textContent=(error&&error.message)||'Could not unlock this course. Please try again.';
    }
  }

  rows.forEach(row=>{
    row.addEventListener('click',event=>{
      const course=row.dataset.course;
      if(row.classList.contains('is-locked')){
        event.preventDefault();
        openModal(course);
      }
    });
  });

  bundleButton?.addEventListener('click',()=>openModal('all'));
  modalConfirm?.addEventListener('click',purchaseActive);
  modalClose?.addEventListener('click',closeModal);
  modalBackdrop?.addEventListener('click',closeModal);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!modal.hidden) closeModal();
  });

  (async()=>{
    try{
      await loadAccess();
    }catch(error){
      rows.forEach(row=>row.hidden=false);
      status.textContent='Could not check course access. Please reload the page.';
    }
  })();
})();
