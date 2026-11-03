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

// Canonical 742-seed volcanic body must expose multiple eruption processes.
const styles=new Set(Geo.sources(volcanic,742).map(site=>site.kind));
for(const name of ['effusive-volcano','explosive-volcano','fissure-eruption','cinder-cone','caldera-eruption'])
 assert.ok(styles.has(name),'missing '+name);
for(const site of Geo.sources(volcanic,742)){
 assert.ok(site.reservoirCapacityKg>0&&site.initialReservoirKg<=site.reservoirCapacityKg);
 const phaseStart=(site.cycleS-site.epochOffsetS)%site.cycleS;
 const early=Geo.pulse(site,phaseStart+site.durationS*.2,100000,9.8);
 const later=Geo.pulse(site,phaseStart+site.durationS*.8,100000,9.8);
 const next=Geo.pulse(site,phaseStart+site.cycleS+site.durationS*.5,100000,9.8);
 assert.ok(early.reservoirRemainingKg>=later.reservoirRemainingKg);
 assert.ok(later.reservoirRemainingKg>=0&&next.reservoirRemainingKg>=0);
 assert.ok(early.dischargedThisCycleKg<=early.reservoirCapacityKg);
 assert.ok(early.massFlowKgS>=0&&Number.isFinite(early.massFlowKgS));
 assert.ok(Math.abs(early.ashMassFlowKgS+early.lavaMassFlowKgS)<=early.massFlowKgS+1e-8);
}
const effusive=Geo.sources(volcanic,742).find(x=>x.kind==='effusive-volcano');
const explosive=Geo.sources(volcanic,742).find(x=>x.kind==='explosive-volcano');
assert.ok(effusive.magmaViscosityPaS<explosive.magmaViscosityPaS);
const drySite={...Geo.sources(wet,742)[0],thermalFluxWm2:0};
assert.equal(Geo.pulse(drySite,120,101325,9.8).massFlowKgS,0);
const empty={...Geo.sources(volcanic,742)[0],initialReservoirKg:0,rechargeKgPerCycle:0};
assert.equal(Geo.pulse(empty,180,101325,9.8).massFlowKgS,0);
assert.equal(Geo.pulse(effusive,1e10,101325,9.8).reservoirRemainingKg,0);

console.log('LW01 geothermal source classes, finite mass, depletion, pressure and determinism PASS');
