(()=>{
  const video=document.getElementById('riaHologram'),listen=document.getElementById('riaListen'),pause=document.getElementById('riaPause');
  if(!video)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let started=false;
  const load=()=>{if(!video.getAttribute('src')){video.src=video.dataset.src;video.load()}};
  function sync(){pause.textContent=video.paused?'Play':'Pause';pause.setAttribute('aria-label',video.paused?'Play introduction':'Pause introduction');listen.textContent=video.muted?'Hear from Ria':'Mute audio'}
  async function play(){load();try{await video.play()}catch{sync()}}
  listen.addEventListener('click',()=>{load();video.muted=!video.muted;if(!video.muted){video.currentTime=0;play()}sync()});
  pause.addEventListener('click',()=>{if(video.paused){if(video.ended)video.currentTime=0;play()}else{video.pause()}});
  video.addEventListener('play',sync);video.addEventListener('pause',sync);video.addEventListener('ended',()=>{sync();pause.textContent='Replay';pause.setAttribute('aria-label','Replay introduction')});
  const io=new IntersectionObserver(entries=>{const visible=entries[0].isIntersecting;if(visible&&!started&&!reduced.matches){started=true;play()}else if(!visible)video.pause()},{threshold:.35});io.observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()});
  reduced.addEventListener('change',()=>{if(reduced.matches)video.pause()});
  sync();
})();
