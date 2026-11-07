'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/physics/material-ledger8a.js');
const T=require('../src/physics/atmosphere-emission8j.js');
const profile=()=>({id:'planet-a',radiusM:6000000,surfaceGravityMS2:9.8,atmospherePressurePa:80000,mu:3.5e14});
const source=()=>({
 materials:{schema:1,containers:[{id:'gas:container',ownerId:'gas:vessel',kind:'rated-gas',maxMassKg:100,maxVolumeM3:2}],
 lots:[{id:'gas:lot',containerId:'gas:container',materialId:'oxygen',massKg:4,volumeM3:.08,grade:1,provenance:'actual:electrolysis'}],operations:[]},
 physical:{schema:1,assets:[{id:'gas:vessel',type:'industrial_vessel',condition:1,
  location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'},
  state:{materialId:'oxygen',enabled:true,ratedPressurePa:5e6,containerId:'gas:container'}}]}
});
function args(extra={}){
 const {materials,physical}=source();return{receiptId:'atm8j:planet-a:1',materials,physical,bodyId:'planet-a',
 profile:profile(),savedWorld:null,vesselId:'gas:vessel',sourceLotId:'gas:lot',
 kg:1,shipEnergyJ:1000000,timeS:500,shipLanded:true,operatorEVA:true,
 shipPowered:true,operatorNear:true,landable:true,protectedWorld:false,...extra};
}
test('8J source-owned gas mass, pressure and original battery exactly conserved',()=>{
 const a=args(),old=structuredClone(a),r=T.emit(a);
 assert.equal(r.duplicate,false);
 assert.equal(r.materials.lots[0].massKg,3);
 assert.equal(r.materials.lots[0].volumeM3,.06);
 assert.equal(r.world.atmosphereKg-r.world.baselineAtmosphereKg,1);
 assert.ok(Math.abs(r.receipt.pressureDeltaPa-9.8/(4*Math.PI*6000000**2))<1e-8);
 assert.equal(r.world.emittedSpeciesKg.oxygen,1);
 assert.equal(r.shipEnergyJ,900000);
 assert.equal(r.receipt.sourceBatteryJBefore-r.receipt.sourceBatteryJAfter,100000);
 assert.equal(M.create(r.materials).inventory('gas:container').length,1);
 assert.deepEqual(a,old);
});
test('8J duplicate receipt no-ops while conflicting replay is rejected',()=>{
 const r=T.emit(args());const a=args({savedWorld:r.world,materials:r.materials,shipEnergyJ:r.shipEnergyJ});
 assert.equal(T.emit(a).duplicate,true);
 assert.throws(()=>T.emit({...a,kg:2}),/Conflicting/);
});
test('8J cannot modify native-life or protected archaeological planet',()=>{
 assert.throws(()=>T.emit(args({nativeLife:true})),/protection/);
 assert.throws(()=>T.emit(args({archaeologicalProtection:true})),/protection/);
 assert.throws(()=>T.emit(args({protectedWorld:true})),/protection/);
});
test('8J cannot emit free gas, unpowered release, wrong planet or remote operator',()=>{
 for(const [diff,match] of [
  [{sourceLotId:'missing'},/pure gas/],
  [{kg:6},/pure gas/],
  [{shipPowered:false},/powered landed/],
  [{operatorEVA:false},/near-surface/],
  [{operatorNear:false},/near-surface/],
  [{shipEnergyJ:1},/energy/],
  [{timeS:-1},/invalid/],
  [{physical:{schema:1,assets:[]}},/rated/],
  [{profile:{...profile(),id:'wrong'}},/invalid/]
 ])assert.throws(()=>T.emit(args(diff)),match);
});
test('8J pressure does not change in absence of a real physical transaction',()=>{
 const s=T.normalize(null,profile());
 assert.equal(s.pressurePa,profile().atmospherePressurePa);
 assert.equal(s.receipts.length,0);
 assert.equal(s.atmosphereKg,s.baselineAtmosphereKg);
});
test('8J source reservations and physically rated gas prevent double spend',()=>{
 const a=args();a.materials.operations.push({id:'reserved',status:'RESERVED',lotId:'gas:lot',massKg:3.5});
 assert.throws(()=>T.emit(a),/reserved/);
 const b=args();b.materials.lots[0].volumeM3=.001;
 assert.throws(()=>T.emit(b),/pressure/);
});
