(()=>{
if(window.__FUSE_HOME_INTERACTIONS__)return;window.__FUSE_HOME_INTERACTIONS__=true;const stage=document.getElementById('stage');if(!stage)return;let tries=0,lk='',la=0;
function deep(){try{let d=stage.contentDocument;for(let i=0;i<9&&d;i++){const n=d.getElementById('stage')||d.getElementById('app');if(!n||!n.contentDocument)break;d=n.contentDocument}return d}catch(_){return null}}
const go=u=>window.top.location.href=u;function once(k){const n=Date.now();if(k===lk&&n-la<520)return false;lk=k;la=n;return true}
function bind(d){if(!d||d.__FUSE_HOME_TAP_REPAIR__)return;d.__FUSE_HOME_TAP_REPAIR__=true;const h=e=>{const t=e.target.closest('button,.tool,.workflow-card,.hero-card,.lane-card');if(!t)return;const x=(t.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();let k='',u='';
if(t.matches('.next-move-btn')||t.matches('.resume-row button')||((t.closest('.learning-card')||t.closest('.quick .card:first-child'))&&x.includes('resume'))){k='resume';u='/atelier-v2/academy-v2.html?resume=video'}
else if(x.includes('explore academy')){k='academy-hero';u='/atelier-v2/academy-v2.html'}
else if(t.closest('.bottom')){if(x.includes('academy')){k='academy-nav';u='/atelier-v2/academy-v2.html'}else if(x.includes('clients')){k='clients-nav';u='/atelier-v2/clients.html'}else if(t.classList.contains('fab')||t.classList.contains('create')||x==='✦'){k='create-nav';u='/atelier-v2/create.html'}else return}
else if(t.matches('.openCreate,.tool,.workflow-card,.hero-card,.lane-card')||t.closest('.sheet-grid')){k='create';u='/atelier-v2/create.html'}
else if(x.includes('start creating')){k='create-start';u='/atelier-v2/create.html'}
else if(x.includes('find prospects')||t.matches('.offer-btn')){k='prospects';u='/atelier-v2/clients.html'}
else if(x==='library'||x.includes('open library')){k='library';u='/app/studio.html?view=library'}
else if(t.matches('.credit')||x.includes('credits')){k='credits';u='/app/studio.html?view=profile'}
if(!u)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();if(once(k))go(u)};
d.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')h(e)},true);d.addEventListener('click',h,true);const s=d.createElement('style');s.textContent='button,.tool,.workflow-card,.hero-card,.lane-card{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.next-move-btn,.resume-row button,.openCreate,.tool,.workflow-card,.lane-card{pointer-events:auto!important;cursor:pointer!important}';d.head.appendChild(s)}
function p(){tries++;const d=deep();if(d?.body)bind(d);if(tries<160)setTimeout(p,160)}stage.addEventListener('load',()=>setTimeout(p,260));setTimeout(p,500);
})();