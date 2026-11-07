'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sweepToBank}=require('../server/functions/_payout');

test('Paystack transfer sweep is disabled unless explicitly enabled',async()=>{
 const oldFlag=process.env.PAYSTACK_AUTO_SWEEP;
 const oldKey=process.env.PAYSTACK_SECRET_KEY;
 const originalFetch=global.fetch;
 try{
  delete process.env.PAYSTACK_AUTO_SWEEP;
  process.env.PAYSTACK_SECRET_KEY='test-key-never-used';
  let called=false;
  global.fetch=async()=>{called=true;throw Error('Unexpected external transfer');};
  await sweepToBank({from(){throw Error('Unexpected recipient lookup');}},9900,'test-payment');
  assert.equal(called,false);
  process.env.PAYSTACK_AUTO_SWEEP='false';
  await sweepToBank({from(){throw Error('Unexpected recipient lookup');}},9900,'test-payment-2');
  assert.equal(called,false);
 }finally{
  if(oldFlag===undefined)delete process.env.PAYSTACK_AUTO_SWEEP;else process.env.PAYSTACK_AUTO_SWEEP=oldFlag;
  if(oldKey===undefined)delete process.env.PAYSTACK_SECRET_KEY;else process.env.PAYSTACK_SECRET_KEY=oldKey;
  global.fetch=originalFetch;
 }
});
