'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const O=require('../src/physics/habitat-oxygen8i.js');
const M=require('../src/physics/material-ledger8a.js');
const initial=()=>({
 materials:{schema:1,containers:[{id:'rated-o2-1:cargo',ownerId:'rated-o2-1',kind:'pressurized-gas',
  maxMassKg:10,maxVolumeM3:.5}],
  lots:[{id:'lot-o2',materialId:'oxygen',containerId:'rated-o2-1:cargo',massKg:2,
   volumeM3:.04,grade:1,provenance:'8e:water-electrolysis'}],operations:[]},
 physical:{schema:1,assets:[{id:'rated-o2-1',type:'industrial_vessel',condition:1,
  location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'},
  state:{materialId:'oxygen',enabled:true,ratedPressurePa:5e6,
   containerId:'rated-o2-1:cargo'}}]},
 habitat:{id:'hab-original',kind:'hab',bodyId:'star-0-p0',condition:1,enabled:true,
  local:[0,1,0],habT09:{schema:1,oxygenTankMol:500,airlock:'CLOSED'}}
});
const args=(change={})=>({...initial(),operationId:'haboxygen8i:hab-original:1',
 habitatId:'hab-original',vesselId:'rated-o2-1',sourceLotId:'lot-o2',
 bodyId:'star-0-p0',bodyRadius:600,shipLocal:[0,1,0],evaLocal:[0,1,0],
 shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:1e6,kg:1,...change});
test('8I source-owned rated vessel oxygen is exactly conserved in original T09 cylinder',()=>{
 const a=args(),before=structuredClone(a),result=O.transfer(a);
 assert.equal(result.duplicate,false);
 assert.equal(result.materials.lots[0].massKg,1);
 assert.equal(result.materials.lots[0].volumeM3,.02);
 assert.equal(result.habitat.habT09.oxygenTankMol,500+1/.031998);
 assert.equal(result.shipEnergyJ,940000);
 assert.equal(result.receipt.workJ,60000);
 assert.equal(result.receipt.sourceBatteryJBefore-result.receipt.sourceBatteryJAfter,60000);
 assert.equal(result.receipt.vesselId,'rated-o2-1');
 assert.equal(result.receipt.sourceProvenance,'8e:water-electrolysis');
 assert.equal(M.create(result.materials).inventory('rated-o2-1:cargo').length,1);
 assert.deepEqual(a,before,'cannot mutate source-owned materials before commit');
});
test('8I exact replay is idempotent; incompatible same receipt ID is rejected',()=>{
 const first=O.transfer(args());
 const repeat=O.transfer(args({materials:first.materials,habitat:first.habitat,shipEnergyJ:first.shipEnergyJ}));
 assert.equal(repeat.duplicate,true);
 assert.deepEqual(repeat.habitat,first.habitat);
 assert.throws(()=>O.transfer(args({materials:first.materials,habitat:first.habitat,kg:.5})),/Conflicting/);
});
test('8I gas transfer refuses missing/rated/contaminated/low-purity vessel and wrong world',()=>{
 const a=args();
 const cases=[
  [{sourceLotId:'fake'},/high-purity/],
  [{kg:3},/high-purity/],
  [{habitat:{...a.habitat,bodyId:'wrong'}},/original/],
  [{operatorEVA:false},/EVA/],
  [{shipPowered:false},/powered ship/],
  [{evaLocal:[1,0,0]},/within 24/],
  [{shipLocal:[1,0,0]},/within 24/],
  [{shipEnergyJ:1},/battery/],
  [{habitat:{...a.habitat,habT09:{...a.habitat.habT09,airlock:'OPEN_OUT'}}},/airlock/],
  [{habitat:{...a.habitat,habT09:{...a.habitat.habT09,oxygenTankMol:24990}}},/capacity/],
  [{physical:{...a.physical,assets:[{...a.physical.assets[0],state:{...a.physical.assets[0].state,ratedPressurePa:1e5}}]}},/rated/],
  [{physical:{...a.physical,assets:[{...a.physical.assets[0],location:{kind:'surface',bodyId:'wrong',local:[0,1,0]}}]}},/same planet/]
 ];
 for(const [change,reason] of cases)assert.throws(()=>O.transfer(args(change)),reason);
});
test('8I enforces active reservations, source gas pressure and finite cylinder space',()=>{
 const a=args();
 a.materials.operations.push({id:'held',status:'RESERVED',lotId:'lot-o2',massKg:1.5});
 assert.throws(()=>O.transfer(a),/reserved/);
 const gas=args();
 gas.materials.lots[0].volumeM3=.001;
 assert.throws(()=>O.transfer(gas),/pressure/);
 const bad=args();
 bad.materials.lots[0].grade=.70;
 assert.throws(()=>O.transfer(bad),/high-purity/);
});
