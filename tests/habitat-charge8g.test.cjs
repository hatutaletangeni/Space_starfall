'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
globalThis.StarfallHabitatT09=require('../src/physics/habitat-t09.js');
const C=require('../src/physics/habitat-charge8g.js');
const body='star-0-p0',assetId='structure8g:1',jobId='habcharge8g:'+assetId+':1';
const req=C.requirements(),location={kind:'surface',bodyId:body,local:[0,1,0]};
const materials={schema:1,containers:[{id:'ship8d:hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],
 lots:Object.entries(req).map(([materialId,massKg],i)=>({
  id:'physical-lot:'+i,materialId,massKg,volumeM3:.1,containerId:'ship8d:hold',
  grade:1,provenance:'real industrial chemistry source'})),operations:[]};
const asset={id:assetId,type:'habitat_envelope',massKg:985.4,volumeM3:25,condition:1,
 location,provenance:'structural-8g:'+assetId,state:{habitable:false,pressurePa:0,oxygenKg:0,waterKg:0}};
const physical={schema:1,assets:[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
  condition:1,location:{kind:'ship',slot:'starboard-hangar'}},asset],transfers:[]};
const assembly={schema:1,receipts:[{id:assetId,assetId,blueprintId:'habitat_shell',bodyId:body,
 status:'ASSEMBLED_NOT_OPERATIONAL'}]};
const input={jobId,assetId,bodyId:body,containerId:'ship8d:hold',
 materials,physical,assembly,bodyRadius:1000,shipLocal:[0,1,0],evaLocal:[0,1,0],
 shipLanded:true,operatorEVA:true,shipPowered:true,
 powerReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',status:'COMMITTED',usedJ:C.WORK_J}};
const copy=x=>JSON.parse(JSON.stringify(x)),snapshot=JSON.stringify(input);
const q=C.quote(input);
assert.equal(q.ready,true);assert.ok(q.estimatedPressureKPa>95&&q.estimatedPressureKPa<105);
assert.ok(q.oxygenPartialKPa>20&&q.oxygenPartialKPa<22);
const charged=C.charge(input);
assert.equal(JSON.stringify(input),snapshot,'Pure function cannot modify authoritative snapshots');
assert.ok(charged.materials.lots.length===0);
assert.equal(charged.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1);
const hab=charged.physical.assets.find(x=>x.id===assetId);
assert.ok(hab.massKg>asset.massKg);
assert.equal(hab.state.habitable,false);
assert.equal(hab.state.lifeSupportOnline,false);
assert.equal(hab.state.habT09.oxygenTankMol,0);
assert.equal(hab.state.habT09.inertTankMol,0);
assert.equal(hab.state.habT09.scrubberCapacityMol,0);
assert.equal(hab.state.habT09.waterL,20);
const t09=globalThis.StarfallHabitatT09.inspect({
 id:assetId,kind:'hab',bodyId:body,enabled:false,condition:1,habT09:hab.state.habT09},null,false);
assert.ok(t09.pressureKPa>95 && t09.pressureKPa<105);
assert.ok(t09.oxygenKPa>20 && t09.oxygenKPa<22);
assert.equal(t09.serviceReady,false,'No working life-support supplied by this step');
const initial=materials.lots.reduce((s,x)=>s+x.massKg,0)+
 physical.assets.reduce((s,x)=>s+x.massKg,0);
const final=charged.materials.lots.reduce((s,x)=>s+x.massKg,0)+
 charged.physical.assets.reduce((s,x)=>s+x.massKg,0);
assert.ok(Math.abs(initial-final)<1e-6);
assert.throws(()=>C.charge({...input,physical:charged.physical,materials:charged.materials}),/uncharged|intact/);
assert.throws(()=>C.charge({...input,powerReceipt:{...input.powerReceipt,usedJ:0}}),/1.2 MJ/);
assert.throws(()=>C.charge({...input,assembly:{schema:1,receipts:[]}}),/construction receipt/);
assert.throws(()=>C.charge({...input,shipLanded:false}),/Powered landed/);
assert.throws(()=>C.charge({...input,evaLocal:[1,0,0]}),/within 80|20 units/);
assert.throws(()=>C.charge({...input,materials:{...materials,lots:materials.lots.filter(x=>x.materialId!=='nitrogen')}}),/Missing finite/);
assert.throws(()=>C.charge({...input,materials:{...materials,lots:materials.lots.map(x=>
  x.materialId==='oxygen'?{...x,grade:.7}:x)}}),/Missing finite/);
assert.throws(()=>C.charge({...input,materials:{...materials,operations:[{status:'RESERVED',
 lotId:materials.lots[0].id,massKg:materials.lots[0].massKg}]}}),/Missing finite/);
console.log('PASS finite 8G habitat charged from real O2/N2/water: T09 pressure, full atomic mass, no fake scrubber, no original-truck loss, no repeat');
