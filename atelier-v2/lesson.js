(() => {
'use strict';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const pillars=(window.FUSE_COURSE?.pillars||[]).filter(Boolean);
const allCourses=[...pillars,window.FUSE_ACADEMY_MONEY].filter(Boolean);

function findCourse(k){return k==='money'?window.FUSE_ACADEMY_MONEY:pillars.find(p=>p.key===k)}
function courseForLesson(lessonKey){
  return allCourses.find(c=>(c.modules||[]).some(m=>(m.lessons||[]).some(l=>l.key===lessonKey)))||null;
}
let key=params.get('course');
const requestedLesson=params.get('lesson');
let course=findCourse(key);
if(!course && requestedLesson){
  course=courseForLesson(requestedLesson);
  key=course?.key||null;
}
if(!course){location.replace('learn.html');return}

const modules=(course.modules||[]).map((m,mi)=>({...m,moduleIndex:mi}));
const lessons=[];
modules.forEach((m,mi)=>(m.lessons||[]).forEach((l,li)=>lessons.push({...l,module:m.title,moduleKey:m.key,moduleIndex:mi,lessonIndex:li,moduleData:m})));
let index=-1,requestVersion=0,openModules=new Set();

function cleanTopic(title=''){
  return String(title).replace(/^\s*(?:\d+\.\s*)?(?:Module\s*[\w.]+\s*[-:—]?\s*)/i,'').trim()||title;
}
function embedUrl(raw){
  if(!raw)return null;
  const u=new URL(raw);
  if(u.protocol!=='https:')throw Error('This video link is unavailable.');
  const host=u.hostname.replace(/^www\./,'');
  let id;
  if(host==='youtu.be') id=u.pathname.split('/')[1];
  else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)){
    id=u.searchParams.get('v');
    if(!id){
      const parts=u.pathname.split('/').filter(Boolean);
      const mark=parts.findIndex(p=>['shorts','embed','live'].includes(p));
      id=mark>=0?parts[mark+1]:parts.at(-1);
    }
  }
  if(id&&/^[A-Za-z0-9_-]{6,20}$/.test(id))
    return 'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0&playsinline=1&modestbranding=1';
  if(host==='drive.google.com'){
    const match=u.pathname.match(/\/file\/d\/([^/]+)/);
    const driveId=match?.[1]||u.searchParams.get('id');
    if(driveId&&/^[A-Za-z0-9_-]+$/.test(driveId))
      return 'https://drive.google.com/file/d/'+driveId+'/preview';
  }
  return null;
}

function progressKey(){return 'fuse_course_progress_v3_'+key}
function readProgress(){
  try{return new Set(JSON.parse(localStorage.getItem(progressKey())||'[]'))}catch{return new Set()}
}
function markProgress(lessonKey){
  const set=readProgress();set.add(lessonKey);
  try{localStorage.setItem(progressKey(),JSON.stringify([...set]))}catch{}
  return set;
}

function moduleLessonCount(m){return (m.lessons||[]).length}
function moduleStartIndex(mi){
  let n=0;
  for(let i=0;i<mi;i++)n+=moduleLessonCount(modules[i]);
  return n;
}

function copyText(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
  return new Promise((resolve,reject)=>{
    const ta=document.createElement('textarea');
    ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy')?resolve():reject(new Error('Copy failed'))}catch(e){reject(e)}
    ta.remove();
  });
}

function configurePrimaryAction(lesson){
  const action=$('lessonPrimaryAction');
  if(!action)return;
  action.onclick=null;
  action.classList.toggle('copy-prompt',Boolean(lesson.copyPrompt));
  if(lesson.copyPrompt){
    action.removeAttribute('href');
    action.setAttribute('role','button');
    action.setAttribute('tabindex','0');
    action.textContent='Copy prompt';
    action.onclick=async e=>{
      e.preventDefault();
      const original='Copy prompt';
      try{
        await copyText(lesson.copyPrompt);
        action.textContent='Copied ✓';
        setTimeout(()=>{if(index>=0&&lessons[index]?.key===lesson.key)action.textContent=original},1800);
      }catch{
        action.textContent='Copy failed';
        setTimeout(()=>{if(index>=0&&lessons[index]?.key===lesson.key)action.textContent=original},1800);
      }
    };
    action.onkeydown=e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();action.click()}
    };
  }else{
    action.href=key==='challenge'?'https://chat.whatsapp.com/GA9gmiqaep4E0pusRxrazP?s=cl&p=a&mlu=4&ilr=4':'studio.html';
    action.removeAttribute('role');
    action.removeAttribute('tabindex');
    action.onkeydown=null;
    action.textContent=key==='challenge'?'Submit your task ↗':'Try it in Create ↗';
  }
}

