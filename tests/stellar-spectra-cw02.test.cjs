'use strict';
const assert=require('node:assert/strict');
const physics=require('../src/physics/foundation.js');
global.StarfallPhysics=physics;
const comp=require('../src/physics/celestial-composition-cw01.js');
global.StarfallCompositionCW01=comp;
const spectra=require('../src/physics/stellar-spectra-cw02.js');
const star=(id,type,radius)=>({id,type,radius});
const red=star('m','M dwarf',30000),sun=star('g','G / K star',90000),blue=star('b','White star',200000);
for(const s of [red,sun,blue]){
 const p=spectra.profile(s);
 assert.equal(p.starId,s.id);assert.ok(p.luminosityW>0&&p.temperatureK>0);
 assert.equal(p.displayRGB.length,3);
 assert.ok(p.displayRGB.every(v=>v>=0&&v<=1&&Number.isFinite(v)));
 assert.deepEqual(p,spectra.profile(s));
 assert.ok(p.radiationBandFractions.visible>0&&p.radiationBandFractions.visible<1);
 const f1=spectra.stellarFluxWm2(s,1e12),f2=spectra.stellarFluxWm2(s,2e12);
 assert.ok(Math.abs(f1/f2-4)<1e-12);
}
assert.ok(spectra.profile(blue).radiationBandFractions.ultraviolet>spectra.profile(red).radiationBandFractions.ultraviolet);
assert.throws(()=>spectra.stellarFluxWm2(sun,0));
assert.equal(typeof spectra.displayColor(sun)[0],'number');
console.log('CW02 blackbody bands, color, determinism and inverse-square flux PASS');
