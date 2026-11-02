(()=>{'use strict';
const feature=document.getElementById('freeTutorialFeature');if(!feature)return;
const like=document.getElementById('tutorialLike'),status=document.getElementById('tutorialCountStatus');
let signedIn=false,liked=false,busy=false,viewed=false,observer,timer,client;
const pretty=n=>new Intl.NumberFormat('en',{notation:Number(n)>=10000?'compact':'standard',maximumFractionDigits:1}).format(n);
function paint(data){signedIn=data.signedIn;liked=data.liked;like.setAttribute('aria-pressed',String(liked));document.getElementById('tutorialLikeCount').textContent=pretty(data.likes);document.getElementById('tutorialViewCount').textContent=pretty(data.views);like.setAttribute('aria-label',(liked?'Unlike':'Like')+' free tutorials, '+data.likes+' likes');document.getElementById('tutorialViews').setAttribute('aria-label',data.views+' views. Open free tutorials');}
async function request(body){client ||= await Fuse.client();const {data}=await client.auth.getSession();const token=data?.session?.access_token;const response=await fetch('/api/academy-engagement',{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});const out=await response.json();if(!response.ok)throw Error(out.error||'Could not load counts.');paint(out);return out;}
request().catch(()=>{status.textContent='Counts are temporarily unavailable.'});
like.onclick=async()=>{if(busy)return;if(!signedIn){location.assign('/signup?next='+encodeURIComponent(location.pathname));return}busy=true;like.disabled=true;try{await request({action:'like',liked:!liked});status.textContent=''}catch(e){status.textContent=e.message}finally{busy=false;like.disabled=false}};
async function countView(){if(viewed||document.hidden)return;try{await request({action:'view'});viewed=true;observer?.disconnect();status.textContent=''}catch{status.textContent='View could not be recorded. Tap the view count to retry.'}}
const cover=feature.querySelector('.tutorial-cover');document.getElementById('tutorialViews').addEventListener('click',()=>{countView()});
if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{clearTimeout(timer);if(entries[0].isIntersecting&&entries[0].intersectionRatio>=.5)timer=setTimeout(countView,1000)},{threshold:[0,.5]});observer.observe(cover)}else countView();
const tabs=[...document.querySelectorAll('.tutorial-tab')];
function syncVideos(){document.querySelectorAll(".tutorial-slot video").forEach(v=>{v.muted=true;v.defaultMuted=true;v.controls=false;if(document.hidden||v.closest("[hidden]"))v.pause();else v.play().catch(()=>{})})}
function select(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active});syncVideos()}
tabs.forEach((tab,i)=>{tab.onclick=()=>select(tab);tab.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();select(tabs[n]);tabs[n].focus()}});
document.addEventListener("visibilitychange",syncVideos);syncVideos();
})();