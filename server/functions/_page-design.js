// Fuse Pages design overrides.
// Keeps the safe structured renderer, then applies user-selected colours,
// typography, button styling and responsive type scales from SiteSpec.design.

const FONT_MAP={
  'Montserrat':'Montserrat:wght@300;400;500;600;700',
  'Inter':'Inter:wght@300;400;500;600;700',
  'Poppins':'Poppins:wght@300;400;500;600;700',
  'Manrope':'Manrope:wght@300;400;500;600;700',
  'DM Sans':'DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700',
  'Space Grotesk':'Space+Grotesk:wght@300;400;500;600;700',
  'Playfair Display':'Playfair+Display:wght@400;500;600;700',
  'Cormorant Garamond':'Cormorant+Garamond:wght@400;500;600;700',
  'Lora':'Lora:wght@400;500;600;700',
  'Bebas Neue':'Bebas+Neue',
  'Oswald':'Oswald:wght@300;400;500;600;700'
};

function hex(v,fallback){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback}
function font(v,fallback='Montserrat'){
  const value=typeof v==='string'?v.trim():'';
  return /^[A-Za-z0-9 ]{2,60}$/.test(value)?value:fallback;
}
function num(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function cssFont(v){return `'${String(v).replace(/'/g,'')}',Arial,sans-serif`}
function googleFamily(v){
  if(FONT_MAP[v])return FONT_MAP[v];
  return encodeURIComponent(v).replace(/%20/g,'+');
}
function googleHref(fonts){
  const families=[...new Set(fonts)].filter(Boolean).map(f=>'family='+googleFamily(f));
  return families.length?'https://fonts.googleapis.com/css2?'+families.join('&')+'&display=swap':'';
}

function applyPageDesign(html,spec={}){
  if(typeof html!=='string'||!html.includes('</head>'))return html;
  const theme=spec.theme||{};
  const design=spec.design||{};
  const colors=design.colors||{};
  const type=design.typography||{};
  const buttons=design.buttons||{};

  const bg=hex(colors.background,theme.mode==='light'?'#f4f4ef':'#041011');
  const surface=hex(colors.surface,hex(theme.surface,theme.mode==='light'?'#ffffff':'#062125'));
  const primaryText=hex(colors.primary_text,theme.mode==='light'?'#101414':'#f4f8f4');
  const secondaryText=hex(colors.secondary_text,theme.mode==='light'?'#5d6967':'#aabbb9');
  const accent=hex(colors.accent,hex(theme.accent,'#DFFF4E'));
  const accent2=hex(colors.secondary_accent,hex(theme.secondary,'#FFE66A'));
  const buttonBg=hex(colors.button_bg,accent);
  const buttonText=hex(colors.button_text,'#001012');

  const primaryFont=font(type.primary_font,'Montserrat');
  const secondaryFont=font(type.secondary_font,primaryFont);
  const bodyFont=font(type.body_font,'Montserrat');
  const buttonFont=font(type.button_font,bodyFont);
  const primarySize=num(type.primary_size,30,110,72);
  const secondarySize=num(type.secondary_size,22,72,48);
  const bodySize=num(type.body_size,12,24,16);
  const buttonSize=num(type.button_size,11,22,14);
  const primaryWeight=num(type.primary_weight,300,800,500);
  const secondaryWeight=num(type.secondary_weight,300,800,500);
  const bodyWeight=num(type.body_weight,300,700,300);
  const buttonWeight=num(type.button_weight,300,800,500);
  const radius=num(buttons.radius,0,48,999);
  const padX=num(buttons.padding_x,10,40,19);
  const padY=num(buttons.padding_y,8,24,13);

  const href=googleHref([primaryFont,secondaryFont,bodyFont,buttonFont]);
  const fontLink=href?`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${href}" rel="stylesheet">`:'';
  const css=`<style id="fuse-user-design">
:root{
 --bg:${bg}!important;--card:${surface}!important;--ink:${primaryText}!important;--muted:${secondaryText}!important;
 --accent:${accent}!important;--secondary:${accent2}!important;--fuse-button-bg:${buttonBg};--fuse-button-text:${buttonText};
 --fuse-primary-font:${cssFont(primaryFont)};--fuse-secondary-font:${cssFont(secondaryFont)};--fuse-body-font:${cssFont(bodyFont)};--fuse-button-font:${cssFont(buttonFont)};
 --fuse-primary-size:${primarySize}px;--fuse-secondary-size:${secondarySize}px;--fuse-body-size:${bodySize}px;--fuse-button-size:${buttonSize}px;
 --fuse-primary-weight:${primaryWeight};--fuse-secondary-weight:${secondaryWeight};--fuse-body-weight:${bodyWeight};--fuse-button-weight:${buttonWeight};--fuse-button-radius:${radius}px;
}
html,body{background:var(--bg)!important;color:var(--ink)!important}body{font-family:var(--fuse-body-font)!important}
.brand{font-family:var(--fuse-secondary-font)!important;color:var(--ink)!important}.eyebrow,.section-head>span,.cta-block>span,.num,.quote span{color:var(--accent)!important}
.hero h1{font-family:var(--fuse-primary-font)!important;font-size:clamp(36px,7vw,var(--fuse-primary-size))!important;font-weight:var(--fuse-primary-weight)!important;color:var(--ink)!important}
.section-head h2,.cta-block h2{font-family:var(--fuse-secondary-font)!important;font-size:clamp(26px,5vw,var(--fuse-secondary-size))!important;font-weight:var(--fuse-secondary-weight)!important;color:var(--ink)!important}
.card h3,.quote,.faq summary{font-family:var(--fuse-secondary-font)!important;font-weight:var(--fuse-secondary-weight)!important;color:var(--ink)!important}
.hero p,.section-head p,.cta-block p,.card p,.faq p,.navlinks a,footer{font-family:var(--fuse-body-font)!important;font-size:var(--fuse-body-size)!important;font-weight:var(--fuse-body-weight)!important;color:var(--muted)!important}
.primary,.navcta,.cta-block a{background:var(--fuse-button-bg)!important;color:var(--fuse-button-text)!important;border-radius:var(--fuse-button-radius)!important;font-family:var(--fuse-button-font)!important;font-size:var(--fuse-button-size)!important;font-weight:var(--fuse-button-weight)!important;padding:${padY}px ${padX}px!important}
.ghost{border-radius:var(--fuse-button-radius)!important;font-family:var(--fuse-button-font)!important;font-size:var(--fuse-button-size)!important;font-weight:var(--fuse-button-weight)!important;color:var(--ink)!important}
.card,.quote,.faq details,.cta-block,.section-media{background:var(--card)!important;color:var(--ink)!important}
@media(max-width:800px){.hero h1{font-size:clamp(34px,12vw,min(var(--fuse-primary-size),68px))!important}.section-head h2,.cta-block h2{font-size:clamp(26px,9vw,min(var(--fuse-secondary-size),46px))!important}}
@media(max-width:430px){.hero p,.section-head p,.cta-block p,.card p,.faq p{font-size:min(var(--fuse-body-size),18px)!important}}
</style>`;
  return html.replace('</head>',fontLink+css+'</head>');
}

module.exports={applyPageDesign,FONT_MAP};
