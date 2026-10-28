(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const word=document.getElementById('rotating-word');
 const words=['AI videos.','product visuals.','flyer designs.','talking twins.','Client work.','Paid gigs.','Website.','Portfolio.'];
 let index=0;
 setInterval(()=>{if(reduced.matches||document.hidden)return;word.classList.add('leaving');setTimeout(()=>{word.textContent=words[index=(index+1)%words.length];word.classList.remove('leaving');},250);},2600);
 const menu=document.querySelector('.menu-toggle'),panel=document.getElementById('start-menu');
 function close(){panel.hidden=true;menu.setAttribute('aria-expanded','false');}
 menu.addEventListener('click',()=>{panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));});
 document.getElementById('close-menu').addEventListener('click',close);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();menu.focus();}});
 const gallery=document.getElementById('gallery');
 let paused=false,hover=false,last=0;
 const toggle=document.getElementById('gallery-motion');
 toggle.addEventListener('click',()=>{paused=!paused;toggle.textContent=paused?'Resume motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));});
 gallery.addEventListener('pointerenter',()=>hover=true);gallery.addEventListener('pointerleave',()=>hover=false);
 gallery.addEventListener('focusin',()=>hover=true);gallery.addEventListener('focusout',()=>hover=false);
 gallery.addEventListener('pointerdown',()=>{paused=true;toggle.textContent='Resume motion';toggle.setAttribute('aria-pressed','true');});
 document.getElementById('gallery-prev').onclick=()=>gallery.scrollBy({left:-290,behavior:reduced.matches?'instant':'smooth'});
 document.getElementById('gallery-next').onclick=()=>gallery.scrollBy({left:290,behavior:reduced.matches?'instant':'smooth'});
 const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(isIntersecting&&!reduced.matches&&!document.hidden)target.play().catch(()=>{});else target.pause();}),{root:gallery,threshold:.25});
 fetch('/start/community.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(works=>{
 works.forEach(row=>{
  const figure=document.createElement('figure');figure.className='piece';
  const media=document.createElement('div');media.className='media';
  const video=document.createElement('video');video.src=row.url;video.poster=row.poster;video.muted=true;video.loop=true;video.playsInline=true;video.controls=true;video.preload='none';video.setAttribute('aria-label',row.title);
  const caption=document.createElement('figcaption'),label=document.createElement('span');label.textContent=row.title;caption.append(label);
  media.append(video);figure.append(media,caption);gallery.append(figure);observer.observe(video);
 });
 }).catch(()=>{gallery.textContent='Community work is temporarily unavailable. Please refresh to try again.';});
 function frame(time){const dt=Math.min(time-last,40);last=time;if(!paused&&!hover&&!reduced.matches&&!document.hidden&&gallery.scrollWidth>gallery.clientWidth){if(gallery.scrollLeft>=gallery.scrollWidth-gallery.clientWidth-1)gallery.scrollLeft=0;else gallery.scrollLeft+=dt*.035;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)gallery.querySelectorAll('video').forEach(v=>v.pause());});
})();
