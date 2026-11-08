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
   {type:'hero',eyebrow:'FUSE ATELIER · AI INFLUENCER COURSE',title:'Create a face the internet remembers.',text:'Your phone. Your creative direction. Your very own AI influencer.',buttonText:'Explore the AI Influencer Course',buttonUrl:'https://fuseatelier.com/influencer',align:'center',background:'#00191b',accent:'#dfff4e'},
   {type:'heading',title:'FROM IDEA TO INFLUENCER',text:'Build. Create. Monetize.',align:'center'},
   {type:'product',title:'Your next creative skill starts here.',text:'Learn to shape a memorable virtual identity, produce creator-style content, and explore how to sell AI influencer services to businesses.',buttonText:'See the course — ₦9,900',buttonUrl:'https://fuseatelier.com/influencer'},
   {type:'banner',title:'A course for creators who are ready to build.',text:'Practical lessons on making, growing and monetizing AI influencer content.',background:'#dfff4e'},
   {type:'button',buttonText:'Start creating your influencer',buttonUrl:'https://fuseatelier.com/influencer'}
  ]})},
  {id:'earn',name:'Fuse Earn Affiliate',description:'Referrals and creator opportunity',design:normalizeDesign({template:'earn',brand:'FUSE ATELIER',preheader:'Make your content work harder with Fuse Earn.',background:'#eaf2ef',surface:'#ffffff',accent:'#ffe66a',ink:'#00191b',blocks:[
   {type:'hero',eyebrow:'INTRODUCING FUSE EARN',title:'Recommend what you believe in. Get rewarded.',text:'Share Fuse Atelier with people who can benefit from our creative tools and learning experiences.',buttonText:'Discover Fuse Earn',buttonUrl:'https://fuseatelier.com/atelier-v2/earn.html',background:'#00191b',accent:'#ffe66a'},
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
function renderVisual(campaign,contact,unsubscribeUrl,subscribeUrl){
 const f=campaign.audience_filter||{},d=normalizeDesign(f.design);if(!d||!d.blocks.length)return null;
 const header='<tr><td style="background:#001012;padding:24px 34px;text-align:center"><span style="font:800 16px Arial,sans-serif;letter-spacing:3px;color:'+d.accent+'">'+e(d.brand)+'</span></td></tr>';
 const content=d.blocks.map(b=>renderBlock(b,d,contact)).join('');
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
