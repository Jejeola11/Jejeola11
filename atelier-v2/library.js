(() => {
  'use strict';

  const SUPABASE_URL='https://rgbweaimkcndjznlazho.supabase.co';
  const SUPABASE_KEY='sb_publishable_S3IEOR8vkWkXEdGtx8fGjw_nH8c4fV3';
  const PENDING_KEY='fuse_pending_jobs';
  const FAV_KEY='fuse_library_favourites';
  const $=(id)=>document.getElementById(id);
  const groups=$('libraryGroups');
  const status=$('libraryStatus');
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

  let session=null;
  let currentFilter='all';
  let layout=localStorage.getItem('fuse_library_layout')==='list'?'list':'grid';
  let generations=[];
  let pendingState=[];
  let pollBusy=false;
  let selected=null;

  const esc=(s)=>String(s??'').replace(/[&<>"']/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const validUrl=(s)=>{try{const u=new URL(s);return /^https:$/.test(u.protocol)?u.href:''}catch{return''}};
  const cleanModel=(s)=>{
    if(!s)return '—';
    const known={
      'seedance-2.5':'Seedance 2.5','gpt-image-2-ws-edit':'GPT Image 2',
      'resemble':'Resemble','avatar-video':'AI Twin Video'
    };
    if(known[s])return known[s];
    return String(s).replace(/[-_]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
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
  const formatDate=(v)=>new Date(v).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const formatCreated=(v)=>new Date(v).toLocaleString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const storagePending=()=>{
    try{
      const rows=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');
      return Array.isArray(rows)?rows:[];
    }catch{return[]}
  };
  const saveStoragePending=(rows)=>{
    try{localStorage.setItem(PENDING_KEY,JSON.stringify(rows))}catch(_){}
  };
  const removePending=(id)=>{
    saveStoragePending(storagePending().filter(x=>String(x.request_id)!==String(id)));
  };
  const favs=()=>{
    try{return new Set(JSON.parse(localStorage.getItem(FAV_KEY)||'[]'))}catch{return new Set()}
  };
  const setFav=(id,on)=>{
    const s=favs();if(on)s.add(String(id));else s.delete(String(id));
    try{localStorage.setItem(FAV_KEY,JSON.stringify([...s]))}catch(_){}
  };

  async function authHeader(){
    const {data}=await sb.auth.getSession();
    const token=data.session?.access_token;
    return token?{Authorization:'Bearer '+token}:{};
  }

  async function getSession(){
    const {data}=await sb.auth.getSession();
    session=data.session||null;
    if(!session){location.href='login.html';return false}
    return true;
  }

  async function fetchFinished(){
    const {data,error}=await sb.from('generations')
      .select('id,output_url,type,prompt,model,aspect,created_at,credits_spent')
      .eq('user_id',session.user.id)
      .order('created_at',{ascending:false})
      .limit(160);
    if(error)throw error;
    generations=(data||[]).filter(x=>validUrl(x.output_url)).map(x=>({
      ...x,
      kind:classify(x.type,x.model),
      sortAt:new Date(x.created_at).getTime()||0,
      pending:false
    }));
  }

  async function fetchServerPending(){
    try{
      const {data,error}=await sb.from('jobs')
        .select('request_id,kind,prompt,status,created_at,model,aspect,credits')
        .eq('user_id',session.user.id)
        .in('status',['processing','generating'])
        .order('created_at',{ascending:false})
        .limit(40);
      if(error)return[];
      return(data||[]).filter(x=>isMediaJob(x.kind)).map(x=>({
        request_id:x.request_id,endpoint:'job-status',mediaType:classify(x.kind,x.model),
        label:x.prompt||x.kind||'Creation',model:x.model,aspect:x.aspect,credits:x.credits,
        started_at:new Date(x.created_at).getTime()||Date.now(),pending:true
      }));
    }catch{return[]}
  }

  function mergePending(localRows,serverRows){
    const map=new Map();
    [...serverRows,...localRows].forEach((x)=>{
      if(!x||!x.request_id)return;
      const prior=map.get(String(x.request_id))||{};
      const mediaType=x.mediaType||classify(x.kind,x.model);
      map.set(String(x.request_id),{
        ...prior,...x,
        mediaType,
        kind:mediaType,
        label:x.label||x.prompt||prior.label||'Creation',
        started_at:Number(x.started_at)||Date.parse(x.created_at)||prior.started_at||Date.now(),
        endpoint:x.endpoint||prior.endpoint||'job-status',
        pending:true
      });
    });
    return[...map.values()].sort((a,b)=>b.started_at-a.started_at);
  }

  function matchesFilter(item){
    if(currentFilter==='all')return true;
    return item.kind===currentFilter;
  }

  function mediaMarkup(item){
    if(item.pending){
      return '<div class="processing-inner"><span class="spinner"></span><small>Creating…</small></div>';
    }
    const u=validUrl(item.output_url);
    if(item.kind==='video')return '<video src="'+u+'" muted loop playsinline preload="metadata"></video>';
    if(item.kind==='audio')return '<div class="audio-art"><svg viewBox="0 0 24 24"><path d="M5 12v4M9 8v8M13 5v14M17 9v6M21 11v2"/></svg></div>';
    return '<img src="'+u+'" alt="'+esc(item.prompt||'Fuse creation')+'" loading="lazy">';
  }

  function tileMarkup(item,index){
    const label=item.pending?(item.label||'Creating…'):(item.prompt||cleanModel(item.model));
    const sub=item.pending?'Rendering now':cleanModel(item.model);
    return '<button class="tile '+(item.pending?'processing':'')+'" type="button" data-index="'+index+'" '+(item.pending?'aria-label="Generation in progress"':'')+'>'+
      mediaMarkup(item)+
      '<span class="kind-badge">'+esc(item.kind)+'</span>'+
      '<span class="list-copy"><b>'+esc(label)+'</b><span>'+esc(sub)+'</span></span>'+
      '</button>';
  }

  function render(){
    const all=[...pendingState.map(x=>({...x,sortAt:x.started_at})),...generations]
      .filter(matchesFilter)
      .sort((a,b)=>(b.sortAt||0)-(a.sortAt||0));

    status.textContent=pendingState.length
      ? (pendingState.length===1?'1 creation is rendering — it will appear here automatically.':pendingState.length+' creations are rendering — they will appear here automatically.')
      : '';

    if(!all.length){
      groups.innerHTML='<div class="empty">Nothing here yet. Tap <b>Continue to Create</b> and your finished work will appear here automatically.</div>';
      return;
    }

    const buckets=new Map();
    all.forEach((item,index)=>{
      const d=new Date(item.sortAt||Date.now());
      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if(!buckets.has(key))buckets.set(key,{date:d,items:[]});
      buckets.get(key).items.push({item,index});
    });

    groups.innerHTML=[...buckets.values()].map(group=>{
      const cards=group.items.map(({item,index})=>tileMarkup(item,index)).join('');
      return '<section class="group"><h2 class="group-title">'+formatDate(group.date)+'</h2><div class="grid '+(layout==='list'?'list':'')+'">'+cards+'</div></section>';
    }).join('');

    groups.querySelectorAll('.tile[data-index]').forEach(btn=>{
      const i=Number(btn.dataset.index);
      const item=all[i];
      if(!item||item.pending)return;
      btn.onclick=()=>openDetail(item);
      const v=btn.querySelector('video');if(v){v.play().catch(()=>{})}
    });
  }

  async function load(){
    status.textContent='Loading your library…';
    try{
      await Promise.all([fetchFinished()]);
      const serverPending=await fetchServerPending();
      pendingState=mergePending(storagePending(),serverPending);
      render();
    }catch(e){
      status.textContent=e.message||'Could not load your library.';
    }
  }

  async function pollPending(){
    if(pollBusy||!pendingState.length||!session)return;
    pollBusy=true;
    let changed=false;
    const headers=await authHeader();
    for(const job of [...pendingState]){
      try{
        const endpoint=job.endpoint||'job-status';
        const res=await fetch('/api/'+endpoint+'?id='+encodeURIComponent(job.request_id),{headers});
        const d=await res.json();
        const done=endpoint==='avatar-video-status'?(d.stage==='complete'||d.status==='completed'):d.status==='completed';
        const failed=endpoint==='avatar-video-status'?(d.stage==='failed'||d.status==='failed'):d.status==='failed';
        if(done||failed){
          removePending(job.request_id);
          changed=true;
        }
      }catch(_){}
    }
    pollBusy=false;
    if(changed)await load();
  }

  function routeFor(item){
    if(item.kind==='video')return 'video-create.html'+(item.model?'?model='+encodeURIComponent(item.model):'');
    if(item.kind==='audio')return '/app/workspace.html?go=audio&source=fuse-library';
    if(item.kind==='twin')return '/app/workspace.html?go=avatar&source=fuse-library';
    return 'image-create.html'+(item.model?'?model='+encodeURIComponent(item.model):'');
  }

  function openDetail(item){
    selected=item;
    const u=validUrl(item.output_url);
    if(item.kind==='video'){
      $('detailMedia').innerHTML='<video src="'+u+'" controls autoplay loop playsinline></video>';
    }else if(item.kind==='audio'){
      $('detailMedia').innerHTML='<audio src="'+u+'" controls autoplay></audio>';
    }else{
      $('detailMedia').innerHTML='<img src="'+u+'" alt="'+esc(item.prompt||'Fuse creation')+'">';
    }

    $('detailPrompt').textContent=item.prompt||'No prompt saved for this creation.';
    $('detailPrompt').classList.add('collapsed');
    $('seePrompt').textContent='See all⌄';
    $('detailModel').textContent=cleanModel(item.model);
    $('detailKind').textContent=item.kind==='twin'?'AI Twin':item.kind.charAt(0).toUpperCase()+item.kind.slice(1);
    $('detailAspect').textContent=item.aspect||'—';
    $('detailCredits').textContent=item.credits_spent!=null?item.credits_spent+' credits':'—';
    $('detailCreated').textContent=formatCreated(item.created_at);

    const f=favs();
    $('favAction').querySelector('span').textContent=f.has(String(item.id))?'Favourited':'Favourite';

    const editLabel=item.kind==='image'||item.kind==='twin'?'Edit Image':item.kind==='video'?'Edit Video':'Open Audio';
    $('editAction').querySelector('span').textContent=editLabel;
    $('videoAction').style.display=(item.kind==='image'||item.kind==='twin')?'flex':'none';

    $('detail').classList.add('open');
    $('detail').setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeDetail(){
    $('detail').classList.remove('open');
    $('detail').setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    const v=$('detailMedia').querySelector('video,audio');if(v)v.pause();
    selected=null;
  }

  $('detailClose').onclick=closeDetail;
  $('detail').addEventListener('click',(e)=>{if(e.target===$('detail'))closeDetail()});
  $('copyPrompt').onclick=async()=>{
    if(!selected)return;
    try{await navigator.clipboard.writeText(selected.prompt||'');$('copyPrompt').textContent='Copied';setTimeout(()=>$('copyPrompt').textContent='Copy',1200)}catch(_){}
  };
  $('seePrompt').onclick=()=>{
    const box=$('detailPrompt');box.classList.toggle('collapsed');
    $('seePrompt').textContent=box.classList.contains('collapsed')?'See all⌄':'Show less⌃';
  };
  $('editAction').onclick=()=>{if(selected)location.href=routeFor(selected)};
  $('recreateAction').onclick=()=>{
    if(!selected)return;
    try{sessionStorage.setItem('fuse_recreate_prompt',selected.prompt||'')}catch(_){}
    location.href=routeFor(selected);
  };
  $('videoAction').onclick=()=>{
    if(!selected)return;
    try{sessionStorage.setItem('fuse_video_reference',selected.output_url||'')}catch(_){}
    location.href='video-create.html';
  };
  $('downloadAction').onclick=()=>{
    if(!selected)return;
    const a=document.createElement('a');a.href=selected.output_url;a.download='fuse-atelier-creation';a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  };
  $('favAction').onclick=()=>{
    if(!selected)return;
    const id=String(selected.id),isOn=favs().has(id);setFav(id,!isOn);
    $('favAction').querySelector('span').textContent=!isOn?'Favourited':'Favourite';
  };
  $('moreAction').onclick=async()=>{
    if(!selected)return;
    if(!confirm('Delete this creation from your Library?'))return;
    try{
      const res=await fetch('/api/delete-generation',{
        method:'POST',headers:{'Content-Type':'application/json',...(await authHeader())},
        body:JSON.stringify({id:selected.id})
      });
      const d=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(d.error||'Could not delete this creation.');
      closeDetail();await load();
    }catch(e){alert(e.message||'Could not delete this creation.')}
  };

  document.querySelectorAll('.filter').forEach(btn=>{
    btn.onclick=()=>{
      currentFilter=btn.dataset.filter;
      document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('on',x===btn));
      render();
    };
  });
  $('gridView').onclick=()=>{
    layout='grid';localStorage.setItem('fuse_library_layout',layout);
    $('gridView').classList.add('on');$('listView').classList.remove('on');render();
  };
  $('listView').onclick=()=>{
    layout='list';localStorage.setItem('fuse_library_layout',layout);
    $('listView').classList.add('on');$('gridView').classList.remove('on');render();
  };
  if(layout==='list'){$('listView').classList.add('on');$('gridView').classList.remove('on')}

  async function boot(){
    if(!await getSession())return;
    await load();
    setInterval(pollPending,6000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){load();pollPending()}});
  }
  boot();
})();