(() => {
  const body=document.body;
  const storageKey='fuse-playbook-days';
  const getDone=()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');return new Set(Array.isArray(saved)?saved:[])}catch(error){localStorage.removeItem(storageKey);return new Set()}};
  const setDone=done=>{try{localStorage.setItem(storageKey,JSON.stringify([...done]))}catch(error){}};
  function renderProgress(){
    const done=getDone(); const percent=Math.round((done.size/7)*100);
    document.getElementById('progressBar').style.width=percent+'%';
    document.getElementById('progressText').textContent=percent+'% complete';
    document.querySelectorAll('.day-section').forEach(section=>{
      const day=section.dataset.day; const button=section.querySelector('.complete-day');
      if(done.has(day)){button.classList.add('done');button.textContent='Day '+day+' complete ✓';}
    });
  }
  document.querySelectorAll('.complete-day').forEach(button=>button.addEventListener('click',()=>{
    const section=button.closest('.day-section');const day=section.dataset.day;const done=getDone();
    done.has(day)?done.delete(day):done.add(day);setDone(done);renderProgress();
  }));
  const menu=document.querySelector('.menu-toggle');const sidebar=document.querySelector('.sidebar');
  menu.addEventListener('click',()=>sidebar.classList.toggle('open'));
  document.querySelectorAll('.day-nav a').forEach(link=>link.addEventListener('click',()=>sidebar.classList.remove('open')));
  renderProgress();
})();

(async function guardPlaybookAccess(){
  const body=document.body;
  // The Playbook itself must remain usable even when an auth service is slow or unavailable.
  if(!body.classList.contains('checking-access')) return;
  const title=document.getElementById('accessTitle');
  const copy=document.getElementById('accessCopy');
  const action=document.getElementById('accessAction');
  let resolved=false;
  const finish=(state,head,message,buttonText,href)=>{
    if(resolved) return;
    resolved=true;
    window.clearTimeout(failsafe);
    body.classList.remove('checking-access');
    if(state==='ready'){
      body.classList.add('access-ready');
      return;
    }
    body.classList.add('access-denied');
    title.textContent=head;
    copy.textContent=message;
    action.textContent=buttonText;
    action.href=href;
    action.classList.remove('hidden');
  };
  const deny=(head,message,buttonText='Back to Fuse Atelier',href='/atelier-v2/home.html')=>finish('denied',head,message,buttonText,href);
  const failsafe=window.setTimeout(()=>{
    deny('We could not finish the access check.','Your session did not respond in time. Please try once more; you will not be left waiting here.','Try again',window.location.href);
  },5000);
  try{
    if(!window.supabase||typeof window.supabase.createClient!=='function'){
      throw new Error('Supabase did not load');
    }
    const sb=window.supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3');
    const sessionResult=await Promise.race([
      sb.auth.getSession(),
      new Promise((_,reject)=>window.setTimeout(()=>reject(new Error('Session check timed out')),3500))
    ]);
    const session=sessionResult&&sessionResult.data&&sessionResult.data.session;
    if(sessionResult.error||!session){
      return deny('Sign in to open your Playbook.','Use the same email address you used when completing your purchase.','Go to Fuse Atelier');
    }
    const email=(session.user.email||'').trim().toLowerCase();
    if(email==='riadigitals0@gmail.com'){
      return finish('ready');
    }
    const unlockResult=await Promise.race([
      sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id),
      new Promise((_,reject)=>window.setTimeout(()=>reject(new Error('Access check timed out')),3500))
    ]);
    if(unlockResult.error) throw unlockResult.error;
    const owned=new Set((unlockResult.data||[]).map(row=>row.module_key));
    if(!owned.has('first-client-playbook')&&!owned.has('money')&&!owned.has('atelier-full')&&!owned.has('atelier-empire')){
      return deny('Your Playbook access is not active yet.','If you have purchased, contact Coach Ria with the purchase email you used so your access can be added.');
    }
    finish('ready');
  }catch(error){
    deny('We could not confirm your access.','Please try again. If it still does not open, return to Fuse Atelier and sign in again.','Try again',window.location.href);
  }
})();

// Day 2 WhatsApp-style voice note
document.querySelectorAll('[data-audio-player]').forEach(player=>{
  const audio=player.querySelector('audio'), play=player.querySelector('.voice-play'), wave=player.querySelector('.voice-wave'), time=player.querySelector('.voice-time'), bars=[...wave.querySelectorAll('i')];
  const format=seconds=>{ if(!Number.isFinite(seconds)) return '0:00'; const mins=Math.floor(seconds/60); return mins+':'+String(Math.floor(seconds%60)).padStart(2,'0'); };
  const render=()=>{
    const ratio=audio.duration?audio.currentTime/audio.duration:0;
    bars.forEach((bar,index)=>bar.classList.toggle('played',index<(ratio*bars.length)));
    wave.setAttribute('aria-valuenow',String(Math.round(ratio*100)));
    time.textContent=format(audio.currentTime);
  };
  const setState=playing=>{
    play.classList.toggle('is-playing',playing);wave.classList.toggle('is-playing',playing);
    play.setAttribute('aria-label',playing?'Pause Day 2 voice note':'Play Day 2 voice note');
  };
  play.addEventListener('click',async()=>{if(audio.paused){try{await audio.play()}catch(e){}}else audio.pause();});
  audio.addEventListener('play',()=>setState(true));audio.addEventListener('pause',()=>setState(false));audio.addEventListener('ended',()=>{setState(false);render();});audio.addEventListener('timeupdate',render);audio.addEventListener('loadedmetadata',render);
  wave.addEventListener('click',event=>{if(!audio.duration)return;const box=wave.getBoundingClientRect();audio.currentTime=Math.max(0,Math.min(audio.duration,((event.clientX-box.left)/box.width)*audio.duration));render();});
});
