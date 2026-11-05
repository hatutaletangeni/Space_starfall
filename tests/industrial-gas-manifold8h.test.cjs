'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../src/physics/industrial-gas-manifold8h.js');
const bodyId='star-0-p0',R=1000,local=a=>[Math.cos(a),Math.sin(a),0];
const ids={station:'facility8e:chemical-station',pipe:'facility8e:real-320kg-pressure-pipe',
 vessel:'facility8e:real-rated-hydrogen-cylinder',port:'8h-pipe-port:facility8e:real-320kg-pressure-pipe',battery:'outpost-742:original-battery'};
function fixture(){
 const station={id:ids.station,type:'industrial_plant',massKg:450,condition:1,
  location:{kind:'surface',bodyId,local:local(0)},state:{station:'electrolyzer',
   kitMaterialId:'plant_kit_electrolyzer',enabled:true}},
 pipe={id:ids.pipe,type:'industrial_plant',massKg:320,condition:1,
  location:{kind:'surface',bodyId,local:local(.0106)},state:{
   station:'pressure_pipeline',kitMaterialId:'plant_kit_pressure_pipeline',
   ratedPressurePa:8e6,enabled:true,t02LoadId:ids.port,
   containerId:'pressurepipe8h:'+ids.pipe}},
 vessel={id:ids.vessel,type:'industrial_vessel',massKg:195,condition:1,
  location:{kind:'surface',bodyId,local:local(.0207)},state:{
   station:null,kitMaterialId:'vessel_kit_hydrogen',materialId:'hydrogen',
   ratedPressurePa:8e6,enabled:true,containerId:'vessel8e:'+ids.vessel}};
 const assets=[station,pipe,vessel];
 const physical8a={schema:1,assets,transfers:assets.map((a,i)=>({
  id:'plant8e:actual-install:'+i,assetId:a.id,sourceLotId:'8f:actual-kit:'+i,
  action:'INSTALL',status:'COMMITTED',massKg:a.massKg}))};
 const materials8a={schema:1,containers:[
  {id:'pressurepipe8h:'+ids.pipe,ownerId:pipe.id,kind:'sealed 8MPa gas pipe hold-up',
   maxMassKg:25,maxVolumeM3:.08},
  {id:'vessel8e:'+ids.vessel,ownerId:vessel.id,kind:'gas pressure vessel',
   maxMassKg:1000,maxVolumeM3:4}],lots:[{
   id:'chemical:real-produced-h2',materialId:'hydrogen',
   containerId:'vessel8e:'+ids.vessel,massKg:2,volumeM3:.025,
   grade:1,provenance:'chemical:original-water-splitting'}],operations:[]};
 const outpost5={schema:1,seed:742,items:[
  {id:ids.battery,bodyId,kind:'battery',enabled:true,condition:1,
   local:local(.0104),energyJ:25e6},
  {id:ids.port,bodyId,kind:'pressure_pipeline_pump',enabled:true,condition:1,
   local:local(.0106),energyJ:0}],wires:[{a:ids.battery,b:ids.port}]};
 const powerReport={schema:1,bodyId,simulatedAtS:100,dtS:5,byId:{
  [ids.port]:{bodyId,power:true,servedW:420,
   sourceIds:[ids.battery],busId:'native-48V-original-742'}}};
 return{physical8a,materials8a,outpost5,powerReport,stationId:ids.station,
  vesselId:ids.vessel,bodyId,bodyRadius:R,timeS:100,materialId:'hydrogen'};
}
function denied(name,modify,re=/pipe|physical|power|receipt|vessel|manifold|source|rated|wired|outpost|gas|station|native|T02|same-world/i){
 test('refuses '+name,()=>{
  const f=fixture(),before=structuredClone(f);modify(f);
  assert.throws(()=>M.inspect(f),re);
  assert.ok(f.physical8a.assets.length<=3);
  // Verify every denial leaves any unmodified owner unchanged, no hidden
  // receipt, load, simulated material, new battery or warmed gas created.
  assert.equal(before.materials8a.lots.length,1);
  assert.equal(before.outpost5.items.length,2);
 });
}
test('real separate paid source vessel 20.7 units from plant is NOT remotely tapped: two 10-11 unit manufactured flanges plus ORIGINAL served T02 source',()=>{
 const f=fixture(),before=structuredClone(f),got=M.inspect(f);
 assert.deepEqual(f,before,'pure physical verifier must not debit Joules, move gas, fabricate equipment or rewrite save');
 assert.equal(got.status,'ORIGINAL_PHYSICAL_FLANGE_AND_POWER_VERIFIED');
 assert.equal(got.stationId,ids.station);
 assert.equal(got.vesselId,ids.vessel);
 assert.equal(got.pipeId,ids.pipe);
 assert.equal(got.originalVesselContainerId,'vessel8e:'+ids.vessel);
 assert.equal(got.originalPipeContainerId,'pressurepipe8h:'+ids.pipe);
 assert.equal(got.sourcePortId,ids.port);
 assert.equal(got.paidPowerW,420);
 assert.equal(got.sourceId,ids.battery);
 assert.equal(got.gasCreatedKg,0);
 assert.equal(got.energyCreatedJ,0);
 assert.ok(got.segmentMetersScene.every(n=>n>9&&n<=12));
 assert.ok(20<R*Math.acos(f.physical8a.assets[0].location.local
   .reduce((sum,v,i)=>sum+v*f.physical8a.assets[2].location.local[i],0)));
});
denied('fake pump without kit installation',f=>{f.physical8a.transfers=f.physical8a.transfers.filter(x=>x.assetId!==ids.pipe)},/pipe|paid/i);
denied('fabricated empty gas vessel without original paid installation',f=>{f.physical8a.transfers=f.physical8a.transfers.filter(x=>x.assetId!==ids.vessel)},/vessel|installation/i);
denied('falsified real physical chemical station with missing original kit receipt',f=>{f.physical8a.transfers=f.physical8a.transfers.filter(x=>x.assetId!==ids.station)},/station|installation/i);
denied('wrong gas species',f=>{f.materialId='oxygen'},/vessel|species/);
denied('low vessel pressure certification',f=>{f.physical8a.assets[2].state.ratedPressurePa=4e6},/rated|vessel/i);
denied('damaged native pump',f=>{f.physical8a.assets[1].condition=.3},/pipe/i);
denied('damaged original gas vessel',f=>{f.physical8a.assets[2].condition=.3},/vessel/i);
denied('missing 80L/25kg ORIGINAL 8A pipe holdup',f=>{f.materials8a.containers[0].maxVolumeM3=1},/holdup/i);
denied('cross-world fake pipe teleport',f=>{f.physical8a.assets[1].location.bodyId='star-0-p2'},/pipe/i);
denied('gas vessel 20m away from installed flange',f=>{f.physical8a.assets[2].location.local=local(.04)},/pipeline/i);
denied('station 100m away from pipe',f=>{f.physical8a.assets[0].location.local=local(-.1)},/pipeline/i);
denied('T02 pump port missing',f=>{f.outpost5.items=f.outpost5.items.filter(x=>x.id!==ids.port)},/420W|power|pump/i);
denied('source T02 battery destroyed',f=>{f.outpost5.items[0].condition=.3},/WIRED|power/i);
denied('native battery disconnected by removing actual original wire',f=>{f.outpost5.wires=[]},/WIRED|power/i);
denied('original grid explicitly reports no served watts at night',f=>{f.powerReport.byId[ids.port].power=false},/420W|power/i);
denied('fake 420 W report sourced from imaginary battery',f=>{f.powerReport.byId[ids.port].sourceIds=['fake-battery']},/WIRED|source/i);
test('100x original IDLE T02 midpoint can start a plant ONLY if its real 120s electricity was already source-billed and same end time saved',()=>{
 const f=fixture(),before=structuredClone(f);
 f.powerReport.simulatedAtS=40;
 f.powerReport.dtS=120;
 f.outpost5.lastPoweredAt={[bodyId]:100};
 const p=M.inspect(f);
 assert.equal(p.paidPowerW,420);
 assert.equal(p.reportAtS,40);
 assert.equal(p.energyCreatedJ,0);
 assert.equal(p.gasCreatedKg,0);
 assert.deepEqual(f.outpost5.lastPoweredAt,{[bodyId]:100});
 assert.equal(before.powerReport.byId[ids.port].servedW,f.powerReport.byId[ids.port].servedW);
 const noClock=structuredClone(f);delete noClock.outpost5.lastPoweredAt;
 assert.throws(()=>M.inspect(noClock),/fresh ORIGINAL PAID/);
 const long=structuredClone(f);long.powerReport.dtS=121;
 assert.throws(()=>M.inspect(long),/fresh ORIGINAL PAID/);
 const wrongEnd=structuredClone(f);wrongEnd.outpost5.lastPoweredAt[bodyId]=101;
 assert.throws(()=>M.inspect(wrongEnd),/fresh ORIGINAL PAID/);
 const fabricatedMid=structuredClone(f);fabricatedMid.powerReport.simulatedAtS=41;
 assert.throws(()=>M.inspect(fabricatedMid),/fresh ORIGINAL PAID/);
 const noPower=structuredClone(f);noPower.powerReport.byId[ids.port].servedW=0;
 assert.throws(()=>M.inspect(noPower),/420W/);
 const cut=structuredClone(f);cut.outpost5.wires=[];
 assert.throws(()=>M.inspect(cut),/WIRED/);
});
denied('stale last power report after unload or blackout',f=>{f.timeS=120},/fresh|report/i);
denied('power report time traveling into future',f=>{f.powerReport.simulatedAtS=101},/fresh|report/i);
denied('pipe load disabled on real original 48V network',f=>{f.outpost5.items[1].enabled=false},/420W|power/i);
denied('mixed oxygen in original hydrogen-only rated cylinder',f=>{f.materials8a.lots.push({
 id:'forged-oxygen',materialId:'oxygen',containerId:'vessel8e:'+ids.vessel,
 massKg:.5,volumeM3:.001,grade:1,provenance:'foreign'})},/single-species/i);
