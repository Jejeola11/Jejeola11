const fs=require('node:fs');fs.mkdirSync('public',{recursive:true});for(const name of ['app','atelier-v2','atelier-site'])fs.cpSync(name,'public/'+name,{recursive:true});
