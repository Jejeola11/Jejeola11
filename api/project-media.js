// Streams only the fixed original project files. Supports browser byte-range playback.
const sources=require('../start/project-parts.json');
module.exports=async(req,res)=>{
 const source=sources[String(req.query.id||'')];
 if(!source||!['GET','HEAD'].includes(req.method)){res.statusCode=404;return res.end();}
 let start=0,end=source.bytes-1;
 const range=req.headers.range;
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2])){res.statusCode=416;return res.end();}if(!m[1])start=Math.max(0,source.bytes-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}if(start>end||start>=source.bytes){res.statusCode=416;res.setHeader('Content-Range',`bytes */${source.bytes}`);return res.end();}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${source.bytes}`);}
 res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',end-start+1);res.setHeader('Cache-Control','public,max-age=86400');
 if(req.method==='HEAD')return res.end();
 try{for(let i=Math.floor(start/5000000);i<=Math.floor(end/5000000);i++){
  const r=await fetch(source.parts[i]);if(!r.ok)throw Error('Media unavailable');
  const bytes=Buffer.from(await r.arrayBuffer());const offset=i*5000000;
  const chunk=bytes.subarray(Math.max(0,start-offset),Math.min(bytes.length,end-offset+1));
  if(!res.write(chunk))await new Promise(resolve=>res.once('drain',resolve));
 }res.end();}catch(_){if(!res.headersSent)res.statusCode=502;res.end();}
};
