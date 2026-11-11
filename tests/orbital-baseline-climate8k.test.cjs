'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{rocket}=require('./helpers/industry-fixtures.cjs');
const M=require('../src/physics/material-ledger8a.js'),P=require('../src/physics/foundation.js');
require('../src/physics/assembly8g.js');const F=require('../src/physics/rocket-flight7b.js');
const E=require('../src/physics/atmosphere-emission8j.js');require('../src/physics/celestial-composition-cw01.js');
const CC=require('../src/physics/planetary-climate8j.js'),C=require('../src/physics/industry-completion8k.js');
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function orbital(){const a=rocket();a.shipEnergyJ=180e6;a.body.radius=200;a.body.gravity=.1;a.body.kind='moon';a.body.type='Ice';a.factory={receipts:[{id:'manufacture:orbital',recipeId:'orbital_propulsion_kit',status:'COMMITTED'}]};a.partsContainerId='ship';
 const m=M.create(a.materials);m.registerContainer({id:'ship',ownerId:'ship-main',kind:'hold',maxMassKg:10000,maxVolumeM3:10});m.importLot({id:'kit:orbital',materialId:'orbital_propulsion_kit',massKg:80,volumeM3:.1,grade:1,containerId:'ship',provenance:'process:manufacture:orbital'});a.materials=m.snapshot();return a;}
