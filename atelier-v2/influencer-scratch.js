(()=>{
 'use strict';
 const root=document.getElementById('influencerScratch');
 if(!root)return;
 const catalog=window.FuseInfluencerCatalog||[];
 const colors={hairColor:['#090b0b','#36251c','#794a31','#b9662e','#b92c32','#d5b56e','#e6ddbd','#898989','#eee9dd','#dd9aba','#b3a1cc','#4282bd','#4d805e'],eyeColor:['#181514','#68462e','#847345','#628052','#4e829d','#a6cbd5','#bd8e3c','#939b9d'],skinTone:['#f3e3d5','#eccbb6','#d9b398','#b29b6b','#bc8c63','#805033','#563620','#2f211c']};
 const symbols=['♀','♂','⚧','⚧','◌'];
 const key='fuse-influencer-scratch-v1';
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch{}
 const values={promptEnabled:saved.promptEnabled===true,prompt:typeof saved.prompt==='string'?saved.prompt.slice(0,2000):''},controls={};let styleURL=null;
 function persist(){try{sessionStorage.setItem(key,JSON.stringify(values));}catch{}}
 for(const group of catalog){
  const field=document.createElement('fieldset');field.className='scratch-field';field.dataset.group=group.id;
  const legend=document.createElement('legend');legend.textContent=group.label;field.append(legend);
  const rail=document.createElement('div');rail.className='scratch-rail';
  if(group.id==='style'){
   const upload=document.createElement('label');upload.className='scratch-style-upload';upload.textContent='＋ Add style reference';
   const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Upload style reference');
   const preview=document.createElement('img');preview.hidden=true;preview.alt='Selected style reference';
   const remove=document.createElement('button');remove.type='button';remove.textContent='Remove reference';remove.hidden=true;remove.className='scratch-reference-remove';
   function clear(){if(styleURL)URL.revokeObjectURL(styleURL);styleURL=null;preview.removeAttribute('src');preview.hidden=true;remove.hidden=true;input.value='';}
   input.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){input.value='';document.getElementById('influencerStatus').textContent='Choose a JPG, PNG or WebP style reference under 20 MB.';return;}clear();styleURL=URL.createObjectURL(file);preview.src=styleURL;preview.hidden=false;remove.hidden=false;});
   preview.addEventListener('error',clear);remove.addEventListener('click',clear);window.addEventListener('pagehide',clear);
   upload.append(input,preview);rail.append(upload,remove);
  }
  values[group.id]=group.multiple?(Array.isArray(saved[group.id])?[...new Set(saved[group.id].filter(v=>group.options.includes(v)&&v!=='None'))]:[]):(group.options.includes(saved[group.id])?saved[group.id]:group.options[0]);controls[group.id]=[];
  group.options.forEach((option,index)=>{
   const label=document.createElement('label');label.className='scratch-choice scratch-'+group.kind;
   const input=document.createElement('input');input.type=group.multiple?'checkbox':'radio';input.name='influencer-'+group.id;input.value=option;input.checked=group.multiple?(option==='None'?values[group.id].length===0:values[group.id].includes(option)):values[group.id]===option;controls[group.id].push(input);
   const art=document.createElement('span');art.className='scratch-art';art.setAttribute('aria-hidden','true');
   if(group.kind==='color')art.style.backgroundColor=colors[group.id][index];
   else if(group.kind==='symbol')art.textContent=symbols[index];
   else if(group.kind==='image'&&option==='None'){art.textContent='—';}
   else if(group.kind==='image'){
    const asset=group.id+'-'+option.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    art.dataset.asset=asset;
    const image=document.createElement('img');image.src='/atelier-v2/assets/influencer/'+asset+'.webp';
    image.alt='';image.loading='lazy';image.decoding='async';image.width=480;image.height=480;
    art.append(image);
   }
   const caption=document.createElement('span');caption.className='scratch-caption';caption.textContent=option;
   input.addEventListener('change',()=>{
    if(group.multiple){const selected=new Set(values[group.id]);if(option==='None'){selected.clear();}else if(input.checked)selected.add(option);else selected.delete(option);values[group.id]=[...selected];controls[group.id].forEach(control=>control.checked=control.value==='None'?selected.size===0:selected.has(control.value));persist();}
    else if(input.checked){values[group.id]=option;persist();}
   });
   label.append(input);if(group.kind!=='text')label.append(art);label.append(caption);rail.append(label);
  });field.append(rail);root.append(field);
 }
 const promptBox=document.createElement('section');promptBox.className='scratch-prompt';
 const promptLabel=document.createElement('label');promptLabel.className='scratch-prompt-toggle';promptLabel.textContent='Prompt';
 const promptToggle=document.createElement('input');promptToggle.type='checkbox';promptToggle.id='influencerPromptEnabled';promptToggle.checked=values.promptEnabled;promptToggle.setAttribute('role','switch');promptToggle.setAttribute('aria-controls','influencerPrompt');promptToggle.setAttribute('aria-expanded',String(values.promptEnabled));
 const promptInput=document.createElement('textarea');promptInput.id='influencerPrompt';promptInput.maxLength=2000;promptInput.rows=5;promptInput.placeholder="Describe your influencer's appearance, style, and details…";promptInput.setAttribute('aria-label','Describe your influencer');promptInput.value=values.prompt;promptInput.hidden=!values.promptEnabled;promptInput.disabled=!values.promptEnabled;
 function syncPrompt(){promptToggle.checked=values.promptEnabled;promptToggle.setAttribute('aria-expanded',String(values.promptEnabled));promptInput.hidden=!values.promptEnabled;promptInput.disabled=!values.promptEnabled;promptInput.value=values.prompt;}
 promptToggle.addEventListener('change',()=>{values.promptEnabled=promptToggle.checked;syncPrompt();persist();});
 promptInput.addEventListener('input',()=>{values.prompt=promptInput.value.slice(0,2000);persist();});
 promptLabel.append(promptToggle);promptBox.append(promptLabel,promptInput);root.append(promptBox);
 window.FuseInfluencerScratch={getSettings:()=>Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Array.isArray(v)?[...v]:v])),setSettings(settings){
  for(const group of catalog){
   if(group.multiple&&Array.isArray(settings[group.id])){values[group.id]=[...new Set(settings[group.id].filter(v=>group.options.includes(v)&&v!=='None'))];controls[group.id].forEach(input=>input.checked=input.value==='None'?values[group.id].length===0:values[group.id].includes(input.value));}
   else if(!group.multiple&&group.options.includes(settings[group.id])){values[group.id]=settings[group.id];controls[group.id].forEach(input=>input.checked=input.value===values[group.id]);}
  }
  if(typeof settings.promptEnabled==='boolean')values.promptEnabled=settings.promptEnabled;
  if(typeof settings.prompt==='string')values.prompt=settings.prompt.slice(0,2000);
  syncPrompt();persist();
 }};
})();
