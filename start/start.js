(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const word=document.getElementById('rotating-word');
 const words=['AI videos','product visuals','flyer designs','talking twins','Client work','Paid gigs','Website','Portfolio'];
 let index=0;
 setInterval(()=>{if(reduced.matches||document.hidden)return;word.classList.add('leaving');setTimeout(()=>{word.textContent=words[index=(index+1)%words.length];word.classList.remove('leaving');},250);},2600);
 const menu=document.querySelector('.menu-toggle'),panel=document.getElementById('start-menu');
 function close(returnFocus=false){panel.hidden=true;menu.setAttribute('aria-expanded','false');if(returnFocus)menu.focus();}
 menu.addEventListener('click',()=>{panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('a')?.focus();});
 document.getElementById('close-menu').addEventListener('click',()=>close(true));
 document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!menu.contains(e.target))close();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!panel.hidden)close(true);else if(selected)finishWatching();}
  if(e.key==='Tab'&&!panel.hidden){const items=[...panel.querySelectorAll('button,a')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 });
 const gallery=document.getElementById('gallery');
 let selected=null,last=0,dragging=false,dragUntil=0;
 const visible=new Set();
 function preview(video){video.muted=true;video.loop=true;video.controls=false;if(visible.has(video)&&!reduced.matches&&!document.hidden)video.play().catch(()=>{});else video.pause();}
 function syncPreviews(){gallery.querySelectorAll('video').forEach(video=>{if(selected){if(video!==selected.video)video.pause();}else preview(video);});}
 function finishWatching(){
  if(!selected)return;const current=selected;selected=null;
  current.video.muted=true;current.video.loop=true;current.video.controls=false;
  current.button.hidden=false;current.exit.hidden=true;current.figure.classList.remove('is-watching');
  syncPreviews();
 }
 function watch(record){
  if(selected)finishWatching();selected=record;
  gallery.querySelectorAll('video').forEach(video=>video.pause());
  record.figure.classList.add('is-watching');record.button.hidden=true;record.exit.hidden=false;
  record.video.loop=false;record.video.muted=false;record.video.controls=true;
  record.video.currentTime=0;
  gallery.scrollTo({left:record.figure.offsetLeft-gallery.offsetLeft-(gallery.clientWidth-record.figure.offsetWidth)/2,behavior:reduced.matches?'instant':'smooth'});
  record.video.play().catch(()=>{});
 }
 gallery.addEventListener('pointerdown',()=>dragging=true);
 window.addEventListener('pointerup',()=>{dragging=false;dragUntil=performance.now()+900;});
 gallery.addEventListener('pointercancel',()=>{dragging=false;});
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>{if(isIntersecting)visible.add(target);else visible.delete(target);});syncPreviews();
 },{root:gallery,threshold:.2});
 fetch('/start/community.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(works=>{
  works.forEach(row=>{
   const figure=document.createElement('figure');figure.className='piece';
   const media=document.createElement('div');media.className='media';
   const video=document.createElement('video');video.src=row.url;video.poster=row.poster;video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-label',row.title);
   const button=document.createElement('button');button.className='watch-button';button.type='button';button.setAttribute('aria-label','Watch '+row.title+' with sound');
   const exit=document.createElement('button');exit.className='exit-watch';exit.type='button';exit.textContent='×';exit.hidden=true;exit.setAttribute('aria-label','Return to community browsing');
   const record={figure,video,button,exit};button.addEventListener('click',()=>watch(record));exit.addEventListener('click',finishWatching);
   video.addEventListener('ended',()=>{if(selected?.video===video)finishWatching();});
   const caption=document.createElement('figcaption'),label=document.createElement('span');label.textContent=row.title;caption.append(label);
   media.append(video,button,exit);figure.append(media,caption);gallery.append(figure);observer.observe(video);
  });
 }).catch(()=>{gallery.textContent='Community work is temporarily unavailable. Please refresh to try again.';});
 function frame(time){const dt=Math.min(time-last,40);last=time;if(!selected&&!dragging&&time>dragUntil&&!reduced.matches&&!document.hidden&&gallery.scrollWidth>gallery.clientWidth){if(gallery.scrollLeft>=gallery.scrollWidth-gallery.clientWidth-1)gallery.scrollLeft=0;else gallery.scrollLeft+=dt*.035;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)gallery.querySelectorAll('video').forEach(video=>video.pause());else if(selected)selected.video.play().catch(()=>{});else syncPreviews();});
})();