function renderBadges(lesson){
  const box=$('lessonBadges');
  const tags=[];
  if(lesson.isNew||lesson.moduleData?.isNew)tags.push('<span class="course-badge">New</span>');
  if(lesson.watchNow||lesson.moduleData?.watchNow)tags.push('<span class="course-badge watch">Watch now</span>');
  box.innerHTML=tags.join('');
  box.hidden=!tags.length;
}

function renderDrawer(){
  const visited=readProgress();
  $('drawerCourseName').textContent=course.name;
  $('drawerCourseMeta').textContent=key==='challenge' ? lessons.filter(l=>l.kind!=='resource').length+' lessons · '+lessons.filter(l=>l.kind==='resource').length+' resources' : lessons.length+' lessons · start at your own pace';
  $('drawerProgress').style.width=(lessons.length?Math.round(visited.size/lessons.length*100):0)+'%';
  const nodes=modules.map((m,mi)=>{
    const wrap=document.createElement('section');
    wrap.className='drawer-module'+(m.isNew?' featured':'');
    if(key==='challenge' && m.key!=='challenge-resources' && m.lessons?.length===1){
      const lesson=m.lessons[0];
      const lessonIndex=moduleStartIndex(mi);
      const row=document.createElement('button');
      row.type='button';row.className='drawer-challenge-link';
      if(lessonIndex===index)row.classList.add('current');
      if(visited.has(lesson.key))row.classList.add('done');
      const dot=document.createElement('span');dot.className='drawer-dot';dot.setAttribute('aria-hidden','true');
      const title=document.createElement('span');title.className='drawer-module-title';title.textContent=m.title;
      row.append(dot,title);
      row.onclick=()=>{closeDrawer();open(lessonIndex,true)};
      wrap.append(row);
      return wrap;
    }
    const head=document.createElement('button');
    head.type='button';head.className='drawer-module-head';
    const left=document.createElement('div');
    const title=document.createElement('div');title.className='drawer-module-title';title.textContent=m.title;
    left.appendChild(title);
    if(m.updateLabel){
      const update=document.createElement('div');update.className='drawer-update-label';update.textContent=m.updateLabel;
      left.appendChild(update);
    }else if(m.isNew||m.watchNow){
      const tags=document.createElement('div');tags.className='drawer-feature-tags';
      if(m.isNew){const t=document.createElement('span');t.className='drawer-feature-tag';t.textContent='New';tags.appendChild(t)}
      if(m.watchNow){const t=document.createElement('span');t.className='drawer-feature-tag watch';t.textContent='Watch now';tags.appendChild(t)}
      left.appendChild(tags);
    }
    const count=document.createElement('span');count.className='drawer-module-count';count.textContent=moduleLessonCount(m)+' '+(m.key==='challenge-resources'?(moduleLessonCount(m)===1?'guide':'guides'):(moduleLessonCount(m)===1?'lesson':'lessons'));
    const toggle=document.createElement('span');toggle.className='drawer-module-toggle';
    const isOpen=openModules.has(m.key);toggle.textContent=isOpen?'−':'+';
    head.append(left,count,toggle);
    const list=document.createElement('div');list.className='drawer-lessons';list.hidden=!isOpen;
    (m.lessons||[]).forEach((l,li)=>{
      const globalIndex=moduleStartIndex(mi)+li;
      const row=document.createElement('button');row.type='button';row.className='drawer-lesson';
      if(globalIndex===index)row.classList.add('current');
      if(visited.has(l.key))row.classList.add('done');
      const dot=document.createElement('span');dot.className='drawer-dot';
      const label=document.createElement('span');label.textContent=(l.kind==='resource'?'▤ ':'')+l.title;
      row.append(dot,label);
      row.onclick=()=>{closeDrawer();open(globalIndex,true)};
      list.appendChild(row);
    });
    head.onclick=()=>{
      if(openModules.has(m.key))openModules.delete(m.key);else openModules.add(m.key);
      renderDrawer();
    };
    wrap.append(head,list);
    return wrap;
  });
  $('drawerModules').replaceChildren(...nodes);
}

