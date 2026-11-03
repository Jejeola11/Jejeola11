'use strict';
const {credits,VERSION}=require('./_retail-pricing');
const IDS={'gpt-5-5':'openai/gpt-5.5','gpt-5-2':'openai/gpt-5.2','claude-sonnet-4-5':'anthropic/claude-sonnet-4.5','claude-opus-4-5':'anthropic/claude-opus-4.5','claude-haiku-4-5':'anthropic/claude-haiku-4.5','gemini-2-5-pro':'google/gemini-2.5-pro','gemini-2-5-flash':'google/gemini-2.5-flash'};
const cache=new Map();
async function quote(model,{prompt='',referenceCount=0}={}){
 const id=IDS[model];if(!id)throw Error('Choose a supported text model.');
 const bytes=Buffer.byteLength(prompt,'utf8');if(bytes>12000)throw Error('Shorten the prompt to at most 12,000 UTF-8 bytes.');
 let rates=cache.get(id);if(!rates||rates.until<Date.now()){
  const r=await fetch('https://llm.wavespeed.ai/v1/models',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('WaveSpeed text pricing is temporarily unavailable.');
  const j=await r.json(),m=(j.data||[]).find(m=>m.id===id),p=m?.pricing;
  // OpenAI-compatible catalogue pricing.prompt/completion is USD per token.
  if(!p||p.prompt===undefined||p.completion===undefined)throw Error('This text model needs verified WaveSpeed token pricing.');
  const input=Number(p.prompt),output=Number(p.completion);if(!Number.isFinite(input)||!Number.isFinite(output)||input<0||output<=0||input>1||output>1)throw Error('Invalid WaveSpeed token pricing.');
  rates={input,output,until:Date.now()+3600000};cache.set(id,rates);
 }
 // Fixed response ceiling is used for the advance quote; there is no flat per-message WaveSpeed price.
 const usd=(bytes+2048+(referenceCount?16384:0))*rates.input+4096*rates.output;
 return {credits:credits(usd),wavespeed_usd:usd,provider_usd:usd,pricing_source:'wavespeed',pricing_version:VERSION,max_output_tokens:4096};
}
module.exports={quote,IDS};
