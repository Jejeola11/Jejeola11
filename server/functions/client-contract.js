// Fuse Client contracts: prepare and send a service agreement.
const { admin, getUser, json } = require('./_supabase');
function clean(v,max=10000){return typeof v==='string'?v.trim().slice(0,max):''}
function money(v,fallback=0){const n=Number(v);return Number.isFinite(n)&&n>=0?n:fallback}
function contractBody(p,proposal){
  const cur=(proposal&&proposal.currency)||p.offer_currency||'USD';
  const monthly=money(proposal&&proposal.monthly_price,money(p.offer_price,0));
  const service=p.offer_angle||p.service||'Creative / growth services';
  const scope=Array.isArray(proposal&&proposal.scope)?proposal.scope.map(function(x){return x&&((x.title||'')+(x.text?' — '+x.text:''))}).filter(Boolean):[];
  const items=scope.length?scope:['Deliver the approved sample direction and the recurring services described in the proposal.'];
  return [
    'SERVICE AGREEMENT',
    '',
    'Client: '+p.brand_name,
    'Service: '+service,
    'Monthly Fee: '+cur+' '+monthly.toLocaleString(),
    '',
    '1. Scope',
    items.map(function(x,i){return (i+1)+'. '+x}).join('\n'),
    '',
    '2. Payment',
    'The client agrees to pay the stated fee according to the agreed billing schedule. Work outside the agreed scope may require a separate quote.',
    '',
    '3. Approvals and access',
    'The client will provide timely approvals, brand assets, account access and factual information required to complete the work.',
    '',
    '4. Intellectual property',
    'Final approved deliverables transfer to the client after the applicable invoice is paid in full, except for third-party licensed assets, tools, templates and pre-existing materials.',
    '',
    '5. Confidentiality',
    'Both parties agree to keep non-public business information confidential and use it only for delivering the agreed services.',
    '',
    '6. Termination',
    'Either party may end the ongoing engagement by written notice. Completed work and outstanding approved invoices remain payable.',
    '',
    '7. Results',
    'The service provider will perform the agreed work professionally, but does not guarantee revenue, ad performance, rankings or a specific commercial result unless separately agreed in writing.',
    '',
    'By signing, both parties confirm that they understand and accept the scope, payment terms and responsibilities above.'
  ].join('\n');
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event); if(!user)return json(401,{error:'Please sign in again.'});
    let body={}; try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const action=clean(body.action,30)||'prepare';
    const prospectId=clean(body.prospect_id,80);
    if(!prospectId)return json(400,{error:'Choose a prospect first.'});
    const db=admin();
    const pq=await db.from('client_prospects').select('*').eq('id',prospectId).eq('user_id',user.id).maybeSingle();
    if(pq.error)throw pq.error; if(!pq.data)return json(404,{error:'Prospect not found.'});
    const p=pq.data;
    if(action==='prepare'){
      const pr=await db.from('client_proposals').select('*').eq('user_id',user.id).eq('prospect_id',p.id).order('created_at',{ascending:false}).limit(1);
      if(pr.error)throw pr.error;
      const proposal=pr.data&&pr.data[0]?pr.data[0]:null;
      const bodyText=clean(body.body,30000)||contractBody(p,proposal);
      const ins=await db.from('client_contracts').insert({
        user_id:user.id,prospect_id:p.id,proposal_id:proposal&&proposal.id||null,
        title:clean(body.title,240)||(p.brand_name+' — Service Agreement'),
        body:bodyText,signer_name:p.founder_name||p.contact_name||null,signer_email:p.founder_email||p.email||null
      }).select('*').single();
      if(ins.error)throw ins.error;
      await db.from('client_activities').insert({user_id:user.id,prospect_id:p.id,activity_type:'contract_ready',title:'Contract ready',body:ins.data.title,metadata:{contract_id:ins.data.id}});
      return json(200,{ok:true,contract:ins.data,sign_url:'/atelier-v2/client-sign.html?token='+encodeURIComponent(ins.data.public_token)});
    }
    if(action==='send'){
      const id=clean(body.contract_id,80); if(!id)return json(400,{error:'Choose a contract.'});
      const now=new Date().toISOString();
      const up=await db.from('client_contracts').update({status:'sent',sent_at:now,updated_at:now}).eq('id',id).eq('user_id',user.id).eq('prospect_id',p.id).select('*').single();
      if(up.error)throw up.error;
      await db.from('client_prospects').update({status:'contract_sent',contract_sent_at:now,last_activity_at:now,updated_at:now}).eq('id',p.id).eq('user_id',user.id);
      await db.from('client_activities').insert({user_id:user.id,prospect_id:p.id,activity_type:'contract_sent',title:'Contract sent',body:up.data.title,metadata:{contract_id:up.data.id}});
      return json(200,{ok:true,contract:up.data,sign_url:'/atelier-v2/client-sign.html?token='+encodeURIComponent(up.data.public_token)});
    }
    return json(400,{error:'Unsupported contract action.'});
  }catch(e){console.error('[client-contract]',e);return json(500,{error:e&&e.message||'Could not prepare this contract.'})}
};