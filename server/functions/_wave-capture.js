const {AsyncLocalStorage}=require('node:async_hooks');
const store=new AsyncLocalStorage();
async function capture(fn){const requests=[];await store.run(requests,fn);if(requests.length!==1)throw Error('This action needs an exact single-provider quote');return requests[0]}
function record(model,inputs){const list=store.getStore();if(!list)return false;list.push({model,inputs});return true}
module.exports={capture,record,active:()=>!!store.getStore()};
