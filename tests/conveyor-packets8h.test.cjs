'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/logistics-powered-network8h.js');
const C=require('../src/physics/conveyor-packets8h.js');
const T=globalThis.StarfallPowerLedgerT02,O=globalThis.StarfallOutposts;
const body={id:'star-0-p0',kind:'moon',radius:1000,position:[0,0,0],
 spinAxis:[0,1,0],spinAngle:0},bodyId=body.id;
const starPos=[1e6,0,0],luminosityW=1e20;
const local=t=>[Math.cos(t),Math.sin(t),0];
function fixture(){
 const a=(id,station,theta,massKg,containerId,loadId)=>({
  id,type:'industrial_plant',massKg,volumeM3:station==='conveyor_drive'?.55:1.8,
  condition:1,location:{kind:'surface',bodyId,local:local(theta)},
  provenance:'8E genuine paid install',state:{station,enabled:true,containerId,
   kitMaterialId:station==='conveyor_drive'?'plant_kit_conveyor_drive':'plant_kit_cargo_depot',
   ...(loadId?{t02LoadId:loadId}:{})}});
 const assets=[
  a('depot-a','cargo_depot',0,480,'stock-a'),
  a('drive-a','conveyor_drive',.006,180,'conveyor8h:drive-a','load-a'),
  a('drive-b','conveyor_drive',.012,180,'conveyor8h:drive-b','load-b'),
  a('depot-b','cargo_depot',.018,480,'stock-b')];
 const outpost5={schema:1,seed:742,serial:3,lastTick:0,relays:[],receipts:[],wires:[
  {a:'sun',b:'load-a'},{a:'load-a',b:'load-b'}],
  items:[
   {id:'sun',bodyId,kind:'solar',local:local(0),facing:local(.01),
    height:3,energyJ:0,temperatureK:290,condition:1,enabled:true},
   {id:'load-a',bodyId,kind:'conveyor_drive',local:local(.006),facing:local(0),
    height:1,energyJ:0,temperatureK:290,condition:1,enabled:true},
   {id:'load-b',bodyId,kind:'conveyor_drive',local:local(.012),facing:local(0),
    height:1,energyJ:0,temperatureK:290,condition:1,enabled:true}]};
 const physical8a={schema:1,assets,transfers:assets.map(a=>({
  id:'plant8e:'+a.id,action:'INSTALL',status:'COMMITTED',
  assetId:a.id,sourceLotId:'real-certified-kit:'+a.id,massKg:a.massKg}))};
 const materials8a={schema:1,containers:[
  {id:'stock-a',ownerId:'depot-a',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
  {id:'conveyor8h:drive-a',ownerId:'drive-a',kind:'guarded dry-solid conveyor tray',maxMassKg:40,maxVolumeM3:.05},
  {id:'conveyor8h:drive-b',ownerId:'drive-b',kind:'guarded dry-solid conveyor tray',maxMassKg:40,maxVolumeM3:.05},
  {id:'stock-b',ownerId:'depot-b',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6}],
  lots:[{id:'original-ore',containerId:'stock-a',materialId:'iron_ore',
   massKg:12,volumeM3:.012,provenance:'8D original mined ore',grade:.8}],
  operations:[]};
 const report=T.grid(new O.Store(742,outpost5),body,starPos,luminosityW,0,0);
 return{physical8a,materials8a,outpost5,powerReport:report,bodyId,
  bodyRadius:body.radius,sourceId:'depot-a',targetId:'depot-b',
  driveIds:['drive-a','drive-b'],timeS:0};
}
const mass=materials=>materials.lots.reduce((sum,x)=>sum+x.massKg,0);
function reserve(){
 const f=fixture(),machine=C.create();
 const s=machine.start({...f,id:'packet-1',sourceLotId:'original-ore',massKg:12});
 return{f,machine,packets:s.packets,materials8a:s.materials8a};
}
function hop(m,env,timeS,dtS=3,star=starPos){
 return m.advance({id:'packet-1',timeS,dtS,
  physical8a:env.physical8a,materials8a:env.materials8a,outpost5:env.outpost5,
  body,starPos:star,luminosityW});
}
test('real original dry ore travels through TWO finite trays, one power-paid timed hop at a time',()=>{
 const {f,machine,materials8a}=reserve(),original=structuredClone(f);
 let env={...f,materials8a},stages=[];
 assert.equal(mass(env.materials8a),12);
 assert.equal(env.materials8a.operations[0].status,'RESERVED');
 for(let t=3;t<=18;t+=3){
  const q=hop(machine,env,t);
  env={...env,materials8a:q.materials8a,outpost5:q.outpost5};
  stages.push(q.stage);
  assert.equal(mass(env.materials8a),12);
  assert.ok(q.sourceEnergyServedJ>=1500-1e-7,'250 W per actual T02 served motor per 3 s');
  assert.equal(q.outpost5.lastTick,t);
 }
 assert.deepEqual(stages,[0,1,1,2,2,3],
  'route must take real time at EACH physically installed drive compartment');
 assert.equal(machine.snapshot().jobs[0].status,'DELIVERED');
 assert.equal(env.materials8a.lots.length,1);
 assert.equal(env.materials8a.lots[0].containerId,'stock-b');
 assert.equal(env.materials8a.lots[0].massKg,12);
 assert.equal(env.materials8a.operations.filter(x=>x.status==='COMMITTED').length,3);
 assert.equal(f.materials8a.lots[0].containerId,'stock-a');
 assert.deepEqual(f,original,'no source snapshots changed without durable commit');
 assert.throws(()=>hop(machine,env,21),/no active/);
});
test('unplugging power pauses original packet in its last real physical tray',()=>{
 const {f,machine,materials8a}=reserve();
 let env={...f,materials8a};
 for(let t=3;t<=6;t+=3){
  const q=hop(machine,env,t);env={...env,materials8a:q.materials8a,outpost5:q.outpost5};
 }
 assert.equal(env.materials8a.lots[0].containerId,'conveyor8h:drive-a');
 env.outpost5.wires=[]; // genuine physical disconnection
 const stalled=hop(machine,env,9);
 assert.match(stalled.status,/PAUSED_/);
 assert.equal(stalled.stage,1);
 assert.equal(stalled.materials8a.lots[0].containerId,'conveyor8h:drive-a');
 assert.equal(mass(stalled.materials8a),12);
 assert.equal(stalled.sourceEnergyServedJ,0);
 assert.equal(stalled.packets.jobs[0].remainingS,6);
 const persisted=C.create(JSON.parse(JSON.stringify(stalled.packets)));
 const rewire={...env,materials8a:stalled.materials8a,outpost5:stalled.outpost5};
 rewire.outpost5.wires=[{a:'sun',b:'load-a'},{a:'load-a',b:'load-b'}];
 const resume=hop(persisted,rewire,12);
 assert.equal(resume.stage,1);
 assert.equal(resume.packets.jobs[0].remainingS,3);
});
test('clock replay, oversized stock and unsafe gas cannot masquerade as physical packets',()=>{
 const {f,machine,materials8a}=reserve(),env={...f,materials8a};
 assert.throws(()=>hop(machine,env,0,0),/bounded source-owned clock step/);
 assert.throws(()=>hop(machine,env,25,25),/bounded source-owned clock step/);
 assert.throws(()=>machine.start({...f,id:'packet-1',sourceLotId:'original-ore',massKg:12}),/busy or packet ID/);
 const gas=fixture();gas.materials8a.lots[0].materialId='oxygen';
 assert.throws(()=>C.create().start({...gas,id:'gas-1',sourceLotId:'original-ore',massKg:12}),/dry source lot unavailable or unsafe/);
 const over=fixture();
 assert.throws(()=>C.create().start({...over,id:'over-1',sourceLotId:'original-ore',massKg:41}),/invalid finite/);
 const wrong=fixture();wrong.physical8a.assets[2].location.bodyId='star-0-p1';
 assert.throws(()=>C.create().start({...wrong,id:'wrong-1',sourceLotId:'original-ore',massKg:12}));
});
