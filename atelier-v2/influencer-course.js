(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const access=$('courseAccess'),lesson=$('courseLesson'),player=$('modulePlayer'),drawer=$('moduleDrawer'),backdrop=$('drawerBackdrop');
  const summaries=[
    'Choose an audience and personality, study repeatable TikTok ideas, and build a consistent character sheet and voice identity.',
    'Use STOP (Surprise, Tension, Outcome, Pass it on) to choose a strong idea, then remake a permitted scene in Fuse Scene Remix with your own character.',
    'Original ideas, STOP, recurring series, profile setup, publishing and iteration.',
    'Affiliate offers, your own products, conversion paths, tracking and sponsorships.',
    'Character services, portfolio, prospect research, pitching and paid pilots.',
    'Costs, proposals, payment, usage, recurring packages and a 30-day plan.'
  ];
  const moduleHeadings=[
    'Module 1 · FOUNDATION & CHARACTER',
    'Module 2 · SPOT IT. REMIX IT.',
    'Viral Content & Growth',
    'Influencer Monetization',
    'Selling to Businesses',
    'Pricing & Repeat Income'
  ];
  const tasks=[
    'Submit your audience statement, character card, 5 video ideas, approved master sheet, 3 consistency tests and a voice description or permitted sample.',
    'Submit 3 ideas with STOP notes, a one-sentence premise and 1 finished Scene Remix using a permitted reference.',
    'Create one original short-form video with a strong opening hook and a repeatable series idea. Submit the video and caption.',
    'Choose a way your influencer could earn money. Outline the offer, call to action and how you will track results, then submit your plan.',
    'Prepare a relevant influencer portfolio sample and a short pitch to a business. Submit the sample and your pitch.',
    'Create your pricing, a simple service package and a 30-day action plan for finding and keeping clients. Submit your plan.'
  ];
  let modules=[],current=0;
  function closeDrawer(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true;$('openModules').setAttribute('aria-expanded','false');}
  function openDrawer(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;$('openModules').setAttribute('aria-expanded','true');$('closeModules').focus();}
  $('openModules').onclick=openDrawer;$('closeModules').onclick=closeDrawer;backdrop.onclick=closeDrawer;
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer()});
  function media(url){
    if(!url)return null;
    const parsed=new URL(url),host=parsed.hostname.toLowerCase();
    if(['youtube.com','www.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
      const id=host.includes('youtu.be')?parsed.pathname.slice(1):parsed.searchParams.get('v')||parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
      if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))return null;
      const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1';frame.title='Module video';frame.allow='accelerometer;autoplay;encrypted-media;picture-in-picture;fullscreen';frame.allowFullscreen=true;return frame;
    }
    if(host==='drive.google.com'){
      const id=parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];if(!id)return null;
      const frame=document.createElement('iframe');frame.src='https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview';frame.title='Module video';frame.allowFullscreen=true;return frame;
    }
    if(host==='res.cloudinary.com'){
      const video=document.createElement('video');video.src=url;video.controls=true;video.playsInline=true;video.preload='metadata';return video;
    }
    return null;
  }
  function select(index){
    current=index;const module=modules[index];
    $('moduleHeading').textContent=moduleHeadings[index]||module.title;
    $('moduleSummary').textContent=summaries[index]||'';
    $('moduleAction').textContent=tasks[index]||'Complete the exercise from this lesson and share it in the course group.';
    player.replaceChildren();
    let video=null;try{video=media(module.url)}catch{}
    if(video)player.append(video);else{const placeholder=document.createElement('span');placeholder.textContent='Video coming soon';player.append(placeholder)}
    $('nextModule').disabled=index===modules.length-1;
    $('drawerProgress').style.width=((index+1)/modules.length*100)+'%';
    [...$('moduleList').children].forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-current',i===index?'step':'false')});
    history.replaceState(null,'',location.pathname+'?module='+module.number);
    closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
  }
  $('nextModule').onclick=()=>{if(current<modules.length-1)select(current+1)};
  (async()=>{
    try{
      const client=await Fuse.client();const {data}=await client.auth.getSession();const token=data?.session?.access_token;
      if(!token){access.innerHTML='<p>Sign in to check access to this course.</p><a href="/signup/">Sign in</a>';return;}
      const response=await fetch('/api/influencer-course',{headers:{authorization:'Bearer '+token},cache:'no-store'});
      const course=await response.json();if(!response.ok){access.textContent=course.error||'Could not open this course.';return;}
      modules=course.modules;
      modules.forEach((module,index)=>{const button=document.createElement('button');button.type='button';const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const title=document.createElement('span');title.textContent='Module '+module.number+' · '+module.title;button.append(dot,title);button.onclick=()=>select(index);$('moduleList').append(button)});
      access.hidden=true;lesson.hidden=false;
      const requested=Number(new URLSearchParams(location.search).get('module'));
      select(Number.isInteger(requested)&&requested>=1&&requested<=modules.length?requested-1:0);
    }catch{access.textContent='Could not check course access. Please try again.';}
  })();
})();
