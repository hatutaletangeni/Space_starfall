'use strict';
const assert=require('node:assert/strict');
const Geo=require('../src/physics/geothermal-lw01.js');
const make=(id,type)=>({id,seed:8802,kind:'planet',type,radius:2200,landable:true});
const volcanic=make('star-1-p1','Volcanic'),ice=make('star-1-p2','Ice'),wet=make('star-1-p3','Ocean'),vac=make('star-1-p4','Shattered');
for(const body of [volcanic,ice,wet]){
 const a=Geo.sources(body,742),b=Geo.sources(body,742);
 assert.deepEqual(a,b);assert.ok(a.length>=2);
 assert.ok(a.every(x=>Math.abs(Math.hypot(...x.direction)-1)<1e-12));
 for(const site of a){
  assert.ok(site.cycleS>site.durationS&&site.durationS>0);
  const t=(site.cycleS-site.epochOffsetS)%site.cycleS+site.durationS*.5;
  const s=Geo.pulse(site,t,100000,9.8);
  assert.ok(s.massFlowKgS>=0&&Number.isFinite(s.plumeHeightM));
  assert.deepEqual(s,Geo.pulse(site,t,100000,9.8));
  const l=Geo.local(body,site.direction,t,742,100000,9.8);
  assert.ok(l&&l.distanceScene<=1e-4);
 }
}
assert.equal(Geo.sources(vac).length,0);
assert.equal(Geo.sources({...volcanic,landable:false}).length,0);
assert.throws(()=>Geo.pulse(Geo.sources(volcanic)[0],-1));
console.log('LW01 geothermal deterministic sources, pressure cycles, unit checks PASS');
