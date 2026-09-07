import * as THREE from './three.module.min.js';

const root='/atelier-site/assets/';
const art=['showcase/slamit-beatup.jpg','showcase/slamit-heat.jpg','showcase/lamer-underwater.jpg','showcase/bulldog-product.jpg','course-landing-page.png','showcase/avatar-pink-boutique.jpg'];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobile=matchMedia('(max-width: 700px)').matches;
const instances=[];
const chapterObjects=[];
const loader=new THREE.TextureLoader();
const logo=document.querySelector('.rebuild-brand img');
if(logo)logo.src=root+'immersive/fuse-logo-transparent.png';

function fallback(host,paths){
  const box=document.createElement('div');box.className='fuse-fallback';box.setAttribute('aria-hidden','true');
  paths.forEach(p=>{const img=document.createElement('img');img.src=root+p;img.alt='';img.loading='lazy';box.append(img)});host.append(box);
}
const hero=document.querySelector('[data-scene="core"]');
fallback(hero,['immersive/fuse-logo-transparent.png']);
const gallery=document.createElement('div');gallery.className='fuse-gallery';
const stage=document.createElement('div');stage.className='fuse-stage';stage.setAttribute('role','group');stage.setAttribute('aria-label','Six featured creations. Use arrow keys or swipe horizontally to explore.');stage.tabIndex=0;
gallery.append(stage);fallback(stage,art);
document.querySelector('#student-work .student-strip')?.before(gallery);
document.getElementById('student-work')?.classList.add('fuse-gallery-active');
const caption=document.createElement('div');caption.className='fuse-gallery-caption';gallery.append(caption);
const titles=['Product Campaign Flyer','Sports Campaign Flyer','Skincare Product Ad','Pet Product Photography','Landing Page Design','Fashion AI Portrait'];
caption.textContent=titles[0];
// Keep the original short films available inside the single gallery.
const films=[...document.querySelectorAll('#student-work .student-strip video')];
if(films.length){
  const open=document.createElement('button');open.className='fuse-films-button';open.type='button';open.textContent='Watch student films';gallery.append(open);
  const dialog=document.createElement('dialog');dialog.className='fuse-film-dialog';dialog.setAttribute('aria-label','Student films');
  const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';
  const name=document.createElement('p');const actions=document.createElement('div');let selected=0;
  const show=()=>{const source=films[selected];video.pause();video.src=source.dataset.src||source.currentSrc||source.src;video.poster=source.poster;name.textContent=source.closest('article')?.querySelector('span')?.textContent||'Student film';video.load()};
  [['Previous film',()=>{selected=(selected+films.length-1)%films.length;show()}],['Next film',()=>{selected=(selected+1)%films.length;show()}],['Close',()=>dialog.close()]].forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.append(b)});
  dialog.append(name,video,actions);document.body.append(dialog);open.addEventListener('click',()=>{show();dialog.showModal()});dialog.addEventListener('close',()=>{video.pause();open.focus()});
}

