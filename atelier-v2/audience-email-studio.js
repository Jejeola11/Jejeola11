/* Fuse Atelier Audience — Email Studio. Owner only. No automatic launch. */
(()=>{
 'use strict';
 const SB_URL='https://rgbweaimkcndjznlazho.supabase.co';
 const SB_KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
 const db=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const $=id=>document.getElementById(id);
 const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const TYPES={hero:'Hero / Cover',image:'Image / GIF',heading:'Heading',text:'Text section',button:'Call to action',product:'Product card',testimonial:'Testimonial',banner:'Highlight banner',divider:'Divider',spacer:'Space'};
 const DISCOUNT_LABELS={'discount-hero':'01 · Top hero flyer','discount-intro':'02 · Hey Creator — introduction','discount-how':'03 · Chrome HOW IT WORKS box','discount-after':'04 · Follow-up message','discount-gif':'05 · Cloudinary video to GIF','discount-code':'06 · Email discount code','discount-button':'07 · Chrome discount CTA','discount-close':'08 · Closing and signature'};
 const SEGMENT_LABELS={all_subscribed:'All opted-in subscribers',influencer_prospects:'AI Influencer: non-owners',influencer_students:'AI Influencer: course owners',earn_prospects:'Fuse Earn: not yet applied',registered_subscribers:'Subscribed Fuse members',phone_to_client:'Phone-to-Client subscribers'};
 const state={campaigns:[],deliveries:[],templates:[],segments:{},selected:null,editId:null,design:null,previewTimer:null,toastTimer:null,latestHtml:'',configured:false,mutated:false,uploadIndex:null};
 function toast(message,bad=false){const el=$('toast');if(!el)return;el.textContent=message;el.className='toast'+(bad?' bad':'');el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.hidden=true,5400)}
 async function api(method,payload,endpoint='/api/audience-email-campaign'){
  const {data:{session}}=await db.auth.getSession();
  if(!session)throw Error('Your Fuse admin session has expired. Sign in to Fuse Operations again.');
  const res=await fetch(endpoint,{method,headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
  let result={};try{result=await res.json()}catch(_){}
  if(!res.ok)throw Error(result.error||'The Fuse email API could not complete your request.');
  return result;
 }
 function segment(){return $('segment').value||'all_subscribed'}
 function previewCount(){const v=state.segments[segment()];$('segment-count').textContent=Number.isFinite(v)?v.toLocaleString()+' eligible email addresses':'Checking audience…'}
 function renderMetrics(data){
  $('metric-opted').textContent=Number(state.segments.all_subscribed||0).toLocaleString();
  $('metric-campaigns').textContent=String(state.campaigns.length);
  $('metric-queued').textContent=String(state.deliveries.filter(x=>x.status==='queued').length);
  $('metric-delivered').textContent=String(state.deliveries.filter(x=>x.status==='delivered').length);
  $('metrics-note').textContent='Delivery metrics reflect the most recent '+state.deliveries.length+' recipient records.';
  $('setup').className='note'+(data.configured?'':' warn');
  $('setup').textContent=data.senderProvider==='sender'?'Sender marketing enabled · '+(data.sender||'Verified sending domain')+' · New campaigns use Sender without the former 100-email/day Fuse limit. Tests and older delivery records still use Resend.':(data.configured?'Resend is configured · '+(data.sender||'Verified sender')+' · Visual campaigns can be saved and tested. The existing Resend sender limits launches to 100 emails a day.':'Drafts and previews work. Sending requires an email provider in Vercel.');
 }
 function drawTemplates(){
  $('templates').innerHTML=state.templates.map(t=>'<button type="button" class="template art-'+esc(t.id)+(state.design&&state.design.template===t.id?' active':'')+'" data-template="'+esc(t.id)+'"><span class="template-art"><i>FUSE ATELIER</i><b>'+(t.id==='earn'?'EARN WITH FUSE':t.id==='influencer_discount'?'30% OFF<br>AI INFLUENCERS':t.id==='influencer'?'CREATE<br>INFLUENCE':'A CREATIVE NOTE')+'</b><span></span></span><label>'+esc(t.name)+'</label><small>'+esc(t.description)+'</small></button>').join('');
  const note=$('discount-setup-note');if(note)note.hidden=state.design?.template!=='influencer_discount';
 }
 function isHttps(v){try{return new URL(v).protocol==='https:'}catch(_){return false}}
 function newDesign(){return {template:'custom',brand:'FUSE ATELIER',preheader:'',background:'#eaf2ef',surface:'#ffffff',accent:'#dfff4e',ink:'#00191b',blocks:[]}}
 function loadTemplate(id,force=false){
  const t=state.templates.find(x=>x.id===id);
  if(!t)return;
  if(!force&&state.mutated&&!confirm('Replace your current design with this template? Unsaved changes will be lost.'))return;
  state.design=JSON.parse(JSON.stringify(t.design));
  if(id==='influencer_discount'){
   $('name').value='AI Influencer — Exclusive 30% Email Offer';
   $('subject').value='The Viral AI Influencer Course Exclusive Discount is Live (30% off)';
   $('body').value='Hey Creator! Imagine creating your own realistic AI influencer, remixing trending videos and building a portfolio with your phone. Email subscribers have an exclusive 30% code — see the designed email for details.';
   $('segment').value='influencer_prospects';
   $('action-url').value='https://fuseatelier.com/influencer/discount';
  }else if(id==='influencer'){
   $('name').value='AI Influencer course — Launch';
   $('subject').value='{{first_name}}, your AI influencer starts here';
   $('body').value='Hi {{first_name}}, learn to create your own AI influencer and build content you can turn into a skill. Explore the ₦9,900 course at Fuse Atelier.';
   $('segment').value='influencer_prospects';
   $('action-url').value='https://fuseatelier.com/influencer';
  }else if(id==='earn'){
   $('name').value='Fuse Earn — Creator opportunity';
   $('subject').value='Build with Fuse. Earn when you share.';
   $('body').value='Hi {{first_name}}, discover Fuse Earn, our referral opportunity for creators and people sharing Fuse Atelier with their community.';
   $('segment').value='earn_prospects';
   $('action-url').value='https://fuseatelier.com/atelier-v2/earn.html';
  }else{
   $('name').value='Fuse Creative Notes';
   $('subject').value='Something creative for you, {{first_name}}';
   $('body').value='Hi {{first_name}}, here is a creative update from Fuse Atelier.';
   $('segment').value='all_subscribed';
   $('action-url').value='https://fuseatelier.com';
  }
  $('preheader').value=state.design.preheader||'';
  $('schedule-for').value='';
  $('kind').value='marketing';
  applyColors();drawTemplates();drawBlocks();previewCount();requestPreview();
  state.mutated=false;
 }
 function applyColors(){
  const d=state.design||newDesign();
  for(const [id,key] of [['design-bg','background'],['design-surface','surface'],['design-accent','accent'],['design-ink','ink']])$(id).value=d[key]||'#ffffff';
 }
 function setTab(tab){
  document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
  document.querySelectorAll('.pane').forEach(el=>el.classList.toggle('active',el.id==='pane-'+tab));
 }
 function makeField(i,key,label,value,textarea=false,placeholder=''){
  const id='b'+i+'-'+key;
  return '<div class="field"><label for="'+id+'">'+esc(label)+'</label>'+(textarea
   ?'<textarea id="'+id+'" data-i="'+i+'" data-field="'+esc(key)+'" placeholder="'+esc(placeholder)+'">'+esc(value||'')+'</textarea>'
   :'<input id="'+id+'" data-i="'+i+'" data-field="'+esc(key)+'" value="'+esc(value||'')+'" placeholder="'+esc(placeholder)+'">')+'</div>';
 }
 function mediaFields(b,i){
  const tag=b.src&&isHttps(b.src)?'<img src="'+esc(b.src)+'" alt="" style="max-width:100%;height:92px;object-fit:contain;border-radius:8px;margin-bottom:7px">':'';
  const specialHero=b.id==='discount-hero',specialGif=b.id==='discount-gif';
  const label=specialHero?'TOP HERO FLYER · Upload your finished portrait image':specialGif?'ANIMATED VIDEO PREVIEW · Convert Cloudinary MP4 to GIF':'Image or animated GIF';
  return '<div class="field"><label>'+label+'</label>'+tag+
   '<input data-i="'+i+'" data-field="src" placeholder="Paste https://... image or GIF URL" value="'+esc(b.src||'')+'">'+
   (specialGif?'<div class="field" style="margin:11px 0 0"><label>Paste your Cloudinary video URL (MP4, MOV or WebM)</label><input data-video-i="'+i+'" inputmode="url" placeholder="https://res.cloudinary.com/.../video/upload/...mp4"></div>':'')+
   '<div class="asset-actions"><button type="button" class="btn small" data-act="upload" data-i="'+i+'">↑ Upload image / GIF</button><button type="button" class="btn small ghost" data-act="gif" data-i="'+i+'">◉ Convert Cloudinary video → GIF</button></div>'+
   '<div class="hint">'+(specialHero?'Upload the flyer you approved. It will appear at the very top of the email.':specialGif?'Paste your Cloudinary video link above, then tap Convert. The GIF uses up to 4 seconds from the start; clips shorter than 4 seconds are used in full. Your original video stays unchanged.':'Images and GIFs can be uploaded directly (15MB max). Cloudinary MP4 links can create a lightweight animated GIF without changing the original video.')+'</div></div>'+
   makeField(i,'alt','Image description',b.alt,false,'Describe the image for accessibility');
 }
 function blockFields(b,i){
  const fields=[];
  if(['hero','heading','product','banner'].includes(b.type))fields.push(makeField(i,'title','Headline',b.title,true,'A powerful, clear headline'));
  if(b.type==='hero')fields.push(makeField(i,'eyebrow','Small heading / eyebrow',b.eyebrow));
  if(['hero','heading','product','testimonial','banner','text'].includes(b.type))fields.push(makeField(i,'text',b.type==='testimonial'?'Quote':'Description / copy',b.text,true,'Write concise copy. Use {{first_name}} to personalise.'));
  if(['hero','image','product'].includes(b.type))fields.push(mediaFields(b,i));
  if(['hero','product','button'].includes(b.type)){
   fields.push(makeField(i,'buttonText','Button label',b.buttonText,false,'Explore the course'));
   fields.push(makeField(i,'buttonUrl','Button destination (https://)',b.buttonUrl,false,'https://fuseatelier.com'));
  }
  if(b.type==='image')fields.push(makeField(i,'caption','Optional caption',b.caption));
  if(b.type==='testimonial')fields.push(makeField(i,'author','Attribution',b.author));
  if(['hero','banner'].includes(b.type))fields.push(makeField(i,'background','Section background (#RRGGBB)',b.background,false,'#00191b'));
  if(['hero','heading','button','image'].includes(b.type))fields.push('<div class="field"><label>Alignment</label><select data-i="'+i+'" data-field="align"><option value="center"'+(b.align!=='left'?' selected':'')+'>Center</option><option value="left"'+(b.align==='left'?' selected':'')+'>Left</option></select></div>');
  if(b.type==='divider'||b.type==='spacer')fields.push('<div class="hint">A simple visual separator. Move it up or down to adjust your layout.</div>');
  return fields.join('');
 }
 function drawBlocks(){
  const blocks=state.design?.blocks||[];
  $('block-count').textContent=blocks.length+' sections';
  $('block-list').innerHTML=blocks.length?blocks.map((b,i)=>
   '<article class="block" data-block="'+i+'"><div class="block-head"><span class="block-num">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(DISCOUNT_LABELS[b.id]||TYPES[b.type]||b.type)+'</strong><div class="block-actions">'+
   '<button type="button" data-act="up" data-i="'+i+'" title="Move up" '+(i===0?'disabled':'')+'>↑</button>'+
   '<button type="button" data-act="down" data-i="'+i+'" title="Move down" '+(i===blocks.length-1?'disabled':'')+'>↓</button>'+
   '<button type="button" data-act="remove" data-i="'+i+'" title="Delete block">×</button></div></div><div class="block-fields">'+blockFields(b,i)+'</div></article>').join('')
   :'<p class="note">Add a section below, or select a template above. You can create email layouts with photography, GIFs, product cards, and CTA buttons.</p>';
 }
 function blankBlock(type){
  const base={id:'block-'+Date.now().toString(36),type,title:'',eyebrow:'',text:'',src:'',alt:'',caption:'',buttonText:'',buttonUrl:'',author:'',align:'center',background:'',accent:''};
  if(type==='hero')return {...base,title:'Your new campaign starts here',eyebrow:'FUSE ATELIER',text:'Write your offer and what makes it worth opening.',background:'#00191b',buttonText:'Visit Fuse Atelier',buttonUrl:'https://fuseatelier.com'};
  if(type==='button')return {...base,buttonText:'Explore Fuse Atelier',buttonUrl:'https://fuseatelier.com'};
  if(type==='heading')return {...base,title:'The next big idea'};
  if(type==='text')return {...base,text:'Write your message here.'};
  if(type==='product')return {...base,title:'Your product or course',text:'Explain the benefit in a few words.',buttonText:'Discover more',buttonUrl:'https://fuseatelier.com'};
  if(type==='testimonial')return {...base,text:'Add a real, approved testimonial from a student or customer.',author:'Customer name'};
  if(type==='banner')return {...base,title:'Something worth knowing',text:'A short, memorable announcement.',background:'#dfff4e'};
  return base;
 }
 function addBlock(type){if(!TYPES[type])return;if(!state.design)state.design=newDesign();if(state.design.blocks.length>=32){toast('You can add up to 32 sections.',true);return}state.design.blocks.push(blankBlock(type));if(state.design.template!=='influencer_discount')state.design.template='custom';state.mutated=true;drawBlocks();drawTemplates();requestPreview()}
 function formPayload(){
  const design={...state.design,preheader:$('preheader').value,background:$('design-bg').value,surface:$('design-surface').value,accent:$('design-accent').value,ink:$('design-ink').value};
  const time=$('schedule-for').value;
  return {name:$('name').value,subject:$('subject').value,body:$('body').value,kind:$('kind').value,
   segment:segment(),design,actionUrl:$('action-url').value,scheduledFor:time?new Date(time).toISOString():null};
 }
 function requestPreview(){clearTimeout(state.previewTimer);state.previewTimer=setTimeout(runPreview,500)}
 async function runPreview(){
  if(!state.design)return;
  $('preview-status').textContent='Rendering email…';
  try{
   const d=await api('POST',{action:'preview',...formPayload()});
   $('preview').srcdoc=d.html||'';
   state.latestHtml=d.html||'';
   $('preview-status').textContent='Email-safe HTML · Greeting: Creator · Images and GIFs display when supported.';
  }catch(err){$('preview-status').textContent='Preview error: '+err.message}
 }
 async function uploadMedia(file,index){
  if(!file)return;
  if(!['image/jpeg','image/png','image/gif','image/webp'].includes(file.type)){toast('Choose a JPG, PNG, WebP or GIF file.',true);return}
  if(file.size>15*1024*1024){toast('This file exceeds 15 MB. Use a smaller email image or GIF.',true);return}
  $('media-status').textContent='Preparing upload for '+file.name+'…';
  try{
   const d=await api('POST',{type:file.type,size:file.size},'/api/audience-email-media');
   const {error}=await db.storage.from(d.bucket).uploadToSignedUrl(d.path,d.token,file,{contentType:file.type});
   if(error)throw error;
   if(!state.design.blocks[index])throw Error('Section was removed before the upload completed.');
   state.design.blocks[index].src=d.publicUrl;
   state.design.blocks[index].alt=state.design.blocks[index].alt||file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
   state.mutated=true;drawBlocks();requestPreview();
   $('media-status').textContent='Uploaded successfully. Your image is ready for email.';
   toast('Image uploaded. Remember to save your campaign.');
  }catch(err){$('media-status').textContent=err.message;toast(err.message,true)}
 }
 function cloudinaryGif(link){
  try{
   const u=new URL(link);
   if(u.protocol!=='https:'||u.hostname!=='res.cloudinary.com'||!/^\/[a-zA-Z0-9_-]+\/video\/upload\//.test(u.pathname)||!/\.(mp4|mov|webm)$/i.test(u.pathname))return '';
   u.pathname=u.pathname.replace('/video/upload/','/video/upload/f_gif,so_0,du_4,w_320,fps_5/e_loop/').replace(/\.(mp4|mov|webm)$/i,'.gif');
   u.search='';return u.href;
  }catch(_){return ''}
 }
 function drawCampaigns(){
  const node=$('campaign-list');
  node.innerHTML=state.campaigns.length?state.campaigns.map(c=>
   '<article class="campaign-row"><div class="campaign-info"><h3>'+esc(c.name)+'</h3><p>'+esc(c.subject||'Untitled')+' · '+esc(c.campaign_kind)+' · '+esc(SEGMENT_LABELS[c.audience_filter?.segment]||'Existing audience')+'</p><p>'+new Date(c.created_at).toLocaleDateString()+(c.scheduled_for?' · Scheduled '+new Date(c.scheduled_for).toLocaleString():'')+'</p>'+
   '<div class="campaign-actions">'+(['draft','paused','scheduled','cancelled'].includes(c.status)?'<button type="button" class="btn small" data-campaign-action="edit" data-id="'+esc(c.id)+'">Edit design</button>':'')+
   '<button type="button" class="btn small ghost" data-campaign-action="select" data-id="'+esc(c.id)+'">Select for testing</button>'+
   (c.status==='scheduled'?'<button type="button" class="btn small danger" data-campaign-action="cancel" data-id="'+esc(c.id)+'">Cancel schedule</button>':'')+
   '</div></div><span class="status '+esc(c.status)+'">'+esc(c.status)+'</span></article>').join('')
   :'<div class="empty"><strong>No campaigns saved</strong>Select a template, build the email and save your first draft.</div>';
 }
 function drawAudience(){
  const keys=['all_subscribed','influencer_prospects','influencer_students','earn_prospects','registered_subscribers','phone_to_client'];
  $('audience-breakdown').innerHTML='<table class="audience-table"><thead><tr><th>Permissioned segment</th><th>Unique contacts</th></tr></thead><tbody>'+
   keys.map(k=>'<tr><td>'+esc(SEGMENT_LABELS[k])+'</td><td>'+Number(state.segments[k]||0).toLocaleString()+'</td></tr>').join('')+'</tbody></table>';
 }
 function drawAnalytics(){
  const all=state.deliveries;const counts={};
  for(const r of all)counts[r.status||'pending']=(counts[r.status||'pending']||0)+1;
  const labels=[['delivered','Verified delivered'],['queued','Accepted / queued'],['failed','Failed'],['pending','Waiting']];
  const max=Math.max(...labels.map(([s])=>counts[s]||0),1);
  $('analytics-bars').innerHTML=labels.map(([s,label])=>'<div><div class="bar-head"><span>'+label+'</span><span>'+Number(counts[s]||0).toLocaleString()+'</span></div><div class="bar-track"><div class="bar-fill" style="width:'+Math.min(100,((counts[s]||0)/max)*100)+'%"></div></div></div>').join('')+'<div class="row wrap" style="padding:10px 0;border-top:1px solid #315456"><span><strong>'+all.filter(r=>!!r.opened_at).length+'</strong> recorded opens</span><span><strong>'+all.filter(r=>!!r.clicked_at).length+'</strong> recorded clicks</span></div>';
  $('delivery-list').innerHTML=all.length?all.slice(0,80).map(r=>{
   const contact=r.audience_contacts||{};
   const c=state.campaigns.find(x=>x.id===r.campaign_id);
   return '<div class="delivery"><div><strong>'+esc(contact.email_normalized||'Contact')+'</strong><small>'+esc(c?.name||'Campaign')+
    ' · '+(r.delivered_at?'Delivered '+new Date(r.delivered_at).toLocaleString():r.sent_at?'Queued '+new Date(r.sent_at).toLocaleString():'Pending')+
    (r.failure_reason?' · '+esc(r.failure_reason):'')+'</small></div><span class="status '+esc(r.status)+'">'+esc(r.status||'pending')+'</span></div>';
  }).join(''):'<div class="empty">No deliveries recorded yet.</div>';
  $('analytics-note').textContent='These figures describe the latest '+all.length+' recipient records, not all-time totals. A queued provider request is not confirmation of inbox delivery.';
 }
 function updateSelected(){
  const c=state.campaigns.find(x=>x.id===state.editId);
  state.selected=c||state.selected;
  $('selected-campaign').textContent=c?'Selected: '+c.name+' · '+c.status:'Save a draft before sending a test or launching.';
  $('launch-confirm').hidden=!(c&&c.status==='draft');
  $('launch').disabled=!(state.configured&&c&&c.status==='draft');
  $('cancel-schedule').hidden=!(c&&c.status==='scheduled');
  if(c&&c.status==='draft')$('launch-help').textContent='Type exactly: SEND '+c.id;
  if(c&&c.status==='draft')$('launch-confirmation').placeholder='SEND '+c.id;
  $('test').disabled=!(state.configured&&c);
  $('save').disabled=!!(c&&!['draft','scheduled','paused','cancelled'].includes(c.status));
 }
 async function load({initial=false}={}){
  try{
   const d=await api('GET');
   state.configured=!!d.configured;
   state.campaigns=d.campaigns||[];
   state.deliveries=d.deliveries||[];
   state.templates=d.templates||[];
   state.segments=d.audienceCounts||{};
   if(initial){loadTemplate('influencer_discount',true);state.mutated=false}
   renderMetrics(d);drawAudience();drawCampaigns();drawAnalytics();drawTemplates();previewCount();updateSelected();await loadSender();
   $('gate').hidden=true;$('app').hidden=false;
  }catch(err){
   if(initial){$('gate-copy').textContent=err.message;$('gate-action').hidden=false}
   else toast(err.message,true);
  }
 }
 async function loadSender(){
  try{
   const d=await api('GET',null,'/api/audience-sender');
   const c=d.connection||{},v=d.summary||{};
   $('sender-state').className='note'+(!c.connected?' warn':'');
   $('sender-state').textContent=c.connected?'Sender API connected · '+(c.importedCount||0)+' active subscribers in the managed group.':(c.configured?'Sender token detected, but connection test failed: '+(c.error||'Check your token.'):'Sender API token is not configured in Production.');
   $('sender-summary').innerHTML='<div class="bar-row"><span>All collected email addresses</span><b>'+Number(v.total||0).toLocaleString()+'</b></div>'+
    '<div class="bar-row"><span>Verified marketing consent</span><b>'+Number(v.marketingEligible||0).toLocaleString()+'</b></div>'+
    '<div class="bar-row"><span>Consent not verified</span><b>'+Number(v.needsConsent||0).toLocaleString()+'</b></div>'+
    '<div class="bar-row"><span>Unsubscribed / suppressed</span><b>'+Number(v.suppressed||0).toLocaleString()+'</b></div>';
   $('permission-review-total').textContent=Number(v.needsConsent||0).toLocaleString();
   $('sender-sync-now').disabled=!c.connected;
  }catch(err){$('sender-state').className='note warn';$('sender-state').textContent=err.message;$('sender-sync-now').disabled=true}
 }
 async function sendOwnOptinTest(){
   const email=$('optin-test-email').value.trim().toLowerCase();
   const box=$('optin-test-consent');
   const status=$('optin-test-feedback');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
     status.textContent='Enter a valid inbox address you personally control.';
     return;
   }
   if(!box.checked){
     status.textContent='Please tick the agreement to confirm you personally want these updates.';
     return;
   }
   const btn=$('optin-test-send');
   btn.disabled=true;status.textContent='Submitting one verification email request to your inbox…';
   try{
     const r=await fetch('/api/audience-email-optin',{
       method:'POST',
       headers:{'content-type':'application/json'},
       body:JSON.stringify({action:'request',email,consent:'yes'}),
       cache:'no-store',
       credentials:'same-origin'
     });
     if(!r.ok){
       status.textContent='Unable to submit the verification email request ('+r.status+'). Please try the public signup form.';
       toast('The confirmation request failed.',true);
       return;
     }
     status.textContent='Request submitted. Check this inbox for “Confirm your choice to receive Fuse Atelier emails.” Open the link and press “Yes, subscribe me.” Then return here and select Check confirmation status.';
     box.checked=false;
     toast('Confirmation requested for your inbox only.');
   }catch(err){
     status.textContent='Could not connect to Fuse confirmation service. '+err.message;
     toast('Confirmation service could not be reached.',true);
   }finally{btn.disabled=false}
 }
 async function checkOwnOptinTest(){
   const email=$('optin-test-email').value.trim().toLowerCase();
   const status=$('optin-test-feedback');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
     status.textContent='Enter the same inbox address to check its confirmation status.';
     return;
   }
   const btn=$('optin-test-status');btn.disabled=true;status.textContent='Checking the latest consent record…';
   try{
     const d=await api('GET',null,'/api/audience-sender?optin_status=1&email='+encodeURIComponent(email));
     const state=d.requestStatus||'none';
     const intro=d.marketingEligible?'✓ Verified marketing subscriber.':state==='pending'?'Waiting for your confirmation.':
       state==='expired'?'Your confirmation link has expired.':
       state==='confirmed'?'Confirmation recorded.':'No pending verification request.';
     status.textContent=intro+' '+(d.next||'');
     if(d.marketingEligible){
       toast('Opt-in verified! This inbox is eligible for the Sender subscriber sync.');
       await loadSender();
     }
   }catch(err){status.textContent=err.message;toast(err.message,true)}
   finally{btn.disabled=false}
 }
 async function loadSenderReports(){
  const b=$('sender-reports-refresh');
  b.disabled=true;$('sender-reports-content').textContent='Loading Sender campaign statistics…';
  try{
   const d=await api('GET',null,'/api/audience-sender?reports=1');
   const reports=d.reports||[];
   $('sender-reports-content').innerHTML=reports.length?reports.map(r=>'<article class="campaign-row">'+
    '<strong>'+esc(r.name||'Fuse marketing campaign')+'</strong><div class="hint">'+
    (r.error?esc(r.error):('Status: '+esc(r.status)+' · Sent: '+Number(r.sent||0).toLocaleString()+
      ' · Opens: '+Number(r.opens||0).toLocaleString()+' · Clicks: '+Number(r.clicks||0).toLocaleString()+
      ' · Bounces: '+Number(r.bounces||0).toLocaleString()))+'</div></article>').join(''):
    '<p class="hint">No Sender marketing campaign has been launched yet. Saved drafts will not appear here until submitted to Sender.</p>';
  }catch(err){$('sender-reports-content').textContent=err.message;toast(err.message,true)}
  finally{b.disabled=false}
 }
 async function syncSenderNow(){
   const b=$('sender-sync-now');b.disabled=true;
   let totalNew=0,totalExisting=0,totalDenied=0;
   $('sender-sync-message').textContent='Importing verified subscribers in batches. No marketing emails will be sent…';
   try{
     for(let run=1;run<=25;run++){
       const d=await api('POST',{action:'sync',limit:40},'/api/audience-sender');
       totalNew+=Number(d.imported||0);totalExisting+=Number(d.already||0);totalDenied+=Number(d.denied||0);
       $('sender-sync-message').textContent='Batch '+run+' · Imported '+totalNew+' · Linked '+totalExisting+
         ' · Provider-level exclusions '+totalDenied+' · Remaining '+Number(d.remaining||0)+
         '. Keep this page open for the full import.';
       if(d.error)throw Error(d.error);
       if(Number(d.remaining||0)===0){toast('Sender import completed for eligible subscribers. No campaigns sent.');break}
     }
     await loadSender();
   }catch(err){$('sender-sync-message').textContent+=' Import paused: '+err.message;toast(err.message,true)}
   finally{b.disabled=false}
 }
 function reset(){
  state.editId=null;state.selected=null;state.mutated=false;$('save').textContent='Save draft or schedule';
  $('edit-indicator').textContent='NEW CAMPAIGN';$('new-email').hidden=true;$('launch-confirmation').value='';
  loadTemplate('influencer_discount',true);updateSelected();setTab('compose');window.scrollTo({top:0,behavior:'smooth'});
 }
 function editCampaign(id){
  const c=state.campaigns.find(x=>x.id===id);if(!c)return;
  state.editId=c.id;state.selected=c;state.mutated=false;
  $('name').value=c.name||'';$('subject').value=c.subject||'';$('kind').value=c.campaign_kind||'marketing';
  $('body').value=c.body||'';$('action-url').value=c.action_url||'';
  $('segment').value=c.audience_filter?.segment||'all_subscribed';
  const scheduled=c.scheduled_for?new Date(c.scheduled_for):null;
  $('schedule-for').value=scheduled?new Date(scheduled.getTime()-scheduled.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  state.design=c.audience_filter?.design?JSON.parse(JSON.stringify(c.audience_filter.design)):newDesign();
  $('preheader').value=state.design.preheader||'';
  applyColors();drawTemplates();drawBlocks();previewCount();requestPreview();
  $('edit-indicator').textContent='EDITING · '+c.status.toUpperCase();
  $('save').textContent='Save changes';$('new-email').hidden=false;updateSelected();setTab('compose');window.scrollTo({top:0,behavior:'smooth'});
 }
 async function save(){
  const b=$('save'),data=formPayload();
  if(!data.name.trim()||!data.subject.trim()||!data.body.trim()){toast('Campaign name, subject and plain-text summary are required.',true);return}
  if(data.design.blocks.some(x=>x.src&&!isHttps(x.src))){toast('Images must have public HTTPS URLs.',true);return}
  b.disabled=true;$('save-status').textContent='Saving campaign…';
  try{
   const d=await api('POST',{action:state.editId?'update':'create',campaignId:state.editId,...data});
   state.editId=d.campaign.id;state.selected=d.campaign;state.mutated=false;
   $('save-status').textContent=d.message||'Saved successfully';
   $('save').textContent='Save changes';$('edit-indicator').textContent='EDITING · '+d.campaign.status.toUpperCase();$('new-email').hidden=false;
   toast(d.message||'Campaign saved');await load();updateSelected();
  }catch(err){toast(err.message,true);$('save-status').textContent=err.message}finally{b.disabled=false}
 }
 async function testSend(){
  const target=state.campaigns.find(x=>x.id===state.editId);
  if(!target){toast('Save your email design first.',true);return}
  if(state.mutated){toast('Save your latest changes before sending a test.',true);return}
  const email=$('test-email').value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Enter your test inbox address.',true);return}
  const b=$('test');b.disabled=true;$('test-status').textContent='Sending a test to '+email+'…';
  try{const d=await api('POST',{action:'send_test',campaignId:target.id,email});
   $('test-status').textContent=d.message||'Test email sent';toast('Test sent — review mobile and desktop in your inbox.')}
  catch(err){toast(err.message,true);$('test-status').textContent=err.message}finally{b.disabled=false}
 }
 async function launch(){
  const c=state.campaigns.find(x=>x.id===state.editId);if(!c||c.status!=='draft')return toast('Select an unsent draft first.',true);
  if(state.mutated)return toast('Save your latest changes before launching.',true);
  const phrase='SEND '+c.id;
  if($('launch-confirmation').value.trim()!==phrase){toast('Type the confirmation phrase exactly to send.',true);return}
  const b=$('launch');b.disabled=true;$('test-status').textContent='Submitting to the email provider…';
  try{const d=await api('POST',{action:'send',campaignId:c.id,confirmation:phrase});
   $('test-status').textContent=d.preparing?('Sender subscriber sync in progress: '+d.awaitingSync+' eligible contacts are not synced yet. The scheduler will resume the approved campaign.'):d.provider==='sender'?('Sender campaign submitted for up to '+d.recipientCount+' verified subscribers; final delivery remains subject to Sender reporting.'):(d.queued||0)+' messages accepted for sending; delivery still needs confirmation.';
   toast(d.preparing?'Launch queued until Sender import finishes.':'Campaign launch requested. Review provider reporting.');await load();setTab(d.preparing?'audience':'analytics')}
  catch(err){toast(err.message,true);$('test-status').textContent=err.message}finally{b.disabled=false;updateSelected()}
 }
 async function cancelSchedule(id){
  const c=state.campaigns.find(x=>x.id===id);if(!c||c.status!=='scheduled')return;
  if(!confirm('Cancel scheduled email: '+c.name+'?'))return;
  try{await api('POST',{action:'cancel_schedule',campaignId:id});toast('Schedule cancelled.');await load()}
  catch(err){toast(err.message,true)}
 }
 async function reconcile(){
  const b=$('reconcile');b.disabled=true;$('reconcile-status').textContent='Checking queued messages with Resend…';
  try{const d=await api('POST',{action:'reconcile'});toast('Checked '+d.checked+' provider records; '+d.updated+' updated.');
   $('reconcile-status').textContent='Checked '+d.checked+' queued records; '+d.updated+' updated, '+d.unchanged+' still queued, '+d.errors+' errors. Repeat to inspect the next batch if needed.';
   await load();}
  catch(err){toast(err.message,true);$('reconcile-status').textContent=err.message}finally{b.disabled=false}
 }
 function bind(){
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>setTab(el.dataset.tab)));
  $('templates').addEventListener('click',ev=>{const btn=ev.target.closest('[data-template]');if(btn)loadTemplate(btn.dataset.template)});
  $('block-add').innerHTML=Object.entries(TYPES).map(([type,label])=>'<button type="button" data-add="'+type+'">+ '+esc(label)+'</button>').join('');
  $('block-add').addEventListener('click',e=>{const el=e.target.closest('[data-add]');if(el)addBlock(el.dataset.add)});
  $('block-list').addEventListener('input',ev=>{
   const el=ev.target;if(!el.dataset.field)return;
   const index=Number(el.dataset.i),key=el.dataset.field;
   if(!state.design.blocks[index]||!['title','eyebrow','text','src','alt','caption','buttonText','buttonUrl','author','background','align'].includes(key))return;
   state.design.blocks[index][key]=el.value;state.mutated=true;requestPreview();
  });
  $('block-list').addEventListener('change',ev=>{if(ev.target.dataset.field){state.mutated=true;requestPreview()}});
  $('block-list').addEventListener('click',ev=>{
   const button=ev.target.closest('[data-act]');if(!button)return;
   const i=Number(button.dataset.i),act=button.dataset.act,blocks=state.design.blocks;
   if(!blocks[i])return;
   if(act==='up'&&i>0)[blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]];
   if(act==='down'&&i<blocks.length-1)[blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]];
   if(act==='remove')blocks.splice(i,1);
   if(act==='upload'){state.uploadIndex=i;$('media-file').click();return}
   if(act==='gif'){
    const videoField=document.querySelector('[data-video-i="'+i+'"]');
    const link=videoField?videoField.value.trim():prompt('Paste the original Cloudinary MP4 video URL. A short, optimized GIF will be generated for email:',blocks[i].src||'');
    if(!link)return;const gif=cloudinaryGif(link);
    if(!gif){toast('Use an original HTTPS Cloudinary video URL ending in .mp4, .mov or .webm.',true);return}
    blocks[i].src=gif;blocks[i].alt=blocks[i].alt||'Animated Fuse Atelier visual';toast('Up to 4 seconds selected for the GIF (shorter videos use their full length). Cloudinary creates a looping GIF on first request. Original video is unchanged.');
   }
   state.mutated=true;drawBlocks();requestPreview();
  });
  $('media-file').addEventListener('change',async ev=>{const file=ev.target.files?.[0],i=state.uploadIndex;ev.target.value='';if(file&&Number.isInteger(i))await uploadMedia(file,i)});
  document.querySelectorAll('[data-design]').forEach(el=>el.addEventListener('input',()=>{state.design[el.dataset.design]=el.value;state.mutated=true;requestPreview()}));
  ['name','subject','body','action-url','preheader','kind','schedule-for'].forEach(id=>$(id).addEventListener('input',()=>{state.mutated=true;requestPreview()}));
  $('segment').addEventListener('change',()=>{state.mutated=true;previewCount()});
  $('save').onclick=save;$('new-email').onclick=reset;$('test').onclick=testSend;$('launch').onclick=launch;
  $('cancel-schedule').onclick=()=>state.editId&&cancelSchedule(state.editId);
  $('reconcile').onclick=reconcile;
  $('optin-test-send').onclick=sendOwnOptinTest;
  $('optin-test-status').onclick=checkOwnOptinTest;
  $('copy-invite-text').onclick=async()=>{
   const msg="Hi! A quick introduction: Fuse Atelier is a creative platform where you can learn practical digital skills, explore AI tools and build projects. We share occasional learning resources, platform news and creative opportunities by email — but only if you choose to join. If you'd like those updates, visit https://fuseatelier.com/join-emails, enter your email, and confirm it from your inbox. If not, there's nothing to do. — Ria, Founder of Fuse Atelier";
   try{await navigator.clipboard.writeText(msg);toast('Invitation copied. Share through permitted channels.')}
   catch(_){toast('Unable to copy automatically. Use fuseatelier.com/join-emails',true)}
  };
  $('sender-sync-now').onclick=syncSenderNow;
  $('sender-reports-refresh').onclick=loadSenderReports;
  $('refresh').onclick=()=>load();
  $('reset').onclick=reset;
  $('preview-desktop').onclick=()=>{$('preview-shell').classList.remove('mobile');$('preview-desktop').classList.add('active');$('preview-mobile').classList.remove('active')};
  $('preview-mobile').onclick=()=>{$('preview-shell').classList.add('mobile');$('preview-mobile').classList.add('active');$('preview-desktop').classList.remove('active')};
  $('copy-html').onclick=async()=>{if(!state.latestHtml)return toast('Preview the email first.',true);try{await navigator.clipboard.writeText(state.latestHtml);toast('Email HTML copied to clipboard.')}catch(_){toast('Clipboard is unavailable on this browser.',true)}};
  $('campaign-list').addEventListener('click',ev=>{const el=ev.target.closest('[data-campaign-action]');if(!el)return;
   if(el.dataset.campaignAction==='edit'||el.dataset.campaignAction==='select')editCampaign(el.dataset.id);
   if(el.dataset.campaignAction==='cancel')cancelSchedule(el.dataset.id);
  });
  $('gate-action').onclick=()=>location.assign('/atelier-v2/audience.html');
 }
 bind();load({initial:true});
})();
