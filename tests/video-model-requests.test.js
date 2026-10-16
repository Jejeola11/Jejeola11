const test = require('node:test');
const assert = require('node:assert/strict');
const { submitVideo } = require('../server/functions/_providers');
const { validateModelInputs, normalizeFramePrompt } = require('../server/functions/_video-inputs');

test('all seven Create models preserve prompt and supported settings on both routes', async () => {
  const originalFetch=global.fetch, originalWS=process.env.WAVESPEED_KEY, originalGoogle=process.env.GEMINI_API_KEY;
  process.env.WAVESPEED_KEY='test-only';process.env.GEMINI_API_KEY='test-only';
  const models=[
    {base:'minimax-h3',res:'480p',seconds:5,imageAspect:false},
    {base:'wan-3',res:'720p',seconds:5,audio:'generate_audio'},
    {base:'grok-imagine',res:'720p',seconds:6,imageAspect:false},
    {base:'kling-v3-turbo-standard',res:'720p',seconds:5,imageAspect:false},
    {base:'seedance-2.5',res:'720p',seconds:5,imageAspect:false,audio:'generate_audio'},
    {base:'veo3',res:'720p',seconds:8,audio:'generate_audio'},
    {base:'gemini-omni-1.1-flash',res:'720p',seconds:5}
  ];
  try{
    for(const spec of models)for(const kind of ['text-to-video','image-to-video'])for(const aspect of ['9:16','16:9']){
      let request;
      global.fetch=async(url,init)=>{request={url,body:JSON.parse(init.body)};return new Response('{"data":{"id":"test-job"}}',{status:200})};
      const image=kind==='image-to-video';
      const prompt='A woman lifts a red bag with her left hand. Hold the camera still. No cuts.';
      const model=spec.base+'-'+kind;
      validateModelInputs(model,{duration:spec.seconds+'s',resolution:spec.res,prompt,images:image?1:0,videos:0,audios:0});
      await submitVideo(model,{prompt,aspect,duration:spec.seconds+'s',resolution:spec.res,generate_audio:false,strictModel:true,reference_image_urls:[]},image?['fitted-start','fitted-end']:[]);
      assert(request.url.startsWith('https://api.wavespeed.ai/'),model+' must not use the incomplete Google transport');
      assert.equal(request.body.prompt,prompt,model+' prompt');
      assert.equal(request.body.duration,spec.seconds,model+' duration');
      if(!image||spec.imageAspect!==false)assert.equal(request.body.aspect_ratio,aspect,model+' aspect');
      else assert(!('aspect_ratio' in request.body),model+' inherits fitted image ratio');
      if(image)assert.equal(request.body.image,'fitted-start',model+' fitted start image');
      if(image&&spec.base==='grok-imagine')assert(!('last_image' in request.body));
      if(spec.audio)assert.equal(request.body[spec.audio],false,model+' audio setting');
      if(spec.base==='kling-v3-turbo-standard')assert.equal(request.body.guidance_scale,.8);
      if(spec.base==='wan-3')assert.equal(request.body.enable_prompt_expansion,false);
      if(spec.base==='veo3')assert.equal(request.body.resolution,'720p');
    }
  }finally{global.fetch=originalFetch;if(originalWS===undefined)delete process.env.WAVESPEED_KEY;else process.env.WAVESPEED_KEY=originalWS;if(originalGoogle===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalGoogle;}
});

test('unsupported inputs are rejected rather than silently omitted or clamped',()=>{
  const request={duration:'5s',resolution:'720p',prompt:'Keep the subject still.',images:1,videos:0,audios:0};
  assert.throws(()=>validateModelInputs('grok-imagine-image-to-video',{...request,duration:'6s',images:2}),/up to 1/);
  assert.throws(()=>validateModelInputs('kling-v3-turbo-standard-image-to-video',{...request,videos:1}),/image frames only/);
  assert.throws(()=>validateModelInputs('kling-v3-turbo-standard-text-to-video',{...request,prompt:'x'.repeat(2501)}),/2500/);
  assert.throws(()=>validateModelInputs('kling-v3-turbo-standard-text-to-video',{...request,duration:'8s'}),/duration/);
  assert.throws(()=>validateModelInputs('minimax-h3-text-to-video',request),/quality/);
  assert.equal(normalizeFramePrompt('Start from @image1 and finish at @image2.',2),'Start from the starting frame image and finish at the ending frame image.');
  assert.throws(()=>normalizeFramePrompt('Follow @video1.',1),/does not match/);
});
