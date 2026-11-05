'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Policy=require('../src/physics/native-power-substeps8h.js');
const eq=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} vs ${b}`);
test('without an ACTIVE original 8H packet, preserve exact <=12 existing T02 grid sample policy',()=>{
 for(const elapsedS of [0,.1,1,9,10,26,600,1200,7200,86400]){
  const q=Policy.plan({elapsedS,activePaid8H:false});
  const steps=elapsedS>0?Math.min(12,Math.max(1,Math.ceil(elapsedS/600))):1;
  assert.equal(q.steps,steps,`original unchanged T02 at ${elapsedS}s`);
  eq(q.totalS,elapsedS);
  assert.equal(q.status,'ORIGINAL_BASELINE_T02');
  assert.equal(q.safeForPacket,false);
 }
});
test('native original 420W gas packet 100x substeps never use a fake long report or second battery debit',()=>{
 const watts=420;for(const seconds of [.01,1,5,9.999,10,10.000001,26,120,300,480]){
  const q=Policy.plan({elapsedS:seconds,activePaid8H:true});
  assert.ok(q.steps>=1&&q.steps<=48);
  assert.equal(q.safeForPacket,true,`expected original exact source-paid <=10s at ${seconds}`);
  assert.ok(q.stepS<=10+1e-8);
  const at0=1000,pts=Array.from({length:q.steps},(_,i)=>Policy.endpoint(at0,q,i));
  assert.ok(pts.every((v,i)=>Number.isFinite(v)&&(i===0||v>pts[i-1])));
  eq(pts.at(-1),at0+seconds);
  let last=at0,paidJ=0,acceptedS=0;
  for(const next of pts){
   const d=next-last;
   assert.ok(d>=0&&d<=10+1e-7,'no packet time skipping at any frame');
   paidJ+=watts*d;acceptedS+=d;last=next;
  }
  eq(paidJ,watts*seconds,1e-6);
  eq(acceptedS,seconds,1e-8);
  const legacy=Policy.plan({elapsedS:seconds,activePaid8H:false});
  if(seconds===120)assert.ok(legacy.stepS>10&&q.stepS<=10,
   '100x original T02 long pulse would have previously lost a paid gas interval');
 }
});
test('original physical 250W conveyor obtains the same measured 1x / 10x / 100x source battery debit',()=>{
 const elapsedS=120,watts=250,plans=[1,10,100].map(scale=>{
  let energy=0,observed=0;
  for(let at=0;at<elapsedS;at+=scale){
   const q=Policy.plan({elapsedS:Math.min(scale,elapsedS-at),activePaid8H:true});
   assert.equal(q.safeForPacket,true);
   for(let i=0;i<q.steps;i++){
    const prior=i===0?at:Policy.endpoint(at,q,i-1);
    const end=Policy.endpoint(at,q,i);
    const paid=watts*(end-prior);
    energy+=paid;observed+=end-prior;
   }
  }
  return{energy,observed};
 });
 for(const r of plans){eq(r.energy,watts*elapsedS,1e-6);eq(r.observed,elapsedS,1e-8);}
});
test('long/unobserved clock explicitly HOLDs source inventory; CPU bounded to 48 native grid steps',()=>{
 const at=Date.now(),q=Policy.plan({elapsedS:2000,activePaid8H:true});
 assert.equal(q.steps,48);
 assert.ok(q.stepS>10);
 assert.equal(q.safeForPacket,false);
 assert.equal(q.status,'LONG_GAP_FAIL_CLOSED_NO_MATERIAL_MOVEMENT');
 assert.equal(q.deferredS,0);
 const day=Policy.plan({elapsedS:90000,activePaid8H:true});
 assert.equal(day.totalS,86400);
 assert.equal(day.steps,48);
 assert.equal(day.safeForPacket,false);
 assert.equal(day.deferredS,3600);
 assert.throws(()=>Policy.plan({elapsedS:-1,activePaid8H:true}),/nonnegative/);
 assert.throws(()=>Policy.plan({elapsedS:Infinity,activePaid8H:true}),/nonnegative/);
 assert.throws(()=>Policy.endpoint(at,q,48),/invalid/);
});
test('original outpost T02 owns ALL grid steps; only active dry/gas packets receive new end-of-step timestamp',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/physics/outposts-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(source,/StarfallNativePowerSubsteps8H\.plan\(/);
 assert.match(source,/RT\.logisticsConveyorHasActive8H\?\.\(bodyId\)/);
 assert.match(source,/RT\.logisticsPressureHasActive8H\?\.\(bodyId\)/);
 assert.match(source,/const nativeStepEndS=root\.StarfallNativePowerSubsteps8H\.endpoint\(start,plan,i\)/);
 assert.match(source,/const nativeReportAtS=activePaid8H\?nativeStepEndS:atTime\+past/);
 assert.ok(html.includes('src/physics/native-power-substeps8h.js'));
 assert.ok(html.indexOf('src/physics/native-power-substeps8h.js')<html.indexOf('src/physics/outposts-ui.js'));
 assert.ok(html.indexOf('src/physics/native-power-substeps8h.js')<html.indexOf('src/flight.js'));
 // New policy cannot call the original T02 grid by itself, import stock
 // or write localStorage; only existing outposts-ui store.power(...) may.
 const pure=fs.readFileSync(path.join(__dirname,'../src/physics/native-power-substeps8h.js'),'utf8');
 const executable=pure.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(executable,/\.power\(|\.grid\(|\.commit\(|\.importLot\(|localStorage\.|\.save\(/);
});
