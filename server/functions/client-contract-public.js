// Public contract view/sign endpoint. The unguessable token is the credential.
const { admin, json } = require('./_supabase');
function clean(v,max=10000){return typeof v==='string'?v.trim().slice(0,max):''}
function tokenFrom(event,body){
  const q=event.queryStringParameters||{};
  return clean((body&&body.token)||q.token,120);
}
exports.handler=async(event)=>{
  try{
    const db=admin();
    let body={}; if(event.httpMethod==='POST'){try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}}
    const token=tokenFrom(event,body); if(!token)return json(400,{error:'Missing contract token.'});
    const q=await db.from('client_contracts').select('id,prospect_id,title,body,status,signer_name,signer_email,sent_at,viewed_at,signed_at,public_token').eq('public_token',token).maybeSingle();
    if(q.error)throw q.error; if(!q.data)return json(404,{error:'Contract not found.'});
    const c=q.data;
    const pq=await db.from('client_prospects').select('brand_name,service,offer_angle').eq('id',c.prospect_id).maybeSingle();
    if(pq.error)throw pq.error;
    if(event.httpMethod==='GET'){
      if(!['sent','signed'].includes(c.status))return json(403,{error:'This contract has not been sent yet.'});
      if(!c.viewed_at){await db.from('client_contracts').update({viewed_at:new Date().toISOString()}).eq('id',c.id)}
      return json(200,{ok:true,contract:{title:c.title,body:c.body,status:c.status,signer_name:c.signer_name,signer_email:c.signer_email,sent_at:c.sent_at,signed_at:c.signed_at},client:{name:pq.data&&pq.data.brand_name||'Client'}});
    }
    if(event.httpMethod==='POST'){
      if(c.status==='signed')return json(200,{ok:true,already_signed:true,signed_at:c.signed_at});
      if(c.status!=='sent')return json(403,{error:'This contract is not open for signing.'});
      const agree=body.agree===true;
      const signerName=clean(body.signer_name,220), signerEmail=clean(body.signer_email,320), signature=clean(body.signature_text,220);
      if(!agree||!signerName||!signerEmail||!signature)return json(400,{error:'Name, email, signature and agreement are required.'});
      const now=new Date().toISOString();
      const ip=clean((event.headers&&((event.headers['x-forwarded-for']||event.headers['X-Forwarded-For'])))||'',250).split(',')[0];
      const ua=clean((event.headers&&((event.headers['user-agent']||event.headers['User-Agent'])))||'',1000);
      const up=await db.from('client_contracts').update({status:'signed',signer_name:signerName,signer_email:signerEmail,signature_text:signature,signer_ip:ip||null,signer_user_agent:ua||null,signed_at:now,updated_at:now}).eq('id',c.id).eq('public_token',token).select('id,status,signed_at').single();
      if(up.error)throw up.error;
      await db.from('client_prospects').update({status:'contract_signed',contract_signed_at:now,last_activity_at:now,updated_at:now}).eq('id',c.prospect_id);
      await db.from('client_activities').insert({user_id:(await db.from('client_contracts').select('user_id').eq('id',c.id).single()).data.user_id,prospect_id:c.prospect_id,activity_type:'contract_signed',title:'Contract signed',body:signerName,metadata:{contract_id:c.id}});
      return json(200,{ok:true,signed_at:now});
    }
    return json(405,{error:'Method not allowed'});
  }catch(e){console.error('[client-contract-public]',e);return json(500,{error:e&&e.message||'Could not process this contract.'})}
};