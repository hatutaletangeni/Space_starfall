'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/vehicles.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/logistics-energy8h.js');
require('../src/physics/logistics-battery-bridge8h.js');
const M=require('../src/physics/logistics-offworld-manifest8h.js');
const from={id:'star-0-p0',systemId:'star-0',position:[0,0,0],radius:1000,landable:true};
const to={id:'star-0-p1',systemId:'star-0',position:[500000,0,0],radius:1200,landable:true};
const ship=(world,at,landed)=>({seed:742,time:at,landed,
 attached:world.id,position:[world.position[0]+world.radius+(landed?8:200),
  world.position[1],world.position[2]],
 groundDirection:[1,0,0]});
function original(){
 const depot={id:'facility8e:offworld-dry-depot',type:'industrial_plant',
  massKg:480,volumeM3:1.8,condition:1,provenance:'genuine paid 8F kit',
  location:{kind:'surface',bodyId:to.id,local:[1,0,0]},
  state:{station:'cargo_depot',enabled:true,containerId:'depot8h:offworld'}};
 return{physical8a:{schema:1,assets:[depot],transfers:[{
  id:'plant8e:offworld',assetId:depot.id,action:'INSTALL',status:'COMMITTED',
  sourceLotId:'real-8F-kit',massKg:480}]},
 materials8a:{schema:1,containers:[
  {id:M.HOLD,ownerId:M.SHIP,kind:'raw-material cargo hold',maxMassKg:9000,maxVolumeM3:16},
  {id:'depot8h:offworld',ownerId:depot.id,kind:'sealed dry-solid cargo dock',
   maxMassKg:1200,maxVolumeM3:1.6}],
 lots:[{id:'real-ship-lot',materialId:'iron_ore',containerId:M.HOLD,
  massKg:20,volumeM3:.014,grade:.8,provenance:'8D:original-drill-trip'}],operations:[]},
 engineeringVehicles:globalThis.StarfallVehicles.createStore().serialize(),
 flightGalaxy:ship(from,0,true)};
}
const manifestId='offworld-trip-1';
function book(){
 const game=original(),bookings=M.create();
 const q=bookings.register({id:manifestId,lotId:'real-ship-lot',massKg:20,
  depotId:'facility8e:offworld-dry-depot',originWorld:from,destinationWorld:to,
  physical8a:game.physical8a,materials8a:game.materials8a,
  flightGalaxy:game.flightGalaxy,timeS:0});
 return{game,bookings,q};
}
const mass=m=>m.lots.reduce((s,x)=>s+x.massKg,0);
test('reserve 20kg in original 8D ship hold without teleporting to remote dry depot',()=>{
 const {game,q}=book();
 assert.equal(q.manifest.status,'RESERVED');
 assert.equal(q.receipt.movedKg,0);
 assert.equal(q.materials8a.operations[0].status,'RESERVED');
 assert.equal(q.materials8a.lots[0].containerId,M.HOLD);
 assert.equal(q.materials8a.lots[0].massKg,20);
 assert.equal(mass(q.materials8a),20);
 assert.equal(game.materials8a.operations.length,0,'original state remains immutable before save');
});
test('actual launch+offworld landing then paid physical EVA unload moves original ship lot ONCE',()=>{
 const {game,bookings,q}=book();
 let materials=q.materials8a;
 const offworldFlight=ship(from,180,false);
 assert.throws(()=>bookings.arrive({id:manifestId,flightGalaxy:ship(to,300,true),
  destinationWorld:to,materials8a:materials,timeS:300}),/has not departed/);
 const d=bookings.depart({id:manifestId,flightGalaxy:offworldFlight,
  originWorld:from,materials8a:materials,timeS:180});
 assert.equal(d.manifest.status,'IN_TRANSIT');
 assert.equal(materials.lots[0].containerId,M.HOLD,'departure cannot move stock off the ship');
 const destinationFlight=ship(to,2500,true);
 const arrival=bookings.arrive({id:manifestId,flightGalaxy:destinationFlight,
  destinationWorld:to,materials8a:materials,timeS:2500});
 assert.equal(arrival.manifest.status,'ARRIVED');
 assert.equal(arrival.materials8a.lots[0].containerId,M.HOLD);
 const sourceEnergy=game.engineeringVehicles.states.ship.energyJ;
 const unloaded=bookings.deliver({id:manifestId,flightGalaxy:destinationFlight,
  destinationWorld:to,operatorLocal:[1,0,0],onFoot:true,
  physical8a:game.physical8a,materials8a:materials,
  engineeringVehicles:game.engineeringVehicles,energyReceipts:[],timeS:2501});
 assert.equal(unloaded.manifest.status,'DELIVERED');
 assert.equal(unloaded.movedKg,20);
 assert.equal(unloaded.materials8a.lots.length,1);
 assert.equal(unloaded.materials8a.lots[0].containerId,'depot8h:offworld');
 assert.equal(mass(unloaded.materials8a),20);
 assert.equal(unloaded.engineeringVehicles.states.ship.energyJ,sourceEnergy-1200);
 assert.equal(unloaded.energyReceipts.length,1);
 assert.equal(unloaded.energyReceipt.sourceId,'starfall-ship');
 assert.equal(unloaded.receipt.status,'COMMITTED');
 const reloaded=M.create(JSON.parse(JSON.stringify(bookings.snapshot())));
 assert.equal(reloaded.list()[0].status,'DELIVERED');
 assert.throws(()=>reloaded.deliver({id:manifestId,flightGalaxy:destinationFlight,
  destinationWorld:to,operatorLocal:[1,0,0],onFoot:true,
  physical8a:game.physical8a,materials8a:unloaded.materials8a,
  engineeringVehicles:unloaded.engineeringVehicles,
  energyReceipts:unloaded.energyReceipts,timeS:2502}),/requires original landed ship/);
 assert.equal(game.engineeringVehicles.states.ship.energyJ,sourceEnergy,
  'never mutate source-owned ship battery before game save');
});
test('only unlaunched reservation can be cancelled with zero material and energy debit',()=>{
 const {game,bookings,q}=book();
 const c=bookings.cancel({id:manifestId,flightGalaxy:ship(from,1,true),
  originWorld:from,materials8a:q.materials8a,timeS:1});
 assert.equal(c.manifest.status,'CANCELLED');
 assert.equal(c.receipt.movedKg,0);
 assert.equal(c.receipt.usedJ,0);
 assert.equal(c.materials8a.operations[0].status,'CANCELLED');
 assert.equal(c.materials8a.lots[0].containerId,M.HOLD);
 assert.throws(()=>bookings.cancel({id:manifestId,flightGalaxy:ship(from,2,true),
  originWorld:from,materials8a:c.materials8a,timeS:2}),/unlaunched/);
 assert.deepEqual(game.materials8a.lots,original().materials8a.lots);
});
test('wrong planet, free destination, unlaunched orbit and cargo overflow fail closed',()=>{
 const g=original();
 for(const mutate of [
  x=>x.physical8a.transfers=[],
  x=>x.physical8a.assets[0].condition=0,
  x=>x.materials8a.containers[1].maxMassKg=10,
  x=>x.materials8a.lots[0].materialId='oxygen',
  x=>x.flightGalaxy.landed=false
 ]){
  const x=original();mutate(x);
  assert.throws(()=>M.create().register({id:manifestId,lotId:'real-ship-lot',
   massKg:20,depotId:'facility8e:offworld-dry-depot',
   originWorld:from,destinationWorld:to,physical8a:x.physical8a,
   materials8a:x.materials8a,flightGalaxy:x.flightGalaxy,timeS:0}));
 }
 assert.throws(()=>M.create().register({id:manifestId,lotId:'real-ship-lot',
  massKg:20,depotId:'facility8e:offworld-dry-depot',originWorld:from,
  destinationWorld:{...to,systemId:'star-1'},
  physical8a:g.physical8a,materials8a:g.materials8a,
  flightGalaxy:g.flightGalaxy,timeS:0}),/same-system/);
 const {bookings,q}=book();
 assert.throws(()=>bookings.depart({id:manifestId,flightGalaxy:ship(from,50,true),
  originWorld:from,materials8a:q.materials8a,timeS:50}),/physically launch/);
 const notCleared=ship(from,50,false);
 notCleared.position[0]=from.radius+20;
 assert.throws(()=>bookings.depart({id:manifestId,flightGalaxy:notCleared,
  originWorld:from,materials8a:q.materials8a,timeS:50}),/not yet cleared/);
});
