(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('world'),run=new FuseRunner.Runner();let last=0,best=0,muted=true,audio=null,pointer=null,shake=0;
try{best=Number(localStorage.getItem('fuse_rush_best'))||0}catch{}$('startBest').textContent='Personal best · '+best.toLocaleString();
if(!window.BABYLON||!BABYLON.Engine.isSupported()){$('startButton').disabled=true;$('live').textContent='3D could not load. Please reload or use a WebGL-enabled browser.';return}
const B=BABYLON,engine=new B.Engine(canvas,true,{stencil:true,preserveDrawingBuffer:false}),scene=new B.Scene(engine);
engine.setHardwareScalingLevel(Math.max(1,(devicePixelRatio||1)/1.5));
scene.clearColor=new B.Color4(.55,.79,.88,1);scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=95;scene.fogEnd=230;scene.fogColor=new B.Color3(.65,.82,.86);
const camera=new B.UniversalCamera('chase',new B.Vector3(0,5.8,-10),scene);camera.minZ=.1;camera.maxZ=300;camera.fov=.95;camera.setTarget(new B.Vector3(0,1.7,18));
new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene).intensity=.9;
const sun=new B.DirectionalLight('sun',new B.Vector3(-.5,-1,.4),scene);sun.intensity=1.3;
function mat(n,hex,glow=false){const m=new B.StandardMaterial(n,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=new B.Color3(.15,.15,.15);if(glow)m.emissiveColor=m.diffuseColor.scale(.7);return m}
const teal=mat('teal','#14636b'),cream=mat('cream','#eee0bc'),dark=mat('charcoal','#26323a'),metal=mat('steel','#7b9090'),gold=mat('energy','#ffd344',true),skin=mat('skin','#885335'),hair=mat('hair','#191c20'),coral=mat('coral','#c4795c'),glass=mat('glass','#173940'),green=mat('foliage','#458c63'),ground=mat('gravel','#8d8e78');
function box(n,w,h,d,x,y,z,m,parent){const a=B.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);a.position.set(x,y,z);a.material=m;if(parent)a.parent=parent;return a}
function sphere(n,diam,x,y,z,m,parent){const a=B.MeshBuilder.CreateSphere(n,{diameter:diam,segments:8},scene);a.position.set(x,y,z);a.material=m;if(parent)a.parent=parent;return a}
box('ground',70,.25,280,0,-.2,120,ground);
box('sea',100,.1,280,65,-1,120,mat('water','#319eae'));
for(const lane of [-1,0,1])for(const off of [-.7,.7])box('rail',.09,.12,280,lane*3+off,.05,120,metal);
const ties=[];for(let i=0;i<90;i++)for(const lane of [-1,0,1])ties.push(box('sleeper',2.15,.12,.25,lane*3,0,i*3, dark));
const scenery=[];for(let i=0;i<18;i++){const root=new B.TransformNode('district',scene);root.position.z=i*15;
for(const side of [-1,1]){const x=side*10,h=4+i%4;box('building',5,h,10,x,h/2,0,coral,root);box('roof',5.3,.25,10.3,x,h,0,cream,root);
for(let k=0;k<3;k++)box('window',.9,1.5,.05,x+(k-1)*1.4,h*.65,-5.05,glass,root);
box('platform',4,.4,15,side*7,.1,0,cream,root);
box('palm trunk',.3,5,.3,side*6,2.5,4,coral,root);for(let j=0;j<4;j++){const leaf=box('palm',.45,.12,3.8,side*6,5,4,green,root);leaf.rotation.y=j*Math.PI/2;leaf.rotation.z=.25;}
}box('gantry',12,.18,.2,0,7,0,metal,root);for(const side of [-1,1])box('post',.16,7,.16,side*5.5,3.5,0,metal,root);scenery.push(root)}
const player=new B.TransformNode('courier',scene);
box('jacket',.7,.8,.4,0,1.3,0,teal,player);box('collar',.5,.1,.44,0,1.75,0,cream,player);
sphere('head',.48,0,2.02,0,skin,player);sphere('hair',.49,0,2.16,.02,hair,player);
box('pack',.53,.66,.25,0,1.35,-.33,cream,player);box('core',.13,.49,.05,0,1.35,-.48,gold,player);
const limbs=[];for(const side of [-1,1]){const leg=new B.TransformNode('leg',scene);leg.parent=player;leg.position.set(side*.2,.95,0);box('trouser',.25,.8,.27,0,-.39,0,dark,leg);box('shoe',.29,.18,.48,0,-.83,.1,cream,leg);
const arm=new B.TransformNode('arm',scene);arm.parent=player;arm.position.set(side*.46,1.65,0);box('sleeve',.21,.55,.23,0,-.25,0,teal,arm);sphere('hand',.22,0,-.6,0,skin,arm);limbs.push({leg,arm,side})}
const drone=new B.TransformNode('sentinel',scene);sphere('shell',.65,0,0,0,cream,drone);sphere('eye',.29,0,0,.3,gold,drone);for(let i=0;i<3;i++){const fin=box('fin',.16,.13,.9,Math.sin(i*2.1)*.4,Math.cos(i*2.1)*.4,-.15,dark,drone);fin.rotation.z=i*2.1;}
const objects=new Map();
function object(o){const root=new B.TransformNode(o.kind,scene);root.position.x=o.lane*3;
if(o.kind==='coin'){const cell=B.MeshBuilder.CreateCylinder('cell',{diameter:.5,height:.12,tessellation:6},scene);cell.rotation.x=Math.PI/2;cell.material=gold;cell.parent=root;root.position.y=o.y;}
if(o.kind==='train'){box('train',2.35,3.2,12,0,1.6,6,teal,root);box('roof',2.4,.22,12,0,3.24,6,cream,root);box('windshield',1.9,1.1,.06,0,2.2,-.04,glass,root);box('stripe',2.4,.2,12,0,1,6,cream,root);for(let i=0;i<5;i++)for(const side of [-1,1])box('window',.04,.95,1.3,side*1.19,2.2,1.1+i*2,glass,root);for(const side of [-1,1])sphere('lamp',.2,side*.8,.7,-.1,gold,root);}
if(o.kind==='barrier'){box('barrier',2.25,.8,.25,0,.6,0,coral,root);for(const side of [-1,1])box('foot',.12,.5,.5,side*.9,.25,0,metal,root);}
if(o.kind==='arch'){for(const side of [-1,1])box('upright',.15,2.8,.2,side*1.1,1.4,0,metal,root);box('overhead',2.3,1.55,.4,0,1.93,0,teal,root);box('warning',2.3,.12,.42,0,1.15,0,gold,root);}
return root}
function render(){for(let i=0;i<ties.length;i++)ties[i].position.z=(Math.floor(i/3)*3-run.distance%3)-10;
scenery.forEach((s,i)=>s.position.z=i*15-run.distance%15-15);
player.position.set(run.x*3,run.height(),5);player.scaling.y=run.slide>0?.48:1;player.rotation.x=run.slide>0?-.28:0;player.rotation.z=-(run.lane-run.x)*.1;
limbs.forEach(({leg,arm,side})=>{const stride=run.mode==='playing'?Math.sin(run.time*13)*.65:0;leg.rotation.x=side*stride;arm.rotation.x=-side*stride});
drone.position.set(run.x*2.5+1.3,2.6+Math.sin(run.time*3)*.15,1.5);drone.rotation.z=Math.sin(run.time*2)*.12;
const live=new Set(run.objects);for(const [o,m] of objects)if(!live.has(o)){m.dispose();objects.delete(o)}
for(const o of run.objects){let m=objects.get(o);if(!m){m=object(o);objects.set(o,m)}m.position.z=o.z-run.distance;if(o.kind==='coin')m.rotation.y=run.time*2;}
camera.position.x+=(run.x*.75-camera.position.x)*.08;camera.setTarget(new B.Vector3(run.x*.5,1.5,20));scene.render()}
addEventListener('resize',()=>engine.resize());
function tone(freq,duration=.08){if(muted)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function hud(){$('score').textContent=run.score().toLocaleString();$('coins').textContent=run.coins;$('distance').textContent=Math.floor(run.distance)}
function over(){shake=13;tone(100,.25);navigator.vibrate?.(50);const score=run.score(),record=score>best;best=Math.max(best,score);try{localStorage.setItem('fuse_rush_best',String(best))}catch{}$('finalScore').textContent=score.toLocaleString();$('finalCoins').textContent=run.coins;$('endBest').textContent='Personal best · '+best.toLocaleString();$('endTitle').textContent=record?'New personal best.':'One more run?';$('over').hidden=false;$('again').focus();$('live').textContent='Run finished. Score '+score+'.';}
function begin(){run.reset();run.start();$('start').hidden=true;$('over').hidden=true;$('paused').hidden=true;$('live').textContent='Go! Swipe or use the buttons to move.';tone(500);setTimeout(()=>{$('live').textContent=''},3000);last=performance.now()}
function pause(){if(run.mode==='playing'){run.mode='paused';$('paused').hidden=false;$('resume').focus()}else if(run.mode==='paused'){run.mode='playing';$('paused').hidden=true;last=performance.now()}}
$('startButton').onclick=begin;$('again').onclick=begin;$('pause').onclick=pause;$('resume').onclick=pause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♫̸':'♫';$('sound').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');if(!muted){audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();tone(600)}};
$('share').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);$('share').textContent='Link copied ✓'}catch{$('share').textContent='Share this page’s address'}};
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();run.action(b.dataset.action)}));
addEventListener('keydown',e=>{const keys={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump',ArrowDown:'slide',s:'slide',S:'slide'};if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'||e.key==='p'||e.key==='P'){pause();return}if(e.repeat)return;if(keys[e.key]){if(run.mode==='ready'&&e.key===' ')begin();else run.action(keys[e.key])}});
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;run.action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy<0?'jump':'slide')});canvas.addEventListener('pointercancel',()=>pointer=null);document.addEventListener('visibilitychange',()=>{if(document.hidden&&run.mode==='playing')pause()});
function frame(now){const dt=last?(now-last)/1000:0;last=now;const was=run.mode;run.update(dt);for(const event of run.events){if(event==='coin')tone(800+run.coins%5*120)}run.events=[];if(was==='playing'&&run.mode==='over')over();shake=Math.max(0,shake-dt*20);hud();render();requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
