'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
globalThis.StarfallHabitatT09=require('../src/physics/habitat-t09.js');
const I=require('../src/physics/manufactured-eclss8i.js');
const J=require('../src/physics/terraform-operations8j.js');
const T=globalThis.StarfallHabitatT09;
const near=[1,0,0],temperatureK=293.15,oxygenMol=T.gasMoles(21,temperatureK,25),
 nitrogenMol=T.gasMoles(78,temperatureK,25);
const h={...T.defaults(0),schema:1,volumeM3:25,temperatureK,
 oxygenMol,inertMol:nitrogenMol,carbonMol:0,waterL:20,filteredAirMol:0,occupants:0,
 oxygenTankMol:0,inertTankMol:0,scrubberCapacityMol:0,enabled:false,
 seal:.85,awaitingReview:true,lastS:0};
h.tempK=temperatureK;
const totalGas=oxygenMol*.031998+nitrogenMol*.028014;
const charged={
 id:'structure8g:hab-1',type:'habitat_envelope',massKg:985.4+20+totalGas,
 location:{kind:'surface',bodyId:'world:1',local:near},
 provenance:'structural-8g:structure8g:hab-1',condition:1,
 components:[{blueprintId:'habitat_shell',parts:{habitat_life_support_rack:80,habitat_power_distribution:16}}],
 state:{habitatCharge8g:{jobId:'habcharge8g:hab-1',addedMassKg:20+totalGas},
  habT09:h,oxygenKg:oxygenMol*.031998,inertKg:nitrogenMol*.028014,waterKg:20,
  habitable:false,lifeSupportOnline:false,airlockSealed:false}
};
const payable=(id,j)=>({operationId:id,status:'COMMITTED',
 sourceId:'ship-main:engineering-battery',usedJ:j});
assert.equal(I.status(charged).commissioned,false);
assert.throws(()=>I.commission(charged,{timeS:0,jobId:'eclss8i:'+charged.id,powerReceipt:payable('other',I.COMMISSION_J)}),
 /exact original-ship Joule debit/);
const first=I.commission(charged,{timeS:0,jobId:'eclss8i:'+charged.id,
 powerReceipt:payable('eclss8i:'+charged.id,I.COMMISSION_J)});
assert.equal(first.duplicate,false);
assert.equal(first.asset.state.habT09.oxygenTankMol,0,'No T09 free oxygen introduced');
assert.equal(first.asset.state.habT09.inertTankMol,0,'No T09 free inert gas');
assert.equal(first.asset.state.habT09.scrubberCapacityMol,60,'Only already-paid rack capacity activated');
assert.equal(first.asset.state.eclss8i.energyJ,I.COMMISSION_J);
assert.deepEqual(I.commission(first.asset,{timeS:0,jobId:'eclss8i:'+charged.id}).duplicate,true);
const due=I.BASE_W*100,id='eclss8i:cycle:'+charged.id+':0.000:100.000';
assert.throws(()=>I.advance(first.asset,{toS:100,powered:true}),/exact original-ship Joule debit/);
const run=I.advance(first.asset,{toS:100,powered:true,powerReceipt:payable(id,due)});
assert.equal(run.usedJ,due);
assert.ok(run.asset.massKg<=first.asset.massKg);
assert.equal(run.asset.state.habT09.occupants,0);
assert.equal(run.asset.state.habT09.oxygenTankMol,0);
assert.equal(run.asset.state.habT09.waterL,20,'Circulating water does not create new water');
assert.ok(run.asset.state.eclss8i.waterCirculatedKg>0);
const gases=run.asset.state.habT09;
const balanced=run.asset.state.eclss8i.dryMassKg+
 gases.oxygenMol*.031998+gases.inertMol*.028014+
 (gases.carbonMol+gases.filteredAirMol)*.04401+gases.waterL;
