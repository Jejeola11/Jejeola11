(()=>{
 'use strict';
 const root=document.getElementById('influencerBuilder');
 if(!root)return;
 const agent=document.querySelector('.create-agent');
 const file=document.getElementById('influencerFaceFile');
 const preview=document.getElementById('influencerFacePreview');
 const remove=document.getElementById('influencerFaceRemove');
 const status=document.getElementById('influencerStatus');
 const settings=document.getElementById('influencerSettings');
 const settingsFields=document.getElementById('influencerSettingsFields');
 const advancedIds=['height','proportions','head','neck','eyes','eyeColor','features','facialHair','distinctive','accessories'];
 let settingsSnapshot=null,originalOverflow='';
 const movedFields=[];
 function closeSettings(apply=false){
  if(!settings.open)return;
  if(!apply&&settingsSnapshot)window.FuseInfluencerScratch.setSettings(settingsSnapshot);
  movedFields.splice(0).forEach(({field,anchor})=>{anchor.replaceWith(field);});
  document.body.style.overflow=originalOverflow;settings.close();
 }
 document.getElementById('influencerAdvancedOpen').addEventListener('click',()=>{
  if(settings.open||!window.FuseInfluencerScratch)return;
  settingsSnapshot=window.FuseInfluencerScratch.getSettings();
  advancedIds.forEach(id=>{const field=document.querySelector('.scratch-field[data-group="'+id+'"]');if(!field)return;const anchor=document.createComment('settings '+id);field.replaceWith(anchor);settingsFields.append(field);movedFields.push({field,anchor});});
  originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden';settings.showModal();
 });
 document.getElementById('influencerSettingsClose').addEventListener('click',()=>closeSettings());
 document.getElementById('influencerSettingsApply').addEventListener('click',()=>closeSettings(true));
 document.getElementById('influencerSettingsRandomize').addEventListener('click',()=>{
  const choices={};(window.FuseInfluencerCatalog||[]).filter(group=>advancedIds.includes(group.id)).forEach(group=>choices[group.id]=group.multiple?[group.options[Math.floor(Math.random()*group.options.length)]]:group.options[Math.floor(Math.random()*group.options.length)]);window.FuseInfluencerScratch.setSettings(choices);
 });
 settings.addEventListener('cancel',event=>{event.preventDefault();closeSettings();});
 settings.addEventListener('click',event=>{if(event.target!==settings)return;const rect=settings.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSettings();});
 let previewURL=null, faceFile=null;
 function clearFace(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;faceFile=null;preview.removeAttribute('src');preview.hidden=true;remove.hidden=true;file.value='';}
 function setOpen(open){root.hidden=!open;agent.hidden=open;if(open){document.querySelectorAll('[data-create-tool]').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.createTool==='Influencer')));document.getElementById('createToolStatus').textContent='';root.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('influencerTitle').focus({preventScroll:true});}}
 window.addEventListener('fuse-influencer-open',()=>setOpen(true));
 window.addEventListener('fuse-influencer-close',()=>setOpen(false));
 document.getElementById('influencerBack').addEventListener('click',()=>{setOpen(false);const card=document.querySelector('[data-create-tool="Influencer"]');card?.setAttribute('aria-pressed','false');card?.focus();});
 root.querySelectorAll('[data-influencer-mode]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-influencer-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));root.dataset.mode=button.dataset.influencerMode;document.getElementById('influencerScratch').hidden=button.dataset.influencerMode!=='scratch';document.querySelector('.influencer-face').hidden=button.dataset.influencerMode==='scratch';document.getElementById('influencerFaceLabel').textContent=button.dataset.influencerMode==='me'?'Add your face':'Add a reference face (optional)';status.textContent='';}));
 file.addEventListener('change',()=>{const image=file.files?.[0];if(!image)return;if(!['image/jpeg','image/png','image/webp'].includes(image.type)||image.size>20*1024*1024){file.value='';status.textContent='Choose a JPG, PNG or WebP image under 20 MB.';return;}clearFace();faceFile=image;previewURL=URL.createObjectURL(image);preview.src=previewURL;preview.hidden=false;remove.hidden=false;status.textContent='Face added. It will be uploaded only if you confirm generation.';});
 preview.addEventListener('error',()=>{clearFace();status.textContent='This image could not be opened. Please choose another.';});
 remove.addEventListener('click',()=>{clearFace();status.textContent='Face removed.';file.focus();});
 window.addEventListener('pagehide',()=>{if(previewURL)URL.revokeObjectURL(previewURL);});
 const generateButton=root.querySelector('.influencer-generate');
 const result=document.createElement('img');
 result.alt='Generated influencer portrait';
 result.style.cssText='display:block;width:min(100%,420px);margin:16px auto;border-radius:16px';
 result.hidden=true;
 result.style.display='none';
 status.after(result);

 function requestFor(mode) {
  const scratch=window.FuseInfluencerScratch;
  const values=scratch.getSettings();
  const traits=window.FuseInfluencerCatalog
   .filter(group=>mode==='scratch'||advancedIds.includes(group.id))
   .map(({id,label})=>[label,[values[id]].flat().filter(Boolean).join(', ')])
   .filter(([,value])=>value)
   .map(([label,value])=>label+': '+value);
  const instructions=mode==='me'
   ? 'Use the reference photo to preserve the adult subject’s recognizable identity while applying the requested traits.'
   : 'Create a new fictional adult identity. Use any attached image for styling only, without copying the subject’s identity.';
  const details=mode==='scratch'&&values.promptEnabled ? values.prompt.trim() : '';
  return {
   model:'gpt-image-2.5-sunburst',
   aspect:'3:4',resolution:'1k',quality:'medium',count:1,
   prompt:['Create one photorealistic editorial influencer portrait. Natural skin texture, realistic lighting, no text or watermarks.',instructions,...traits,details].filter(Boolean).join('\n')
  };
 }

 async function uploadReference(reference,session) {
  const client=await Fuse.client();
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[reference.type];
  const path=session.user.id+'/create-assets/'+crypto.randomUUID()+'.'+extension;
  const bucket=client.storage.from('avatars');
  const {error}=await bucket.upload(path,reference,{contentType:reference.type,upsert:false});
  if(error)throw Error('Could not upload the reference photo. '+error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
 }

 function pendingKey(session){return 'fuse-influencer-job:'+session.user.id;}
 async function showJob(id,session) {
  for(let attempt=0;attempt<100;attempt++){
   const response=await fetch('/api/job-status?id='+encodeURIComponent(id),{
    headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'
   });
   const job=await response.json();
   if(!response.ok)throw Error(job.error||'Could not check generation. Tap Check result to reconnect.');
   if(job.status==='failed'){
    sessionStorage.removeItem(pendingKey(session));
    generateButton.textContent='Generate ✦';
    throw Error(job.error||'Generation failed.');
   }
   if(job.status==='completed'&&/^https:\/\//.test(job.url||'')){
    result.src=job.url;
    result.hidden=false;
    result.style.display='block';
    sessionStorage.removeItem(pendingKey(session));
    generateButton.textContent='Generate ✦';
    status.textContent='Influencer generated. Your image is saved to your Library.';
    return;
   }
   await new Promise(resolve=>setTimeout(resolve,3000));
  }
  status.textContent='Still processing. Tap Check result to check again.';
 }

 generateButton.addEventListener('click',async()=>{
  generateButton.disabled=true;
  try{
   if(!await FuseExplore.requireAccount({reason:'Sign in to generate an influencer with your Fuse credits.'}))return;
   const session=await Fuse.session();
   if(!session?.access_token)throw Error('Please sign in again.');
   const pending=sessionStorage.getItem(pendingKey(session));
   if(pending){status.textContent='Checking your influencer…';await showJob(pending,session);return;}
   const mode=root.dataset.mode||'me';
   const reference=mode==='me'?faceFile:window.FuseInfluencerScratch.getStyleFile();
   if(mode==='me'&&!reference)throw Error('Add your face first, or select Build From Scratch.');
   const request=requestFor(mode);
   status.textContent='Checking credit cost…';
   const quote=await Fuse.api('generate',{...request,quote:true,reference_image_count:reference?1:0});
   if(!Number.isSafeInteger(quote.credits)||quote.credits<1)throw Error('Credit quote unavailable.');
   const referenceNotice=reference?' Your reference will be saved to Fuse uploads (accessible to anyone with its link) and sent to OpenAI. Only use a photo you have permission to use.':'';
   if(!window.confirm('Generate one influencer for '+quote.credits+' credits?'+referenceNotice)){
    status.textContent='Generation cancelled.';
    return;
   }
   status.textContent='Submitting your influencer…';
   const urls=reference?[await uploadReference(reference,session)]:[];
   const job=await Fuse.api('generate',{...request,accepted_credits:quote.credits,reference_image_urls:urls});
   if(!job.request_id)throw Error('No job reference was returned. Check your Library before retrying.');
   sessionStorage.setItem(pendingKey(session),job.request_id);
   generateButton.textContent='Check result';
   status.textContent='Generating your influencer…';
   await showJob(job.request_id,session);
  }catch(error){status.textContent=error.message||'Could not generate the influencer.';}
  finally{generateButton.disabled=false;}
 });
})();