function refill(a){for(const l of a.materials.lots){if(l.materialId==='hydrogen')l.massKg=3;if(l.materialId==='oxygen')l.massKg=30;const mw=l.materialId==='hydrogen'?.002016:.031998;if(l.materialId!=='orbital_propulsion_kit')l.volumeM3=l.massKg/mw*8.314462618*293.15/5e6;}a.shipEnergyJ=180e6;}
function load(a,count=12){for(let n=0;n<count;n++){refill(a);a.operationId='condition8g:'+n;a.timeS=1+n*100;a.prepareOnly=true;a.hydrogenKg=2;const q=C.launch(a);a.materials=q.materials;a.physical=q.physical;}return a;}
test('paid conditioning fits a real battery, retains source mass, and native integration achieves a manufactured orbit',()=>{
 const a=load(orbital());assert.ok(a.physical.assets.find(x=>x.id==='stage').state.orbital8g.hydrogenKg>23);
 a.operationId='rocket8g:orbital';a.prepareOnly=false;a.propulsion='orbital';const q=C.launch(a),f=q.mission.flight,p=q.mission.profile;
 for(let n=0;n<300&&f.phase!=='failed'&&f.phase!=='orbit';n++)F.advance(f,p,30);
 assert.equal(f.phase,'orbit',JSON.stringify({reason:f.reason,orbit:F.elements(f,p.mu,p.radiusM),fuel:f.stageFuelKg}));
 const el=F.elements(f,p.mu,p.radiusM);assert.ok(el.energyJkg<0&&el.periapsisM>=25000);assert.equal(q.launchStore.satellites.length,0);
 assert.ok(!q.physical.assets.some(x=>x.id==='stage'));close(F.totalMass(f,p),p.stageParts[0].dryKg+f.stageFuelKg[0]);
 assert.ok(q.mission.sourceStage.state.orbital8g.conditioningJ>180e6,'conditioning must span actual recharge cycles');
});
test('orbital kit, battery, load capacity, source provenance, rollback and heat-leak losses are enforced',()=>{
 let a=orbital();a.prepareOnly=true;a.operationId='condition8g:0';a.factory.receipts=[];assert.throws(()=>C.launch(a),/Manufacture/);
 a=orbital();a.prepareOnly=true;a.operationId='condition8g:0';a.shipEnergyJ=4e6;const before=structuredClone(a);assert.throws(()=>C.launch(a),/Battery/);assert.deepEqual(a,before);
 a=load(orbital(),1);const stage=a.physical.assets.find(x=>x.id==='stage'),old=stage.massKg,q=C.ageTanks(a.physical,a.timeS+3600),aged=q.assets.find(x=>x.id==='stage');
 close(old-aged.massKg,aged.state.orbital8g.ventedKg-stage.state.orbital8g.ventedKg);assert.ok(aged.state.orbital8g.hydrogenKg<2);
 assert.throws(()=>C.launch({...a,operationId:'rocket8g:too-small',prepareOnly:false,propulsion:'orbital'}),/delta-v/);
});
function environment(type='Desert'){
 const body={id:'a',kind:'planet',type,landable:true,radius:1000,gravity:.3,atmosphere:'modeled',orbitPeriod:31536000,axialTilt:.3};
 const profile={...P.bodyProfile(body),albedo:.3};const w=E.normalize(null,profile),a=rocket();
 a.physical.assets.push({id:'collector',type:'industrial_plant',massKg:740,condition:1,location:{kind:'surface',bodyId:'a'},state:{station:'atmospheric_capture',enabled:true}});a.physical.transfers.push({id:'install:collector',assetId:'collector',action:'INSTALL',status:'COMMITTED',massKg:740,sourceLotId:'made:kit'});
 const v=a.physical.assets.find(x=>x.id==='oxygen');v.state.materialId='carbon_dioxide';a.materials.lots=a.materials.lots.filter(x=>x.materialId!=='oxygen');
 return{body,profile,world:w,materials:a.materials,physical:a.physical,vesselId:'oxygen',collectorId:'collector',sourceMode:'baseline',operationId:'capture8j:baseline',kg:1,shipEnergyJ:180e6,timeS:60,seed:742,landable:true};
}
test('canonical baseline extraction creates no source stock: signed pressure depletion, exact receiver mass, replay and vacuum protection',()=>{
 const a=environment(),q=C.capture(a);assert.equal(q.world.netAddedKg,0);assert.equal(q.world.baselineCapturedSpeciesKg.carbon_dioxide,1);assert.ok(q.world.pressureDeltaPa<0);
 close(M.create(q.materials).used('tank:oxygen').massKg,1);E.normalize(JSON.parse(JSON.stringify(q.world)),a.profile);
 assert.throws(()=>C.capture({...a,materials:q.materials,world:q.world}),/already committed/);
 const b=environment('Rocky');assert.throws(()=>C.capture(b),/no available/);assert.throws(()=>C.capture({...a,protectedWorld:true}),/Protected/);
 assert.throws(()=>C.capture({...a,world:q.world,materials:q.materials,operationId:'capture8j:again'}),/intake/);
});
const water=w=>w.climate8j.bands.reduce((s,b)=>s+b.water.vaporKg+b.water.liquidKg+b.water.iceKg,0);
function tick(a,days){C.climate(a.world,a.profile,1360,0,{body:a.body,seed:742});for(let n=1;n<=days;n++)C.climate(a.world,a.profile,1360,n*86400,{body:a.body,seed:742});return a.world.climate8j;}
test('zero intervention preserves the canonical baseline while phase reservoirs conserve water',()=>{
 const a=environment('Ice'),before=structuredClone(a.body);tick(a,0);const initial=water(a.world),c=tick(a,60);
 assert.equal(c.anomalyK,0);assert.equal(c.cloudDelta,0);assert.equal(a.world.pressureDeltaPa,0);close(water(a.world),initial,initial*1e-13);assert.deepEqual(a.body,before);
 assert.ok(Math.abs(c.energyResidualJ)<1);assert.ok(c.bands.every(b=>b.water.liquidKg>=0&&b.water.iceKg>=0));
});
test('coupled forcing warms gradually, exchanges deep heat, conserves energy and water through save and 100x-equivalent steps',()=>{
 const a=environment('Ice');a.world.emittedSpeciesKg={carbon_dioxide:1e15};a.world.netAddedKg=1e15;E.balance(a.world,a.profile);
 tick(a,0);const initial=water(a.world),c=tick(a,20);assert.ok(c.anomalyK>0&&c.anomalyK<30);assert.ok(c.deepAnomalyK>0);
 close(water(a.world),initial,initial*1e-12);assert.ok(Math.abs(c.energyResidualJ)<Math.abs(c.radiativeJ)*1e-8,JSON.stringify(c));
 const saved=JSON.parse(JSON.stringify(a.world));C.climate(saved,a.profile,1360,21*86400,{body:a.body,seed:742});
 for(let t=20*86400+3600;t<=21*86400;t+=3600)C.climate(a.world,a.profile,1360,t,{body:a.body,seed:742});
 close(saved.climate8j.anomalyK,a.world.climate8j.anomalyK,1e-12);E.normalize(saved,a.profile);
 assert.throws(()=>C.climate(saved,a.profile,1360,1000*86400),/bounded/);
});
test('gas escape is finite and paid from XUV energy; baseline extraction cools and no low-pressure ocean appears',()=>{
 const a=environment('Rocky');a.profile={...a.profile,mu:1e10};a.world=E.normalize(null,a.profile);a.world.netAddedKg=100;a.world.emittedSpeciesKg={hydrogen:100};E.balance(a.world,a.profile);
 const c=tick(a,10);assert.ok(c.escapedKg>0&&c.escapedKg<=100);close(a.world.netAddedKg-E.massDelta(a.world),c.escapedKg,1e-6);assert.ok(c.escapeWorkJ<=1360*1e-5*4*Math.PI*a.profile.radiusM**2/4*.15*864000);
 const b=environment();b.world=C.capture(b).world;const cool=tick(b,2);assert.ok(cool.anomalyK<0);
 const moon=environment('Ice');moon.body.kind='moon';moon.profile={...moon.profile,atmospherePressurePa:0};moon.world=E.normalize(null,moon.profile);const frozen=tick(moon,30);assert.equal(frozen.liquidWaterKg,0);
});
test('legacy thermal migration retains both temperature anomaly and stored heat',()=>{
 const a=environment();a.world.climate8j={schema:1,lastS:0,anomalyK:2,storedHeatJ:4e8*4*Math.PI*a.profile.radiusM**2*2};
 const before=a.world.climate8j.storedHeatJ;C.climate(a.world,a.profile,1360,0,{body:a.body,seed:742});
 assert.equal(a.world.climate8j.anomalyK,2);assert.equal(a.world.climate8j.storedHeatJ,before);
 C.climate(a.world,a.profile,1360,3600);assert.ok(Math.abs(a.world.climate8j.energyResidualJ)<before*1e-10);
});
test('weather and field sensors apply the same signed delta exactly once and retain their legacy baseline',()=>{
 const fs=require('../src/physics/science-field.js'),met=require('../src/physics/meteorology-lw03.js'),a=environment('Ice'),dir=[0,1,0];
 const original=global.StarfallRuntime;global.StarfallRuntime=undefined;
 const before=met.cell(a.body,dir,500,742),truth=fs.localTruth(a.body,742,dir,500);
 try{
  global.StarfallRuntime={planetaryEngineeringView:()=>({pressureDeltaPa:-10,anomalyK:2,cloudDelta:.1})};
  const after=met.cell(a.body,dir,500,742),reading=fs.localTruth(a.body,742,dir,500);
  close(after.temperatureK-before.temperatureK,2);close(reading.temperatureK-truth.temperatureK,2);close(after.pressurePa-before.pressurePa,-10);close(reading.pressurePa-truth.pressurePa,-10);
 }finally{global.StarfallRuntime=original;}
});
