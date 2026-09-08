(()=>{
 const rail=document.querySelector('#student-reviews .reviews-grid');if(!rail)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 rail.tabIndex=0;rail.setAttribute('aria-label','Student reviews. Scroll horizontally to read more.');
 const button=document.createElement('button');button.type='button';button.className='reviews-motion';rail.after(button);
 let paused=reduced.matches,hover=false,touch=false,visible=false,hold=0,direction=1,last=0,frame=0,position=rail.scrollLeft,ownScroll=false;
 const sync=()=>{button.textContent=paused?'Resume review scrolling':'Pause review scrolling';button.setAttribute('aria-pressed',String(paused))};sync();
 button.addEventListener('click',()=>{paused=!paused;position=rail.scrollLeft;sync()});
 reduced.addEventListener('change',()=>{paused=reduced.matches;sync()});
 rail.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hover=true});rail.addEventListener('pointerleave',()=>{hover=false});
 rail.addEventListener('pointerdown',()=>{touch=true});
 const release=()=>{if(touch){touch=false;position=rail.scrollLeft;hold=performance.now()+4500}};
 addEventListener('pointerup',release,{passive:true});addEventListener('pointercancel',release,{passive:true});
 rail.addEventListener('wheel',()=>{hold=performance.now()+4500;position=rail.scrollLeft},{passive:true});
 rail.addEventListener('scroll',()=>{if(!ownScroll)position=rail.scrollLeft},{passive:true});
 const io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;position=rail.scrollLeft},{threshold:.15});io.observe(rail);
 function tick(now){frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;
  if(paused||hover||touch||!visible||document.hidden||rail.matches(':focus-within')||now<hold){position=rail.scrollLeft;return}
  const max=rail.scrollWidth-rail.clientWidth;if(max<2)return;
  position=Math.max(0,Math.min(max,position+direction*22*dt));ownScroll=true;rail.scrollLeft=position;ownScroll=false;
  if(position>=max||position<=0){direction*=-1;hold=now+2000}
 }
 frame=requestAnimationFrame(tick);
 addEventListener('pagehide',e=>{if(!e.persisted){cancelAnimationFrame(frame);io.disconnect()}});
})();
