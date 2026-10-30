const test=require('node:test');
const assert=require('node:assert/strict');
const {PACKS}=require('../server/functions/credit-pricing');
const pricing=require('../server/functions/_packs');
const net=price=>price*.96-100;
const expected=[['credits-v2-trial',1000,6],['credits-v2-mini',5000,55],['credits-v2-creator',10000,120],['credits-v2-studio',20000,240],['credits-v2-pro',50000,600],['credits-v2-agency',100000,1200]];
test('six Nestuge packs retain prices and grant new balances',()=>{
  for(const [id,price,credits] of expected)assert.deepEqual([PACKS[id].amount_naira,PACKS[id].credits],[price,credits]);
  assert.equal(Math.min(...expected.map(([,p,c])=>net(p)/c)),9500/120);
});
test('Grok is billed per generated second, not per request',()=>{
  assert.equal(pricing.videoCreditsForRequest('grok-imagine-text-to-video','6s','720p'),12);
  assert.equal(pricing.videoCreditsForRequest('grok-imagine-image-to-video','10s','720p'),20);
});
test('duration and resolution quotes clear buffered API floor',()=>{
  const floor=net(10000)/120;
  for(const [model,rates] of Object.entries(pricing.VIDEO_DYNAMIC_RATES))
    for(const [resolution,rate] of Object.entries(rates))
      for(const seconds of [5,10,25]){
        const credits=pricing.videoCreditsForRequest(model,seconds+'s',resolution);
        assert.ok(credits*floor+1e-8>=rate*seconds*1400*2.2,model+' '+seconds+'s '+resolution);
      }
  assert.equal(pricing.videoCreditsForRequest('seedance-2.5-image-to-video','5s','720p'),71);
  assert.equal(pricing.videoCreditsForRequest('kling-v3-turbo-standard-image-to-video','5s','720p'),22);
});
test('multi-reference and 4K image edits are quoted above base',()=>{
  assert.equal(pricing.imageCreditsForRequest('gpt-image-2-text-to-image',{resolution:'4k',referenceCount:14}),14);
  assert.equal(pricing.imageCreditsForRequest('nano-banana-pro-ws-text-to-image',{resolution:'4k'}),12);
  assert.equal(pricing.IMAGE_MODELS['flux-schnell-image'],1);
});