assert.ok(Math.abs(run.asset.massKg-balanced)<1e-5,'8I dry+stored gas+filtered gas+water mass closure');
assert.equal(I.advance(run.asset,{toS:100,powered:true}).usedJ,0,'Duplicate sim time never bills energy');
const blackout=I.advance(run.asset,{toS:200,powered:false});
assert.equal(blackout.usedJ,0);assert.ok(blackout.asset.massKg<run.asset.massKg);
assert.equal(blackout.asset.state.lifeSupportOnline,false);
assert.throws(()=>I.advance(run.asset,{toS:99,powered:false}),/reversal/);
assert.throws(()=>I.advance(run.asset,{toS:10000,powered:false}),/bounded 3600 s/);
const body={id:'world:1',kind:'planet',landable:true,radiusM:6e6,
 gravityMS2:9.8,pressurePa:85000,temperatureK:260};
const vessel={id:'vessel:CO2',type:'industrial_vessel',condition:1,
 state:{materialId:'carbon_dioxide',containerId:'vessel:CO2:tank'},
 location:{kind:'surface',bodyId:body.id,local:near}};
const mats={schema:1,containers:[{id:'vessel:CO2:tank',ownerId:vessel.id,
 maxMassKg:50,maxVolumeM3:1}],lots:[{id:'original:co2:1',materialId:'carbon_dioxide',
 containerId:'vessel:CO2:tank',massKg:2,volumeM3:0.03,grade:.999,provenance:'smelter:real'}],
 operations:[]};
const w=J.create(),jobId='terraform8j:'+body.id+':1';
const args={jobId,body,timeS:0,vesselId:vessel.id,lotId:mats.lots[0].id,
 massKg:.1,materials:mats,physical:{schema:1,assets:[vessel]},shipLanded:true,
 operatorEVA:true,shipPowered:true,shipLocal:near,operatorLocal:near,bodyRadiusScene:6000,
 powerReceipt:payable(jobId,J.WORK_J)};
assert.equal(w.inspect(body,0).eventCount,0,'No delta when industry did not intervene');
const released=w.release(args);
assert.equal(released.duplicate,false);
assert.ok(Math.abs(released.materials.lots[0].massKg-1.9)<1e-9);
assert.equal(released.worlds.worlds[body.id].receipts.length,1);
assert.ok(Math.abs(released.receipt.kg-.1)<1e-9);
assert.equal(w.inspect(body,0).eventCount,0,'Models are side-effect-free until saved');
const loaded=J.create(released.worlds);
assert.equal(loaded.release(args).duplicate,true);
assert.equal(loaded.inspect(body,0).eventCount,1);
const after=loaded.inspect(body,100);
assert.ok(after.escapedCO2Kg>0);
assert.ok(after.injectedCO2Kg>0&&after.injectedCO2Kg<.1);
assert.equal(after.pressureChangeResolved,false,'Sub-kg planetary pressure is not magically measurable');
assert.throws(()=>w.release({...args,massKg:.7}),/at most 0.5 kg/);
assert.throws(()=>w.release({...args,operatorLocal:[0,1,0]}),/physical valve/);
assert.throws(()=>w.release({...args,powerReceipt:null}),/5000 J/);
assert.throws(()=>w.release({...args,materials:{...mats,lots:[]}}),/missing source-owned/);
assert.throws(()=>J.create().inspect({...body,pressurePa:0},0),/atmospheric body/);
const index=fs.readFileSync('index.html','utf8'),flight=fs.readFileSync('src/flight.js','utf8');
for(const id of ['manufactured-eclss8i.js','terraform-operations8j.js','environment-ui8ij.js'])
 assert.ok(index.includes(id),'8I/8J must load from actual playable index: '+id);
for(const id of ['manufacturedHabitatCommission8I','manufacturedHabitatRun8I','terraformRelease8J','terraformOperations8j:terraformOperations8j.snapshot()'])
 assert.ok(flight.includes(id),'8I/8J runtime/persistence integration required: '+id);
console.log('PASS 8I manufactured shell zero-crew source ECLSS; finite paid energy, mass closure, water loop, outage, save fields');
console.log('PASS 8J physical original vessel CO2 debit, exact pulse receipt, duplicate suppression, feasibility, conservative low-resolution sensor');
