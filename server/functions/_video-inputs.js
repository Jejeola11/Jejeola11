const RATIOS = ['16:9','9:16','1:1','4:3','3:4','21:9'];

function normalizeReferencePrompt(prompt, counts) {
  return prompt.replace(/@(image|video|audio)\s*(\d+)/gi, (_, kind, index) => {
    kind = kind.toLowerCase();
    const n = Number(index);
    if (n < 1 || n > counts[kind]) throw new Error(`@${kind}${index} does not match an uploaded ${kind}.`);
    return '@' + kind[0].toUpperCase() + kind.slice(1) + ' ' + n;
  });
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

module.exports = { RATIOS, normalizeReferencePrompt, fitVideoFrames };
