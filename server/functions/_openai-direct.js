'use strict';
// GPT requests never fall back to a reseller. Existing ws: jobs keep their poller.
const BASE='https://api.openai.com/v1';
const key=()=>String(process.env.OPENAI_API_KEY||'').trim();
function imageModel(id){
 const s=String(id||'').replace(/^openai\//,'');
 const m=s.match(/^gpt-image-(2\.5-(?:sunburst|flare)|2|1\.5|1-mini|1)(?=$|[-/])/);
 return m?'gpt-image-'+m[1]:null;
}
function textModel(id){
 const s=String(id||'').replace(/^openai\//,'');
 if(s==='gpt-5-5')return 'gpt-5.5';if(s==='gpt-5-2')return 'gpt-5.2';
 return /^gpt-(?!image)[a-zA-Z0-9.-]+$/.test(s)?s:null;
}
async function request(path,body,{timeout=35000}={}){
 if(!key())throw Error('OpenAI is not configured.');
 const reference=require('crypto').randomUUID();
 let r;try{r=await fetch(BASE+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key(),'Content-Type':'application/json','X-Client-Request-Id':reference},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});}catch(e){e.uncertain=!!body;if(body)e.message='OpenAI submission needs checking. Do not resubmit. Contact support with '+reference;throw e;}
 const j=await r.json().catch(()=>({}));
 if(!r.ok){const e=Error(j.error?.message||'OpenAI request failed ('+r.status+').');e.uncertain=r.status>=500;throw e;}
 return j;
}
function sizeFor(aspect='1:1',resolution='1k',size){
 if(size&&/^\d+[x*]\d+$/.test(size))return size.replace('*','x');
 const [a,b]=String(aspect).split(':').map(Number);const ratio=a/b;
 if(!Number.isFinite(ratio)||ratio<1/3||ratio>3)throw Error('Choose an aspect ratio between 1:3 and 3:1.');
 const target=resolution==='4k'?8294400:resolution==='2k'?4194304:1048576;
 let w=Math.sqrt(target*ratio),h=w/ratio;const scale=Math.min(1,3840/Math.max(w,h));
 w=Math.floor(w*scale/16)*16;h=Math.floor(h*scale/16)*16;
 if(w*h<655360){w=Math.ceil(w/16)*16;h=Math.ceil(655360/w/16)*16;}
 return w+'x'+h;
}
function imageBody(id,opts={}){
 const model=imageModel(id);if(!model)throw Error('Unsupported GPT image model.');
 if(model==='gpt-image-1')throw Error('GPT Image 1 has been retired. Choose GPT Image 2 or 2.5.');
 const quality=opts.quality||'medium';const qualities=model.includes('2.5')?['low','medium','high','xhigh','max']:['low','medium','high'];
 if(!qualities.includes(quality))throw Error('Choose a supported quality.');
 const refs=opts.images||[];if(!Array.isArray(refs)||refs.length>16)throw Error('Use at most 16 reference images.');
 for(const ref of refs){let u;try{u=new URL(ref);}catch{throw Error('Use a valid HTTPS reference image.');}if(u.protocol!=='https:')throw Error('Use HTTPS reference images.');}
 let size=sizeFor(opts.aspect,opts.resolution,opts.size);
 if(/^gpt-image-1/.test(model)){const [w,h]=size.split('x').map(Number);size=w===h?'1024x1024':w>h?'1536x1024':'1024x1536';}
 const format=opts.output_format||'png';if(!['png','jpeg','webp'].includes(format))throw Error('Choose a supported output format.');
 const background=opts.background||'opaque';if(!['opaque','transparent','auto'].includes(background))throw Error('Choose a supported background.');
 if(background==='transparent'&&format==='jpeg')throw Error('Transparent images require PNG or WebP.');
 return {model:'gpt-5.2',background:true,store:true,input:[{role:'user',content:[{type:'input_text',text:String(opts.prompt||'')},...refs.map(url=>({type:'input_image',image_url:url}))]}],tools:[{type:'image_generation',model,action:refs.length?'edit':'generate',size,quality,output_format:format,background,...(opts.input_fidelity&&model!=='gpt-image-2'?{input_fidelity:opts.input_fidelity}:{})}],tool_choice:{type:'image_generation'}};
}
async function submitImage(id,opts){const j=await request('/responses',imageBody(id,opts));if(!j.id)throw Error('OpenAI did not return a generation reference.');return {requestId:'oa:'+j.id+'~'+(opts?.output_format||'png'),provider:'openai'};}
async function submitText({prompt,imageUrl,model}){
 const resolved=textModel(model);if(!resolved)throw Error('Unsupported GPT text model.');
 const j=await request('/responses',{model:resolved,background:true,store:true,input:[{role:'user',content:[{type:'input_text',text:prompt},...(imageUrl?[{type:'input_image',image_url:imageUrl}]:[])]}]});
 if(!j.id)throw Error('OpenAI did not return a generation reference.');return {requestId:'oa-text:'+j.id,provider:'openai'};
}
async function pollText(id){
 if(!/^resp_[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid OpenAI generation reference.');
 const j=await request('/responses/'+id);
 if(['failed','cancelled','incomplete'].includes(j.status))return {status:'failed',raw:{error:j.error?.message||j.incomplete_details?.reason||'OpenAI could not complete this response.'}};
 if(j.status!=='completed')return {status:'processing'};
 const text=(j.output||[]).filter(o=>o.type==='message').flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
 return text?{status:'completed',text,usage:j.usage}:{status:'failed',raw:{error:'OpenAI returned no text.'}};
}
async function poll(encoded,{db,userId}={}){
 const [id,format='png']=encoded.split('~');if(!['png','jpeg','webp'].includes(format))throw Error('Invalid output format.');
 if(!/^resp_[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid OpenAI generation reference.');
 const j=await request('/responses/'+id);
 if(['failed','cancelled','incomplete'].includes(j.status))return {status:'failed',raw:{error:j.error?.message||j.incomplete_details?.reason||'OpenAI could not complete this image.'}};
 if(j.status!=='completed')return {status:'processing'};
 const image=(j.output||[]).find(o=>o.type==='image_generation_call'&&o.result);
 if(!image)return {status:'failed',raw:{error:'OpenAI returned no image. Revise your prompt and try again.'}};
 if(!db||!userId)throw Error('Image storage context is required.');
 const path=userId+'/openai-'+id+'.'+format;const bytes=Buffer.from(image.result,'base64');
 const up=await db.storage.from('avatars').upload(path,bytes,{contentType:'image/'+format,upsert:true});if(up.error)throw up.error;
 const url=db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 return {status:'completed',url,usage:j.usage,provider:'openai'};
}
async function chat({prompt,imageUrl,model,timeoutMs=120000}){
 const resolved=textModel(model);if(!resolved)throw Error('Unsupported GPT text model.');
 const content=imageUrl?[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]:prompt;
 const j=await request('/chat/completions',{model:resolved,messages:[{role:'user',content}]},{timeout:timeoutMs});
 const text=j.choices?.[0]?.message?.content;if(!text)throw Error('OpenAI returned no text.');return text;
}
async function refund(db,userId,amount){const plan=await require('./_supabase').getPlan(userId);if(!plan.isAdmin)return db.rpc('add_credits',{uid:userId,amount,why:'refund'});}
module.exports={imageModel,textModel,key,sizeFor,imageBody,submitImage,submitText,poll,pollText,chat,refund};
