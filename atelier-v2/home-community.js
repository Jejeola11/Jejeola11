(() => {
'use strict';
const gallery=document.getElementById('communityGallery');if(!gallery)return;
const videos=new Set(),visible=new Set();let selected=null;
function sync(){for(const v of videos){if(document.hidden||!visible.has(v)||(selected&&selected!==v)){v.pause();continue;}if(!v.src)v.src=v.dataset.src;v.play().catch(()=>{});}}
function finish(){if(!selected)return;const v=selected;selected=null;v.muted=true;v.loop=true;v.controls=false;v.parentElement.querySelector('.community-watch').hidden=false;v.parentElement.querySelector('.community-close').hidden=true;sync();}
document.addEventListener('keydown',e=>{if(e.key==='Escape')finish();});
const observer=new IntersectionObserver(entries=>entries.forEach(({target:video,isIntersecting})=>{
if(isIntersecting)visible.add(video);else{visible.delete(video);if(selected===video)finish();}sync();
}),{threshold:.15});
fetch('/start/community.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(rows=>{
for(const row of rows){
const figure=document.createElement('figure');figure.className='community-piece';
const inner=document.createElement('div');inner.className='community-piece-inner';
const media=document.createElement('div');media.className='community-media';
const video=document.createElement('video');video.dataset.src=row.url;video.poster=row.poster;video.muted=true;video.defaultMuted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.preload='none';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-label',row.title);
const caption=document.createElement('figcaption'),title=document.createElement('h3');title.textContent=row.title;caption.append(title);
const button=document.createElement('button');button.type='button';button.className='community-watch';button.setAttribute('aria-label','Watch '+row.title+' with sound');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7z"/></svg>';
const close=document.createElement('button');close.type='button';close.className='community-close';close.textContent='×';close.setAttribute('aria-label','Return to muted previews');close.hidden=true;
button.addEventListener('click',()=>{finish();selected=video;for(const v of videos)v.pause();if(!video.src)video.src=video.dataset.src;video.muted=false;video.loop=false;video.controls=true;video.currentTime=0;button.hidden=true;close.hidden=false;video.play().catch(()=>{finish();});});
close.addEventListener('click',finish);video.addEventListener('ended',()=>{if(selected===video)finish();});
media.append(video,button,close);inner.append(media,caption);figure.append(inner);gallery.append(figure);videos.add(video);observer.observe(video);
}
}).catch(()=>{gallery.textContent='Community work could not load. Please refresh to try again.';});
document.addEventListener('visibilitychange',()=>{for(const v of videos){if(document.hidden)v.pause();else{observer.unobserve(v);observer.observe(v);}}});
})();