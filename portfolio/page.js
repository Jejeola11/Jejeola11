const samples=[["1000293847","story","Modest streetwear","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000293847.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000293847.jpg"],["1000149399","story","Resortwear editorial","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000149399.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000149399.jpg"],["1000277869","story","Character-led fashion","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000277869.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000277869.jpg"],["1000269333","story","Hijab look close-up","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/portfolio/1000269333-c06547d1451f.mp4","/portfolio/media/hijab-look-poster.jpg"],["1000035070","story","Everyday hijab styling","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000035070.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000035070.jpg"],["1000269069","story","Modest fashion styling","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000269069.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000269069.jpg"]];
const grid=document.querySelector('#work-grid');
for(const [id,type,title,sub,url,poster] of samples){
 const card=document.createElement('article');
 card.className='work-card';
 card.innerHTML=`<h3>${title}</h3><div class="portfolio-video-frame">
 <video muted loop playsinline preload="none" poster="${poster}" data-src="${url}" aria-label="${title}"></video>
 <button type="button" class="reel-audio" aria-label="Sound for ${title}" aria-pressed="false">
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="audio-off" d="m16 9 6 6m0-6-6 6"/><path class="audio-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg></button></div>`;
 grid.append(card);
}
const videos=[...grid.querySelectorAll('video')];
const soundButtons=[...grid.querySelectorAll('.reel-audio')];
const visibleVideos=new Set();
function prepareVideo(video){
 if(!video.hasAttribute('src')){video.preload='metadata';video.src=video.dataset.src;}
}
function setReelSound(index,on){
 videos[index].muted=!on;
 soundButtons[index].setAttribute('aria-pressed',String(on));
}
function syncReels(){
 for(const video of videos){
  if(visibleVideos.has(video)&&!document.hidden){prepareVideo(video);if(video.paused)video.play().catch(()=>{});}
  else if(!video.paused)video.pause();
 }
}
soundButtons.forEach((button,index)=>button.onclick=()=>{
 const enable=videos[index].muted;
 videos.forEach((_,i)=>setReelSound(i,false));
 if(enable){prepareVideo(videos[index]);setReelSound(index,true);videos[index].play().catch(()=>setReelSound(index,false));}
});
if('IntersectionObserver' in window){
 const warmup=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries)if(isIntersecting){prepareVideo(target);warmup.unobserve(target);}
 },{root:grid,rootMargin:'0px 160px'});
 const playback=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting,intersectionRatio} of entries){
   if(isIntersecting&&intersectionRatio>=.2)visibleVideos.add(target);
   else visibleVideos.delete(target);
  }
  syncReels();
 },{threshold:[0,.2]});
 videos.forEach(video=>{warmup.observe(video);playback.observe(video);});
}
document.addEventListener('visibilitychange',syncReels);
document.querySelector('#year').textContent=new Date().getFullYear();
const hero=document.querySelector('#hero-video');hero.muted=true;hero.play().catch(()=>{});
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!document.hidden)hero.play().catch(()=>{});else hero.pause();}},{threshold:0.05}).observe(hero);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){hero.pause();videos.forEach(v=>v.pause());}else{const r=hero.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)hero.play().catch(()=>{});}});

/* Recycle cards at the edge instead of jumping back or cloning videos. */
grid.tabIndex=0;
grid.setAttribute('role','region');
grid.setAttribute('aria-label','Portfolio videos. Swipe or scroll horizontally to explore.');
const railMotion=matchMedia('(prefers-reduced-motion: reduce)');
let railVisible=false,railPointer=false,railHover=false,railHoldUntil=0,railLast=0,railPosition=grid.scrollLeft;
const railCards=()=>[...grid.children].filter(c=>!c.hidden);
function railStepWidth(card){return card.getBoundingClientRect().width+(parseFloat(getComputedStyle(grid).columnGap)||0);}
function railForward(){
 const cards=railCards();if(cards.length<2)return;
 const first=cards[0],step=railStepWidth(first);
 if(grid.scrollLeft>=step){const left=grid.scrollLeft-step;grid.append(first);grid.scrollLeft=left;railPosition=grid.scrollLeft;}
}
grid.addEventListener('pointerdown',()=>{
 railPointer=true;railHoldUntil=performance.now()+3500;
 if(grid.scrollLeft<2&&grid.scrollWidth>grid.clientWidth+2){
  const cards=railCards(),last=cards[cards.length-1];
  if(last){const step=railStepWidth(last);grid.prepend(last);grid.scrollLeft+=step;railPosition=grid.scrollLeft;}
 }
},{passive:true});
window.addEventListener('pointerup',()=>{railPointer=false;railHoldUntil=performance.now()+3500;railPosition=grid.scrollLeft;},{passive:true});
window.addEventListener('pointercancel',()=>{railPointer=false;railHoldUntil=performance.now()+3500;},{passive:true});
grid.addEventListener('mouseenter',()=>railHover=true);
grid.addEventListener('mouseleave',()=>{railHover=false;railPosition=grid.scrollLeft;});
grid.addEventListener('wheel',()=>{railHoldUntil=performance.now()+3500;},{passive:true});
grid.addEventListener('keydown',()=>{railHoldUntil=performance.now()+5000;});
grid.addEventListener('scroll',()=>{if(railPointer||performance.now()<railHoldUntil)railPosition=grid.scrollLeft;},{passive:true});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{grid.scrollLeft=0;railPosition=0;railHoldUntil=performance.now()+2000;}));
if('IntersectionObserver' in window)new IntersectionObserver(es=>{railVisible=es[0].isIntersecting;},{threshold:.05}).observe(grid);else railVisible=true;
function animateRail(now){
 const dt=railLast?Math.min(now-railLast,50):0;railLast=now;
 const paused=railMotion.matches||document.hidden||!railVisible||railPointer||railHover||grid.contains(document.activeElement)||now<railHoldUntil;
 if(!paused&&grid.scrollWidth>grid.clientWidth+2){
  railPosition+=dt*.018;grid.scrollLeft=railPosition;railForward();
 }else railPosition=grid.scrollLeft;
 requestAnimationFrame(animateRail);
}
requestAnimationFrame(animateRail);
