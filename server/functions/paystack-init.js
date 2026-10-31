const {getUser,admin,json}=require('./_supabase');
const {COMMERCE,CREDIT_KEYS}=require('./_commerce');
async function referralPrice(db,userId,item,key){
 if(!CREDIT_KEYS.includes(key))return {amount:item.amount_naira,discount:false};
 const [profile,ref,prior]=await Promise.all([
  db.from('profiles').select('created_at').eq('id',userId).single(),
  db.from('fuse_referrals').select('referrer_user_id').eq('referred_user_id',userId).maybeSingle(),
  db.from('payments').select('id').eq('user_id',userId).eq('status','success').in('pack',CREDIT_KEYS).limit(1)
 ]);
 const joined=new Date(profile.data?.created_at||0).getTime();
 const eligible=!!ref.data&&!prior.data?.length&&joined&&Date.now()<joined+86400000;
 return {amount:eligible?Math.round(item.amount_naira*.75):item.amount_naira,discount:eligible};
}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
 let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request'})}
 const key=String(body.pack||'').trim(),item=COMMERCE[key];
 if(!item||!['pack','course'].includes(item.kind))return json(400,{error:'This product is unavailable.'});
 const secret=(process.env.PAYSTACK_SECRET_KEY||'').trim();if(!secret)return json(503,{error:'Paystack is not configured.'});
 const db=admin(),price=await referralPrice(db,user.id,item,key);
 const host=event.headers['x-forwarded-host']||event.headers.host||'fuseatelier.com';
 const proto=event.headers['x-forwarded-proto']||'https';
 const appUrl=(process.env.APP_URL||proto+'://'+host).replace(/\/+$/,'').replace('fuse-atelier.vercel.app','fuseatelier.com');
 const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({
  email:user.email,amount:price.amount*100,currency:'NGN',channels:['bank_transfer','card','bank','ussd'],
  callback_url:appUrl+'/api/paystack-complete',
  metadata:{user_id:user.id,pack:key,kind:item.kind,amount_naira:price.amount,discount_applied:price.discount,course:item.course||null,custom_fields:[{display_name:'Product',variable_name:'product',value:item.label}]}
 })});
 const data=await response.json();if(!response.ok||!data.status||!data.data?.authorization_url)return json(502,{error:data.message||'Could not start Paystack checkout.'});
 return json(200,{authorization_url:data.data.authorization_url,reference:data.data.reference||null,amount_naira:price.amount,discount_applied:price.discount});
};