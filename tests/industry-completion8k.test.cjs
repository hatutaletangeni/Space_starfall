/* Isolated protocol fixtures for new owners; not a no-cheat expedition claim. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/physics/material-ledger8a.js'),A=require('../src/physics/assembly8g.js');
const F=require('../src/physics/rocket-flight7b.js');require('../src/physics/atmosphere-emission8j.js');
const C=require('../src/physics/industry-completion8k.js'),H=require('../src/physics/habitat-t09.js');
const close=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<=eps,`${a} != ${b}`);
function rocket(){const ledger=M.create(),assets=[];
 for(const [id,kg,mw]of [['hydrogen',3,.002016],['oxygen',30,.031998]]){
  ledger.registerContainer({id:'tank:'+id,ownerId:id,kind:'gas vessel',maxMassKg:1000,maxVolumeM3:4});
  ledger.importLot({id:'source:'+id,materialId:id,massKg:kg,volumeM3:kg/mw*8.314462618*293.15/5e6,grade:1,containerId:'tank:'+id,provenance:'chemical:electrolysis:1'});
  assets.push({id,type:'industrial_vessel',condition:1,massKg:195,volumeM3:4,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{materialId:id,containerId:'tank:'+id,ratedPressurePa:8e6,enabled:true}});
 }
 const parts=Object.entries(A.DEFINITIONS.rocket_stage.parts).map(([materialId,massKg])=>({materialId,massKg,lotId:'produced:'+materialId})),massKg=parts.reduce((s,l)=>s+l.massKg,0);
 assets.push({id:'rig',type:'industrial_plant',massKg:900,condition:1,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{station:'rocket_integration'}},
  {id:'stage',type:'rocket_stage_dry',provenance:'structural-8g:stage',massKg,volumeM3:3,condition:1,location:{kind:'surface',bodyId:'a',local:[0,1,0]},state:{assemblyFacilityId:'rig'}});
 return{operationId:'rocket8g:1',materials:ledger.snapshot(),physical:{schema:1,assets,transfers:[]},shipEnergyJ:10e6,timeS:1,body:{id:'a',systemId:'s',landable:true,radius:1000,gravity:.04,atmosphere:null},launchUp:[0,1,0],stageId:'stage',hydrogenVesselId:'hydrogen',oxygenVesselId:'oxygen',hydrogenKg:2,assembly:{schema:1,receipts:[{assetId:'stage',blueprintId:'rocket_stage',status:'ASSEMBLED_NOT_OPERATIONAL',massKg,consumedLots:parts}]},launchStore:{schema:1,seed:742,serial:0,launches:[],satellites:[],rovers:[]}};
}
test('manufactured prototype transfers dry ownership and real propellant into native variable-mass flight',()=>{
 const a=rocket(),before=structuredClone(a),q=C.launch(a),mission=q.mission;
 assert.deepEqual(a,before);assert.equal(q.shipEnergyJ,7e6);assert.ok(!q.physical.assets.some(x=>x.id==='stage'));
 close(F.totalMass(mission.flight,mission.profile),mission.sourceStage.massKg+18);
 close(a.materials.lots.reduce((s,l)=>s+l.massKg,0)-q.materials.lots.reduce((s,l)=>s+l.massKg,0),18.36);
 assert.equal(q.launchStore.satellites.length,0);F.advance(mission.flight,mission.profile,5);
 assert.ok(mission.flight.x>mission.profile.radiusM,'Real force integration must produce ascent: '+JSON.stringify(mission.flight));
 assert.ok(mission.flight.stageFuelKg[0]<18&&mission.flight.stageFuelKg[0]>=0);
 assert.throws(()=>C.launch({...a,materials:q.materials,physical:q.physical,launchStore:q.launchStore}),/already committed/);
});
test('launch rejects missing manufactured propulsion, missing source gas, tank overfill and insufficient thrust',()=>{
 for(const mutation of [a=>a.assembly.receipts[0].consumedLots.pop(),a=>a.materials.lots.pop(),a=>a.hydrogenKg=8,a=>a.body.gravity=20,a=>a.shipEnergyJ=0]){
  const a=rocket();mutation(a);const before=structuredClone(a);assert.throws(()=>C.launch(a));assert.deepEqual(a,before);
 }
});
function loop(){return{operationId:'loop8i:1',shipEnergyJ:2e6,containerId:'ship',factory:{receipts:[{id:'fab:1',recipeId:'habitat_recycler',status:'COMMITTED'}]},
 materials:{schema:1,containers:[{id:'ship',ownerId:'ship-main',kind:'ship',maxMassKg:9000,maxVolumeM3:16}],lots:[{id:'kit',materialId:'habitat_recycler',massKg:40,volumeM3:.1,grade:1,containerId:'ship',provenance:'process:fab:1'}],operations:[]},
 habitat:{id:'hab',kind:'hab',bodyId:'a',physicalAssetId:'shell',habT09:{schema:1,greenhouse8i:{installed:true,cropBiomassKg:.2,nutrientKg:.2},waterL:10,oxygenMol:100,carbonMol:1,occupants:1,enabled:true,airlock:'CLOSED'}},
 physical:{schema:1,assets:[{id:'shell',type:'habitat_envelope',massKg:985.4,location:{kind:'surface',bodyId:'a'},state:{}}]}};}
const cabinMass=h=>h.waterL+h.oxygenMol*.031998+h.carbonMol*.04401+h.greenhouse8i.cropBiomassKg+h.greenhouse8i.nutrientKg+h.regenerative8i.wasteWaterKg+h.regenerative8i.brineKg;
test('paid manufactured recycler preserves mass through food respiration, nutrient return and wastewater recovery',()=>{
 const a=loop(),before=structuredClone(a),q=C.installLoop(a);assert.deepEqual(a,before);close(q.physical.assets[0].massKg,1025.4);assert.equal(q.materials.lots.length,0);
 const h=q.habitat.habT09,start=cabinMass(h);C.crew(h,60,true);close(cabinMass(h),start);
 assert.ok(h.regenerative8i.recoveredWaterKg>0&&h.regenerative8i.brineKg>0&&h.regenerative8i.processingJ>0);
 assert.ok(h.greenhouse8i.nutrientKg>.2&&h.greenhouse8i.cropBiomassKg<.2);
 const stored=JSON.parse(JSON.stringify(q));assert.throws(()=>C.installLoop({...a,habitat:stored.habitat}),/already installed/);
 const r=h.regenerative8i.recoveredWaterKg;C.crew(h,60,false);assert.equal(h.regenerative8i.recoveredWaterKg,r);close(cabinMass(h),start);
 h.greenhouse8i.cropBiomassKg=.02;C.crew(h,60,true);assert.ok(h.regenerative8i.lastStarvedMol>0);
});
test('native T09 preserves recycler on reload and does not double-charge old crew metabolism',()=>{
 const q=C.installLoop(loop()),hab=q.habitat;hab.condition=1;hab.enabled=true;
 const h=H.ensure(hab,0);h.lastS=0;h.occupants=1;h.enabled=true;h.awaitingReview=false;
 H.step(hab,{pressureKPa:0,temperatureK:293.15},10,true);
 assert.ok(hab.habT09.regenerative8i.foodConsumedKg>0);
 assert.ok(H.ensure(JSON.parse(JSON.stringify(hab)),10).regenerative8i.recoveredWaterKg>0);
});
function world(){return{schema:1,bodyId:'a',radiusM:1000,gravityMS2:1,baselineAtmosphereKg:1000000,atmosphereKg:1000100,pressurePa:(1000100)/(4*Math.PI*1e6),netAddedKg:100,pressureDeltaPa:100/(4*Math.PI*1e6),emittedSpeciesKg:{oxygen:100},receipts:[],lastTimeS:0};}
test('capture transfers finite inventoried atmosphere to pressure-bounded 8A vessel with source energy and no baseline fabrication',()=>{
 const w=world(),profile={id:'a',radiusM:1000,surfaceGravityMS2:1,atmospherePressurePa:1e6/(4*Math.PI*1e6),mu:1e6},a=rocket();
 a.physical.assets.push({id:'collector',type:'industrial_plant',massKg:740,condition:1,location:{kind:'surface',bodyId:'a'},state:{station:'atmospheric_capture',enabled:true}});a.physical.transfers.push({assetId:'collector',action:'INSTALL',status:'COMMITTED',massKg:740,sourceLotId:'manufactured-kit'});
 const input={collectorId:'collector',operationId:'capture8j:1',world:w,profile,materials:a.materials,physical:a.physical,vesselId:'oxygen',kg:1,shipEnergyJ:20e6,timeS:10,protectedWorld:false,landable:true};
 const q=C.capture(input);close(q.world.netAddedKg,99);close(M.create(q.materials).used('tank:oxygen').massKg,31);
 close(q.world.netAddedKg+M.create(q.materials).inventory().reduce((s,l)=>s+l.massKg,0),100+a.materials.lots.reduce((s,l)=>s+l.massKg,0));
 assert.ok(q.shipEnergyJ<18e6);assert.throws(()=>C.capture({...input,protectedWorld:true}),/Protected/);
 assert.throws(()=>C.capture({...input,world:{...w,emittedSpeciesKg:{}}}),/No inventoried/);
 assert.throws(()=>C.capture({...input,world:q.world,materials:q.materials}),/already committed/);
});
test('greybody climate responds slowly to source CO2, conserves stored heat, and exposes the same visual column opacity',()=>{
 const profile={radiusM:1e6,albedo:.3},w={netAddedKg:1e16,emittedSpeciesKg:{carbon_dioxide:1e16}};
 C.climate(w,profile,1000,0);const cold=w.climate8j.anomalyK;C.climate(w,profile,1000,86400);
 assert.ok(w.climate8j.anomalyK>cold&&w.climate8j.anomalyK<1);
 close(w.climate8j.storedHeatJ,4e8*4*Math.PI*1e12*w.climate8j.anomalyK,100);
 assert.ok(w.climate8j.hazeOpacity>0);const old=structuredClone(w);C.climate(w,profile,1000,86400);assert.deepEqual(w,old);
 w.capturedSpeciesKg={carbon_dioxide:1e16};w.netAddedKg=0;C.climate(w,profile,1000,172800);
 assert.ok(w.climate8j.anomalyK<old.climate8j.anomalyK);assert.equal(w.climate8j.hazeOpacity,0);
 assert.throws(()=>C.climate(w,profile,1000,1e9),/bounded/);
});

test('a single kilogram retains sub-ULP thermal and optical changes without magnification',()=>{
 const w={netAddedKg:1,emittedSpeciesKg:{carbon_dioxide:1}},p={radiusM:6e6,albedo:.3};
 C.climate(w,p,1360,0);C.climate(w,p,1360,1);
 assert.ok(w.climate8j.anomalyK>0&&w.climate8j.anomalyK<1e-15);
 assert.ok(w.climate8j.hazeOpacity>0&&w.climate8j.hazeOpacity<1e-15);
});

test('runtime operation arguments cannot replace authoritative stock, physical owners or battery',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(require.resolve('../src/flight.js'),'utf8');
 const text=src.slice(src.indexOf('function industryCompletion8K('),src.indexOf('function atmosphericRelease8J('));
 const a=rocket(),context={atmosphericContext8J:()=>({bodyId:'a',landed:true,eva:true,powered:true}),
  vehicleStore:{get:()=>({state:{energyJ:12345678}})},SF:{storageStatus:()=>({durable:true})},
  evaLocal:[0,1,0],shipLocal:[0,1,0],nearest:a.body,simTime:10,
  physical8a:{get:id=>a.physical.assets.find(x=>x.id===id),serialize:()=>a.physical},
  materials8a:{snapshot:()=>a.materials},vehicleAssembly8g:{snapshot:()=>a.assembly},
  StarfallOutposts:{arc:()=>0},V:{rot:x=>x},
  StarfallIndustryCompletion8K:{launch:input=>{assert.equal(input.shipEnergyJ,12345678);
   assert.equal(input.materials,a.materials);assert.equal(input.physical,a.physical);assert.equal(input.body,a.body);throw Error('VALIDATED_NATIVE_OWNERS');}},
  StarfallLaunchUI:{store:{serialize:()=>a.launchStore}}};
 context.window=context;vm.createContext(context);vm.runInContext(text,context);
 assert.throws(()=>context.industryCompletion8K('rocket8g',{stageId:'stage',hydrogenVesselId:'hydrogen',oxygenVesselId:'oxygen',
  hydrogenKg:2,materials:{lots:['invented']},physical:{assets:['invented']},shipEnergyJ:1e100,body:{id:'fake'}}),/VALIDATED_NATIVE_OWNERS/);
});
