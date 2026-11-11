'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{validate}=require('../tools/validate-climate8j.cjs'),E=require('../src/physics/climate-energy8j.js');
const report=validate();for(const r of report.results)test(r.name,()=>assert.ok(r.pass,JSON.stringify(r)));
test('invalid thermal input is rejected and strong warming has bounded nonlinear radiation',()=>{
 assert.throws(()=>E.thermalStep({surfaceK:0,deepK:0,baseK:250,dt:-1,forcingWm2:1}));
 let s=0;for(let n=0;n<3650;n++)s=E.thermalStep({surfaceK:s,deepK:0,baseK:250,dt:86400,forcingWm2:1000,exchange:0}).surfaceK;
 const target=(250**4+1000/E.SIGMA)**.25-250;assert.ok(Math.abs(s-target)<1e-6);assert.ok(E.outgoingDelta(250,s)>999.999);
});
test('ice sublimation consumes latent energy and preserves total H2O',()=>{
 require('../src/physics/celestial-composition-cw01.js');const C=require('../src/physics/planetary-climate8j.js'),w={liquidKg:0,iceKg:1,vaporKg:0},start=structuredClone(w);
 const work=C.waterStep(w,250,86400,1,9.81,0,.02897);assert.ok(w.vaporKg>0);assert.ok(Math.abs(w.iceKg+w.liquidKg+w.vaporKg-1)<1e-14);
 assert.ok(Math.abs(work/(w.vaporKg-start.vaporKg)-(C.LV+C.LF))<1e-6);assert.equal(w.liquidKg,0);
});
test('six-band save migration conserves reservoirs and thermal ledgers before advancing',()=>{
 const C=require('../src/physics/planetary-climate8j.js'),A=require('../src/physics/atmosphere-emission8j.js');
 const body={id:'migration',kind:'planet',type:'Ice',radius:1000,landable:true,orbitPeriod:31536000},p={id:body.id,radiusM:1e6,surfaceGravityMS2:1,atmospherePressurePa:800,mu:1e12,massKg:1e22,albedo:.6},w=A.normalize(null,p);
 C.advance(w,p,1360,0,{body,seed:742});
 const b=w.climate8j.bands.slice(0,6).map((x,n)=>({...x,anomalyK:n*.01,deepAnomalyK:n*.002,water:{iceKg:400,liquidKg:0,vaporKg:4},controlWater:{iceKg:400,liquidKg:0,vaporKg:4}}));
 w.climate8j.bands=b;w.climate8j.storedHeatJ=1234;w.climate8j.radiativeJ=111;w.climate8j.initialHeatJ=1123;
 const saved=JSON.parse(JSON.stringify(w)),water=w=>w.climate8j.bands.reduce((s,b)=>s+b.water.iceKg+b.water.liquidKg+b.water.vaporKg,0),before=water(w);
 C.advance(w,p,1360,0);assert.equal(w.climate8j.bands.length,24);assert.equal(water(w),before);assert.equal(w.climate8j.storedHeatJ,1234);assert.equal(w.climate8j.initialHeatJ,1123);
 assert.ok(Math.abs(w.climate8j.bands.reduce((s,b)=>s+b.anomalyK,0)/24-saved.climate8j.bands.reduce((s,b)=>s+b.anomalyK,0)/6)<1e-16);
 assert.ok(C.sample(w,[0,1,0]).anomalyK>=0);assert.ok(C.sample(w,[0,-1,0]).anomalyK>=0);
});
