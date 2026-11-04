const {test}=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const {verify,emails}=require('../api/auth-email');
const secret=Buffer.alloc(32,7).toString('base64');
test('signed requests authenticate and tampering/stale requests fail',()=>{
 const raw='{"test":true}',id='test-1',ts=String(Math.floor(Date.now()/1000));
 const sig=crypto.createHmac('sha256',Buffer.from(secret,'base64')).update(`${id}.${ts}.${raw}`).digest('base64');
 const h={'webhook-id':id,'webhook-timestamp':ts,'webhook-signature':'v1,'+sig};
 assert.equal(verify(raw,h,'v1,whsec_'+secret),true);assert.equal(verify(raw+' ',h,secret),false);assert.equal(verify(raw,{...h,'webhook-timestamp':'1'},secret),false);assert.equal(verify(raw,{},secret),false);
});
const payload={user:{email:'test@example.com',new_email:'new@example.com'},email_data:{email_action_type:'signup',token:'12345678',token_hash:'hash',redirect_to:'https://evil.example/signup'}};
test('signup sends only a verification code, with no confirmation link',()=>{const [m]=emails(payload);assert.match(m.text,/12345678/);assert.match(m.html,/12345678/);assert.doesNotMatch(m.text,/https?:\/\//);assert.doesNotMatch(m.html,/<a\b|href=/);});
test('recovery preserves checkout destination and reset mode',()=>{const [m]=emails({...payload,email_data:{...payload.email_data,email_action_type:'recovery',redirect_to:'https://fuseatelier.com/signup?next=%2Fcredits'}});const link=new URL(m.text.split('Continue securely: ')[1].split('\n')[0]);const dest=new URL(link.searchParams.get('redirect_to'));assert.equal(dest.searchParams.get('mode'),'reset');assert.equal(dest.searchParams.get('next'),'/credits');});
test('secure email change sends correct token/hash pairs to both addresses',()=>{const messages=emails({...payload,email_data:{...payload.email_data,email_action_type:'email_change',token_new:'87654321',token_hash_new:'oldhash'}});assert.deepEqual(messages.map(m=>m.to[0]),['test@example.com','new@example.com']);assert.match(messages[0].text,/token=oldhash/);assert.match(messages[1].text,/token=hash/);});
test('unsupported or malformed payload fails closed',()=>{assert.throws(()=>emails({}));assert.throws(()=>emails({...payload,user:{email:'bad'}}));});
test('provider rejection is not reported as success; unsigned requests never send',async()=>{
 const handler=require('../api/auth-email');const {Readable}=require('node:stream');
 const saved={...process.env};const original=global.fetch;let sends=0;
 process.env.SEND_EMAIL_HOOK_SECRET=secret;process.env.RESEND_API_KEY='test';process.env.FUSE_EMAIL_FROM='Fuse <no-reply@example.com>';
 global.fetch=async()=>{sends++;return {ok:false};};
 const raw=JSON.stringify(payload),id='request-1',ts=String(Math.floor(Date.now()/1000));
 const sig=crypto.createHmac('sha256',Buffer.from(secret,'base64')).update(`${id}.${ts}.${raw}`).digest('base64');
 async function run(headers){const req=Readable.from([raw]);req.method='POST';req.headers=headers;const res={setHeader(){},end(body){this.body=body;}};await handler(req,res);return res;}
 try{assert.equal((await run({})).statusCode,401);assert.equal(sends,0);assert.equal((await run({'webhook-id':id,'webhook-timestamp':ts,'webhook-signature':'v1,'+sig})).statusCode,502);assert.equal(sends,1);}finally{global.fetch=original;for(const key of ['SEND_EMAIL_HOOK_SECRET','RESEND_API_KEY','FUSE_EMAIL_FROM']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
