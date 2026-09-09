const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fuse-recovery-'));
try {
 execFileSync('git',['init',tmp]);
 execFileSync('git',['-C',tmp,'fetch','--depth','1','https://github.com/Jejeola11/Jejeola11.git','fix/fuse-app-navigation'],{stdio:'inherit'});
 execFileSync('git',['-C',tmp,'checkout','FETCH_HEAD'],{stdio:'inherit'});
 for(const name of ['app','atelier-v2','atelier-site','api','server','package.json','package-lock.json']) fs.cpSync(path.join(tmp,name),name,{recursive:true});
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
