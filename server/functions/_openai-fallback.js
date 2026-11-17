'use strict';
// OpenAI remains primary. Only a definitive billing rejection permits a
// second paid submission; rate limits, moderation and uncertain failures do not.
const OPENAI='https://api.openai.com/v1';
const WS='https://llm.wavespeed.ai/v1';
const IMAGE='https://api.wavespeed.ai/api/v3';
const waveKey=()=>String(process.env.WAVESPEED_KEY||process.env.WAVESPEED_API_KEY||'').trim();
function billingError(error){
 if(!error||error.uncertain)return false;
 const code=String(error.code||error.type||'').toLowerCase();
 const message=String(error.message||'').toLowerCase();
 return /^(insufficient_quota|billing_hard_limit_reached|billing_not_active|credit_balance_exhausted|insufficient_funds|insufficient_balance)$/.test(code)||
  /exceeded your current quota|billing hard limit|billing quota|run out of credits|out of credits|no balance left|insufficient (?:credit|fund|balance)|credit balance.{0,20}exhaust|payment required/.test(message)||error.status===402;
}
function providerError(j,status,provider){
 const raw=j?.error||{};const e=Error(raw.message||j?.message||provider+' request failed ('+status+').');
 e.code=raw.code;e.type=raw.type;e.status=status;e.provider=provider;e.uncertain=status>=500;return e;
}
async function send(base,path,body,key,timeout,provider){
 const reference=require('crypto').randomUUID();
 let r;try{r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','X-Client-Request-Id':reference},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});}catch(e){e.uncertain=!!body;if(body)e.message=provider+' submission needs checking. Do not resubmit. Contact support with '+reference;throw e;}
 const j=await r.json().catch(()=>null);
 if(!r.ok||(j?.error&&(body||j.status!=='failed')))throw providerError(j,r.status,provider);
 if(!j){const e=Error(provider+' returned an unreadable response.');e.uncertain=!!body;throw e;}
 if(j.status==='failed'&&j.error)throw providerError(j,r.status,provider);
 return j;
}
let models,expires=0;
async function imageModels(){
 if(models&&Date.now()<expires)return models;
 const r=await fetch(IMAGE+'/models',{headers:{Authorization:'Bearer '+waveKey()},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('WaveSpeed fallback catalogue is temporarily unavailable.');
 const j=await r.json();models=j.data||[];expires=Date.now()+3600000;return models;
}
async function fallbackImage(body){
 const tool=body.tools.find(t=>t.type==='image_generation');
 const images=(body.input||[]).flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(c=>c.type==='input_image').map(c=>c.image_url);
 const prompt=(body.input||[]).flatMap(m=>Array.isArray(m.content)?m.content:[]).filter(c=>c.type==='input_text').map(c=>c.text).join('\n');
 const id='openai/'+tool.model+'/'+(images.length?'edit':'text-to-image');
 const model=(await imageModels()).find(m=>m.model_id===id);
 const schema=model?.api_schema?.api_schemas?.find(s=>s.type==='model_run')?.request_schema;
 if(!schema?.properties)throw Error('This model is not currently available on the WaveSpeed fallback.');
 const props=schema.properties,inputs={prompt};if(images.length)inputs.images=images;
 const [w,h]=tool.size.split('x').map(Number),ratio=w/h;
 if(props.aspect_ratio){const values=props.aspect_ratio.enum||['1:1','3:2','2:3','3:4','4:3','4:5','5:4','9:16','16:9','21:9'];inputs.aspect_ratio=values.reduce((a,b)=>Math.abs(a.split(':')[0]/a.split(':')[1]-ratio)<Math.abs(b.split(':')[0]/b.split(':')[1]-ratio)?a:b);}
 if(props.size)inputs.size=tool.size.replace('x','*');
 if(props.resolution)inputs.resolution=w*h>6000000?'4k':w*h>2000000?'2k':'1k';
 for(const name of ['quality','output_format','input_fidelity'])if(tool[name]!==undefined&&props[name])inputs[name]=tool[name];
 if(props.background)inputs.background=tool.background;
 else if(tool.background==='transparent')throw Error('Transparent backgrounds are unavailable on this model’s WaveSpeed fallback. Choose an opaque background or try after OpenAI is funded.');
 if(props.enable_sync_mode)inputs.enable_sync_mode=false;if(props.enable_base64_output)inputs.enable_base64_output=false;
 const j=await send(IMAGE,'/'+id,inputs,waveKey(),35000,'WaveSpeed');
 if(!j.data?.id){const e=Error('WaveSpeed did not return a generation reference.');e.uncertain=true;throw e;}
 return {id:'wsimg_'+j.data.id,provider:'wavespeed',fallback_reason:'openai_billing'};
}
async function waveText(path,body,timeout){
 const next={...body,model:'openai/'+String(body.model).replace(/^openai\//,'')};
 // WaveSpeed text is completed synchronously: callers persist the result,
 // rather than assuming OpenAI background-response retrieval is portable.
 if(path==='/responses'){next.background=false;next.store=false;}
 const j=await send(WS,path,next,waveKey(),timeout,'WaveSpeed');
 if(j.status&&['queued','in_progress'].includes(j.status)){const e=Error('WaveSpeed text submission needs checking. Do not resubmit.');e.uncertain=true;throw e;}
 return {...j,status:j.status||'completed',provider:'wavespeed',fallback_reason:'openai_billing'};
}
async function request(path,body,{timeout=35000}={}){
 const key=String(process.env.OPENAI_API_KEY||'').trim();if(!key)throw Error('OpenAI is not configured.');
 try{return await send(OPENAI,path,body,key,timeout,'OpenAI');}
 catch(e){
  if(!body||!billingError(e)||!waveKey())throw e;
  if(path==='/responses'&&body.tools?.some(t=>t.type==='image_generation'))return fallbackImage(body);
  if(path==='/responses'||path==='/chat/completions')return waveText(path,body,timeout);
  throw e;
 }
}
async function pollImage(id){
 if(!/^[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid WaveSpeed generation reference.');
 const j=await send(IMAGE,'/predictions/'+id+'/result',null,waveKey(),35000,'WaveSpeed'),d=j.data||{};
 return {status:d.status==='completed'?'completed':d.status==='failed'?'failed':'processing',url:d.outputs?.[0],raw:d,provider:'wavespeed'};
}
// Resume a definitively failed background response without changing the browser's
// job ID. The durable JSON marker and atomic claim prevent overlapping polls
// (and cold starts) from starting multiple fallback generations.
async function savedFallback(context){
 if(!context?.db||!context.requestId)return null;
 const found=await context.db.from('jobs').select('*').eq('request_id',context.requestId).eq('user_id',context.userId).maybeSingle();
 if(found.error)throw found.error;
 const saved=found.data?.meta?.openai_fallback;
 if(!saved)return null;
 if(saved.text)return {status:'completed',text:saved.text,provider:'wavespeed'};
 if(saved.requestId)return pollImage(saved.requestId.slice(6));
 if(saved.error)return {status:'failed',raw:{error:saved.error},provider:'wavespeed'};
 return {status:'processing'};
}
async function recoverResponse(id,response,context,{text=false}={}){
 const err=providerError(response,200,'OpenAI');
 if(!billingError(err)||!waveKey()||!context?.db)return null;
 const db=context.db,found=await db.from('jobs').select('*').eq('request_id',context.requestId).eq('user_id',context.userId).maybeSingle();
 if(found.error)throw found.error;if(!found.data)return null;
 const job=found.data;
 if(job.meta?.openai_fallback)return savedFallback(context);
 // Retrieve the exact original references, not just the saved display prompt.
 const items=await request('/responses/'+id+'/input_items');
 const body={model:response.model,input:items.data||[],instructions:response.instructions||undefined,max_output_tokens:response.max_output_tokens||4096,tools:response.tools||[]};
 const claim=await db.from('jobs').update({status:'generating',meta:{...job.meta,openai_fallback:{state:'submitting'}}}).eq('request_id',context.requestId).eq('user_id',context.userId).eq('status','processing').is('meta->openai_fallback',null).select().maybeSingle();
 if(claim.error)throw claim.error;if(!claim.data)return {status:'processing'};
 try{
  const result=text?await waveText('/responses',body,35000):await fallbackImage(body);
  const output=text?(result.output_text||(result.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n')):null;
  if(text&&!output)throw Error('WaveSpeed returned no text.');
  const marker=text?{state:'completed',text:output}:{state:'processing',requestId:result.id};
  const saved=await db.from('jobs').update({status:'processing',meta:{...job.meta,provider:'wavespeed',openai_fallback:marker}}).eq('request_id',context.requestId);
  if(saved.error)throw Object.assign(saved.error,{uncertain:true});
  return text?{status:'completed',text:output,provider:'wavespeed'}:{status:'processing'};
 }catch(e){
  // An unknown POST outcome keeps the claim. Never automatically resubmit it.
  if(e.uncertain)return {status:'processing'};
  await db.from('jobs').update({status:'processing',meta:{...job.meta,openai_fallback:{state:'failed',error:e.message}}}).eq('request_id',context.requestId);
  return {status:'failed',raw:{error:e.message},provider:'wavespeed'};
 }
}
module.exports={request,billingError,waveKey,pollImage,savedFallback,recoverResponse};
