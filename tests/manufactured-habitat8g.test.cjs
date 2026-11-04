'use strict';
/* #82 first slice: pure source-owned 8G habitat passive monitor.
 * No browser/ship integration is claimed by this test.
 */
const assert=require('node:assert/strict');
const test=require('node:test');
const T=require('../src/physics/habitat-t09.js');
const H=require('../src/physics/manufactured-habitat8g.js');
const O2=0.031998,N2=0.028014;
function shell(seal=.85){
 const oxygenMol=21e3*25/(T.R*293.15),inertMol=78e3*25/(T.R*293.15);
 const o2=oxygenMol*O2,n2=inertMol*N2,water=20,charged=o2+n2+water;
 return{id:'hab-test-001',type:'habitat_envelope',condition:1,massKg:800+charged,
  state:{habitatCharge8g:{jobId:'habhose8g:test',assetId:'hab-test-001',status:'COMMITTED',addedMassKg:charged},
   oxygenKg:o2,inertKg:n2,waterKg:water,habitable:false,lifeSupportOnline:false,airlockSealed:false,
   habT09:{schema:1,volumeM3:25,tempK:293.15,oxygenMol,inertMol,carbonMol:0,
    waterL:water,seal,enabled:false,occupants:0,awaitingReview:true,lastS:0,
    oxygenTankMol:0,inertTankMol:0,scrubberCapacityMol:0}}};
}
test('a physical charged shell reads real 25 m3 partial pressure and stays uncertified',()=>{
 const a=shell(),s=H.inspect(a);
 assert.ok(Math.abs(s.pressureKPa-99)<1e-6);
 assert.ok(Math.abs(s.oxygenKPa-21)<1e-6);
 assert.equal(s.servedW,0);assert.equal(s.habitable,false);
 assert.equal(s.waterKg,20);assert.equal(s.vesselChargeId,'habhose8g:test');
 assert.ok(s.alarms.includes('NO_INSTALLED_LIFE_SUPPORT'));
});
test('leak mass is finite, source-owned and conserves against vent receipt',()=>{
 const a=shell(.5),before=structuredClone(a),q=H.advancePassive(a,3600),s=q.status;
 assert.deepEqual(a,before,'pure function must not mutate source inventory');
 assert.ok(q.ventReceipt.totalKg>0);
 assert.ok(s.pressureKPa<H.inspect(a).pressureKPa);
 assert.ok(Math.abs(a.massKg-q.physicalAsset.massKg-q.ventReceipt.totalKg)<1e-7);
 assert.ok(Math.abs(q.ventReceipt.oxygenKg+q.ventReceipt.nitrogenKg+q.ventReceipt.carbonKg-q.ventReceipt.totalKg)<1e-8);
 assert.equal(s.waterKg,20);
 assert.equal(s.servedW,0);assert.equal(s.habitable,false);
});
test('1x/10x/100x passive equivalence and idempotent same-clock advancement',()=>{
 const a=shell(.62),full=H.advancePassive(a,3600).physicalAsset;
 for(const step of [360,36]){
  let x=a;for(let t=step;t<=3600;t+=step)x=H.advancePassive(x,t).physicalAsset;
  assert.ok(Math.abs(full.massKg-x.massKg)<1e-7);
  assert.ok(Math.abs(full.state.habT09.oxygenMol-x.state.habT09.oxygenMol)<1e-8);
  assert.ok(Math.abs(full.state.passiveLedger8g.ventedKg-x.state.passiveLedger8g.ventedKg)<1e-7);
 }
 const same=H.advancePassive(full,3600);
 assert.equal(same.ventReceipt.totalKg,0);
 assert.equal(same.physicalAsset.massKg,full.massKg);
 const saved=JSON.parse(JSON.stringify(full));
 assert.deepEqual(H.inspect(saved),H.inspect(full),'save JSON reload preserves exact source pressure');
});
test('refuses duplicate/fictional oxygen, free T09 stores, invalid mass and reversed clock',()=>{
 const a=shell();
 assert.throws(()=>H.advancePassive(a,-1),/clock/);
 assert.throws(()=>H.advancePassive(a,86401),/clock/);
 const free=structuredClone(a);free.state.habT09.oxygenTankMol=1050;
 assert.throws(()=>H.inspect(free),/free T09 consumables/);
 const falseMass=structuredClone(a);falseMass.massKg+=10;
 // First inspection cannot infer the original structural dry mass without
 // a persisted baseline; after first recorded passive step it is enforced.
 const after=H.advancePassive(a,12).physicalAsset;
 after.massKg+=10;assert.throws(()=>H.inspect(after),/does not balance/);
 const occupied=structuredClone(a);occupied.state.habT09.occupants=1;
 assert.throws(()=>H.inspect(occupied),/unqualified shell/);
 const powered=structuredClone(a);powered.state.lifeSupportOnline=true;
 assert.throws(()=>H.inspect(powered),/unqualified shell/);
});
