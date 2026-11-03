'use strict';
// Model-specific public Higgsfield API references, checked 2026-11-02.
// Never substitute a different Seedance version or retry submission at another provider.
const {safeCreditsFor}=require('./_packs');
const BASE='https://api.higgsfield.ai';
const ratios=['16:9','4:3','1:1','3:4','9:16','21:9'];
const key=()=>String(process.env.HIGGSFIELD_API_KEY||'').trim();
const modes={'2.5':['text-to-video','image-to-video','reference-to-video','video-edit','video-extend'],'2.0':['text-to-video','image-to-video','reference-to-video']};
const media=(array,max)=>array?{type:'array',items:{type:'string',format:'uri'},maxItems:max}:{type:'string',format:'uri'};
function models(){return Object.entries(modes).flatMap(([version,ops])=>ops.map(op=>{
 const properties={prompt:{type:'string',minLength:1,maxLength:8000},resolution:{type:'string',enum:version==='2.5'?['480p','720p','1080p']:['480p','720p','1080p','4k'],default:'720p'},generate_audio:{type:'boolean',default:true}};
 const required=op==='text-to-video'||op.startsWith('video-')?['prompt']:[];
 if(op!=='video-edit')properties.duration={type:'integer',minimum:4,maximum:version==='2.5'?30:15,default:5};
 if(!['image-to-video','video-edit','video-extend'].includes(op))properties.aspect_ratio={type:'string',enum:ratios,default:'16:9'};
 if(version==='2.5')properties.output_format={type:'string',enum:['mp4','mov'],default:'mp4'};
 if(op==='image-to-video'){properties.image_url=media();properties.end_image_url=media();required.push('image_url');}
 if(op==='reference-to-video'||op.startsWith('video-')){
  properties.image_urls=media(true,version==='2.5'?30:9);properties.video_urls=media(true,version==='2.5'?10:3);properties.audio_urls=media(true,version==='2.5'?10:3);
 }
 if(op.startsWith('video-')){properties.video_url=media();required.push('video_url');}
 const model_id='bytedance/seedance-'+version+'/'+op;
 return {model_id,name:'Seedance '+version+' · '+op.replaceAll('-',' '),type:op==='video-edit'?'video-to-video':op,description:'Seedance '+version+' '+op.replaceAll('-',' ')+'. Powered by Higgsfield.',provider:'higgsfield',api_schema:{api_schemas:[{type:'model_run',request_schema:{type:'object',additionalProperties:false,properties,required}}]}};
}));}
function find(id){return models().find(m=>m.model_id===id);}
function headers(){if(!key())throw Error('Seedance is not configured. Please contact Fuse support.');return {Authorization:'Key '+key(),'Content-Type':'application/json'};}
function safeError(status){if(status===401||status===403)return 'The Seedance provider connection needs attention. Please contact Fuse support.';if(status===402)return 'Seedance is temporarily unavailable because the provider balance needs funding. Your Fuse credits will be returned.';if(status===429)return 'Seedance is busy. Please try again shortly.';return 'Seedance could not accept these settings or reference assets. Your Fuse credits will be returned.';}
function ownAsset(url,userId){let u,root;try{u=new URL(url);root=new URL(process.env.SUPABASE_URL)}catch{throw Error('Upload your reference assets to Fuse first.');}if(u.protocol!=='https:'||u.origin!==root.origin||!u.pathname.startsWith('/storage/v1/object/public/avatars/'+userId+'/')||u.username||u.password)throw Error('Use reference assets uploaded to your Fuse account.');return u.href;}
const metadata=new Map();
async function inspect(url,userId,video){url=ownAsset(url,userId);const ck=url+'|'+video,cached=metadata.get(ck);if(cached&&cached.until>Date.now())return cached;
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Could not read a reference asset. Please upload it again.');
 const limit=video?100*1024*1024:20*1024*1024;if(Number(r.headers.get('content-length')||0)>limit)throw Error('This reference is too large.');
 const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>limit){await r.body.cancel?.().catch(()=>{});throw Error('This reference is too large.');}chunks.push(chunk);}const buffer=Buffer.concat(chunks);
 let result;
 if(video){const fs=require('fs/promises'),os=require('os'),path=require('path'),{randomUUID}=require('crypto'),{probeDuration,probeDimensions}=require('./_ffmpeg');const file=path.join(os.tmpdir(),'hf-'+randomUUID()+'.mp4');try{await fs.writeFile(file,buffer);result={duration:await probeDuration(file),...await probeDimensions(file)}}finally{await fs.unlink(file).catch(()=>{});}}
 else{const im=await require('sharp')(buffer,{limitInputPixels:32000000}).metadata();result={width:im.width,height:im.height};}
 if(!result.width||!result.height||video&&(!Number.isFinite(result.duration)||result.duration<=0))throw Error('Could not inspect this reference.');
 if(metadata.size>100)metadata.clear();result.until=Date.now()+300000;metadata.set(ck,result);return result;
}
async function quote(m,raw,{validate=true,userId}={}){
 const schema=m.api_schema.api_schemas[0].request_schema,Ajv=require('ajv');const input=JSON.parse(JSON.stringify(raw||{}));
 // Compatibility aliases from previous WaveSpeed selections.
 for(const [a,b] of [['image','image_url'],['last_image','end_image_url'],['reference_images','image_urls'],['reference_videos','video_urls'],['reference_audios','audio_urls'],['video','video_url']]){if(a in input){if(input[b]===undefined)input[b]=input[a];delete input[a];}}
 if(input.prompt==='')delete input.prompt;
 const spec=validate?schema:{...schema,required:[]};const ajv=new Ajv({strict:false,allErrors:true,useDefaults:true,validateFormats:false});if(!ajv.validate(spec,input))throw Error('Check Seedance settings: '+ajv.errorsText(ajv.errors));
 const op=m.model_id.split('/').pop(),videoUrls=[...(input.video_url?[input.video_url]:[]),...(input.video_urls||[])];
 const imageUrls=[...(input.image_url?[input.image_url]:[]),...(input.end_image_url?[input.end_image_url]:[]),...(input.image_urls||[])];
 const audioUrls=input.audio_urls||[];
 if(validate&&op==='reference-to-video'&&!imageUrls.length&&!videoUrls.length&&!audioUrls.length)throw Error('Add reference assets for this Seedance mode.');
 const maxAssets=m.model_id.includes('2.5')?30:15;
 if(imageUrls.length+videoUrls.length+audioUrls.length>maxAssets)throw Error('Select at most '+maxAssets+' reference assets for this model.');
 for(const url of [...imageUrls,...videoUrls,...audioUrls]){if(validate||!url.startsWith('https://example.com/'))ownAsset(url,userId);}
 let ratio=input.aspect_ratio||'16:9',videoSeconds=0,source,pendingVideo=false;
 for(const url of videoUrls){if(!validate&&url.startsWith('https://example.com/')){pendingVideo=true;continue;}const info=await inspect(url,userId,true);videoSeconds+=Math.max(2,Math.ceil(info.duration));if(url===input.video_url)source=info;}
 if(pendingVideo)videoSeconds=Math.max(videoSeconds,m.model_id.includes('2.5')?30:15);
 if(videoSeconds>(m.model_id.includes('2.5')?30:15))throw Error('Reference video exceeds this model’s duration limit.');
 if(input.image_url&&!input.image_url.startsWith('https://example.com/'))source=await inspect(input.image_url,userId,false);
 if(source)ratio=source.width+':'+source.height;
 // Reference-derived ratios can be arbitrary. Bound the output raster by
 // rounding both dimensions upward to 64-pixel blocks; no customer discount
 // is assumed. This quote is conservative, not an advertised provider invoice.
 const [a,b]=ratio.split(':').map(Number),edge={ '480p':480,'720p':720,'1080p':1080,'4k':2160}[input.resolution];
 if(!a||!b||Math.max(a/b,b/a)>3)throw Error('Use a reference aspect ratio between 1:3 and 3:1.');
 const width=Math.ceil((a>=b?edge*a/b:edge)/64)*64,height=Math.ceil((b>a?edge*b/a:edge)/64)*64;
 const duration=op==='video-edit'?(source?Math.ceil(source.duration):30):input.duration;
 const version=m.model_id.includes('2.5')?'2.5':'2.0';
 const refSeconds=videoUrls.length?Math.max(videoUrls.length*2,videoSeconds):0;
 const outputSeconds=op==='video-edit'?Math.max(4,Math.min(30,duration)):duration;
 const usd=require('./_retail-pricing').seedanceUsd(version,input.resolution,outputSeconds,refSeconds,op);
 return {inputs:input,credits:safeCreditsFor(usd),provider_usd:usd,wavespeed_usd:usd,pricing_source:'wavespeed',pricing_version:require('./_retail-pricing').VERSION,provider:'higgsfield'};
}
async function submit(model,input){let r;try{r=await fetch(BASE+'/'+model,{method:'POST',headers:headers(),body:JSON.stringify(input),signal:AbortSignal.timeout(30000)});}catch{const e=Error('Seedance submission is being checked. Do not submit it again.');e.uncertain=true;throw e;}
 const out=await r.json().catch(()=>({}));if(!r.ok){const e=Error(safeError(r.status));e.uncertain=r.status>=500;throw e;}
 if(typeof out.request_id!=='string'||!/^[a-zA-Z0-9-]{8,100}$/.test(out.request_id)){const e=Error('Seedance submission is being checked. Do not submit it again.');e.uncertain=true;throw e;}return out.request_id;
}
async function poll(id){if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw Error('Invalid Seedance task.');const r=await fetch(BASE+'/requests/'+id+'/status',{headers:headers(),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Seedance status is temporarily unavailable.');const out=await r.json();if(out.status==='completed'){let url=out.video?.url;if(!url||!url.startsWith('https://'))throw Error('Seedance output is not available yet.');return {status:'completed',url};}if(['failed','nsfw','canceled'].includes(out.status))return {status:'failed',error:out.status==='nsfw'?'Seedance could not generate this content.':'Seedance generation did not complete.'};return {status:'processing'};}
module.exports={models,find,quote,submit,poll,key};

