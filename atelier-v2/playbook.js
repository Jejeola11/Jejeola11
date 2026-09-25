let completed = new Set();
function updateProgress(){const pct=Math.round(completed.size/3*100);document.querySelector('#progress-bar').style.width=pct+'%';document.querySelector('#progress-text').textContent=pct+'%';}
function startPlaybook(){document.querySelector('#lesson-content').scrollIntoView({behavior:'smooth'});}
function completeDay(day){completed.add(day);updateProgress();const card=document.querySelector(`[data-day="${day}"]`);if(card){card.style.borderColor='#DFFF4E';card.querySelector('.text-button').innerHTML='Day complete <span>✓</span>';}}
function markLesson(btn){btn.innerHTML='Lesson complete <span>✓</span>';btn.style.background='linear-gradient(110deg,#DFFF4E,#EEFFE0)';completeDay(1);}
document.querySelector('.mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>document.querySelector('.sidebar').classList.remove('open')));


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
    if(!owned.has('first-client-playbook')&&!owned.has('atelier-full')&&!owned.has('atelier-empire')){
      return deny('Your Playbook access is not active yet.','If you have purchased, please contact Coach Ria with the purchase email you used so your access can be added.','Back to Fuse Atelier');
    }
    body.classList.remove('checking-access');body.classList.add('access-ready');
  }catch(error){
    deny('We could not confirm your access.','Please reload once, or return to Fuse Atelier and sign in again.','Back to Fuse Atelier');
  }
})();