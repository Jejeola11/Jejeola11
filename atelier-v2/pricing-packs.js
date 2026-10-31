(async function(){
  const root=document.getElementById('packs');
  try{
    const response=await fetch('/api/credit-pricing');if(!response.ok)throw Error('Could not load credit packs');
    const data=await response.json();if(!Array.isArray(data.packs))throw Error('Invalid credit packs');
    let eligible=false,expiry=null,email='';
    try{const offer=await Fuse.api('fuse-earn');expiry=offer.discountExpiresAt;eligible=Boolean(expiry&&new Date(expiry)>new Date());if(eligible){email=(await Fuse.session()).user.email||'';const note=document.getElementById('referralOffer');note.hidden=false;note.innerHTML='<strong>Your referral offer is active:</strong> 25% off your first credit pack until '+new Date(expiry).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})+'. Request the discounted checkout below; our team confirms payment and adds credits manually.'}}catch{}
    for(const p of data.packs){
      const card=document.createElement('article');card.className='pack '+p.id.replace('credits-v2-','');
      const inner=document.createElement('span');inner.className='pack-inner';
      const head=document.createElement('span');head.className='pack-head';
      const name=document.createElement('strong');name.className='name';name.textContent=p.label;
      const price=document.createElement('span');price.className='price';const amount=document.createElement('strong');const discount=eligible?Math.round(Number(p.amount_naira)*.75):0;amount.textContent='₦'+Number(discount||p.amount_naira).toLocaleString('en-NG');if(eligible){const original=document.createElement('del');original.textContent='₦'+Number(p.amount_naira).toLocaleString('en-NG');price.append(original)}price.append(amount);head.append(name,price);
      const credits=document.createElement('strong');credits.className='credits';credits.textContent=p.credits+' credits';
      const uses=document.createElement('ul');uses.className='uses';
      for(const item of [p.note,'One-time credit top-up','Manually added after payment verification']){const li=document.createElement('li');li.textContent=item;uses.append(li)}
      const button=document.createElement('a');button.className='pack-action';button.textContent='Get '+p.label;
      let safe;try{const u=new URL(p.checkout);if(data.enabled&&u.protocol==='https:'&&u.hostname==='nestuge.com')safe=u.href}catch{}
      if(eligible){const subject='Fuse referral credit discount — '+p.label;const message='I joined Fuse Atelier through a referral link and would like my first credit pack at 25% off.\\nAccount: '+email+'\\nPack: '+p.label+' ('+p.credits+' credits)\\nDiscounted price: ₦'+discount.toLocaleString('en-NG')+'\\nOffer expires: '+expiry;button.href='mailto:maryamjejeola002@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message);button.textContent='Claim 25% off';button.setAttribute('aria-label','Request discounted '+p.label+' pack')}
      else if(safe){button.href=safe;button.target='_blank';button.rel='noopener'}else{button.removeAttribute('href');button.setAttribute('aria-disabled','true');button.textContent='Checkout unavailable'}
      inner.append(head,credits,uses,button);card.append(inner);root.append(card);
    }
  }catch{root.textContent='Credit packs could not load. Please refresh this page.'}
})();
