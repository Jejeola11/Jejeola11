(async function(){
  const root=document.getElementById('packs');
  try{
    const response=await fetch('/api/credit-pricing');if(!response.ok)throw Error('Could not load credit packs');
    const data=await response.json();if(!Array.isArray(data.packs))throw Error('Invalid credit packs');
    for(const p of data.packs){
      const card=document.createElement('article');card.className='pack '+p.id.replace('credits-v2-','');
      const inner=document.createElement('span');inner.className='pack-inner';
      const head=document.createElement('span');head.className='pack-head';
      const name=document.createElement('strong');name.className='name';name.textContent=p.label;
      const price=document.createElement('span');price.className='price';const amount=document.createElement('strong');amount.textContent='₦'+Number(p.amount_naira).toLocaleString('en-NG');price.append(amount);head.append(name,price);
      const credits=document.createElement('strong');credits.className='credits';credits.textContent=p.credits+' credits';
      const uses=document.createElement('ul');uses.className='uses';
      for(const item of [p.note,'One-time credit top-up','Manually added after payment verification']){const li=document.createElement('li');li.textContent=item;uses.append(li)}
      const button=document.createElement('a');button.className='pack-action';button.textContent='Get '+p.label;
      let safe;try{const u=new URL(p.checkout);if(data.enabled&&u.protocol==='https:'&&u.hostname==='nestuge.com')safe=u.href}catch{}
      if(safe){button.href=safe;button.target='_blank';button.rel='noopener'}else{button.removeAttribute('href');button.setAttribute('aria-disabled','true');button.textContent='Checkout unavailable'}
      inner.append(head,credits,uses,button);card.append(inner);root.append(card);
    }
  }catch{root.textContent='Credit packs could not load. Please refresh this page.'}
})();
