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
 let previewURL=null;
 function clearFace(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;preview.removeAttribute('src');preview.hidden=true;remove.hidden=true;file.value='';}
 function setOpen(open){root.hidden=!open;agent.hidden=open;if(open){document.querySelectorAll('[data-create-tool]').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.createTool==='Influencer')));document.getElementById('createToolStatus').textContent='';root.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('influencerTitle').focus({preventScroll:true});}}
 window.addEventListener('fuse-influencer-open',()=>setOpen(true));
 window.addEventListener('fuse-influencer-close',()=>setOpen(false));
 document.getElementById('influencerBack').addEventListener('click',()=>{setOpen(false);const card=document.querySelector('[data-create-tool="Influencer"]');card?.setAttribute('aria-pressed','false');card?.focus();});
 root.querySelectorAll('[data-influencer-mode]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-influencer-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));root.dataset.mode=button.dataset.influencerMode;document.getElementById('influencerScratch').hidden=button.dataset.influencerMode!=='scratch';document.querySelector('.influencer-face').hidden=button.dataset.influencerMode==='scratch';document.getElementById('influencerFaceLabel').textContent=button.dataset.influencerMode==='me'?'Add your face':'Add a reference face (optional)';status.textContent='';}));
 file.addEventListener('change',()=>{const image=file.files?.[0];if(!image)return;if(!['image/jpeg','image/png','image/webp'].includes(image.type)||image.size>20*1024*1024){file.value='';status.textContent='Choose a JPG, PNG or WebP image under 20 MB.';return;}clearFace();previewURL=URL.createObjectURL(image);preview.src=previewURL;preview.hidden=false;remove.hidden=false;status.textContent='Face added. This preview stays on your device.';});
 preview.addEventListener('error',()=>{clearFace();status.textContent='This image could not be opened. Please choose another.';});
 remove.addEventListener('click',()=>{clearFace();status.textContent='Face removed.';file.focus();});
 window.addEventListener('pagehide',()=>{if(previewURL)URL.revokeObjectURL(previewURL);});
})();

