'use strict';
const assert=require('node:assert/strict');
const Physical=require('../src/physics/physical-inventory8a.js');
const Cargo=require('../src/physics/cargo-bay8b.js');
const Materials=require('../src/physics/material-ledger8a.js');
const Mining=require('../src/physics/mining-hauling8d.js');
const Custody=require('../src/physics/truck-custody8b.js');
const id='truck-expedition-001',stock=Physical.create(),baseline=stock.get(id);
stock.move(id,{kind:'surface',bodyId:'stranded-water-world',local:[0,1,0]},'test:drive');
stock.setSurface(id,'stranded-water-world',[0,1,0],{batteryJ:19000,cargoKg:13,lights:false});
const matter=Materials.create();Mining.prepareContainers(matter);
matter.importLot({id:'mined-ore',materialId:'iron-ore',containerId:Mining.TRUCK,
 massKg:20,volumeM3:.0116,provenance:'original-drill'});
const state={physical8a:stock.serialize(),materials8a:matter.snapshot(),
 flightGalaxy:{truckPose:{bodyId:'stranded-water-world',local:[0,1,0],batteryJ:9000,cargo:13,lights:false},
  shipCargo8b:{schema:1,mode:'ground',pose:{x:16.5,z:39,y:-7.25},counter:4}},
 mining8d:{schema:1,sequence:0,toolCondition:1,active:null,history:[]}};
const prior=JSON.stringify(state),r=Custody.recoverStrandedTruckForMobile(state);
assert.equal(r.recovered,true);
assert.equal(JSON.stringify(state),prior,'must never mutate original live snapshot');
const next=Physical.create(r.session.physical8a),truck=next.get(id);
assert.equal(truck.location.kind,'ship');
assert.equal(truck.massKg,baseline.massKg);
assert.equal(truck.state.batteryJ,9000,'preserve final saved battery debit');
assert.equal(truck.state.cargoKg,13);
assert.equal(truck.state.lights,false);
assert.equal(next.list().filter(a=>a.id===id).length,1);
assert.deepEqual(next.get('rover-science-001'),stock.get('rover-science-001'));
assert.deepEqual(r.session.materials8a,state.materials8a);
assert.equal(r.session.flightGalaxy.shipCargo8b.mode,'secured');
assert.equal(r.session.flightGalaxy.shipCargo8b.counter,4);
assert.equal(r.session.flightGalaxy.truckPose,null);
assert.equal(r.session.assistedTruckRecovery8b.carriedMassKg,20);
const receipt=next.serialize().transfers.find(t=>t.id==='8b-assisted-mobile-recovery-v1');
assert.equal(receipt.action,'ASSISTED_RECOVERY');
assert.equal(receipt.excludedFromNoCheatAcceptance,true);
assert.equal(receipt.source.bodyId,'stranded-water-world');
assert.equal(receipt.destination.kind,'ship');
assert.equal(Custody.recoverStrandedTruckForMobile(r.session).recovered,false);
next.move(id,{kind:'surface',bodyId:'next-world',local:[1,0,0]},'real:deploy');
assert.equal(Custody.recoverStrandedTruckForMobile({...r.session,physical8a:next.serialize()}).recovered,false,
 'cannot auto-recover after later real deployment');
assert.equal(Custody.recoverStrandedTruckForMobile({flightGalaxy:{}}).recovered,false);
assert.equal(Custody.recoverStrandedTruckForMobile({...state,mining8d:{active:{id:'drill'}}}).reason,'ACTIVE_MINING');
assert.equal(Custody.recoverStrandedTruckForMobile({...state,logisticsOrders8h:{orders:[{carrierId:id,status:'LOADED'}]}}).reason,'ACTIVE_ORDER');
const ramp={...state.flightGalaxy,shipCargo8b:{...state.flightGalaxy.shipCargo8b,mode:'ramp'}};
assert.equal(Custody.recoverStrandedTruckForMobile({...state,flightGalaxy:ramp}).reason,'ACTIVE_RAMP');
const overweight=Physical.create(state.physical8a).serialize();
overweight.assets.find(a=>a.id===id).massKg=Cargo.BAY.maxCargoMassKg+1;
assert.equal(Custody.recoverStrandedTruckForMobile({...state,physical8a:overweight}).reason,'CARGO_CAPACITY');
console.log('PASS one-time assisted original truck recovery: source-owned vehicle/energy/matter, no replay, active-job and bay safeguards');
