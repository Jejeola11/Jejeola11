'use strict';
const dns=require('node:dns').promises;
const https=require('node:https');
const http=require('node:http');
const {isIP,BlockList}=require('node:net');
const blocked4=new BlockList(),blocked6=new BlockList();
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.168.0.0',16],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]])blocked4.addSubnet(ip,prefix,'ipv4');
for(const [ip,prefix] of [['::',128],['::1',128],['::ffff:0:0',96],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]])blocked6.addSubnet(ip,prefix,'ipv6');
function safeUrl(value){try{const u=new URL(String(value||''));if(!['https:','http:'].includes(u.protocol)||u.username||u.password||(u.port&&!['443','80'].includes(u.port))||u.hostname==='localhost'||u.hostname.endsWith('.local'))return '';u.hash='';return u.href}catch{return ''}}
function publicIP(ip){const type=isIP(ip);return Boolean(type)&&!(type===4?blocked4:blocked6).check(ip,type===4?'ipv4':'ipv6')}
function normalize(text){return String(text||'').toLowerCase().replace(/&amp;/g,'&').replace(/&#(?:x([a-f0-9]+)|(\d+));/gi,(_,hex,dec)=>String.fromCodePoint(Math.min(1114111,parseInt(hex||dec,hex?16:10)||32))).replace(/[^\p{L}\p{N}@.+]+/gu,' ').replace(/\s+/g,' ').trim()}
function pageText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&quot;|&apos;|&lt;|&gt;/g,' ').replace(/\s+/g,' ').trim()}
function quotePresent(text,quote){const n=normalize(quote);return n.length>=24&&normalize(text).includes(n)}
async function readPage(value,hops=0){
  const url=safeUrl(value);if(!url||hops>3)throw new Error('Source URL is not allowed.');
  const u=new URL(url),host=u.hostname.replace(/^\[|\]$/g,'');
  const addresses=await dns.lookup(host,{all:true});
  if(!addresses.length||addresses.some(a=>!publicIP(a.address)))throw new Error('Source does not resolve to a public address.');
  const chosen=addresses.find(a=>a.family===4)||addresses[0];
  return new Promise((resolve,reject)=>{
    const request=(u.protocol==='https:'?https:http).get(u,{
      headers:{'User-Agent':'FuseAtelierResearch/2.0 (+https://fuseatelier.com)','Accept':'text/html,text/plain,application/json'},
      lookup:(_hostname,options,callback)=>options?.all?callback(null,[chosen]):callback(null,chosen.address,chosen.family),timeout:8000
    },response=>{
      if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){response.resume();readPage(new URL(response.headers.location,url).href,hops+1).then(resolve,reject);return}
      if(response.statusCode<200||response.statusCode>=300){response.resume();reject(new Error('Source could not be opened.'));return}
      if(!/text\/|json|xml/i.test(String(response.headers['content-type']||''))){response.resume();reject(new Error('Source is not a readable web page.'));return}
      let size=0;const chunks=[];
      response.on('data',chunk=>{size+=chunk.length;if(size>400000){request.destroy(new Error('Source is too large.'));return}chunks.push(chunk)});
      response.on('error',reject);
      response.on('end',()=>{const raw=Buffer.concat(chunks).toString('utf8');resolve({url,text:pageText(raw),raw,checked_at:new Date().toISOString()})});
    });
    request.on('timeout',()=>request.destroy(new Error('Source timed out.')));request.on('error',reject);
  });
}
module.exports={safeUrl,publicIP,normalize,pageText,quotePresent,readPage};
