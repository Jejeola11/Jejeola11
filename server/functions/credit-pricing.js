const {json}=require('./_supabase');
const PACKS=Object.freeze({
 'credits-v2-trial':{label:'Try Fuse',amount_naira:1000,credits:6,checkout:'https://nestuge.com/fuse-credits-try',note:'A small start for your first creations'},
 'credits-v2-mini':{label:'Mini',amount_naira:5000,credits:55,checkout:'https://nestuge.com/fuse-credits-mini',note:'Room to explore your creative ideas'},
 'credits-v2-creator':{label:'Creator',amount_naira:10000,credits:120,checkout:'https://nestuge.com/fuse-credits-creator',note:'For your next creative project'},
 'credits-v2-studio':{label:'Studio',amount_naira:20000,credits:240,checkout:'https://nestuge.com/fuse-credits-studio',note:'For regular creative work'},
 'credits-v2-pro':{label:'Pro',amount_naira:50000,credits:600,checkout:'https://nestuge.com/fuse-credits-pro',note:'For busy production schedules'},
 'credits-v2-agency':{label:'Agency',amount_naira:100000,credits:1200,checkout:'https://nestuge.com/fuse-credits-agency',note:'For larger client projects'}
});
exports.PACKS=PACKS;
exports.handler=async event=>event.httpMethod!=='GET'?json(405,{error:'Method not allowed'}):json(200,{version:'2026-10-safe-reprice',enabled:true,packs:Object.entries(PACKS).map(([id,pack])=>({id,...pack})),quoteRequired:false});
