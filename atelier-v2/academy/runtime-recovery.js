(()=>{
  if(window.__FUSE_ACADEMY_RECOVERY_LOADED__) return;
  window.__FUSE_ACADEMY_RECOVERY_LOADED__=true;

  const PROGRESS_KEY='fuse-academy-progress-v1';
  const META={
    design:{title:'Design & Flyers',desc:'Master the design foundations, working flyer anatomy, client workflow and practice briefs.',asset:'/atelier-v2/media/luxury-bag.svg',sell:'Sell as: Flyer & campaign design'},
    video:{title:'AI UGC & Influencer',desc:'Build AI UGC and product video skills you can package for brands without a traditional shoot.',asset:'/atelier-v2/media/burger-ugc.svg',sell:'Sell as: AI UGC & brand content'},
    landing:{title:'Landing Page Design',desc:'Learn the landing-page workflow from niche and brief to build, deployment and selling the service.',asset:'/atelier-v2/media/beauty-snake.svg',sell:'Sell as: Landing page design'},
    money:{title:'The Money Engine System',desc:'Turn the skill into a client-acquisition system: leads, problems, samples, pitches and closing.',asset:'/atelier-v2/media/watch-chameleon.svg',sell:'Outcome: Get your first client'}
  };

  function courseFor(key){
    const pillars=(window.FUSE_COURSE&&Array.isArray(window.FUSE_COURSE.pillars))?window.FUSE_COURSE.pillars:[];
    return pillars.find(p=>p&&p.key===key)||null;
  }
  function flat(course){
    const out=[];
    ((course&&course.modules)||[]).forEach((module,mi)=>((module&&module.lessons)||[]).forEach((lesson,li)=>out.push({module,lesson,mi,li})));
    return out;
  }
  function progress(){try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}catch(e){return {}}}
  function remember(key,mi,li){try{const p=progress();p[key]={mi,li,updatedAt:Date.now()};localStorage.setItem(PROGRESS_KEY,JSON.stringify(p))}catch(e){}}
  function currentPos(key){
    const course=courseFor(key),saved=progress()[key];
    if(saved&&course&&course.modules&&course.modules[saved.mi]&&course.modules[saved.mi].lessons&&course.modules[saved.mi].lessons[saved.li]) return {mi:+saved.mi,li:+saved.li};
    const first=flat(course)[0];
    return first?{mi:first.mi,li:first.li}:null;
  }
  function toast(message){
    let el=document.getElementById('academyRecoveryToast');
    if(!el){el=document.createElement('div');el.id='academyRecoveryToast';el.style.cssText='position:fixed;left:16px;right:16px;bottom:84px;z-index:9999;padding:11px 13px;border:1px solid rgba(186,255,99,.35);border-radius:14px;background:rgba(3,24,20,.96);color:#effff5;font:800 11px/1.35 Inter,system-ui,sans-serif;box-shadow:0 15px 40px rgba(0,0,0,.4)';document.body.appendChild(el)}
    el.textContent=message;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',2600);
  }
  function hideHome(){
    const h=document.getElementById('homeView'),c=document.getElementById('courseView'),l=document.getElementById('lessonView');
    if(h)h.classList.add('hidden');if(c)c.classList.remove('active');if(l)l.classList.remove('active');
  }
  function showHomeFallback(){
    const h=document.getElementById('homeView'),c=document.getElementById('courseView'),l=document.getElementById('lessonView');
    if(h)h.classList.remove('hidden');if(c)c.classList.remove('active');if(l)l.classList.remove('active');window.scrollTo({top:0,behavior:'smooth'});
  }
  function getToken(){
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sb-')&&k.endsWith('-auth-token')){const v=JSON.parse(localStorage.getItem(k));return (v&&v.access_token)||(v&&v.currentSession&&v.currentSession.access_token)||null}}}catch(e){}
    return null;
  }
  async function loadProtectedVideo(lesson,video,status,play){
    if(!lesson||!lesson.key){status.textContent='Lesson video is not connected yet.';status.style.display='block';return}
    const token=getToken();
    if(!token){status.textContent='Sign in to Fuse Atelier to load the protected lesson video.';status.style.display='block';return}
    status.textContent='Loading lesson video…';status.style.display='block';
    try{
      const r=await fetch('/.netlify/functions/lesson-video',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+token},body:JSON.stringify({lesson_key:lesson.key})});
      const d=await r.json();if(!r.ok||!d.url)throw new Error(d.error||'Video unavailable');
      video.src=d.url;video.style.display='block';video.load();status.style.display='none';if(play)play.style.display='none';video.play().catch(()=>{});
    }catch(err){status.textContent=(err&&err.message)||'Video unavailable right now.';status.style.display='block'}
  }
  function renderLesson(key,mi,li){
    const course=courseFor(key),meta=META[key]||META.video,module=course&&course.modules&&course.modules[mi],lesson=module&&module.lessons&&module.lessons[li];
    if(!course||!module||!lesson){toast('I could not resolve that lesson yet. Please tap View path and try again.');return false}
    remember(key,mi,li);hideHome();
    const view=document.getElementById('lessonView');if(!view)return false;view.classList.add('active');
    const items=flat(course),idx=items.findIndex(x=>x.mi===mi&&x.li===li),next=items[idx+1],pct=Math.max(4,Math.round(((idx+1)/Math.max(items.length,1))*100)),notes=lesson.notes||'<p>Lesson notes will appear here.</p>';
    view.innerHTML=`<div class="lesson-shell"><div class="lesson-progress"><button type="button" id="recoveryBack">←</button><div class="lesson-progress-copy"><b>${meta.title} · Lesson ${idx+1} of ${items.length}</b><span>${module.title||'Course module'}</span><div class="lesson-progress-bar"><i style="width:${pct}%"></i></div></div></div><div class="player-grid"><div class="vertical-stage"><div class="vertical-player"><img src="${meta.asset}" alt="${lesson.title||meta.title}"><video id="lessonVideo" controls playsinline webkit-playsinline preload="metadata" style="display:none"></video><div class="player-shade"></div><span class="player-pill">9:16 LESSON</span><button type="button" class="play-state" id="playLesson">▶</button><div class="player-bottom"><b>${lesson.n?lesson.n+' · ':''}${lesson.title||meta.title}</b><span>${lesson.dur||'Mobile lesson'}</span></div><div class="video-status" id="videoStatus"></div></div></div><div class="lesson-meta"><div class="eyebrow">Now learning</div><h1>${lesson.title||meta.title}</h1><p>${meta.desc}</p><div class="lesson-quick"><span>${lesson.dur||'Short lesson'}</span><span>9:16 vertical</span><span>Build as you watch</span></div><div class="lesson-tabs"><button class="active" type="button">Lesson</button></div><div class="lesson-panel"><article class="card lesson-card notes-source"><div class="eyebrow">Lesson guide</div>${notes}<div class="next-card card"><b>Keep going</b><p>Finish this lesson, then continue straight into the next part of the path.</p><div class="next-actions"><button class="primary" type="button" id="recoveryCreate">Open Fuse Create ✦</button>${next?'<button class="secondary" type="button" id="recoveryNext">Next lesson →</button>':''}</div></div></article></div></div></div></div>`;
    const back=view.querySelector('#recoveryBack');if(back)back.addEventListener('click',()=>renderCourse(key));
    const play=view.querySelector('#playLesson'),video=view.querySelector('#lessonVideo'),status=view.querySelector('#videoStatus');if(play&&video&&status)play.addEventListener('click',()=>loadProtectedVideo(lesson,video,status,play));
    const nxt=view.querySelector('#recoveryNext');if(nxt&&next)nxt.addEventListener('click',()=>renderLesson(key,next.mi,next.li));
    const create=view.querySelector('#recoveryCreate');if(create)create.addEventListener('click',()=>{location.href='/app/studio.html'});
    window.scrollTo({top:0,behavior:'smooth'});return true;
  }
  function renderCourse(key){
    const course=courseFor(key),meta=META[key];
    if(!course||!meta){toast('That course is still loading. Try again in a moment.');return false}
    hideHome();const view=document.getElementById('courseView');if(!view)return false;view.classList.add('active');
    const items=flat(course);
    view.innerHTML=`<article class="card course-hero"><div class="course-media"><img src="${meta.asset}" alt="${meta.title}"><button type="button" class="back" id="recoveryHome">←</button></div><div class="course-copy"><div class="eyebrow">Fuse Academy path</div><h1>${meta.title}</h1><p>${meta.desc}</p><div class="course-stats"><span>${items.length} lessons</span><span>Mobile-first</span><span>9:16 lesson video</span></div><div class="build-box"><b>What this path does</b><p>${meta.sell}. Finish the lessons, build the proof, then move into the Money Engine.</p></div></div></article><section class="section"><div class="head"><div><div class="eyebrow">Course library</div><h2>Your modules</h2></div></div><div id="recoveryCurriculum"></div></section>`;
    const cur=view.querySelector('#recoveryCurriculum');
    (course.modules||[]).forEach((module,mi)=>{const box=document.createElement('article');box.className='card module';box.innerHTML=`<div class="module-head"><b>${module.title||'Module '+(mi+1)}</b><span>${(module.lessons||[]).length} lessons</span></div>`;(module.lessons||[]).forEach((lesson,li)=>{const row=document.createElement('button');row.type='button';row.className='lesson-row';row.style.cssText='width:100%;color:inherit;text-align:left;background:transparent;border:0';row.innerHTML=`<span class="lesson-icon">▶</span><div><b>${lesson.n?lesson.n+' · ':''}${lesson.title}</b><small>${lesson.dur||'Vertical lesson'}</small></div><em>Open</em>`;row.addEventListener('click',()=>renderLesson(key,mi,li));box.appendChild(row)});cur.appendChild(box)});
    const home=view.querySelector('#recoveryHome');if(home)home.addEventListener('click',showHomeFallback);window.scrollTo({top:0,behavior:'smooth'});return true;
  }
  function resumeVideo(){
    const course=courseFor('video');
    if(!course){toast('AI UGC course data is still loading…');setTimeout(()=>{if(courseFor('video'))resumeVideo()},500);return}
    const pos=currentPos('video');if(!pos){renderCourse('video');return}
    if(typeof window.openLesson==='function'){
      try{window.openLesson('video',pos.mi,pos.li);const lv=document.getElementById('lessonView');if(lv&&lv.classList.contains('active'))return}catch(e){console.warn('[Fuse Academy recovery] native openLesson failed',e)}
    }
    renderLesson('video',pos.mi,pos.li);
  }
  function renderPathsIfMissing(){
    const rail=document.getElementById('pathRail');if(!rail||rail.children.length)return;
    ['design','video','landing','money'].forEach(key=>{const meta=META[key],course=courseFor(key),card=document.createElement('article');card.className='path-card';card.tabIndex=0;card.innerHTML=`<div class="path-media"><img src="${meta.asset}" alt="${meta.title}"><span class="path-label">CURRENT PATH</span></div><div class="path-copy"><h3>${meta.title}</h3><p>${meta.desc}</p><div class="path-meta"><span>${course?flat(course).length:0} lessons</span><span>9:16 lessons</span></div><span class="earn">${meta.sell}</span></div>`;card.addEventListener('click',()=>renderCourse(key));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();renderCourse(key)}});rail.appendChild(card)});
  }
  function activateRecovery(){
    if(window.__FUSE_ACADEMY_RECOVERY_ACTIVE__)return;window.__FUSE_ACADEMY_RECOVERY_ACTIVE__=true;
    console.warn('[Fuse Academy recovery] base dynamic runtime did not initialize; recovery activated');
    renderPathsIfMissing();
    const original=document.getElementById('continueLearningBtn');
    if(original){const btn=original.cloneNode(true);original.replaceWith(btn);let stamp=0;const go=()=>{const now=Date.now();if(now-stamp<500)return;stamp=now;resumeVideo()};btn.addEventListener('click',go);btn.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();go()}})}
    document.addEventListener('click',e=>{const target=e.target.closest&&e.target.closest('[data-open]');if(!target)return;e.preventDefault();e.stopPropagation();renderCourse(target.dataset.open)},true);
  }
  function check(){
    const rail=document.getElementById('pathRail'),nativeReady=typeof window.resumeCourse==='function'&&rail&&rail.children.length>0;
    if(!nativeReady)activateRecovery();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,60));else setTimeout(check,60);
})();