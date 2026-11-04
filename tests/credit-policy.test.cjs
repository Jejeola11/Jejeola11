'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const policy=require('../server/functions/_credit-policy');
const pricing=require('../server/functions/_packs');
const retail=require('../server/functions/_retail-pricing');
const gpt=require('../server/functions/_gpt-pricing');
const source=name=>fs.readFileSync(require.resolve('../server/functions/'+name+'.js'),'utf8');
test('locked policy assumptions and exports cannot be mutated',()=>{
 assert(Object.isFrozen(policy));assert(Object.isFrozen(policy.POLICY));
 assert.equal(policy.POLICY.usdNaira,1500);
 assert.equal(policy.POLICY.maxDiscount,.25);
 assert.equal(policy.POLICY.affiliateRate,.05);
 assert.equal(policy.POLICY.minimumContributionMargin,.10);
 assert.equal(retail.credits,policy.credits);
 assert.equal(pricing.safeCreditsFor,policy.credits);
 assert.throws(()=>{policy.POLICY.usdNaira=1});
});
test('rounding, invalid costs and preserved Seedance charge',()=>{
 assert.equal(policy.credits(1.8),60);
 for(const invalid of [undefined,null,'1',0,-1,NaN,Infinity,Number.MAX_VALUE])assert.throws(()=>policy.credits(invalid));
 for(let i=1;i<=10000;i++){
  const usd=i/1000,c=policy.credits(usd);
  assert(Number.isSafeInteger(c));
  assert(c*policy.netNairaPerCredit*.9+1e-9>=usd*1500);
 }
});
test('every registered static image, video and tool uses the policy',()=>{
 for(const [costs,charges] of [[pricing.IMAGE_COST,pricing.IMAGE_MODELS],[pricing.VIDEO_COST,pricing.VIDEO_MODELS],[pricing.TOOL_COST,pricing.TOOL_MODELS]])
  for(const [id,usd] of Object.entries(costs)){
   const expected=gpt.imageModel(id)?gpt.imageQuote(id,{prompt:'',resolution:'1k'}).credits:policy.credits(usd);
   assert.equal(charges[id],expected,id);
  }
 for(const [id,rates] of Object.entries(pricing.VIDEO_DYNAMIC_RATES))for(const [res,rate] of Object.entries(rates))for(const sec of [5,10,25])assert.equal(pricing.videoCreditsForRequest(id,sec+'s',res),policy.credits(rate*sec),id);
 assert.throws(()=>pricing.videoCreditsForRequest('unknown',5,'720p'));
 assert.throws(()=>pricing.imageCreditsForRequest('unknown'));
});
test('all six pack grants clear the floor including maximum discount',()=>{
 const exports={};vm.runInNewContext(source('credit-pricing'),{exports,require:id=>id==='./_supabase'?{json:()=>{}}:require('../server/functions/'+id)});
 const expected=[[1250,15],[6250,75],[12500,150],[25000,300],[62500,750],[125000,1500]];
 assert.deepEqual(JSON.parse(JSON.stringify(Object.values(exports.PACKS).map(p=>[p.amount_naira,p.credits]))),expected);
 for(const p of Object.values(exports.PACKS))policy.assertPack(p,Math.round(p.amount_naira*.75));
 assert.throws(()=>policy.assertPack({amount_naira:1250,credits:100}));
});
test('legacy LLM assistants quote their complete prompt before debit',()=>{
 for(const name of ['flyer-brief','flyer-spec','video-edit-brief','flyer-suggest-layers']){
  const s=source(name);assert(s.includes("require('./_wavespeed-llm-pricing').quote"),name);
  assert(s.indexOf("require('./_wavespeed-llm-pricing').quote")<s.indexOf("db.rpc('spend_credits'"),name);
 }
});
test('unpriced legacy media routes fail closed before spending or submitting',async()=>{
 for(const name of ['video-transcribe','talking-avatar','omni-reference','omni-video-edit','video-omni-edit']){
  let calls=0;const exports={};
  const stub={getUser:async()=>({id:'test'}),json:(statusCode,body)=>({statusCode,body}),admin:()=>{calls++;throw Error('must not debit')}};
  vm.runInNewContext(source(name),{exports,require:id=>id==='./_supabase'?stub:{},process:{env:{}}});
  const r=await exports.handler({httpMethod:'POST',body:'{}'});
  assert.equal(r.statusCode,503,name);assert.equal(r.body.code,'PRICING_REVIEW_REQUIRED');assert.equal(calls,0);
 }
 for(const name of ['page-generate','page-revise'])assert(!source(name).includes('await fetch('),name);
});
test('image quote cannot be lowered by client credit fields or provider flags',async()=>{
 const exports={};
 const stubs={
  './_supabase':{getUser:async()=>({id:'test'}),getPlan:async()=>({plan:'pro'}),json:(statusCode,body)=>({statusCode,body})},
  './_packs':{...pricing,IMAGE_MODELS:{'nano-banana':1},imageCreditsForRequest:()=>10},
  './_openai-direct':{imageModel:()=>null},
  './_providers':{hasWaveSpeed:()=>true},'./_muapi':{}
 };
 vm.runInNewContext(source('generate'),{exports,require:id=>stubs[id],process:{env:{}},console});
 for(const provider of [undefined,'wavespeed']){
  const r=await exports.handler({httpMethod:'POST',body:JSON.stringify({model:'nano-banana',prompt:'test',resolution:'4k',quote:true,credits:1,accepted_credits:1,provider})});
  assert.equal(r.statusCode,200);assert.equal(r.body.credits,10);
 }
});
test('Vercel cannot finish a build without running the pricing checks',()=>{
 const config=JSON.parse(fs.readFileSync(require.resolve('../vercel.json'),'utf8'));
 assert(config.buildCommand.startsWith('node --test tests/credit-policy.test.cjs && '));
});
