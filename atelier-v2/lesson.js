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
  $('drawerCourseMeta').textContent=lessons.length+' lessons · start at your own pace';
  $('drawerProgress').style.width=(lessons.length?Math.round(visited.size/lessons.length*100):0)+'%';
  const nodes=modules.map((m,mi)=>{
    const wrap=document.createElement('section');
    wrap.className='drawer-module'+(m.isNew?' featured':'');
    const head=document.createElement('button');
    head.type='button';head.className='drawer-module-head';
    const left=document.createElement('div');
    const title=document.createElement('div');title.className='drawer-module-title';title.textContent=m.title;
    left.appendChild(title);
    if(m.isNew||m.watchNow){
      const tags=document.createElement('div');tags.className='drawer-feature-tags';
      if(m.isNew){const t=document.createElement('span');t.className='drawer-feature-tag';t.textContent='New';tags.appendChild(t)}
      if(m.watchNow){const t=document.createElement('span');t.className='drawer-feature-tag watch';t.textContent='Watch now';tags.appendChild(t)}
      left.appendChild(tags);
    }
    const count=document.createElement('span');count.className='drawer-module-count';count.textContent=moduleLessonCount(m)+' '+(moduleLessonCount(m)===1?'lesson':'lessons');
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
      const label=document.createElement('span');label.textContent=l.title;
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
    url=lesson.videoUrl||'';
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
  const topic=cleanTopic(lesson.title);
  $('learnCopy').textContent=lesson.learnText||('In this lesson, '+topic+' is broken into a clear, practical workflow you can apply immediately.');
  $('actionCopy').textContent=lesson.actionText||('Pause and apply the key idea from “'+lesson.title+'” before you continue.');
  $('nextLesson').disabled=i>=lessons.length-1;
  history.replaceState(null,'','?course='+encodeURIComponent(key)+'&lesson='+encodeURIComponent(lesson.key));
  renderDrawer();
  await loadVideo(lesson,version);
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
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

let selected=lessons.findIndex(l=>l.key===requestedLesson);
if(selected<0)selected=0;
open(selected);
})();