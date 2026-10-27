(function(root){
const rates={presenter:{name:'AI Presenter Video',base:100,extra:50},story:{name:'Fashion & Lifestyle UGC',base:100,extra:50},commercial:{name:'Beauty & Product UGC',base:100,extra:50}};
function quote(s){
const r=rates[s.type];if(!r)throw Error('Invalid video type');
const keys=['quantity','seconds','scenes','characters','hooks','formats','twins','setups'];for(const k of keys)if(!Number.isInteger(s[k]))throw Error('Invalid '+k);
if(s.quantity<1||s.quantity>10||s.seconds<15||s.seconds>60||s.scenes<1||s.scenes>6||s.characters<1||s.characters>3||s.hooks<0||s.hooks>5||s.formats<1||s.formats>3||s.twins<0||s.twins>3||s.setups<0||s.setups>3)throw Error('Scope outside package');
const blocks=Math.max(0,Math.ceil((s.seconds-30)/15));const discount=s.quantity>=6?.15:s.quantity>=3?.10:0;
const lines=[['Original videos',s.quantity*r.base],['Batch saving',-s.quantity*r.base*discount],['Additional duration',s.quantity*blocks*r.extra],['Additional scenes',s.quantity*Math.max(0,s.scenes-3-blocks)*50],['Additional speaking characters',s.quantity*(s.characters-1)*100],['Alternate hooks',s.quantity*s.hooks*50],['Additional formats',s.quantity*(s.formats-1)*25],['Digital twin setup',s.twins*150],['Reusable character setup',s.setups*100]].filter(x=>x[1]);
return {name:r.name,lines,total:lines.reduce((a,x)=>a+x[1],0),includedScenes:3+blocks,discount};
}
root.RiaPricing={rates,quote};if(typeof module!=='undefined')module.exports=root.RiaPricing;
})(typeof window!=='undefined'?window:globalThis);
