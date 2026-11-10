// Email-safe visual editor: data validation and table-based HTML rendering.
// Never accept arbitrary HTML from the browser; all text, colors and URLs are escaped.
const { clean, escapeHtml } = require('./_audience');
const ALLOWED = new Set(['hero','image','heading','text','button','product','testimonial','banner','divider','spacer']);
const SEGMENTS = ['all_subscribed','influencer_prospects','influencer_students','earn_prospects','registered_subscribers','phone_to_client'];
const cap=(value,max=360)=>clean(value,max);
const color=(value,fallback)=>/^#[0-9a-fA-F]{6}$/.test(String(value||''))?String(value):fallback;
const url=value=>{const v=cap(value,2000);try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch(_){return ''}};
const e=escapeHtml;
const withName=(v,c)=>String(v||'').replace(/\{\{\s*first_name\s*\}\}/gi,cap(c&&c.first_name,70)||'there');
const plain=(v,c)=>e(withName(v,c)).replace(/\r?\n/g,'<br>');
function normalizeDesign(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const blocks=(Array.isArray(input.blocks)?input.blocks:[]).slice(0,32).map((b,i)=>{
  if(!b||!ALLOWED.has(b.type))return null;
  return {id:cap(b.id,70)||'block-'+i,type:b.type,title:cap(b.title,500),eyebrow:cap(b.eyebrow,110),text:cap(b.text,2500),src:url(b.src),alt:cap(b.alt,180),caption:cap(b.caption,350),
   buttonText:cap(b.buttonText,150),buttonUrl:url(b.buttonUrl),author:cap(b.author,120),align:['left','center'].includes(b.align)?b.align:'center',background:color(b.background,''),
   accent:color(b.accent,''),size:['small','medium','large'].includes(b.size)?b.size:'medium'};
 }).filter(Boolean);
 return {version:1,template:cap(input.template,60)||'custom',preheader:cap(input.preheader,180),brand:cap(input.brand,70)||'FUSE ATELIER',
  background:color(input.background,'#edf4ef'),surface:color(input.surface,'#ffffff'),accent:color(input.accent,'#dfff4e'),
  ink:color(input.ink,'#00191b'),blocks};
}
function templates(){
 return [
  {id:'influencer',name:'AI Influencer Launch',description:'High-contrast editorial course launch',design:normalizeDesign({template:'influencer',brand:'FUSE ATELIER',preheader:'Create an AI influencer. Turn attention into an opportunity.',background:'#eaf2ef',surface:'#ffffff',accent:'#dfff4e',ink:'#00191b',blocks:[
   {type:'hero',eyebrow:'FUSE ATELIER · AI INFLUENCER COURSE',title:'Create a face the internet remembers.',text:'Your phone. Your creative direction. Your very own AI influencer.',src:'https://res.cloudinary.com/bzw55wh2/video/upload/f_gif,so_0,du_4,w_520,fps_8/v1793971815/lv_0_20261106022053.gif',alt:'A short animated AI influencer video created with Fuse Atelier',buttonText:'Explore the AI Influencer Course',buttonUrl:'https://fuseatelier.com/influencer',align:'center',background:'#00191b',accent:'#dfff4e'},
   {type:'heading',title:'FROM IDEA TO INFLUENCER',text:'Build. Create. Monetize.',align:'center'},
   {type:'product',title:'Your next creative skill starts here.',text:'Learn to shape a memorable virtual identity, produce creator-style content, and explore how to sell AI influencer services to businesses.',buttonText:'See the course — ₦9,900',buttonUrl:'https://fuseatelier.com/influencer'},
   {type:'banner',title:'A course for creators who are ready to build.',text:'Practical lessons on making, growing and monetizing AI influencer content.',background:'#dfff4e'},
   {type:'button',buttonText:'Start creating your influencer',buttonUrl:'https://fuseatelier.com/influencer'}
  ]})},
  {id:'influencer_discount',name:'AI Influencer · 30% Email Exclusive',description:'Your dark teal launch email · flyer, creator story, GIF, coupon and chrome CTA',design:normalizeDesign({
   template:'influencer_discount',brand:'FUSE ATELIER',
   preheader:'A little thank-you for being a Fuse Creator: 30% off our AI Influencer course.',
   background:'#031316',surface:'#091c20',accent:'#92ece4',ink:'#f4f6f8',
   blocks:[
    {id:'discount-hero',type:'image',src:'',alt:'The discount is live — Create a Realistic AI Influencer. Exclusive 30% discount for email subscribers.'},
    {id:'discount-intro',type:'text',text:"Hey Creator! 💚\n\nImagine creating a beautiful, realistic influencer who can dress up, appear in videos, follow trends, and even showcase products for brands.\n\n**Except there's one little twist…**\n\n**She doesn't actually exist. 🤯**\n\nAnd the most interesting part? You don't have to appear on camera to create content with her.\n\nI've been creating AI influencer videos using my phone, and I've turned the process into a practical skill I can use for creative projects.\n\nNow I want to show you how it works.\n\nI created a course called **Create & Monetize Viral AI Influencers**, where you'll learn how to:"},
    {id:'discount-how',type:'banner',title:'HOW IT WORKS',text:'✨ Create your own realistic AI influencer from scratch.\n\n✨ Keep your character looking consistent across different scenes and outfits.\n\n✨ Turn trending videos into content featuring your AI character.\n\n✨ Start building a portfolio you can use to approach brands.',background:'#0b2023'},
    {id:'discount-after',type:'text',text:'**No camera. No existing audience. No previous AI experience required to begin.**\n\nAnd you can start learning right from your phone.\n\n**Want to see what I’ve created?**'},
    {id:'discount-gif',type:'image',src:'',alt:'Animated preview of realistic AI influencer videos. Tap to explore the course.'},
    {id:'discount-code',type:'banner',title:'EMAIL30',text:'Your exclusive 30% off code · Select and copy it',background:'#0c2427'},
    {id:'discount-button',type:'button',buttonText:'ACCESS YOUR 30% DISCOUNT →',buttonUrl:'https://fuseatelier.com/influencer/discount'},
    {id:'discount-close',type:'text',text:"The course is normally **₦9,900**, but your email code **EMAIL30** unlocks it for just **₦6,930 (one-time payment)**.\n\nYour first AI influencer could start with one idea. ✨\n\nSee you inside,\n\n**Ria 💚**\nFounder, Fuse Atelier\n*Learn. Create. Sell.*"}
   ]})},
  {id:'earn',name:'Fuse Earn Affiliate',description:'Referrals and creator opportunity',design:normalizeDesign({template:'earn',brand:'FUSE ATELIER',preheader:'Make your content work harder with Fuse Earn.',background:'#eaf2ef',surface:'#ffffff',accent:'#ffe66a',ink:'#00191b',blocks:[
   {type:'hero',eyebrow:'INTRODUCING FUSE EARN',title:'Recommend what you believe in. Get rewarded.',text:'Share Fuse Atelier with people who can benefit from our creative tools and learning experiences.',src:'https://fuseatelier.com/atelier-v2/fuse-earn-hero.jpg',alt:'Fuse Earn creative partner programme',buttonText:'Discover Fuse Earn',buttonUrl:'https://fuseatelier.com/atelier-v2/earn.html',background:'#00191b',accent:'#ffe66a'},
   {type:'heading',title:'HOW IT WORKS',text:'Your content. Your audience. Your unique link.'},
   {type:'product',title:'Share your personal referral link',text:'Sign up, find your referral dashboard, share Fuse with the right audience, and track your eligible referrals. Commission terms and eligibility apply.',buttonText:'Explore the programme',buttonUrl:'https://fuseatelier.com/atelier-v2/earn.html'},
   {type:'testimonial',text:'Build a long-term skill and a way to share opportunities with other creators.',author:'The Fuse Atelier team'},
   {type:'button',buttonText:'Explore Fuse Earn',buttonUrl:'https://fuseatelier.com/atelier-v2/earn.html'}
  ]})},
  {id:'editorial',name:'Editorial Newsletter',description:'Minimal, premium image-led newsletter',design:normalizeDesign({template:'editorial',brand:'FUSE ATELIER',preheader:'A creative note from Fuse.',background:'#f3f5f4',surface:'#ffffff',accent:'#dfff4e',ink:'#00191b',blocks:[
   {type:'hero',eyebrow:'A NOTE FROM FUSE ATELIER',title:'Something worth sharing.',text:'Hi {{first_name}}, here is this week’s creative inspiration.',background:'#00191b',accent:'#dfff4e'},
   {type:'image',src:'',alt:'Your campaign visual',caption:'Add your photo or animated GIF.'},
   {type:'heading',title:'The idea',text:'Your featured story goes here.'},
   {type:'text',text:'Make this a useful and inspiring email your audience wants to open.'},
   {type:'button',buttonText:'Visit Fuse Atelier',buttonUrl:'https://fuseatelier.com'}
  ]})}
 ];
}
const cell=(content,style='')=>'<td style="padding:0;vertical-align:top;'+style+'">'+content+'</td>';
const wrap=content=>'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse"><tr>'+cell(content)+'</tr></table>';
function anchor(label,href,accent,ink){
 if(!href||!label)return '';
 return '<a href="'+e(href)+'" style="display:inline-block;background:'+accent+';color:'+ink+';border-radius:999px;padding:15px 22px;font:800 14px/1.2 Arial,sans-serif;text-decoration:none;letter-spacing:-.02em">'+e(label)+'</a>';
}
function imageTag(b){return b.src?'<img src="'+e(b.src)+'" alt="'+e(b.alt||b.title||'Fuse Atelier creative')+'" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:0;text-decoration:none;border-radius:12px">':''}
function renderBlock(b,d,c){
 const ink=d.ink,acc=b.accent||d.accent,surface=b.background||d.surface;
 const h=(v,size=34)=>'<h2 style="font:800 '+size+'px/1.12 Arial,sans-serif;letter-spacing:-.045em;color:'+ink+';margin:0 0 16px">'+plain(v,c)+'</h2>';
 const p=(v,clr=ink)=>'<p style="font:400 16px/1.65 Arial,sans-serif;color:'+clr+';margin:0 0 18px">'+plain(v,c)+'</p>';
 const align=b.align==='left'?'left':'center';
 const block=(inside,pad='30px 34px')=>'<tr><td style="background:'+surface+';padding:'+pad+';text-align:'+align+'">'+inside+'</td></tr>';
 switch(b.type){
 case 'hero':{
  const bg=b.background||'#00191b',fg=(bg.toLowerCase()==='#00191b'||bg.toLowerCase()==='#001012')?'#ffffff':ink;
  return '<tr><td style="background:'+bg+';padding:38px 34px;text-align:'+align+'">'+
   (b.eyebrow?'<div style="font:800 11px Arial,sans-serif;letter-spacing:3px;color:'+acc+';margin-bottom:18px">'+plain(b.eyebrow,c)+'</div>':'')+
   '<h1 style="font:800 42px/1.05 Arial,sans-serif;letter-spacing:-2px;color:'+fg+';margin:0 0 20px">'+plain(b.title,c)+'</h1>'+
   (b.text?'<p style="font:400 17px/1.6 Arial,sans-serif;color:'+fg+';margin:0 0 25px">'+plain(b.text,c)+'</p>':'')+
   (b.src?'<div style="margin:0 0 24px">'+imageTag(b)+'</div>':'')+
   anchor(b.buttonText,b.buttonUrl,acc,bg.toLowerCase()==='#00191b'?'#00191b':'#001012')+'</td></tr>';
 }
 case 'image':return block(imageTag(b)+(b.caption?'<div style="font:12px/1.5 Arial;color:#657875;margin-top:12px">'+plain(b.caption,c)+'</div>':''),'16px 20px 10px');
 case 'heading':return block(h(b.title,b.size==='large'?42:b.size==='small'?23:34)+(b.text?p(b.text):''),'32px 32px 10px');
 case 'text':return block(p(b.text),'14px 34px 22px');
 case 'button':return block(anchor(b.buttonText,b.buttonUrl,acc,ink),'10px 24px 36px');
 case 'product':return block('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>'+
  (b.src?'<td class="stack" width="42%" style="vertical-align:middle;padding:0 18px 12px 0">'+imageTag(b)+'</td>':'')+
  '<td class="stack" style="vertical-align:middle;text-align:left;padding:0 6px">'+h(b.title,26)+p(b.text)+anchor(b.buttonText,b.buttonUrl,acc,ink)+'</td></tr></table>','22px 25px 30px');
 case 'testimonial':return block('<div style="border-left:5px solid '+acc+';padding:12px 22px;text-align:left;background:#f1f5f1">'+p('“'+b.text+'”')+'<strong style="color:'+ink+';font:700 13px Arial">'+e(b.author)+'</strong></div>','18px 28px');
 case 'banner':return block('<div style="padding:26px;border-radius:14px;text-align:center;background:'+(b.background||acc)+'">'+h(b.title,27)+p(b.text)+'</div>','12px 28px');
 case 'divider':return block('<div style="height:1px;background:#d7e0dc"></div>','8px 34px');
 case 'spacer':return '<tr><td height="28" style="background:'+surface+';line-height:28px;font-size:1px">&nbsp;</td></tr>';
 default:return '';
 }
}
function trackingUrl(link,campaign){
 if(!link)return '';
 try{
  const u=new URL(link);
  if(u.protocol!=='https:')return '';
  const campaignName=cap(campaign.name||campaign.id||'fuse-email',140).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'fuse-email';
  if(!u.searchParams.has('utm_source'))u.searchParams.set('utm_source','fuse_atelier');
  if(!u.searchParams.has('utm_medium'))u.searchParams.set('utm_medium','email');
  if(!u.searchParams.has('utm_campaign'))u.searchParams.set('utm_campaign',campaignName);
  return u.href;
 }catch(_){return link}
}

