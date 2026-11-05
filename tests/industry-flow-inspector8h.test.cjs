'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
const Flow=require('../src/physics/industry-flow8h.js');
const bodyId='star-0-p0',a=t=>[Math.cos(t),Math.sin(t),0];
const depot='facility8e:paid-depot',depotTarget='facility8e:paid-depot-dest',drive='facility8e:paid-belt',
 pipe='facility8e:paid-gas-pipe',source='facility8e:paid-o2-src',
 target='facility8e:paid-o2-dst';
function asset(id,kind,mass,volume,station,materialId,angle){
 const state={enabled:true,containerId:(kind==='industrial_vessel'?'vessel8e:':
  station==='pressure_pipeline'?'pressurepipe8h:':
  station==='conveyor_drive'?'conveyor8h:':'depot8h:')+id};
 if(station)Object.assign(state,{station,kitMaterialId:'plant_kit_'+station});
 if(station==='conveyor_drive')Object.assign(state,{kitMaterialId:'plant_kit_conveyor_drive',
  t02LoadId:'8h-port:'+id});
 if(station==='pressure_pipeline')Object.assign(state,{kitMaterialId:'plant_kit_pressure_pipeline',
  ratedPressurePa:8e6,t02LoadId:'8h-pipe-port:'+id});
 if(kind==='industrial_vessel')Object.assign(state,{materialId,ratedPressurePa:8e6});
 return{id,type:kind,massKg:mass,volumeM3:volume,condition:1,
  location:{kind:'surface',bodyId,local:a(angle)},state,provenance:'8F:actually-built'};
}
function base(){
 const machines=[asset(depot,'industrial_plant',480,1.8,'cargo_depot',null,0),
  asset(drive,'industrial_plant',180,.55,'conveyor_drive',null,.011),
  asset(depotTarget,'industrial_plant',480,1.8,'cargo_depot',null,.022),
  asset(pipe,'industrial_plant',320,.95,'pressure_pipeline',null,.04),
  asset(source,'industrial_vessel',195,4,null,'oxygen',.03),
  asset(target,'industrial_vessel',195,4,null,'oxygen',.05)];
 const physical8a={schema:1,assets:[
  {id:'ship-main',type:'ship',massKg:0,volumeM3:0,condition:1,
   location:{kind:'ship',slot:'self'},state:{}},
  {id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,condition:1,
   location:{kind:'surface',bodyId,local:a(-.01)},state:{}},
  ...machines],
  transfers:machines.map((x,i)=>({id:'plant8e:paid:'+i,
   action:'INSTALL',status:'COMMITTED',assetId:x.id,
   sourceLotId:'actual-manufactured-kit:'+i,massKg:x.massKg}))};
 const containers=[
  {id:'8d:ship-main:materials',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16},
  {id:'8d:truck-expedition-001:hopper',ownerId:'truck-expedition-001',maxMassKg:800,maxVolumeM3:1.2},
  {id:'depot8h:'+depot,ownerId:depot,kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
  {id:'depot8h:'+depotTarget,ownerId:depotTarget,kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
  {id:'conveyor8h:'+drive,ownerId:drive,kind:'guarded dry-solid conveyor tray',maxMassKg:40,maxVolumeM3:.05},
  {id:'pressurepipe8h:'+pipe,ownerId:pipe,kind:'sealed 8MPa gas pipe hold-up',maxMassKg:25,maxVolumeM3:.08},
  ...[source,target].map(id=>({id:'vessel8e:'+id,ownerId:id,kind:'rated gas vessel',maxMassKg:1000,maxVolumeM3:4}))];
 const ore={id:'8h:actual-depot-ore',materialId:'iron_ore',
  containerId:'depot8h:'+depot,massKg:20,volumeM3:.02,
  provenance:'real drilled 8D source after original driven truck',grade:.8};
 const oxygen={id:'real-electrolysis-o2',materialId:'oxygen',
  containerId:'vessel8e:'+source,massKg:2,volumeM3:.04,
  provenance:'real electrolysis plant',grade:1};
 const materials8a={schema:1,containers,lots:[ore,oxygen],operations:[]};
 const outpost5={schema:1,seed:742,items:[
  {id:'8h-port:'+drive,kind:'conveyor_drive',bodyId,enabled:true},
  {id:'8h-pipe-port:'+pipe,kind:'pressure_pipeline_pump',bodyId,enabled:true}],
  wires:[]};
 const s={bodyId,bodyRadius:1000,materials8a,physical8a,outpost5,
  conveyorPackets:{schema:1,jobs:[]},pressurePackets:{schema:1,jobs:[]},
  miningHistory:[{id:'8d:drill:real',type:'DRILL',status:'COMMITTED'}],
  logisticsOrders:[{id:'8h:ore-1',status:'DELIVERED'}],
  offworldManifests:[],surveys:2,refineryJob:null,
  factoryJob:null,factoryReceipts:0};
 return {s,ore,oxygen};
}
test('read-only physical stock mass, real survey+truck+depot evidence, explicit NO remote smelter graph edge',()=>{
 const {s}=base(),before=structuredClone(s),result=Flow.inspect(s);
 assert.deepEqual(s,before,'inspector must not debit/gift/mutate ANY authoritative original owner');
 assert.equal(result.sourceOwner,'original-8A');
 assert.equal(result.totals.lotCount,2);
 assert.equal(result.totals.totalMassKg,22);
 assert.equal(result.totals.depotKg,20);
 assert.equal(result.totals.realDepots,2);
 assert.equal(result.totals.realDrives,1);
 assert.equal(result.totals.installedPipes,1);
 assert.equal(result.totals.realGasVessels,2);
 assert.equal(result.connections.length,0,
  'a paid physical drive and a nearby depot do NOT imply an actual transport link/job');
 assert.ok(result.faults.some(x=>x.code==='NO_AUTOMATIC_DEPOT_TO_SMELTER'));
 assert.ok(result.stages.some(x=>x.id==='REFINE'&&x.state==='NO_SHIP_FEEDSTOCK'));
 assert.ok(result.stages.some(x=>x.id==='HAUL'&&x.state==='MATERIAL_AT_PHYSICAL_DEPOT'));
});
test('actual archived conveyor packet shows ONLY authentic same-world paid physical endpoints and source-owned 8A lot',()=>{
 const {s,ore}=base();s.conveyorPackets.jobs=[{
  id:'8h:physically-reserved',bodyId,
  sourceId:depot,driveIds:[drive],targetId:depotTarget,
  currentLotId:ore.id,materialId:ore.materialId,massKg:10,
  cursor:0,remainingS:15,status:'ACTIVE'}];
 const valid=Flow.inspect(s).connections[0];
 assert.equal(valid.kind,'POWERED_CONVEYOR');
 assert.equal(valid.sourcePaid,true);
 assert.equal(valid.realCustody,true);
 assert.equal(valid.massKg,10);
 assert.equal(valid.stage,0);
 const forged=structuredClone(s);
 forged.conveyorPackets.jobs[0].currentLotId='invented-free-ore';
 const bad=Flow.inspect(forged);
 assert.equal(bad.connections[0].realCustody,false);
 assert.ok(bad.faults.some(x=>x.code==='BROKEN_CUSTODY_LINK'));
 const fake=structuredClone(s);
 fake.conveyorPackets.jobs[0].targetId=source; // real gas vessel, NOT a paid dry cargo dock
 const f=Flow.inspect(fake);
 assert.equal(f.connections[0].sourcePaid,false,'never mislabel rated gas vessel as dry conveyor endpoint');
 const distant=structuredClone(s);
 distant.physical8a.assets.find(x=>x.id===depotTarget).location.local=a(.2);
 assert.equal(Flow.inspect(distant).connections[0].sourcePaid,false,
  'a 180m gap is NOT a physically connected 12m conveyor');
});
test('gas actually trapped inside certified 80-litre pipe remains its 8A lot and cannot become a fictitious destination balance',()=>{
 const {s,oxygen}=base();
 s.materials8a.lots[1].containerId='pressurepipe8h:'+pipe;
 s.pressurePackets.jobs=[{id:'real-pressure-1',bodyId,sourceId:source,
  pipeId:pipe,targetId:target,materialId:'oxygen',
  massKg:oxygen.massKg,currentLotId:oxygen.id,
  stage:1,remainingS:4100,status:'ACTIVE'}];
 const result=Flow.inspect(s),j=result.connections[0];
 assert.equal(j.kind,'RATED_PIPE');
 assert.equal(j.realCustody,true);
 assert.equal(j.stage,1);
 assert.equal(result.locations.find(x=>x.id==='pressurepipe8h:'+pipe).massKg,2);
 assert.equal(result.locations.find(x=>x.id==='vessel8e:'+target).massKg,0);
 assert.equal(result.totals.totalMassKg,22);
 const damaged=structuredClone(s);damaged.physical8a.transfers=[];
 const fail=Flow.inspect(damaged);
 assert.equal(fail.connections[0].sourcePaid,false);
 assert.ok(fail.faults.some(x=>x.code==='BROKEN_CUSTODY_LINK'));
});
test('in deep space, preserve all remote stored 8A lots but never claim a local powered conveyor or flag it falsely broken',()=>{
 const {s,ore}=base();
 s.conveyorPackets.jobs=[{id:'8h:distant-but-valid',bodyId,
  sourceId:depot,driveIds:[drive],targetId:depotTarget,
  currentLotId:ore.id,materialId:ore.materialId,massKg:10,
  cursor:0,remainingS:15,status:'ACTIVE'}];
 s.bodyId=null;s.bodyRadius=0;
 const source=structuredClone(s),x=Flow.inspect(s);
 assert.deepEqual(s,source,'world unload must NEVER mutate the original authoritative packet or ore');
 assert.equal(x.totals.totalMassKg,22,'real offworld ore continues to exist in its actual surface owner');
 assert.equal(x.totals.realDepots,0,'no current body means no LOCAL certified depot');
 assert.equal(x.connections.length,0,'remote packets are preserved but cannot be geometrically verified without a loaded world');
 assert.ok(!x.faults.some(f=>f.code==='BROKEN_CUSTODY_LINK'),'do not misreport a real distant route as broken due to unknown radius');
});
test('original nearby manufactured hardware without installation receipt never qualifies for industrial flow',()=>{
 const {s}=base();
 s.physical8a.transfers=[];
 const x=Flow.inspect(s);
 assert.equal(x.totals.realDepots,0);
 assert.equal(x.totals.realDrives,0);
 assert.equal(x.totals.installedPipes,0);
 assert.ok(x.faults.some(f=>f.code==='UNVERIFIED_OWNER'));
});
test('original Engineer/flight inspector is read-only, source loaded first and UI does not fabricate cargo',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../src/physics/industry-flow-live-ui8h.js'),'utf8');
 const source=fs.readFileSync(path.join(__dirname,'../src/physics/industry-flow8h.js'),'utf8');
 const moduleTag='src/physics/industry-flow8h.js',
  uiTag='src/physics/industry-flow-live-ui8h.js';
 assert.ok(html.includes(moduleTag)&&html.includes(uiTag));
 assert.ok(html.indexOf(moduleTag)<html.indexOf('src/flight.js'));
 assert.ok(html.indexOf(uiTag)>html.indexOf('src/flight.js'));
 assert.match(flight,/function industryFlowContext8H\(/);
 assert.match(flight,/industryFlowContext8H,logisticsConveyorContext8H/);
 for(const v of ['industry8h-refresh','industry8h-stages','industry8h-details',
  'industryFlowContext8H','original driven truck','manual'])
  assert.ok(ui.toLowerCase().includes(v.toLowerCase()),v);
 // Inspect executable code, not header text explaining that this module does NOT commit or use localStorage.
 const codeOnly=source.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(codeOnly,/StarfallPowerLedgerT02\.grid\(|\.commit\(|\.reserve\(|\.importLot\(|\.move\(|\.save\(|localStorage/);
 assert.doesNotMatch(ui,/\.commit\(|\.reserve\(|\.importLot\(|\.setShipPosition\(/);
});
