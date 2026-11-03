'use strict';
const assert=require('node:assert/strict');
const C=require('../src/physics/celestial-composition-cw01.js');
global.StarfallCompositionCW01=C;
const P=require('../src/physics/foundation.js');global.StarfallPhysics=P;
const S=require('../src/physics/stellar-spectra-cw02.js');global.StarfallStellarSpectraCW02=S;
const G=require('../src/terrain/geology-cw03.js');global.StarfallGeologyCW03=G;
const B=require('../src/terrain/biomes.js');global.StarfallBiomes=B;
const V=require('../src/physics/volatile-phases-cw04.js');global.StarfallVolatilesCW04=V;
const A=require('../src/physics/atmosphere-optics-cw05.js');
const star={id:'star-0-sun',systemId:'star-0',name:'Test',kind:'star',type:'K dwarf',radius:28000,position:[0,0,0]};
const earth={id:'star-0-p0',systemId:'star-0',name:'Test b',kind:'planet',type:'Temperate',radius:2150,
 landable:true,seed:742,orbitRadius:200000,orbitPeriod:80000,position:[200000,0,0],atmosphere:'Thin, O₂, N₂',water:'Moderate',tilt:0,spinPeriod:240};
const moon={...earth,id:'star-0-p0-m0',name:'Test moon',kind:'moon',type:'Ice',radius:250,seed:992,parentId:earth.id,landable:true,position:[201000,0,0],atmosphere:'Trace N₂'};
const sys={id:'star-0',name:'Test',star,position:[0,0,0]},byId=new Map([[sys.id,sys],[star.id,star],[earth.id,earth],[moon.id,moon]]);
const galaxy={seed:742,byId,observerPosition:[201000,0,0]};
for(const body of [earth,moon]) {
 const profile=P.scienceProfile(galaxy,body);assert.equal(profile.id,body.id);
 assert.equal(profile.composition.id,body.id);
 assert.equal(profile.volatilePhases.bodyId,body.id);
 assert.deepEqual(profile.composition,C.forBody(body,galaxy));
 assert.deepEqual(P.scienceProfile(galaxy,body),profile);
 assert.ok(Object.values(profile.composition.bulkComponentMassFractions).reduce((a,b)=>a+b,0)>0.999);
}
assert.equal(A.optical(moon,742).vacuum,true);
assert.equal(S.profile(star).starId,star.id);
const d=[1,0,0],base=[.12,.24,.36];
assert.deepEqual(G.tint(earth,d,0,.5,base,{material:'water'}),base);
assert.deepEqual(G.tint(moon,d,0,.5,base,{material:'ice'}),base);
assert.deepEqual(B.color(earth,d,15,.5),B.color(earth,d,15,.5));
console.log('CW06 composition/physics/spectra/biomes/volatiles/optics integration PASS');
