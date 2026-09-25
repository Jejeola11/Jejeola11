(()=>{
'use strict';
const SUPABASE_URL='https://rgbweaimkcndjznlazho.supabase.co';
const SUPABASE_KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const STAGES=[
  {key:'new',label:'Found'},
  {key:'audited',label:'Audited'},
  {key:'asked',label:'Asked'},
  {key:'replied',label:'Replied'},
  {key:'sample_ready',label:'Sample ready'},
  {key:'sample_sent',label:'Sample sent'},
  {key:'agreed',label:'Agreed'},
  {key:'proposal_sent',label:'Proposal'},
  {key:'deal_locked',label:'Locked'},
  {key:'contract_sent',label:'Contract'},
  {key:'contract_signed',label:'Signed'},
  {key:'won',label:'Retainer'},
  {key:'lost',label:'Lost'}
];
const state={session:null,prospects:[],proposals:[],contracts:[],retainers:[],jobs:[],activities:[],agentProfile:null,view:'overview',pipeline:'all',search:'',selected:null,agentOutput:null,retainerProspect:null,busy:false};
let toastTimer;
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(msg,bad=false){const el=$('toast');el.textContent=msg;el.className='toast show'+(bad?' bad':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',3000)}
function normalizeStatus(s='new'){
  const map={qualified:'audited',contacted:'asked',pitched:'asked',follow_up:'asked',proposal_ready:'agreed',audit_ready:'audited',loom_ready:'replied',loom_sent:'sample_sent'};
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
  const [p,pr,ct,r,j,a,ap]=await Promise.all([
    sb.from('client_prospects').select('*').eq('user_id',uid).order('updated_at',{ascending:false}),
    sb.from('client_proposals').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    sb.from('client_contracts').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
    sb.from('client_retainers').select('*').eq('user_id',uid).order('updated_at',{ascending:false}),
    sb.from('client_automation_jobs').select('*').eq('user_id',uid).order('next_run_at',{ascending:true}),
    sb.from('client_activities').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(30),
    sb.from('client_agent_profiles').select('*').eq('user_id',uid).maybeSingle()
  ]);
  for(const x of [p,pr,ct,r,j,a,ap])if(x.error)throw x.error;
  state.prospects=p.data||[];state.proposals=pr.data||[];state.contracts=ct.data||[];state.retainers=r.data||[];state.jobs=j.data||[];state.activities=a.data||[];state.agentProfile=ap.data||null;
  renderAll();
  window.Fuse?.balance?.().catch(()=>{});
}
function renderAll(){renderClientDashboard();renderAgentMemory();renderStats();renderToday();renderActivities();renderProspects();renderPipeline();renderClients();renderJobs()}
function renderClientDashboard(){
  const root=$('clientDashboard');if(!root)return;
  const p=state.agentProfile?.profile_json||{};
  const onboarding=$('clientOnboarding');
  if(!p.skill){root.style.display='none';if(onboarding){onboarding.style.display='grid';onboarding.classList.remove('saved-open')}return;}
  if(onboarding)onboarding.style.display='none';root.style.display='block';
  const active=state.prospects.filter(x=>!['won','lost'].includes(normalizeStatus(x.status))).length;
  const ready=state.prospects.filter(x=>['new','audited'].includes(normalizeStatus(x.status))).length;
  const contacted=state.prospects.filter(x=>['asked','replied','sample_ready','sample_sent','agreed','proposal_sent','deal_locked','contract_sent','contract_signed','won'].includes(normalizeStatus(x.status))).length;
  const offer=[p.work,p.niche,p.location].filter(Boolean).join(' · ')||'your saved offer';
  root.innerHTML=`<div class="today-page"><p class="today-kicker">YOUR PERSONAL CLIENT ENGINE AGENT</p><h1 class="today-title">Your next client<br><span>starts here.</span></h1><button class="today-action" id="dashFind"><small>TODAY’S FOCUS</small><b>Find 5 qualified clients</b><em>Based on ${esc(offer)}</em><strong>Find 5 <i>→</i></strong></button><section class="today-section"><div class="today-head"><h2>Fuse Scout</h2><button id="dashEdit">Edit</button></div><button class="scout-strip" id="dashEdit2"><i aria-hidden="true"></i><span><b>Watching ${esc([p.location,p.niche].filter(Boolean).join(' · ')||'your target market')}</b><em>${esc(p.work||p.skill||'Your saved offer')}</em></span><strong>›</strong></button></section><section class="today-section"><div class="today-head"><h2>Client momentum</h2><button id="dashProspects">View leads</button></div><div class="momentum"><div><i></i><b>${active}</b><span>Found</span></div><div class="${ready?'active':''}"><i></i><b>${ready}</b><span>Ready</span></div><div><i></i><b>${contacted}</b><span>Pitched</span></div><div><i></i><b>${state.prospects.filter(x=>normalizeStatus(x.status)==='replied').length}</b><span>Replied</span></div><div><i></i><b>${state.prospects.filter(x=>normalizeStatus(x.status)==='won').length}</b><span>Won</span></div></div></section><section class="today-tools"><button id="dashProspects2"><i>♧</i><span>Saved leads</span><b>${String(active).padStart(2,'0')}</b><strong>›</strong></button><button id="dashReply"><i>◌</i><span>Reply helper</span><b>Ask Fuse</b><strong>›</strong></button></section></div>`;
  $('dashFind').onclick=openFind;$('dashEdit').onclick=$('dashEdit2').onclick=openMemory;$('dashProspects').onclick=$('dashProspects2').onclick=()=>setView('prospects');$('dashReply').onclick=()=>{if(state.prospects[0])openDetail(state.prospects[0].id);else openFind()};
}
function renderAgentMemory(){
  const root=$('agentMemory');if(!root)return;const p=state.agentProfile?.profile_json||{};
  const tags=[p.skill,p.work,p.niche,p.location,p.price].filter(Boolean).slice(0,5);
  root.innerHTML=`<div class="memory-row"><div class="agent-orb" aria-hidden="true"></div><div class="memory-copy"><div class="eyebrow">AGENT MEMORY</div><h2>${p.skill?'Fuse knows what you sell.':'Give Fuse your working context.'}</h2><p>${p.skill?esc(state.agentProfile.memory_summary||'Fuse will use this context to shape an offer and find the right businesses for you.'):'Tell Fuse your skill, proof, offer, niche, location, portfolio and starting price. You only need to do this once.'}</p></div></div><div class="memory-tags">${tags.length?tags.map((x,i)=>`<span class="memory-tag ${i===0?'hot':''}">${esc(x)}</span>`).join(''):'<span class="memory-tag hot">No memory saved yet</span>'}</div><div class="memory-footer"><span>${p.portfolio?'Portfolio linked':'You can edit this anytime.'}</span><button id="editMemory">${p.skill?'Edit agent memory':'Teach Fuse about you'}</button></div>`;
  $('editMemory').onclick=openMemory;
}
function openMemory(){
  const p=state.agentProfile?.profile_json||{};
  $('memorySkill').value=p.skill||'';$('memoryWork').value=p.work||'';$('memoryExperience').value=p.experience||'';$('memoryNiche').value=p.niche||'';$('memoryLocation').value=p.location||'';$('memoryPortfolio').value=p.portfolio||'';$('memoryPrice').value=p.price||'';$('clientOnboarding')?.classList.remove('saved-open');$('clientOnboarding')?.classList.add('setup-open');
}
function openFind(){const p=state.agentProfile?.profile_json||{};if(p.skill){const select=$('findSkill');if([...select.options].some(o=>o.value===p.skill))select.value=p.skill}if(p.work)$('findOffer').value=p.work;if(p.niche)$('findNiche').value=p.niche;if(p.location)$('findLocation').value=p.location;if(p.price)$('findPrice').value=p.price;openOverlay('findOverlay')}
async function saveMemory(){
  const profile_json={skill:$('memorySkill').value.trim(),work:$('memoryWork').value.trim(),experience:$('memoryExperience').value.trim(),niche:$('memoryNiche').value.trim(),location:$('memoryLocation').value.trim(),portfolio:$('memoryPortfolio').value.trim(),price:$('memoryPrice').value.trim()};
  if(!profile_json.skill||!profile_json.work||!profile_json.niche||!profile_json.location)return toast('Add your skill, work, niche and target location.',true);
  const memory_summary=[profile_json.skill,'selling '+profile_json.work,'for '+profile_json.niche,'in '+profile_json.location,profile_json.price?'starting at '+profile_json.price:''].filter(Boolean).join(' · ');
  const row={user_id:state.session.user.id,profile_json,memory_summary,portfolio_urls:profile_json.portfolio?[profile_json.portfolio]:[],updated_at:new Date().toISOString()};
  const {error}=await sb.from('client_agent_profiles').upsert(row,{onConflict:'user_id'});if(error)return toast(error.message,true);
  $('clientOnboarding')?.classList.remove('setup-open');await loadAll();toast('Saved to your Client Agent memory');
}
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
  if(s==='new')return {label:'Run audit',note:'Verify why this business is worth approaching now',action:'audit'};
  if(s==='audited'&&!p.pitch_email&&!p.pitch_instagram)return {label:'Write ask-first',note:'Ask permission to show the idea',action:'outreach'};
  if(s==='audited')return {label:'Send ask-first',note:'Only move forward after you actually send it',status:'asked'};
  if(s==='asked')return {label:'Follow up',note:p.next_follow_up?'Due '+fmtDate(p.next_follow_up,true):'Wait for a reply or follow up',status:'asked'};
  if(s==='replied')return {label:'Create sample',note:'One focused concept, not free full delivery',action:'sample'};
  if(s==='sample_ready')return {label:'Finish sample',note:'Create it in Fuse, then save the sample link'};
  if(s==='sample_sent')return {label:'Wait for agreement',note:'Move forward only when the client wants the full version'};
  if(s==='agreed')return {label:'Prepare proposal',note:'Turn the approved direction into scope and price',action:'proposal'};
  if(s==='proposal_sent')return {label:'Lock the deal',note:'Confirm they accepted the proposal',status:'deal_locked'};
  if(s==='deal_locked')return {label:'Prepare contract',note:'Send the agreement for signature'};
  if(s==='contract_sent')return {label:'Await signature',note:'The signing link stays live until completed'};
  if(s==='contract_signed')return {label:'Start retainer',note:'Activate billing and recurring delivery',retainer:true};
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
  if(!state.activities.length){root.innerHTML='<div class="empty"><b>No agent activity yet.</b>Your audits, ask-first messages, samples, proposals, contracts and automation runs will appear here.</div>';return}
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
function latestContract(id){return state.contracts.find(x=>x.prospect_id===id)||null}
function linkButtons(p){
  const links=[];
  if(cleanUrl(p.maps_url))links.push(`<a class="mini" href="${esc(cleanUrl(p.maps_url))}" target="_blank" rel="noopener">Google Maps</a>`);
  if(cleanUrl(p.website))links.push(`<a class="mini" href="${esc(cleanUrl(p.website))}" target="_blank" rel="noopener">Website</a>`);
  if(p.founder_linkedin)links.push(`<a class="mini" href="${esc(cleanUrl(p.founder_linkedin)||p.founder_linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if(p.founder_instagram||p.instagram)links.push(`<a class="mini" href="${esc(cleanUrl(p.founder_instagram||p.instagram)||p.founder_instagram||p.instagram)}" target="_blank" rel="noopener">Instagram</a>`);
  if(p.founder_email||p.email)links.push(`<a class="mini" href="mailto:${esc(p.founder_email||p.email)}">Email</a>`);
  if(phoneUrl(p.founder_phone||p.whatsapp))links.push(`<a class="mini" href="${esc(phoneUrl(p.founder_phone||p.whatsapp))}" target="_blank" rel="noopener">Phone / WhatsApp</a>`);
  return links.join('')
}
function renderContact(p){
  const q=p.qualification_json||{};
  const name=p.founder_name||p.contact_name||'Not found';
  const title=p.founder_title||'Not found';
  const funding=Number(p.funding_total_usd||0);
  const sourceLinks=Array.isArray(p.source_links)?p.source_links:[];
  const price=q.starter_price_label|| (q.starter_price&&q.starter_price.amount?fmtMoney(q.starter_price.amount,q.starter_price.currency||'USD'):'Not found');
  return `<div class="output"><h3>Decision-maker & evidence</h3>
  ${q.rank?`<div class="finding"><b>Priority</b><small>#${esc(q.rank)} strongest opportunity from this research run</small></div>`:''}
  <div class="finding"><b>Founder / contact</b><small>${esc(name)} · ${esc(title)}</small><small>Email: ${esc(p.founder_email||p.email||'Not found')}</small><small>Phone: ${esc(p.founder_phone||p.whatsapp||'Not found')}</small><small>LinkedIn: ${esc(p.founder_linkedin||'Not found')}</small><small>Instagram: ${esc(p.founder_instagram||p.instagram||'Not found')}</small></div>
  <div class="finding"><b>Why now</b><small>${esc(q.why_now||p.current_activity||'Not found')}</small>${p.current_activity_url?`<small><a href="${esc(p.current_activity_url)}" target="_blank" rel="noopener">Open source ↗</a></small>`:''}</div>
  <div class="finding"><b>What to offer</b><small>${esc(q.offer||p.service||'Not found')} · starter price ${esc(price)}</small><small>${esc(q.gap||p.visible_problem||'Not found')}</small></div>
  <div class="finding"><b>Best contact method</b><small>${esc(q.best_contact_method||'Not found')}</small></div>
  ${q.ask_first?`<div class="finding"><b>Ask-first opener</b><small style="white-space:pre-wrap">${esc(q.ask_first)}</small><div class="copy-row"><button class="copy-btn" data-copy-qualified-ask>Copy</button></div></div>`:''}
  ${funding?`<div class="finding"><b>Funding</b><small>${esc(fmtMoney(funding,'USD'))} reported funding</small>${p.funding_source_url?`<small><a href="${esc(p.funding_source_url)}" target="_blank" rel="noopener">Funding source ↗</a></small>`:''}</div>`:''}
  ${sourceLinks.length?`<div class="finding"><b>Sources</b>${sourceLinks.slice(0,8).map(x=>{const u=typeof x==='string'?x:(x.url||'');const label=typeof x==='string'?'Source':(x.label||x.source||'Source');return u?`<small><a href="${esc(u)}" target="_blank" rel="noopener">${esc(label)} ↗</a></small>`:''}).join('')}</div>`:''}</div>`;
}
function renderAudit(p){const a=state.agentOutput?.action==='audit'?state.agentOutput.output:(p.audit_json&&Object.keys(p.audit_json).length?p.audit_json:null);if(!a)return'';const findings=Array.isArray(a.findings)?a.findings:[];return `<div class="output"><h3>Audit · ${Number(a.score||p.opportunity_score||0)}/100</h3><p>${esc(a.summary||p.audit_summary||'')}</p>${findings.map(f=>`<div class="finding"><b>${esc(f.title)}</b><small>${esc(f.evidence||'')}</small><small>${esc(f.impact||'')}</small></div>`).join('')}${a.offer_angle?`<div class="finding"><b>Offer angle</b><small>${esc(a.offer_angle)}</small></div>`:''}</div>`}
function renderOutreach(p){
  const o=state.agentOutput?.action==='outreach'?state.agentOutput.output:null;
  const data=o||{email:p.pitch_email,instagram:p.pitch_instagram,linkedin:p.pitch_linkedin,whatsapp:p.pitch_whatsapp};
  if(!data.email&&!data.instagram&&!data.linkedin&&!data.whatsapp)return'';
  const channels=[['email','Email'],['instagram','Instagram'],['linkedin','LinkedIn'],['whatsapp','WhatsApp'],['follow_up','Follow-up']].filter(([k])=>data[k]);
  const first=channels[0]?.[0];
  return `<div class="output" id="outreachOutput"><h3>Ask-first outreach</h3><div class="channel-tabs">${channels.map(([k,l],i)=>`<button class="channel ${i===0?'active':''}" data-channel="${k}">${l}</button>`).join('')}</div><p id="channelCopy">${esc(data[first]||'')}</p><div class="copy-row"><button class="copy-btn" id="copyChannel">Copy</button></div></div>`;
}
function renderSample(p){
  const s=state.agentOutput?.action==='sample'?state.agentOutput.output:(p.sample_brief?{...p.sample_brief,submission_message:p.sample_submission_copy||''}:null);
  if(!s)return'';
  const route=s.create_route||p.sample_brief?.create_route||'/atelier-v2/studio.html';
  return `<div class="output"><h3>Sample · ${esc(s.sample_type||p.sample_type||'Quick concept')}</h3><p>${esc(s.objective||'Create one focused concept only after the prospect replied positively.')}</p>
  ${s.what_to_make?`<div class="finding"><b>What to make</b><small>${esc(s.what_to_make)}</small></div>`:''}
  ${s.prompt?`<div class="finding"><b>Fuse prompt</b><small style="white-space:pre-wrap">${esc(s.prompt)}</small></div>`:''}
  <div class="job-actions"><button class="mini hot" data-create-sample="${esc(route)}">Create sample in Fuse</button></div>
  <div class="field"><label>Sample link</label><input id="sampleUrlInput" value="${esc(p.sample_url||'')}" placeholder="Paste the finished Fuse Library / page link"></div>
  <div class="copy-row"><button class="copy-btn" id="saveSampleUrl">Save sample</button></div>
  ${s.submission_message||p.sample_submission_copy?`<div class="finding"><b>Send with the sample</b><small style="white-space:pre-wrap">${esc(s.submission_message||p.sample_submission_copy)}</small></div><div class="copy-row"><button class="copy-btn" id="copySampleMessage">Copy message</button></div>`:''}
  </div>`;
}
function renderProposal(p){const x=state.agentOutput?.action==='proposal'?state.agentOutput.output:latestProposal(p.id);if(!x)return'';const scope=Array.isArray(x.scope)?x.scope:[];return `<div class="output"><h3>${esc(x.title||'Proposal')}</h3><p>${esc(x.summary||'')}</p>${scope.map(s=>`<div class="finding"><b>${esc(s.title||'Deliverable')}</b><small>${esc(s.text||'')}</small></div>`).join('')}<div class="finding"><b>Monthly investment</b><small>${esc(fmtMoney(x.monthly_price||p.offer_price,x.currency||p.offer_currency||'USD'))}</small></div>${x.proposal_copy?`<div class="finding"><b>Send with proposal</b><small style="white-space:pre-wrap">${esc(x.proposal_copy)}</small></div><div class="copy-row"><button class="copy-btn" data-copy-proposal>Copy proposal message</button></div>`:''}</div>`}
function openDetail(id){
  const p=state.prospects.find(x=>x.id===id);if(!p)return;state.selected=id;state.agentOutput=null;
  $('dTitle').textContent=p.brand_name;$('dMeta').textContent=[p.niche,p.location,stageLabel(p.status)].filter(Boolean).join(' · ');
  renderDetail(p);openOverlay('detailOverlay');
}
function renderContract(p){
  const x=latestContract(p.id);if(!x)return'';
  const signUrl=location.origin+'/atelier-v2/client-sign.html?token='+encodeURIComponent(x.public_token);
  return `<div class="output"><h3>${esc(x.title||'Service Agreement')}</h3><p style="white-space:pre-wrap;max-height:260px;overflow:auto">${esc(x.body||'')}</p><div class="badges"><span class="badge ${x.status==='signed'?'hot':''}">${esc(x.status)}</span></div><div class="job-actions"><a class="mini" href="${esc(signUrl)}" target="_blank" rel="noopener">Open signing page</a><button class="mini" data-copy-contract>Copy signing link</button>${x.status==='draft'?'<button class="mini hot" data-send-contract>Mark sent</button>':''}</div></div>`;
}
function renderDetail(p){
  const s=normalizeStatus(p.status),score=Number(p.opportunity_score||0),rating=p.rating!=null?`${Number(p.rating).toFixed(1)} ★ · ${p.review_count??0} reviews`:'No Google rating saved';
  const contract=latestContract(p.id);
  $('detailBody').innerHTML=`
    <div class="detail-score"><div><b>Opportunity score</b><div class="meta">${esc(rating)}</div></div><strong>${score}/100</strong></div>
    <div class="badges" style="margin-top:10px"><span class="badge hot">${esc(stageLabel(s))}</span>${p.service?`<span class="badge">${esc(p.service)}</span>`:''}${p.source?`<span class="badge">${esc(p.source)}</span>`:''}</div>
    ${p.visible_problem?`<div class="problem">${esc(p.visible_problem)}</div>`:''}
    <div class="job-actions">${linkButtons(p)}</div>
    ${renderContact(p)}
    <div class="divider"></div>
    <div class="detail-actions">
      <button class="agent-btn hot" data-agent="audit"><b>✦ Audit</b><span>Verify the strongest factual opportunity</span></button>
      <button class="agent-btn" data-agent="outreach"><b>Ask-first</b><span>Permission-based email, IG, LinkedIn or WhatsApp</span></button>
      <button class="agent-btn" data-agent="sample"><b>Create sample</b><span>Only after they reply positively</span></button>
      <button class="agent-btn" data-agent="proposal"><b>Proposal</b><span>Scope + monthly price after they like the sample</span></button>
    </div>
    <div id="agentLoading"></div>
    ${renderAudit(p)}${renderOutreach(p)}${renderSample(p)}${renderProposal(p)}${renderContract(p)}
    <div class="divider"></div>
    <div class="section-head"><div><h2 style="font-size:16px">Move deal</h2><p>Only mark a step after it actually happened.</p></div></div>
    <div class="job-actions">
      ${s==='audited'?`<button class="mini hot" data-status="asked">Ask-first sent</button>`:''}
      ${s==='asked'?`<button class="mini hot" data-status="replied">They replied yes</button>`:''}
      ${s==='sample_ready'&&p.sample_url?`<button class="mini hot" data-status="sample_sent">Sample sent</button>`:''}
      ${s==='sample_sent'?`<button class="mini hot" data-status="agreed">Client wants the full version</button>`:''}
      ${s==='agreed'&&latestProposal(p.id)?`<button class="mini hot" data-status="proposal_sent">Proposal sent</button>`:''}
      ${s==='proposal_sent'?`<button class="mini hot" data-status="deal_locked">Proposal accepted · lock deal</button>`:''}
      ${s==='deal_locked'&&!contract?`<button class="mini hot" id="prepareContract">Prepare contract</button>`:''}
      ${s==='contract_signed'?`<button class="mini hot" id="winBtn">Start retainer</button>`:''}
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
  $('prepareContract')?.addEventListener('click',()=>prepareContract(p.id));
  $('detailBody').querySelector('[data-open-clients]')?.addEventListener('click',()=>{closeOverlay('detailOverlay');setView('clients')});
  $('saveNotes')?.addEventListener('click',()=>saveNotes(p.id));
  $('saveSampleUrl')?.addEventListener('click',()=>saveSampleUrl(p.id));
  $('copySampleMessage')?.addEventListener('click',()=>copyText(p.sample_submission_copy||state.agentOutput?.output?.submission_message||''));
  $('detailBody').querySelector('[data-create-sample]')?.addEventListener('click',e=>{
    const route=e.currentTarget.dataset.createSample||'/atelier-v2/studio.html';
    const brief=state.agentOutput?.action==='sample'?state.agentOutput.output:p.sample_brief||{};
    try{sessionStorage.setItem('fuse_sample_prompt',brief.prompt||'');sessionStorage.setItem('fuse_sample_prospect',p.id)}catch(_){}
    copyText(brief.prompt||'');
    location.href=route;
  });
  $('detailBody').querySelector('[data-copy-proposal]')?.addEventListener('click',()=>{const x=state.agentOutput?.action==='proposal'?state.agentOutput.output:latestProposal(p.id);copyText(x?.proposal_copy||'')});
  $('detailBody').querySelector('[data-copy-contract]')?.addEventListener('click',()=>{const x=latestContract(p.id);if(x)copyText(location.origin+'/atelier-v2/client-sign.html?token='+x.public_token)});
  $('detailBody').querySelector('[data-send-contract]')?.addEventListener('click',()=>sendContract(p.id));
  const out=state.agentOutput?.action==='outreach'?state.agentOutput.output:{email:p.pitch_email,instagram:p.pitch_instagram,linkedin:p.pitch_linkedin,whatsapp:p.pitch_whatsapp};
  const channels=$('detailBody').querySelectorAll('[data-channel]');
  channels.forEach(btn=>btn.onclick=()=>{channels.forEach(x=>x.classList.toggle('active',x===btn));const el=$('channelCopy');if(el)el.textContent=out?.[btn.dataset.channel]||''});
  $('copyChannel')?.addEventListener('click',()=>copyText($('channelCopy')?.textContent||''));
  $('detailBody').querySelector('[data-copy-qualified-ask]')?.addEventListener('click',()=>copyText(p.qualification_json?.ask_first||''));
}
async function saveNotes(id){
  const notes=$('detailNotes').value.trim();
  const {error}=await sb.from('client_prospects').update({notes,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',state.session.user.id);
  if(error)return toast(error.message,true);
  const p=state.prospects.find(x=>x.id===id);if(p)p.notes=notes;toast('Notes saved')
}
async function saveSampleUrl(id){
  const url=$('sampleUrlInput')?.value.trim()||'';
  if(url&&!cleanUrl(url))return toast('Enter a valid sample URL.',true);
  const {error}=await sb.from('client_prospects').update({sample_url:url||null,sample_status:url?'created':'brief_ready',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',state.session.user.id);
  if(error)return toast(error.message,true);
  await loadAll();const p=state.prospects.find(x=>x.id===id);if(p)renderDetail(p);toast('Sample saved')
}
async function prepareContract(id){
  if(state.busy)return;state.busy=true;
  try{
    const d=await api('client-contract',{action:'prepare',prospect_id:id});
    await loadAll();const p=state.prospects.find(x=>x.id===id);if(p)renderDetail(p);
    toast('Contract ready · copy the signing link when you are ready')
  }catch(e){toast(e.message,true)}finally{state.busy=false}
}
async function sendContract(id){
  const x=latestContract(id);if(!x)return toast('Prepare the contract first.',true);
  try{
    const d=await api('client-contract',{action:'send',prospect_id:id,contract_id:x.id});
    copyText(location.origin+d.sign_url);await loadAll();const p=state.prospects.find(x=>x.id===id);if(p)renderDetail(p);
    toast('Signing link copied · send it to the client')
  }catch(e){toast(e.message,true)}
}
async function runAgent(id,action,btn){
  if(state.busy)return;state.busy=true;const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<b>Working…</b><span>Fuse is preparing this step</span>';
  try{
    const d=await api('client-ai',{prospect_id:id,action});
    state.agentOutput={action,output:d.output};await loadAll();const p=state.prospects.find(x=>x.id===id);state.agentOutput={action,output:d.output};renderDetail(p);
    toast(action==='audit'?'Audit ready':action==='outreach'?'Ask-first message ready':action==='sample'?'Sample brief ready':'Proposal ready')
  }catch(e){toast(e.message,true);btn.disabled=false;btn.innerHTML=old}finally{state.busy=false}
}
async function markStatus(id,status){
  const now=new Date().toISOString();
  const patch={status,updated_at:now,last_activity_at:now};
  if(status==='asked'){patch.last_contacted_at=now;const d=new Date();d.setDate(d.getDate()+3);patch.next_follow_up=d.toISOString()}
  if(status==='replied')patch.replied_at=now;
  if(status==='sample_sent'){patch.sample_sent_at=now;patch.sample_status='sent'}
  if(status==='agreed')patch.client_agreed_at=now;
  if(status==='proposal_sent')patch.proposal_sent_at=now;
  if(status==='deal_locked')patch.deal_locked_at=now;
  if(['replied','sample_sent','agreed','proposal_sent','deal_locked','contract_signed','won','lost'].includes(status))patch.next_follow_up=null;
  const {error}=await sb.from('client_prospects').update(patch).eq('id',id).eq('user_id',state.session.user.id);if(error)return toast(error.message,true);
  await sb.from('client_activities').insert({user_id:state.session.user.id,prospect_id:id,activity_type:'stage_change',title:'Deal moved to '+stageLabel(status),metadata:{status}});
  await loadAll();const p=state.prospects.find(x=>x.id===id);if(p)renderDetail(p);toast('Pipeline updated')
}

async function runFind(){
  const skill=$('findSkill').value,niche=$('findNiche').value.trim(),location=$('findLocation').value.trim(),offer=$('findOffer').value.trim(),starter_price=$('findPrice').value.trim(),return_count=Number($('findCount').value);if(!skill||!niche||!location)return toast('Choose your skill, niche and city + country.',true);
  const btn=$('runFind'),notice=$('findNotice');btn.disabled=true;btn.textContent='Researching…';notice.textContent='Fuse is researching publicly available business and professional contact routes, current signals and source links. It will return up to '+return_count+' strong prospects.';
  try{
    const d=await api('client-discover',{skill,niche,location,offer,starter_price,return_count});
    notice.innerHTML='<strong>'+d.added+' strong prospect'+(d.added===1?'':'s')+'</strong> added'+(d.skipped?' · '+d.skipped+' candidates skipped because the evidence was weaker.':'')+(d.credits_refunded?' · '+d.credits_refunded+' credits returned for unfilled places.':'')+'.<br><small>'+esc(d.maps_provider||'SerpApi')+' · '+esc(d.contact_provider||'SerpApi + public website')+'</small>';
    await loadAll();setTimeout(()=>{closeOverlay('findOverlay');setView('prospects')},850)
  }catch(e){
    if(e.code==='SERPAPI_NOT_CONFIGURED')notice.innerHTML='<strong>SerpApi connection needed.</strong> Add SERPAPI_API_KEY in Vercel and redeploy.';
    else notice.textContent=e.message;toast(e.message,true)
  }finally{btn.disabled=false;btn.textContent='Research '+return_count+' · '+({5:20,10:40,20:80}[return_count])+' credits'}
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

function syncClientViewport(){
  const vv=window.visualViewport;
  const h=Math.max(320,Math.round(vv?.height||window.innerHeight));
  document.documentElement.style.setProperty('--client-vvh',h+'px');
}
function keepFieldVisible(e){
  const el=e.target;
  if(!el?.matches?.('#findOverlay input,#findOverlay select,#manualOverlay input,#manualOverlay select,#manualOverlay textarea'))return;
  setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'}),180);
}
function bind(){
  syncClientViewport();
  window.visualViewport?.addEventListener('resize',syncClientViewport);
  window.visualViewport?.addEventListener('scroll',syncClientViewport);
  window.addEventListener('resize',syncClientViewport);
  document.addEventListener('focusin',keepFieldVisible);
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
  $('findBtn').onclick=$('findBtn2').onclick=openFind;
  $('manualBtn').onclick=$('manualBtn2').onclick=()=>openOverlay('manualOverlay');
  $('runFind').onclick=runFind;$('saveManual').onclick=saveManual;$('startRetainer').onclick=startRetainer;$('saveMemory').onclick=saveMemory;
  $('findCount').onchange=()=>{const n=Number($('findCount').value),c={5:20,10:40,20:80}[n];$('runFind').textContent='Research '+n+' · '+c+' credits'};
  $('setupAgent').onclick=openMemory;
  $('setupBack').onclick=()=>$('clientOnboarding')?.classList.remove('setup-open');
  let onboardingTouch=null;
  $('clientOnboarding')?.addEventListener('touchstart',event=>{const touch=event.changedTouches[0];onboardingTouch={x:touch.clientX,y:touch.clientY}},{passive:true});
  $('clientOnboarding')?.addEventListener('touchend',event=>{if(!onboardingTouch)return;const touch=event.changedTouches[0],dx=onboardingTouch.x-touch.clientX,dy=Math.abs(onboardingTouch.y-touch.clientY);onboardingTouch=null;if(dx>52&&dy<72)openMemory()},{passive:true});
  $('closePromo').onclick=()=>{$('clientPromo').style.display='none'};
  $('clientMenu').onclick=()=>location.href='home.html';
  $('search').oninput=e=>{state.search=e.target.value;renderProspects()};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeOverlay(b.dataset.close));
  document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeOverlay(o.id)}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const o=document.querySelector('.overlay.open');if(o)closeOverlay(o.id)}});
}
boot().catch(e=>{console.error(e);toast(e.message||'Could not start Fuse Client.',true)});
})();
