(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
 const specs=[['.rebuild-3d-stage','.rebuild-3d-card','Client path'],['.rebuild-academy-ui','.rebuild-academy-course','Academy'],['.rebuild-sell-ui','.rebuild-sell-row','Client pipeline'],['.money-visual','.money-col','Money Engine']];
 const cleanups=[];
 for(const [selector,itemSelector,label] of specs){
  const host=document.querySelector(selector);if(!host)continue;
  const items=[...host.querySelectorAll(itemSelector)];if(!items.length)continue;
  host.classList.add('fuse-demo');
  const controls=document.createElement('div');controls.className='fuse-demo-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label',label+' preview controls');
  const counter=document.createElement('output');counter.setAttribute('aria-label','Selected preview item');
  const make=(text,aria,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',aria);b.addEventListener('click',fn);return b};
  let selected=0,timer=0,seen=false,visible=false,running=false;
  const stop=()=>{clearTimeout(timer);running=false;replay.textContent='Replay';replay.setAttribute('aria-label','Replay '+label+' preview');replay.setAttribute('aria-pressed','false')};
  const show=(index,user=false)=>{
   selected=(index+items.length)%items.length;
   items.forEach((el,i)=>{el.classList.toggle('demo-selected',i===selected);el.setAttribute('aria-pressed',String(i===selected))});
   counter.textContent=(selected+1)+' / '+items.length;
   if(selector==='.rebuild-3d-stage')document.querySelectorAll('.rebuild-3d-progress i').forEach((dot,i)=>dot.classList.toggle('demo-lit',i<=selected));
   if(user&&host.scrollWidth>host.clientWidth){const x=items[selected].offsetLeft-(host.clientWidth-items[selected].offsetWidth)/2;host.scrollTo({left:Math.max(0,x),behavior:reduced.matches?'instant':'smooth'})}
  };
  const step=d=>{stop();show(selected+d,true)};
  const run=()=>{stop();running=true;replay.textContent='Pause';replay.setAttribute('aria-label','Pause '+label+' preview');replay.setAttribute('aria-pressed','true');show(0);const next=()=>{if(!visible||document.hidden){stop();return}if(selected===items.length-1){stop();return}show(selected+1);timer=setTimeout(next,1500)};timer=setTimeout(next,1500)};
  const prev=make('←','Previous '+label+' item',()=>step(-1));
  const replay=make('Replay','Replay '+label+' preview',()=>{if(running)stop();else run()});
  const next=make('→','Next '+label+' item',()=>step(1));
  controls.append(prev,counter,replay,next);
  if(selector==='.rebuild-3d-stage')host.after(controls);else host.append(controls);
  const note=document.createElement('p');note.className='fuse-demo-description';note.textContent='Interactive preview · tap a card to explore';controls.after(note);
  items.forEach((el,i)=>{el.dataset.demoItem='';el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',label+' preview: '+el.textContent.trim().replace(/\s+/g,' '));el.addEventListener('click',()=>{stop();show(i,true)});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stop();show(i,true)}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();step(e.key==='ArrowLeft'?-1:1);items[selected].focus({preventScroll:true})}})});
  host.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;const r=host.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;host.style.setProperty('--demo-x',(0.5-y)*5+'deg');host.style.setProperty('--demo-y',(x-.5)*6+'deg');host.style.setProperty('--light-x',x*100+'%');host.style.setProperty('--light-y',y*100+'%')});
  host.addEventListener('pointerleave',()=>{host.style.setProperty('--demo-x','0deg');host.style.setProperty('--demo-y','0deg')});
  host.addEventListener('focusin',stop);
  const io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!seen){seen=true;if(!reduced.matches)run()}else if(!visible)stop()},{threshold:.25});io.observe(host);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});reduced.addEventListener('change',()=>{if(reduced.matches)stop()});
  show(0);cleanups.push(()=>{stop();io.disconnect()});
 }
 addEventListener('pagehide',e=>{if(!e.persisted)cleanups.forEach(fn=>fn())});
})();
