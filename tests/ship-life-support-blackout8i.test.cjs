/* Ship electrical-blackout accountability. Exact original flight runtime
 * call-site plus 8E finite life-support model; no synthetic stored energy.
 * T09 habitat life-support has its own original T02 power ledger.
 */
'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),
 fs=require('node:fs'),path=require('node:path');
const model=require('../src/physics/life-support8e.js');
const source=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8');
test('actual ship flight loop NEVER powers active CO2 scrubber while original ship switch is OFF',()=>{
 const first=source.indexOf('if(!st.powerEnabled){');
 assert.ok(first>=0,'original ship electrical switch branch must exist');
 const body=source.slice(first,first+280);
 assert.match(body,/lifeSupport8e=StarfallLifeSupport8E\.step\(lifeSupport8e,elapsed,/);
 assert.match(body,/\{powered:false,level:modularShip8e\.describe\('life'\)\.level\}/);
 assert.doesNotMatch(body,/\{powered:true/);
 const diag=source.slice(source.indexOf('get lifeSupport8e(){'),source.indexOf('get shipWalking8e(){'));
 assert.match(diag,/state\.powerEnabled\?!!engineeringSystemReport\.ship\?\.draws\?\.lifeSupport:false/);
});
test('blackout crew still breathes finite oxygen and water and emits CO2; scrubber consumes zero media',()=>{
 const initial=model.restore(),off=model.step(initial,3600,{powered:false,level:1});
 assert.ok(off.oxygenKg<initial.oxygenKg);
 assert.ok(off.waterKg<initial.waterKg);
 assert.ok(off.co2Kg>initial.co2Kg);
 assert.equal(off.scrubberRemainingKg,initial.scrubberRemainingKg,'no free scrubber while power disconnected');
 assert.equal(model.diagnostics(off,false,1).powered,false);
 assert.equal(model.diagnostics(off,false,1).alert,'ELECTRICAL POWER UNAVAILABLE');
});
test('restored power removes finite CO2 with paid scrubber media; cannot retroactively erase blackout loss',()=>{
 const old=model.restore(),night=model.step(old,1800,{powered:false});
 const lit=model.step(night,1800,{powered:true});
 assert.ok(lit.scrubberRemainingKg<night.scrubberRemainingKg,'restoring live ship power uses finite media');
 assert.ok(lit.co2Kg<night.co2Kg);
 assert.ok(lit.oxygenKg<night.oxygenKg,'power restore does not mint metabolic oxygen');
 assert.ok(lit.waterKg<night.waterKg);
});
test('100x blackout time integration conserves original finite mass',()=>{
 let step=model.restore();
 for(let i=0;i<100;i++)step=model.step(step,60,{powered:false});
 const whole=model.step(model.restore(),6000,{powered:false});
 for(const key of ['oxygenKg','waterKg','co2Kg','scrubberRemainingKg','pressureKPa','elapsedS'])
  assert.ok(Math.abs(step[key]-whole[key])<1e-8,key+': 1× / 100× mismatch');
});
