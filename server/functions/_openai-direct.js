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
function sizeFor(aspect,resolution,size){return require('./_gpt-pricing').sizeFor(aspect,resolution,size);}
function imageBody(id,opts={}){
 require('./_gpt-pricing').imageQuote(id,opts);
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
 return {model:'gpt-5.2',background:true,store:true,reasoning:{effort:'none'},max_output_tokens:require('./_gpt-pricing').POLICY.imageHelperOutputTokens,max_tool_calls:1,parallel_tool_calls:false,input:[{role:'user',content:[{type:'input_text',text:String(opts.prompt||'')},...refs.map(url=>({type:'input_image',image_url:url}))]}],tools:[{type:'image_generation',model,action:refs.length?'edit':'generate',size,quality,output_format:format,background,...(opts.input_fidelity&&model!=='gpt-image-2'?{input_fidelity:opts.input_fidelity}:{})}],tool_choice:{type:'image_generation'}};
}
async function submitImage(id,opts){const body=imageBody(id,opts);const refs=await require('./_gpt-references').normalize(opts.images||[]);if(refs.length)body.input[0].content=[body.input[0].content[0],...refs.map(url=>({type:'input_image',image_url:url}))];const j=await request('/responses',body);if(!j.id)throw Error('OpenAI did not return a generation reference.');return {requestId:'oa:'+j.id+'~'+(opts?.output_format||'png'),provider:'openai'};}
async function submitText({prompt,imageUrl,model}){
 const resolved=textModel(model);if(!require('./_gpt-pricing').textModel(resolved))throw Error('Unverified GPT text model pricing.');require('./_gpt-pricing').promptBytes(prompt);
 if(imageUrl)imageUrl=(await require('./_gpt-references').normalize([imageUrl]))[0];
 const j=await request('/responses',{model:resolved,background:true,store:true,reasoning:{effort:'none'},max_output_tokens:require('./_gpt-pricing').POLICY.chatOutputTokens,input:[{role:'user',content:[{type:'input_text',text:prompt},...(imageUrl?[{type:'input_image',image_url:imageUrl}]:[])]}]});
 if(!j.id)throw Error('OpenAI did not return a generation reference.');return {requestId:'oa-text:'+j.id,provider:'openai'};
}
async function pollText(id){
 if(!/^resp_[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid OpenAI generation reference.');
 const j=await request('/responses/'+id);
 const text=(j.output||[]).filter(o=>o.type==='message').flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
 const limited=j.status==='incomplete'&&j.incomplete_details?.reason==='max_output_tokens'&&!!text;
 if(text&&(j.status==='completed'||limited))return {status:'completed',text:text+(limited?'\n\n[Response reached the included length limit.]':''),truncated:limited,usage:j.usage,cost_usd:require('./_gpt-pricing').responseCost(j)};
 if(['failed','cancelled','incomplete'].includes(j.status))return {status:'failed',raw:{error:j.error?.message||j.incomplete_details?.reason||'OpenAI could not complete this response.'}};
 return j.status==='completed'?{status:'failed',raw:{error:'OpenAI returned no text.'}}:{status:'processing'};
}

async function poll(encoded,{db,userId,model}={}){
 const [id,format='png']=encoded.split('~');if(!['png','jpeg','webp'].includes(format))throw Error('Invalid output format.');
 if(!/^resp_[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid OpenAI generation reference.');
 const j=await request('/responses/'+id);
 const image=(j.output||[]).find(o=>o.type==='image_generation_call'&&o.result);
 if(!(['completed','incomplete'].includes(j.status)&&image)){
  if(['failed','cancelled','incomplete'].includes(j.status))return {status:'failed',raw:{error:j.error?.message||j.incomplete_details?.reason||'OpenAI could not complete this image.'}};
  if(j.status!=='completed')return {status:'processing'};
  return {status:'failed',raw:{error:'OpenAI returned no image. Revise your prompt and try again.'}};
 }
 if(!db||!userId)throw Error('Image storage context is required.');
 const path=userId+'/openai-'+id+'.'+format;const bytes=Buffer.from(image.result,'base64');
 const up=await db.storage.from('avatars').upload(path,bytes,{contentType:'image/'+format,upsert:true});if(up.error)throw up.error;
 const url=db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
 return {status:'completed',url,usage:j.usage,image_usage:image.usage,provider:'openai',cost_usd:model?require('./_gpt-pricing').responseCost(j,{imageModel:imageModel(model)}):null};
}
async function chat({prompt,imageUrl,model,timeoutMs=120000}){
 const resolved=textModel(model);if(!require('./_gpt-pricing').textModel(resolved))throw Error('Unverified GPT text model pricing.');require('./_gpt-pricing').promptBytes(prompt);
 if(imageUrl)imageUrl=(await require('./_gpt-references').normalize([imageUrl]))[0];
 const content=imageUrl?[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]:prompt;
 const j=await request('/chat/completions',{model:resolved,reasoning_effort:'none',max_completion_tokens:require('./_gpt-pricing').POLICY.chatOutputTokens,messages:[{role:'user',content}]},{timeout:timeoutMs});
 const text=j.choices?.[0]?.message?.content;if(!text)throw Error('OpenAI returned no text.');return text;
}
async function refund(db,userId,amount){const plan=await require('./_supabase').getPlan(userId);if(!plan.isAdmin)return db.rpc('add_credits',{uid:userId,amount,why:'refund'});}
module.exports={imageModel,textModel,key,sizeFor,imageBody,submitImage,submitText,poll,pollText,chat,refund};

