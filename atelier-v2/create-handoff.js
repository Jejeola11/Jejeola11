(() => {
  'use strict';
  const key=sessionStorage.getItem('fuse_create_handoff');
  if(!key)return;
  const type=location.pathname.endsWith('video-create.html')?'video':'image';
  const open=()=>new Promise((resolve,reject)=>{const req=indexedDB.open('fuse-create-handoff',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
  (async()=>{
    let db;
    try{
      db=await open();
      const brief=await new Promise((resolve,reject)=>{const tx=db.transaction('briefs','readonly');const req=tx.objectStore('briefs').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
      if(!brief||brief.type!==type||Date.now()-brief.createdAt>600000)return;
      const prompt=document.getElementById('prompt');if(!prompt)return;
      prompt.value=brief.prompt||'';prompt.dispatchEvent(new Event('input',{bubbles:true}));
      const ratio=(type==='video'?document.getElementById('aspectList'):document.getElementById('aspectGrid'))?.querySelectorAll('[data-aspect]');
      const selected=[...(ratio||[])].find(el=>el.dataset.aspect===brief.aspect);
      if(selected)selected.click();
      if(brief.files?.length){
        const input=document.getElementById('fileInput');
        const transfer=new DataTransfer();
        brief.files.forEach(file=>transfer.items.add(file));
        input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      }
      sessionStorage.removeItem('fuse_create_handoff');
      const tx=db.transaction('briefs','readwrite');tx.objectStore('briefs').delete(key);
    }catch(error){console.warn('Create brief could not be restored',error)}
    finally{db?.close()}
  })();
})();