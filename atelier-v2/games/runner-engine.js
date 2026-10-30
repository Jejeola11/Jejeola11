(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FuseRunner=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
class Runner{
 constructor(seed=Date.now()){this.seed=seed>>>0;this.reset()}
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296}
 reset(){this.mode='ready';this.distance=0;this.speed=22;this.lane=0;this.x=0;this.jump=0;this.slide=0;this.coins=0;this.objects=[];this.next=70;this.time=0;this.events=[];for(let i=0;i<6;i++)this.objects.push({kind:'coin',lane:0,z:22+i*6,y:.85});this.fill()}
 start(){this.mode='playing'}
 action(a){if(this.mode!=='playing')return;if(a==='left')this.lane=Math.max(-1,this.lane-1);if(a==='right')this.lane=Math.min(1,this.lane+1);if(a==='jump'&&!this.jump&&!this.slide)this.jump=.78;if(a==='slide'&&!this.jump)this.slide=.7}
 height(){return this.jump?Math.sin((1-this.jump/.78)*Math.PI)*2.1:0}
 fill(){while(this.next<this.distance+430){const safe=Math.floor(this.random()*3)-1;for(const lane of [-1,0,1]){if(lane===safe)continue;if(this.random()<.78)this.objects.push({kind:['barrier','arch','train'][Math.floor(this.random()*3)],lane,z:this.next,y:0})}for(let i=0;i<4;i++)this.objects.push({kind:'coin',lane:safe,z:this.next+7+i*4,y:.85});this.next+=30+this.random()*13}}
 update(dt){if(this.mode!=='playing')return;dt=Math.min(Math.max(dt,0),.05);this.events=[];this.time+=dt;this.speed=Math.min(42,22+this.distance/550);this.distance+=this.speed*dt;this.x+=(this.lane-this.x)*Math.min(1,dt*15);this.jump=Math.max(0,this.jump-dt);this.slide=Math.max(0,this.slide-dt);const y=this.height();for(const o of this.objects){const z=o.z-this.distance;if(o.done||z>11||z<2||Math.abs(o.lane-this.x)>.37)continue;if(o.kind==='coin'){if(Math.abs((y+.85)-o.y)<.9){o.done=true;this.coins++;this.events.push('coin')}}else if(z<9){if(o.kind==='barrier'&&y>1.02){o.done=true;continue}if(o.kind==='arch'&&this.slide>0){o.done=true;continue}this.mode='over';this.events.push('crash');break}}this.objects=this.objects.filter(o=>o.z>this.distance-15&&!o.done);this.fill()}
 score(){return Math.floor(this.distance*2)+this.coins*25}
}
return {Runner};
});
