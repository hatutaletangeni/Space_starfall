'use strict';
const assert=require('node:assert/strict');
const Life=require('../src/physics/life-support8e.js');
const Power=require('../src/physics/power.js');
const Mod=require('../src/physics/modular-ship8e.js');
const start=Life.restore();
assert.equal(start.crew,1);
assert.ok(start.oxygenKg>0&&start.waterKg>0);
assert.equal(Life.demandW(Mod.restore().describe('life').level),450);
let powered=start;for(let i=0;i<24;i++)powered=Life.step(powered,3600,{powered:true,level:1});
assert.ok(powered.oxygenKg<start.oxygenKg&&powered.oxygenKg>=0);
assert.ok(powered.waterKg<start.waterKg&&powered.waterKg>=0);
assert.ok(powered.scrubberRemainingKg<start.scrubberRemainingKg);
assert.ok(powered.co2Kg<=.001);
let blackout=start;for(let i=0;i<24;i++)blackout=Life.step(blackout,3600,{powered:false,level:1});
assert.equal(blackout.scrubberRemainingKg,start.scrubberRemainingKg);
assert.ok(blackout.co2Kg>powered.co2Kg);
assert.ok(blackout.oxygenKg<=start.oxygenKg);
assert.deepEqual(Life.restore(JSON.parse(JSON.stringify(powered))),powered);
assert.throws(()=>Life.step(start,-1,{powered:true}),/Invalid/);
assert.throws(()=>Life.restore({schema:1,oxygenKg:-1}),/Invalid/);
const baseline=Power.loadPower({kind:'ship',avionicsW:1500,pumpW:420,instrumentsW:600},{loads:{}},{lifeSupportW:Life.demandW(1)});
assert.equal(baseline.lifeSupport,450);
const stats={kind:'ship',avionicsW:100,pumpW:0,instrumentsW:0,enginePowerW:0,
  batteryCapacityJ:2e8,maxDischargeW:10000,maxChargeW:10000,chargeEfficiency:.94,dischargeEfficiency:.94,
  solarAreaM2:0,solarEfficiency:0,maxSolarW:0,generatorW:0,
  emissivity:.82,radiatorAreaM2:0};
const state={energyJ:1e6,temperatureK:294,loads:{avionics:true,lifeSupport:true,lights:false,instruments:false,radiator:false,drive:false}};
const result=Power.step(stats,state,10,{ambientK:290},{lifeSupportW:450,lightsW:0});
assert.equal(result.draws.lifeSupport,450);
assert.ok(result.state.energyJ<state.energyJ,'Actual ship DC energy must debit life support');
const empty=Power.step(stats,{...state,energyJ:0},10,{ambientK:290},{lifeSupportW:450,lightsW:0});
assert.equal(empty.draws.lifeSupport,0,'A zero-energy ship cannot scrub without grid generation');
assert.ok(Life.diagnostics(powered,true).oxygenDays<Life.diagnostics(start,true).oxygenDays);
console.log('8E finite life support + real ship bus energy debit PASS');
