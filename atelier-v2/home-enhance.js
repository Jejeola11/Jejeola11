(()=>{
  const css=`
  .hero{min-height:420px!important;position:relative!important}
  .fuse-carousel{position:absolute;inset:0;overflow:hidden;border-radius:inherit;z-index:1}
  .fuse-slide{position:absolute;inset:0;display:grid;grid-template-columns:1.04fr .96fr;opacity:0;transform:translateX(18px);transition:.55s ease;pointer-events:none}
  .fuse-slide.active{opacity:1;transform:none;pointer-events:auto}
  .fuse-slide:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(90deg,transparent,black)}
  .fuse-slide.s1{background:radial-gradient(circle at 80% 26%,rgba(186,255,99,.18),transparent 24%),linear-gradient(135deg,#061c17,#0c3129)}
  .fuse-slide.s2{background:radial-gradient(circle at 77% 28%,rgba(255,229,104,.19),transparent 25%),linear-gradient(135deg,#0a211c,#18261c)}
  .fuse-slide.s3{background:radial-gradient(circle at 74% 32%,rgba(255,255,255,.10),transparent 20%),linear-gradient(135deg,#071c18,#142d26)}
  .fuse-slide .hero-copy,.fuse-slide .hero-art{position:relative;z-index:2}
  .fuse-slide .studio-window.product{background:radial-gradient(circle at 48% 40%,#f5d49a 0 12%,transparent 12.5%),linear-gradient(155deg,#4a2f1b,#11221c 60%)}
  .fuse-slide .studio-window.client{background:radial-gradient(circle at 50% 32%,#dfff62 0 9%,transparent 9.5%),linear-gradient(155deg,#193d33,#071510 62%)}
  .fuse-dots{display:flex;justify-content:center;gap:7px;margin-top:12px}.fuse-dot{width:8px;height:8px;border:0;border-radius:50%;background:#35564d;padding:0}.fuse-dot.active{width:24px;border-radius:999px;background:var(--grad)}
  .bottom .nav{font-size:0}.bottom .nav small{font-size:10px}.bottom .nav:before{font-size:21px;line-height:1}.bottom .nav:nth-child(1):before{content:"⌂"}.bottom .nav:nth-child(2):before{content:"◇"}.bottom .nav:nth-child(4):before{content:"◎"}.bottom .nav:nth-child(5):before{content:"○"}
  .bottom .nav:nth-child(4) small{font-size:0}.bottom .nav:nth-child(4) small:after{content:"Clients";font-size:10px}
  .path{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.path-card{background:#061b17;border:1px solid #1d4339;border-radius:18px;padding:18px;position:relative;overflow:hidden}.path-card:after{content:attr(data-step);position:absolute;right:14px;top:8px;font-size:42px;font-weight:950;color:rgba(186,255,99,.08)}.path-card strong{display:block;font-size:16px}.path-card p{color:var(--muted);font-size:12px;line-height:1.45;margin:6px 0 0}.path-card .mini{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--grad);color:#07120f;font-weight:950;margin-bottom:14px}
  @media(max-width:900px){.fuse-slide{grid-template-columns:1fr}.fuse-slide .hero-art{display:none}.path{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:650px){.fuse-slide{display:block}.fuse-slide .hero-copy{padding:28px 22px}.path{display:flex;overflow-x:auto;margin-right:-14px;scrollbar-width:none}.path-card{min-width:210px}.fuse-dots{margin-top:10px}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  const hero=document.querySelector('.hero');
  if(hero){
    hero.innerHTML=`<div class="fuse-carousel">
      <section class="fuse-slide s1 active"><div class="hero-copy"><div class="eyebrow">FUSE FLOW</div><h1>From idea to something <em>worth paying for.</em></h1><p>Learn the skill, create client-ready work, package your offer and find someone to buy it — without leaving Fuse.</p><div class="hero-actions"><button class="primary create">Start creating ✦</button><button class="secondary">Explore Academy</button></div></div><div class="hero-art"><div class="studio-window" data-label="CLIENT-READY OUTPUT"></div><div class="float f1">AI UGC · polished in minutes</div><div class="float f2">Offer builder · ready to sell</div><div class="float f3">Client finder · next step</div></div></section>
      <section class="fuse-slide s2"><div class="hero-copy"><div class="eyebrow">CREATE TO SELL</div><h1>Make work brands <em>want to buy.</em></h1><p>Start with a business outcome — campaign imagery, product ads, UGC, short-form video or a digital twin.</p><div class="hero-actions"><button class="primary create">Choose an outcome ✦</button><button class="secondary">See what sells</button></div></div><div class="hero-art"><div class="studio-window product" data-label="PRODUCT CAMPAIGN"></div><div class="float f1">Suggested offer · $150</div><div class="float f2">3 product visuals + reel</div><div class="float f3">Ready for outreach</div></div></section>
      <section class="fuse-slide s3"><div class="hero-copy"><div class="eyebrow">CLIENTS</div><h1>Create the sample. <em>Then pitch the buyer.</em></h1><p>Fuse connects what you create to who may need it, what you can charge and how to pitch it.</p><div class="hero-actions"><button class="primary">Find prospects →</button><button class="secondary">Build an offer</button></div></div><div class="hero-art"><div class="studio-window client" data-label="CLIENT ACQUISITION"></div><div class="float f1">50 lead hunt</div><div class="float f2">Personalized pitch</div><div class="float f3">Track replies</div></div></section>
    </div>`;
    const shell=hero.parentElement; const oldDots=shell.querySelector('.dots'); if(oldDots) oldDots.remove();
    const dots=document.createElement('div');dots.className='fuse-dots';dots.innerHTML='<button class="fuse-dot active"></button><button class="fuse-dot"></button><button class="fuse-dot"></button>';shell.appendChild(dots);
    const slides=[...hero.querySelectorAll('.fuse-slide')], ds=[...dots.querySelectorAll('.fuse-dot')];let i=0,t;
    const show=n=>{i=(n+slides.length)%slides.length;slides.forEach((s,x)=>s.classList.toggle('active',x===i));ds.forEach((d,x)=>d.classList.toggle('active',x===i));};
    const restart=()=>{clearInterval(t);t=setInterval(()=>show(i+1),5500)};ds.forEach((d,x)=>d.onclick=()=>{show(x);restart()});restart();
  }

  const earn=document.querySelector('.earn');
  if(earn && !document.querySelector('.fuse-path-section')){
    const section=document.createElement('section');section.className='section fuse-path-section';section.innerHTML=`<div class="section-head"><div><div class="eyebrow">YOUR FUSE PATH</div><h2>Learn → Create → Sell → Repeat</h2><div class="section-sub">Every part of Fuse moves you toward something you can actually sell.</div></div></div><div class="path"><article class="path-card" data-step="01"><div class="mini">L</div><strong>Learn the skill</strong><p>Practical Academy lessons tied to real services.</p></article><article class="path-card" data-step="02"><div class="mini">C</div><strong>Make the sample</strong><p>Build portfolio-ready work inside the matching Fuse workflow.</p></article><article class="path-card" data-step="03"><div class="mini">$</div><strong>Package the offer</strong><p>Turn the output into a clear service with price and deliverables.</p></article><article class="path-card" data-step="04"><div class="mini">↗</div><strong>Find a client</strong><p>Research prospects, personalize outreach and track your pipeline.</p></article></div>`;earn.before(section);
  }

  document.querySelectorAll('.create').forEach(b=>{if(!b.dataset.fuseBound){b.dataset.fuseBound='1';b.addEventListener('click',()=>document.getElementById('createModal')?.classList.add('open'))}});
})();