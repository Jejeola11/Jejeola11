(() => {
  'use strict';
  const gallery = document.getElementById('communityGallery');
  if (!gallery) return;
  const entries = [];
  function sync() {
    for (const e of entries) {
      const shouldPlay = e.visible && !document.hidden && !e.failed;
      if (shouldPlay) {
        if (e.video.paused) e.video.play().catch(() => {});
      } else if (!e.video.paused) {
        e.video.pause();
      }
    }
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(changes => {
    for (const c of changes) {
      const e = entries.find(e => e.figure === c.target);
      if (e) e.visible = c.isIntersecting && c.intersectionRatio >= .18;
    }
    sync();
  }, {threshold:[0,.18,.35,.6,1]}) : null;

  function add(row) {
    const figure=document.createElement('figure');figure.className='community-piece';
    const inner=document.createElement('div');inner.className='community-piece-inner';
    const media=document.createElement('div');media.className='community-media';media.style.aspectRatio=String(row.width)+' / '+String(row.height);
    const caption=document.createElement('figcaption');const title=document.createElement('h3');title.textContent=row.title;caption.append(title);
    if(row.type==='image'){
      const img=new Image();img.src=row.src;img.alt=row.title;img.loading='lazy';img.decoding='async';img.width=row.width;img.height=row.height;media.append(img);
    } else {
      const video=document.createElement('video');
      video.src='media/community/'+row.id+'.mp4';
      video.poster='media/community/'+row.id+'.webp';
      video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.preload='metadata';
      video.width=row.width;video.height=row.height;
      video.setAttribute('aria-label',row.title);video.setAttribute('playsinline','');video.setAttribute('muted','');video.setAttribute('autoplay','');
      const status=document.createElement('span');status.className='media-state';status.setAttribute('role','status');
      const e={figure,video,title:row.title,visible:false,failed:false};entries.push(e);
      video.addEventListener('playing',()=>{status.textContent='';});
      video.addEventListener('error',()=>{e.failed=true;status.textContent='Video unavailable';});
      media.append(video,status);
    }
    inner.append(media,caption);figure.append(inner);gallery.append(figure);
    if(observer && row.type!=='image') observer.observe(figure);
  }

  document.addEventListener('visibilitychange',sync);
  fetch('media/community/manifest.json').then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json();}).then(rows=>{
    const order=[19,16,18,17,9,8,6,7,5,4,2,3,1,15,14,12,13,10,11];
    for(const n of order){const row=rows.find(r=>r.id==='community-'+String(n).padStart(2,'0'));if(row)add(row);}
    requestAnimationFrame(sync);
  }).catch(()=>{
    const message=document.createElement('p');message.textContent='The gallery could not load. Please refresh to try again.';gallery.append(message);
  });
})();