/* The subscriber-exclusive course email is intentionally table-based and email-safe.
   Visual gradients have solid-color fallbacks for clients that do not support them.
   GIF and hero images remain user-editable through the regular Email Studio blocks. */
function renderDiscountEmail(campaign,d,contact,unsubscribeUrl){
 const dark='#020b0f',panel='#0b2023',white='#f4f6f8',muted='#aabcc0',teal='#92ece4',yellow='#e7f45b';
 // Rasterized design assets: Android Gmail may drop inline CSS gradients.
 // These public PNG images preserve the intended metallic finish when images load.
 const chromeButton='https://res.cloudinary.com/bzw55wh2/image/upload/f_png/v1794279047/fuse_email_lime_chrome_cta_20261110.png';
 const chromeTitle='https://res.cloudinary.com/bzw55wh2/image/upload/f_png/v1794279059/fuse_email_lime_chrome_how_20261110.png';
 const bgImage='https://res.cloudinary.com/bzw55wh2/image/upload/f_png/v1794278403/fuse_email_black_teal_gradient_20261110.png';
 // Progressively changing fallback colours give an obvious black-to-teal effect
 // even in email clients which block remote backgrounds or strip gradients.
 const tones={
  top:['#020e12','linear-gradient(118deg,#02090d 0%,#092b2e 100%)'],
  intro:['#061e22','linear-gradient(118deg,#031015 0%,#0d3437 100%)'],
  how:['#0b2b2e','linear-gradient(118deg,#071b20 0%,#0a393c 100%)'],
  after:['#0c3033','linear-gradient(118deg,#071d23 0%,#0d4143 100%)'],
  gif:['#0b3638','linear-gradient(118deg,#08272c 0%,#0d4042 100%)'],
  code:['#092b2d','linear-gradient(118deg,#0b3538 0%,#041e22 100%)'],
  button:['#072226','linear-gradient(118deg,#07262a 0%,#03161c 100%)'],
  close:['#04151a','linear-gradient(118deg,#051b20 0%,#020e13 100%)']
 };
 const offerUrl=trackingUrl(campaign.action_url||'https://fuseatelier.com/influencer/discount',campaign);
 const rich=s=>{
  const safe=e(withName(s||'',contact));
  return safe.replace(/\*\*([\s\S]+?)\*\*/g,'<strong style="font-weight:800;color:#ffffff">$1</strong>')
    .replace(/\*([^*\n]+)\*/g,'<em>$1</em>');
 };
 const paragraphs=(s,style='')=>String(s||'').split(/\n\s*\n/).filter(Boolean).map(x=>
   '<p style="font:400 16px/1.78 Arial,Helvetica,sans-serif;color:'+white+';margin:0 0 22px;'+style+'">'+rich(x).replace(/\n/g,'<br>')+'</p>').join('');
 const section=(content,padding='8px 34px 12px',tone='intro')=>{
  const palette=tones[tone]||tones.intro;
  // Deliberately use CSS background shorthand (not background-image:linear-gradient).
  // Gmail Android can corrupt the latter; bgcolor remains as a graceful fallback.
  return '<tr><td bgcolor="'+palette[0]+'" style="background-color:'+palette[0]+';background:'+palette[1]+';padding:'+padding+'">'+content+'</td></tr>';
 };
 const pic=(b,alt)=>b.src?'<img src="'+e(b.src)+'" alt="'+e(b.alt||alt)+'" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none">':'<div style="background:#123239;border:1px dashed #85cdc8;border-radius:12px;padding:55px 20px;color:#bee6df;text-align:center;font:700 15px Arial,sans-serif">Add your '+e(alt)+' image in the Fuse Email Studio before sending.</div>';
 const renderSpecial=b=>{
  switch(b.id){
   case 'discount-hero':
    return section(pic(b,'top flyer'),'0','top');
   case 'discount-intro':
    return section(paragraphs(b.text),'36px 34px 14px','intro');
   case 'discount-how':{
    const points=String(b.text||'').split(/\n\s*\n/).filter(Boolean).map(x=>'<p style="font:600 16px/1.72 Arial,Helvetica,sans-serif;color:'+white+';margin:0 0 23px">'+rich(x).replace(/\n/g,'<br>')+'</p>').join('');
    return section('<div style="background-color:'+panel+';border:1px solid #3d6d6c;border-left:6px solid '+teal+';border-radius:22px;padding:30px 27px 8px">'+
      '<div style="margin:0 0 24px">'+(String(b.title||'HOW IT WORKS').trim().toUpperCase()==='HOW IT WORKS'?
      '<img src="'+chromeTitle+'" alt="HOW IT WORKS" width="270" height="30" style="display:block;width:270px;max-width:100%;height:auto;border:0;text-align:left;color:#ecf5f5;font:900 18px Arial,Helvetica,sans-serif;letter-spacing:1px">':
      '<strong style="font:900 18px Arial,Helvetica,sans-serif;letter-spacing:2px;color:#ecf5f5">'+rich(b.title)+'</strong>')+'</div>'+points+'</div>','9px 34px 28px','how');
   }
   case 'discount-after':
    return section(paragraphs(b.text),'3px 34px 15px','after');
   case 'discount-gif':
    return section('<a href="'+e(offerUrl)+'" target="_blank" style="display:block;text-decoration:none;outline:none">'+
      '<div style="border:1px solid #336a6b;border-radius:18px;overflow:hidden">'+pic(b,'animated GIF')+'</div></a>','6px 34px 21px','gif');
   case 'discount-code':
    return section('<div style="text-align:center;padding:10px 0 6px">'+
     '<div style="font:700 11px/1.5 Arial,sans-serif;letter-spacing:1.8px;color:'+muted+';margin-bottom:9px">'+rich(b.text||'SELECT AND COPY YOUR CODE')+'</div>'+
     '<div style="display:inline-block;font:900 25px/1.25 Arial,sans-serif;letter-spacing:3px;color:'+yellow+';border:1px dashed '+yellow+';border-radius:11px;padding:11px 30px;user-select:all;-webkit-user-select:all">'+rich(b.title||'EMAIL30')+'</div></div>','0 34px 18px','code');
   case 'discount-button':{
    const destination=trackingUrl(b.buttonUrl||offerUrl,campaign);
    const text=String(b.buttonText||'ACCESS YOUR 30% DISCOUNT →').trim();
    const asset=text==='ACCESS YOUR 30% DISCOUNT →';
    // A linked 2x PNG prevents Gmail dark mode from flattening the chrome into
    // an indistinct grey rectangle. Keep the label editable in the studio.
    const content=asset
       ?'<a href="'+e(destination)+'" target="_blank" style="display:block;text-decoration:none;border:0" aria-label="'+e(text)+'"><img src="'+chromeButton+'" width="536" height="118" alt="'+e(text)+'" style="display:block;width:100%;max-width:536px;height:auto;border:0;color:#edffff;font:900 18px Arial,Helvetica,sans-serif;text-align:center"></a>'
       :'<a href="'+e(destination)+'" target="_blank" style="display:block;padding:20px 16px;border:3px solid #e7f45b;border-radius:16px;background-color:#eaf4f5;background:linear-gradient(135deg,#ffe66a,#dfff4e 48%,#eeffe0);font:900 17px/1.35 Arial,Helvetica,sans-serif;color:#061312;text-align:center;text-decoration:none">'+e(text)+'</a>';
    return section('<div style="text-align:center">'+content+'</div>','2px 34px 30px','button');
   }
   case 'discount-close':
    return section(paragraphs(b.text),'0 34px 27px','close');
   default:
    return renderBlock(b,d,contact);
  }
 };
 const pre=e(withName(d.preheader||campaign.subject||'Fuse Atelier',contact));
 const footer='<tr><td style="background:#06171a;padding:29px 34px 34px;text-align:center;border-top:1px solid #305151">'+
  '<div style="font:900 16px Arial,sans-serif;letter-spacing:2.4px;color:#e7edf0;margin-bottom:18px">FUSE ATELIER</div>'+
  '<div style="font:12px/1.8 Arial,Helvetica,sans-serif;color:'+muted+'">You’re receiving this email because you subscribed to Fuse Atelier updates.<br>'+
  'You can <a href="'+e(unsubscribeUrl)+'" style="color:'+teal+';text-decoration:underline">unsubscribe anytime</a>.</div></td></tr>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="color-scheme" content="only light"><meta name="supported-color-schemes" content="light">'+
  '<style>@media only screen and (max-width:620px){.outer{width:100%!important}.email-pad{padding:12px 0!important}}</style></head>'+
  '<body style="margin:0;padding:0;background:#031316;font-family:Arial,Helvetica,sans-serif">'+
  '<div style="display:none!important;font-size:1px;color:#031316;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">'+pre+'</div>'+
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#020b0f" style="border-collapse:collapse;background-color:#020b0f;background:linear-gradient(145deg,#02090d,#0a3538 60%,#020b0f)"><tr><td align="center" class="email-pad" style="padding:30px 12px">'+
  '<table role="presentation" class="outer" background="'+bgImage+'" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#062227" style="border-collapse:collapse;width:600px;max-width:100%;background-color:#062227;background-image:url(\''+bgImage+'\');background-repeat:no-repeat;background-position:top center;background-size:100% 100%;border-radius:18px;overflow:hidden">'+
  d.blocks.map(renderSpecial).join('')+footer+'</table></td></tr></table></body></html>';
}

