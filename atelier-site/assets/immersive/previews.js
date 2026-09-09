(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
 const specs=[['.rebuild-academy-ui','.rebuild-academy-course','Academy'],['.rebuild-sell-ui','.rebuild-sell-row','Client pipeline'],['.money-visual','.money-col','Money Engine']];
 const cleanups=[];
 for(const [selector,itemSelector,label] of specs){
  const host=document.querySelector(selector);if(!host)continue;
  const items=[...host.querySelectorAll(itemSelector)];if(!items.length)continue;
  host.classList.add('fuse-demo','fuse-demo-autoplay');
  let selected=0,timer=0,visible=false;
  const show=index=>{
   selected=(index+items.length)%items.length;
   items.forEach((el,i)=>{el.classList.toggle('demo-selected',i===selected);el.setAttribute('aria-current',i===selected?'true':'false')});
  };
  const stop=()=>clearTimeout(timer);
  const schedule=()=>{
   stop();
   if(!visible||document.hidden||reduced.matches)return;
   timer=setTimeout(()=>{show(selected+1);schedule()},1700);
  };
  items.forEach((el,i)=>{
   el.dataset.demoItem='';
   el.tabIndex=0;
   el.setAttribute('aria-label',label+' preview: '+el.textContent.trim().replace(/\s+/g,' '));
   el.addEventListener('click',()=>{show(i);schedule()});
   el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(i);schedule()}});
  });
  host.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;const r=host.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;host.style.setProperty('--demo-x',(0.5-y)*5+'deg');host.style.setProperty('--demo-y',(x-.5)*6+'deg');host.style.setProperty('--light-x',x*100+'%');host.style.setProperty('--light-y',y*100+'%')});
  host.addEventListener('pointerleave',()=>{host.style.setProperty('--demo-x','0deg');host.style.setProperty('--demo-y','0deg')});
  const io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)schedule();else stop()},{threshold:.2});io.observe(host);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule()});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();else schedule()});
  show(0);cleanups.push(()=>{stop();io.disconnect()});
 }
 addEventListener('pagehide',e=>{if(!e.persisted)cleanups.forEach(fn=>fn())});
})();