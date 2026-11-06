'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const Mat=require('../src/physics/material-ledger8a.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const Out=require('../src/physics/chemical-gas-output8h.js');
require('../src/physics/pressure-gas-packets8h.js');
const Manifold=require('../src/physics/industrial-gas-manifold8h.js');
const In=require('../src/physics/chemical-gas-input8h.js');
const bodyId='star-0-p0',R=1000,local=x=>[Math.cos(x),Math.sin(x),0],
close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,a+' != '+b);
const mass=s=>s.lots.reduce((n,l)=>n+l.massKg,0);
function fixture(){
 const station='8e:paid-sabatier',h='8e:original-h2-vessel',co='8e:original-co2-vessel',
  ph='8e:manufactured-h2-pipe',pc='8e:manufactured-co2-pipe',
  bh='t02:real-h2-420w',bc='t02:real-co2-420w',battery='t02:real-solar-battery';
 const plant={id:station,type:'industrial_plant',condition:1,massKg:450,
  location:{kind:'surface',bodyId,local:local(0)},
  state:{station:'catalytic_reactor',kitMaterialId:'plant_kit_catalytic_reactor',
    enabled:true,tools:Chem.reactions.sabatier.requiredTools}};
 const mkpipe=(id,port,angle)=>({id,type:'industrial_plant',
  condition:1,massKg:320,volumeM3:0.95,
  location:{kind:'surface',bodyId,local:local(angle)},
  state:{station:'pressure_pipeline',kitMaterialId:'plant_kit_pressure_pipeline',
   enabled:true,containerId:'pipe:'+id,t02LoadId:port,ratedPressurePa:8e6}});
 const mktank=(id,sp,angle)=>({id,type:'industrial_vessel',
  condition:1,massKg:195,volumeM3:4,
  location:{kind:'surface',bodyId,local:local(angle)},
  state:{materialId:sp,kitMaterialId:'vessel_kit_'+sp,enabled:true,
   containerId:'tank:'+id,ratedPressurePa:8e6}});
 const assets=[plant,mkpipe(ph,bh,.01),mkpipe(pc,bc,-.01),
  mktank(h,'hydrogen',.02),mktank(co,'carbon_dioxide',-.02)];
 const physical8a={schema:1,assets,transfers:assets.map((a,i)=>({
  id:'receipt:original8e:'+i,action:'INSTALL',status:'COMMITTED',
  assetId:a.id,sourceLotId:'real-made8f:kit:'+i,massKg:a.massKg}))};
 const ledger=Mat.create();
 for(const a of assets.filter(x=>x.type==='industrial_vessel'))
  ledger.registerContainer({id:a.state.containerId,ownerId:a.id,
   kind:'gas rated pressure vessel',maxMassKg:1000,maxVolumeM3:4});
 for(const a of assets.filter(x=>x.state.station==='pressure_pipeline'))
  ledger.registerContainer({id:a.state.containerId,ownerId:a.id,
   kind:'sealed 8MPa gas pipe hold-up',maxMassKg:25,maxVolumeM3:.08});
 ledger.importLot({id:'real-8a-produced-hydrogen',materialId:'hydrogen',
  containerId:'tank:'+h,massKg:.10,volumeM3:.024,grade:1,
  provenance:'chem8e:original-actual-h2'});
 ledger.importLot({id:'real-8a-produced-co2',materialId:'carbon_dioxide',
  containerId:'tank:'+co,massKg:.30,volumeM3:.0033,grade:1,
  provenance:'co2:original-actual-atmospheric-capture'});
 const native={schema:1,items:[
  {id:battery,bodyId,kind:'battery',enabled:true,condition:1,
   local:local(0),energyJ:10e6},
  {id:bh,bodyId,kind:'pressure_pipeline_pump',enabled:true,condition:1,local:local(.01)},
  {id:bc,bodyId,kind:'pressure_pipeline_pump',enabled:true,condition:1,local:local(-.01)}
 ],wires:[{a:battery,b:bh},{a:battery,b:bc}],lastPoweredAt:{[bodyId]:0}};
 const report=t=>({schema:1,bodyId,simulatedAtS:t,dtS:10,
  byId:{
   [bh]:{bodyId,power:true,servedW:420,sourceIds:[battery],busId:battery},
   [bc]:{bodyId,power:true,servedW:420,sourceIds:[battery],busId:battery}}});
 return{physical8a,materials8a:ledger.snapshot(),native,report,
  gasManifolds:{
   'input:hydrogen':{vesselId:h,pipeId:ph,powerPortId:bh},
   'input:carbon_dioxide':{vesselId:co,pipeId:pc,powerPortId:bc}},
  station,ph,pc,h,co,bh,bc,battery};
}
function begin(f){
 return In.create().prepare({chemicalJobId:'chem8e:1',reactionId:'sabatier',
  scaleMol:1,stationId:f.station,materials8a:f.materials8a,
  physical8a:f.physical8a,gasManifolds:f.gasManifolds,outpost5:f.native,
  powerReport:f.report(0),bodyId,bodyRadius:R,timeS:0});
}
test('NO ARCHIVE and MISSING ONE GAS SPECIES must never authorize free reactor Joules or missing 8A inlet matter',()=>{
 const f=fixture(),expected=['hydrogen','carbon_dioxide'];
 assert.equal(In.create().readyFor('chem8e:1',f.materials8a,expected),false,
  'empty archive cannot prove physical chemical gas input');
 const start=begin(f);
 assert.equal(In.create(start.transit).readyFor('chem8e:1',
  start.materials8a,expected),false,'unpowered input reservations are not ready');
 const missing=structuredClone(start.transit);
 missing.jobs=missing.jobs.filter(x=>x.materialId==='hydrogen');
 assert.equal(In.create(missing).readyFor('chem8e:1',
  start.materials8a,expected),false,'must require BOTH chemically mandated gases');
 const flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8');
 assert.match(flight,/chemicalGasInput8h\.readyFor\(a\.id,materials8a\.snapshot\(\),exactGasSpecies\)/);
});
test('no genuinely produced H2 inventory means no input gas reservation, reactor work or free matter',()=>{
 const f=fixture(),without=structuredClone(f.materials8a);
 without.lots=without.lots.filter(x=>x.materialId!=='hydrogen');
 const original=structuredClone(without);
 assert.throws(()=>In.create().prepare({
  chemicalJobId:'chem8e:missing-real-hydrogen',reactionId:'sabatier',
  scaleMol:1,stationId:f.station,materials8a:without,
  physical8a:f.physical8a,gasManifolds:f.gasManifolds,
  outpost5:f.native,powerReport:f.report(0),
  bodyId,bodyRadius:R,timeS:0
 }),/UNRESERVED real certified reactor feedstock gas: hydrogen/);
 assert.deepEqual(without,original,
  'missing authentic 8A hydrogen cannot create reactor fuel or source material');
});
test('two real manufactured/signed inlet pipes reserve exact finite original 8A H2 and CO2, without creating stock or gas power',()=>{
 const f=fixture(),a=structuredClone(f.materials8a),q=begin(f);
 assert.equal(q.changed,true);assert.equal(q.jobs.length,2);
 assert.equal(q.createdGasKg,0);assert.equal(q.additionalElectricalDebitJ,0);
 assert.deepEqual(f.materials8a,a);
 close(mass(q.materials8a),mass(a));
 assert.equal(q.materials8a.operations.filter(o=>o.status==='RESERVED').length,2);
 assert.ok(q.jobs.every(j=>j.status==='ACTIVE'&&j.stage===0&&j.remainingS>0&&j.requiredWorkJ>0));
 assert.ok(q.jobs.every(j=>j.sourceLotId.startsWith('real-8a-produced')));
 assert.ok(!In.create(q.transit).readyFor('chem8e:1',q.materials8a));
 assert.throws(()=>In.create(q.transit).prepare({chemicalJobId:'chem8e:1',
  reactionId:'sabatier',scaleMol:1,stationId:f.station,
  materials8a:f.materials8a,physical8a:f.physical8a,
  gasManifolds:f.gasManifolds,outpost5:f.native,
  powerReport:f.report(0),bodyId,bodyRadius:R,timeS:0}),/duplicate/);
});
test('real source-owned staged inlet requires native originally PAID two physical 420W hops, survives save/reload and mass checks',()=>{
 const f=fixture(),started=begin(f),before=mass(started.materials8a);
 let state=started.transit,material=started.materials8a;
 for(let t=10;t<=900;t+=10){
  if(t===80){
   state=In.create(JSON.parse(JSON.stringify(state))).snapshot();
   material=Mat.create(JSON.parse(JSON.stringify(material))).snapshot();
  }
  f.native.lastPoweredAt[bodyId]=t;
  const q=In.create(state).observe({materials8a:material,
   physical8a:f.physical8a,outpost5:f.native,powerReport:f.report(t),
   bodyId,bodyRadius:R,timeS:t});
  state=q.transit;material=q.materials8a;
  close(mass(material),before);
  if(In.create(state).readyFor('chem8e:1',material))break;
 }
 assert.ok(In.create(state).readyFor('chem8e:1',material),state);
 assert.equal(state.jobs.filter(j=>j.status==='READY').length,2);
 assert.equal(material.operations.filter(op=>op.status==='COMMITTED').length,2);
 for(const j of state.jobs){
  assert.equal(j.stage,2);
  assert.ok(j.paidJ>j.requiredWorkJ);
  const lot=material.lots.find(x=>x.id===j.currentLotId);
  assert.ok(lot&&lot.containerId==='pipe:'+j.pipeId);
  close(lot.massKg,j.massKg);
 }
 const replay=In.create(state).observe({materials8a:material,
  physical8a:f.physical8a,outpost5:f.native,
  powerReport:f.report(900),bodyId,bodyRadius:R,timeS:900});
 assert.equal(replay.changed,false);
 assert.deepEqual(replay.materials8a,material);
});
test('native 420W inlet cannot contaminate a real 8A 80L pipe with another physically owned gas or compete with other pending reservations',()=>{
 const f=fixture(),started=begin(f);
 const alienLedger=Mat.create(started.materials8a);
 alienLedger.importLot({id:'real-other-process-oxygen',
  materialId:'oxygen',containerId:'pipe:'+f.ph,
  massKg:.001,volumeM3:.001,grade:1,
  provenance:'original-paid-other-8E-process'});
 alienLedger.importLot({id:'real-other-process-nitrogen',
  materialId:'nitrogen',containerId:'pipe:'+f.pc,
  massKg:.001,volumeM3:.001,grade:1,
  provenance:'original-paid-other-gas-route'});
 const polluted=alienLedger.snapshot();
 const q=In.create(started.transit).observe({
  materials8a:polluted,physical8a:f.physical8a,
  outpost5:f.native,powerReport:f.report(10),
  bodyId,bodyRadius:R,timeS:10});
 assert.ok(q.transit.jobs.every(x=>x.paidJ===0),
  'both contaminated original 80L pipes must HOLD native pumps, never mix species');
 assert.deepEqual(q.materials8a.lots,polluted.lots,
  'no alien oxygen may be fabricated, destroyed or cross-mixed');
 const busy=fixture(),receipt=Mat.create(busy.materials8a);
 receipt.reserve('other-real-signed-gas-order','real-8a-produced-hydrogen',
  'pipe:'+busy.ph,.002);
 busy.materials8a=receipt.snapshot();
 assert.throws(()=>begin(busy),/EMPTY and UNRESERVED/,
  'a separate original 8A pending order must prevent reactor from stealing this same pipe');
});
test('FULL original 8A Sabatier: physically paid H2+CO2 inlet pipes → atom-balanced REAL 8E reaction → physical methane OUTLET pipe and real water cargo (no mass or power mint)',()=>{
 const f=fixture(),mk={id:'8e:paid-methane-pipe',vessel:'8e:paid-methane-vessel',
  port:'t02:real-methane-420w'};
 const locOut=a=>[Math.cos(a),0,Math.sin(a)];
 const methanePipe={id:mk.id,type:'industrial_plant',condition:1,massKg:320,
  location:{kind:'surface',bodyId,local:locOut(.009)},
  state:{station:'pressure_pipeline',kitMaterialId:'plant_kit_pressure_pipeline',
   enabled:true,containerId:'pipe:'+mk.id,t02LoadId:mk.port,ratedPressurePa:8e6}};
 const methaneVessel={id:mk.vessel,type:'industrial_vessel',condition:1,
  massKg:195,volumeM3:4,location:{kind:'surface',bodyId,local:locOut(.018)},
  state:{materialId:'methane',kitMaterialId:'vessel_kit_methane',
   enabled:true,containerId:'tank:'+mk.vessel,ratedPressurePa:8e6}};
 f.physical8a.assets.push(methanePipe,methaneVessel);
 for(const [i,a] of [methanePipe,methaneVessel].entries())
  f.physical8a.transfers.push({id:'real-methane-kit-install:'+i,
   action:'INSTALL',status:'COMMITTED',assetId:a.id,
   sourceLotId:'real-original8f-manufactured-methane-kit:'+i,massKg:a.massKg});
 const expanded=Mat.create(f.materials8a);
 expanded.registerContainer({id:'pipe:'+mk.id,ownerId:mk.id,
  kind:'sealed 8MPa gas pipe hold-up',maxMassKg:25,maxVolumeM3:.08});
 expanded.registerContainer({id:'tank:'+mk.vessel,ownerId:mk.vessel,
  kind:'gas rated pressure vessel',maxMassKg:1000,maxVolumeM3:4});
 expanded.registerContainer({id:'8d:ship-main:materials',ownerId:'ship-main',
  kind:'ship cargo materials',maxMassKg:9000,maxVolumeM3:16});
 f.materials8a=expanded.snapshot();
 f.gasManifolds['output:methane']={vesselId:mk.vessel,
  pipeId:mk.id,powerPortId:mk.port};
 f.native.items.push({id:mk.port,bodyId,kind:'pressure_pipeline_pump',
  condition:1,enabled:true,local:locOut(.009)});
 f.native.wires.push({a:f.battery,b:mk.port});
 const originalReport=f.report;
 f.report=t=>{const v=originalReport(t);
  v.byId[mk.port]={bodyId,power:true,servedW:420,
   sourceIds:[f.battery],busId:f.battery};
  return v;};
 const sourceProof=Manifold.inspect({
  physical8a:f.physical8a,materials8a:f.materials8a,
  outpost5:f.native,powerReport:f.report(0),
  stationId:f.station,vesselId:mk.vessel,
  materialId:'methane',bodyId,bodyRadius:R,timeS:0});
 assert.equal(sourceProof.pipeId,mk.id);
 assert.equal(sourceProof.paidPowerW,420);
 assert.ok(sourceProof.segmentMetersScene.every(x=>x<12));
 const start=begin(f);
 let state=start.transit,material=start.materials8a,when=0;
 for(let t=10;t<=900;t+=10){
  f.native.lastPoweredAt[bodyId]=t;
  const q=In.create(state).observe({materials8a:material,
   physical8a:f.physical8a,outpost5:f.native,
   powerReport:f.report(t),bodyId,bodyRadius:R,timeS:t});
  state=q.transit;material=q.materials8a;when=t;
  close(mass(material),mass(f.materials8a));
  if(In.create(state).readyFor('chem8e:1',material,['hydrogen','carbon_dioxide']))break;
 }
 const inlet=In.create(state);
 assert.ok(inlet.readyFor('chem8e:1',material,['hydrogen','carbon_dioxide']),
  'original 420W must actually pay both inlet gas routes before any chemistry');
 const fromPipe={...Object.fromEntries(inlet.forJob('chem8e:1')
  .map(j=>[j.materialId,'pipe:'+j.pipeId]))};
 const inletProofs=Object.fromEntries(inlet.forJob('chem8e:1')
  .map(j=>[j.materialId,j]));
 const chemical=Plant.create().process({
  id:'chem8e:1',reactionId:'sabatier',scaleMol:1,
  materials:material,sourceContainerId:'8d:ship-main:materials',
  destinations:{methane:'pipe:'+mk.id,water:'8d:ship-main:materials'},
  reactantSources:fromPipe,assetState:f.physical8a,
  station:{id:f.station,kind:'catalytic_reactor',installed:true,
   enabled:true,condition:1,bodyId,
   sourceContainerId:'8d:ship-main:materials',
   tools:Chem.reactions.sabatier.requiredTools,physicalAssetId:f.station,
   reactantAssetIds:{hydrogen:f.h,carbon_dioxide:f.co},
   vesselAssetIds:{methane:mk.vessel},
   gasManifolds:f.gasManifolds,gasInputStaged8H:true,
   gasInputProofs8H:inletProofs,gasOutputStaged8H:true},
  energyReceipt:{operationId:'chem8e:1',
   sourceId:'ship-main:engineering-battery',
   usedJ:Chem.batch('sabatier',1).energyJ},bodyId});
 assert.equal(chemical.receipt.status,'COMMITTED');
 assert.match(chemical.receipt.gasTransportAccounting,/INBOUND_REAL_VESSEL_TO_PIPE/);
 close(mass(chemical.materials),mass(material));
 assert.ok(chemical.materials.lots.some(x=>x.materialId==='methane'&&
  x.containerId==='pipe:'+mk.id),'real methane must appear in 80L output pipe, not rated vessel');
 assert.ok(chemical.materials.lots.some(x=>x.materialId==='water'&&
  x.containerId==='8d:ship-main:materials'),'atom-balanced H2O must reach real ship cargo');
 assert.ok(!chemical.materials.lots.some(x=>x.materialId==='hydrogen'&&
  x.containerId==='pipe:'+f.ph),'real 8A source hydrogen is consumed at reactor');
 assert.ok(!chemical.materials.lots.some(x=>x.materialId==='carbon_dioxide'&&
  x.containerId==='pipe:'+f.pc),'real 8A source carbon dioxide is consumed at reactor');
 assert.equal(chemical.materials.lots.filter(x=>x.containerId==='tank:'+mk.vessel).length,0,
  'product methane is NOT instantly delivered to external tank');
 const consumed=inlet.consume({chemicalJobId:'chem8e:1',
  materialsBefore:material,materialsAfter:chemical.materials,timeS:when});
 assert.ok(consumed.changed);
 assert.equal(consumed.transit.jobs.filter(x=>x.status==='CONSUMED').length,2);
 const out=Out.create().prepare({materials8a:chemical.materials,
  physical8a:f.physical8a,receipt:chemical.receipt,
  gasManifolds:f.gasManifolds,bodyId,bodyRadius:R,timeS:when});
 assert.equal(out.changed,true);
 assert.equal(out.jobs.length,1);
 assert.equal(out.jobs[0].materialId,'methane');
 assert.equal(out.jobs[0].status,'ACTIVE');
 assert.equal(out.additionalElectricalDebitJ,0);
 close(mass(out.materials8a),mass(f.materials8a),
  1e-6); // original 8E atom-balanced conversion, no hidden new mass
});
test('T02 unplugged wire, off-world power, or unobserved 100x skip never moves original gas or debits another battery',()=>{
 const f=fixture(),start=begin(f);f.native.wires=[];
 let q=In.create(start.transit).observe({materials8a:start.materials8a,
  physical8a:f.physical8a,outpost5:f.native,powerReport:f.report(10),
  bodyId,bodyRadius:R,timeS:10});
 assert.equal(q.materials8a.operations.filter(o=>o.status==='COMMITTED').length,0);
 assert.ok(q.transit.jobs.every(j=>j.paidJ===0));
 f.native.wires=[{a:f.battery,b:f.bh},{a:f.battery,b:f.bc}];
 const jumped=In.create(q.transit).observe({materials8a:q.materials8a,
  physical8a:f.physical8a,outpost5:f.native,powerReport:{...f.report(1000),dtS:990},
  bodyId,bodyRadius:R,timeS:1000});
 assert.ok(jumped.transit.jobs.every(j=>j.paidJ===0));
 assert.equal(jumped.materials8a.operations.filter(o=>o.status==='COMMITTED').length,0);
 assert.deepEqual(start.materials8a.lots,jumped.materials8a.lots);
});
test('cancellation clears unpaid original 8A reservations; never conjures a refund for already loaded physical gas',()=>{
 const f=fixture(),beginning=begin(f),engine=In.create(beginning.transit);
 const cancelled=engine.cancel({chemicalJobId:'chem8e:1',materials8a:beginning.materials8a});
 assert.equal(cancelled.changed,true);
 assert.ok(cancelled.transit.jobs.every(j=>j.status==='CANCELLED'));
 assert.equal(cancelled.materials8a.operations.filter(o=>o.status==='RESERVED').length,0);
 assert.equal(cancelled.materials8a.operations.filter(o=>o.status==='CANCELLED').length,2);
 close(mass(cancelled.materials8a),mass(beginning.materials8a));
});
test('strict original runtime integration is mandatory, no debug pipe source is sufficient',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),
  flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8'),
  grid=fs.readFileSync(path.join(__dirname,'../src/physics/outposts-ui.js'),'utf8');
 assert.ok(html.includes('src/physics/chemical-gas-input8h.js'));
 assert.ok(html.indexOf('src/physics/chemical-gas-input8h.js')<html.indexOf('src/flight.js'));
 assert.match(flight,/chemicalGasInput8h:chemicalGasInput8h\.snapshot\(\)/);
 assert.match(flight,/industrialGasInputNativeTick8H/);
 assert.match(grid,/RT\.industrialGasInputNativeTick8H\(/);
});
