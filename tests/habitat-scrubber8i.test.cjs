'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../src/physics/habitat-scrubber8i.js');
const M=require('../src/physics/material-ledger8a.js');
const initial=()=>({
 habitat:{id:'original-hab',kind:'hab',bodyId:'world',enabled:true,condition:1,
 local:[0,1,0],habT09:{schema:1,airlock:'CLOSED',scrubberCapacityMol:0,filteredAirMol:2,scrubberMediaInstalledKg:0}},
 materials:{schema:1,containers:[{id:'ship',ownerId:'ship-main',kind:'storage',maxMassKg:100,maxVolumeM3:5}],
 lots:[{id:'media',containerId:'ship',materialId:'scrubber_media',massKg:2,volumeM3:.004,grade:1,
 provenance:'8f:manufactured-press'}],operations:[]}
});
const args=(p={})=>({...initial(),operationId:'habscrub8i:original-hab:1',
 sourceLotId:'media',habitatId:'original-hab',shipContainerId:'ship',
 bodyId:'world',bodyRadius:600,shipLocal:[0,1,0],evaLocal:[0,1,0],
 shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:200000,kg:1,...p});
test('8I manufactured sorbent must debit same 8A lot and increase original T09 capacity',()=>{
 const a=args(),old=structuredClone(a),r=T.refill(a);
 assert.equal(r.materials.lots[0].massKg,1);
 assert.equal(r.materials.lots[0].volumeM3,.002);
 assert.equal(r.habitat.habT09.scrubberMediaInstalledKg,1);
 assert.equal(r.habitat.habT09.scrubberCapacityMol,1*.08/.04401);
 assert.equal(r.habitat.habT09.filteredAirMol,2);
 assert.equal(r.shipEnergyJ,150000);
 assert.equal(r.receipt.sourceBatteryJBefore-r.receipt.sourceBatteryJAfter,50000);
 assert.equal(r.receipt.sourceProvenance,'8f:manufactured-press');
 assert.deepEqual(a,old);
 assert.equal(M.create(r.materials).inventory('ship').length,1);
});
test('8I sorbent receipt idempotent and cannot replay with different mass',()=>{
 const a=T.refill(args());
 assert.equal(T.refill(args({materials:a.materials,habitat:a.habitat,shipEnergyJ:a.shipEnergyJ})).duplicate,true);
 assert.throws(()=>T.refill(args({materials:a.materials,habitat:a.habitat,kg:.3})),/Conflicting/);
});
test('8I scrubber refuses invented stock, reserved supplies, insufficient energy and airlock',()=>{
 const x=args();
 for(const [change,reason] of [
 [{sourceLotId:'fake'},/fabricated/],
 [{shipEnergyJ:1},/battery/],
 [{operatorEVA:false},/EVA/],
 [{shipPowered:false},/Powered landed/],
 [{shipLocal:[1,0,0]},/approach/],
 [{habitat:{...x.habitat,habT09:{...x.habitat.habT09,airlock:'OPEN_OUT'}}},/airlock/],
 [{kg:10},/fabricated/],
 [{habitat:{...x.habitat,habT09:{...x.habitat.habT09,scrubberCapacityMol:24999}}},/capacity/]
 ])assert.throws(()=>T.refill(args(change)),reason);
 const reserved=args();reserved.materials.operations.push({id:'reserved',status:'RESERVED',lotId:'media',massKg:1.5});
 assert.throws(()=>T.refill(reserved),/reserved/);
});
