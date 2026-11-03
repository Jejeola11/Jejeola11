'use strict';
const VERSION='wavespeed-retail-2026-11-03';
function credits(usd){if(!Number.isFinite(usd)||usd<=0)throw Error('A verified WaveSpeed price is required.');return Math.max(1,Math.ceil(usd*1400*2/85-1e-12));}
// Published WaveSpeed standard USD tables, verified 2026-11-03.
// https://wavespeed.ai/docs/docs-api/openai/openai-gpt-image-2.5-sunburst-edit
const IMAGE25={low:[.01,.02,.03],medium:[.024,.04,.07],high:[.09,.15,.27],xhigh:[.16,.27,.48],max:[.36,.60,1]};
const IMAGE2={low:[.01,.02,.03],medium:[.06,.10,.18],high:[.22,.40,.72]};
const EDIT2={low:[.02,.03,.04],medium:[.07,.11,.19],high:[.23,.41,.73]};
function imageUsd(model,{quality='medium',resolution='1k',referenceCount=0,size,input_fidelity='high'}={}){
 const index=['1k','2k','4k'].indexOf(resolution);if(index<0)throw Error('Choose a supported WaveSpeed resolution.');
 if(!Number.isSafeInteger(referenceCount)||referenceCount<0||referenceCount>14)throw Error('Use at most 14 references.');
 let usd;if(model.includes('2.5')){usd=IMAGE25[quality]?.[index];if(referenceCount)usd+=referenceCount*.015;}
 else if(model==='gpt-image-2'){usd=(referenceCount?EDIT2:IMAGE2)[quality]?.[index];if(referenceCount)usd+=(referenceCount-1)*.012;}
 else if(model==='gpt-image-1.5'){const square=!size||size==='1024x1024';usd=({low:square?.01:.02,medium:square?.04:.06,high:square?.13:.19})[quality];if(referenceCount)usd+=.01*referenceCount+(input_fidelity==='high'?.05*referenceCount:0);}
 if(!Number.isFinite(usd)||usd<=0)throw Error('This model/settings combination needs a verified WaveSpeed price.');
 return usd;
}
function seedanceUsd(version,resolution,outputSeconds,referenceSeconds=0,mode='text-to-video'){
 const noRefs=version==='2.5'?{'480p':.18,'720p':.36,'1080p':.90,'4k':1.8}:{'480p':.12,'720p':.24,'1080p':.60,'4k':1.2};
 const withRefs=version==='2.5'?{'480p':.11,'720p':.22,'1080p':.55,'4k':1.1}:{'480p':.075,'720p':.15,'1080p':.375,'4k':.75};
 if(!noRefs[resolution]||!Number.isFinite(outputSeconds)||outputSeconds<=0||!Number.isFinite(referenceSeconds)||referenceSeconds<0)throw Error('A verified WaveSpeed video quote is required.');
 const combined=referenceSeconds>0||mode==='video-edit'||mode==='video-extend';return (combined?withRefs:noRefs)[resolution]*(outputSeconds+(combined?referenceSeconds:0));
}
module.exports={VERSION,credits,imageUsd,seedanceUsd};
