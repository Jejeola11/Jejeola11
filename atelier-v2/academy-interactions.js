(()=>{
if(window.__FUSE_ACADEMY_INTERACTIONS__)return;window.__FUSE_ACADEMY_INTERACTIONS__=true;
const TOP=(()=>{try{return window.top||window}catch(_){return window}})(),CREATE='/atelier-v2/create.html',CLIENTS='/atelier-v2/clients.html',PROFILE='/app/studio.html?view=profile';let lk='',la=0;
const go=u=>{try{TOP.location.href=u}catch(_){location.href=u}};
function create(x={}){const u=new URL(CREATE,location.origin);u.searchParams.set('source','academy');Object.entries(x).forEach(([k,v])=>{if(v!=null&&String(v).trim())u.searchParams.set(k,String(v))});go(u.pathname+u.search)}
const ctx=()=>({lessonTitle:document.querySelector('.lesson-view.active .lesson-meta h1')?.textContent?.trim()||'',context:document.querySelector('.lesson-view.active .lesson-progress-copy b')?.textContent?.trim()||''});
function once(k){const n=Date.now();if(k===lk&&n-la<520)return false;lk=k;la=n;return true}
function flash(b,m){const o=b.textContent;b.textContent=m;setTimeout(()=>{if(b.isConnected)b.textContent=o},1200)}
async function cp(b){const t=b.closest('.prompt-box')?.querySelector('p')?.textContent?.trim()||'';if(!t)return flash(b,'No prompt attached');try{await navigator.clipboard.writeText(t);flash(b,'Copied ✓')}catch(_){flash(b,'Copy unavailable')}}
function act(target,e){const b=target.closest('button,.system-card,.quick,.path-card,.lesson-row');if(!b)return;let k='',fn=null;
if(b.id==='continueLearningBtn'){k='resume';fn=()=>resumeCourse?.('video')}
else if(b.matches('.bottom .create')){k='create-nav';fn=()=>create({intent:'create'})}
else if(b.closest('.bottom')){const t=(b.textContent||'').toLowerCase();if(t.includes('clients')){k='clients';fn=()=>go(CLIENTS)}else if(t.includes('profile')){k='profile';fn=()=>go(PROFILE)}else if(t.includes('academy')){k='academy';fn=()=>showHome?.()}else if(t.includes('home')){k='home';fn=()=>go('/atelier-v2/')}}
else if(b.matches('.top .credit,.top .avatar')){k='account';fn=()=>go(PROFILE)}
else if(b.matches('.lesson-row')){k='lesson'+b.dataset.course+b.dataset.mi+b.dataset.li;fn=()=>openLesson?.(b.dataset.course,+b.dataset.mi,+b.dataset.li)}
else if(b.closest('[data-open]')){const x=b.closest('[data-open]');k='course'+x.dataset.open;fn=()=>openCourse?.(x.dataset.open)}
else if(b.closest('.system-card')){const t=(b.closest('.system-card').textContent||'').toLowerCase();if(t.includes('learn the skill')){k='learn';fn=()=>resumeCourse?.('video')}else if(t.includes('create the proof')){k='proof';fn=()=>create({intent:'proof'})}else if(t.includes('money engine')){k='money';fn=()=>openCourse?.('money')}}
else if(b.matches('.next-actions .primary')){k='lesson-create';fn=()=>create({...ctx(),intent:'lesson-proof'})}
else if(b.matches('.prompt-actions .secondary')){k='prompt-create';fn=()=>create({...ctx(),intent:'prompt'})}
else if(b.matches('.prompt-actions .primary')){k='prompt-copy';fn=()=>cp(b)}
if(!fn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(once(k))fn()}
document.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')act(e.target,e)},true);document.addEventListener('click',e=>act(e.target,e),true);
setTimeout(()=>{let q;try{q=new URLSearchParams(TOP.location.search||location.search)}catch(_){q=new URLSearchParams(location.search)}const r=(q.get('resume')||'').trim(),c=(q.get('course')||'').trim();if(r&&realCourse?.(r))resumeCourse?.(r);else if(c&&realCourse?.(c))openCourse?.(c)},180);
const s=document.createElement('style');s.textContent='button,.path-card,.quick,.system-card,.lesson-row{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.system-card,.system-go,.quick,.path-card{cursor:pointer}.bottom .nav,.bottom .create{pointer-events:auto!important}';document.head.appendChild(s);
})();