(() => {
  'use strict';
  const gallery=document.getElementById('communityGallery');
  if(!gallery)return;
  const entries=[];

  function forcePlay(video){
    if(document.hidden || !video || video.dataset.failed==='1') return;
    video.muted=true;
    video.defaultMuted=true;
    video.loop=true;
    video.playsInline=true;
    video.autoplay=true;
    video.controls=false;
    const p=video.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
  }

  function keepPlaying(){
    if(document.hidden)return;
    for(const entry of entries)forcePlay(entry.video);
  }

  function add(row){
    const figure=document.createElement('figure');figure.className='community-piece';
    const inner=document.createElement('div');inner.className='community-piece-inner';
    const media=document.createElement('div');media.className='community-media';
    media.style.aspectRatio=String(row.width)+' / '+String(row.height);
    const caption=document.createElement('figcaption');
    const title=document.createElement('h3');title.textContent=row.title;caption.append(title);

    if(row.type==='image'){
      const img=new Image();
      img.src=row.src;img.alt=row.title;img.loading='lazy';img.decoding='async';
      img.width=row.width;img.height=row.height;media.append(img);
    }else{
      const video=document.createElement('video');
      const src='media/community/'+row.id+'.mp4?v=autoplay-4';
      const poster='media/community/'+row.id+'.webp?v=autoplay-4';
      video.src=src;
      video.poster=poster;
      video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
      video.autoplay=true;video.preload='auto';video.controls=false;
      video.disablePictureInPicture=true;
      video.width=row.width;video.height=row.height;
      video.setAttribute('aria-label',row.title);
      video.setAttribute('playsinline','');
      video.setAttribute('muted','');
      video.setAttribute('autoplay','');
      video.setAttribute('loop','');
      video.setAttribute('preload','auto');
      video.removeAttribute('controls');

      let retry=0;
      const play=()=>forcePlay(video);
      video.addEventListener('loadeddata',play);
      video.addEventListener('canplay',play);
      video.addEventListener('pause',()=>{ if(!document.hidden) setTimeout(play,80); });
      video.addEventListener('ended',()=>{ video.currentTime=0; play(); });
      video.addEventListener('error',()=>{
        if(retry<1){
          retry++;
          setTimeout(()=>{
            video.dataset.failed='0';
            video.src=src+'&retry=1';
            video.load();
            play();
          },250);
          return;
        }
        video.dataset.failed='1';
        const fallback=new Image();
        fallback.src=poster;fallback.alt=row.title;fallback.width=row.width;fallback.height=row.height;
        fallback.className='community-video-fallback';
        video.replaceWith(fallback);
      });

      entries.push({video});
      media.append(video);
      requestAnimationFrame(play);
    }

    inner.append(media,caption);figure.append(inner);gallery.append(figure);
  }

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)keepPlaying();});
  window.addEventListener('pageshow',keepPlaying);
  window.addEventListener('focus',keepPlaying);

  fetch('media/community/manifest.json?v=autoplay-4')
    .then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json();})
    .then(rows=>{
      const order=[19,16,18,17,9,8,6,7,5,4,2,3,1,15,14,12,13,10,11];
      for(const n of order){
        const row=rows.find(r=>r.id==='community-'+String(n).padStart(2,'0'));
        if(row)add(row);
      }
      requestAnimationFrame(keepPlaying);
      setTimeout(keepPlaying,350);
      setTimeout(keepPlaying,1100);
      setInterval(keepPlaying,2500);
    })
    .catch(()=>{
      const message=document.createElement('p');
      message.textContent='The gallery could not load. Please refresh to try again.';
      gallery.append(message);
    });
})();