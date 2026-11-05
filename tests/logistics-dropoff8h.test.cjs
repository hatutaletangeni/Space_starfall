'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/logistics-orders8h.js');
const D=require('../src/physics/logistics-dropoff8h.js');
const loc=t=>[Math.cos(t),Math.sin(t),0],world='star-0-p0',radius=1000;
const H=D.HOPPER,truckId=D.TRUCK,deposit='8c:surveyed:iron-1',receipt='8d:drill:1';
const lotId='mine:'+receipt;
function state(){
 return{
  physical:{schema:1,transfers:[],assets:[
   {id:truckId,type:'truck',massKg:1600,volumeM3:13,condition:1,
    location:{kind:'surface',bodyId:world,local:loc(0)},
    provenance:'initial_manifest',state:{batteryJ:35000000}},
   {id:'facility8e:depot-001',type:'industrial_plant',massKg:480,volumeM3:1.8,condition:1,
    location:{kind:'surface',bodyId:world,local:loc(.035)},
    provenance:'8E physical kit:certified',state:{station:'cargo_depot',
     enabled:true,containerId:'depot8h:facility8e:depot-001'}}]},
  materials:{schema:1,containers:[
   {id:H,ownerId:truckId,kind:'sealed ore hopper',maxMassKg:800,maxVolumeM3:1.2},
   {id:'depot8h:facility8e:depot-001',ownerId:'facility8e:depot-001',
    kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6}],
   lots:[{id:lotId,materialId:'iron_ore',containerId:H,massKg:20,
     volumeM3:.0116,grade:.71,provenance:deposit}],operations:[]},
  mining:{schema:1,sequence:1,toolCondition:.996,active:null,history:[
   {id:receipt,type:'DRILL',status:'COMMITTED',source:deposit,
    destination:H,massKg:20,energyJ:57600}]},
  orders:{schema:1,orders:[]},
  actor:{id:truckId,kind:'truck',bodyId:world,local:loc(0),
   containerId:H,operational:true,condition:1}
 };
}
function request(s){
 return{id:'8h-ore:trip-1',lotId,depotId:'facility8e:depot-001',operatorNear:true,
  timeS:50,bodyRadius:radius,materials:s.materials,physical:s.physical,
  mining:s.mining,orders:s.orders,actor:s.actor};
}
const total=a=>a.lots.reduce((s,x)=>s+x.massKg,0);
test('existing physical 8D drilled ore reserves space in a manufactured depot without teleport',()=>{
 const s=state(),original=structuredClone(s),q=D.reserve(request(s));
 assert.deepEqual(s,original,'never mutate real stock before durable commit');
 assert.equal(q.record.status,'LOADED','actual mined ore was already loaded in truck');
 assert.equal(q.record.miningReceiptId,receipt);
 assert.equal(q.materials.operations.length,1);
 assert.equal(q.materials.operations[0].id,q.record.unloadOperationId);
 assert.equal(q.materials.operations[0].status,'RESERVED');
 assert.equal(q.orders.orders[0].carrierLotId,lotId);
 assert.equal(total(q.materials),20);
 assert.equal(q.materials.lots[0].containerId,H,'dispatch alone cannot move cargo');
});
test('only a physically arrived paid original truck may unload the reserved ore',()=>{
 const s=state(),q=D.reserve(request(s));
 const model=globalThis.StarfallLogisticsOrders8H.create(q.orders);
 const destination={id:'facility8e:depot-001',containerId:'depot8h:facility8e:depot-001',
  bodyId:world,local:loc(.035)};
 const paid={operationId:q.record.unloadOperationId,sourceId:'starfall-truck',
  carrierId:truckId,status:'COMMITTED',usedJ:1200};
 assert.throws(()=>model.deliver({id:q.record.id,actor:s.actor,destination,
  materials:q.materials,energyReceipt:paid,timeS:55,bodyRadius:radius}),/not physically nearby/);
 const arrival={...s.actor,local:loc(.035)};
 const done=model.deliver({id:q.record.id,actor:arrival,destination,
  materials:q.materials,energyReceipt:paid,timeS:60,bodyRadius:radius});
 assert.equal(done.order.status,'DELIVERED');
 assert.equal(done.materials.lots.find(x=>x.containerId===destination.containerId).massKg,20);
 assert.equal(done.materials.lots.filter(x=>x.containerId===H).length,0);
 assert.equal(total(done.materials),20);
 assert.throws(()=>model.deliver({id:q.record.id,actor:arrival,destination,
  materials:done.materials,energyReceipt:paid,timeS:65,bodyRadius:radius}),/duplicate delivery/);
});
test('no original drill proof, absent EVA, duplicate reservation, distant world or gas',()=>{
 const s=state(),input=request(s);
 assert.throws(()=>D.reserve({...input,operatorNear:false}),/EVA/);
 const noDrill=structuredClone(s.mining);noDrill.history=[];
 assert.throws(()=>D.reserve({...input,mining:noDrill}),/receipt/);
 const fake=structuredClone(s.materials);fake.lots[0].materialId='oxygen';
 assert.throws(()=>D.reserve({...input,materials:fake}),/solid ore/);
 const far=structuredClone(s.physical);far.assets[1].location.bodyId='star-0-p1';
 assert.throws(()=>D.reserve({...input,physical:far}),/same world/);
 const q=D.reserve(input);
 assert.throws(()=>D.reserve({...input,materials:q.materials,orders:q.orders}),/duplicate/);
 const low=structuredClone(s.materials);low.containers[1].maxMassKg=10;
 assert.throws(()=>D.reserve({...input,materials:low}),/capacity/);
});