function renderVisual(campaign,contact,unsubscribeUrl,subscribeUrl){
 const f=campaign.audience_filter||{},d=normalizeDesign(f.design);if(!d||!d.blocks.length)return null;
 if(d.template==='influencer_discount')return renderDiscountEmail(campaign,d,contact,unsubscribeUrl);
 const header='<tr><td style="background:#001012;padding:24px 34px;text-align:center"><span style="font:800 16px Arial,sans-serif;letter-spacing:3px;color:'+d.accent+'">'+e(d.brand)+'</span></td></tr>';
 const content=d.blocks.map(b=>renderBlock({...b,buttonUrl:trackingUrl(b.buttonUrl,campaign)},d,contact)).join('');
 const footer='<tr><td style="background:#001012;text-align:center;padding:30px 34px">'+
  '<div style="color:'+d.accent+';font:800 17px Arial,sans-serif;letter-spacing:2px;margin-bottom:14px">FUSE ATELIER</div>'+
  '<a href="https://fuseatelier.com" style="color:#d9eee8;font:13px Arial,sans-serif">fuseatelier.com</a>'+
  '<p style="font:12px/1.7 Arial,sans-serif;color:#abc0ba;margin:20px 0 0">You received this marketing email because you opted in to Fuse Atelier updates.<br>'+
  '<a href="'+e(unsubscribeUrl)+'" style="color:#dfff4e;text-decoration:underline">Unsubscribe from marketing emails</a></p></td></tr>';
 const pre=e(withName(d.preheader||campaign.subject||'Fuse Atelier',contact));
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>@media screen and (max-width:620px){.outer{width:100%!important}.stack{display:block!important;width:100%!important}.pad{padding:12px!important}}</style></head>'+
  '<body style="margin:0;padding:0;background:'+d.background+';font-family:Arial,sans-serif">'+
  '<div style="display:none!important;font-size:1px;color:'+d.background+';line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">'+pre+'</div>'+
  '<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:'+d.background+'"><tr><td align="center" style="padding:20px 10px">'+
  '<table class="outer" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:600px;max-width:100%;background:'+d.surface+';border-radius:16px;overflow:hidden">'+header+content+footer+'</table>'+
  '</td></tr></table></body></html>';
}
module.exports={SEGMENTS,normalizeDesign,templates,renderVisual};
