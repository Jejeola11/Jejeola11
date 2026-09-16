// Safe server-side renderer for Fuse Pages SiteSpec.
// The AI never emits executable HTML/JS. We render structured fields through
// this fixed template so published pages stay predictable and secure.

function esc(v=''){
  return String(v??'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function arr(v){ return Array.isArray(v)?v:[]; }
function text(v,fallback=''){ return typeof v==='string'&&v.trim()?v.trim():fallback; }
function safeUrl(v=''){
  try{
    const u=new URL(String(v));
    return (u.protocol==='https:'||u.protocol==='http:')?u.toString():'';
  }catch{return ''}
}
function actionHref(contact={}){
  const direct=safeUrl(contact.cta_url||'');
  if(direct)return direct;
  const email=String(contact.email||'').trim();
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return 'mailto:'+email;
  const phone=String(contact.phone||'').replace(/[^\d+]/g,'');
  if(phone.length>=8)return 'tel:'+phone;
  return '#content';
}

function itemCards(items){
  return arr(items).slice(0,6).map((it,i)=>{
    if(typeof it==='string') return '<article class="card"><span class="num">0'+(i+1)+'</span><h3>'+esc(it)+'</h3></article>';
    return '<article class="card"><span class="num">0'+(i+1)+'</span><h3>'+esc(text(it.title,'Built for the outcome'))+'</h3><p>'+esc(text(it.text,''))+'</p></article>';
  }).join('');
}
function quoteCards(items){
  return arr(items).slice(0,4).map(it=>{
    const q=typeof it==='string'?it:text(it.quote,'Premium enough to feel established, simple enough to act on.');
    const n=typeof it==='string'?'Customer':text(it.name,'Customer');
    return '<article class="quote">“'+esc(q)+'”<span>— '+esc(n)+'</span></article>';
  }).join('');
}
function faqCards(items){
  return arr(items).slice(0,8).map(it=>{
    const q=typeof it==='string'?it:text(it.q,'What happens next?');
    const a=typeof it==='string'?'Get in touch to continue.':text(it.a,'Get in touch to continue.');
    return '<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>';
  }).join('');
}
function renderSection(section){
  const type=text(section&&section.type,'features');
  const eyebrow=text(section&&section.eyebrow,'');
  const title=text(section&&section.title,'');
  const body=text(section&&section.text,'');
  const head='<div class="section-head">'+(eyebrow?'<span>'+esc(eyebrow)+'</span>':'')+(title?'<h2>'+esc(title)+'</h2>':'')+(body?'<p>'+esc(body)+'</p>':'')+'</div>';

  if(type==='testimonials') return '<section class="section">'+head+'<div class="quotes">'+quoteCards(section.items)+'</div></section>';
  if(type==='faq') return '<section class="section">'+head+'<div class="faq">'+faqCards(section.items)+'</div></section>';
  if(type==='cta') return '<section class="section"><div class="cta-block">'+(eyebrow?'<span>'+esc(eyebrow)+'</span>':'')+'<h2>'+esc(title||'Ready for the next step?')+'</h2>'+(body?'<p>'+esc(body)+'</p>':'')+'<a href="#contact">'+esc(text(section.button,'Get started'))+' →</a></div></section>';
  if(type==='immersive') return '<section class="section immersive">'+head+'<div class="depth-stage" aria-hidden="true"><i></i><i></i><i></i></div></section>';
  return '<section class="section">'+head+'<div class="cards">'+itemCards(section.items)+'</div></section>';
}

function renderSite(spec={},opts={}){
  const meta=spec.meta||{};
  const theme=spec.theme||{};
  const nav=spec.nav||{};
  const contact=spec.contact||{};
  const hero=spec.hero||{};
  const motion=spec.motion||{};
  const brand=text(nav.brand,text(meta.title,'Your Brand'));
  const accent=/^#[0-9a-f]{6}$/i.test(theme.accent||'')?theme.accent:'#DFFF4E';
  const secondary=/^#[0-9a-f]{6}$/i.test(theme.secondary||'')?theme.secondary:'#FFE66A';
  const surface=/^#[0-9a-f]{6}$/i.test(theme.surface||'')?theme.surface:'#062125';
  const isLight=theme.mode==='light';
  const pageBg=isLight?'#f4f4ef':'#041011';
  const ink=isLight?'#101414':'#f4f8f4';
  const muted=isLight?'#5d6967':'#aabbb9';
  const card=isLight?'#ffffff':surface;
  const line=isLight?'#d7ddda':'#315456';
  const heroVisual=text(hero.visual&&hero.visual.type,'editorial-gradient');
  const heroImage=safeUrl(hero.visual&&hero.visual.image_url);
  const heroVideo=safeUrl(hero.visual&&hero.visual.video_url);
  const exp=text(theme.experience,text(motion.level,'clean'));
  const sections=arr(spec.sections).slice(0,12);
  const interactive=heroVisual==='orb-3d'||motion.three_d===true||exp==='3d';
  const reveal=motion.reveal===true||['animated','cinematic','3d'].includes(exp);
  const finalHref=actionHref(contact);
  const finalTarget=/^https?:\/\//.test(finalHref)?' target="_blank" rel="noopener"':'';

  return '<!doctype html>'+
'<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
'<title>'+esc(text(meta.title,brand))+'</title><meta name="description" content="'+esc(text(meta.objective,'Premium website experience'))+'">'+
'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
'<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">'+
'<style>'+
':root{--bg:'+pageBg+';--ink:'+ink+';--muted:'+muted+';--card:'+card+';--line:'+line+';--accent:'+accent+';--secondary:'+secondary+';}'+
'*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Montserrat,Arial,sans-serif;overflow-x:hidden}'+
'body:before{content:"";position:fixed;inset:0;z-index:-3;background:radial-gradient(circle at 82% 8%,color-mix(in srgb,var(--accent) 15%,transparent),transparent 27%),radial-gradient(circle at 8% 72%,color-mix(in srgb,var(--secondary) 10%,transparent),transparent 24%)}'+
'.wrap{width:min(1120px,calc(100% - 34px));margin:auto}'+
'nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:blur(18px);border-bottom:1px solid color-mix(in srgb,var(--line) 70%,transparent)}'+
'nav .in{height:70px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{font-size:19px;font-weight:600;letter-spacing:-.5px}.navlinks{display:flex;align-items:center;gap:20px}.navlinks a{color:var(--muted);text-decoration:none;font-size:13px}.navlinks .navcta{padding:10px 15px;border-radius:999px;color:#001012;background:linear-gradient(105deg,var(--secondary),var(--accent),#EEFFE0);font-weight:500}'+
'.hero{min-height:82svh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:54px;align-items:center;padding:78px 0}.eyebrow,.section-head>span,.cta-block>span{display:inline-block;color:var(--accent);font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase}.hero h1{margin:12px 0 16px;max-width:760px;font-size:clamp(44px,7vw,82px);line-height:.94;letter-spacing:-3px;font-weight:500}.hero p{max-width:610px;margin:0;color:var(--muted);font-size:17px;line-height:1.65;font-weight:300}.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}.hero-actions a{padding:13px 19px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:500}.primary{background:linear-gradient(105deg,var(--secondary),var(--accent),#EEFFE0);color:#001012}.ghost{border:1px solid var(--line);color:var(--ink);background:color-mix(in srgb,var(--card) 78%,transparent)}'+
'.hero-art{position:relative;min-height:500px;display:grid;place-items:center;perspective:1000px}.hero-card,.hero-media{position:absolute;width:78%;aspect-ratio:4/5;border-radius:32px;border:1px solid color-mix(in srgb,var(--accent) 32%,var(--line));box-shadow:0 35px 80px rgba(0,0,0,.28);overflow:hidden}.hero-card{background:linear-gradient(145deg,color-mix(in srgb,var(--card) 90%,#fff 4%),color-mix(in srgb,var(--accent) 18%,var(--card)))}.hero-card:before{content:"";position:absolute;inset:-20%;background:radial-gradient(circle at 70% 25%,color-mix(in srgb,var(--secondary) 70%,transparent),transparent 16%),radial-gradient(circle at 25% 75%,color-mix(in srgb,var(--accent) 60%,transparent),transparent 20%);filter:blur(2px)}.hero-media img,.hero-media video{width:100%;height:100%;display:block;object-fit:cover}.hero-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,16,18,.28))}.hero-art .orb{z-index:3}.hero-art.has-media .orb{width:145px;height:145px;position:absolute;right:4%;bottom:8%;opacity:.92}'+
'.orb{width:230px;height:230px;border-radius:50%;position:relative;background:conic-gradient(from 210deg,var(--accent),var(--secondary),#EEFFE0,var(--accent));box-shadow:0 28px 80px color-mix(in srgb,var(--accent) 30%,transparent);transform-style:preserve-3d}.orb:after{content:"";position:absolute;inset:22%;border-radius:50%;background:var(--card);filter:blur(2px)}.three-stage{position:relative;width:78%;aspect-ratio:4/5;border-radius:32px;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 32%,var(--line));background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 36%),linear-gradient(145deg,color-mix(in srgb,var(--card) 94%,#fff 3%),var(--card));box-shadow:0 35px 80px rgba(0,0,0,.28)}.three-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.three-fallback{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);opacity:.32}.three-stage.ready .three-fallback{opacity:0}'+
'.section{padding:86px 0}.section-head{max-width:760px;margin:0 0 30px}.section-head h2,.cta-block h2{margin:8px 0 10px;font-size:clamp(30px,5vw,52px);line-height:1.02;letter-spacing:-1.8px;font-weight:500}.section-head p,.cta-block p{margin:0;color:var(--muted);font-size:15px;line-height:1.65;font-weight:300;max-width:650px}'+
'.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{min-height:180px;padding:22px;border:1px solid var(--line);border-radius:24px;background:color-mix(in srgb,var(--card) 92%,transparent)}.num{font-size:11px;color:var(--accent);letter-spacing:.1em}.card h3{margin:22px 0 8px;font-size:19px;font-weight:500}.card p{margin:0;color:var(--muted);font-size:13px;line-height:1.55;font-weight:300}'+
'.quotes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.quote{padding:24px;border:1px solid var(--line);border-radius:24px;background:var(--card);font-size:18px;line-height:1.55;font-weight:400}.quote span{display:block;margin-top:18px;color:var(--accent);font-size:12px;font-weight:400}'+
'.faq{max-width:780px}.faq details{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:16px 18px;margin-bottom:10px}.faq summary{cursor:pointer;font-size:15px;font-weight:500}.faq p{color:var(--muted);font-size:14px;line-height:1.6;font-weight:300}'+
'.cta-block{padding:54px;border:1px solid color-mix(in srgb,var(--accent) 42%,var(--line));border-radius:34px;background:radial-gradient(circle at 80% 10%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 30%),var(--card);text-align:center}.cta-block p{margin:0 auto}.cta-block a{display:inline-block;margin-top:22px;padding:13px 20px;border-radius:999px;text-decoration:none;color:#001012;background:linear-gradient(105deg,var(--secondary),var(--accent),#EEFFE0);font-size:14px;font-weight:500}'+
'.depth-stage{height:320px;border-radius:30px;border:1px solid var(--line);background:radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 34%),var(--card);position:relative;overflow:hidden;perspective:900px}.depth-stage i{position:absolute;left:50%;top:50%;width:160px;height:160px;margin:-80px;border-radius:32px;border:1px solid color-mix(in srgb,var(--accent) 40%,var(--line));background:linear-gradient(145deg,color-mix(in srgb,var(--card) 88%,#fff 4%),color-mix(in srgb,var(--accent) 28%,var(--card)));transform:translateZ(0) rotate(18deg)}.depth-stage i:nth-child(2){transform:translate(-70px,-20px) translateZ(-120px) rotate(-12deg);opacity:.55}.depth-stage i:nth-child(3){transform:translate(70px,30px) translateZ(-220px) rotate(35deg);opacity:.3}'+
'footer{padding:44px 0 60px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}footer b{color:var(--ink)}'+
(reveal?'.reveal{opacity:0;transform:translateY(24px);transition:.7s ease}.reveal.in{opacity:1;transform:none}':'')+
'@media(max-width:800px){.navlinks a:not(.navcta){display:none}.hero{grid-template-columns:1fr;gap:28px;padding:58px 0 66px;min-height:auto}.hero h1{font-size:clamp(42px,13vw,64px);letter-spacing:-2.3px}.hero-art{min-height:400px}.hero-card{width:min(340px,84%)}.cards{grid-template-columns:1fr}.quotes{grid-template-columns:1fr}.section{padding:62px 0}.cta-block{padding:36px 22px}.section-head h2,.cta-block h2{font-size:34px}}'+
'@media(max-width:430px){.wrap{width:calc(100% - 24px)}nav .in{height:62px}.brand{font-size:16px}.navlinks .navcta{font-size:12px;padding:9px 12px}.hero p{font-size:15px}.hero-art{min-height:340px}.orb{width:190px;height:190px}.section{padding:52px 0}}'+
'@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}'+
'</style></head><body>'+
'<nav><div class="wrap in"><div class="brand">'+esc(brand)+'</div><div class="navlinks">'+arr(nav.items).slice(0,4).map(i=>'<a href="#content">'+esc(i)+'</a>').join('')+'<a class="navcta" href="#contact">'+esc(text(nav.cta,'Get started'))+'</a></div></div></nav>'+
'<main><section class="hero wrap"><div><span class="eyebrow">'+esc(text(hero.eyebrow,'PREMIUM EXPERIENCE'))+'</span><h1>'+esc(text(hero.headline,'Build something people remember.'))+'</h1><p>'+esc(text(hero.subheadline,'A clear, premium experience designed around the next action.'))+'</p><div class="hero-actions"><a class="primary" href="#contact">'+esc(text(hero.primary_cta,'Get started'))+' →</a>'+(hero.secondary_cta?'<a class="ghost" href="#content">'+esc(hero.secondary_cta)+'</a>':'')+'</div></div>'+
'<div class="hero-art'+((heroImage||heroVideo)?' has-media':'')+'">'+
((heroImage||heroVideo)
  ? '<div class="hero-media">'+(heroVideo?'<video src="'+esc(heroVideo)+'" autoplay muted loop playsinline preload="metadata" poster="'+esc(heroImage)+'"></video>':'<img src="'+esc(heroImage)+'" alt="" loading="eager" decoding="async">')+'</div>'
  : (interactive?'<div class="three-stage" data-three-stage><canvas data-three></canvas><div class="orb three-fallback" aria-hidden="true"></div></div>':'<div class="hero-card"></div>'))+
((interactive&&(heroImage||heroVideo))?'<div class="orb" data-orb></div>':'')+
'</div></section>'+
'<div id="content" class="wrap">'+sections.map((s,i)=>'<div class="'+(reveal?'reveal':'')+'" style="--i:'+i+'">'+renderSection(s)+'</div>').join('')+'</div>'+
'<section id="contact" class="wrap section"><div class="cta-block"><span>LET’S BUILD</span><h2>'+esc(text(meta.objective,'Ready for the next step?'))+'</h2><p>'+esc(text(meta.audience,'Make the next action easy and clear.'))+'</p><a href="'+esc(finalHref)+'"'+finalTarget+'>'+esc(text(nav.cta,'Get started'))+' →</a></div></section></main>'+
'<footer><div class="wrap"><b>'+esc(brand)+'</b><br>Built with Fuse Pages.</div></footer>'+
(reveal?'<script>const els=[...document.querySelectorAll(".reveal")];if("IntersectionObserver"in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});els.forEach(el=>io.observe(el))}else els.forEach(el=>el.classList.add("in"));<\/script>':'')+
(interactive?'<script>const orb=document.querySelector("[data-orb]");if(orb&&!matchMedia("(prefers-reduced-motion: reduce)").matches){addEventListener("pointermove",function(e){var x=(e.clientX/innerWidth-.5)*18;var y=(e.clientY/innerHeight-.5)*-18;orb.style.transform="rotateX("+y+"deg) rotateY("+x+"deg)";},{passive:true});}<\/script><script type="module">const canvas=document.querySelector("[data-three]");if(canvas){try{const THREE=await import("/atelier-site/assets/immersive/three.module.min.js");const stage=canvas.closest("[data-three-stage]");const renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.z=4.6;const geometry=new THREE.TorusKnotGeometry(1.05,.34,96,14);const material=new THREE.MeshPhysicalMaterial({color:new THREE.Color("'+esc(accent)+'"),metalness:.72,roughness:.18,clearcoat:1,clearcoatRoughness:.12});const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(3,3,5);scene.add(key);const fill=new THREE.PointLight(new THREE.Color("'+esc(secondary)+'"),2.4,10);fill.position.set(-3,-1,3);scene.add(fill);scene.add(new THREE.AmbientLight(0xffffff,.55));let px=0,py=0;function resize(){const r=stage.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()}resize();new ResizeObserver(resize).observe(stage);const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;addEventListener("pointermove",e=>{px=(e.clientX/innerWidth-.5)*.7;py=(e.clientY/innerHeight-.5)*.45},{passive:true});function draw(t){if(!reduce){mesh.rotation.y=t*.00035+px;mesh.rotation.x=.45+py;mesh.rotation.z=t*.00012}renderer.render(scene,camera);if(!reduce)requestAnimationFrame(draw)}stage.classList.add("ready");draw(0)}catch(e){}}<\/script>':'')+
'</body></html>';
}

module.exports={renderSite};
