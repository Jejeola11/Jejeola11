const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
test('name is read-only, bank comes first, stale lookup cannot enable saving',async()=>{
 const {Window}=await import('happy-dom');const w=new Window();w.document.write(fs.readFileSync('atelier-v2/profile.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,''));const form=w.document.getElementById('payoutForm');
 assert.deepEqual([...form.querySelectorAll('input,select')].map(x=>x.name),['bank_code','account_number','account_name']);assert.equal(form.elements.account_name.readOnly,true);
 let finish;w.Fuse={api:async(path,body)=>body.action==='banks'?{banks:[{code:'058',name:'Test Bank'}]}:new Promise(r=>{finish=r})};
 w.document.getElementById('setPayout').onclick=()=>{form.hidden=!form.hidden};w.eval(fs.readFileSync('atelier-v2/payout-form.js','utf8'));
 w.document.getElementById('setPayout').click();await new Promise(r=>setTimeout(r,10));form.elements.account_number.value='0123456789';form.elements.bank_code.value='058';form.elements.bank_code.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,10));
 form.elements.account_number.value='1123456789';form.elements.account_number.dispatchEvent(new w.Event('input'));finish({account_name:'OLD NAME'});await new Promise(r=>setTimeout(r,10));
 assert.equal(form.elements.account_name.value,'');assert.equal(w.document.getElementById('savePayout').disabled,true);await w.happyDOM.abort();
});
