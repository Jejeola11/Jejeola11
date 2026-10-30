'use strict';
const jsonata=require('jsonata');
const Ajv=require('ajv');
const {safeCreditsFor}=require('./_packs');
const TYPES=new Set(['text-to-image','image-to-image','image-tools','upscale-image','image-effects','image-background-removal','image-object-removal','image-face-swap','text-to-video','image-to-video','reference-to-video','video-to-video','digital-human','video-extend','motion-control','upscale-video','video-tools','video-effects','video-object-removal','video-face-swap','video-background-removal','video-dubbing','audio-to-video']);
let models,until=0;const details=new Map();
const apiKey=()=>process.env.WAVESPEED_KEY||process.env.WAVESPEED_API_KEY;
async function catalogue(){
 if(models&&until>Date.now())return models;
 const r=await fetch('https://api.wavespeed.ai/api/v3/models',{headers:{Authorization:'Bearer '+apiKey()},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('The model catalogue could not be loaded.');
 const d=await r.json();models=(d.data||[]).filter(m=>TYPES.has(m.type)&&m.api_schema?.api_schemas?.some(s=>s.type==='model_run'));until=Date.now()+3600000;return models;
}
function schema(m){return m.api_schema.api_schemas.find(s=>s.type==='model_run').request_schema}
function objectAt(text,start){let depth=0,inString=false,escaped=false;for(let i=start;i<text.length;i++){const c=text[i];if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false}else if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&!--depth)return JSON.parse(text.slice(start,i+1));}throw Error('Model pricing could not be read.')}
async function pricing(m){
 const cached=details.get(m.model_id);if(cached&&cached.until>Date.now())return cached;
 const r=await fetch('https://wavespeed.ai/models/'+m.model_id,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('This model’s pricing is temporarily unavailable.');
 const html=await r.text();const flight=[...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)].map(x=>JSON.parse(x[1])).join('');
 const marker='{"model_uuid":'+JSON.stringify(m.model_id);const pos=flight.indexOf(marker);if(pos<0)throw Error('This model’s pricing needs verification before use.');
 const meta=objectAt(flight,pos);if(meta.model_uuid!==m.model_id||!Number.isFinite(meta.base_price))throw Error('Invalid model pricing.');
 const result={...meta,until:Date.now()+3600000};details.set(m.model_id,result);return result;
}
async function quote(m,raw,{validate=true}={}){
 const input=JSON.parse(JSON.stringify(raw||{}));const spec=schema(m);
 const ajv=new Ajv({strict:false,allErrors:true,useDefaults:true,validateFormats:false});const check=ajv.compile(spec);
 // Quotes may omit required media URLs before upload; production may not.
 if(validate&&!check(input))throw Error('Check model settings: '+ajv.errorsText(check.errors,{separator:'; '}));
 if(!validate){const relaxed={...spec,required:[]};const fill=ajv.compile(relaxed);if(!fill(input))throw Error('Check model settings: '+ajv.errorsText(fill.errors));}
 if(spec.properties.enable_base64_output)input.enable_base64_output=false;if(spec.properties.enable_sync_mode)input.enable_sync_mode=false;
 // Models requiring duration analysis of external media need a separate verified
 // pricing integration. Never substitute a base price for a dynamic charge.
 const assetCount=Object.entries(input).filter(([k])=>/^(image|images|image_urls|last_image|first_frame|last_frame|reference_images|reference_videos|reference_audios|video|audio)$/.test(k)).reduce((n,[,v])=>n+(Array.isArray(v)?v.length:v?1:0),0);
 if(assetCount>14)throw Error('Select at most 14 assets.');
 const meta=await pricing(m);let micro=meta.base_price;
 if(!meta.formula&&meta.price_inputs?.length)throw Error('This model’s dynamic pricing needs verification.');
 if(meta.formula){
  if(meta.formula.length>12000||/\$eval|function\s*\(|\$get|\$fetch|\$http/i.test(meta.formula))throw Error('This model needs additional pricing support before generation.');
  try{const out=await jsonata(meta.formula).evaluate({...input,base_price:meta.base_price});micro=typeof out==='number'?out:out?.total_price}catch{throw Error('This model’s selected settings could not be priced safely.');}
 }
 if(!Number.isFinite(micro)||micro<=0)throw Error('A verified model quote is unavailable.');
 // Raw catalogue prices are millionths of USD. Discounts are deliberately not
 // assumed so temporary offers cannot remove the margin floor.
 return {inputs:input,credits:safeCreditsFor(micro/1000000),provider_usd:micro/1000000};
}
module.exports={catalogue,schema,pricing,quote,objectAt,apiKey};
