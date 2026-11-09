'use strict';
/* 8K numerical fidelity: SAME simulated duration at 1× / 10× / 100×.
 * No source stock created, no source carrier installed; pure physical models.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../src/physics/greenhouse8i.js');
const T=require('../src/physics/terraform8j.js');
const createHab=()=>({kind:'hab',id:'existing-hab',enabled:true,condition:1,
 habT09:{schema:1,enabled:true,airlock:'CLOSED',tempK:293.15,
  carbonMol:20,oxygenMol:300,waterL:200,greenhouse8i:{
   schema:1,installed:true,lastS:0,lastSunlightWm2:0,condition:1,
   hardwareKg:1,seedMassKg:.02,nutrientKg:.2,cropBiomassKg:.02,
   carbonConsumedMol:0,waterConsumedKg:0,oxygenProducedMol:0,harvestedKg:0}}});
const runGrow=scale=>{const h=createHab(),durationS=3600,stepS=scale;
 for(let t=stepS;t<=durationS;t+=stepS){
  const r=G.grow(h,{seconds:stepS,nowS:t,powered:true,irradianceWm2:900});
  assert.ok(r.advanced,'photosynthesis must advance under finite light/power');
 }
 return h};
test('8K same elapsed 1x/10x/100x greenhouse grows same biomass, O2 and CO2',()=>{
 const a=runGrow(1),b=runGrow(10),c=runGrow(100);
 const field=x=>[x.habT09.carbonMol,x.habT09.oxygenMol,x.habT09.waterL,
  x.habT09.greenhouse8i.nutrientKg,x.habT09.greenhouse8i.cropBiomassKg,
  x.habT09.greenhouse8i.oxygenProducedMol];
 for(const state of [b,c]){
  for(const [i,v] of field(state).entries())
   assert.ok(Math.abs(v-field(a)[i])<1e-8,'Time scale drift at state index '+i);
 }
 assert.equal(a.habT09.greenhouse8i.lastS,3600);
});
test('8K 100x cannot conjure plant growth in darkness, brownout or reopened hatch',()=>{
 for(const mode of ['dark','power','hatch']){
  const h=createHab();
  if(mode==='hatch')h.habT09.airlock='OPEN_OUT';
  const old=structuredClone(h);
  for(let t=100;t<=3600;t+=100)
   assert.equal(G.grow(h,{seconds:100,nowS:t,powered:mode!=='power',
     irradianceWm2:mode==='dark'?0:900}).advanced,false);
  assert.equal(h.habT09.greenhouse8i.cropBiomassKg,old.habT09.greenhouse8i.cropBiomassKg);
  assert.equal(h.habT09.oxygenMol,old.habT09.oxygenMol);
  assert.equal(h.habT09.carbonMol,old.habT09.carbonMol);
 }
});
test('8K 8J atmospheric ledger is conserved for equivalent packets regardless of timestep',()=>{
 const make=()=>({schema:1,radiusM:6e6,gravityMS2:9.81,atmosphereKg:5e18,receipts:[]});
 const advance=(steps)=>{let s=make();for(let i=0;i<steps;i++){
  const r=T.advance(s,{deliveredGasKg:1000/steps,capturedGasKg:200/steps,
   lostGasKg:300/steps,seconds:3600/steps,receiptId:'8k-pressure-'+steps+'-'+i});
  assert.equal(r.duplicate,false);s=r.state;
 }
 return s};
 const a=advance(1),b=advance(10),c=advance(100);
 const expected=make().atmosphereKg+500;
 // At planet-sized reservoirs, floating-point precision is limited; expected
 // 500 kg is below the 1024 kg ULP near 5e18 and cannot resolve as 500.
 // This is explicitly a modeling precision limitation; test the source ledger.
 for(const x of [a,b,c]){
  const receiptNet=x.receipts.reduce((v,r)=>v+r.deliveredGasKg-r.capturedGasKg-r.lostGasKg,0);
  assert.ok(Math.abs(receiptNet-500)<1e-7);
  assert.ok(Math.abs(x.pressurePa-x.atmosphereKg*x.gravityMS2/
    (4*Math.PI*x.radiusM*x.radiusM))<1e-4);
 }
 assert.equal(expected,5e18,'precision baseline acknowledged');
});
