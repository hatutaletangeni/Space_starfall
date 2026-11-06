const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const H=require('../src/physics/habitat8i.js');
const T=require('../src/physics/terraform8j.js');

test('8I/8J conservative model sources are included in the editable game',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const file of ['habitat8i.js','terraform8j.js'])
  assert.ok(html.includes('<script src="src/physics/'+file+'"></script>'),file+' not integrated into browser scripts');
});

test('8I sealed habitat advances with bounded power and no negative stored mass',()=>{
 const before={schema:1,volumeM3:80,temperatureK:294,oxygenKg:12,co2Kg:2,
  nitrogenKg:43,waterKg:100,leakRatePerS:1e-6};
 assert.throws(()=>H.advance(before,{seconds:100,powerJ:9999}),/underpowered/);
 const after=H.advance(before,{seconds:100,powerJ:10000});
 assert.ok(after.pressurePa>0&&Number.isFinite(after.pressurePa));
 assert.ok(after.oxygenKg<before.oxygenKg&&after.nitrogenKg<before.nitrogenKg);
 assert.ok(after.capturedCo2Kg>0&&after.co2Kg>=0);
 assert.equal(before.pressurePa,undefined,'pure model must not mutate caller state');
});

test('8J atmosphere delta uses physical surface area and rejects duplicate intervention',()=>{
 const earth={schema:1,radiusM:6.371e6,gravityMS2:9.81,atmosphereKg:5.15e18,receipts:[]};
 const baseline=earth.atmosphereKg*earth.gravityMS2/(4*Math.PI*earth.radiusM**2);
 const add=T.advance(earth,{deliveredGasKg:1e8,seconds:3600,receiptId:'physical-delivery-fixture'});
 const expected=1e8*earth.gravityMS2/(4*Math.PI*earth.radiusM**2);
 assert.ok(Math.abs((add.state.pressurePa-baseline)-expected)<1e-6);
 assert.equal(earth.receipts.length,0);
 const dup=T.advance(add.state,{deliveredGasKg:1e8,seconds:3600,receiptId:'physical-delivery-fixture'});
 assert.equal(dup.duplicate,true);
 assert.equal(dup.state.atmosphereKg,add.state.atmosphereKg);
 assert.throws(()=>T.advance(earth,{capturedGasKg:earth.atmosphereKg+1e12,receiptId:'excess'}),/withdraw more atmosphere/);
});

// These are MODEL checks, not an 8I–8K end-to-end game completion certificate.
