// Streams original uploaded files from fixed, public media parts; no arbitrary URLs.
const sources = require('../start/original-parts.json');
module.exports=async(req,res)=>{
 const id=String(req.query.id||'');const source=sources[id];
 if(!source||!['GET','HEAD'].includes(req.method)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',source.bytes);res.setHeader('Cache-Control','public,max-age=86400');
 if(req.method==='HEAD')return res.end();
 try{for(const url of source.parts){const r=await fetch(url);if(!r.ok)throw Error('Media unavailable');for await(const chunk of r.body){if(!res.write(Buffer.from(chunk)))await new Promise(resolve=>res.once('drain',resolve));}}res.end();}
 catch(_){if(!res.headersSent)res.statusCode=502;res.end();}
};
