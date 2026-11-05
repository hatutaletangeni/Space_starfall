'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/logistics-energy8h.js');
const P=require('../src/physics/logistics-pickup8h.js');
const loc=a=>[Math.cos(a),Math.sin(a),0],body='star-0-p0';
const depot='facility8e:depot-001',container='depot8h:'+depot;
const priorId='8h-ore:trip-1',deliveryOperation='8h-unload:'+priorId;
const lotId='transfer:'+deliveryOperation;
function game(){
 return{flightGalaxy:{seed:742,landed:true,truckPose:{bodyId:body,local:loc(.02),batteryJ:5000}},
  engineeringVehicles:{schema:1,definitions:{},states:{}},
  physical8a:{schema:1,transfers:[],assets:[
   {id:P.TRUCK,type:'truck',condition:1,massKg:1600,volumeM3:13,
    location:{kind:'surface',bodyId:body,local:loc(.02)},state:{batteryJ:5000}},
   {id:depot,type:'industrial_plant',condition:1,massKg:480,volumeM3:1.8,
    location:{kind:'surface',bodyId:body,local:loc(.025)},
    state:{station:'cargo_depot',enabled:true,containerId:container}}]},
  materials8a:{schema:1,containers:[
   {id:container,ownerId:depot,kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
   {id:P.HOPPER,ownerId:P.TRUCK,kind:'sealed ore hopper',maxMassKg:800,maxVolumeM3:1.2}],
   lots:[{id:lotId,materialId:'iron_ore',containerId:container,massKg:20,
    volumeM3:.0116,provenance:'8c:surveyed:iron-1',grade:.71}],operations:[
   {id:deliveryOperation,lotId:'mine:8d:drill:1',destinationId:container,
    massKg:20,status:'COMMITTED',outputLotId:lotId}]},
  logisticsOrders8h:{schema:1,orders:[{id:priorId,status:'DELIVERED',
    destinationId:depot,destinationContainerId:container,carrierId:P.TRUCK,
    carrierContainerId:P.HOPPER,unloadOperationId:deliveryOperation,
    outputLotId:lotId,deliveredAtS:60}]},
  logisticsEnergyReceipts8h:[],
  logisticsPickupReceipts8h:[]};
}
const request={pickupId:'8h-pickup:1',lotId,depotId:depot,
 operatorNear:true,bodyId:body,bodyRadius:1000,timeS:70};
const mass=s=>s.materials8a.lots.reduce((n,x)=>n+x.massKg,0);
function storage(gameState){
 let saved=structuredClone(gameState),writes=0,enabled=true,durable=true;
 return {read:()=>structuredClone(saved),write:q=>{writes++;if(!enabled)return false;saved=structuredClone(q);return true;},
  status:()=>({durable}),get writes(){return writes;},get saved(){return structuredClone(saved);},
  fail:()=>enabled=false,disable:()=>durable=false};
}
test('real depot delivery recovered to original truck; 1200 J and 20 kg conserved',()=>{
 const original=game(),prior=structuredClone(original);
 const s=storage(original),q=P.commit({storage:s,request});
 assert.deepEqual(original,prior);
 assert.equal(s.writes,1);
 assert.equal(q.saved.materials8a.lots.find(x=>x.containerId===P.HOPPER).massKg,20);
 assert.equal(q.saved.materials8a.lots.filter(x=>x.containerId===container).length,0);
 assert.equal(mass(q.saved),20);
 assert.equal(q.saved.flightGalaxy.truckPose.batteryJ,3800);
 assert.equal(q.saved.physical8a.assets[0].state.batteryJ,3800);
 assert.equal(q.saved.logisticsPickupReceipts8h.length,1);
 assert.equal(q.saved.logisticsEnergyReceipts8h.length,1);
 assert.deepEqual(s.saved,q.saved);
 assert.throws(()=>P.commit({storage:s,request}),/duplicate pickup/);
 assert.equal(s.writes,1,'replay must not spend another Joule or move a second lot');
 assert.equal(JSON.parse(JSON.stringify(q.saved)).logisticsPickupReceipts8h[0].sourceLotId,lotId);
});
test('EVA, same world, physically stopped near dock and original truck custody required',()=>{
 for(const mutate of [
  x=>x.physical8a.assets[0].location.bodyId='star-0-p1',
  x=>x.flightGalaxy.truckPose.batteryJ=4500,
  x=>x.flightGalaxy.truckPose.local=loc(1),
  x=>x.physical8a.assets[1].location.bodyId='star-0-p1',
  x=>x.physical8a.assets[1].state.enabled=false,
  x=>x.flightGalaxy.landed=false,
  x=>x.physical8a.assets[0].condition=0.1
 ]){
  const g=game();mutate(g);
  assert.throws(()=>P.project(g,request),'altered physical source cannot be accepted');
 }
 assert.throws(()=>P.project(game(),{...request,operatorNear:false}),/EVA/);
 assert.throws(()=>P.project(game(),{...request,bodyId:'star-0-p1'}),/custody mismatch/);
});
test('fake delivery, pressure gas, overfilled hopper and competing reservation rejected',()=>{
 for(const mutate of [
  x=>x.logisticsOrders8h.orders=[],
  x=>x.logisticsOrders8h.orders[0].status='CANCELLED',
  x=>x.materials8a.lots[0].materialId='oxygen',
  x=>x.materials8a.lots[0].id='unverified:ore',
  x=>x.materials8a.containers[1].maxMassKg=10,
  x=>x.materials8a.operations.push({id:'hold:1',lotId,destinationId:P.HOPPER,massKg:20,status:'RESERVED'})
 ]){
  const g=game();mutate(g);
  assert.throws(()=>P.project(g,request),'unsafe lot cannot move');
 }
});
test('insufficient original truck battery and unavailable storage leave material unchanged',()=>{
 const g=game();g.flightGalaxy.truckPose.batteryJ=1199;g.physical8a.assets[0].state.batteryJ=1199;
 assert.throws(()=>P.project(g,request),/insufficient/);
 const s=storage(game());const original=s.saved;s.fail();
 assert.throws(()=>P.commit({storage:s,request}),/save failed/);
 assert.deepEqual(s.saved,original);
 const other=storage(game());other.disable();
 assert.throws(()=>P.commit({storage:other,request}),/durable/);
 assert.equal(other.writes,0);
});
