'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
require('../src/physics/vehicles.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/logistics-orders8h.js');
require('../src/physics/logistics-energy8h.js');
require('../src/physics/logistics-transaction8h.js');
const B=require('../src/physics/logistics-battery-bridge8h.js');
const loc=t=>[Math.cos(t),Math.sin(t),0],r=100;
const source={id:'mine-site-1',bodyId:'star-0-p0',local:loc(0),containerId:'mine-stock'};
const destination={id:'forge-site-1',bodyId:'star-0-p0',local:loc(1),containerId:'forge-stock'};
const truck=t=>({id:'truck-expedition-001',kind:'truck',bodyId:'star-0-p0',
 local:loc(t),containerId:'truck-stock',operational:true,condition:1});
const stock=()=>({schema:1,containers:[
 {id:'mine-stock',ownerId:'mine-site-1',maxMassKg:100,maxVolumeM3:20},
 {id:'truck-stock',ownerId:'truck-expedition-001',maxMassKg:50,maxVolumeM3:20},
 {id:'forge-stock',ownerId:'forge-site-1',maxMassKg:100,maxVolumeM3:20}],
 lots:[{id:'ore-real-001',materialId:'iron_ore',containerId:'mine-stock',
 massKg:20,volumeM3:1,provenance:'assayed-mine',grade:.75}],operations:[]});
function start(){
 const o=globalThis.StarfallLogisticsOrders8H.create();
 const q=o.reserve({id:'8h:trip:1',source,destination,actor:truck(0),
  lotId:'ore-real-001',massKg:10,materials:stock(),timeS:0,bodyRadius:r});
 const store=globalThis.StarfallVehicles.createStore().serialize();
 return{orders:o.snapshot(),materials:q.materials,
  authority:{truck:{assetId:'truck-expedition-001',energyJ:5000,capacityJ:44e6,
   location:{kind:'surface',bodyId:'star-0-p0'}},engineeringVehicles:store},
  receipts:[]};
}
const arg=(s,action,site,t,timeS,sourceId='starfall-truck')=>({...s,
 sourceId,action,orderId:'8h:trip:1',actor:truck(t),site,bodyRadius:r,timeS});
test('8H original physical truck battery charged on true 8A move with no source mutation',()=>{
 const input=start(),before=structuredClone(input);
 const loaded=B.execute(arg(input,'LOAD',source,0,5));
 assert.deepEqual(input,before);
 assert.equal(loaded.authority.truck.energyJ,3800);
 assert.equal(loaded.materials.lots.find(x=>x.containerId==='truck-stock').massKg,10);
 assert.equal(loaded.orders.orders[0].status,'LOADED');
 assert.equal(loaded.receipts.length,1);
 assert.equal(loaded.energyReceipt.sourceId,'starfall-truck');
 const reload=JSON.parse(JSON.stringify(loaded));
 const delivered=B.execute(arg(reload,'DELIVER',destination,1,60));
 assert.equal(delivered.authority.truck.energyJ,2600);
 assert.equal(delivered.materials.lots.find(x=>x.containerId==='forge-stock').massKg,10);
 assert.equal(delivered.receipts.length,2);
 assert.equal(delivered.materials.lots.reduce((sum,x)=>sum+x.massKg,0),20);
 assert.throws(()=>B.execute(arg(delivered,'DELIVER',destination,1,90)),/duplicate or out-of-order/);
});
test('lost carrier, battery outage, false source, replay and teleport cannot debit',()=>{
 const s=start(),original=structuredClone(s);
 assert.throws(()=>B.execute(arg(s,'LOAD',source,1,5)),/not physically nearby/);
 const empty=structuredClone(s);empty.authority.truck.energyJ=1199;
 assert.throws(()=>B.execute(arg(empty,'LOAD',source,0,5)),/insufficient/);
 const ghost=structuredClone(s);ghost.authority.truck.location.kind='ship';
 assert.throws(()=>B.execute(arg(ghost,'LOAD',source,0,5)),/custody missing/);
 assert.throws(()=>B.execute(arg(s,'LOAD',source,0,5,'starfall-ship')),/not the actual/);
 const used=structuredClone(s);used.receipts=[{operationId:'8h-load:8h:trip:1',sourceId:'starfall-truck',
 carrierId:'truck-expedition-001',status:'COMMITTED'}];
 assert.throws(()=>B.execute(arg(used,'LOAD',source,0,5)),/duplicate energy/);
 assert.deepEqual(s,original);
});
test('existing engineering ship and rover sources read installed battery, not new stores',()=>{
 const state=globalThis.StarfallVehicles.createStore().serialize();
 const authority={engineeringVehicles:state,truck:{assetId:'truck-expedition-001',
 energyJ:44e6,capacityJ:44e6,location:{kind:'surface'}}};
 const ship=B.parse(authority,'starfall-ship','ship-main');
 const rover=B.parse(authority,'starfall-rover','rover-science-001');
 assert.equal(ship.energyJ,state.states.ship.energyJ);
 assert.equal(rover.energyJ,state.states.rover.energyJ);
 assert.ok(ship.capacityJ>=ship.energyJ&&rover.capacityJ>=rover.energyJ);
 const missing=structuredClone(authority);
 missing.engineeringVehicles.definitions.ship.slots.battery='fake-cell';
 assert.throws(()=>B.parse(missing,'starfall-ship','ship-main'),/original battery slot/);
});
