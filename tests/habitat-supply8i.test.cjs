'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/physics/material-ledger8a.js');
const supply=require('../src/physics/habitat-supply8i.js');
const initial=()=>({
 materials:{schema:1,containers:[{id:'ship-water',ownerId:'ship-main',maxMassKg:200,maxVolumeM3:1,kind:'cargo'}],
 lots:[{id:'water-lot-1',materialId:'water',containerId:'ship-water',massKg:25,volumeM3:.025,
  provenance:'8e:water-refinery-receipt'}],operations:[]},
 habitat:{id:'hab-real-1',kind:'hab',bodyId:'planet-1',condition:1,enabled:true,
  local:[0,1,0],habT09:{schema:1,waterL:1900,airlock:'CLOSED',oxygenTankMol:10}},
});
function args(overrides={}){
 const x=initial();return{...x,operationId:'habsupply8i:hab-real-1:1',
 sourceLotId:'water-lot-1',shipContainerId:'ship-water',bodyId:'planet-1',
 bodyRadius:600,shipLocal:[0,1,0],evaLocal:[0,1,0],
 shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:1e7,kg:5,...overrides};
}
test('8I debits only real ship-held water, credits original T09, charges real ship battery',()=>{
 const a=args(),old=structuredClone(a),r=supply.transfer(a);
 assert.equal(r.duplicate,false);
 assert.equal(r.habitat.id,'hab-real-1');
 assert.equal(r.habitat.habT09.waterL,1905);
 assert.equal(r.materials.lots[0].massKg,20);
 assert.equal(r.materials.lots[0].volumeM3,.02);
 assert.equal(r.shipEnergyJ,1e7-125000);
 assert.equal(r.receipt.sourceBatteryJBefore-r.receipt.sourceBatteryJAfter,125000);
 assert.equal(r.receipt.energySourceId,'ship-main:engineering-battery');
 assert.equal(r.receipt.status,'COMMITTED');
 assert.equal(r.receipt.sourceProvenance,'8e:water-refinery-receipt');
 assert.equal(r.materials.operations.length,1);
 assert.deepEqual(a,old,'prevalidated detached transaction never mutates live snapshots');
 assert.equal(M.create(r.materials).inventory().length,1);
});
test('8I receipt idempotency never credits habitat twice',()=>{
 const first=supply.transfer(args());
 const next=supply.transfer(args({habitat:first.habitat,materials:first.materials,shipEnergyJ:first.shipEnergyJ}));
 assert.equal(next.duplicate,true);
 assert.deepEqual(next.habitat,first.habitat);
 assert.deepEqual(next.materials,first.materials);
 assert.equal(next.shipEnergyJ,first.shipEnergyJ);
 assert.throws(()=>supply.transfer(args({habitat:first.habitat,materials:first.materials,kg:4})),/incompatible inputs/);
});
test('8I rejects absent/incorrect stock, insufficient power, stale ownership and remote EVA',()=>{
 const x=args();
 const variants=[
  [{sourceLotId:'no-lot'},/real water/],
  [{kg:26},/real water/],
  [{shipEnergyJ:10},/battery/],
  [{operatorEVA:false},/EVA/],
  [{shipPowered:false},/powered ship/],
  [{bodyId:'other-world'},/T09 habitat/],
  [{evaLocal:[1,0,0]},/operator must be/],
  [{shipLocal:[1,0,0]},/ship within/],
  [{habitat:{...x.habitat,habT09:{...x.habitat.habT09,airlock:'OPEN_OUT'}}},/closed/],
  [{habitat:{...x.habitat,habT09:{...x.habitat.habT09,waterL:1999}}},/capacity/]
 ];
 for(const [change,error] of variants)assert.throws(()=>supply.transfer(args(change)),error);
});
test('8I respects other reserved stock and never creates negative quantities',()=>{
 const a=args();a.materials.operations.push({id:'unrelated',status:'RESERVED',
  lotId:'water-lot-1',destinationId:'elsewhere',massKg:24});
 assert.throws(()=>supply.transfer(a),/reserved/);
 assert.equal(a.materials.lots[0].massKg,25);
});
test('8I transfers exact entire water lot and keeps an auditable committed receipt',()=>{
 const a=args({kg:25});const r=supply.transfer(a);
 assert.equal(r.materials.lots.length,0);
 assert.equal(r.habitat.habT09.waterL,1925);
 assert.equal(r.receipt.massKg,25);
 assert.equal(M.create(r.materials).inventory().length,0);
});
