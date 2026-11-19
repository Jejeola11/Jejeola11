const {PACKS:CREDIT_PACKS}=require('./credit-pricing');
const {PACKS:LEGACY_PACKS}=require('./_packs');
const ACADEMY=Object.freeze({
 'academy-design':{label:'Design & Flyers',amount_naira:20000,credits:0,kind:'course',course:'design'},
 'academy-video':{label:'AI UGC & Influencer',amount_naira:35000,credits:0,kind:'course',course:'video'},
 'academy-influencer':{label:'Create & Monetize Viral AI Influencers',amount_naira:30000,credits:0,kind:'course',course:'influencer'},
 'academy-landing':{label:'Landing Page Design',amount_naira:30000,credits:0,kind:'course',course:'landing'},
 'academy-money':{label:'Money Engine',amount_naira:25000,credits:0,kind:'course',course:'money'},
 'academy-challenge':{label:'14-Day AI Video Client Challenge',amount_naira:25000,credits:0,kind:'course',course:'challenge'},
 'academy-ebook':{label:'Zero To First 10 Million With AI Video',amount_naira:9900,credits:0,kind:'course',course:'ebook'}
});
const blackFriday = require('./_black-friday');
const BUNDLES={'academy-bundle-2':{label:'Choose Any 2 Courses',amount_naira:40000,credits:0,kind:'course',course:'bundle',count:2},'academy-bundle-4':{label:'Choose Any 4 Courses',amount_naira:75000,credits:0,kind:'course',course:'bundle',count:4}};
const CURRENT=Object.fromEntries(Object.entries(CREDIT_PACKS).map(([key,value])=>[key,{...value,kind:'pack'}]));
const COMMERCE=Object.freeze({...LEGACY_PACKS,...CURRENT,...ACADEMY,...BUNDLES,[blackFriday.PACK]:{label:'Black Friday Creator Bundle',amount_naira:blackFriday.AMOUNT,credits:100,kind:'course',course:'black-friday'},'fuse-creator-pass':{label:'Fuse Full Access',amount_naira:25900,credits:55,kind:'course',course:'full-access'}});
const CREDIT_KEYS=Object.keys(CURRENT);
module.exports={COMMERCE,ACADEMY,CURRENT,CREDIT_KEYS};