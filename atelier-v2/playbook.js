(() => {
  const body=document.body;
  const storageKey='fuse-playbook-days';
  const getDone=()=>new Set(JSON.parse(localStorage.getItem(storageKey)||'[]'));
  const setDone=done=>localStorage.setItem(storageKey,JSON.stringify([...done]));
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
  const title=document.getElementById('accessTitle');
  const copy=document.getElementById('accessCopy');
  const action=document.getElementById('accessAction');
  function deny(head,message,buttonText){
    title.textContent=head;copy.textContent=message;action.textContent=buttonText||'Back to Fuse Atelier';action.classList.remove('hidden');body.classList.remove('checking-access');body.classList.add('access-denied');
  }
  try{
    const sb=supabase.createClient('https://rgbweaimkcndjznlazho.supabase.co','sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3');
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError||!session)return deny('Sign in to open your Playbook.','Use the same email address you used when completing your purchase.','Go to Fuse Atelier');
    const email=(session.user.email||'').trim().toLowerCase();
    if(email==='riadigitals0@gmail.com'){body.classList.remove('checking-access');body.classList.add('access-ready');return}
    const {data:unlocks,error}=await sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id);
    if(error)throw error;
    const owned=new Set((unlocks||[]).map(row=>row.module_key));
    if(!owned.has('first-client-playbook')&&!owned.has('atelier-full')&&!owned.has('atelier-empire')) return deny('Your Playbook access is not active yet.','If you have purchased, contact Coach Ria with the purchase email you used so your access can be added.');
    body.classList.remove('checking-access');body.classList.add('access-ready');
  }catch(error){deny('We could not confirm your access.','Please reload once, or return to Fuse Atelier and sign in again.')}
})();