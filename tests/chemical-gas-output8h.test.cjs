'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path');
const Mat=require('../src/physics/material-ledger8a.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
require('../src/physics/pressure-gas-packets8h.js');
const Manifold=require('../src/physics/industrial-gas-manifold8h.js');
const Gas=require('../src/physics/chemical-gas-output8h.js');
const local=a=>[Math.cos(a),Math.sin(a),0],bodyId='star-0-p0',radius=1000;
const at=()=>({
 station:'facility8e:electrolyzer',battery:'original-48v:real-battery',
 pipeH:'facility8e:paid-h2pipe',pipeO:'facility8e:paid-o2pipe',
 vesselH:'facility8e:real-h2vessel',vesselO:'facility8e:real-o2vessel',
 portH:'8h:paid-h2-motor',portO:'8h:paid-o2-motor'});
const mass=m=>m.lots.reduce((s,x)=>s+x.massKg,0),close=(a,b,t=1e-6)=>
 assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function fixture(){
 const ids=at();
 const station={id:ids.station,type:'industrial_plant',massKg:450,
  condition:1,location:{kind:'surface',bodyId,local:local(0)},
  state:{station:'electrolyzer',kitMaterialId:'plant_kit_electrolyzer',
   tools:Chem.reactions.water_splitting.requiredTools,enabled:true}};
 const p=(id,loc,port)=>({id,type:'industrial_plant',massKg:320,
  volumeM3:.95,condition:1,location:{kind:'surface',bodyId,local:local(loc)},
  state:{station:'pressure_pipeline',kitMaterialId:'plant_kit_pressure_pipeline',
   tools:['pressure_regulator','relief_valve'],enabled:true,
   ratedPressurePa:8e6,containerId:'pipe:'+id,t02LoadId:port}});
 const v=(id,loc,sp)=>({id,type:'industrial_vessel',
  massKg:sp==='hydrogen'?160:195,volumeM3:4,condition:1,
  location:{kind:'surface',bodyId,local:local(loc)},
  state:{station:null,kitMaterialId:'vessel_kit_'+sp,enabled:true,
   materialId:sp,ratedPressurePa:8e6,containerId:'tank:'+id}});
 const assets=[station,p(ids.pipeH,.0102,ids.portH),
  p(ids.pipeO,-.0102,ids.portO),v(ids.vesselH,.0204,'hydrogen'),
  v(ids.vesselO,-.0204,'oxygen')];
 const physical8a={schema:1,assets,
  transfers:assets.map((a,i)=>({id:'plant8e:paid-install:'+i,assetId:a.id,
   sourceLotId:'real8Fmanufactured:kit'+i,massKg:a.massKg,
   status:'COMMITTED',action:'INSTALL'}))};
 const ledger=Mat.create();
 ledger.registerContainer({id:'8d:ship-main:materials',ownerId:'ship-main',
  kind:'ship materials',maxMassKg:9000,maxVolumeM3:12});
 for(const a of assets.filter(x=>x.type==='industrial_plant'&&x.state.station==='pressure_pipeline'))
  ledger.registerContainer({id:a.state.containerId,ownerId:a.id,
   kind:'sealed 8MPa gas pipe hold-up',maxMassKg:25,maxVolumeM3:.08});
 for(const a of assets.filter(x=>x.type==='industrial_vessel'))
  ledger.registerContainer({id:a.state.containerId,ownerId:a.id,
   kind:'gas rated pressure vessel',maxMassKg:1000,maxVolumeM3:4});
 ledger.importLot({id:'mine:8Crealice:original-water',materialId:'water',
  containerId:'8d:ship-main:materials',massKg:10,volumeM3:.01,
  grade:1,provenance:'original-mine-and-purification'});
 const gasManifolds={
  'output:hydrogen':{vesselId:ids.vesselH,pipeId:ids.pipeH,powerPortId:ids.portH},
  'output:oxygen':{vesselId:ids.vesselO,pipeId:ids.pipeO,powerPortId:ids.portO}};
 const stationProof={id:ids.station,kind:'electrolyzer',condition:1,
  installed:true,enabled:true,bodyId,sourceContainerId:'8d:ship-main:materials',
  tools:Chem.reactions.water_splitting.requiredTools,physicalAssetId:ids.station,
  vesselAssetIds:{hydrogen:ids.vesselH,oxygen:ids.vesselO},
  reactantAssetIds:{},gasManifolds,gasOutputStaged8H:true};
 const native={schema:1,items:[
  {id:ids.battery,bodyId,kind:'battery',condition:1,enabled:true,
    local:local(0),energyJ:30e6},
  {id:ids.portH,bodyId,kind:'pressure_pipeline_pump',condition:1,
   enabled:true,local:local(.0102)},
  {id:ids.portO,bodyId,kind:'pressure_pipeline_pump',condition:1,
   enabled:true,local:local(-.0102)}],
  wires:[{a:ids.battery,b:ids.portH},{a:ids.battery,b:ids.portO}],
  lastPoweredAt:{[bodyId]:0}};
 const makeReport=t=>({schema:1,bodyId,simulatedAtS:t,dtS:10,byId:{
  [ids.portH]:{bodyId,power:true,servedW:420,
   sourceIds:[ids.battery],busId:ids.battery},
  [ids.portO]:{bodyId,power:true,servedW:420,
   sourceIds:[ids.battery],busId:ids.battery}}});
 return{ids,physical8a,materials8a:ledger.snapshot(),stationProof,gasManifolds,
  native,makeReport};
}
function produce(f){
 const r=Chem.batch('water_splitting',50),proc=Plant.create().process({
  id:'chem8e:1',reactionId:'water_splitting',scaleMol:50,
  materials:f.materials8a,sourceContainerId:'8d:ship-main:materials',
  destinations:{hydrogen:'pipe:'+f.ids.pipeH,oxygen:'pipe:'+f.ids.pipeO},
  assetState:f.physical8a,station:f.stationProof,
  energyReceipt:{operationId:'chem8e:1',sourceId:'ship-main:engineering-battery',
   usedJ:r.energyJ},bodyId});
 return proc;
}
test('staged 8E chemistry cannot bypass a missing oxygen pipeline by crediting its destination vessel directly',()=>{
 const f=fixture(),before=structuredClone(f.materials8a),
  routes=structuredClone(f.stationProof);
 delete routes.gasManifolds['output:oxygen'];
 assert.throws(()=>Plant.create().process({
  id:'chem8e:missing-oxygen-route',reactionId:'water_splitting',scaleMol:50,
  materials:before,sourceContainerId:'8d:ship-main:materials',
  destinations:{hydrogen:'pipe:'+f.ids.pipeH,oxygen:'tank:'+f.ids.vesselO},
  assetState:f.physical8a,station:routes,
  energyReceipt:{operationId:'chem8e:missing-oxygen-route',
   sourceId:'ship-main:engineering-battery',
   usedJ:Chem.batch('water_splitting',50).energyJ},bodyId
 }),/missing paid physical output pressure pipeline: oxygen/);
 // A missing HYDROGEN line must also reject a valid balanced
 // electrolysis job; the guard is species-generic, never oxygen-specific.
 const noHydrogen=structuredClone(f.stationProof);
 delete noHydrogen.gasManifolds['output:hydrogen'];
 assert.throws(()=>Plant.create().process({
  id:'chem8e:missing-hydrogen-route',reactionId:'water_splitting',
  scaleMol:50,materials:before,sourceContainerId:'8d:ship-main:materials',
  destinations:{hydrogen:'tank:'+f.ids.vesselH,
   oxygen:'pipe:'+f.ids.pipeO},
  assetState:f.physical8a,station:noHydrogen,
  energyReceipt:{operationId:'chem8e:missing-hydrogen-route',
   sourceId:'ship-main:engineering-battery',
   usedJ:Chem.batch('water_splitting',50).energyJ},bodyId
 }),/missing paid physical output pressure pipeline: hydrogen/);
 assert.deepEqual(before,f.materials8a,
  'neither gas bypass can consume original 8A reagent or credit a distant vessel');
});
test('real original 80L manufactured output pipe REFUSES an oversized 100-mol hydrogen batch, never fabricates larger tank capacity',()=>{
 const f=fixture(),before=structuredClone(f.materials8a),scaleMol=100;
 assert.throws(()=>Plant.create().process({
  id:'chem8e:oversized',reactionId:'water_splitting',scaleMol,
  materials:before,sourceContainerId:'8d:ship-main:materials',
  destinations:{hydrogen:'pipe:'+f.ids.pipeH,oxygen:'pipe:'+f.ids.pipeO},
  assetState:f.physical8a,station:f.stationProof,
  energyReceipt:{operationId:'chem8e:oversized',
   sourceId:'ship-main:engineering-battery',
   usedJ:Chem.batch('water_splitting',scaleMol).energyJ},bodyId
 }),/Output tank full|gas exceeds pipe/i);
 assert.deepEqual(before,f.materials8a,'oversized 100mol must not silently enlarge or consume original 8A stock');
});
test('existing original NON-GAS 8E glass furnace remains operable with no output pipe, no phantom 420W load and no material regression',()=>{
 const f=fixture(),silica=structuredClone(f.materials8a);
 silica.lots[0].materialId='silicon_dioxide';
 silica.lots[0].provenance='original-real-purified-silica';
 const machine=f.physical8a.assets.find(x=>x.id===f.ids.station);
 machine.state.station='glass_furnace';
 machine.state.tools=[...Chem.reactions.glass_fusing.requiredTools];
 const station={...f.stationProof,kind:'glass_furnace',
  tools:Chem.reactions.glass_fusing.requiredTools,
  vesselAssetIds:{},gasManifolds:{},gasOutputStaged8H:true};
 const job='chem8e:real-silica';
 const proc=Plant.create().process({
  id:job,reactionId:'glass_fusing',scaleMol:10,materials:silica,
  sourceContainerId:'8d:ship-main:materials',
  destinations:{glass:'8d:ship-main:materials'},
  assetState:f.physical8a,station,bodyId,
  energyReceipt:{operationId:job,sourceId:'original-ship-battery',
   usedJ:Chem.batch('glass_fusing',10).energyJ}});
 assert.equal(proc.receipt.status,'COMMITTED');
 assert.ok(proc.materials.lots.some(x=>x.materialId==='glass'));
 close(mass(proc.materials),mass(silica));
 const q=Gas.create().prepare({materials8a:proc.materials,
  physical8a:f.physical8a,receipt:proc.receipt,
  gasManifolds:{},bodyId,bodyRadius:radius,timeS:0});
 assert.equal(q.changed,false,'valid solid-only 8E job must not create a fake gas pipe');
 assert.deepEqual(q.materials8a,proc.materials);
 assert.equal(q.transit.jobs.length,0);
 assert.equal(q.additionalElectricalDebitJ,0);
});
test('real atom-balanced 8E chemical job credits BOTH products only to their finite, source-paid physical 80L 8A pipe—not destination vessels',()=>{
 const f=fixture(),before=structuredClone(f.materials8a),proc=produce(f);
 close(mass(before),mass(proc.materials));
 assert.equal(f.materials8a.lots.length,1,'nonmutating original source ledger');
 for(const [sp,id,pipe] of [
  ['hydrogen',f.ids.vesselH,f.ids.pipeH],
  ['oxygen',f.ids.vesselO,f.ids.pipeO]]){
  assert.equal(proc.materials.lots.filter(x=>x.containerId==='tank:'+id).length,0,
   'no instant gas credit to receiver vessel');
  const l=proc.materials.lots.find(x=>x.materialId===sp);
  assert.equal(l.containerId,'pipe:'+pipe);
  assert.equal(l.provenance,'chemical:chem8e:1');
 }
 assert.match(proc.receipt.gasTransportAccounting,/ORIGINAL_80L_PIPE/);
 assert.deepEqual(proc.receipt.physicalGasPorts,f.gasManifolds);
 assert.equal(proc.receipt.energyJ,Chem.batch('water_splitting',50).energyJ);
 const staged=Gas.create().prepare({materials8a:proc.materials,
  physical8a:f.physical8a,receipt:proc.receipt,gasManifolds:f.gasManifolds,
  bodyId,bodyRadius:radius,timeS:0});
 assert.equal(staged.createdKg,0);
 assert.equal(staged.additionalElectricalDebitJ,0);
 assert.equal(staged.jobs.length,2);
 close(mass(staged.materials8a),mass(f.materials8a));
 assert.equal(staged.materials8a.operations.filter(x=>x.status==='RESERVED').length,2);
 assert.throws(()=>Gas.create(staged.transit).prepare({
  materials8a:proc.materials,physical8a:f.physical8a,
  receipt:proc.receipt,gasManifolds:f.gasManifolds,
  bodyId,bodyRadius:radius,timeS:0}),/duplicate|already transporting/i);
 const fake=structuredClone(proc.receipt);fake.physicalGasPorts={};
 assert.throws(()=>Gas.create().prepare({
  materials8a:proc.materials,physical8a:f.physical8a,
  receipt:fake,gasManifolds:f.gasManifolds,bodyId,bodyRadius:radius,timeS:0}),
  /authenticated physical/);
});
function advance(f,stage,frames,{blackoutAt=-1,reloadAt=-1}={}){
 let state=stage.transit,materials=stage.materials8a,observations=[];
 for(const t of frames){
  if(t===reloadAt){
   state=Gas.create(JSON.parse(JSON.stringify(state))).snapshot();
   materials=Mat.create(JSON.parse(JSON.stringify(materials))).snapshot();
  }
  f.native.lastPoweredAt[bodyId]=t;
  const report=f.makeReport(t);
  if(t===blackoutAt)for(const x of Object.values(report.byId)){
   x.power=false;x.servedW=0;x.sourceIds=[];
  }
  const q=Gas.create(state).observe({materials8a:materials,
   physical8a:f.physical8a,outpost5:f.native,powerReport:report,
   bodyId,bodyRadius:radius,timeS:t});
  state=q.transit;materials=q.materials8a;observations.push(q);
  close(mass(materials),mass(f.materials8a));
 }
 return{state,materials,observations};
}
test('native REAL 420W×two pumps at 1x/10x/100x drains original stored 8A gas only after power/time, save/reload and verified physical pipe→tank receipts',()=>{
 const f=fixture(),proc=produce(f);
 const stage=Gas.create().prepare({materials8a:proc.materials,
  physical8a:f.physical8a,receipt:proc.receipt,
  gasManifolds:f.gasManifolds,bodyId,bodyRadius:radius,timeS:0});
 const dry=advance(f,stage,[10]);
 assert.ok(dry.state.jobs.every(x=>x.status==='ACTIVE'));
 assert.ok(dry.materials.lots.filter(x=>x.containerId.startsWith('tank:')).length===0);
 assert.ok(dry.state.jobs.every(x=>x.paidJ===4200));
 const result=advance(f,stage,[10,20,30,40,50,60],{blackoutAt:20,reloadAt:30});
 assert.ok(result.state.jobs.every(x=>x.status==='DELIVERED'),result.state);
 assert.equal(result.materials.operations.filter(x=>x.status==='COMMITTED').length,2);
 assert.equal(result.materials.lots.filter(x=>x.containerId.startsWith('pipe:')).length,0);
 assert.equal(result.materials.lots.filter(x=>x.containerId.startsWith('tank:')).length,2);
 close(mass(result.materials),mass(proc.materials));
 for(const job of result.state.jobs){
  assert.equal(job.outputLotId,'transfer:'+job.id);
  assert.ok(job.paidJ>0&&job.remainingS===0);
  assert.ok(job.completionS>=30);
  const lot=result.materials.lots.find(x=>x.id===job.outputLotId);
  assert.equal(lot.containerId,'tank:'+job.vesselId);
  close(lot.massKg,job.massKg);
 }
 const replay=Gas.create(result.state).observe({materials8a:result.materials,
  physical8a:f.physical8a,outpost5:f.native,powerReport:f.makeReport(60),
  bodyId,bodyRadius:radius,timeS:60});
 assert.equal(replay.changed,false,'duplicate native tick must NOT give gas twice');
 assert.deepEqual(replay.materials8a,result.materials);
});
test('all gas holds in physical 8A pipe when actual native wire cut, brownout or >10s unobserved timestep; no free gas or fake battery debit',()=>{
 const f=fixture(),proc=produce(f),stage=Gas.create().prepare({
  materials8a:proc.materials,physical8a:f.physical8a,
  receipt:proc.receipt,gasManifolds:f.gasManifolds,bodyId,
  bodyRadius:radius,timeS:0});
 f.native.wires=[];
 let q=Gas.create(stage.transit).observe({
  materials8a:stage.materials8a,physical8a:f.physical8a,
  outpost5:f.native,powerReport:f.makeReport(10),bodyId,bodyRadius:radius,timeS:10});
 assert.ok(q.transit.jobs.every(x=>x.paidJ===0));
 assert.ok(q.materials8a.lots.some(x=>x.containerId.startsWith('pipe:')));
 f.native.wires=[{a:f.ids.battery,b:f.ids.portH},{a:f.ids.battery,b:f.ids.portO}];
 q=Gas.create(q.transit).observe({materials8a:q.materials8a,
  physical8a:f.physical8a,outpost5:f.native,
  powerReport:{...f.makeReport(50),dtS:40},bodyId,bodyRadius:radius,timeS:50});
 assert.ok(q.transit.jobs.every(x=>x.paidJ===0),'unobserved 40s cannot fake solar source');
 assert.equal(q.materials8a.operations.filter(x=>x.status==='COMMITTED').length,0);
});
test('runtime contains ONLY the native T02 already-paid original gas output callback, exact save/readback and source/PLAY parity scripts',()=>{
 const flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8'),
  outpost=fs.readFileSync(path.join(__dirname,'../src/physics/outposts-ui.js'),'utf8'),
  html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(flight,/chemicalGasOutput8h:chemicalGasOutput8h\.snapshot\(\)/);
 assert.match(flight,/function industrialGasOutputNativeTick8H\(/);
 assert.match(flight,/StarfallChemicalGasOutput8H\.create\(chemicalGasOutput8h\.snapshot\(\)\)/);
 assert.match(flight,/StarfallChemicalGasOutput8H\.create\(session\.chemicalGasOutput8h\)/);
 assert.match(outpost,/RT\.industrialGasOutputNativeTick8H\(/);
 assert.match(outpost,/outpost5:durableSnapshot\(\),powerReport:report/);
 assert.ok(html.includes('src/physics/chemical-gas-output8h.js'));
 assert.ok(html.indexOf('src/physics/chemical-gas-output8h.js')<html.indexOf('src/flight.js'));
});
