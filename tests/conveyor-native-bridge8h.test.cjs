'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/logistics-powered-network8h.js');
const C=require('../src/physics/conveyor-packets8h.js');
const Native=require('../src/physics/conveyor-native-bridge8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const body={id:'star-0-p0',systemId:'star-0',kind:'moon',radius:1000,
 position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const unit=t=>[Math.cos(t),Math.sin(t),0],star=[-1000000,0,0],luminosityW=1e18;
function fixture(){
 const asset=(id,station,theta,mass,containerId,loadId)=>({
  id,type:'industrial_plant',massKg:mass,volumeM3:station==='conveyor_drive'?.55:1.8,
  condition:1,location:{
   kind:'surface',bodyId:body.id,local:unit(theta)},
  state:{station,enabled:true,containerId,
   kitMaterialId:station==='conveyor_drive'?'plant_kit_conveyor_drive':'plant_kit_cargo_depot',
   ...(loadId?{t02LoadId:loadId}:{})}});
 const assets=[
  asset('dock-a','cargo_depot',0,480,'stock-a'),
  asset('drive-a','conveyor_drive',.006,180,'conveyor8h:drive-a','motor-a'),
  asset('dock-b','cargo_depot',.012,480,'stock-b')];
 const physical8a={schema:1,assets,transfers:assets.map(a=>({
  id:'paid-install:'+a.id,assetId:a.id,action:'INSTALL',status:'COMMITTED',
  sourceLotId:'original-fabricated-kit:'+a.id,massKg:a.massKg}))};
 const materials8a={schema:1,containers:[
  {id:'stock-a',ownerId:'dock-a',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
  {id:'conveyor8h:drive-a',ownerId:'drive-a',kind:'guarded dry-solid conveyor tray',maxMassKg:40,maxVolumeM3:.05},
  {id:'stock-b',ownerId:'dock-b',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6}],
  lots:[{id:'mine:real',containerId:'stock-a',materialId:'iron_ore',
    massKg:12,volumeM3:.012,grade:.85,provenance:'8D real mine→truck→depot'}],operations:[]};
 const t02={schema:1,seed:742,serial:3,lastTick:0,relays:[],receipts:[],
  wires:[{a:'real-battery',b:'motor-a'}],items:[
   {id:'real-battery',bodyId:body.id,kind:'battery',local:unit(0),facing:unit(0),
    height:3,energyJ:1000000,temperatureK:290,condition:1,enabled:true},
   {id:'motor-a',bodyId:body.id,kind:'conveyor_drive',local:unit(.006),facing:unit(0),
    height:1,energyJ:0,temperatureK:290,condition:1,enabled:true}]};
 const native=new O.Store(742,t02);
 const report=T.grid(native,body,star,luminosityW,0,0);
 const control=C.create(),q=control.start({id:'packet-1',sourceLotId:'mine:real',
  sourceId:'dock-a',targetId:'dock-b',driveIds:['drive-a'],massKg:12,
  bodyId:body.id,bodyRadius:body.radius,timeS:0,physical8a,materials8a,
  outpost5:t02,powerReport:report});
 return {native,physical8a,packets:q.packets,materials8a:q.materials8a};
}
function step(state,t,dt=3){
 const report=T.grid(state.native,body,star,luminosityW,t,dt);
 const before=state.native.serialize(),battery=before.items[0].energyJ;
 const q=Native.observe({packets:state.packets,materials8a:state.materials8a,
  physical8a:state.physical8a,outpost5:before,powerReport:report,
  bodyId:body.id,bodyRadius:body.radius,timeS:t});
 assert.equal(state.native.items[0].energyJ,battery,
  '8H bridge may not charge the genuine native T02 battery a SECOND time');
 assert.deepEqual(state.native.serialize(),before,
  'native source-owner charge must not be modified by the observer');
 return {q,report};
}
test('native paid T02 pulses move 12 kg dry ore through real 40 kg tray without ANY second grid debit',()=>{
 const state=fixture(),original=structuredClone(state.materials8a);
 const initialEnergy=state.native.items[0].energyJ;
 const states=[];
 for(const t of [3,6,9,12]){
  const {q,report}=step(state,t);
  assert.equal(q.changed,true);
  assert.equal(q.additionalElectricalDebitJ,0);
  assert.ok(q.sourceEnergyAlreadyPaidJ>=750-1e-6);
  assert.equal(report.byId['motor-a'].servedW,250);
  state.packets=q.packets;state.materials8a=q.materials8a;
  states.push(state.packets.jobs[0].cursor);
  assert.equal(state.materials8a.lots.reduce((s,x)=>s+x.massKg,0),12);
 }
 assert.deepEqual(states,[0,1,1,2]);
 assert.equal(state.packets.jobs[0].status,'DELIVERED');
 assert.equal(state.materials8a.lots[0].containerId,'stock-b');
 assert.equal(state.materials8a.operations.filter(x=>x.status==='COMMITTED').length,2);
 assert.equal(original.lots[0].containerId,'stock-a');
 assert.ok(state.native.items[0].energyJ<initialEnergy,'actual native grid paid and retained battery loss');
});
test('unplugging real native power pauses packet inside its previous 8A tray, replay stays inert',()=>{
 const state=fixture();
 for(const t of [3,6]){
  const {q}=step(state,t);state.packets=q.packets;state.materials8a=q.materials8a;
 }
 assert.equal(state.materials8a.lots[0].containerId,'conveyor8h:drive-a');
 state.native.wires=[];
 const {q,report}=step(state,9);
 assert.equal(report.byId['motor-a'].power,false);
 assert.match(q.status,/PAUSED_/);
 assert.equal(q.packets.jobs[0].cursor,1);
 assert.equal(q.materials8a.lots[0].containerId,'conveyor8h:drive-a');
 assert.equal(q.additionalElectricalDebitJ,0);
 const replay=Native.observe({packets:q.packets,materials8a:q.materials8a,
  physical8a:state.physical8a,outpost5:state.native.serialize(),
  powerReport:report,bodyId:body.id,bodyRadius:body.radius,timeS:9});
 assert.equal(replay.changed,false);
 assert.equal(replay.reason,'REPLAY_OR_OLD_GRID_TICK');
 assert.deepEqual(replay.materials8a,q.materials8a);
});
test('remote clock skip and unauthenticated report cannot create instantaneous cargo',()=>{
 const state=fixture(),report=T.grid(state.native,body,star,luminosityW,30,30);
 const skipped=Native.observe({packets:state.packets,materials8a:state.materials8a,
  physical8a:state.physical8a,outpost5:state.native.serialize(),
  powerReport:report,bodyId:body.id,bodyRadius:body.radius,timeS:30});
 assert.equal(skipped.changed,false);
 assert.equal(skipped.reason,'PAUSED_UNOBSERVED_CLOCK');
 assert.equal(skipped.materials8a.lots[0].containerId,'stock-a');
 assert.throws(()=>Native.observe({packets:state.packets,materials8a:state.materials8a,
  physical8a:state.physical8a,outpost5:state.native.serialize(),
  powerReport:{...report,bodyId:'fake-world'},
  bodyId:body.id,bodyRadius:body.radius,timeS:30}),/native original T02/);
});
