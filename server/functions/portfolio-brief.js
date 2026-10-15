const { createHash } = require('crypto');
const json=(statusCode,data)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
function calculate(s){
 const rates={presenter:[250,75],story:[300,100],commercial:[400,150]};const rate=rates[s.type];if(!rate)throw Error('Choose a video type.');
 const ranges={quantity:[1,10],seconds:[15,60],scenes:[1,6],characters:[1,3],hooks:[0,5],formats:[1,3],twins:[0,3],setups:[0,3]};
 for(const [k,[min,max]] of Object.entries(ranges))if(!Number.isInteger(s[k])||s[k]<min||s[k]>max)throw Error('Check your project scope.');
 if(![15,30,45,60].includes(s.seconds))throw Error('Choose a supported duration.');
 const blocks=Math.max(0,Math.ceil((s.seconds-30)/15));const discount=s.quantity>=6?.15:s.quantity>=3?.10:0;
 return s.quantity*rate[0]*(1-discount)+s.quantity*(blocks*rate[1]+Math.max(0,s.scenes-3-blocks)*50+(s.characters-1)*100+s.hooks*50+(s.formats-1)*25)+s.twins*150+s.setups*100;
}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Use the project form to submit your brief.'});
 const origin=event.headers?.origin||event.headers?.Origin;
 if(origin&&!['https://fuseatelier.com','https://www.fuseatelier.com','https://fuse-atelier.vercel.app'].includes(origin))return json(403,{error:'Please submit from the portfolio page.'});
 if(!event.body||Buffer.byteLength(event.body)>15000)return json(400,{error:'Please shorten your brief.'});
 let d,total;try{
 d=JSON.parse(event.body);if(d.website)return json(400,{error:'Unable to submit this form.'});
 for(const [key,max] of Object.entries({name:100,email:150,brand:150,goal:1500,reference:500,deadline:30,details:1500}))if(typeof(d[key]??'')!=='string'||(d[key]||'').length>max)throw Error('Check the form fields.');
 if(!d.name?.trim()||!d.goal?.trim()||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email||'')||/[\r\n]/.test(d.email))throw Error('Enter your name, valid email and project goal.');
 if(d.reference&&!/^https?:\/\//i.test(d.reference))throw Error('Use a complete reference URL.');
 if(!/^[a-f0-9-]{36}$/i.test(d.requestId||''))throw Error('Refresh the page and try again.');
 total=calculate(d.scope||{});
 }catch(e){return json(400,{error:e.message||'Check your brief and try again.'});}
 if(!process.env.RESEND_API_KEY||!process.env.FUSE_EMAIL_FROM){console.error('[Portfolio brief] Email configuration missing');return json(503,{error:'Brief delivery is temporarily unavailable. Please try again shortly.'});}
 const s=d.scope;const text=`NEW PORTFOLIO PROJECT BRIEF\n\nName: ${d.name}\nEmail: ${d.email}\nBrand: ${d.brand||'—'}\nGoal: ${d.goal}\nReference: ${d.reference||'—'}\nPreferred deadline: ${d.deadline||'Flexible'}\nDetails: ${d.details||'—'}\n\nSELECTED SCOPE\nType: ${s.type}\nOriginal videos: ${s.quantity}\nSeconds/video: ${s.seconds}\nScenes/video: ${s.scenes}\nSpeaking characters/video: ${s.characters}\nExtra hooks/video: ${s.hooks}\nFormats/video: ${s.formats}\nNew digital twins: ${s.twins}\nNew fictional/animal characters: ${s.setups}\n\nPRODUCTION PRICE: $${total.toFixed(2)} USD\nConfirm the brief and arrange the matching Nestuge payment link.`;
 try{
 const key=createHash('sha256').update(JSON.stringify(d)).digest('hex');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`portfolio-brief/${key}`},body:JSON.stringify({from:process.env.FUSE_EMAIL_FROM,to:['maryamjejeola002@gmail.com'],reply_to:d.email,subject:`Portfolio project brief: ${s.type} · $${total}`,text}),signal:AbortSignal.timeout(15000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.id){console.error('[Portfolio brief] Provider rejected delivery',response.status);return json(502,{error:'Your brief could not be sent yet. Please try again.'});}
 return json(200,{success:true,reference:result.id,total});
 }catch(e){console.error('[Portfolio brief] Delivery request failed',e.name);return json(502,{error:'Connection interrupted. Please try submitting again.'});}
};
exports.calculate=calculate;
