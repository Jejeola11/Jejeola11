(()=>{'use strict';let config={currency:'NGN',rate:1},observer;const originals=new WeakMap();
function format(n){const base='₦'+Number(n).toLocaleString('en-NG');if(config.currency==='NGN')return base;return '≈ '+new Intl.NumberFormat(undefined,{style:'currency',currency:config.currency,maximumFractionDigits:2}).format(n*config.rate)+' ('+base+')'}
function scan(){observer?.disconnect();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.parentElement?.closest('script,style,textarea,input,[data-no-localize],#currency-note'))continue;let old=originals.get(node);if(old&&node.nodeValue!==old.rendered)old=null;const source=old?old.source:node.nodeValue;if(!/₦[\d,]+/.test(source))continue;const rendered=source.replace(/₦([\d,]+(?:\.\d+)?)/g,(_,v)=>format(Number(v.replaceAll(',',''))));node.nodeValue=rendered;originals.set(node,{source,rendered})}observer?.observe(document.body,{childList:true,subtree:true,characterData:true})}
window.FuseMoney={format};
fetch('/api/global-pricing',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{config=d;document.getElementById('currency-note')?.remove();observer=new MutationObserver(()=>scan());scan()}).catch(()=>{});
const banner=document.getElementById('academyOfferBanner');if(banner)banner.hidden=true;
})();
