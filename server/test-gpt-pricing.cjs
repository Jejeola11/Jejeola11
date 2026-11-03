'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'functions'),cache={};let remote;
function load(n){if(n==='_supabase')return {};if(cache[n])return cache[n];const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(root,n+'.js'),'utf8'),{module:m,exports:m.exports,Buffer,URL,AbortSignal,process:{env:{OPENAI_API_KEY:'test-only'}},fetch:(...args)=>remote(...args),require:p=>p.startsWith('./')?load(p.slice(2)):require(p),console,setTimeout,clearTimeout});return cache[n]=m.exports;}
(async()=>{
 const r=load('_retail-pricing'),g=load('_gpt-pricing'),packs=load('_packs');
 for(const [usd,want]of [[.024,1],[.054,2],[.10,4],[1.8,60],[85/2800,1]])assert.equal(r.credits(usd),want);
 for(const v of [0,-1,NaN,Infinity])assert.throws(()=>r.credits(v));
 let count=0;for(const model of ['gpt-image-2.5-sunburst','gpt-image-2.5-flare','gpt-image-2'])for(const resolution of ['1k','2k','4k'])for(const quality of model.includes('2.5')?['low','medium','high','xhigh','max']:['low','medium','high'])for(const referenceCount of [0,1,2,14]){const q=g.imageQuote(model,{prompt:'portrait',resolution,quality,referenceCount});assert.equal(q.credits,r.credits(q.wavespeed_usd));assert.equal(q.pricing_source,'wavespeed');count++;}
 assert.equal(g.imageQuote('gpt-image-2.5-sunburst',{prompt:'portrait',referenceCount:2}).credits,2);
 assert.equal(g.imageQuote('gpt-image-2.5-sunburst',{prompt:'portrait',referenceCount:2}).wavespeed_usd,.054);
 assert.equal(packs.safeCreditsFor(.054),2);assert.equal(packs.imageCreditsForRequest('gpt-image-2.5-sunburst',{referenceCount:2,resolution:'1k'}),2);
 assert(Math.abs(r.seedanceUsd('2.5','720p',5)-1.8)<1e-10);assert(Math.abs(r.seedanceUsd('2.0','720p',5)-1.2)<1e-10);
 assert(Math.abs(r.seedanceUsd('2.5','720p',5,5,'video-edit')-2.2)<1e-10);assert(Math.abs(r.seedanceUsd('2.5','720p',5,10,'video-extend')-3.3)<1e-10);
 const direct=load('_openai-direct').imageBody('gpt-image-2.5-sunburst',{prompt:'test'});assert.equal(direct.max_tool_calls,1);assert.equal(direct.max_output_tokens,2048);
 const llm=load('_wavespeed-llm-pricing');remote=async()=>({ok:true,json:async()=>({data:Object.values(llm.IDS).map(id=>({id,pricing:{prompt:'0.000002',completion:'0.00001'}}))})});
 for(const id of Object.keys(llm.IDS)){const q=await llm.quote(id,{prompt:'test'});assert.equal(q.credits,r.credits((4+2048)*.000002+4096*.00001));assert.equal(q.max_output_tokens,4096);}
 const hf=load('_higgsfield-seedance');for(const m of hf.models().filter(m=>m.type==='text-to-video')){const q=await hf.quote(m,{prompt:'test',resolution:'720p',duration:5},{validate:false});assert.equal(q.credits,r.credits(m.model_id.includes('2.5')?1.8:1.2));}
 console.log('PASS: exact formula and ceilings; '+count+' GPT settings/reference combinations; legacy image conversion; WaveSpeed Seedance version/edit/extend rates; all seven text model quotes; provider tool caps.');
})().catch(e=>{console.error(e);process.exitCode=1;});
