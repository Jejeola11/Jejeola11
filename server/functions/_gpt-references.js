'use strict';
const {POLICY}=require('./_gpt-pricing');
// Bound reference resolution before provider billing. Never fetch arbitrary hosts
// or follow redirects from an authenticated generation request.
function allowed(raw){const u=new URL(raw),project=new URL(process.env.SUPABASE_URL||'https://rgbweaimkcndjznlazho.supabase.co');if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use a saved HTTPS reference image.');if(u.hostname===project.hostname&&u.pathname.startsWith('/storage/v1/object/public/avatars/'))return u.href;if(u.hostname==='res.cloudinary.com'&&u.pathname.startsWith('/bzw55wh2/'))return u.href;throw Error('Upload this reference into Fuse first.');}
async function normalizeOne(url){
 const response=await fetch(allowed(url),{redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Reference image could not be loaded.');
 const type=response.headers.get('content-type')||'';if(!/^image\/(png|jpeg|webp|gif|avif)/i.test(type))throw Error('Use a PNG, JPEG, WebP, GIF or AVIF reference.');
 const reader=response.body.getReader(),chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>20*1024*1024)throw Error('Reference images must be under 20 MB.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),image=await loadImage(Buffer.concat(chunks));if(image.width*image.height>32000000)throw Error('Resize this reference to under 32 megapixels.');
 let edge=POLICY.maxReferenceEdge;while(edge>=512){const scale=Math.min(1,edge/Math.max(image.width,image.height)),canvas=createCanvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const bytes=canvas.toBuffer('image/png');if(bytes.length<=2*1024*1024)return 'data:image/png;base64,'+bytes.toString('base64');edge-=256;}
 throw Error('This reference is too large. Resize it before generating.');
}
async function normalize(urls){if(urls.length>POLICY.maxReferences)throw Error('Use at most 14 reference images.');return Promise.all(urls.map(normalizeOne));}
module.exports={allowed,normalize,normalizeOne};