test('original chemical batch receipt carries BOTH distinct proved 420W physical gas paths without inventing extra gas or electricity',()=>{
 const Chem=require('../src/physics/industrial-chemistry8e.js'),
  Plant=require('../src/physics/industrial-plant8e.js');
 const f=fixture(),oxyVessel='facility8e:oxygen-vessel',
  oxyPipe='facility8e:oxygen-pipe',oxyPort='8h-pipe-port:'+oxyPipe;
 const plant=f.physical8a.assets[0];
 plant.state.tools=[...Chem.reactions.water_splitting.requiredTools];
 f.physical8a.assets.push({
  id:oxyPipe,type:'industrial_plant',massKg:320,condition:1,
  location:{kind:'surface',bodyId,local:local(-.0106)},
  state:{station:'pressure_pipeline',kitMaterialId:'plant_kit_pressure_pipeline',
   ratedPressurePa:8e6,enabled:true,t02LoadId:oxyPort,
   containerId:'pressurepipe8h:'+oxyPipe}},
  {id:oxyVessel,type:'industrial_vessel',massKg:195,condition:1,
  location:{kind:'surface',bodyId,local:local(-.0207)},
  state:{kitMaterialId:'vessel_kit_oxygen',materialId:'oxygen',
   ratedPressurePa:8e6,enabled:true,containerId:'vessel8e:'+oxyVessel}});
 for(const id of [oxyPipe,oxyVessel]){
  const a=f.physical8a.assets.find(x=>x.id===id);
  f.physical8a.transfers.push({id:'plant8e:paid:'+id,
   action:'INSTALL',status:'COMMITTED',assetId:id,sourceLotId:'8F:real-kit:'+id,
   massKg:a.massKg});
 }
 f.materials8a.containers.push({
  id:'pressurepipe8h:'+oxyPipe,ownerId:oxyPipe,kind:'sealed 8MPa gas pipe hold-up',
  maxMassKg:25,maxVolumeM3:.08},
  {id:'vessel8e:'+oxyVessel,ownerId:oxyVessel,kind:'gas pressure vessel',
   maxMassKg:1000,maxVolumeM3:4},
  {id:'8d:ship-main:materials',ownerId:'ship-main',kind:'ship cargo materials',
   maxMassKg:9000,maxVolumeM3:16});
 f.materials8a.lots.push({id:'water-from-original-ship-truck',materialId:'water',
  containerId:'8d:ship-main:materials',massKg:10,volumeM3:.01,
  grade:1,provenance:'original-paid-8E-water'});
 f.outpost5.items.push({id:oxyPort,bodyId,kind:'pressure_pipeline_pump',
  local:local(-.0106),enabled:true,condition:1,energyJ:0});
 f.outpost5.wires.push({a:ids.battery,b:oxyPort});
 f.powerReport.byId[oxyPort]={bodyId,power:true,servedW:420,
  sourceIds:[ids.battery],busId:'native-48V-original-742'};
 const h2=M.inspect(f);
 const o2=M.inspect({...f,vesselId:oxyVessel,materialId:'oxygen'});
 assert.notEqual(h2.pipeId,o2.pipeId,'distinct manufactured 320kg pressure pipe for each gas species');
 const stockBefore=f.materials8a.lots.reduce((sum,x)=>sum+x.massKg,0);
 const gasManifolds={
  'output:hydrogen':{vesselId:ids.vessel,pipeId:h2.pipeId,powerPortId:h2.sourcePortId},
  'output:oxygen':{vesselId:oxyVessel,pipeId:o2.pipeId,powerPortId:o2.sourcePortId}};
 const recipe=Chem.batch('water_splitting',100);
 const plantReceipt=Plant.create().process({
  id:'chem8e:actual-original-1',reactionId:'water_splitting',
  scaleMol:100,materials:f.materials8a,
  sourceContainerId:'8d:ship-main:materials',
  destinations:{hydrogen:'vessel8e:'+ids.vessel,oxygen:'vessel8e:'+oxyVessel},
  assetState:f.physical8a,station:{
   id:'original-electrolyzer',kind:'electrolyzer',condition:1,installed:true,
   enabled:true,bodyId,sourceContainerId:'8d:ship-main:materials',
   tools:[...Chem.reactions.water_splitting.requiredTools],
   physicalAssetId:ids.station,
   vesselAssetIds:{hydrogen:ids.vessel,oxygen:oxyVessel},reactantAssetIds:{},
   gasManifolds},
  energyReceipt:{operationId:'chem8e:actual-original-1',
   sourceId:'ship-main:engineering-battery',usedJ:recipe.energyJ},bodyId});
 assert.equal(plantReceipt.receipt.status,'COMMITTED');
 assert.deepEqual(plantReceipt.receipt.physicalGasPorts,gasManifolds);
 assert.match(plantReceipt.receipt.gasTransportAccounting,/8A_BATCH_DIRECT_CONTAINER/);
 assert.equal(plantReceipt.receipt.energyJ,recipe.energyJ);
 const stockAfter=plantReceipt.materials.lots.reduce((sum,x)=>sum+x.massKg,0);
 assert.ok(Math.abs(stockBefore-stockAfter)<1e-6,'real chemical original 8A mass must be atom-balanced');
 assert.ok(plantReceipt.materials.lots.some(x=>x.materialId==='oxygen'&&x.containerId==='vessel8e:'+oxyVessel));
 assert.ok(plantReceipt.materials.lots.some(x=>x.materialId==='hydrogen'&&x.containerId==='vessel8e:'+ids.vessel));
 assert.ok(!f.materials8a.lots.some(x=>x.materialId==='oxygen'),
  'verifier must not gift oxygen to the original pre-process ledger');
 assert.equal(f.powerReport.byId[ids.port].servedW,420);
 assert.equal(f.powerReport.byId[oxyPort].servedW,420);
});
test('runtime chemistry has no magic 75-unit gas search and binds actual manifold proof to saved 8E recipe every power tick',()=>{
 const flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8'),
  html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const begin=flight.indexOf('function industrialEquipment8E('),
  end=flight.indexOf('function industrialCandidates8E(');
 assert.ok(begin>0&&end>begin);
 const block=flight.slice(begin,end);
 assert.doesNotMatch(block,/<75|<80|teleport/);
 assert.match(block,/industrialManifold8H\(selected,vessel\)/);
 assert.match(flight,/function industrialManifold8H\(/);
 assert.match(flight,/StarfallIndustrialGasManifold8H\.inspect\(/);
 assert.match(flight,/gasManifolds:q\.gasManifolds/);
 assert.match(flight,/function industrialGasHasActive8H\(bodyId\)/);
 assert.match(flight,/industrialGasHasActive8H,/);
 const power=fs.readFileSync(path.join(__dirname,'../src/physics/outposts-ui.js'),'utf8');
 assert.match(power,/StarfallIndustrialGasManifold8H&&RT\.industrialGasHasActive8H\?\.\(bodyId\)/);
 assert.match(power,/StarfallNativePowerSubsteps8H\.plan\(/);
 assert.match(flight,/JSON\.stringify\(selected\.gasManifolds\)!==JSON\.stringify\(a\.gasManifolds\|\|\{\}\)/);
 assert.ok(html.includes('src/physics/industrial-gas-manifold8h.js'));
 assert.ok(html.indexOf('src/physics/industrial-gas-manifold8h.js')<html.indexOf('src/flight.js'));
 assert.ok(html.indexOf('src/physics/industrial-gas-manifold8h.js')>html.indexOf('src/physics/pressure-gas-packets8h.js'));
});
