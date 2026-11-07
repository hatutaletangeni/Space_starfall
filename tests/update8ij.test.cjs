'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const habitat=require('../src/physics/habitat8i.js');
const climate=require('../src/physics/terraform8j.js');
const environment=()=>({schema:1,volumeM3:80,temperatureK:293.15,
 oxygenKg:20,co2Kg:2,nitrogenKg:70,waterKg:100,leakRatePerS:0});
const world=()=>({schema:1,radiusM:6_000_000,gravityMS2:9.81,
 atmosphereKg:5e18,receipts:[]});
test('8I requires metered nonzero power; no free operation',()=>{
 const s=environment();
 assert.throws(()=>habitat.advance(s,{seconds:20,powerJ:1999}),/underpowered/);
 assert.deepEqual(s,environment(),'rejected operation cannot mutate saved habitat');
 assert.throws(()=>habitat.advance(s,{seconds:86401,powerJ:1e8}),/Invalid process step/);
});
test('8I retains gas and captures removed CO2 under sealed conditions',()=>{
 const old=environment(),s=habitat.advance(old,{seconds:1000,powerJ:100000});
 assert.equal(s.oxygenKg,old.oxygenKg);
 assert.equal(s.nitrogenKg,old.nitrogenKg);
 assert.equal(s.co2Kg+s.capturedCo2Kg,old.co2Kg);
 assert.ok(s.pressurePa>0);
 assert.deepEqual(old,environment());
});
test('8I bounded leakage removes gas without increasing any constituent',()=>{
 const old={...environment(),leakRatePerS:.0002},
  s=habitat.advance(old,{seconds:100,powerJ:10000});
 for(const k of ['oxygenKg','co2Kg','nitrogenKg']) assert.ok(s[k]<=old[k]);
 assert.ok(s.oxygenKg<old.oxygenKg);
});
test('8J zero intervention preserves planetary atmosphere and pressure',()=>{
 const s=world(),original=structuredClone(s),result=climate.advance(s,{receiptId:'idle',seconds:60});
 assert.equal(result.duplicate,false);
 assert.equal(result.state.atmosphereKg,original.atmosphereKg);
 assert.deepEqual(s,original);
 assert.ok(result.state.pressurePa>0);
});
test('8J mass-conservative pressure and idempotent receipts',()=>{
 const s=world(),a=climate.advance(s,{deliveredGasKg:1e6,capturedGasKg:4e5,lostGasKg:2e5,receiptId:'delivery-1',seconds:1000});
 assert.equal(a.state.atmosphereKg,s.atmosphereKg+4e5);
 assert.ok(Math.abs(a.state.pressurePa-
   a.state.atmosphereKg*a.state.gravityMS2/(4*Math.PI*a.state.radiusM**2))<1e-5);
 const repeat=climate.advance(a.state,{deliveredGasKg:1e6,capturedGasKg:4e5,lostGasKg:2e5,receiptId:'delivery-1',seconds:1000});
 assert.equal(repeat.duplicate,true);
 assert.deepEqual(repeat.state,a.state);
 assert.throws(()=>climate.advance(a.state,{deliveredGasKg:1e6+1,
   capturedGasKg:4e5,lostGasKg:2e5,receiptId:'delivery-1',seconds:1000}),
   /Conflicting terraforming receipt/,'replaying same ID with changed mass must fail closed');
});
test('8J cannot withdraw unsupported atmosphere or accept negative gas',()=>{
 assert.throws(()=>climate.advance(world(),{capturedGasKg:6e18,receiptId:'impossible'}),/Cannot withdraw/);
 assert.throws(()=>climate.advance(world(),{deliveredGasKg:-1,receiptId:'negative'}),/Invalid terraforming/);
});
