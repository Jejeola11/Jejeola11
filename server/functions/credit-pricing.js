const {assertPack}=require('./_credit-policy');
const {json}=require('./_supabase');
const PACKS=Object.freeze({
 'credits-v2-trial':{label:'Try Fuse',amount_naira:1250,credits:15,note:'A small start for your first creations'},
 'credits-v2-mini':{label:'Mini',amount_naira:6250,credits:75,note:'Room to explore your creative ideas'},
 'credits-v2-creator':{label:'Creator',amount_naira:12500,credits:150,note:'For your next creative project'},
 'credits-v2-studio':{label:'Studio',amount_naira:25000,credits:300,note:'For regular creative work'},
 'credits-v2-pro':{label:'Pro',amount_naira:62500,credits:750,note:'For busy production schedules'},
 'credits-v2-agency':{label:'Agency',amount_naira:125000,credits:1500,note:'For larger client projects'}
});
Object.values(PACKS).forEach(pack=>assertPack(pack,Math.round(pack.amount_naira*.75)));
exports.PACKS=PACKS;
exports.handler=async event=>event.httpMethod!=='GET'?json(405,{error:'Method not allowed'}):json(200,{version:'2026-11-profit-protected',enabled:true,packs:Object.entries(PACKS).map(([id,pack])=>({id,...pack})),quoteRequired:false});
