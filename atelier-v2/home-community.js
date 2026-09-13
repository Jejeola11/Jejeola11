(() => {
  'use strict';
  const gallery = document.getElementById('communityGallery');
  const motionButton = document.getElementById('galleryMotion');
  if (!gallery || !motionButton) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches || Boolean(navigator.connection?.saveData);
  const entries = [];
  const icons = {
    play:'<path d="m8 4 12 8-12 8z"/>', pause:'<path d="M8 4v16M16 4v16"/>',
    muted:'<path d="m11 4-5 4H2v8h4l5 4zM16 9l6 6M22 9l-6 6"/>',
    sound:'<path d="m11 4-5 4H2v8h4l5 4zM15 8q5 4 0 8M18 4q9 8 0 16"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  function motionLabel() {motionButton.textContent=paused?'Play videos':'Pause videos';motionButton.setAttribute('aria-pressed',String(paused));}
  function load(entry) {
    if(entry.loaded) return;
    entry.loaded=true; entry.video.src=entry.src; entry.video.load();
  }
  function sync() {
    const candidates=entries.filter(e=>e.visible&&!e.manualPause&&!e.failed).sort((a,b)=>b.ratio-a.ratio);
    const active=new Set(!paused&&!document.hidden?candidates.slice(0,2):[]);
    for(const e of entries) {
      if(active.has(e)){load(e);if(e.video.paused)e.video.play().catch(()=>{e.play.innerHTML=icon('play');e.play.setAttribute('aria-label','Play '+e.title);});}
      else if(!e.video.paused)e.video.pause();
    }
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(changes=>{
    for(const c of changes){const e=entries.find(e=>e.figure===c.target);if(e){e.visible=c.isIntersecting&&c.intersectionRatio>=.25;e.ratio=c.intersectionRatio;}}
    sync();
  },{threshold:[0,.25,.5,.75,1]}) : null;
  function add(row) {
    const figure=document.createElement('figure');figure.className='community-piece';
    const inner=document.createElement('div');inner.className='community-piece-inner';
    const media=document.createElement('div');media.className='community-media';media.style.aspectRatio=String(row.width)+' / '+String(row.height);
    const caption=document.createElement('figcaption');const title=document.createElement('h3');title.textContent=row.title;caption.append(title);
    if(row.type==='image'){
      const img=new Image();img.src=row.src;img.alt=row.title;img.loading='lazy';img.decoding='async';img.width=row.width;img.height=row.height;media.append(img);
    }else{
      const video=document.createElement('video');video.poster='media/community/'+row.id+'.webp';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.width=row.width;video.height=row.height;video.setAttribute('aria-label',row.title);video.setAttribute('playsinline','');video.setAttribute('muted','');
      const actions=document.createElement('div');actions.className='media-actions';
      const play=document.createElement('button');play.type='button';play.innerHTML=icon('play');play.setAttribute('aria-label','Play '+row.title);
      const sound=document.createElement('button');sound.type='button';sound.innerHTML=icon('muted');sound.setAttribute('aria-label','Unmute '+row.title);sound.setAttribute('aria-pressed','false');
      const status=document.createElement('span');status.className='media-state';status.setAttribute('role','status');
      const e={figure,video,play,sound,title:row.title,src:'media/community/'+row.id+'.mp4',visible:false,ratio:0,loaded:false,manualPause:false,failed:false};entries.push(e);
      play.addEventListener('click',()=>{
        if(!video.paused){e.manualPause=true;video.pause();}
        else{e.manualPause=false;load(e);for(const other of entries)if(other!==e)other.video.pause();video.play().catch(()=>{status.textContent='Tap to retry';});}
      });
      sound.addEventListener('click',()=>{
        const unmute=video.muted;
        for(const other of entries){other.video.muted=true;other.sound.innerHTML=icon('muted');other.sound.setAttribute('aria-label','Unmute '+other.title);other.sound.setAttribute('aria-pressed','false');}
        video.muted=!unmute;sound.innerHTML=icon(unmute?'sound':'muted');sound.setAttribute('aria-label',(unmute?'Mute ':'Unmute ')+row.title);sound.setAttribute('aria-pressed',String(unmute));
      });
      video.addEventListener('playing',()=>{status.textContent='';play.innerHTML=icon('pause');play.setAttribute('aria-label','Pause '+row.title);});
      video.addEventListener('pause',()=>{play.innerHTML=icon('play');play.setAttribute('aria-label','Play '+row.title);});
      video.addEventListener('error',()=>{e.failed=true;status.textContent='Video unavailable';play.disabled=true;});
      actions.append(play,sound);media.append(video,actions,status);
    }
    inner.append(media,caption);figure.append(inner);gallery.append(figure);if(observer&&row.type!=='image')observer.observe(figure);
  }
  motionButton.addEventListener('click',()=>{paused=!paused;if(!paused)entries.forEach(e=>e.manualPause=false);motionLabel();sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;motionLabel();sync();});
  document.addEventListener('visibilitychange',sync);
  motionLabel();
  fetch('media/community/manifest.json').then(r=>{if(!r.ok)throw Error('Gallery unavailable');return r.json();}).then(rows=>{
    const order=[19,16,18,17,9,8,6,7,5,4,2,3,1,15,14,12,13,10,11];
    for(const n of order){const row=rows.find(r=>r.id==='community-'+String(n).padStart(2,'0'));if(row)add(row);}
  }).catch(()=>{const message=document.createElement('p');message.textContent='The gallery could not load. Please refresh to try again.';gallery.append(message);motionButton.hidden=true;});
})();
