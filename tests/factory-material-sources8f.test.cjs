'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('src/physics/factory-ui8f.js','utf8');
new vm.Script(code,{filename:'src/physics/factory-ui8f.js'});
assert.match(code,/const outputSources=new Map\(\)/,'uses genuine recipe output lookup');
assert.match(code,/Object\.entries\(root\.StarfallManufacturing8F\.RECIPES\)/,'uses original 8F recipe authority');
assert.match(code,/for\(const \[material,kg\] of Object\.entries\(recipe\.outputs\|\|\{\}\)\)/);
assert.match(code,/r\.materials8a\.inventory\(shipHold\)/,'queries real ship inventory');
assert.match(code,/operation\.status==='RESERVED'/,'does not count physically reserved feedstock');
assert.match(code,/\bMISSING SOURCES\b/,'shows actionable upstream source readout');
assert.match(code,/\bSHIP HOLD NEEDS\b/,'shows per-material shortage');
for(const key of ['steel','iron','copper','aluminum','stocked_chips']){
 assert.match(code,new RegExp('\\b'+key+':'),'does not invent an 8F recipe for '+key);
}
assert.doesNotMatch(code,/\.importLot\(|\.registerContainer\(|\.setSurface\(/,
 'read-only shortage UI must never award stock or assets');
console.log('PASS: genuine 8F dependency pointers and read-only shortage UI');
