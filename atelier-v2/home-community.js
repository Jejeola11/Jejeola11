(() => {
'use strict';
const gallery=document.getElementById('communityGallery');if(!gallery)return;
const videos=new Set();
const observer=new IntersectionObserver(entries=>entries.forEach(({target:video,isIntersecting})=>{
if(isIntersecting&&!document.hidden){if(!video.src)video.src=video.dataset.src;video.play().catch(()=>{});}else video.pause();
}),{threshold:.15});
fetch('/start/community.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(rows=>{
for(const row of rows){
const figure=document.createElement('figure');figure.className='community-piece';
const inner=document.createElement('div');inner.className='community-piece-inner';
const media=document.createElement('div');media.className='community-media';
const video=document.createElement('video');video.dataset.src=row.url;video.poster=row.poster;video.muted=true;video.defaultMuted=true;video.loop=true;video.autoplay=true;video.playsInline=true;video.preload='none';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-label',row.title);
const caption=document.createElement('figcaption'),title=document.createElement('h3');title.textContent=row.title;caption.append(title);
media.append(video);inner.append(media,caption);figure.append(inner);gallery.append(figure);videos.add(video);observer.observe(video);
}
}).catch(()=>{gallery.textContent='Community work could not load. Please refresh to try again.';});
document.addEventListener('visibilitychange',()=>{for(const v of videos){if(document.hidden)v.pause();else{observer.unobserve(v);observer.observe(v);}}});
})();