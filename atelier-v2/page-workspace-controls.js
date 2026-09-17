(() => {
  'use strict';

  const FONTS=['Montserrat','Inter','Poppins','Manrope','DM Sans','Space Grotesk','Playfair Display','Cormorant Garamond','Lora','Bebas Neue','Oswald'];
  const fontOptions=FONTS.map(f=>`<option value="${f}">${f}</option>`).join('');
  const clamp=(v,min,max,fallback)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
  const hex=(v,fallback)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;

  function addStyles(){
    if(document.getElementById('fuse-page-workspace-v3'))return;
    const style=document.createElement('style');
    style.id='fuse-page-workspace-v3';
    style.textContent=`
      .fuse-design-panel{margin-top:12px;padding-top:12px;border-top:1px solid rgba(49,84,86,.58)}
      .fuse-design-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .fuse-design-title strong{font-size:12px;font-weight:500;color:#EEFFE0}.fuse-design-title span{font-size:10px;color:#8fa4a2}
      .fuse-design-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .fuse-design-field{min-width:0;display:grid;gap:5px}.fuse-design-field.full{grid-column:1/-1}
      .fuse-design-field label{font-size:10px;color:#91a6a4;font-weight:400}
      .fuse-design-field input[type="color"]{width:100%;height:42px;padding:4px;border:1px solid #315456;border-radius:11px;background:#062125;cursor:pointer}
      .fuse-design-field input[type="number"],.fuse-design-field select{width:100%;height:40px;border:1px solid #315456;border-radius:11px;background:#062125;color:#fff;padding:0 9px;font:300 11px Montserrat,Arial,sans-serif;outline:0}
      .fuse-design-field input:focus,.fuse-design-field select:focus{border-color:#DFFF4E}
      .fuse-type-row{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:7px}
      .fuse-preview-stage{position:relative;width:100%;overflow:hidden;margin:0 auto}
      .canvas.fuse-device-canvas{display:block!important;place-items:initial!important;padding:14px!important;overflow:hidden!important}
      .canvas.fuse-device-canvas>.placeholder{margin:0 auto}
      .fuse-preview-size{display:block;margin-top:3px;color:#DFFF4E;font-size:9px;font-weight:300}
      @media(max-width:430px){.fuse-design-grid{grid-template-columns:1fr}.fuse-design-field.full{grid-column:auto}.fuse-type-row{grid-template-columns:minmax(0,1fr) 72px}.modes{gap:4px}.mode{padding:0 8px;font-size:10px}}
    `;
    document.head.append(style);
  }

  async function getProjectSpec(projectId){
    if(!projectId||!window.Fuse)return null;
    try{
      const out=await Fuse.api('page-projects?id='+encodeURIComponent(projectId));
      return out&&out.project&&out.project.site_spec?out.project.site_spec:null;
    }catch{return null}
  }

  function makeColor(id,label,value){
    return `<div class="fuse-design-field"><label for="${id}">${label}</label><input id="${id}" type="color" value="${value}"></div>`;
  }
  function makeType(id,label,font,size,min,max){
    return `<div class="fuse-design-field full"><label>${label}</label><div class="fuse-type-row"><select id="${id}Font">${fontOptions}</select><input id="${id}Size" type="number" min="${min}" max="${max}" value="${size}" inputmode="numeric" aria-label="${label} size"></div></div>`;
  }

  async function setupDesign(projectId){
    const settings=document.getElementById('siteSettings');
    const body=settings&&settings.querySelector('.site-settings-body');
    const save=document.getElementById('saveSiteSettings');
    if(!settings||!body||!save||document.getElementById('fuseDesignPanel'))return;

    const oldAccent=document.getElementById('siteAccent');
    if(oldAccent&&oldAccent.closest('.field'))oldAccent.closest('.field').style.display='none';

    const panel=document.createElement('div');
    panel.id='fuseDesignPanel';
    panel.className='fuse-design-panel';
    panel.innerHTML=`
      <div class="fuse-design-title"><strong>Design</strong><span>Colours · fonts · type · buttons</span></div>
      <div class="fuse-design-grid">
        ${makeColor('pageBgColor','Background','#041011')}
        ${makeColor('pageSurfaceColor','Cards / surface','#062125')}
        ${makeColor('pagePrimaryText','Primary text','#f4f8f4')}
        ${makeColor('pageSecondaryText','Secondary text','#aabbb9')}
        ${makeColor('pageAccentColor','Accent','#DFFF4E')}
        ${makeColor('pageAccentTwo','Second accent','#FFE66A')}
        ${makeColor('pageButtonBg','Button colour','#DFFF4E')}
        ${makeColor('pageButtonText','Button text','#001012')}
        ${makeType('pagePrimary','Primary text / hero','Montserrat',72,30,110)}
        ${makeType('pageSecondary','Secondary headings','Montserrat',48,22,72)}
        ${makeType('pageBody','Body / other text','Montserrat',16,12,24)}
        ${makeType('pageButton','Buttons','Montserrat',14,11,22)}
        <div class="fuse-design-field"><label for="pageButtonRadius">Button corners</label><input id="pageButtonRadius" type="number" min="0" max="48" value="48" inputmode="numeric"></div>
        <div class="fuse-design-field"><label for="pageButtonWeight">Button weight</label><select id="pageButtonWeight"><option value="400">Regular</option><option value="500" selected>Medium</option><option value="600">Semi bold</option><option value="700">Bold</option></select></div>
      </div>`;
    body.insertBefore(panel,save);

    const spec=await getProjectSpec(projectId);
    if(spec){
      const theme=spec.theme||{};
      const design=spec.design||{};
      const colors=design.colors||{};
      const type=design.typography||{};
      const buttons=design.buttons||{};
      const light=theme.mode==='light';
      const values={
        pageBgColor:hex(colors.background,light?'#f4f4ef':'#041011'),
        pageSurfaceColor:hex(colors.surface,hex(theme.surface,light?'#ffffff':'#062125')),
        pagePrimaryText:hex(colors.primary_text,light?'#101414':'#f4f8f4'),
        pageSecondaryText:hex(colors.secondary_text,light?'#5d6967':'#aabbb9'),
        pageAccentColor:hex(colors.accent,hex(theme.accent,'#DFFF4E')),
        pageAccentTwo:hex(colors.secondary_accent,hex(theme.secondary,'#FFE66A')),
        pageButtonBg:hex(colors.button_bg,hex(colors.accent,hex(theme.accent,'#DFFF4E'))),
        pageButtonText:hex(colors.button_text,'#001012')
      };
      Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value});
      const typeValues={
        pagePrimaryFont:type.primary_font||'Montserrat',pagePrimarySize:clamp(type.primary_size,30,110,72),
        pageSecondaryFont:type.secondary_font||type.primary_font||'Montserrat',pageSecondarySize:clamp(type.secondary_size,22,72,48),
        pageBodyFont:type.body_font||'Montserrat',pageBodySize:clamp(type.body_size,12,24,16),
        pageButtonFont:type.button_font||type.body_font||'Montserrat',pageButtonSize:clamp(type.button_size,11,22,14),
        pageButtonRadius:clamp(buttons.radius,0,48,48),pageButtonWeight:clamp(type.button_weight,400,700,500)
      };
      Object.entries(typeValues).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=String(value)});
    }

    save.textContent='Save site design';
    save.addEventListener('click',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      if(!projectId||!window.Fuse)return;
      save.disabled=true;save.textContent='Saving…';
      const status=document.getElementById('engineStatus');
      if(status){status.className='engine';status.textContent='Saving colours, typography and button styles…'}
      const val=id=>document.getElementById(id)?.value||'';
      const patch={
        brand:val('siteBrand'),mode:val('siteMode'),cta:val('siteCTA'),cta_url:val('siteURL'),email:val('siteEmail'),phone:val('sitePhone'),
        background:val('pageBgColor'),surface:val('pageSurfaceColor'),primary_text:val('pagePrimaryText'),secondary_text:val('pageSecondaryText'),
        accent:val('pageAccentColor'),secondary:val('pageAccentTwo'),button_bg:val('pageButtonBg'),button_text:val('pageButtonText'),
        primary_font:val('pagePrimaryFont'),primary_size:Number(val('pagePrimarySize')),
        secondary_font:val('pageSecondaryFont'),secondary_size:Number(val('pageSecondarySize')),
        body_font:val('pageBodyFont'),body_size:Number(val('pageBodySize')),
        button_font:val('pageButtonFont'),button_size:Number(val('pageButtonSize')),button_weight:Number(val('pageButtonWeight')),button_radius:Number(val('pageButtonRadius'))
      };
      try{
        await Fuse.api('page-section-update',{project_id:projectId,target:'site',operation:'update',patch});
        if(status){status.className='engine success';status.textContent='Site design saved. Refreshing the live preview…'}
        setTimeout(()=>location.reload(),350);
      }catch(err){
        save.disabled=false;save.textContent='Save site design';
        if(status){status.className='engine error';status.textContent=err.message||'Could not save site design.'}
      }
    },true);
  }

  function setupPreview(){
    const canvas=document.getElementById('canvas');
    const shell=document.getElementById('siteShell');
    const frame=document.getElementById('siteFrame');
    const buttons=[...document.querySelectorAll('[data-mode]')];
    if(!canvas||!shell||!frame||!buttons.length||document.getElementById('fusePreviewStage'))return;

    canvas.classList.add('fuse-device-canvas');
    const stage=document.createElement('div');
    stage.id='fusePreviewStage';stage.className='fuse-preview-stage';stage.style.display='none';
    shell.parentNode.insertBefore(stage,shell);stage.appendChild(shell);
    const sizeLabel=document.createElement('span');sizeLabel.className='fuse-preview-size';
    const title=document.querySelector('.preview-title');if(title)title.appendChild(sizeLabel);

    const SIZES={mobile:{w:390,h:780,label:'390 × 780'},tablet:{w:768,h:900,label:'768 × 900'},desktop:{w:1024,h:760,label:'1024 × 760'}};
    let current='mobile';
    function apply(mode=current){
      current=SIZES[mode]?mode:'mobile';
      const s=SIZES[current];
      const available=Math.max(240,canvas.clientWidth-28);
      const scale=Math.min(1,available/s.w);
      stage.style.height=Math.max(220,Math.round(s.h*scale))+'px';
      stage.style.display=shell.hidden?'none':'block';
      shell.style.position='absolute';shell.style.left='50%';shell.style.top='0';
      shell.style.width=s.w+'px';shell.style.height=s.h+'px';shell.style.maxWidth='none';
      shell.style.borderRadius=current==='mobile'?'22px':current==='tablet'?'18px':'14px';
      shell.style.transformOrigin='top center';shell.style.transform=`translateX(-50%) scale(${scale})`;
      shell.classList.remove('tablet','desktop');
      buttons.forEach(b=>b.classList.toggle('active',b.dataset.mode===current));
      sizeLabel.textContent=(current==='desktop'?'Desktop':current[0].toUpperCase()+current.slice(1))+' · '+s.label;
    }

    buttons.forEach(btn=>btn.addEventListener('click',()=>requestAnimationFrame(()=>apply(btn.dataset.mode))));
    const observer=new MutationObserver(()=>apply(current));observer.observe(shell,{attributes:true,attributeFilter:['hidden']});
    if('ResizeObserver' in window)new ResizeObserver(()=>apply(current)).observe(canvas);
    window.addEventListener('orientationchange',()=>setTimeout(()=>apply(current),120));
    apply('mobile');
  }

  function init(){
    if(!(location.pathname.split('/').pop()||'').toLowerCase().includes('page-workspace'))return;
    addStyles();
    const projectId=new URLSearchParams(location.search).get('id')||'';
    setupPreview();
    setupDesign(projectId);
  }

  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
