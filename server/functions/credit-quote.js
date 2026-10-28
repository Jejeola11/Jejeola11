const {admin,getUser,json}=require('./_supabase');
const pricing=require('./_credit-policy');
const {recipe}=require('./_credit-recipes');
const {getPrice}=require('./_wave-price');
exports.handler=async event=>{
 if(!pricing.enabled())return json(503,{error:'New pricing is being prepared.'});
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in.'});
 if((event.body||'').length>60000)return json(413,{error:'Request is too large'});
 const b=JSON.parse(event.body||'{}'),db=admin();
 const recent=await db.from('fuse_credit_quotes').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-60000).toISOString());if(recent.error)throw recent.error;if(recent.count>=10)return json(429,{error:'Please wait before requesting another quote.'});
 const [account,wallet]=await Promise.all([db.from('profiles').select('credits').eq('id',user.id).single(),db.from('fuse_credit_wallets').select('unit_value_ngn').eq('user_id',user.id).maybeSingle()]);if(account.error||wallet.error)throw account.error||wallet.error;
 const plan=await recipe(b.action,b.input||{}),provider=await getPrice(plan.model,plan.inputs);
 const unit=wallet.data?Number(wallet.data.unit_value_ngn):(account.data.credits>0?50000/650:100);
 const calculated=pricing.quote(provider.usd,unit);const expiry=new Date(Date.now()+180000).toISOString();
 const saved=await db.from('fuse_credit_quotes').insert({user_id:user.id,action:b.action,recipe:plan,pricing:{...calculated,provider},expires_at:expiry}).select('id').single();if(saved.error)throw saved.error;
 return json(200,{quote_id:saved.data.id,credits:calculated.credits*plan.count,expires_at:expiry,model:plan.internalModel,count:plan.count});
 }catch(e){return json(400,{error:e.message||'Could not quote this action. No credits were charged.'})}
};
