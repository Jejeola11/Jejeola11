'use strict';
const {capture}=require('./_wave-capture');
const providers=require('./_providers');
const {validateModelInputs,RATIOS}=require('./_video-inputs');
const supported=new Set(['generate','video-generate','audio-generate','tool-generate','talking-avatar','lipsync-dialogue','omni-reference']);
const text=(s,max=5000)=>typeof s==='string'?s.trim().slice(0,max):'';
function media(value){const u=new URL(value);if(u.protocol!=='https:'||!['rgbweaimkcndjznlazho.supabase.co','res.cloudinary.com','d2h7xmz5gqybh9.cloudfront.net'].includes(u.hostname))throw Error('Upload your reference to Fuse first');return u.href}
const list=(values,max)=>{if(!Array.isArray(values))return [];if(values.length>max)throw Error('Too many references');return values.filter(Boolean).map(media)};
async function recipe(action,b){
 if(!supported.has(action))throw Error('This feature is awaiting verified pricing');
 const prompt=text(b.prompt),aspect=b.aspect||'1:1';if(!RATIOS.includes(aspect)&&aspect!=='4:5')throw Error('Choose a supported aspect ratio');
 let count=1,kind='image',model=b.model,invoke;
 if(action==='generate'){
  if(!prompt)throw Error('Add a prompt');count=Number(b.count||1);if(!Number.isInteger(count)||count<1||count>4)throw Error('Choose 1–4 images');
  const refs=list(b.reference_image_urls||(b.reference_image_url?[b.reference_image_url]:[]),14);model=model||'flux-schnell-image';if(model==='nano-banana-edit')model='nano-banana';
  const resolution=String(b.resolution||['1k','2k','4k'][Number(b.res||1)-1]||'2k').toLowerCase();if(!['1k','2k','4k'].includes(resolution))throw Error('Choose a supported resolution');
  if(!['low','medium','high','xhigh','max'].includes(b.quality||'medium'))throw Error('Choose a supported quality');
  invoke=()=>providers.submitImageWS(model,{prompt,aspect,images:refs,resolution,quality:b.quality||'medium'});
 }else if(action==='video-generate'){
  kind='video';if(!prompt||!model)throw Error('Choose a model and add a prompt');
  const images=list([b.image_url,...(b.reference_image_urls||[])].filter(Boolean),6),videos=list(b.reference_video_urls,6),audios=list(b.reference_audio_urls,6);
  const duration=b.duration||'5s',resolution=b.resolution||'720p',secs=Number(String(duration).replace(/s$/,''));if(!Number.isInteger(secs)||secs<2||secs>30)throw Error('Choose a duration between 2 and 30 seconds');
  if(model.startsWith('seedance-2.5')&&(images.length>2||videos.length||audios.length||b.reference_mode==='reference'))model='seedance-2.5-text-to-video';
  if(!Object.hasOwn(require('./_packs').VIDEO_COST,model))throw Error('Unknown video model');
  validateModelInputs(model,{duration,resolution,prompt,images:images.length,videos:videos.length,audios:audios.length});
  if(model.includes('image-to-video')&&!images.length)throw Error('Upload a start image');
  if(images.length+videos.length+audios.length>6)throw Error('Use at most six references');
  invoke=()=>providers.submitVideo(model,{prompt,aspect,duration,resolution,strictModel:true,generate_audio:b.generate_audio!==false,image_url:images[0],reference_image_urls:images,reference_video_urls:videos,reference_audio_urls:audios},images.slice(0,2));
 }else if(action==='tool-generate'){
  kind='tool';model=b.slug;invoke=()=>providers.submitToolWS(model,{image:media(b.image_url),prompt});
 }else if(action==='audio-generate'){
  if(b.engine==='resemble')throw Error('Resemble needs a verified cost configuration before use');
  kind='audio';model='omnivoice-voice-clone';const script=text(b.text||b.prompt,6000);if(!script||String(b.text||b.prompt).length>6000)throw Error('Use a script of 1–6,000 characters');const speed=Number(b.speed||1);if(speed<.5||speed>2)throw Error('Choose speed from 0.5 to 2');invoke=()=>providers.submitSpeech({audio:media(b.voice_sample_url),text:script,speed,referenceText:text(b.reference_text)});
 }else if(action==='talking-avatar'){
  kind='video';model=b.model||'omnihuman-1-5';if(!['omnihuman-1-5','kling-v2-avatar-pro','kling-v2-avatar-standard'].includes(model))throw Error('Unknown avatar model');invoke=()=>providers.submitAvatar(model,{image:media(b.image_url),audio:media(b.audio_url),resolution:b.resolution||'480p'});
 }else if(action==='lipsync-dialogue'){
  kind='video';model='kling-lipsync-'+(b.mode==='audio'?'audio':'text');invoke=()=>providers.submitLipsyncDialogue({video:media(b.video_url),mode:b.mode==='audio'?'audio':'text',text:text(b.text),audio:b.audio_url?media(b.audio_url):undefined,voice_language:b.voice_language,voice_speed:b.voice_speed});
 }else if(action==='omni-reference'){
  if((b.audio_urls||b.audio_files||[]).length)throw Error('Audio references are not supported for this quoted model');kind='video';model='seedance-2-omni-reference-no-video';invoke=()=>providers.submitOmniReference({images:list(b.image_urls||b.images_list||[],9),prompt,aspect});
 }
 const request=await capture(invoke);return {...request,count,kind,internalModel:model,prompt:prompt||text(b.text),aspect};
}
module.exports={recipe,supported};
