'use strict';
// OpenAI Standard rates and output-token calculator verified 2026-11-02:
// https://developers.openai.com/api/docs/guides/image-generation
// Calculator factors: GPT Image 2 low/medium/high=16/48/96;
// GPT Image 2.5 low/medium/high/xhigh/max=16/24/48/64/96.
// These are estimates with a safety allowance, NOT provider spending caps.
const {PACKS}=require('./credit-pricing');
const POLICY=Object.freeze({version:'gpt-fair-2026-11-03',fxBudget:1750,firstPurchaseDiscount:.25,affiliateRate:.05,feeRate:.04,fixedFee:100,operatingNaira:5,markup:3,imageMarkup:2,providerAllowance:1.25,maxPromptBytes:12000,maxReferences:14,maxReferenceEdge:1536,referenceTokenBudget:16384,imageReferenceTokenBudget:8192,imageHelperReferenceTokenBudget:4096,chatOutputTokens:4096,imageHelperOutputTokens:2048});
const netCreditNaira=Math.min(...Object.values(PACKS).map(p=>(Math.floor(p.amount_naira*(1-POLICY.firstPurchaseDiscount))*(1-POLICY.affiliateRate-POLICY.feeRate)-POLICY.fixedFee)/p.credits),(50000*(1-POLICY.affiliateRate-POLICY.feeRate)-POLICY.fixedFee)/650);
if(!(netCreditNaira>0))throw Error('Credit packs do not leave a positive generation budget.');
const TEXT={'gpt-5.2':{input:1.75,cached:.175,output:14},'gpt-5.5':{input:5,cached:.5,output:30}};
function imageModel(id){const m=String(id||'').replace(/^openai\//,'').match(/^gpt-image-(2\.5-(?:sunburst|flare)|2|1\.5|1-mini|1)(?=$|[-/])/);return m?'gpt-image-'+m[1]:null;}
function textModel(id){const s=String(id||'').replace(/^openai\//,'');return s==='gpt-5-5'?'gpt-5.5':s==='gpt-5-2'?'gpt-5.2':TEXT[s]?s:null;}
function creditsForBudget(usd,markup=POLICY.markup){if(!Number.isFinite(usd)||usd<=0)throw Error('A verified GPT cost budget is required.');return Math.max(1,Math.ceil((usd*POLICY.fxBudget+POLICY.operatingNaira)*markup/netCreditNaira));}
function promptBytes(prompt,{fallback=false}={}){const n=Buffer.byteLength(String(prompt||''),'utf8');if(n>POLICY.maxPromptBytes)throw Error('Shorten the prompt to at most 12,000 UTF-8 bytes.');return fallback?POLICY.maxPromptBytes:n;}
function sizeFor(aspect='1:1',resolution='1k',size){
 let w,h;if(size&&/^\d+[x*]\d+$/.test(size)){[w,h]=size.split(/[x*]/).map(Number);}else{const [a,b]=String(aspect).split(':').map(Number),ratio=a/b;if(!Number.isFinite(ratio)||ratio<1/3||ratio>3)throw Error('Choose a supported image aspect ratio.');const target=resolution==='4k'?8294400:resolution==='2k'?4194304:1048576;w=Math.sqrt(target*ratio);h=w/ratio;const scale=Math.min(1,3840/Math.max(w,h));w=Math.floor(w*scale/16)*16;h=Math.floor(h*scale/16)*16;if(w*h<655360)h=Math.ceil(655360/w/16)*16;}
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w%16||h%16||Math.max(w,h)>3840||Math.max(w,h)/Math.min(w,h)>3||w*h<655360||w*h>8294400)throw Error('Choose a valid image size.');return w+'x'+h;
}
function tiesEven(n){const f=Math.floor(n);return n-f===.5?f+f%2:Math.round(n);}
function outputTokens(model,w,h,quality){
 if(/^gpt-image-1/.test(model)){const square=w===h;return ({low:square?272:408,medium:square?1056:1584,high:square?4160:6240})[quality];}
 const factor=(model.includes('2.5')?{low:16,medium:24,high:48,xhigh:64,max:96}:{low:16,medium:48,high:96})[quality];if(!factor)throw Error('Choose a supported image quality.');return Math.ceil(factor*tiesEven(factor/(Math.max(w,h)/Math.min(w,h)))*(2000000+w*h)/4000000);
}
function imageQuote(id,opts={}){
 const model=imageModel(id);if(!model||['gpt-image-1','gpt-image-1-mini'].includes(model))throw Error('This GPT image model needs verified pricing before use.');
 const refs=opts.referenceCount??(opts.images||opts.image_urls||[]).length;if(!Number.isSafeInteger(refs)||refs<0||refs>POLICY.maxReferences)throw Error('Use at most 14 image references.');
 const bytes=promptBytes(opts.prompt,{fallback:opts.prompt===undefined}),quality=opts.quality||'medium';
 let size=sizeFor(opts.aspect||opts.aspect_ratio||'1:1',opts.resolution||'1k',opts.size);if(model==='gpt-image-1.5'){const [w,h]=size.split('x').map(Number);size=w===h?'1024x1024':w>h?'1536x1024':'1024x1536';}
 const [w,h]=size.split('x').map(Number),tokens=outputTokens(model,w,h,quality);if(!Number.isFinite(tokens))throw Error('Unverified GPT image quality.');
 const imageUsd=(tokens*(model==='gpt-image-1.5'?32:30)+bytes*5+refs*POLICY.imageReferenceTokenBudget*8)/1e6;
 // Include the mainline GPT-5.2 call, including its maximum permitted output.
 const helperUsd=((bytes+2048+refs*POLICY.imageHelperReferenceTokenBudget)*1.75+POLICY.imageHelperOutputTokens*14)/1e6;
 const providerBudget=(imageUsd+helperUsd)*POLICY.providerAllowance;
 return {credits:creditsForBudget(providerBudget,POLICY.imageMarkup),provider_usd:providerBudget,size,quality,model,pricing_version:POLICY.version};
}
function textQuote(id,opts={}){const model=textModel(id),rates=TEXT[model];if(!rates)throw Error('Unverified GPT chat pricing.');const refs=opts.referenceCount??1;if(!Number.isSafeInteger(refs)||refs<0||refs>1)throw Error('GPT chat supports one reference image.');const bytes=promptBytes(opts.prompt,{fallback:opts.prompt===undefined});const budget=((bytes+2048+refs*POLICY.referenceTokenBudget)*rates.input+POLICY.chatOutputTokens*rates.output)/1e6*POLICY.providerAllowance;return {credits:creditsForBudget(budget),provider_usd:budget,model,pricing_version:POLICY.version};}
function responseCost(response,{imageModel:im}={}){
 const u=response.usage,rates=TEXT[response.model]||TEXT[String(response.model||'').replace(/-\d{4}-\d{2}-\d{2}$/,'')];
 if(!u||!rates||!Number.isFinite(u.input_tokens)||!Number.isFinite(u.output_tokens))return null;
 const cached=u.input_tokens_details?.cached_tokens;if(!Number.isFinite(cached))return null;let usd=((u.input_tokens-cached)*rates.input+cached*rates.cached+u.output_tokens*rates.output)/1e6;
 if(im)return null; // Image cache discounts need invoice reconciliation; retain raw tool usage instead.
 return usd;
}
module.exports={POLICY,TEXT,netCreditNaira,imageModel,textModel,creditsForBudget,promptBytes,sizeFor,outputTokens,imageQuote,textQuote,responseCost};
