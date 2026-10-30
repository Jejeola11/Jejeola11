const RATIOS = ['16:9','9:16','1:1','4:3','3:4','21:9'];

function validateModelInputs(model, { duration, resolution, prompt, images, videos, audios }) {
  const seconds = Number(String(duration).replace(/s$/, ''));
  const common = { maxImages: 2 };
  let rules;
  if(model.startsWith('seedance-2.0-mini-')) rules={...common,min:4,max:15,res:['720p','1080p']};
  else if(model.startsWith('minimax-h3-')) rules={...common,min:3,max:15,res:['480p','540p','768p','1080p']};
  else if(model.startsWith('wan-3-')) rules={...common,min:2,max:30,res:['480p','720p','1080p']};
  else if(model.startsWith('grok-imagine-')) rules={maxImages:1,durations:[6,10],res:['720p']};
  else if(model.startsWith('kling-v3-turbo-')) rules={...common,durations:[5,10],res:['720p'],maxPrompt:2500};
  else if(model.startsWith('seedance-2.5-')) rules={maxImages:6,min:4,max:30,res:['480p','720p','1080p','4k'],mixed:true};
  else if(model.startsWith('veo3-')) rules={...common,durations:[8],res:['720p']};
  else if(model.startsWith('gemini-omni-1.1-flash-')) rules={...common,min:3,max:10,res:['360p','720p','1080p','4k']};
  else return;
  if(!Number.isInteger(seconds)||(rules.durations?!rules.durations.includes(seconds):seconds<rules.min||seconds>rules.max))throw new Error('Choose a supported duration for this model.');
  if(!rules.res.includes(resolution))throw new Error('Choose a supported quality for this model.');
  if(images>rules.maxImages)throw new Error(`This model accepts up to ${rules.maxImages} image${rules.maxImages===1?'':'s'}. Remove extra references or choose another model.`);
  if(!rules.mixed&&(videos||audios))throw new Error('This model accepts image frames only. Remove video/audio references or choose Seedance.');
  if(rules.maxPrompt&&prompt.length>rules.maxPrompt)throw new Error(`This model supports up to ${rules.maxPrompt} prompt characters. Shorten the prompt; it will not be cut automatically.`);
}

function normalizeReferencePrompt(prompt, counts) {
  return prompt.replace(/@(image|video|audio)\s*(\d+)/gi, (_, kind, index) => {
    kind = kind.toLowerCase();
    const n = Number(index);
    if (n < 1 || n > counts[kind]) throw new Error(`@${kind}${index} does not match an uploaded ${kind}.`);
    return '@' + kind[0].toUpperCase() + kind.slice(1) + ' ' + n;
  });
}

function normalizeFramePrompt(prompt, count) {
  return normalizeReferencePrompt(prompt,{image:count,video:0,audio:0})
    .replace(/@Image (\d+)/g,(_,n)=>Number(n)===1?'the starting frame image':'the ending frame image');
}

// I2V models commonly inherit the image dimensions. Fit the complete image
// inside the requested canvas; never stretch or cut away the subject.
async function fitVideoFrames(db, userId, urls, aspect) {
  if (!RATIOS.includes(aspect)) throw new Error('Choose a supported aspect ratio.');
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const ratio = aspect.split(':').map(Number).reduce((a,b)=>a/b);
  const width = Math.round((ratio >= 1 ? 1280 : 1280 * ratio) / 2) * 2;
  const height = Math.round((ratio >= 1 ? 1280 / ratio : 1280) / 2) * 2;
  const out = [];
  for (const src of urls) {
    const url = new URL(src);
    if (url.protocol !== 'https:' || !['rgbweaimkcndjznlazho.supabase.co','d2h7xmz5gqybh9.cloudfront.net','res.cloudinary.com'].includes(url.hostname)) throw new Error('Upload the reference image to Fuse before generating.');
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('A reference image is unavailable. Upload it again.');
    if (Number(response.headers.get('content-length')) > 20*1024*1024) throw new Error('Use a reference image smaller than 20 MB.');
    const parts=[];let size=0;
    for await (const part of response.body) {size+=part.length;if(size>20*1024*1024)throw new Error('Use a reference image smaller than 20 MB.');parts.push(part)}
    const image = await loadImage(Buffer.concat(parts));
    if (Math.abs(image.width / image.height - ratio) < .005) { out.push(src); continue; }
    const canvas = createCanvas(width,height),ctx=canvas.getContext('2d');
    ctx.fillStyle='#171717';ctx.fillRect(0,0,width,height);
    const cover=Math.max(width/image.width,height/image.height);
    ctx.globalAlpha=.25;ctx.drawImage(image,(width-image.width*cover)/2,(height-image.height*cover)/2,image.width*cover,image.height*cover);ctx.globalAlpha=1;
    const scale=Math.min(width/image.width,height/image.height);
    ctx.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);
    const path=`${userId}/video-frame-${require('crypto').randomUUID()}.png`;
    const {error}=await db.storage.from('avatars').upload(path,canvas.toBuffer('image/png'),{contentType:'image/png'});
    if(error)throw new Error('Could not prepare the reference frame. Please retry.');
    out.push(db.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }
  return out;
}

module.exports = { RATIOS, normalizeReferencePrompt, normalizeFramePrompt, fitVideoFrames, validateModelInputs };
