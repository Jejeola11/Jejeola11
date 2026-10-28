const {admin,getUser,json}=require('./_supabase');
const {captureSignup}=require('./_platform-audience');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed.'});
 try{
  const user=await getUser(event);
  if(!user)return json(401,{error:'Please sign in first.'});
  if(!user.email||!user.email_confirmed_at)return json(403,{error:'Verify your email first.'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid request.'})}
  const db=admin(),email=user.email.trim().toLowerCase();
  const firstName=String(body.name||user.user_metadata?.full_name||user.user_metadata?.name||email.split('@')[0]).trim().slice(0,80);
  const contact=await captureSignup(db,{id:user.id,email,name:firstName});
  if(body.marketingOptIn===true&&contact.email_marketing_status==='unknown'){
   const suppression=await db.from('audience_suppressions').select('id').eq('channel','email').eq('identifier',email).limit(1);if(suppression.error)throw suppression.error;
   if(!suppression.data?.length){
    const updated=await db.from('audience_contacts').update({email_marketing_status:'subscribed',email_opted_in_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',contact.id).eq('email_marketing_status','unknown');if(updated.error)throw updated.error;
   }
  }
  return json(200,{ok:true});
 }catch(_){return json(500,{error:'Could not save email preferences.'});}
};
