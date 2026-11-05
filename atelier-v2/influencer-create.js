(()=>{
 'use strict';
 const root=document.getElementById('influencerBuilder');
 if(!root)return;
 const agent=document.querySelector('.create-agent');
 const file=document.getElementById('influencerFaceFile');
 const preview=document.getElementById('influencerFacePreview');
 const remove=document.getElementById('influencerFaceRemove');
 const faceUpload=root.querySelector('.influencer-upload');
 const status=document.getElementById('influencerStatus');
 const settings=document.getElementById('influencerSettings');
 const settingsFields=document.getElementById('influencerSettingsFields');
 const advancedIds=window.FuseInfluencerCatalog.map(group=>group.id);
 let settingsSnapshot=null,originalOverflow='';
 const movedFields=[];
 function closeSettings(apply=false){
  if(!settings.open)return;
  if(!apply&&settingsSnapshot)window.FuseInfluencerScratch.setSettings(settingsSnapshot);
  movedFields.splice(0).forEach(({field,anchor})=>{anchor.replaceWith(field);});
  document.body.style.overflow=originalOverflow;settings.close();
 }
 document.getElementById('influencerAdvancedOpen').addEventListener('click',()=>{
  if(root.dataset.mode!=='me'||settings.open||!window.FuseInfluencerScratch)return;
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
 function clearFace(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;faceFile=null;preview.removeAttribute('src');preview.hidden=true;remove.hidden=true;faceUpload.hidden=false;file.value='';}
 const originalParent=root.parentElement,originalNext=root.nextElementSibling;
 function setOpen(open){if(root.parentElement!==originalParent)originalParent.insertBefore(root,originalNext);root.hidden=!open;agent.hidden=open;document.body.classList.remove('influencer-chat');if(open){document.querySelectorAll('[data-create-tool]').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.createTool==='Influencer')));document.getElementById('createToolStatus').textContent='';root.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('influencerTitle').focus({preventScroll:true});}}
 function enterChat(){agent.hidden=false;root.hidden=false;document.body.classList.add('influencer-chat');document.getElementById('generationChat').after(root);root.scrollIntoView({behavior:'smooth',block:'start'});}
 function leaveChat(){document.body.classList.remove('influencer-chat');root.hidden=true;originalParent.insertBefore(root,originalNext);agent.hidden=false;}
 window.addEventListener('fuse-influencer-chat-enter',enterChat);
 window.addEventListener('fuse-influencer-credits-low',()=>showLowCredits(0));
 window.addEventListener('fuse-create-chat-change',event=>{if(event.detail?.influencer){const mode=event.detail.mode;if(mode==='me'||mode==='scratch'){root.dataset.mode=mode;root.querySelectorAll('[data-influencer-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.influencerMode===mode)));document.getElementById('influencerScratch').hidden=mode!=='scratch';document.querySelector('.influencer-face').hidden=mode==='scratch';}enterChat();}else if(document.body.classList.contains('influencer-chat'))leaveChat();});
 window.addEventListener('fuse-influencer-open',()=>setOpen(true));
 window.addEventListener('fuse-influencer-close',()=>setOpen(false));
 document.getElementById('influencerBack').addEventListener('click',()=>{const inChat=document.body.classList.contains('influencer-chat');setOpen(false);if(inChat)window.dispatchEvent(new Event('fuse-influencer-back'));const card=document.querySelector('[data-create-tool="Influencer"]');card?.setAttribute('aria-pressed','false');card?.focus();});
 root.querySelectorAll('[data-influencer-mode]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-influencer-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));root.dataset.mode=button.dataset.influencerMode;document.getElementById('influencerScratch').hidden=button.dataset.influencerMode!=='scratch';document.querySelector('.influencer-face').hidden=button.dataset.influencerMode==='scratch';document.getElementById('influencerFaceLabel').textContent=button.dataset.influencerMode==='me'?'Add your face':'Add a reference face (optional)';status.textContent='';}));
 file.addEventListener('change',()=>{const image=file.files?.[0];if(!image)return;if(!['image/jpeg','image/png','image/webp'].includes(image.type)||image.size>20*1024*1024){file.value='';status.textContent='Choose a JPG, PNG or WebP image under 20 MB.';return;}clearFace();faceFile=image;previewURL=URL.createObjectURL(image);preview.src=previewURL;preview.hidden=false;remove.hidden=false;faceUpload.hidden=true;status.textContent='Face added. It will be used as a reference when you generate.';});
 preview.addEventListener('error',()=>{clearFace();status.textContent='This image could not be opened. Please choose another.';});
 remove.addEventListener('click',()=>{clearFace();status.textContent='Face removed.';file.focus();});
 window.addEventListener('pagehide',()=>{if(previewURL)URL.revokeObjectURL(previewURL);});
 const generateButton=root.querySelector('.influencer-generate');
 generateButton.textContent='Generate ✦ 8';
 generateButton.setAttribute('aria-label','Generate influencer sheet for 8 credits');
 const lowNotice=document.createElement('aside');lowNotice.className='influencer-credit-notice';lowNotice.hidden=true;
 lowNotice.innerHTML='<span aria-hidden="true">◆</span><strong>Credits are running low</strong><a href="/credits">Top Up</a>';
 generateButton.after(lowNotice);
 function showLowCredits(balance){lowNotice.hidden=false;lowNotice.title=Number.isFinite(balance)?balance+' credits available · 8 needed':'';status.textContent='You need 8 credits to generate an influencer.';}

 function requestFor(mode) {
  const scratch=window.FuseInfluencerScratch;
  const values=scratch.getSettings();
  const traits=window.FuseInfluencerCatalog
   .map(({id,label})=>[label,[values[id]].flat().filter(Boolean).join(', ')])
   .filter(([,value])=>value)
   .map(([label,value])=>label+': '+value);
  const instructions=mode==='me'
   ? 'The first reference is the uploaded face: preserve its recognizable adult identity. The remaining labeled contact sheets contain selected visual traits. Apply the labeled traits to that face without copying the different people shown on the trait cards.'
   : 'Create a new fictional adult identity. If a style photo was uploaded it is the first reference. The labeled contact sheets contain the selected visual traits: use their appearance as guidance without copying any individual identity from the cards.';
  const details=mode==='scratch'&&values.promptEnabled ? values.prompt.trim() : '';
  return {
   model:'gpt-image-2.5-sunburst',product:'influencer-sheet',
   aspect:'16:9',resolution:'2k',quality:'high',count:1,output_format:'jpeg',background:'opaque',
   prompt:['Generate exactly ONE photorealistic 16:9 horizontal character reference sheet on a completely pure white (#FFFFFF) seamless background. Two views of the SAME adult person, side by side with generous white space: LEFT a large close-up face and upper torso facing front, RIGHT a smaller complete full-body figure facing front, head to shoes fully visible. Match facial identity, skin, hairstyle, clothing and accessories precisely across both views. Real natural skin pores, realistic anatomy and studio lighting. No extra people, no panels, borders, typography, logos or watermarks. Use the attached labeled setting image sheets as visual references for the traits; the text below identifies each chosen card.',instructions,...traits,details].filter(Boolean).join('\n')
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

 function selectedArtwork(){
  const values=window.FuseInfluencerScratch.getSettings();
  return window.FuseInfluencerCatalog.filter(group=>group.kind==='image').flatMap(group=>
   [values[group.id]].flat().filter(option=>option&&option!=='None').map(option=>({
    label:group.label+': '+option,
    src:'/atelier-v2/assets/influencer/'+group.id+'-'+option.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.webp'
   })));
 }
 function loadArtwork(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('A selected setting image could not load. Refresh and try again.'));image.src=src;});}
 async function artworkSheets(cards){
  const sheets=[];
  for(let offset=0;offset<cards.length;offset+=9){
   const page=cards.slice(offset,offset+9),images=await Promise.all(page.map(card=>loadArtwork(card.src)));
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1120;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser could not prepare the selected setting images.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle='#182e30';ctx.font='bold 22px sans-serif';ctx.fillText('Selected influencer traits · page '+(sheets.length+1),18,32);
   page.forEach((card,i)=>{
    const x=16+(i%3)*396,y=48+Math.floor(i/3)*354,image=images[i];
    const scale=Math.max(360/image.width,290/image.height),w=image.width*scale,h=image.height*scale;
    ctx.save();ctx.beginPath();ctx.rect(x,y,360,290);ctx.clip();ctx.drawImage(image,x+(360-w)/2,y+(290-h)/2,w,h);ctx.restore();
    ctx.fillStyle='#fff';ctx.fillRect(x,y+290,360,51);ctx.fillStyle='#102426';ctx.font='bold 19px sans-serif';
    ctx.fillText(card.label,x+9,y+322,342);
   });
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
   if(!blob)throw Error('Could not prepare the selected settings.');
   sheets.push(blob);
  }
  return sheets;
 }

 generateButton.addEventListener('click',async()=>{
  generateButton.disabled=true;
  try{
   if(!await FuseExplore.requireAccount({reason:'Sign in to generate an influencer with your Fuse credits.'}))return;
   const session=await Fuse.session();
   if(!session?.access_token)throw Error('Please sign in again.');
   lowNotice.hidden=true;
   const balance=Number(await Fuse.balance());
   if(Number.isFinite(balance)&&balance<8){showLowCredits(balance);return;}
   const mode=root.dataset.mode||'me';
   const reference=mode==='me'?faceFile:window.FuseInfluencerScratch.getStyleFile();
   if(mode==='me'&&!reference)throw Error('Add your face first, or select Build From Scratch.');
   const request=requestFor(mode);
   const values=window.FuseInfluencerScratch.getSettings();
   const selections=window.FuseInfluencerCatalog.map(({id,label})=>({label,value:[values[id]].flat().filter(Boolean).join(', ')})).filter(item=>item.value);
   const customPrompt=mode==='scratch'&&values.promptEnabled?values.prompt.trim():'';
   const selectedCards=selectedArtwork();
   status.textContent='Checking credit cost…';
   const sheets=await artworkSheets(selectedCards),referenceCount=sheets.length+(reference?1:0);
   if(referenceCount>14)throw Error('Too many setting images were selected. Choose fewer features.');
   const quote=await Fuse.api('generate',{...request,quote:true,reference_image_count:referenceCount});
   if(quote.credits!==8)throw Error('The influencer credit price changed. Please refresh before generating.');
   status.textContent='Uploading your selected image references…';
   const urls=[];
   if(reference)urls.push(await uploadReference(reference,session));
   for(const sheet of sheets)urls.push(await uploadReference(sheet,session));
   status.textContent='Starting your influencer…';
   window.dispatchEvent(new CustomEvent('fuse-influencer-generate',{detail:{request,credits:8,referenceUrls:urls,mode,selections,customPrompt}}));
  }catch(error){if(error.code==='NO_CREDITS'||error.status===402)showLowCredits(0);else status.textContent=error.message||'Could not generate the influencer.';}
  finally{generateButton.disabled=false;}
 });
})();
