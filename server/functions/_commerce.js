const {PACKS:CREDIT_PACKS}=require('./credit-pricing');
const {PACKS:LEGACY_PACKS}=require('./_packs');
const ACADEMY=Object.freeze({
 'academy-design':{label:'Design & Flyers',amount_naira:9900,credits:0,kind:'course',course:'design'},
 'academy-video':{label:'AI UGC & Influencer',amount_naira:9900,credits:0,kind:'course',course:'video'},
 'academy-landing':{label:'Landing Page Design',amount_naira:9900,credits:0,kind:'course',course:'landing'},
 'academy-money':{label:'Money Engine',amount_naira:9900,credits:0,kind:'course',course:'money'},
 'academy-challenge':{label:'14-Day AI Video Client Challenge',amount_naira:9900,credits:0,kind:'course',course:'challenge'},
 'academy-ebook':{label:'Zero To First 10 Million With AI Video',amount_naira:9900,credits:0,kind:'course',course:'ebook'}
});
const CURRENT=Object.fromEntries(Object.entries(CREDIT_PACKS).map(([key,value])=>[key,{...value,kind:'pack'}]));
const COMMERCE=Object.freeze({...LEGACY_PACKS,...CURRENT,...ACADEMY,'fuse-creator-pass':{label:'Fuse Full Access',amount_naira:25900,credits:55,kind:'course',course:'full-access'}});
const CREDIT_KEYS=Object.keys(CURRENT);
module.exports={COMMERCE,ACADEMY,CURRENT,CREDIT_KEYS};