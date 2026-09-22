let completed = new Set();
function updateProgress(){const pct=Math.round(completed.size/3*100);document.querySelector('#progress-bar').style.width=pct+'%';document.querySelector('#progress-text').textContent=pct+'%';}
function startPlaybook(){document.querySelector('#lesson-content').scrollIntoView({behavior:'smooth'});}
function completeDay(day){completed.add(day);updateProgress();const card=document.querySelector(`[data-day="${day}"]`);if(card){card.style.borderColor='#DFFF4E';card.querySelector('.text-button').innerHTML='Day complete <span>✓</span>';}}
function markLesson(btn){btn.innerHTML='Lesson complete <span>✓</span>';btn.style.background='linear-gradient(110deg,#DFFF4E,#EEFFE0)';completeDay(1);}
document.querySelector('.mobile-menu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach(item=>item.addEventListener('click',()=>document.querySelector('.sidebar').classList.remove('open')));
