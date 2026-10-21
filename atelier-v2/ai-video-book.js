(() => {
  'use strict';
  const total=45, key='fuse_ai_video_book_last_page';
  const $=id=>document.getElementById(id);
  const chapters=[
    ['Cover',1],['A note from Ria',2],['Contents',3],['Start here',5],
    ['Make Your First Professional AI Video',8],['Choose a buyer',11],['Seven income routes',13],
    ['Build visuals brands can use',17],['Make your portfolio',19],['Package an offer',23],
    ['Price for margin',24],['Find customers',25],['Ask-first and sample-first',26],
    ['Turn replies into paid work',30],['Deliver for repeat work',31],
    ['Personal brand and partnerships',32],['The ₦10 million map',38],
    ['Your first 30 days',40],['Copy-ready tools',42],['A final word',44],['Sources',45]
  ];
  let page=Number(localStorage.getItem(key))||1;
  if(page<1||page>total)page=1;
  let current=0;
  const pageCache=new Map();
  const pending=new Map();
  const action=$('bookAction');
  const cue=$('actionCue'),peek=$('actionPeek'),hotspots=$('pageHotspots');
  let peekTimer;
  function revealNote(){action.scrollIntoView({behavior:'smooth',block:'center'});peek.hidden=true}
  cue.onclick=revealNote;peek.onclick=revealNote;
  function showPeek(){
    clearTimeout(peekTimer);
    if(action.hidden)return;
    peek.hidden=false;
    peekTimer=setTimeout(()=>{peek.hidden=true},6000);
  }
  function updateProgress(){
    const max=document.documentElement.scrollHeight-innerHeight;
    $('readerProgressFill').style.height=(max>0?Math.max(8,100*scrollY/max):100)+'%';
  }
  addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',updateProgress);
  function updateAction(n){
    if(n<=7){
      action.innerHTML='<strong>Keep learning with other AI creators</strong><p>Join Ria’s AI community for ideas and conversations as you work through the guide.</p><a href="https://chat.whatsapp.com/KKbt2aqTSP9D0YgcODf7Sy?s=cl&amp;p=a&amp;mlu=4&amp;ilr=4" target="_blank" rel="noopener noreferrer">Join the AI community ↗</a>';
      action.hidden=false;
    }else if(n<=10){
      action.innerHTML='<strong>Your first win: finish one 20-second spec concept</strong><p>Use the brief, script, edit and quality check on pages 8–10. The book gives you enough to complete this exercise. If creator-style video is the skill you want to develop further, explore the full AI UGC course for ₦4,900.</p><a href="https://nestuge.com/academy_ugc_offer" target="_blank" rel="noopener noreferrer">Explore the AI UGC course ↗</a>';
      action.hidden=false;
    }else if(n===16){
      action.innerHTML='<strong>Choose one route for your next 30 days</strong><p>Client projects, audience partnerships and selling your own products need different proof. Pick a buyer and one small test instead of trying all seven routes at once.</p><a href="ai-video-book-resources.html?tab=plan">Open the 30-day plan →</a>';
      action.hidden=false;
    }else if(n===18){
      action.innerHTML='<strong>Build proof for the buyer you chose</strong><p>Choose one practice brief, create a clearly labelled concept, then check the product details, claims and final export before adding it to your portfolio.</p><a href="ai-video-book-resources.html?tab=briefs">Choose a practice brief →</a>';
      action.hidden=false;
    }else if(n===22){
      action.innerHTML='<strong>Launch a simple, working portfolio</strong><p>Use your real videos and case studies. Test playback and the contact button on another phone. Your first page can be simple; the Landing Page course is available if you want to build more professionally.</p><a href="https://nestuge.com/academy_landing_page" target="_blank" rel="noopener noreferrer">Explore the Landing Page course ↗</a>';
      action.hidden=false;
    }else if(n===29){
      action.innerHTML='<strong>Turn your offer into conversations</strong><p>Use the ask-first and sample-first examples in your included resources. If you want daily tasks and personal review as you practice outreach, the 14-Day AI Client Challenge is the supported next step.</p><a href="ai-video-book-resources.html?tab=pitches">Use the included pitch examples →</a><a class="secondary-action" href="https://nestuge.com/challenge_academy_offer" target="_blank" rel="noopener noreferrer">Explore the 14-Day Challenge ↗</a>';
      action.hidden=false;
    }else if(n===41||n===45){
      action.innerHTML='<strong>Put your next 30 days into motion</strong><p>Choose one buyer, make two relevant proofs, publish a portfolio, research prospects, start conversations and review what happens. A paid client is a goal, not a promised deadline.</p><a href="ai-video-book-resources.html?tab=plan">Open your action plan →</a>';
      action.hidden=false;
    }else{action.hidden=true;action.replaceChildren()}
    cue.hidden=action.hidden;peek.hidden=true;
  }
  async function getPage(n){
    if(pageCache.has(n))return pageCache.get(n);
    if(pending.has(n))return pending.get(n);
    const task=Fuse.api('ai-video-book-page',{page:n}).then(result=>{
      pageCache.set(n,result.image);
      pending.delete(n);
      if(pageCache.size>9)pageCache.delete(pageCache.keys().next().value);
      return result.image;
    }).catch(error=>{pending.delete(n);throw error});
    pending.set(n,task);
    return task;
  }
  function warm(n){
    if(n<1||n>total||pageCache.has(n)||pending.has(n))return;
    getPage(n).then(src=>{const img=new Image();img.src=src;img.decode?.().catch(()=>{})}).catch(()=>{});
  }
  const frame=$('pageFrame'), photo=$('bookPage');
  const pointers=new Map();
  let zoom=1,offsetX=0,offsetY=0,pinch=null,drag=null;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function paintZoom(){
    const rect=frame.getBoundingClientRect();
    offsetX=clamp(offsetX,rect.width*(1-zoom),0);
    offsetY=clamp(offsetY,rect.height*(1-zoom),0);
    photo.style.transform=`translate(${offsetX}px,${offsetY}px) scale(${zoom})`;
    hotspots.style.transform=photo.style.transform;
  }
  function resetZoom(){zoom=1;offsetX=0;offsetY=0;pinch=null;drag=null;pointers.clear();paintZoom()}
  function startPinch(){
    if(pointers.size!==2)return;
    const [a,b]=[...pointers.values()],rect=frame.getBoundingClientRect();
    const cx=(a.x+b.x)/2-rect.left,cy=(a.y+b.y)/2-rect.top;
    pinch={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,scale:zoom,ax:(cx-offsetX)/zoom,ay:(cy-offsetY)/zoom};
    drag=null;
  }
  frame.addEventListener('pointerdown',e=>{
    if(e.target!==photo||photo.hidden)return;
    e.preventDefault();frame.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2)startPinch();
    else if(zoom>1)drag={x:e.clientX,y:e.clientY};
  });
  frame.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      if(!pinch)startPinch();
      const [a,b]=[...pointers.values()],rect=frame.getBoundingClientRect();
      zoom=clamp(pinch.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance,1,4);
      offsetX=(a.x+b.x)/2-rect.left-pinch.ax*zoom;
      offsetY=(a.y+b.y)/2-rect.top-pinch.ay*zoom;
      paintZoom();
    }else if(drag&&zoom>1){
      offsetX+=e.clientX-drag.x;offsetY+=e.clientY-drag.y;
      drag={x:e.clientX,y:e.clientY};paintZoom();
    }
  });
  function release(e){
    pointers.delete(e.pointerId);pinch=null;
    const left=[...pointers.values()][0];drag=left&&zoom>1?{x:left.x,y:left.y}:null;
  }
  frame.addEventListener('pointerup',release);
  frame.addEventListener('pointercancel',release);
  photo.addEventListener('dblclick',e=>{
    e.preventDefault();
    if(zoom>1){resetZoom();return}
    const rect=frame.getBoundingClientRect();zoom=2;
    offsetX=-(e.clientX-rect.left);offsetY=-(e.clientY-rect.top);paintZoom();
  });
  async function show(n,navigated=false){
    if(!Number.isInteger(n)||n<1||n>total)return;
    const request=++current;
    page=n;
    updateAction(n);
    hotspots.hidden=n!==10;
    $('bookStatus').textContent='Opening page '+n+'…';
    $('bookStatus').hidden=pageCache.has(n);
    frame.classList.toggle('is-loading',!pageCache.has(n));
    frame.setAttribute('aria-busy','true');
    $('pageNumber').value=n;
    $('prevPage').disabled=n===1;
    $('nextPage').disabled=n===total;
    resetZoom();
    try{
      const src=await getPage(n);
      if(request!==current)return;
      const img=$('bookPage');
      img.onload=()=>{if(request===current){$('bookStatus').hidden=true;frame.classList.remove('is-loading');frame.setAttribute('aria-busy','false');img.hidden=false;$('pageLabel').textContent='Page '+n+' of '+total;warm(n+1);warm(n+2);warm(n-1);if(navigated)frame.scrollIntoView({behavior:'smooth',block:'start'});showPeek();requestAnimationFrame(updateProgress)}};
      img.onerror=()=>{if(request===current)$('bookStatus').textContent='The page did not load. Try another page and return.'};
      img.alt='Page '+n+' of Zero To First 10 Million With AI Video';
      if(img.src===src && img.complete && img.naturalWidth)img.onload();
      else img.src=src;
      try{localStorage.setItem(key,String(n))}catch{}
      history.replaceState(null,'','#page-'+n);
    }catch(error){
      if(request===current){$('bookStatus').hidden=false;$('bookStatus').textContent=error.message||'This page could not load.';frame.classList.remove('is-loading');frame.setAttribute('aria-busy','false')}
    }
  }
  $('prevPage').onclick=()=>show(page-1,true);
  $('nextPage').onclick=()=>show(page+1,true);
  $('pageNumber').onchange=()=>show(Number($('pageNumber').value),true);
  document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||$('contentsDialog').open)return;if(e.key==='ArrowRight')show(page+1,true);if(e.key==='ArrowLeft')show(page-1,true)});
  const dialog=$('contentsDialog');
  for(const [title,n] of chapters){
    const button=document.createElement('button');button.type='button';
    const name=document.createElement('strong');name.textContent=title;
    const count=document.createElement('span');count.textContent=String(n);
    button.append(name,count);button.onclick=()=>{dialog.close();show(n,true)};
    $('chapterList').append(button);
  }
  $('bookContents').onclick=()=>dialog.showModal();
  $('closeContents').onclick=()=>dialog.close();
  const hash=Number(location.hash.replace('#page-',''));
  show(Number.isInteger(hash)&&hash>=1&&hash<=total?hash:page);
})();