// Procedural studio reflections, with no external environment dependency.
function environment(renderer){
  const room=new THREE.Scene();room.background=new THREE.Color('#182e29');
  const panel=(x,y,z,w,h,color)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);room.add(m)};
  panel(-4,2,2,3,8,'#ffffff');panel(4,1,0,2,9,'#c7ff71');panel(0,5,-2,8,2,'#ffffff');panel(0,-3,4,8,1,'#58cdd5');panel(-2,0,-5,1,6,'#c8efff');
  const pm=new THREE.PMREMGenerator(renderer);const target=pm.fromScene(room,.08);pm.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});return target;
}
function make(host){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'default'})}catch{return null}
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  host.prepend(renderer.domElement);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,0,8);
  const env=environment(renderer);scene.environment=env.texture;
  scene.add(new THREE.HemisphereLight('#efffd8','#061a17',3));
  const light=new THREE.DirectionalLight('#dcffb0',4);light.position.set(3,4,5);scene.add(light);
  const resize=()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()};
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  const state={renderer,scene,camera,host,visible:false,render:null,env,ro};
  const io=new IntersectionObserver(es=>{state.visible=es[0].isIntersecting;if(state.visible&&reduced.matches)draw(state,0,0)},{rootMargin:'80px'});io.observe(host);state.io=io;
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.visible=false;host.classList.remove('fuse-ready')});
  renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
  instances.push(state);return state;
}
const chrome=new THREE.MeshPhysicalMaterial({color:'#d7e7e6',metalness:1,roughness:.16,clearcoat:1,iridescence:.7,iridescenceIOR:1.5});
const lime=new THREE.MeshPhysicalMaterial({color:'#baff4e',metalness:.5,roughness:.18,clearcoat:1});
function ribbon(radius,phase){
  const positions=[],indices=[],segments=mobile?180:300;
  for(let i=0;i<=segments;i++){
    const t=i/segments*Math.PI*2;
    for(let j=0;j<2;j++){
      const w=(j-.5)*.48;const r=radius+w*Math.cos(t*1.5+phase);
      positions.push(r*Math.cos(t),r*Math.sin(t),.48*Math.sin(t*2+phase)+w*Math.sin(t*1.5+phase));
    }
    if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function bindDrag(host,onDelta){
  let x=0,y=0,down=false;
  host.addEventListener('pointerdown',e=>{x=e.clientX;y=e.clientY;down=true;host.setPointerCapture?.(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-x,dy=e.clientY-y;if(Math.abs(dx)>Math.abs(dy))onDelta(dx);x=e.clientX;y=e.clientY});
  const stop=()=>{down=false};host.addEventListener('pointerup',stop);host.addEventListener('pointercancel',stop);host.addEventListener('pointerleave',stop);
}
function controls(host,prev,next,toggle){
  const row=document.createElement('div');row.className='fuse-controls';
  [['←','Previous view',prev],['Ⅱ','Pause animation',toggle],['→','Next view',next]].forEach(([symbol,label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=symbol;b.setAttribute('aria-label',label);b.addEventListener('click',()=>{fn();if(label==='Pause animation'){const paused=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(paused));b.textContent=paused?'▷':'Ⅱ';b.setAttribute('aria-label',paused?'Resume animation':'Pause animation')}});row.append(b)});host.parentElement.append(row);
}
const core=make(hero);
if(core){
  const group=new THREE.Group();core.scene.add(group);
  chrome.side=THREE.DoubleSide;
  for(let i=0;i<3;i++){const mesh=new THREE.Mesh(ribbon(1.5+i*.12,i),i===1?lime:chrome);mesh.rotation.set(i*.8,i*.65,i*.45);group.add(mesh)}
  const shape=new THREE.Shape();shape.moveTo(0,.48);shape.lineTo(-.38,-.2);shape.lineTo(.38,-.2);shape.closePath();
  const badge=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025}),new THREE.MeshStandardMaterial({color:'#fff36a',metalness:.35,roughness:.2}));group.add(badge);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(1,.08,.14),lime);bar.position.y=-.42;bar.rotation.z=.3;group.add(bar);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshStandardMaterial({color:'#0b241c',metalness:.8,roughness:.3}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.15;core.scene.add(floor);
  let turn=0,paused=false;hero.tabIndex=0;hero.setAttribute('aria-label','Chrome Fuse sculpture. Drag horizontally or use arrow keys to rotate.');
  bindDrag(hero,d=>turn+=d*.008);hero.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();turn+=e.key==='ArrowLeft'?-.3:.3}});
  controls(hero,()=>turn-=.6,()=>turn+=.6,()=>paused=!paused);
  core.render=(t,dt)=>{if(!paused&&!reduced.matches)turn+=dt*.18;const r=hero.getBoundingClientRect();const scroll=Math.max(-1,Math.min(1,r.top/innerHeight));group.rotation.set(.15+scroll*.16,turn,-.2);group.position.y=reduced.matches?0:Math.sin(t*.6)*.09;group.scale.setScalar(mobile?.83:1);};
}
const works=make(stage);
if(works){
  works.camera.position.z=9;const cards=[];let target=0,current=0,paused=false;
  art.forEach((path,i)=>{
    const group=new THREE.Group();const frame=new THREE.Mesh(new THREE.BoxGeometry(2.12,2.65,.09),chrome);group.add(frame);
    loader.load(root+path,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,works.renderer.capabilities.getMaxAnisotropy());const ratio=texture.image.width/texture.image.height;let w=2,h=2/ratio;if(h>2.5){h=2.5;w=h*ratio}const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));face.position.z=.055;group.add(face)});
    works.scene.add(group);cards.push(group);
  });
  // Architectural arches recede in real perspective behind the work.
  for(let i=0;i<9;i++){const arch=new THREE.Mesh(new THREE.TorusGeometry(4.1,.018,6,80),new THREE.MeshBasicMaterial({color:i%2?'#365d45':'#b6df7a',transparent:true,opacity:.36-i*.025}));arch.scale.y=1.25;arch.position.z=-i*2-2;works.scene.add(arch)}
  const move=d=>{target+=d;paused=true};bindDrag(stage,d=>move(-d*.005));
  controls(stage,()=>move(-1),()=>move(1),()=>paused=!paused);
  stage.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1)}});
  works.render=(t,dt)=>{if(!paused&&!reduced.matches)target+=dt*.13;current=reduced.matches?target:current+(target-current)*Math.min(1,dt*7);const selected=((Math.round(current)%6)+6)%6;caption.textContent=titles[selected];cards.forEach((c,i)=>{let offset=((i-current+3)%6+6)%6-3;c.position.set(offset*2.5,Math.sin(offset*.5)*.16,-Math.abs(offset)*1.6);c.rotation.y=-offset*.22;c.rotation.z=offset*.025});works.camera.position.z=mobile?7.4:8.5};
}
function draw(s,t,dt){try{s.render?.(t,dt);s.renderer.render(s.scene,s.camera);s.host.classList.add('fuse-ready')}catch{s.host.classList.remove('fuse-ready');s.visible=false}}
let last=0;
function tick(ms){const dt=Math.min((ms-last)/1000,.05);last=ms;if(!document.hidden){instances.forEach(s=>{if(s.visible)draw(s,ms/1000,reduced.matches?0:dt)});if(!reduced.matches)chapterObjects.forEach(el=>{const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;const p=Math.max(-1,Math.min(1,(r.top+r.height/2-innerHeight/2)/innerHeight));el.style.setProperty('--chapter-turn',p*5+'deg');el.style.setProperty('--chapter-lift',p*-12+'px');el.style.setProperty('--fuse-x',(50+p*30)+'%')})}requestAnimationFrame(tick)}requestAnimationFrame(tick);
document.querySelectorAll('.rebuild-system-card,.course-feature,.founding-offer-card').forEach(el=>{el.classList.add('fuse-chapter');chapterObjects.push(el)});
// Treat the actual student video as a floating phone, preserving playback controls.
const twin=document.getElementById('maryTwinVideo');
if(twin){twin.classList.add('fuse-twin-screen');twin.parentElement.classList.add('fuse-phone-stage')}
document.querySelectorAll('.course-feature-media,.restored-mary-video,.instructor-photo').forEach(el=>{el.classList.add('fuse-depth');el.addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType==='touch')return;const r=el.getBoundingClientRect();el.style.setProperty('--fuse-ry',((e.clientX-r.left)/r.width-.5)*10+'deg');el.style.setProperty('--fuse-rx',-((e.clientY-r.top)/r.height-.5)*8+'deg')});el.addEventListener('pointerleave',()=>{el.style.setProperty('--fuse-ry','0deg');el.style.setProperty('--fuse-rx','0deg')})});
// Original testimonial video controls and payment listeners are intentionally untouched.
window.addEventListener('pagehide',e=>{if(e.persisted)return;instances.forEach(s=>{s.io.disconnect();s.ro.disconnect();s.env.dispose();s.renderer.dispose()})});
