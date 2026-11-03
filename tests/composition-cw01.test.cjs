'use strict';
const assert=require('node:assert/strict');
const C=require('../src/physics/celestial-composition-cw01.js');
const P=require('../src/physics/foundation.js');
const {generateGalaxy}=require('../src/galaxy.js');
function nearOne(x){assert.ok(Math.abs(Object.values(x).reduce((a,b)=>a+b,0)-1)<1e-10);}
const seed=742,star={id:'star-0-sun',type:'K dwarf'},planet={id:'star-0-p0',kind:'planet',type:'Temperate',landable:true,atmosphere:'Thin, O₂, N₂'},moon={id:'star-0-p0-m0',kind:'moon',type:'Ice',landable:true,atmosphere:'Trace N₂'};
const a=C.bodyFor(planet,seed),b=C.bodyFor(planet,seed);
assert.deepEqual(a,b);assert.ok(Object.isFrozen(a));assert.equal(a.id,planet.id);assert.equal(a.legacyType,'Temperate');
nearOne(a.bulkComponentMassFractions);nearOne(a.majorMaterialMassFractions);nearOne(a.atmosphereMoleFractions);
assert.equal(C.bodyFor(moon,seed).atmosphereMode,'legacy vacuum-compatible');
assert.deepEqual(C.bodyFor(moon,seed).atmosphereMoleFractions,{});
assert.deepEqual(C.starFor(star,seed),C.starFor(star,seed));nearOne(C.starFor(star,seed).elementMassFractions);
assert.notDeepEqual(C.bodyFor({...planet,id:'star-0-p1'},seed).bulkComponentMassFractions,a.bulkComponentMassFractions);
assert.equal(C.SCHEMA_VERSION,1);
const sys=P.starProfile({id:star.id,type:star.type,radius:28000});assert.ok(sys.massKg>0);
assert.throws(()=>C.bodyFor({id:'x',kind:'unknown'},seed));
console.log('CW01 read-only deterministic fractions and fallback checks PASS');
