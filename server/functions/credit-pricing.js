const {json}=require('./_supabase');
const pricing=require('./_credit-policy');
exports.handler=async event=>{if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});return json(200,{version:pricing.VERSION,enabled:pricing.enabled(),packs:Object.entries(pricing.PACKS).map(([id,p])=>({id,...p,checkout:pricing.enabled()?pricing.checkout(id):null})),quoteRequired:true});};
