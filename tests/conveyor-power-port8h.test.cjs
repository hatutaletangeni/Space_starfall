'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
const Site=require('../src/physics/industrial-site8e.js');
const Socket=require('../src/physics/conveyor-power-port8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const local=a=>[Math.cos(a),Math.sin(a),0],bodyId='star-0-p0';
function installed(){
 const materials={schema:1,containers:[{id:'8d:ship-main:materials',ownerId:'ship-main',
  maxMassKg:900,maxVolumeM3:20}],lots:[{
  id:'8f:conveyor-verified',containerId:'8d:ship-main:materials',
  materialId:'plant_kit_conveyor_drive',massKg:180,volumeM3:.55,
  grade:1,provenance:'real manufactured 8F fixture'}],operations:[]};
 const out=Site.install({jobId:'plant8e:installed-conveyor',assetId:'facility8e:drive-1',
  materials,physical:{schema:1,assets:[],transfers:[]},
  shipContainerId:'8d:ship-main:materials',kitLotId:'8f:conveyor-verified',
  bodyId,local:local(.05),bodyRadius:1000,shipLocal:local(0),
  operatorLocal:local(.05),
  energyReceipt:{operationId:'plant8e:installed-conveyor',
   sourceId:'ship-main:engineering-battery',usedJ:410000}});
 return{physical8a:out.physical,outpost5:new O.Store(742).serialize(),
  driveId:'facility8e:drive-1',bodyId,bodyRadius:1000,timeS:20,
  operatorLocal:local(.05)};
}
test('outpost Store cannot spawn an independent unpaid conveyor electrical device',()=>{
 assert.equal(O.SPECS.conveyor_drive.watts,250);
 assert.equal(O.SPECS.conveyor_drive.loadOnly,true,
  'outpost contract must classify the port as non-constructible');
 const s=new O.Store(742);
 assert.throws(()=>s.add('conveyor_drive',{
  id:bodyId,landable:true,radius:1000},local(.05),[0,0,1],()=>0),/physically manufactured/);
 assert.equal(s.items.length,0);
});
test('certified paid physical 8E drive can install ONE native T02 250W load without free source',()=>{
 const input=installed(),before=structuredClone(input);
 const q=Socket.attach(input);
 assert.deepEqual(input,before,'registration only returns cloned source owners');
 assert.equal(q.receipt.status,'CONNECTED_PORT_UNWIRED');
 assert.equal(q.receipt.materialMovedKg,0);
 assert.equal(q.receipt.energyProducedJ,0);
 assert.equal(q.physical8a.assets[0].state.t02LoadId,q.receipt.portId);
 assert.equal(q.physical8a.assets[0].massKg,180);
 assert.equal(q.outpost5.items.length,1);
 assert.equal(q.outpost5.wires.length,0);
 assert.equal(q.outpost5.items[0].kind,'conveyor_drive');
 assert.equal(q.outpost5.items[0].energyJ,0);
 const grid=new O.Store(742,q.outpost5);
 const simulated=T.grid(grid,{
  id:bodyId,kind:'moon',radius:1000,position:[0,0,0],
  spinAxis:[0,1,0],spinAngle:0},[10000,0,0],1e15,30,10);
 assert.equal(simulated.byId[q.receipt.portId].power,false);
 assert.equal(simulated.byId[q.receipt.portId].servedW,0);
 assert.equal(simulated.dischargedJ,0);
 assert.equal(simulated.chargedJ,0);
 assert.throws(()=>Socket.attach({...input,physical8a:q.physical8a,outpost5:q.outpost5}),/already installed/);
});
test('no electric port without real paid manufactured kit, operator or original body',()=>{
 for(const mutate of [
  x=>x.physical8a.transfers=[],
  x=>x.physical8a.assets[0].state.kitMaterialId='phantom',
  x=>x.physical8a.assets[0].massKg=100,
  x=>x.physical8a.assets[0].condition=.2,
  x=>x.physical8a.assets[0].location.bodyId='star-0-p1',
  x=>x.operatorLocal=local(.5),
  x=>x.outpost5.seed=-1
 ]){
  const input=installed(),before=structuredClone(input);mutate(input);
  assert.throws(()=>Socket.attach(input));
  assert.deepEqual(input,structuredClone(input));
 }
});
