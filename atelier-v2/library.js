(() => {
  'use strict';

  const SUPABASE_URL='https://rgbweaimkcndjznlazho.supabase.co';
  const SUPABASE_KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
  const PENDING_KEY='fuse_pending_jobs';
  const FAV_KEY='fuse_library_favourites';
  const LIBRARY_START=Date.parse('2026-09-16T00:00:00+01:00');
  const $=(id)=>document.getElementById(id);
  const groups=$('libraryGroups');
  const status=$('libraryStatus');
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

  let session=null,currentFilter='all',layout=localStorage.getItem('fuse_library_layout')==='list'?'list':'grid';
  let generations=[],pageProjects=[],pendingState=[],pollBusy=false,selected=null;

  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const validUrl=(s)=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return''}};
  const cleanModel=(s)=>{
    if(!s)return'—';
    const known={'seedance-2.5':'Seedance 2.5','seedance-2.5-text-to-video':'Seedance 2.5','seedance-2.5-image-to-video':'Seedance 2.5','gpt-image-2-ws-edit':'GPT Image 2','resemble':'Resemble','avatar-video':'AI Twin Video'};
    return known[s]||String(s).replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  };
  const classify=(type,model='')=>{
    const t=String(type||'').toLowerCase(),m=String(model||'').toLowerCase();
    if(t==='audio'||t.includes('speech')||t.includes('voice'))return'audio';
    if(t==='video'||t.includes('video')||m.includes('video'))return'video';
    if(t==='avatar'||t==='modelsheet'||t.includes('avatar')||t.includes('twin'))return'twin';
    return'image';
  };
  const isMediaJob=(kind)=>{
    const k=String(kind||'').toLowerCase();
    if(['chat','flyer-brief','video-edit-brief','flyer-suggest-layers','flyer-spec','video-transcribe'].includes(k))return false;
    return /image|video|audio|avatar|modelsheet|flyer|tool|omni|lipsync|ugc/.test(k);
  };
  const formatDate=v=>new Date(v).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const formatCreated=v=>new Date(v).toLocaleString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const pageTypeLabel=t=>({landing:'Landing page',sales:'Sales page',business:'Business website',portfolio:'Portfolio','3d':'3D experience'})[t]||'Website';

  const storagePending=()=>{
    try{return (JSON.parse(localStorage.getItem(PENDING_KEY)||'[]')||[]).filter(x=>(Number(x.started_at)||0)>=LIBRARY_START)}catch{return[]}
  };
  const saveStoragePending=rows=>{try{localStorage.setItem(PENDING_KEY,JSON.stringify(rows))}catch(_){}};
  const removePending=id=>saveStoragePending(storagePending().filter(x=>String(x.request_id)!==String(id)));
  const favs=()=>{try{return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||'[]'))}catch{return new Set()}};
  const setFav=(id,on)=>{const s=favs();on?s.add(String(id)):s.delete(String(id));try{localStorage.setItem(FAV_KEY,JSON.stringify([...s]))}catch(_){}};

  async function authHeader(){const {data}=await sb.auth.getSession();return data.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{}}
  async function getSession(){const {data}=await sb.auth.getSession();session=data.session||null;if(!session){location.href='login.html';return false}return true}

  async function fetchFinished(){
    const {data,error}=await sb.from('generations').select('id,output_url,type,prompt,model,aspect,created_at,credits_spent').eq('user_id',session.user.id).gte('created_at',new Date(LIBRARY_START).toISOString()).order('created_at',{ascending:false}).limit(160);
    if(error)throw error;
    generations=(data||[]).filter(x=>validUrl(x.output_url)).map(x=>({...x,kind:classify(x.type,x.model),sortAt:new Date(x.created_at).getTime()||0,pending:false}));
  }

  async function fetchPages(){
    try{
      let out;
      if(window.Fuse&&typeof Fuse.api==='function')out=await Fuse.api('page-projects');
      else{
        const r=await fetch('/api/page-projects',{headers:await authHeader()});
        out=await r.json();if(!r.ok)throw Error(out.error||'Could not load pages.');
      }
      pageProjects=(out.projects||[]).filter(p=>{
        const t=Date.parse(p.updated_at||p.created_at||0);return t>=LIBRARY_START;
      }).map(p=>({...p,kind:'page',isPage:true,sortAt:Date.parse(p.updated_at||p.created_at)||Date.now(),pending:false}));
    }catch(e){console.warn('[library] pages',e&&e.message);pageProjects=[]}
  }

  async function fetchServerPending(){
    try{
      const {data,error}=await sb.from('jobs').select('request_id,kind,prompt,status,created_at,model,aspect,credits').eq('user_id',session.user.id).gte('created_at',new Date(LIBRARY_START).toISOString()).in('status',['processing','generating']).order('created_at',{ascending:false}).limit(40);
      if(error)return[];
      return(data||[]).filter(x=>isMediaJob(x.kind)).map(x=>({request_id:x.request_id,endpoint:'job-status',mediaType:classify(x.kind,x.model),label:x.prompt||x.kind||'Creation',model:x.model,aspect:x.aspect,credits:x.credits,started_at:new Date(x.created_at).getTime()||Date.now(),pending:true}));
    }catch{return[]}
  }

  function mergePending(localRows,serverRows){
    const map=new Map();
    [...serverRows,...localRows].forEach(x=>{
      if(!x||!x.request_id)return;
      const started=Number(x.started_at)||Date.parse(x.created_at)||0;if(started<LIBRARY_START)return;
      const prior=map.get(String(x.request_id))||{},mediaType=x.mediaType||classify(x.kind,x.model);
      map.set(String(x.request_id),{...prior,...x,mediaType,kind:mediaType,label:x.label||x.prompt||prior.label||'Creation',started_at:started||Date.now(),endpoint:x.endpoint||prior.endpoint||'job-status',pending:true});
    });
    return[...map.values()].sort((a,b)=>b.started_at-a.started_at);
  }

  const matchesFilter=item=>currentFilter==='all'||item.kind===currentFilter;
  function pageMarkup(item){
    return '<div class="page-art"><span class="browser"></span><span class="hero-mock"></span><span class="page-line"></span><span class="page-line sm"></span><span class="page-cta"></span><strong>'+esc(item.title||'Untitled website')+'</strong><em>'+esc(pageTypeLabel(item.page_type))+' · '+esc(item.status||'draft')+'</em></div>';
  }
  function mediaMarkup(item){
    if(item.pending)return'<div class="processing-inner"><span class="spinner"></span><small>Creating…</small></div>';
    if(item.kind==='page')return pageMarkup(item);
    const u=validUrl(item.output_url);
    if(item.kind==='video')return'<video src="'+u+'" muted loop playsinline preload="metadata"></video>';
    if(item.kind==='audio')return'<div class="audio-art"><svg viewBox="0 0 24 24"><path d="M5 12v4M9 8v8M13 5v14M17 9v6M21 11v2"/></svg></div>';
    return'<img src="'+u+'" alt="'+esc(item.prompt||'Fuse creation')+'" loading="lazy">';
  }
  function tileMarkup(item,index){
    const label=item.kind==='page'?(item.title||'Untitled website'):(item.pending?(item.label||'Creating…'):(item.prompt||cleanModel(item.model)));
    const sub=item.kind==='page'?(pageTypeLabel(item.page_type)+' · '+(item.status||'draft')):(item.pending?'Rendering now':cleanModel(item.model));
    return'<button class="tile '+(item.pending?'processing':'')+'" type="button" data-index="'+index+'">'+mediaMarkup(item)+'<span class="kind-badge">'+esc(item.kind)+'</span><span class="list-copy"><b>'+esc(label)+'</b><span>'+esc(sub)+'</span></span></button>';
  }

  function render(){
    const all=[...pendingState.map(x=>({...x,sortAt:x.started_at})),...generations,...pageProjects].filter(matchesFilter).sort((a,b)=>(b.sortAt||0)-(a.sortAt||0));
    status.textContent=pendingState.length?(pendingState.length===1?'1 creation is rendering — it will appear here automatically.':pendingState.length+' creations are rendering — they will appear here automatically.'):'';
    if(!all.length){groups.innerHTML='<div class="empty">Nothing here yet. Your images, videos, audio, twins and Fuse Pages will appear here.</div>';return}
    const buckets=new Map();
    all.forEach((item,index)=>{const d=new Date(item.sortAt||Date.now()),key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();if(!buckets.has(key))buckets.set(key,{date:d,items:[]});buckets.get(key).items.push({item,index})});
    groups.innerHTML=[...buckets.values()].map(g=>'<section class="group"><h2 class="group-title">'+formatDate(g.date)+'</h2><div class="grid '+(layout==='list'?'list':'')+'">'+g.items.map(({item,index})=>tileMarkup(item,index)).join('')+'</div></section>').join('');
    groups.querySelectorAll('.tile[data-index]').forEach(btn=>{
      const item=all[Number(btn.dataset.index)];if(!item||item.pending)return;
      btn.onclick=()=>{if(item.kind==='page'){location.href='page-workspace.html?id='+encodeURIComponent(item.id)+'&type='+encodeURIComponent(item.page_type||'landing');return}openDetail(item)};
      const v=btn.querySelector('video');if(v)v.play().catch(()=>{});
    });
  }

  async function load(){
    status.textContent='Loading your library…';
    try{
      await Promise.all([fetchFinished(),fetchPages()]);
      const serverPending=await fetchServerPending();pendingState=mergePending(storagePending(),serverPending);render();
    }catch(e){status.textContent=e.message||'Could not load your library.'}
  }

  async function pollPending(){
    if(pollBusy||!pendingState.length||!session)return;pollBusy=true;let changed=false;const headers=await authHeader();
    for(const job of [...pendingState])try{
      const endpoint=job.endpoint||'job-status',res=await fetch('/api/'+endpoint+'?id='+encodeURIComponent(job.request_id),{headers}),d=await res.json();
      const done=endpoint==='avatar-video-status'?(d.stage==='complete'||d.status==='completed'):d.status==='completed';
      const failed=endpoint==='avatar-video-status'?(d.stage==='failed'||d.status==='failed'):d.status==='failed';
      if(done||failed){removePending(job.request_id);changed=true}
    }catch(_){}
    pollBusy=false;if(changed)await load();
  }

  function routeFor(item){
    if(item.kind==='video'){const model=String(item.model||'').includes('seedance-2.5')?'seedance-2.5':item.model;return'video-create.html'+(model?'?model='+encodeURIComponent(model):'')}
    if(item.kind==='audio')return'studio.html?category=Voice';if(item.kind==='twin')return'studio.html?category=Twin';return'image-create.html'+(item.model?'?model='+encodeURIComponent(item.model):'');
  }

  function injectMoreMenu(){
    if($('libraryMoreMenu'))return;
    const style=document.createElement('style');style.textContent='.library-more-menu{position:fixed;z-index:140;width:min(220px,calc(100vw - 28px));display:none;overflow:hidden;border-radius:16px;background:#062125;border:1px solid #315456;box-shadow:0 20px 55px rgba(0,0,0,.45)}.library-more-menu.open{display:block}.library-more-menu button{width:100%;height:54px;border:0;background:transparent;color:#EEFFE0;display:flex;align-items:center;gap:12px;padding:0 17px;text-align:left;font-family:Montserrat,Arial,sans-serif;font-size:13px;font-weight:700}.library-more-menu button+button{border-top:1px solid rgba(49,84,86,.75)}.library-more-menu svg{width:21px;height:21px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.library-more-menu .danger{color:#ff3b45}.library-more-menu button:active{background:#00191B}.library-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,18px);z-index:180;opacity:0;pointer-events:none;min-width:190px;max-width:calc(100vw - 28px);padding:12px 16px;border:1px solid #315456;border-radius:14px;background:#062125;color:#EEFFE0;box-shadow:0 16px 45px rgba(0,0,0,.42);font-family:Montserrat,Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;transition:.2s ease}.library-toast.show{opacity:1;transform:translate(-50%,0)}.library-toast.good{color:#DFFF4E}';document.head.appendChild(style);
    const menu=document.createElement('div');menu.id='libraryMoreMenu';menu.className='library-more-menu';menu.innerHTML='<button id="libraryShareAction" type="button"><svg viewBox="0 0 24 24"><path d="M8 12 17 4M12 4h5v5"/><path d="M17 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg><span>Share</span></button><button id="libraryDeleteAction" class="danger" type="button"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg><span>Delete</span></button>';document.body.appendChild(menu);
    $('libraryShareAction').onclick=shareSelected;$('libraryDeleteAction').onclick=deleteSelected;
  }
  let toastTimer=null;
  function libraryToast(message,good=false){
    let el=$('libraryToast');
    if(!el){el=document.createElement('div');el.id='libraryToast';el.className='library-toast';document.body.appendChild(el)}
    clearTimeout(toastTimer);el.textContent=message;el.className='library-toast show'+(good?' good':'');
    toastTimer=setTimeout(()=>{el.classList.remove('show')},1800);
  }
  function downloadExtension(type,kind){
    const t=String(type||'').toLowerCase();
    if(t.includes('mp4'))return'mp4';if(t.includes('webm'))return'webm';if(t.includes('quicktime'))return'mov';
    if(t.includes('png'))return'png';if(t.includes('webp'))return'webp';if(t.includes('gif'))return'gif';if(t.includes('jpeg')||t.includes('jpg'))return'jpg';
    if(t.includes('mpeg'))return'mp3';if(t.includes('wav'))return'wav';if(t.includes('ogg'))return'ogg';
    return kind==='video'?'mp4':kind==='audio'?'mp3':'png';
  }
  async function downloadSelected(){
    if(!selected)return;
    const btn=$('downloadAction'),label=btn?.querySelector('span');
    if(btn?.disabled)return;
    const original=label?.textContent||'Download';
    try{
      if(btn)btn.disabled=true;if(label)label.textContent='Downloading…';libraryToast('Downloading…');
      const response=await fetch(selected.output_url,{mode:'cors',credentials:'omit',cache:'no-store'});
      if(!response.ok)throw new Error('Download failed.');
      const blob=await response.blob();
      if(!blob.size)throw new Error('The file was empty.');
      const ext=downloadExtension(blob.type,selected.kind);
      const filename='fuse-atelier-'+selected.kind+'-'+new Date().toISOString().slice(0,10)+'.'+ext;
      const objectUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=objectUrl;a.download=filename;a.style.display='none';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),15000);
      if(label)label.textContent='Downloaded ✓';libraryToast('Downloaded ✓',true);
      setTimeout(()=>{if(label)label.textContent=original;if(btn)btn.disabled=false},1400);
    }catch(e){
      console.warn('[library] download',e);
      if(label)label.textContent='Try again';libraryToast('Could not download. Try again.');
      setTimeout(()=>{if(label)label.textContent=original;if(btn)btn.disabled=false},1500);
    }
  }
  function closeMoreMenu(){const m=$('libraryMoreMenu');if(m)m.classList.remove('open')}
  function openMoreMenu(){if(!selected)return;injectMoreMenu();const menu=$('libraryMoreMenu'),btn=$('moreAction'),r=btn.getBoundingClientRect(),width=Math.min(220,innerWidth-28),left=Math.max(14,Math.min(innerWidth-width-14,r.right-width));let top=r.top-116;if(top<14)top=Math.min(innerHeight-122,r.bottom+8);menu.style.left=left+'px';menu.style.top=top+'px';menu.classList.add('open')}
  async function shareSelected(){if(!selected)return;closeMoreMenu();const p={title:'Fuse Atelier creation',text:selected.prompt||'Created with Fuse Atelier',url:selected.output_url};try{if(navigator.share){await navigator.share(p);return}await navigator.clipboard.writeText(selected.output_url||'');alert('Creation link copied.')}catch(e){if(e?.name!=='AbortError')try{await navigator.clipboard.writeText(selected.output_url||'');alert('Creation link copied.')}catch(_){}}}
  async function deleteSelected(){if(!selected)return;closeMoreMenu();if(!confirm('Delete this creation permanently from your Library?'))return;const deleting=selected;try{const res=await fetch('/api/delete-generation',{method:'POST',headers:{'Content-Type':'application/json',...(await authHeader())},body:JSON.stringify({id:deleting.id})}),d=await res.json().catch(()=>({}));if(!res.ok)throw Error(d.error||'Could not delete this creation.');closeDetail();await load()}catch(e){alert(e.message||'Could not delete this creation.')}}

  function openDetail(item){
    selected=item;closeMoreMenu();const u=validUrl(item.output_url);
    $('detailMedia').innerHTML=item.kind==='video'?'<video src="'+u+'" controls autoplay loop playsinline></video>':item.kind==='audio'?'<audio src="'+u+'" controls autoplay></audio>':'<img src="'+u+'" alt="'+esc(item.prompt||'Fuse creation')+'">';
    $('detailPrompt').textContent=item.prompt||'No prompt saved for this creation.';$('detailPrompt').classList.add('collapsed');$('seePrompt').textContent='See all⌄';$('detailModel').textContent=cleanModel(item.model);$('detailKind').textContent=item.kind==='twin'?'AI Twin':item.kind.charAt(0).toUpperCase()+item.kind.slice(1);$('detailAspect').textContent=item.aspect||'—';$('detailCredits').textContent=item.credits_spent!=null?item.credits_spent+' credits':'—';$('detailCreated').textContent=formatCreated(item.created_at);
    $('favAction').querySelector('span').textContent=favs().has(String(item.id))?'Favourited':'Favourite';$('editAction').querySelector('span').textContent=item.kind==='video'?'Edit Video':item.kind==='audio'?'Open Audio':'Edit Image';$('videoAction').style.display=(item.kind==='image'||item.kind==='twin')?'flex':'none';$('detail').classList.add('open');$('detail').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  }
  function closeDetail(){closeMoreMenu();$('detail').classList.remove('open');$('detail').setAttribute('aria-hidden','true');document.body.style.overflow='';const v=$('detailMedia').querySelector('video,audio');if(v)v.pause();selected=null}
  $('detailClose').onclick=closeDetail;$('detail').addEventListener('click',e=>{if(e.target===$('detail'))closeDetail()});document.addEventListener('click',e=>{const m=$('libraryMoreMenu');if(m&&m.classList.contains('open')&&!m.contains(e.target)&&!$('moreAction').contains(e.target))closeMoreMenu()});addEventListener('resize',closeMoreMenu);addEventListener('scroll',closeMoreMenu,true);
  $('copyPrompt').onclick=async()=>{if(!selected)return;try{await navigator.clipboard.writeText(selected.prompt||'');$('copyPrompt').textContent='Copied';setTimeout(()=>$('copyPrompt').textContent='Copy',1200)}catch(_){}};
  $('seePrompt').onclick=()=>{const box=$('detailPrompt');box.classList.toggle('collapsed');$('seePrompt').textContent=box.classList.contains('collapsed')?'See all⌄':'Show less⌃'};
  $('editAction').onclick=()=>{if(selected)location.href=routeFor(selected)};$('recreateAction').onclick=()=>{if(!selected)return;try{sessionStorage.setItem('fuse_recreate_prompt',selected.prompt||'')}catch(_){}location.href=routeFor(selected)};$('videoAction').onclick=()=>{if(!selected)return;try{sessionStorage.setItem('fuse_video_reference',selected.output_url||'')}catch(_){}location.href='video-create.html'};
  $('downloadAction').onclick=downloadSelected;
  $('favAction').onclick=()=>{if(!selected)return;const id=String(selected.id),on=favs().has(id);setFav(id,!on);$('favAction').querySelector('span').textContent=!on?'Favourited':'Favourite'};$('moreAction').onclick=e=>{e.stopPropagation();const m=$('libraryMoreMenu');m&&m.classList.contains('open')?closeMoreMenu():openMoreMenu()};

  document.querySelectorAll('.filter').forEach(btn=>btn.onclick=()=>{currentFilter=btn.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('on',x===btn));render()});
  $('gridView').onclick=()=>{layout='grid';localStorage.setItem('fuse_library_layout',layout);$('gridView').classList.add('on');$('listView').classList.remove('on');render()};
  $('listView').onclick=()=>{layout='list';localStorage.setItem('fuse_library_layout',layout);$('listView').classList.add('on');$('gridView').classList.remove('on');render()};
  if(layout==='list'){$('listView').classList.add('on');$('gridView').classList.remove('on')}

  async function boot(){injectMoreMenu();if(!await getSession())return;saveStoragePending(storagePending());await load();setInterval(pollPending,6000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){load();pollPending()}})}
  boot();
})();