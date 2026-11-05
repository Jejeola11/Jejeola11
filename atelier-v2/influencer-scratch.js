(()=>{
 'use strict';
 const root=document.getElementById('influencerScratch');
 if(!root)return;
 const catalog=window.FuseInfluencerCatalog||[];
 const colors={hairColor:['#090b0b','#36251c','#794a31','#b9662e','#b92c32','#d5b56e','#e6ddbd','#898989','#eee9dd','#dd9aba','#b3a1cc','#4282bd','#4d805e'],skinTone:['#f3e3d5','#eccbb6','#d9b398','#b29b6b','#bc8c63','#805033','#563620','#2f211c']};
 const symbols=['♀','♂','⚧','⚧','◌'];
 const key='fuse-influencer-scratch-v1';
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch{}
 const values={};let styleURL=null;
 function persist(){try{sessionStorage.setItem(key,JSON.stringify(values));}catch{}}
 for(const group of catalog){
  const field=document.createElement('fieldset');field.className='scratch-field';
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
  values[group.id]=group.options.includes(saved[group.id])?saved[group.id]:group.options[0];
  group.options.forEach((option,index)=>{
   const label=document.createElement('label');label.className='scratch-choice scratch-'+group.kind;
   const input=document.createElement('input');input.type='radio';input.name='influencer-'+group.id;input.value=option;input.checked=values[group.id]===option;
   const art=document.createElement('span');art.className='scratch-art';art.setAttribute('aria-hidden','true');
   if(group.kind==='color')art.style.backgroundColor=colors[group.id][index];
   else if(group.kind==='symbol')art.textContent=symbols[index];
   else if(group.kind==='image'){art.textContent='＋';art.dataset.asset=group.id+'-'+option.toLowerCase().replace(/[^a-z0-9]+/g,'-');}
   const caption=document.createElement('span');caption.className='scratch-caption';caption.textContent=option;
   input.addEventListener('change',()=>{if(input.checked){values[group.id]=option;persist();}});
   label.append(input);if(group.kind!=='text')label.append(art);label.append(caption);rail.append(label);
  });field.append(rail);root.append(field);
 }
 // A stable settings snapshot for the forthcoming generation integration.
 window.FuseInfluencerScratch={getSettings:()=>({...values})};
})();
