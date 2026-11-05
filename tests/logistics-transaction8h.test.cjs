'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/logistics-orders8h.js');
require('../src/physics/logistics-energy8h.js');
const {transaction}=require('../src/physics/logistics-transaction8h.js');
const local=a=>[Math.cos(a),Math.sin(a),0],radius=100;
const from={id:'mine-1',bodyId:'star-0-p0',local:local(0),containerId:'source'};
const to={id:'forge-1',bodyId:'star-0-p0',local:local(1),containerId:'destination'};
const truck=a=>({id:'truck-expedition-001',kind:'truck',bodyId:'star-0-p0',
 local:local(a),containerId:'hopper',operational:true,condition:1});
const stock=()=>({schema:1,containers:[
 {id:'source',ownerId:'mine-1',maxMassKg:100,maxVolumeM3:10},
 {id:'hopper',ownerId:'truck-expedition-001',maxMassKg:50,maxVolumeM3:5},
 {id:'destination',ownerId:'forge-1',maxMassKg:100,maxVolumeM3:10}],
 lots:[{id:'ore:1',materialId:'iron_ore',containerId:'source',massKg:40,
 volumeM3:.8,provenance:'verified-deposit-1',grade:.8}],operations:[]});
const battery=()=>({schema:1,stores:{
 'starfall-truck':{carrierId:'truck-expedition-001',energyJ:5000,capacityJ:44e6}
},receipts:[]});
function reserve(){
 const model=globalThis.StarfallLogisticsOrders8H.create();
 const booked=model.reserve({id:'journey-1',source:from,destination:to,actor:truck(0),
 lotId:'ore:1',massKg:12,materials:stock(),timeS:3,bodyRadius:radius});
 return{orders:model.snapshot(),materials:booked.materials,energy:battery()};
}
const input=(a,action,site,theta,timeS)=>({action,orders:a.orders,materials:a.materials,
 energy:a.energy,orderId:'journey-1',actor:truck(theta),site,bodyRadius:radius,timeS,
 sourceId:'starfall-truck'});
const mass=m=>m.lots.reduce((s,x)=>s+x.massKg,0);
test('real 8A load + energy debit are returned together without mutating any source',()=>{
 const a=reserve(),before=structuredClone(a);
 const b=transaction(input(a,'LOAD',from,0,4));
 assert.deepEqual(a,before,'no source owner modified before durable commit');
 assert.equal(b.orders.orders[0].status,'LOADED');
 assert.equal(b.materials.lots.find(x=>x.containerId==='hopper').massKg,12);
 assert.equal(b.materials.lots.find(x=>x.containerId==='source').massKg,28);
 assert.equal(mass(b.materials),40);
 assert.equal(b.energy.stores['starfall-truck'].energyJ,3800);
 assert.equal(b.energyReceipt.beforeJ-b.energyReceipt.afterJ,b.chargedJ);
 assert.equal(b.energyReceipt.operationId,b.receipt.id);
 assert.equal(b.energy.receipts.length,1);
});
test('genuine arrival unload burns the second payment and conserves 40 kg',()=>{
 const a=reserve(),loaded=transaction(input(a,'LOAD',from,0,4));
 const moved=transaction(input(loaded,'DELIVER',to,1,60));
 assert.equal(moved.orders.orders[0].status,'DELIVERED');
 assert.equal(moved.energy.stores['starfall-truck'].energyJ,2600);
 assert.equal(moved.energy.receipts.length,2);
 assert.equal(mass(moved.materials),40);
 assert.equal(moved.materials.lots.find(x=>x.containerId==='destination').massKg,12);
 assert.equal(moved.materials.lots.filter(x=>x.containerId==='hopper').length,0);
 const restored=JSON.parse(JSON.stringify(moved));
 assert.deepEqual(restored.orders,moved.orders);
 assert.throws(()=>transaction(input(restored,'DELIVER',to,1,70)),/duplicate or out-of-order/);
});
test('failed operation cannot spend battery or move material',()=>{
 const a=reserve(),prior=structuredClone(a);
 assert.throws(()=>transaction(input(a,'DELIVER',to,1,60)),/out-of-order/);
 assert.throws(()=>transaction(input(a,'LOAD',from,1,4)),/not physically nearby/);
 assert.throws(()=>transaction({...input(a,'LOAD',from,0,4),actor:{...truck(0),bodyId:'star-0-p1'}}),/custody changed|nearby/);
 const tiny=structuredClone(a);tiny.energy.stores['starfall-truck'].energyJ=1199;
 assert.throws(()=>transaction(input(tiny,'LOAD',from,0,4)),/insufficient/);
 const wrong=structuredClone(a);wrong.materials.operations[0].status='CANCELLED';
 assert.throws(()=>transaction(input(wrong,'LOAD',from,0,4)),/missing or altered/);
 assert.deepEqual(a,prior);
 assert.equal(mass(a.materials),40);
 assert.equal(a.energy.receipts.length,0);
});
test('duplicate receipt and forged wrong-source energy are rejected',()=>{
 const a=reserve(),b=structuredClone(a);
 b.energy.receipts.push({operationId:'8h-load:journey-1'});
 assert.throws(()=>transaction(input(b,'LOAD',from,0,4)),/duplicate energy/);
 assert.throws(()=>transaction({...input(a,'LOAD',from,0,4),sourceId:'phantom'}),/invalid vehicle/);
 assert.throws(()=>transaction({...input(a,'LOAD',from,0,4),sourceId:'starfall-rover'}),/missing, mismatched/);
});
