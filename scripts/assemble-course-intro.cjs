const fs=require('node:fs'),crypto=require('node:crypto');
const dir='atelier-v2/media/academy/';
const parts=Array.from({length:9},(_,i)=>dir+'course-original.part'+i);
const video=Buffer.concat(parts.map(p=>fs.readFileSync(p)));
if(crypto.createHash('sha256').update(video).digest('hex')!=='a5f2e7c208aa0af826a7bf74159ba001ac701dcb853de56891ea888db2187100')throw new Error('Course video integrity check failed');
fs.writeFileSync(dir+'course-intro-original.mp4',video);
parts.forEach(p=>fs.unlinkSync(p));
