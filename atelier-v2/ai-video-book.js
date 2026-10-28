const BOOK_MANIFEST = {"total": 63, "chapters": [["Cover", 1], ["A note from Maryam", 2], ["What is AI video, really?", 4], ["Ten directions you can explore", 7], ["AI UGC-style videos", 8], ["Product videos and commercials", 10], ["Fashion and beauty lifestyle", 12], ["Talking heads and digital twins", 14], ["Explainers and education", 16], ["Stories, films and animation", 18], ["Music videos and visualisers", 20], ["Property and hospitality", 22], ["Editing and localisation", 24], ["Stock footage and reusable assets", 26], ["Which direction fits you?", 28], ["Your simple production toolkit", 30], ["Build proof before building a huge website", 38], ["Choose your first way to earn", 42], ["Find a buyer with a reason to listen", 49], ["Your ₦10 million map", 56], ["Your next 30 days · build the foundation", 58], ["Your practice and implementation tools", 60], ["Where the market numbers come from", 61], ["Choose. Create. Put it in front of people.", 63]]};
(() => {
  'use strict';
  const {total,chapters}=BOOK_MANIFEST, key='fuse_ai_video_book_v2_last_page';
  const $=id=>document.getElementById(id), frame=$('pageFrame'), stage=$('pageStage'), article=$('bookText'), photo=$('bookPage');
  let page=1,current=0;
  try { page=Number(localStorage.getItem(key))||1; } catch {}
  if(page<1||page>total)page=1;
  const cache=new Map(),pending=new Map(),dialog=$('contentsDialog');
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node};
  const safeLink=url=>{try {const u=new URL(url,location.href);return u.protocol==='https:'||u.origin===location.origin?u.href:null}catch{return null}};
  function progress(){const max=document.documentElement.scrollHeight-innerHeight;$('readerProgressFill').style.height=(max>0?Math.max(8,100*scrollY/max):100)+'%'}
  addEventListener('scroll',progress,{passive:true});addEventListener('resize',progress);
  async function getPage(n){
    if(cache.has(n))return cache.get(n);
    if(pending.has(n))return pending.get(n);
    const task=Fuse.api('ai-video-book-page',{page:n,edition:'2026-10'}).then(result=>{
      if(!result.image&&!result.content)throw new Error('This page is unavailable. Please refresh the reader.');
      cache.set(n,result);pending.delete(n);if(cache.size>10)cache.delete(cache.keys().next().value);return result;
    }).catch(error=>{pending.delete(n);throw error});pending.set(n,task);return task;
  }
  function warm(n){if(n>0&&n<=total&&!cache.has(n)&&!pending.has(n))getPage(n).catch(()=>{})}
  function render(data,n){
    article.replaceChildren();
    article.dataset.tone=String(Math.floor(n/2)%3);
    article.append(el('div','lesson-kicker',data.part),el('h1','lesson-title',data.title));
    const rule=el('div','lesson-rule');rule.setAttribute('aria-hidden','true');article.append(rule);
    for(const para of data.body||[])article.append(el('p','lesson-paragraph',para));
    if(data.cards){const cards=el('div','lesson-cards');for(const [heading,copy]of data.cards){const card=el('section','lesson-card');card.append(el('h2','',heading),el('p','',copy));cards.append(card)}article.append(cards)}
    if(data.steps){const steps=el('ol','lesson-steps');for(const step of data.steps)steps.append(el('li','',step));article.append(steps)}
    if(data.prompt){const box=el('section','lesson-prompt');box.append(el('h2','','Copy, personalise, then use'),el('p','',data.prompt));const copy=el('button','lesson-copy','Copy prompt');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(data.prompt);copy.textContent='Copied ✓'}catch{const area=el('textarea','copy-fallback',data.prompt);area.readOnly=true;box.append(area);area.select();copy.textContent='Select and copy the text below'}setTimeout(()=>copy.textContent='Copy prompt',2500)};box.append(copy);article.append(box)}
    if(data.note)article.append(el('aside','lesson-note',data.note));
    if(data.task){const task=el('section','lesson-task');task.append(el('h2','','Your turn'),el('p','',data.task));article.append(task)}
    if(data.links){const links=el('nav','lesson-links');links.setAttribute('aria-label','Links for this lesson');for(const [label,url]of data.links){const href=safeLink(url);if(!href)continue;const a=el('a','',label+' ↗');a.href=href;if(new URL(href).origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}links.append(a)}article.append(links)}
    const footer=el('footer','lesson-footer');footer.append(el('span','','ZERO TO FIRST 10 MILLION WITH AI VIDEO'),el('span','',String(n).padStart(2,'0')));article.append(footer);
  }
  const pointers=new Map();let zoom=1,x=0,y=0,pinch=null,drag=null;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function paint(){const r=frame.getBoundingClientRect();x=clamp(x,r.width*(1-zoom),0);y=clamp(y,r.height*(1-zoom),0);stage.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;frame.classList.toggle('zoomed',zoom>1)}
  function reset(){zoom=1;x=y=0;pinch=drag=null;pointers.clear();paint()}
  frame.addEventListener('pointerdown',e=>{
    if(e.target.closest('a,button,input,textarea'))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const[a,b]=[...pointers.values()],r=frame.getBoundingClientRect();pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:zoom,ax:((a.x+b.x)/2-r.left-x)/zoom,ay:((a.y+b.y)/2-r.top-y)/zoom};frame.setPointerCapture(e.pointerId);e.preventDefault()}
    else if(zoom>1){drag={x:e.clientX,y:e.clientY};frame.setPointerCapture(e.pointerId);e.preventDefault()}
  });
  frame.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pointers.size===2){e.preventDefault();const[a,b]=[...pointers.values()],r=frame.getBoundingClientRect();zoom=clamp(pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d,1,4);x=(a.x+b.x)/2-r.left-pinch.ax*zoom;y=(a.y+b.y)/2-r.top-pinch.ay*zoom;paint()}
    else if(drag&&zoom>1){e.preventDefault();x+=e.clientX-drag.x;y+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};paint()}
  });
  function release(e){pointers.delete(e.pointerId);pinch=null;const a=[...pointers.values()][0];drag=a&&zoom>1?a:null}
  frame.addEventListener('pointerup',release);frame.addEventListener('pointercancel',release);
  frame.addEventListener('dblclick',e=>{if(e.target.closest('a,button,textarea'))return;e.preventDefault();if(zoom>1){reset();return}const r=frame.getBoundingClientRect();zoom=2;x=-(e.clientX-r.left);y=-(e.clientY-r.top);paint()});
  async function show(n,navigated=false){
    if(!Number.isInteger(n)||n<1||n>total)return;
    page=n;const request=++current;reset();
    // Never leave the previous lesson visible after an entitlement/network failure.
    photo.hidden=true;article.hidden=true;stage.hidden=true;
    $('bookStatus').hidden=false;$('bookStatus').textContent='Opening page '+n+'…';
    frame.classList.add('is-loading');frame.setAttribute('aria-busy','true');
    $('pageNumber').value=n;$('prevPage').disabled=n===1;$('nextPage').disabled=n===total;
    try{
      const result=await getPage(n);if(request!==current)return;
      if(result.image){photo.src=result.image;photo.alt='Zero To First 10 Million With AI Video — approved cover';await photo.decode();if(request!==current)return;photo.hidden=false;frame.classList.add('cover-page')}
      else{render(result.content,n);article.hidden=false;frame.classList.remove('cover-page')}
      stage.hidden=false;$('bookStatus').hidden=true;frame.classList.remove('is-loading');frame.setAttribute('aria-busy','false');
      $('pageLabel').textContent='Page '+n+' of '+total;
      try{localStorage.setItem(key,String(n))}catch{}
      history.replaceState(null,'','#page-'+n);
      warm(n+1);warm(n+2);warm(n-1);
      if(navigated)frame.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      requestAnimationFrame(progress);
    }catch(error){if(request!==current)return;frame.classList.remove('is-loading');frame.setAttribute('aria-busy','false');$('bookStatus').textContent=error.message||'Could not open this page.';const retry=el('button','lesson-copy','Try again');retry.type='button';retry.onclick=()=>show(n);$('bookStatus').append(document.createElement('br'),retry)}
  }
  $('prevPage').onclick=()=>show(page-1,true);$('nextPage').onclick=()=>show(page+1,true);
  $('pageNumber').onchange=()=>{const n=Number($('pageNumber').value);if(Number.isInteger(n)&&n>=1&&n<=total)show(n,true);else $('pageNumber').value=page};
  document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,button,a')||dialog.open)return;if(e.key==='ArrowRight')show(page+1,true);if(e.key==='ArrowLeft')show(page-1,true)});
  for(const[title,n]of chapters){const b=el('button');b.type='button';b.append(el('strong','',title),el('span','',String(n)));b.onclick=()=>{dialog.close();show(n,true)};$('chapterList').append(b)}
  $('bookContents').onclick=()=>dialog.showModal();$('closeContents').onclick=()=>dialog.close();
  const hash=Number(location.hash.replace('#page-',''));show(Number.isInteger(hash)&&hash>0&&hash<=total?hash:page);
})();
