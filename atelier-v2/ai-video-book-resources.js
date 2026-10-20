(async()=>{
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x};
  function card(tag,title,fields){const article=el('article','card');article.append(el('span','tag',tag),el('h3','',title));for(const [label,value] of fields){const p=el('p');const strong=el('strong','',label+' ');p.append(strong,document.createTextNode(value));article.append(p)}return article}
  try{
    const data=await Fuse.api('ai-video-book-resources',{});
    $('status').hidden=true;$('resourceContent').hidden=false;$('disclosure').textContent=data.disclosure;
    const draw=()=>{const level=$('level').value,q=$('search').value.trim().toLowerCase();const matching=data.briefs.filter(b=>(level==='All'||b.level===level)&&(!q||[b.category,b.client,b.goal,b.assignment].join(' ').toLowerCase().includes(q)));$('briefCount').textContent=matching.length+' of '+data.briefs.length+' briefs';$('briefList').replaceChildren(...matching.map(b=>card('BRIEF '+String(b.id).padStart(2,'0')+' · '+b.level+' · '+b.category,b.goal,[['Buyer:',b.client],['Your assignment:',b.assignment],['Deliver:',b.deliverables],['Keep accurate:',b.must_keep],['Review:',b.self_review]])))};
    $('level').onchange=draw;$('search').oninput=draw;draw();
    $('planList').replaceChildren(...data.plan.map(p=>card('DAYS '+p.days,p.focus,[['Your move:',p.action]])));
    $('pitchList').replaceChildren(...data.pitches.map(p=>card('MESSAGE TEMPLATE',p.name,[['Customize:',p.message]])));
    $('sampleList').replaceChildren(...data.sample_method.map(step=>el('li','',step)));
    document.querySelectorAll('nav button').forEach(button=>button.onclick=()=>{document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('selected',b===button));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==button.dataset.tab)});
  }catch(e){$('status').textContent=e.message||'Could not open the resources.'}
})();
