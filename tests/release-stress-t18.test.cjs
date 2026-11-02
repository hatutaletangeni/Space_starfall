/* T18 20-launch SOURCE-MODEL stress. Intentionally not UI/human launch proof.
 * Same original 7B force-integration as game, real fuel/collision/energy math.
 * This is a model stress companion to separate real DOM browser journey.
 */
'use strict';
const assert=require('node:assert/strict');
require('../src/physics/rocket-flight7b.js');
require('../src/physics/launch-systems.js');
require('../src/physics/satellites7c.js');
const X=globalThis.StarfallLaunch;
const seed=742,home={id:'star-0-p0',systemId:'star-0',kind:'planet',landable:true,
 gravity:1.24,radius:2150,position:[0,0,0],spinPeriod:20000,spinAngle:0,atmosphere:'thin'},
 star={id:'star-0',position:[1.15e7,0,0],kind:'star',radius:100000},
 foundation={id:'pad-real-source-model',kind:'foundation',bodyId:home.id,local:[0,1,0]},
 lookup=id=>id==='star-0'?star:id===home.id?home:null;
const profile={surfaceGravityMS2:home.gravity*X.G0,radiusM:home.radius*1000,
 mu:home.gravity*X.G0*(home.radius*1000)**2};
const design={engine:'atlas',tanks:6,stages:3,boosters:2,payload:'relay'};
const fit=X.build(design,profile);
assert(fit.valid&&fit.launchTWR>1.08,'Original 7B sample rocket valid');
const store=new X.Store(seed);
const launched=[];
for(let k=0;k<20;k++){
 const t0=1+k*2100;
 const before=store.satellites.length,prior=store.launches.map(x=>x.id);
 const mission=store.launch({body:home,foundation,design,time:t0});
 assert.equal(store.satellites.length,before,'Original launch must not predeploy orbit');
 assert(mission.flight.stageFuelKg.every(x=>x>=0));
 let final=null;
 for(let t=t0;t<=t0+1500;t+=30){
  store.update(t,lookup);
  const m=store.launches.find(x=>x.id===mission.id);
  assert(m,'Flight cannot silently disappear during timeline advancement');
  assert([m.trajectoryAltitudeM,m.velocityMS,m.flight.x,m.flight.y].every(Number.isFinite));
  assert(m.flight.stageFuelKg.every(x=>x>=-1e-8),'Never negative fuel on real force-integrated stages');
  if(['failed','deployed'].includes(m.phase)){final=m;break;}
 }
 assert(final,'Original force integrator did not resolve a finite launch in 1500s');
 assert.equal(final.phase,'deployed','Model 7B launch '+mission.id+' failed actual orbital insertion: '+(final.failure||final.flight.reason));
 assert.equal(store.satellites.length,before+1,'One original satellite per source rocket orbit');
 assert(prior.every(id=>store.launches.some(m=>m.id===id)),'Past launches must never vanish');
 const sat=store.satellites.at(-1);
 assert(sat.launchId===mission.id,'Actual orbital payload must trace to original launch');
 launched.push({id:mission.id,orbitId:sat.id,altitudeM:sat.altitudeM,phase:final.phase,
  fuelKg:final.flight.stageFuelKg.reduce((a,b)=>a+b,0)});
}
assert.equal(store.launches.length,20);
assert.equal(store.satellites.length,20);
assert.equal(new Set(store.launches.map(x=>x.id)).size,20,'Duplicate launch identity');
assert.equal(new Set(store.satellites.map(x=>x.id)).size,20,'Duplicate satellite identity');
const save=store.serialize(),restored=new X.Store(seed,save);
assert.deepEqual(restored.launches.map(x=>x.id),store.launches.map(x=>x.id));
assert.deepEqual(restored.satellites.map(x=>x.id),store.satellites.map(x=>x.id));
assert.equal(new X.Store(seed+1,save).launches.length,0,'Different galaxy seed MUST NOT import old rocket fleet');
for(const s of restored.satellites){
 const body=lookup(s.bodyId),state=X.orbit(s,body,46500,1000);
 assert(Number.isFinite(state.periodS)&&state.periodS>0&&Number.isFinite(state.position[0]));
 const pack=globalThis.StarfallSatelliteOps7C.ensure(s);
 assert(pack.energyJ>=0&&pack.energyJ<=globalThis.StarfallSatelliteOps7C.CONFIG.capacityJ);
}
console.log('PASS T18 MODEL STRESS ONLY: 20 original 7B force-integrated launches physically reach stable orbit, 20 source-owned retained satellites, no phantom predeployment/fuel negatives, source-seed save/reload and bounded orbital energy. NOT UI/PAD/PLAYER PROOF.');
