import * as THREE from './three.module.min.js';

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover:hover) and (pointer:fine)');
const sections=[...document.querySelectorAll('#problem,#system,#student-reviews,#founder-proof,#marycamella-story,#why-fuse,#instructor,#courses,#offer,#guarantee,.resources-section,#payment,#faq')];
const panels=[...document.querySelectorAll('.rebuild-system-media,.course-feature-media,.review-card,.benefit,.resource-card,.coach,.proof-image,.final-offer-video,.guarantee-panel,.payment-card')];
let paused=reduced.matches,active=null,dirty=true,frame=0,last=0,elapsed=0;
let pointerX=0,pointerY=0;
sections.forEach(s=>s.classList.add('fuse-spatial-section'));
panels.forEach(panel=>{
  panel.classList.add('fuse-spatial-panel');
  panel.addEventListener('pointermove',e=>{
    if(paused||!fine.matches)return;
    const r=panel.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    panel.style.setProperty('--panel-x',(0.5-y)*7+'deg');panel.style.setProperty('--panel-y',(x-.5)*9+'deg');
    panel.style.setProperty('--light-x',x*100+'%');panel.style.setProperty('--light-y',y*100+'%');
  });
  panel.addEventListener('pointerleave',()=>{panel.style.setProperty('--panel-x','0deg');panel.style.setProperty('--panel-y','0deg')});
});
const toggle=document.createElement('button');toggle.type='button';toggle.className='fuse-motion-toggle';document.body.append(toggle);
function updateMotion(){toggle.textContent=paused?'▷':'Ⅱ';toggle.setAttribute('aria-label',paused?'Enable visual motion':'Pause visual motion');toggle.setAttribute('aria-pressed',String(paused));document.documentElement.classList.toggle('fuse-motion-off',paused);window.dispatchEvent(new CustomEvent('fuse-motion',{detail:{paused}}));dirty=true}
toggle.addEventListener('click',()=>{paused=!paused;updateMotion()});reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion()});updateMotion();

const host=document.createElement('div');host.className='fuse-world';host.setAttribute('aria-hidden','true');
let renderer;
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'})}catch{renderer=null}
if(renderer){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,80);camera.position.z=12;
  scene.add(new THREE.HemisphereLight('#fffbd0','#0a2015',3));
  const light=new THREE.DirectionalLight('#caff70',4);light.position.set(4,6,8);scene.add(light);
  const group=new THREE.Group();scene.add(group);
  const silver=new THREE.MeshStandardMaterial({color:'#f0ffe4',metalness:.55,roughness:.3});
  const lime=new THREE.MeshStandardMaterial({color:'#c5ff62',metalness:.4,roughness:.3});
  const gold=new THREE.MeshStandardMaterial({color:'#fff36a',metalness:.35,roughness:.26});
  const rings=[];
  for(let i=0;i<8;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(3+i*.2,.016,6,96),i%3===0?gold:i%3===1?lime:silver);group.add(ring);rings.push(ring)}
  const nodes=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.085,0),lime,70);group.add(nodes);
  const matrix=new THREE.Object3D();
  // Deterministic seeds keep chapter transitions stable on repeat visits.
  const seeds=Array.from({length:70},(_,i)=>({a:i*2.399963,r:2.4+(i%11)*.26,y:(i%17-8)*.48}));
  let width=0,height=0,mode=0,progress=0;
  function locate(){
    let best=null,score=0;
    for(const section of sections){const r=section.getBoundingClientRect();const visible=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));if(visible>score){score=visible;best=section}}
    if(best!==active){active=best;if(active){active.prepend(host);mode=sections.indexOf(active)%5;resize()}else host.remove()}
    if(active){const r=active.getBoundingClientRect();progress=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-innerHeight)));}
  }
  function resize(){if(!active)return;width=active.clientWidth;height=Math.min(innerHeight,1000);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();dirty=true}
  addEventListener('scroll',()=>{dirty=true},{passive:true});addEventListener('resize',()=>{resize();dirty=true},{passive:true});
  addEventListener('pointermove',e=>{if(!fine.matches||paused)return;pointerX=(e.clientX/innerWidth-.5)*.35;pointerY=(e.clientY/innerHeight-.5)*.2},{passive:true});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.hidden=true;cancelAnimationFrame(frame)});
  function animate(ms){
    frame=requestAnimationFrame(animate);
    const dt=Math.min((ms-last)/1000,.05);last=ms;
    if(document.hidden)return;
    const repaint=dirty;
    if(dirty){locate();dirty=false}
    if(!active)return;
    if(paused&&!repaint)return;
    if(!paused)elapsed+=dt;
    const t=elapsed*.16;
    group.position.set(0,0,-1);group.rotation.set(pointerY,pointerX,0);
    rings.forEach((ring,i)=>{
      ring.position.set(0,0,0);ring.scale.setScalar(1);
      if(mode===0){ring.rotation.set(.8+i*.13,t+i*.3,i*.25);ring.position.x=Math.sin(i)*1.2}
      if(mode===1){ring.rotation.set(0,0,t*.2);ring.position.z=-i*1.8+progress*2;ring.scale.set(1.5,1,1)}
      if(mode===2){ring.rotation.set(1.1,t+i*.4,i*.5);ring.scale.setScalar(.8+i*.08)}
      if(mode===3){ring.rotation.set(.3+i*.14,t*.5,.35);ring.position.y=(i-3.5)*.35;ring.scale.setScalar(.85)}
      if(mode===4){ring.rotation.set(i*.22,t+i*.3,.5);ring.scale.setScalar(1+Math.sin(t+i)*.06)}
    });
    seeds.forEach((s,i)=>{const a=s.a+t*(i%2?1:-1);matrix.position.set(Math.cos(a)*s.r,mode===1?s.y:Math.sin(a)*s.r*.75,Math.sin(a*.7)*2-2);matrix.rotation.set(a,a*.6,0);matrix.updateMatrix();nodes.setMatrixAt(i,matrix.matrix)});nodes.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(animate);
  addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(frame);scene.traverse(o=>o.geometry?.dispose());silver.dispose();lime.dispose();gold.dispose();renderer.dispose()});
}
