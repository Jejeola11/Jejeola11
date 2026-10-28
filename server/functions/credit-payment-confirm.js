// Only the signed-in owner can reconcile a Nestuge transaction already checked in the dashboard.
const {admin,getUser,json}=require('./_supabase');
const {PACKS}=require('./credit-pricing');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
  const user=await getUser(event);if(!user)return json(401,{error:'Sign in'});
  const db=admin(),owner=await db.from('profiles').select('is_admin').eq('id',user.id).single();
  if(owner.error||!owner.data?.is_admin)return json(403,{error:'Owner access required'});
  const b=JSON.parse(event.body||'{}'),pack=PACKS[b.pack];
  const reference=String(b.reference||'').trim(),email=String(b.email||'').trim().toLowerCase();
  if(!pack||b.verified_in_nestuge!==true||Number(b.amount_naira)!==pack.amount_naira||!/^[A-Z0-9_.%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)||reference.length<3||reference.length>200)return json(400,{error:'Check the payment, reference, pack, amount and Fuse email in Nestuge first.'});
  const buyer=await db.from('profiles').select('id,email').eq('email',email).maybeSingle();
  if(buyer.error||!buyer.data)return json(404,{error:'Ask the buyer to sign up with this Fuse email first.'});
  const r=await db.rpc('fulfill_credit_pack_purchase',{p_user_id:buyer.data.id,p_reference:'nestuge:'+reference,p_amount_naira:pack.amount_naira,p_pack:b.pack,p_credits:pack.credits,p_raw:{source:'nestuge-manual',verified_by:user.id}});
  if(r.error)throw r.error;
  const row=r.data?.[0];if(!row)return json(500,{error:'No fulfilment result. Check the payments dashboard.'});
  return json(200,{reused:!row.processed,balance:row.balance,credits_added:row.processed?pack.credits:0,payment_status:row.payment_status});
 }catch(e){console.error('Manual credit reconciliation failed',e);return json(500,{error:'Could not confirm fulfilment. Check payments before retrying.'})}
};
