const crypto=require('crypto');
const {admin}=require('../server/functions/_supabase');
module.exports=async(req,res)=>{
 const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
 if(req.method!=='POST'||Date.now()>1793199181061||crypto.createHash('sha256').update(token).digest('hex')!=='ae08cabd7feff8a59b728fe3af6f20d80bc241b0856ac271f0e236ac09baacaa'){res.statusCode=404;return res.end();}
 try{
 const sb=admin(),bucket='public-start-projects';
 const {error}=await sb.storage.createBucket(bucket,{public:true,fileSizeLimit:5000000});
 if(error&&!/already|duplicate|exists/i.test(error.message))throw error;
 const sizes={11:123283895,12:33916618,13:89014453},targets=[];
 for(const [id,size] of Object.entries(sizes))for(let n=0;n<size;n+=4000000)targets.push({id:Number(id),offset:n,size:Math.min(4000000,size-n),path:`start-more/${id}-${n}.mp4`});
 const outputs=[];
 for(let i=0;i<targets.length;i+=8){const batch=await Promise.all(targets.slice(i,i+8).map(async target=>{const {data,error}=await sb.storage.from(bucket).createSignedUploadUrl(target.path,{upsert:true});if(error)throw error;return {...target,signedUrl:data.signedUrl,publicUrl:sb.storage.from(bucket).getPublicUrl(target.path).data.publicUrl};}));outputs.push(...batch);}
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({targets:outputs}));
 }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}
};
