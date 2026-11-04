'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
const H=require('../src/physics/logistics-orders8h.js');
const u=a=>[Math.cos(a),Math.sin(a),0];
const source={id:'ore-dock-a',bodyId:'star-0-p0',local:u(0),
 containerId:'ore-bin-a'};
const destination={id:'forge-dock-b',bodyId:'star-0-p0',local:u(1),
 containerId:'forge-bin-b'};
const truck=(theta=0)=>({id:'truck-expedition-001',kind:'truck',bodyId:'star-0-p0',
 local:u(theta),containerId:'truck-hold',operational:true,condition:1});
const battery=(id,J=1200)=>({operationId:id,carrierId:'truck-expedition-001',
 status:'COMMITTED',sourceId:'truck-expedition-001:battery',usedJ:J});
const inventory=()=>({
 schema:1,
 containers:[
  {id:'ore-bin-a',ownerId:'ore-dock-a',maxMassKg:500,maxVolumeM3:500,kind:'ore'},
  {id:'truck-hold',ownerId:'truck-expedition-001',maxMassKg:50,maxVolumeM3:20,kind:'cargo'},
  {id:'forge-bin-b',ownerId:'forge-dock-b',maxMassKg:500,maxVolumeM3:500,kind:'store'}
 ],
 lots:[{id:'ore-lot-1',materialId:'iron_ore',containerId:'ore-bin-a',
 massKg:100,volumeM3:10,provenance:'survey:star-0-p0',grade:.55}],
 operations:[]
});
const quote=()=>({id:'order-001',source,destination,actor:truck(),
 lotId:'ore-lot-1',massKg:12,materials:inventory(),timeS:5,bodyRadius:100});
function mass(s){return s.lots.reduce((a,l)=>a+l.massKg,0);}
test('8H real 8A order reserves, loads into truck, arrives, and unloads with unique custody',()=>{
 const net=H.create(),reserved=net.reserve(quote());
 assert.equal(reserved.order.status,'RESERVED');
 assert.equal(reserved.materials.operations[0].status,'RESERVED');
 assert.equal(mass(reserved.materials),100);
 assert.throws(()=>net.reserve(quote()),/already exists/);
 assert.throws(()=>net.deliver({id:'order-001',actor:truck(1),destination,
  materials:reserved.materials,timeS:10,bodyRadius:100,
  energyReceipt:battery('8h-unload:order-001')}),/not physically loaded/);
 const loaded=net.load({id:'order-001',actor:truck(),source,materials:reserved.materials,
  timeS:10,bodyRadius:100,energyReceipt:battery('8h-load:order-001')});
 assert.equal(loaded.order.status,'LOADED');
 assert.equal(loaded.materials.operations[0].status,'COMMITTED');
 assert.equal(loaded.materials.lots.find(x=>x.containerId==='truck-hold').massKg,12);
 assert.equal(mass(loaded.materials),100);
 assert.throws(()=>net.load({id:'order-001',actor:truck(),source,materials:loaded.materials,
  timeS:11,bodyRadius:100,energyReceipt:battery('8h-load:order-001')}),/duplicate load/);
 const reboot=H.create(JSON.parse(JSON.stringify(net.snapshot())));
 const result=reboot.deliver({id:'order-001',actor:truck(1),destination,
  materials:JSON.parse(JSON.stringify(loaded.materials)),timeS:25,
  bodyRadius:100,energyReceipt:battery('8h-unload:order-001')});
 assert.equal(result.order.status,'DELIVERED');
 assert.equal(result.materials.lots.find(x=>x.containerId==='forge-bin-b').massKg,12);
 assert.equal(result.materials.lots.filter(x=>x.containerId==='truck-hold').length,0);
 assert.equal(result.materials.lots.find(x=>x.containerId==='ore-bin-a').massKg,88);
 assert.equal(mass(result.materials),100);
 assert.throws(()=>reboot.deliver({id:'order-001',actor:truck(1),destination,
  materials:result.materials,timeS:26,bodyRadius:100,
  energyReceipt:battery('8h-unload:order-001')}),/duplicate delivery/);
});
test('cannot carry stock instantly across worlds or teleport a truck to its destination',()=>{
 const net=H.create();
 assert.throws(()=>net.reserve({...quote(),destination:{...destination,bodyId:'star-0-p1'}}),/another world/);
 const q=net.reserve(quote());
 assert.throws(()=>net.load({id:q.order.id,actor:truck(1),source,
  materials:q.materials,timeS:10,bodyRadius:100,
  energyReceipt:battery('8h-load:order-001')}),/not physically nearby/);
 const loaded=net.load({id:q.order.id,actor:truck(),source,
  materials:q.materials,timeS:10,bodyRadius:100,
  energyReceipt:battery('8h-load:order-001')});
 assert.throws(()=>net.deliver({id:q.order.id,actor:truck(),destination,
  materials:loaded.materials,timeS:20,bodyRadius:100,
  energyReceipt:battery('8h-unload:order-001')}),/not physically nearby/);
 assert.throws(()=>net.deliver({id:q.order.id,actor:{...truck(1),bodyId:'star-0-p1'},
  destination,materials:loaded.materials,timeS:20,bodyRadius:100,
  energyReceipt:battery('8h-unload:order-001')}),/wrong carrier\/world/);
});
test('no stock moves without correct energy, capacity, owner, or source reserve',()=>{
 const net=H.create(),q=net.reserve(quote());
 const args={id:q.order.id,actor:truck(),source,materials:q.materials,
  timeS:10,bodyRadius:100};
 assert.throws(()=>net.load({...args,energyReceipt:battery('8h-load:order-001',1199)}),/energy/);
 assert.deepEqual(net.snapshot().orders[0].status,'RESERVED');
 const mutated=structuredClone(q.materials);mutated.operations[0].status='CANCELLED';
 assert.throws(()=>net.load({...args,materials:mutated,
  energyReceipt:battery('8h-load:order-001')}),/altered real 8A/);
 const noRoom=structuredClone(inventory());noRoom.containers[1].maxMassKg=4;
 assert.throws(()=>H.create().reserve({...quote(),materials:noRoom}),/capacity/);
 const wrongOwner=structuredClone(inventory());wrongOwner.containers[1].ownerId='phantom';
 assert.throws(()=>H.create().reserve({...quote(),materials:wrongOwner}),/ownership/);
 assert.equal(mass(q.materials),100);
});
test('cancellation releases real 8A reservation and persists without generating inventory',()=>{
 const net=H.create(),q=net.reserve(quote()),cancel=net.cancel({id:q.order.id,materials:q.materials});
 assert.equal(cancel.order.status,'CANCELLED');
 assert.equal(cancel.materials.operations[0].status,'CANCELLED');
 assert.equal(mass(cancel.materials),100);
 const next=H.create(JSON.parse(JSON.stringify(net.snapshot())));
 assert.equal(next.get(q.order.id).status,'CANCELLED');
 assert.throws(()=>next.cancel({id:q.order.id,materials:cancel.materials}),/only an unloaded/);
});
