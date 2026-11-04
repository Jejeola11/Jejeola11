const {admin,getUser,json}=require('./_supabase');
const {captureSignup}=require('./_platform-audience');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
  const user=await getUser(event);
  if(!user||!user.email||!user.email_confirmed_at)return json(401,{error:'Sign in with a confirmed email first'});
  const body=JSON.parse(event.body||'{}');
  if(body.optedIn!==true)return json(400,{error:'Explicit opt-in is required'});
  const db=admin();
  const contact=await captureSignup(db,{id:user.id,email:user.email,name:user.user_metadata?.full_name||user.user_metadata?.name});
  // An unchecked signup box never overwrites any existing marketing preference.
  const {error}=await db.from('audience_contacts').update({email_marketing_status:'subscribed',email_opted_in_at:new Date().toISOString(),email_opted_out_at:null}).eq('id',contact.id);
  if(error)throw error;
  return json(200,{ok:true});
 }catch{return json(500,{error:'Could not save your email preference'});}
};
