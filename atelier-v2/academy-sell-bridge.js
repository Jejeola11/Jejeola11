(()=>{
'use strict';
const stage=document.getElementById('stage');
if(!stage)return;
const COURSE_LABELS={
 design:'Flyer & Campaign Design',
 video:'AI UGC & Influencer',
 landing:'Landing Page Design',
 money:'The Money Engine System'
};
function doc(){try{return stage.contentDocument}catch(_){return null}}
function win(){try{return stage.contentWindow}catch(_){return null}}
function currentCourseKey(d){
 const active=d.querySelector('.course-view.active');
 if(!active)return'';
 const title=(active.querySelector('.course-copy h1')?.textContent||'').trim().toLowerCase();
 if(title.includes('design & flyers'))return'design';
 if(title.includes('ugc')||title.includes('influencer'))return'video';
 if(title.includes('landing page'))return'landing';
 if(title.includes('money engine'))return'money';
 return'';
}
function clientsUrl(key){
 const params=new URLSearchParams({from:'academy'});
 if(key){params.set('skill',key);params.set('service',COURSE_LABELS[key]||key)}
 if(key==='money')params.set('sprint','50');
 return '/atelier-v2/clients.html?'+params.toString();
}
function inject(d,w){
 const view=d.querySelector('.course-view.active');
 if(!view)return;
 const key=currentCourseKey(d);if(!key)return;
 const copy=view.querySelector('.course-copy');if(!copy)return;
 let box=copy.querySelector('.sell-bridge');
 if(!box){box=d.createElement('div');box.className='sell-bridge';copy.appendChild(box)}
 const money=key==='money';
 box.innerHTML=`<div><span>${money?'MONEY ENGINE':'SELL THIS SKILL'}</span><b>${money?'Build your 50-prospect pipeline':'Turn this course into client outreach'}</b><small>${money?'Add qualified prospects, attach samples, pitch and track follow-ups inside Fuse Clients.':'Carry the skill you are learning into Fuse Clients and start building a prospect list.'}</small></div><button type="button">${money?'Start 50-prospect sprint':'Find clients for this skill'} →</button>`;
 box.querySelector('button').onclick=()=>{try{w.top.location.href=clientsUrl(key)}catch(_){location.href=clientsUrl(key)}};
}
function styles(d){if(d.getElementById('fuseSellBridgeStyle'))return;const s=d.createElement('style');s.id='fuseSellBridgeStyle';s.textContent=`.sell-bridge{margin-top:11px;padding:12px;border-radius:15px;border:1px solid rgba(186,255,99,.2);background:linear-gradient(135deg,rgba(255,229,104,.055),rgba(186,255,99,.045));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.sell-bridge span{display:block;font-size:6.5px;letter-spacing:.13em;color:#baff63;font-weight:950}.sell-bridge b{display:block;font-size:10px;margin-top:3px}.sell-bridge small{display:block;color:#8ea49b;font-size:7px;line-height:1.4;margin-top:3px}.sell-bridge button{border:0;border-radius:11px;background:linear-gradient(105deg,#ffe568,#baff63 78%,#fff 145%);color:#07120f;padding:9px 10px;font-size:7px;font-weight:950;white-space:nowrap}@media(max-width:620px){.sell-bridge{grid-template-columns:1fr;padding:11px}.sell-bridge button{width:100%;padding:10px}}`;d.head.appendChild(s)}
function patch(){const d=doc(),w=win();if(!d||!w)return;styles(d);inject(d,w)}
stage.addEventListener('load',()=>{setTimeout(patch,500);setTimeout(()=>{const d=doc();if(!d)return;new MutationObserver(patch).observe(d.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})},800)});
setInterval(patch,900);
})();