function setPlayerMessage(title,detail=''){
  $('lessonPlayer').innerHTML='<div class="player-state"><div><strong>'+title+'</strong>'+(detail?'<div style="margin-top:8px">'+detail+'</div>':'')+'</div></div>';
}
function mountVideo(raw,lesson){
  const embed=embedUrl(raw);
  $('lessonPlayer').replaceChildren();
  if(embed){
    const media=document.createElement('iframe');
    media.src=embed;media.title=lesson.title;
    media.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
    media.allowFullscreen=true;media.referrerPolicy='strict-origin-when-cross-origin';
    $('lessonPlayer').append(media);
  }else{
    const media=document.createElement('video');
    media.src=raw;media.controls=true;media.playsInline=true;media.preload='metadata';
    media.addEventListener('error',()=>{$('lessonStatus').textContent='This video could not load. Try again.';$('retryLesson').hidden=false});
    $('lessonPlayer').append(media);
  }
}

async function loadVideo(lesson,version){
  $('lessonStatus').textContent='Loading lesson…';
  $('retryLesson').hidden=true;
  setPlayerMessage('Loading lesson…');
  let url='';
  try{
    const data=await Fuse.api('lesson-video',{lesson_key:lesson.key});
    if(version!==requestVersion)return;
    url=data?.url||'';
  }catch(error){
    if(version!==requestVersion)return;
    // A denied or missing protected lesson must not fall back to a public URL.
    url='';
    if(!url){
      $('lessonStatus').textContent=error?.message||'This lesson video has not been uploaded yet.';
      $('retryLesson').hidden=false;
      setPlayerMessage('Video coming soon','Use the module menu to continue with another lesson.');
      return;
    }
  }
  try{
    mountVideo(url,lesson);
    $('lessonStatus').textContent='';
  }catch(error){
    $('lessonStatus').textContent=error.message||'This video could not load.';
    $('retryLesson').hidden=false;
    setPlayerMessage('Video unavailable','Please try again.');
  }
}

