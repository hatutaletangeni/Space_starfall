'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/vehicles.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/logistics-orders8h.js');
require('../src/physics/logistics-energy8h.js');
require('../src/physics/logistics-transaction8h.js');
require('../src/physics/logistics-battery-bridge8h.js');
const H=require('../src/physics/logistics-durable8h.js');
const local=a=>[Math.cos(a),Math.sin(a),0],bodyId='star-0-p0',radius=100;
const source={id:'plant-mine',bodyId,local:local(0),containerId:'mine-bin'};
const destination={id:'plant-forge',bodyId,local:local(1),containerId:'forge-bin'};
const actor=t=>({id:'truck-expedition-001',kind:'truck',bodyId,local:local(t),
 containerId:'8d:truck-expedition-001:hopper',operational:true,condition:1});
function setup(){
 const materials={schema:1,containers:[
 {id:'mine-bin',ownerId:'plant-mine',maxMassKg:150,maxVolumeM3:3},
 {id:'forge-bin',ownerId:'plant-forge',maxMassKg:150,maxVolumeM3:3},
 {id:'8d:truck-expedition-001:hopper',ownerId:'truck-expedition-001',maxMassKg:800,maxVolumeM3:1.2}],
 lots:[{id:'existing-ore',containerId:'mine-bin',materialId:'iron_ore',massKg:30,
 volumeM3:.6,grade:.8,provenance:'real-mining-cycle'}],operations:[]};
 const orders=globalThis.StarfallLogisticsOrders8H.create();
 const q=orders.reserve({id:'trip-one',source,destination,actor:actor(0),lotId:'existing-ore',
  massKg:10,materials,timeS:1,bodyRadius:radius});
 const physical8a={schema:1,assets:[
 {id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,condition:1,
  location:{kind:'surface',bodyId,local:local(0)},provenance:'initial_manifest',
  state:{batteryJ:5000}},
 ...[{id:'plant-mine',local:local(0)},{id:'plant-forge',local:local(1)}].map(x=>({
  id:x.id,type:'industrial_plant',massKg:150,volumeM3:2,condition:1,
  location:{kind:'surface',bodyId,local:x.local},provenance:'real-installed-kit',
  state:{enabled:true}}))],transfers:[]};
 return{materials8a:q.materials,logisticsOrders8h:orders.snapshot(),
 logisticsEnergyReceipts8h:[],physical8a,
 engineeringVehicles:globalThis.StarfallVehicles.createStore().serialize(),
 flightGalaxy:{truckPose:{bodyId,local:local(0),batteryJ:5000},landed:true,seed:742}};
}
const request=(action)=>({action,orderId:'trip-one',bodyId,timeS:action==='LOAD'?2:60,bodyRadius:radius});
function store(initial){
 let data=structuredClone(initial),writes=0,durable=true,accept=true;
 return{read:()=>structuredClone(data),write:x=>{writes++;if(!accept)return false;data=structuredClone(x);return true;},
 status:()=>({durable}),setDurable:x=>durable=x,setAccept:x=>accept=x,
 get writes(){return writes;},get current(){return structuredClone(data);},
 replace:x=>data=structuredClone(x)};
}
test('8H real truck power/stock paid together in exactly one durable write',()=>{
 const initial=setup(),before=structuredClone(initial),s=store(initial);
 const load=H.commit({storage:s,request:request('LOAD')});
 assert.deepEqual(initial,before);
 assert.equal(s.writes,1);assert.equal(load.saved.flightGalaxy.truckPose.batteryJ,3800);
 assert.equal(load.saved.physical8a.assets[0].state.batteryJ,3800);
 assert.equal(load.saved.logisticsOrders8h.orders[0].status,'LOADED');
 assert.equal(load.saved.materials8a.lots.find(l=>l.containerId==='8d:truck-expedition-001:hopper').massKg,10);
 assert.equal(load.saved.logisticsEnergyReceipts8h.length,1);
 assert.deepEqual(s.current,load.saved);
});
test('arrived truck unloads only when its physical position is persisted',()=>{
 const s=store(setup());
 H.commit({storage:s,request:request('LOAD')});
 assert.throws(()=>H.commit({storage:s,request:request('DELIVER')}),/not physically nearby/);
 assert.equal(s.writes,1);
 const traveled=s.current;
 traveled.physical8a.assets[0].location.local=local(1);
 traveled.flightGalaxy.truckPose.local=local(1);
 s.replace(traveled);
 const delivered=H.commit({storage:s,request:request('DELIVER')});
 assert.equal(s.writes,2);
 assert.equal(delivered.saved.flightGalaxy.truckPose.batteryJ,2600);
 assert.equal(delivered.saved.materials8a.lots.find(l=>l.containerId==='forge-bin').massKg,10);
 assert.equal(delivered.saved.materials8a.lots.reduce((a,l)=>a+l.massKg,0),30);
 assert.equal(delivered.saved.logisticsEnergyReceipts8h.length,2);
 assert.throws(()=>H.commit({storage:s,request:request('DELIVER')}),/out-of-order/);
 assert.equal(s.writes,2);
});
test('storage not durable, failed write, missing industrial dock, and replay do not mutate source',()=>{
 const initial=setup(),s=store(initial);
 s.setDurable(false);
 assert.throws(()=>H.commit({storage:s,request:request('LOAD')}),/persistent storage unavailable/);
 assert.equal(s.writes,0);assert.deepEqual(s.current,initial);
 s.setDurable(true);s.setAccept(false);
 assert.throws(()=>H.commit({storage:s,request:request('LOAD')}),/save failed/);
 assert.deepEqual(s.current,initial);
 s.setAccept(true);
 const invalid=structuredClone(initial);
 invalid.physical8a.assets[1].condition=0;
 s.replace(invalid);
 assert.throws(()=>H.commit({storage:s,request:request('LOAD')}),/installed operational surface industrial/);
 assert.deepEqual(s.current,invalid);
});
test('fake truck battery, stale truck pose and wrong planet fail closed',()=>{
 for(const mutate of [
  x=>x.physical8a.assets[0].state.batteryJ=4900,
  x=>x.flightGalaxy.truckPose.local=local(.5),
  x=>x.flightGalaxy.truckPose.bodyId='star-0-p1'
 ]){
  const initial=setup();mutate(initial);
  const s=store(initial);
  assert.throws(()=>H.commit({storage:s,request:request('LOAD')}));
  assert.equal(s.writes,0);
 }
 const s=store(setup());
 assert.throws(()=>H.commit({storage:s,request:{...request('LOAD'),bodyId:'star-0-p9'}}),/different planets/);
 assert.equal(s.writes,0);
});
