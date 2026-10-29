(()=>{
  const body=document.body,open=document.getElementById('openModules'),close=document.getElementById('closeModules'),backdrop=document.getElementById('drawerBackdrop'),drawer=document.getElementById('moduleDrawer');
  let previousFocus=null;
  function toggle(show){body.classList.toggle('drawer-open',show);drawer.setAttribute('aria-hidden',String(!show));open.setAttribute('aria-expanded',String(show));if(show){previousFocus=document.activeElement;close.focus()}else if(previousFocus?.focus)previousFocus.focus()}
  open.addEventListener('click',()=>toggle(true));close.addEventListener('click',()=>toggle(false));backdrop.addEventListener('click',()=>toggle(false));drawer.querySelector('a').addEventListener('click',()=>toggle(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('drawer-open'))toggle(false)});
  document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const content=document.getElementById(button.dataset.copy)?.textContent||'';try{await navigator.clipboard.writeText(content);button.textContent='Copied!';setTimeout(()=>button.textContent='Copy prompt',1800)}catch{button.textContent='Select the prompt to copy';setTimeout(()=>button.textContent='Copy prompt',2500)}}));
})();