async function open(i,scroll=false){
  if(i<0||i>=lessons.length)return;
  index=i;
  const lesson=lessons[i],module=modules[lesson.moduleIndex];
  const version=++requestVersion;
  openModules.add(module.key);
  markProgress(lesson.key);
  $('lessonKicker').textContent=course.name.toUpperCase()+' · '+(module.kicker||module.title).toUpperCase();
  $('lessonTitle').textContent=lesson.title;
  document.title=cleanTopic(lesson.title)+' · Fuse Atelier';
  renderBadges(lesson);
  configurePrimaryAction(lesson);
  const topic=cleanTopic(lesson.title);
  $('learnCopy').textContent=lesson.learnText||('In this lesson, '+topic+' is broken into a clear, practical workflow you can apply immediately.');
  $('actionCopy').textContent=lesson.actionText||('Pause and apply the key idea from “'+lesson.title+'” before you continue.');
  $('actionHeading').textContent=key==='challenge'&&lesson.kind!=='resource'?'Do this task today':'Next action step';
  $('challengeGoal').hidden=!(key==='challenge'&&lesson.key==='challenge-start');
  if(!$('challengeGoal').hidden){
    $('challengeGoalStatus').textContent='Loading your saved goal…';
    Fuse.api('challenge-goals').then(data=>{
      if(index===i){$('challengeGoalText').value=data.goal||'';$('challengeGoalStatus').textContent=data.goal?'Saved goal loaded.':''}
    }).catch(error=>{if(index===i)$('challengeGoalStatus').textContent=error.message});
  }
  $('nextLesson').disabled=i>=lessons.length-1;
  history.replaceState(null,'','?course='+encodeURIComponent(key)+'&lesson='+encodeURIComponent(lesson.key));
  renderDrawer();
  const resourceReader=$('resourceReader');
  document.querySelector('.learn-card > h2').textContent=lesson.kind==='reading'?'Lesson recap':'What you’ll learn';
  if(lesson.kind==='reading' && resourceReader){
    $('lessonPlayer').hidden=true;
    $('lessonPlayer').replaceChildren();
    $('lessonStatus').textContent='Reading lesson · Read, practise and complete today’s task';
    $('retryLesson').hidden=true;
    resourceReader.hidden=false;
    renderReading(resourceReader,lesson.reading);
    $('nextLesson').textContent='Next lesson →';
  }else if(lesson.kind==='resource' && resourceReader){
    $('lessonPlayer').hidden=true;
    $('lessonStatus').textContent='';
    $('retryLesson').hidden=true;
    resourceReader.hidden=false;
    renderResource(resourceReader,lesson.resource);
    $('lessonPrimaryAction').textContent='Copy resource template';
    $('lessonPrimaryAction').removeAttribute('href');
    $('lessonPrimaryAction').setAttribute('role','button');
    $('lessonPrimaryAction').onclick=async e=>{
      e.preventDefault();
      try{await copyText(lesson.resource.template);$('lessonPrimaryAction').textContent='Copied ✓'}
      catch{$('lessonPrimaryAction').textContent='Could not copy'}
    };
    $('nextLesson').textContent='Next resource →';
  }else{
    $('lessonPlayer').hidden=false;
    if(resourceReader){resourceReader.hidden=true;resourceReader.replaceChildren()}
    $('nextLesson').textContent='Next lesson →';
    await loadVideo(lesson,version);
  }
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}

function renderReading(container,reading){
  container.replaceChildren();
  container.classList.add('challenge-reading');
  const lead=document.createElement('div');lead.className='reading-introduction';
  reading.intro.forEach(text=>{const p=document.createElement('p');p.textContent=text;lead.append(p)});
  container.append(lead);
  const contents=document.createElement('nav');contents.className='reading-outline';contents.setAttribute('aria-label','In this lesson');
  const label=document.createElement('strong');label.textContent='In this lesson';contents.append(label);
  reading.sections.forEach((item,i)=>{
    const a=document.createElement('a');a.href='#reading-section-'+i;a.textContent=item.title;
    a.onclick=e=>{e.preventDefault();document.getElementById('reading-section-'+i)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})};contents.append(a);
  });container.append(contents);
  reading.sections.forEach((item,i)=>{
    const section=document.createElement('section');section.className='reading-section';section.id='reading-section-'+i;
    const h=document.createElement('h2');h.textContent=item.title;section.append(h);
    item.paragraphs.flatMap(text=>text.startsWith('PROJECT:')?text.split(/ (?=DELIVERABLES:|CLIENT INPUTS:|PRICE AND PAYMENT:|TIMELINE:|REVISIONS:|HANDOVER:|OTHER TERMS:|CONFIRMATION:)/):[text]).forEach(text=>{
      const p=document.createElement('p');p.textContent=text;
      if(/^(CLIENT:|YOU:|"|PROJECT:|DELIVERABLES:|CLIENT INPUTS:|PRICE AND PAYMENT:|TIMELINE:|REVISIONS:|HANDOVER:|OTHER TERMS:|CONFIRMATION:)/.test(text))p.className='reading-example';
      section.append(p);
    });container.append(section);
  });
}

function renderResource(container,resource){
  container.replaceChildren();
  container.classList.remove('challenge-reading');
  const intro=document.createElement('p');intro.className='resource-intro';intro.textContent=resource.intro;
  container.append(intro);
  resource.sections.forEach(([heading,copy])=>{
    const section=document.createElement('article');section.className='resource-section';
    const h=document.createElement('h2');h.textContent=heading;
    const p=document.createElement('p');p.textContent=copy;
    section.append(h,p);container.append(section);
  });
  if(Array.isArray(resource.checklist)){
    const panel=document.createElement('section');panel.className='resource-checklist';
    const heading=document.createElement('h2');heading.textContent='Mark each day complete';
    const progress=document.createElement('p');progress.className='resource-progress';
    const list=document.createElement('div');list.className='resource-checklist-items';
    const storageKey='fuse_challenge_checklist_'+resource.key;
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{}
    const update=()=>{
      progress.textContent=`${resource.checklist.filter((_,i)=>saved[i]).length} of ${resource.checklist.length} days marked complete`;
      try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}
    };
    resource.checklist.forEach(([day,task],i)=>{
      const label=document.createElement('label');label.className='resource-check-item';
      const input=document.createElement('input');input.type='checkbox';input.checked=Boolean(saved[i]);
      input.addEventListener('change',()=>{saved[i]=input.checked;update()});
      const text=document.createElement('span');
      const strong=document.createElement('strong');strong.textContent=day;
      text.append(strong,document.createTextNode(task));
      label.append(input,text);list.append(label);
    });
    panel.append(heading,progress,list);container.append(panel);update();
  }
  const template=document.createElement('section');template.className='resource-template';
  const heading=document.createElement('h2');heading.textContent='Copy and make it yours';
  const pre=document.createElement('pre');pre.textContent=resource.template;
  const button=document.createElement('button');button.type='button';button.textContent='Copy template';
  button.onclick=async()=>{try{await copyText(resource.template);button.textContent='Copied ✓'}catch{button.textContent='Could not copy'}};
  template.append(heading,pre,button);container.append(template);
}

