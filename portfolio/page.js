const samples=[["1000293847","story","Modest streetwear","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000293847.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000293847.jpg"],["1000149399","story","Resortwear editorial","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000149399.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000149399.jpg"],["1000277869","story","Character-led fashion","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000277869.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000277869.jpg"],["1000269333","story","Hijab look close-up","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/portfolio/1000269333-c06547d1451f.mp4","/portfolio/media/hijab-look-poster.jpg"],["1000035070","story","Everyday hijab styling","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000035070.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000035070.jpg"],["1000269069","story","Modest fashion styling","","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000269069.mp4","https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev/community/batch-3d7e29c09569/1000269069.jpg"]];
const grid=document.querySelector('#work-grid');samples.forEach(([id,type,title,sub,url,poster])=>{const card=document.createElement('article');card.className='work-card';card.dataset.category=type;card.dataset.title=title;card.dataset.url=url;card.innerHTML=`<div class="portfolio-video-frame"><video playsinline controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture preload="none" poster="${poster}" aria-label="${title}"><source src="${url}" type="video/mp4"></video><button type="button" class="video-toggle" aria-label="Play ${title}">▶</button></div><div class="work-card-caption"><div><h3>${title}</h3></div><a class="card-project" href="#brief">Start a project ↗</a></div>`;grid.append(card);});
const videos=[...document.querySelectorAll('.work-card video')];videos.forEach(v=>{const button=v.parentElement.querySelector('.video-toggle');const title=v.getAttribute('aria-label');button.setAttribute('aria-pressed','false');const sync=()=>{button.textContent=v.paused?'▶':'Ⅱ';button.setAttribute('aria-label',(v.paused?'Play ':'Pause ')+title);button.classList.toggle('is-playing',!v.paused);button.setAttribute('aria-pressed',String(!v.paused))};button.addEventListener('click',()=>{if(v.paused){v.play().catch(()=>{button.textContent='▶';button.setAttribute('aria-label','Retry playing '+title);let note=v.parentElement.querySelector('.video-error');if(!note){note=document.createElement('span');note.className='video-error';note.setAttribute('role','status');v.parentElement.append(note)}note.textContent='Could not load video. Tap play to retry.'})}else v.pause()});v.addEventListener('click',()=>button.click());v.addEventListener('contextmenu',e=>e.preventDefault());v.addEventListener('play',()=>{v.parentElement.querySelector('.video-error')?.remove();videos.filter(x=>x!==v).forEach(x=>x.pause());sync()});v.addEventListener('pause',sync);v.addEventListener('ended',sync);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});document.querySelectorAll('.work-card').forEach(c=>{c.hidden=b.dataset.filter!=='all'&&c.dataset.category!==b.dataset.filter;if(c.hidden)c.querySelector('video')?.pause()})}));
const scope=document.querySelector('#scope');let current;let submitting=false;
function update(){const send=document.querySelector('#brief-form button[type="submit"]');if(!scope.checkValidity()){document.querySelector('#total').textContent='Check scope';document.querySelector('#scope-summary').textContent='Please check the project options.';document.querySelector('#breakdown').replaceChildren();document.querySelector('#brief-price').textContent='Check your project scope above before submitting.';send.disabled=true;current=null;return}send.disabled=submitting;const s=Object.fromEntries(new FormData(scope));Object.keys(s).filter(k=>k!=='type').forEach(k=>s[k]=Number(s[k]));current={s,...RiaPricing.quote(s)};document.querySelector('#total').textContent='$'+current.total.toLocaleString('en-US');document.querySelector('#scope-summary').textContent=`${s.quantity} ${current.name}${s.quantity>1?'s':''} · ${s.seconds}s each · ${s.scenes} scenes each`;document.querySelector('#breakdown').replaceChildren(...current.lines.map(([label,cost])=>{const d=document.createElement('div');d.className='line-item'+(cost<0?' saving':'');const l=document.createElement('span');l.textContent=label;const r=document.createElement('span');r.textContent=(cost<0?'−':'')+'$'+Math.abs(cost).toLocaleString('en-US');d.append(l,r);return d}));document.querySelector('#brief-price').textContent=`Selected production price: $${current.total.toLocaleString('en-US')} USD`}
scope.addEventListener('input',update);document.querySelectorAll('[data-type]').forEach(a=>a.addEventListener('click',()=>{scope.elements.type.value=a.dataset.type;update()}));update();
document.querySelectorAll('.card-project').forEach(link=>link.addEventListener('click',()=>{const card=link.closest('.work-card');scope.elements.type.value=card.dataset.category;document.querySelector('#brief-form [name=reference]').value=card.dataset.url;update();}));
let briefRequestId=crypto.randomUUID();
document.querySelector('#brief-form').addEventListener('submit',async e=>{e.preventDefault();if(submitting||!scope.reportValidity()||!current)return;submitting=true;const form=e.target;const button=form.querySelector('button[type="submit"]');const status=document.querySelector('#brief-status');const d=Object.fromEntries(new FormData(form));button.disabled=true;button.textContent='Sending your brief…';status.textContent='';try{const response=await fetch('/api/portfolio-brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,scope:current.s,requestId:briefRequestId}),signal:AbortSignal.timeout(25000)});const result=await response.json().catch(()=>({error:'Brief delivery is temporarily unavailable. Please try again.'}));if(!response.ok||!result.success)throw Error(result.error||'Your brief could not be sent. Please try again.');status.textContent='Your brief has been sent to Ria. Thank you! I’ll reply to the email you provided.';status.className='note success';form.reset();briefRequestId=crypto.randomUUID();button.textContent='Brief sent ✓';}catch(error){status.textContent=error.name==='TimeoutError'?'Sending took longer than expected. Please try again.':(error.message||'Connection interrupted. Please try again.');status.className='note error';button.textContent='Send my brief';}finally{submitting=false;button.disabled=!scope.checkValidity();}});document.querySelector('#year').textContent=new Date().getFullYear();

const hero=document.querySelector('#hero-video');hero.muted=true;hero.play().catch(()=>{});
if('IntersectionObserver' in window){new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!document.hidden)hero.play().catch(()=>{});else hero.pause();}},{threshold:0.05}).observe(hero);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){hero.pause();videos.forEach(v=>v.pause());}else{const r=hero.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)hero.play().catch(()=>{});}});
document.querySelector('#brief-form').addEventListener('input',()=>{const b=document.querySelector('#brief-form button[type="submit"]');if(b.textContent==='Brief sent ✓')b.textContent='Send my brief';});

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
 const playing=videos.some(v=>!v.paused&&!v.ended);
 const paused=railMotion.matches||document.hidden||!railVisible||railPointer||railHover||playing||grid.contains(document.activeElement)||now<railHoldUntil;
 if(!paused&&grid.scrollWidth>grid.clientWidth+2){
  railPosition+=dt*.018;grid.scrollLeft=railPosition;railForward();
 }else railPosition=grid.scrollLeft;
 requestAnimationFrame(animateRail);
}
requestAnimationFrame(animateRail);
