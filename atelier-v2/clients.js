(()=>{
'use strict';
const SUPABASE_URL='https://rgbweaimkcndjznlazho.supabase.co';
const SUPABASE_KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const STAGES=[
  {key:'new',label:'New'},
  {key:'qualified',label:'Audited'},
  {key:'contacted',label:'Contacted'},
  {key:'replied',label:'Replied'},
  {key:'loom_sent',label:'Loom sent'},
  {key:'proposal_sent',label:'Proposal'},
  {key:'won',label:'Won'},
  {key:'lost',label:'Lost'}
];
const state={session:null,prospects:[],proposals:[],looms:[],retainers:[],jobs:[],activities:[],view:'overview',pipeline:'all',search:'',selected:null,agentOutput:null,retainerProspect:null,busy:false};
let toastTimer;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg,bad=false){const el=$('toast');el.textContent=msg;el.className='toast show'+(bad?' bad':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',3000)}
function normalizeStatus(s='new'){
  const map={sample_ready:'qualified',pitched:'contacted',follow_up:'contacted',proposal_ready:'qualified',loom_ready:'qualified',audit_ready:'qualified'};
  return map[s]||s||'new';
}
function stageLabel(s){const k=normalizeStatus(s);return STAGES.find(x=>x.key===k)?.label||k}
function fmtDate(v,withTime=false){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return d.toLocaleString([],withTime?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',year:'numeric'})}
function fmtMoney(value,currency='USD'){const n=Number(value||0);try{return new Intl.NumberFormat(currency==='NGN'?'en-NG':'en-US',{style:'currency',currency,maximumFractionDigits:0}).format(n)}catch{return `${currency} ${n.toLocaleString()}`}}
function cleanUrl(v){try{const u=new URL(String(v||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}
function phoneUrl(v){const n=String(v||'').replace(/[^\d+]/g,'').replace(/^\+/,'');return n?'https://wa.me/'+n:''}
function apiHeaders(){return state.session?{Authorization:'Bearer '+state.session.access_token,'Content-Type':'application/json'}:{'Content-Type':'application/json'}}
async function api(name,body){const r=await fetch('/api/'+name,{method:'POST',headers:apiHeaders(),body:JSON.stringify(body||{}),signal:AbortSignal.timeout(60000)});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||'Request failed.');e.code=d.code;e.data=d;throw e}return d}
function openOverlay(id){const el=$(id);el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeOverlay(id){const el=$(id);el.classList.remove('open');el.setAttribute('aria-hidden','true');if(!document.querySelector('.overlay.open'))document.body.style.overflow=''}
function copyText(text){if(!text)return;navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>toast('Could not copy.',true))}

async function boot(){
  const {data,error}=await sb.auth.getSession();
  if(error||!data.session){location.href='login.html';return}
  state.session=data.session;
  await loadAll();
  bind();
  applyQuery();
}
async function loadAll(){
  const uid=state.session.user.id;
  const [p,pr,l,r,j,a]=await Promise.all([
    sb.from('client_prospects').select('*').eq('user_id',uid).order('updated_at',{ascending:false}),
    sb.from('client_proposals').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    sb.from('client_loom_scripts').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    sb.from('client_retainers').select('*').eq('user_id',uid).order('updated_at',{ascending:false}),
    sb.from('client_automation_jobs').select('*').eq('user_id',uid).order('next_run_at',{ascending:true}),
    sb.from('client_activities').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
  ]);
  for(const x of [p,pr,l,r,j,a])if(x.error)throw x.error;
  state.prospects=p.data||[];state.proposals=pr.data||[];state.looms=l.data||[];state.retainers=r.data||[];state.jobs=j.data||[];state.activities=a.data||[];
  renderAll();
  window.Fuse?.balance?.().catch(()=>{});
}
function renderAll(){renderStats();renderToday();renderActivities();renderProspects();renderPipeline();renderClients();renderJobs()}
function setView(name){
  state.view=name;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.dataset.panel===name));
  try{history.replaceState(null,'',location.pathname+'?view='+encodeURIComponent(name))}catch{}
}
function applyQuery(){const q=new URLSearchParams(location.search);const v=q.get('view');if(['overview','prospects','pipeline','clients','automation'].includes(v))setView(v);const open=q.get('open');if(open&&state.prospects.some(x=>x.id===open))openDetail(open)}

function renderStats(){
  const won=state.prospects.filter(x=>normalizeStatus(x.status)==='won').length;
  const active=state.retainers.filter(x=>x.status==='active');
  const ready=state.prospects.filter(x=>['new','qualified'].includes(normalizeStatus(x.status))).length;
  const proposals=state.prospects.filter(x=>normalizeStatus(x.status)==='proposal_sent').length;
  let mrr='—';
  if(active.length){const groups={};active.forEach(x=>groups[x.currency||'USD']=(groups[x.currency||'USD']||0)+Number(x.monthly_fee||0));const entries=Object.entries(groups);mrr=entries.length===1?fmtMoney(entries[0][1],entries[0][0]):active.length+' clients'}
  $('stats').innerHTML=`<div class="stat"><b>${state.prospects.length}</b><span>Prospects</span></div><div class="stat"><b>${ready}</b><span>Ready to work</span></div><div class="stat"><b>${proposals}</b><span>Proposal stage</span></div><div class="stat mrr"><b>${esc(mrr)}</b><span>Tracked MRR · ${won} won</span></div>`;
}
function nextAction(p){
  const s=normalizeStatus(p.status);
  if(s==='new')return {label:'Run audit',note:'Qualify the visible opportunity',action:'audit'};
  if(s==='qualified'&&!p.pitch_email&&!p.pitch_instagram)return {label:'Write outreach',note:'Create the ask-first opener',action:'outreach'};
  if(s==='qualified')return {label:'Mark contacted',note:'Send your first message',status:'contacted'};
  if(s==='contacted')return {label:'Follow up',note:p.next_follow_up?'Due '+fmtDate(p.next_follow_up,true):'Set / send follow-up',status:'contacted'};
  if(s==='replied')return {label:'Build Loom',note:'Make the personalised 60–90s walkthrough',action:'loom'};
  if(s==='loom_sent')return {label:'Create proposal',note:'Turn the audit into a monthly scope',action:'proposal'};
  if(s==='proposal_sent')return {label:'Close retainer',note:'Convert the accepted deal to monthly',retainer:true};
  if(s==='won')return {label:'Client active',note:'Delivery is tracked in Clients'};
  return {label:'Open',note:'Review this prospect'};
}
function renderToday(){
  const priority=[...state.prospects].filter(p=>!['won','lost'].includes(normalizeStatus(p.status))).sort((a,b)=>{
    const ar=a.next_follow_up&&new Date(a.next_follow_up)<=new Date()?1000:0,br=b.next_follow_up&&new Date(b.next_follow_up)<=new Date()?1000:0;
    return (br+Number(b.opportunity_score||0))-(ar+Number(a.opportunity_score||0));
  }).slice(0,4);
  const root=$('today');
  if(!priority.length){root.innerHTML='<div class="empty"><b>Your action list is clear.</b>Find prospects to start the acquisition workflow.</div>';return}
  root.innerHTML=priority.map(p=>{const n=nextAction(p);return `<div class="activity-card"><i class="activity-dot"></i><div style="min-width:0;flex:1"><b>${esc(n.label)} · ${esc(p.brand_name)}</b><p>${esc(n.note)}</p></div><button class="mini hot" data-today="${p.id}">Open</button></div>`}).join('');
  root.querySelectorAll('[data-today]').forEach(b=>b.onclick=()=>openDetail(b.dataset.today));
}
function renderActivities(){
  const root=$('activities');
  if(!state.activities.length){root.innerHTML='<div class="empty"><b>No agent activity yet.</b>Your audits, outreach, proposals and automation runs will appear here.</div>';return}
  root.innerHTML=state.activities.slice(0,6).map(a=>`<div class="activity-card"><i class="activity-dot"></i><div><b>${esc(a.title)}</b><p>${esc(a.body||a.activity_type)} · ${esc(fmtDate(a.created_at,true))}</p></div></div>`).join('');
}
function prospectCard(p){
  const rating=p.rating!=null?`${Number(p.rating).toFixed(1)} ★`:'';
  const reviews=p.review_count!=null?`${p.review_count} reviews`:'';
  const s=normalizeStatus(p.status);
  return `<article class="prospect"><div><h3>${esc(p.brand_name)}</h3><div class="meta">${esc([p.niche,p.location].filter(Boolean).join(' · ')||'Prospect')}</div><div class="badges"><span class="badge hot">${esc(stageLabel(s))}</span>${rating?`<span class="badge">${esc(rating)}</span>`:''}${reviews?`<span class="badge">${esc(reviews)}</span>`:''}${p.website?'':`<span class="badge warn">No website listed</span>`}</div>${p.visible_problem?`<div class="problem">${esc(p.visible_problem)}</div>`:''}</div><div class="prospect-side"><div class="score">${Number(p.opportunity_score||0)}<small>/100</small></div><button class="open-btn" data-open="${p.id}">Open</button></div></article>`;
}
function renderProspects(){
  const q=state.search.trim().toLowerCase();let rows=state.prospects;
  if(q)rows=rows.filter(p=>[p.brand_name,p.niche,p.location,p.contact_name,p.visible_problem,p.service].some(v=>String(v||'').toLowerCase().includes(q)));
  const root=$('prospectList');
  root.innerHTML=rows.length?rows.map(prospectCard).join(''):'<div class="empty"><b>No prospects yet.</b>Find businesses from Google or add one manually.</div>';
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
}
function stageCounts(){const out={};STAGES.forEach(s=>out[s.key]=0);state.prospects.forEach(p=>{const s=normalizeStatus(p.status);out[s]=(out[s]||0)+1});return out}
function renderPipeline(){
  const counts=stageCounts();
  $('pipelineStages').innerHTML=STAGES.map(s=>`<button class="stage ${state.pipeline===s.key?'active':''}" data-stage="${s.key}"><i></i><b>${counts[s.key]||0}</b><span>${esc(s.label)}</span></button>`).join('');
  $('pipelineStages').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{state.pipeline=state.pipeline===b.dataset.stage?'all':b.dataset.stage;renderPipeline()});
  const rows=state.pipeline==='all'?state.prospects:state.prospects.filter(p=>normalizeStatus(p.status)===state.pipeline);
  const root=$('pipelineList');root.innerHTML=rows.length?rows.map(prospectCard).join(''):'<div class="empty"><b>No deals in this stage.</b>Move prospects forward from their detail page.</div>';
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
}
function renderClients(){
  const root=$('clientList');
  if(!state.retainers.length){root.innerHTML='<div class="empty"><b>No monthly clients yet.</b>When a prospect says yes, start the retainer from their proposal stage.</div>';return}
  root.innerHTML=state.retainers.map(r=>{const p=state.prospects.find(x=>x.id===r.prospect_id);const jobs=state.jobs.filter(x=>x.retainer_id===r.id&&x.status==='active').length;return `<article class="client-card"><div class="client-top"><div><h3>${esc(r.client_name)}</h3><div class="meta">${esc(r.service||'Monthly service')} · ${jobs} active job${jobs===1?'':'s'}</div></div><div class="money">${esc(fmtMoney(r.monthly_fee,r.currency))}/mo</div></div><div class="badges"><span class="badge hot">${esc(r.status)}</span><span class="badge">Billing day ${r.billing_day}</span>${r.payment_method?`<span class="badge">${esc(r.payment_method)}</span>`:''}</div>${p?`<div class="job-actions"><button class="mini" data-client-open="${p.id}">Open client</button><button class="mini hot" data-client-jobs="${r.id}">Automation</button></div>`:''}</article>`}).join('');
  root.querySelectorAll('[data-client-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.clientOpen));
  root.querySelectorAll('[data-client-jobs]').forEach(b=>b.onclick=()=>setView('automation'));
}
function resultSummary(result){
  if(!result||typeof result!=='object'||!Object.keys(result).length)return'';
  const lines=[];if(result.title)lines.push(result.title);if(result.copy)lines.push(result.copy);if(result.guidance)lines.push(result.guidance);if(result.summary)lines.push(result.summary);
  for(const key of ['checklist','templates','sections'])if(Array.isArray(result[key])){lines.push(...result[key].slice(0,8).map(x=>typeof x==='string'?'• '+x:'• '+(x.title||x.text||JSON.stringify(x))))}
  return lines.join('\n\n');
}
function renderJobs(){
  const root=$('jobList');
  if(!state.jobs.length){root.innerHTML='<div class="empty"><b>No recurring jobs yet.</b>Win a client and start a retainer. Fuse will create the default delivery workflow automatically.</div>';return}
  root.innerHTML=state.jobs.map(j=>{const p=state.prospects.find(x=>x.id===j.prospect_id),summary=resultSummary(j.last_result);return `<article class="job-card"><div class="job-top"><div><h3>${esc(j.name)}</h3><div class="meta">${esc(p?.brand_name||'Client')} · ${esc(j.frequency)} · next ${esc(fmtDate(j.next_run_at,true)||'not scheduled')}</div></div><span class="badge ${j.status==='active'?'hot':''}">${esc(j.status)}</span></div>${summary?`<div class="job-result">${esc(summary)}</div>`:''}<div class="job-actions"><button class="mini hot" data-run-job="${j.id}" ${j.status!=='active'?'disabled':''}>Run now</button><button class="mini" data-toggle-job="${j.id}">${j.status==='active'?'Pause':'Resume'}</button></div></article>`}).join('');
  root.querySelectorAll('[data-run-job]').forEach(b=>b.onclick=()=>runJob(b.dataset.runJob,b));
  root.querySelectorAll('[data-toggle-job]').forEach(b=>b.onclick=()=>toggleJob(b.dataset.toggleJob,b));
}

function latestProposal(id){return state.proposals.find(x=>x.prospect_id===id)||null}
function latestLoom(id){return state.looms.find(x=>x.prospect_id===id)||null}
function linkButtons(p){const links=[];if(cleanUrl(p.maps_url))links.push(`<a class="mini" href="${esc(cleanUrl(p.maps_url))}" target="_blank" rel="noopener">Google Maps</a>`);if(cleanUrl(p.website))links.push(`<a class="mini" href="${esc(cleanUrl(p.website))}" target="_blank" rel="noopener">Website</a>`);if(p.email)links.push(`<a class="mini" href="mailto:${esc(p.email)}">Email</a>`);if(phoneUrl(p.whatsapp))links.push(`<a class="mini" href="${esc(phoneUrl(p.whatsapp))}" target="_blank" rel="noopener">WhatsApp</a>`);return links.join('')}
function renderAudit(p){const a=state.agentOutput?.action==='audit'?state.agentOutput.output:(p.audit_json&&Object.keys(p.audit_json).length?p.audit_json:null);if(!a)return'';const findings=Array.isArray(a.findings)?a.findings:[];return `<div class="output"><h3>Audit · ${Number(a.score||p.opportunity_score||0)}/100</h3><p>${esc(a.summary||p.audit_summary||'')}</p>${findings.map(f=>`<div class="finding"><b>${esc(f.title)}</b><small>${esc(f.evidence||'')}</small><small>${esc(f.impact||'')}</small></div>`).join('')}${a.offer_angle?`<div class="finding"><b>Offer angle</b><small>${esc(a.offer_angle)}</small></div>`:''}</div>`}
function renderOutreach(p){const o=state.agentOutput?.action==='outreach'?state.agentOutput.output:null;const data=o||{email:p.pitch_email,instagram:p.pitch_instagram,whatsapp:p.pitch_whatsapp};if(!data.email&&!data.instagram&&!data.whatsapp)return'';const channels=[['email','Email'],['instagram','Instagram'],['whatsapp','WhatsApp'],['follow_up','Follow-up']].filter(([k])=>data[k]);const first=channels[0]?.[0];return `<div class="output" id="outreachOutput"><h3>Ask-first outreach</h3><div class="channel-tabs">${channels.map(([k,l],i)=>`<button class="channel ${i===0?'active':''}" data-channel="${k}">${l}</button>`).join('')}</div><p id="channelCopy">${esc(data[first]||'')}</p><div class="copy-row"><button class="copy-btn" id="copyChannel">Copy</button></div></div>`}
function renderLoom(p){const l=state.agentOutput?.action==='loom'?state.agentOutput.output:latestLoom(p.id);if(!l)return'';const sections=Array.isArray(l.sections)?l.sections:[];return `<div class="output"><h3>Loom guide · ${Number(l.duration_seconds||75)} sec</h3><p>${esc(l.hook||'')}</p><div class="timeline" style="margin-top:10px">${sections.map(s=>`<div class="timeline-item"><time>${esc(s.time||'')}</time><div><b>${esc(s.title||'')}</b><p>${esc(s.script||'')}</p>${s.onscreen?`<small>${esc('Show: '+s.onscreen)}</small>`:''}</div></div>`).join('')}</div>${l.cta?`<div class="finding"><b>Close the Loom with</b><small>${esc(l.cta)}</small></div>`:''}<div class="field"><label>Loom URL after recording</label><input id="loomUrlInput" value="${esc(p.loom_url||l.loom_url||'')}" placeholder="https://www.loom.com/share/..."></div><div class="copy-row"><button class="copy-btn" id="saveLoomUrl">Save URL</button></div></div>`}
function renderProposal(p){const x=state.agentOutput?.action==='proposal'?state.agentOutput.output:latestProposal(p.id);if(!x)return'';const scope=Array.isArray(x.scope)?x.scope:[];return `<div class="output"><h3>${esc(x.title||'Proposal')}</h3><p>${esc(x.summary||'')}</p>${scope.map(s=>`<div class="finding"><b>${esc(s.title||'Deliverable')}</b><small>${esc(s.text||'')}</small></div>`).join('')}<div class="finding"><b>Monthly investment</b><small>${esc(fmtMoney(x.monthly_price||p.offer_price,x.currency||p.offer_currency||'USD'))}</small></div>${x.proposal_copy?`<div class="finding"><b>Send with proposal</b><small style="white-space:pre-wrap">${esc(x.proposal_copy)}</small></div><div class="copy-row"><button class="copy-btn" data-copy-proposal>Copy proposal message</button></div>`:''}</div>`}
function openDetail(id){
  const p=state.prospects.find(x=>x.id===id);if(!p)return;state.selected=id;state.agentOutput=null;
  $('dTitle').textContent=p.brand_name;$('dMeta').textContent=[p.niche,p.location,stageLabel(p.status)].filter(Boolean).join(' · ');
  renderDetail(p);openOverlay('detailOverlay');
}
function renderDetail(p){
  const s=normalizeStatus(p.status),score=Number(p.opportunity_score||0),rating=p.rating!=null?`${Number(p.rating).toFixed(1)} ★ · ${p.review_count??0} reviews`:'No Google rating saved';
  $('detailBody').innerHTML=`
    <div class="detail-score"><div><b>Opportunity score</b><div class="meta">${esc(rating)}</div></div><strong>${score}/100</strong></div>
    <div class="badges" style="margin-top:10px"><span class="badge hot">${esc(stageLabel(s))}</span>${p.service?`<span class="badge">${esc(p.service)}</span>`:''}${p.source?`<span class="badge">${esc(p.source)}</span>`:''}</div>
    ${p.visible_problem?`<div class="problem">${esc(p.visible_problem)}</div>`:''}
    <div class="job-actions">${linkButtons(p)}</div>
    <div class="divider"></div>
    <div class="detail-actions">
      <button class="agent-btn hot" data-agent="audit"><b>✦ Audit</b><span>Find the strongest grounded opportunity</span></button>
      <button class="agent-btn" data-agent="outreach"><b>Ask-first outreach</b><span>Email, IG, WhatsApp + follow-up</span></button>
      <button class="agent-btn" data-agent="loom"><b>Loom guide</b><span>What to show and say in 60–90 sec</span></button>
      <button class="agent-btn" data-agent="proposal"><b>Proposal</b><span>Scope + monthly retainer price</span></button>
    </div>
    <div id="agentLoading"></div>
    ${renderAudit(p)}${renderOutreach(p)}${renderLoom(p)}${renderProposal(p)}
    <div class="divider"></div>
    <div class="section-head"><div><h2 style="font-size:16px">Move deal</h2><p>Only mark an action after it actually happened.</p></div></div>
    <div class="job-actions">
      ${!['contacted','replied','loom_sent','proposal_sent','won','lost'].includes(s)?`<button class="mini hot" data-status="contacted">Mark contacted</button>`:''}
      ${s==='contacted'?`<button class="mini hot" data-status="replied">They replied</button>`:''}
      ${['replied','qualified'].includes(s)&&latestLoom(p.id)?`<button class="mini hot" data-status="loom_sent">Loom sent</button>`:''}
      ${['loom_sent','replied','qualified'].includes(s)&&latestProposal(p.id)?`<button class="mini hot" data-status="proposal_sent">Proposal sent</button>`:''}
      ${s==='proposal_sent'?`<button class="mini hot" id="winBtn">Start retainer</button>`:''}
      ${!['won','lost'].includes(s)?`<button class="mini" data-status="lost">Mark lost</button>`:''}
      ${s==='won'?`<button class="mini hot" data-open-clients>Open client delivery</button>`:''}
    </div>
    <div class="field"><label>Notes</label><textarea id="detailNotes" placeholder="Objections, decision-maker context, what happened…">${esc(p.notes||'')}</textarea></div><div class="copy-row"><button class="copy-btn" id="saveNotes">Save notes</button></div>`;
  bindDetail(p);
}
function bindDetail(p){
  $('detailBody').querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>runAgent(p.id,b.dataset.agent,b));
  $('detailBody').querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>markStatus(p.id,b.dataset.status));
  $('winBtn')?.addEventListener('click',()=>openRetainer(p.id));
  $('detailBody').querySelector('[data-open-clients]')?.addEventListener('click',()=>{closeOverlay('detailOverlay');setView('clients')});
  $('saveNotes')?.addEventListener('click',()=>saveNotes(p.id));
  $('saveLoomUrl')?.addEventListener('click',()=>saveLoomUrl(p.id));
  $('detailBody').querySelector('[data-copy-proposal]')?.addEventListener('click',()=>{const x=state.agentOutput?.action==='proposal'?state.agentOutput.output:latestProposal(p.id);copyText(x?.proposal_copy||'')});
  const out=state.agentOutput?.action==='outreach'?state.agentOutput.output:{email:p.pitch_email,instagram:p.pitch_instagram,whatsapp:p.pitch_whatsapp};
  const channels=$('detailBody').querySelectorAll('[data-channel]');
  channels.forEach(btn=>btn.onclick=()=>{channels.forEach(x=>x.classList.toggle('active',x===btn));const el=$('channelCopy');if(el)el.textContent=out?.[btn.dataset.channel]||''});
  $('copyChannel')?.addEventListener('click',()=>copyText($('channelCopy')?.textContent||''));
}
async function saveNotes(id){const notes=$('detailNotes').value.trim();const {error}=await sb.from('client_prospects').update({notes,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',state.session.user.id);if(error)return toast(error.message,true);const p=state.prospects.find(x=>x.id===id);if(p)p.notes=notes;toast('Notes saved')}
async function saveLoomUrl(id){const url=$('loomUrlInput')?.value.trim()||'';if(url&&!cleanUrl(url))return toast('Enter a valid Loom URL.',true);const {error}=await sb.from('client_prospects').update({loom_url:url||null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',state.session.user.id);if(error)return toast(error.message,true);const p=state.prospects.find(x=>x.id===id);if(p)p.loom_url=url;toast('Loom URL saved')}
async function runAgent(id,action,btn){
  if(state.busy)return;state.busy=true;const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<b>Working…</b><span>Fuse is preparing this step</span>';
  try{const d=await api('client-ai',{prospect_id:id,action});state.agentOutput={action,output:d.output};await loadAll();const p=state.prospects.find(x=>x.id===id);state.agentOutput={action,output:d.output};renderDetail(p);toast(action==='audit'?'Audit ready':action==='outreach'?'Outreach ready':action==='loom'?'Loom guide ready':'Proposal ready')}catch(e){toast(e.message,true);btn.disabled=false;btn.innerHTML=old}finally{state.busy=false}
}
async function markStatus(id,status){
  const patch={status,updated_at:new Date().toISOString(),last_activity_at:new Date().toISOString()};
  if(status==='contacted'){patch.last_contacted_at=new Date().toISOString();const d=new Date();d.setDate(d.getDate()+3);patch.next_follow_up=d.toISOString()}
  if(['replied','loom_sent','proposal_sent','won','lost'].includes(status))patch.next_follow_up=null;
  const {error}=await sb.from('client_prospects').update(patch).eq('id',id).eq('user_id',state.session.user.id);if(error)return toast(error.message,true);
  await sb.from('client_activities').insert({user_id:state.session.user.id,prospect_id:id,activity_type:'stage_change',title:'Deal moved to '+stageLabel(status),metadata:{status}});
  await loadAll();const p=state.prospects.find(x=>x.id===id);if(p)renderDetail(p);toast('Pipeline updated')
}

async function runFind(){
  const niche=$('findNiche').value.trim(),location=$('findLocation').value.trim(),limit=Number($('findLimit').value||10);if(!niche||!location)return toast('Enter a niche and location.',true);
  const btn=$('runFind'),notice=$('findNotice');btn.disabled=true;btn.textContent='Searching Google…';notice.textContent='Fuse is checking public Google Business Profile data and removing duplicates.';
  try{const d=await api('client-discover',{niche,location,limit});notice.innerHTML=`<strong>${d.added} new prospect${d.added===1?'':'s'}</strong> added · ${d.duplicates} already in your pipeline.`;await loadAll();setTimeout(()=>{closeOverlay('findOverlay');setView('prospects')},650)}catch(e){if(e.code==='GOOGLE_PLACES_NOT_CONFIGURED')notice.innerHTML='<strong>Google connection needed.</strong> The prospect agent is built, but the Fuse owner still needs to add the Google Places API key in Vercel before live searches can run.';else notice.textContent=e.message;toast(e.message,true)}finally{btn.disabled=false;btn.textContent='Find prospects'}
}
async function saveManual(){
  const brand=$('mBrand').value.trim();if(!brand)return toast('Enter the business name.',true);
  const row={user_id:state.session.user.id,brand_name:brand,niche:$('mNiche').value.trim()||null,location:$('mLocation').value.trim()||null,contact_name:$('mContact').value.trim()||null,email:$('mEmail').value.trim()||null,whatsapp:$('mPhone').value.trim()||null,website:$('mWebsite').value.trim()||null,maps_url:$('mMaps').value.trim()||null,visible_problem:$('mProblem').value.trim()||null,service:$('mService').value,offer_currency:$('mCurrency').value,offer_price:$('mPrice').value?Number($('mPrice').value):null,status:'new',source:'Manual',opportunity_score:$('mProblem').value.trim()?55:35};
  const {data,error}=await sb.from('client_prospects').insert(row).select('*').single();if(error)return toast(error.message,true);
  await sb.from('client_activities').insert({user_id:state.session.user.id,prospect_id:data.id,activity_type:'prospect_added',title:'Prospect added',body:brand});
  ['mBrand','mNiche','mLocation','mContact','mEmail','mPhone','mWebsite','mMaps','mProblem','mPrice'].forEach(id=>$(id).value='');closeOverlay('manualOverlay');await loadAll();setView('prospects');openDetail(data.id);toast('Prospect added')
}
function openRetainer(id){const p=state.prospects.find(x=>x.id===id);if(!p)return;state.retainerProspect=id;$('retainerName').textContent=p.brand_name+' · turn this deal into recurring delivery.';$('rService').value=p.offer_angle||p.service||'Google Business Profile Growth';$('rCurrency').value=p.offer_currency||latestProposal(id)?.currency||'USD';$('rFee').value=p.offer_price||latestProposal(id)?.monthly_price||'';closeOverlay('detailOverlay');openOverlay('retainerOverlay')}
async function startRetainer(){const id=state.retainerProspect;if(!id)return;const btn=$('startRetainer');btn.disabled=true;btn.textContent='Starting…';try{await api('client-retainer',{action:'start',prospect_id:id,service:$('rService').value.trim(),currency:$('rCurrency').value,monthly_fee:Number($('rFee').value||0),billing_day:Number($('rBilling').value||1),payment_method:$('rPayment').value});closeOverlay('retainerOverlay');await loadAll();setView('clients');toast('Monthly retainer started')}catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent='Start retainer'}}
async function runJob(id,btn){if(state.busy)return;state.busy=true;const old=btn.textContent;btn.disabled=true;btn.textContent='Running…';try{const d=await api('client-automation',{action:'run',job_id:id});const i=state.jobs.findIndex(x=>x.id===id);if(i>=0)state.jobs[i]=d.job;renderJobs();renderActivities();toast('Automation draft ready')}catch(e){toast(e.message,true);btn.disabled=false;btn.textContent=old}finally{state.busy=false}}
async function toggleJob(id,btn){btn.disabled=true;try{const d=await api('client-automation',{action:'toggle',job_id:id});const i=state.jobs.findIndex(x=>x.id===id);if(i>=0)state.jobs[i]=d.job;renderJobs();toast(d.job.status==='active'?'Automation resumed':'Automation paused')}catch(e){toast(e.message,true)}finally{btn.disabled=false}}

function bind(){
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
  $('findBtn').onclick=$('findBtn2').onclick=()=>openOverlay('findOverlay');
  $('manualBtn').onclick=$('manualBtn2').onclick=()=>openOverlay('manualOverlay');
  $('runFind').onclick=runFind;$('saveManual').onclick=saveManual;$('startRetainer').onclick=startRetainer;
  $('search').oninput=e=>{state.search=e.target.value;renderProspects()};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeOverlay(b.dataset.close));
  document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeOverlay(o.id)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=document.querySelector('.overlay.open');if(o)closeOverlay(o.id)}});
}
boot().catch(e=>{console.error(e);toast(e.message||'Could not start Fuse Client.',true)});
})();