function openDrawer(){
  document.body.classList.add('drawer-open');
  $('moduleDrawer').setAttribute('aria-hidden','false');
  $('openModules').setAttribute('aria-expanded','true');
  renderDrawer();
}
function closeDrawer(){
  document.body.classList.remove('drawer-open');
  $('moduleDrawer').setAttribute('aria-hidden','true');
  $('openModules').setAttribute('aria-expanded','false');
}
$('openModules').onclick=openDrawer;
$('closeModules').onclick=closeDrawer;
$('drawerBackdrop').onclick=closeDrawer;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
$('retryLesson').onclick=()=>index>=0&&loadVideo(lessons[index],++requestVersion);
$('nextLesson').onclick=()=>{if(index<lessons.length-1)open(index+1,true)};
$('saveChallengeGoal').onclick=async()=>{
  const button=$('saveChallengeGoal'),status=$('challengeGoalStatus');
  const goal=$('challengeGoalText').value.trim();
  if(!goal){status.textContent='Write your goal first.';return}
  button.disabled=true;status.textContent='Saving…';
  try{await Fuse.api('challenge-goals',{goal});status.textContent='Saved. Coach Ria can see your goal.'}
  catch(error){status.textContent=error.message||'Could not save. Please try again.'}
  finally{button.disabled=false}
};

let selected=lessons.findIndex(l=>l.key===requestedLesson);
if(selected<0)selected=0;
if(key==='challenge'){
  // The course shell itself is restricted to the dedicated enrollment key.
  (async()=>{
    try{
      const sb=await Fuse.client();
      const session=await Fuse.session();
      const [profile,unlocks]=await Promise.all([
        sb.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle(),
        sb.from('module_unlocks').select('module_key').eq('user_id',session.user.id).eq('module_key','ai-video-client-challenge')
      ]);
      if(profile.error||unlocks.error)throw profile.error||unlocks.error;
      if(!profile.data?.is_admin && !unlocks.data?.length){
        $('lessonTitle').textContent='Challenge access required';
        $('lessonKicker').textContent='FUSE ATELIER · ENROLLMENT';
        setPlayerMessage('This course is for enrolled challenge students.');
        $('lessonStatus').textContent='Use the same email Ria enrolled in Fuse Operations.';
        $('openModules').disabled=true;
        $('nextLesson').disabled=true;
        $('lessonPrimaryAction').hidden=true;
        document.querySelector('.learn-card').hidden=true;
        return;
      }
      open(selected);
    }catch(error){
      $('lessonTitle').textContent='Could not check enrollment';
      setPlayerMessage('Please sign in and reload.');
      $('lessonStatus').textContent=error?.message||'Access check failed.';
    }
  })();
}else open(selected);
})();

