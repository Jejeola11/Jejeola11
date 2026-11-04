const {json}=require('./_supabase');
const PACKS=Object.freeze({
 'credits-v2-trial':{label:'Try Fuse',amount_naira:1250,credits:20,note:'A small start for your first creations'},
 'credits-v2-mini':{label:'Mini',amount_naira:6250,credits:120,note:'Room to explore your creative ideas'},
 'credits-v2-creator':{label:'Creator',amount_naira:12500,credits:280,note:'For your next creative project'},
 'credits-v2-studio':{label:'Studio',amount_naira:25000,credits:600,note:'For regular creative work'},
 'credits-v2-pro':{label:'Pro',amount_naira:62500,credits:1700,note:'For busy production schedules'},
 'credits-v2-agency':{label:'Agency',amount_naira:125000,credits:3125,note:'For larger client projects'}
});
exports.PACKS=PACKS;
exports.handler=async event=>event.httpMethod!=='GET'?json(405,{error:'Method not allowed'}):json(200,{version:'2026-11-40-naira-credit',enabled:true,packs:Object.entries(PACKS).map(([id,pack])=>({id,...pack})),quoteRequired:false});
