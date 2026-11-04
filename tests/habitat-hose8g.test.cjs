'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
globalThis.StarfallHabitatT09=require('../src/physics/habitat-t09.js');
globalThis.StarfallHabitatCharge8G=require('../src/physics/habitat-charge8g.js');
const Hose=require('../src/physics/habitat-hose8g.js'),req=StarfallHabitatCharge8G.requirements();
const bodyId='star-0-p0',hId='structure8g:1',oId='facility8e:oxygen',nId='facility8e:nitrogen';
const pose={kind:'surface',bodyId,local:[0,1,0]};
const vessel=(id,gas)=>({id,type:'industrial_vessel',location:pose,massKg:195,volumeM3:4,
 condition:1,provenance:'8E real kit',state:{materialId:gas,containerId:'vessel8e:'+id,
 ratedPressurePa:8000000,enabled:true}});
const shell={id:hId,type:'habitat_envelope',location:pose,condition:1,massKg:985.4,
 volumeM3:25,provenance:'structural-8g:'+hId,
 state:{habitable:false,pressurePa:0,oxygenKg:0,inertKg:0,waterKg:0,
  lifeSupportOnline:false,assemblyStatus:'UNPRESSURIZED_ENVELOPE'}};
const physical={schema:1,assets:[
 {id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
  location:{kind:'ship',slot:'starter-truck'}},shell,vessel(oId,'oxygen'),vessel(nId,'nitrogen')
],transfers:[]};
const materials={schema:1,containers:[
 {id:'8d:ship-main:materials',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16},
 {id:'vessel8e:'+oId,ownerId:oId,maxMassKg:1000,maxVolumeM3:4,kind:'gas pressure vessel'},
 {id:'vessel8e:'+nId,ownerId:nId,maxMassKg:1000,maxVolumeM3:4,kind:'gas pressure vessel'}
],lots:[
 {id:'oxy:8e:lot',materialId:'oxygen',containerId:'vessel8e:'+oId,
  massKg:req.oxygen,volumeM3:.03,grade:.999,provenance:'finite-electrolysis'},
 {id:'nit:8g:lot',materialId:'nitrogen',containerId:'vessel8e:'+nId,
  massKg:req.nitrogen,volumeM3:.11,grade:.999,provenance:'finite-atmospheric-capture'},
 {id:'water:ship:lot',materialId:'water',containerId:'8d:ship-main:materials',
  massKg:req.water,volumeM3:.02,grade:1,provenance:'finite-water-stock'}
],operations:[]};
const assembly={schema:1,receipts:[{id:hId,assetId:hId,bodyId,blueprintId:'habitat_shell',status:'ASSEMBLED_NOT_OPERATIONAL'}]};
const a={jobId:'habhose8g:structure8g:1:1',habitatId:hId,oxygenVesselId:oId,
 nitrogenVesselId:nId,bodyId,physical,materials,assembly,shipContainerId:'8d:ship-main:materials',
 shipLocal:[0,1,0],evaLocal:[0,1,0],bodyRadius:1000,
 shipLanded:true,operatorEVA:true,shipPowered:true,
 powerReceipt:{operationId:'habhose8g:structure8g:1:1',status:'COMMITTED',
  sourceId:'ship-main:engineering-battery',usedJ:Hose.WORK_J}};
const orig=JSON.stringify(a),q=Hose.preview(a);
assert.equal(q.ready,true);
assert.ok(q.pressureKPa>95&&q.pressureKPa<105,q);
assert.ok(q.oxygenPartialKPa>20&&q.oxygenPartialKPa<22,q);
assert.equal(q.serviceReady,false);
assert.equal(q.habitable,false);
const t=Hose.transfer(a);
assert.equal(JSON.stringify(a),orig,'Cannot mutate input ledgers');
assert.equal(t.receipt.status,'COMMITTED');
assert.equal(t.receipt.consumedLots.length,3);
assert.equal(t.materials.lots.length,0,'All 3 paid lots consumed');
assert.equal(t.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1);
const hab=t.physical.assets.find(x=>x.id===hId);
const transferredMass=Object.values(req).reduce((s,v)=>s+v,0);
assert.ok(Math.abs(hab.massKg-shell.massKg-transferredMass)<1e-6);
assert.equal(hab.state.habitable,false);
assert.equal(hab.state.lifeSupportOnline,false);
assert.equal(hab.state.airlockSealed,false);
assert.equal(hab.state.habT09.oxygenTankMol,0);
assert.equal(hab.state.habT09.inertTankMol,0);
assert.equal(hab.state.habT09.scrubberCapacityMol,0);
assert.equal(hab.state.habT09.waterL,20);
assert.equal(hab.state.habitatCharge8g.method,'RATED_VESSEL_HOSE');
const gas=StarfallHabitatT09.inspect({kind:'hab',id:hId,bodyId,enabled:false,
 condition:1,habT09:hab.state.habT09},null,false);
assert.equal(gas.serviceReady,false);
assert.ok(gas.pressureKPa>95&&gas.pressureKPa<105);
assert.ok(gas.oxygenKPa>20&&gas.oxygenKPa<22);
const sum=(m,p)=>m.lots.reduce((s,x)=>s+x.massKg,0)+p.assets.reduce((s,x)=>s+x.massKg,0);
assert.ok(Math.abs(sum(materials,physical)-sum(t.materials,t.physical))<1e-6);
assert.throws(()=>Hose.transfer({...a,physical:t.physical,materials:t.materials}),/already received a charge/);
assert.throws(()=>Hose.transfer({...a,powerReceipt:{...a.powerReceipt,usedJ:0}}),/1.5 MJ/);
assert.throws(()=>Hose.transfer({...a,shipPowered:false}),/landed powered/);
assert.throws(()=>Hose.transfer({...a,evaLocal:[1,0,0]}),/100-unit ship hose|24-unit EVA/);
assert.throws(()=>Hose.transfer({...a,physical:{...physical,
 assets:physical.assets.map(x=>x.id===oId?{...x,state:{...x.state,ratedPressurePa:1e6}}:x)}}),/rated oxygen vessel/);
assert.throws(()=>Hose.transfer({...a,physical:{...physical,
 assets:physical.assets.map(x=>x.id===nId?{...x,location:{kind:'ship',parentId:'ship-main',slot:'wrong'}}:x)}}),/physically on this world/);
assert.throws(()=>Hose.transfer({...a,materials:{...materials,lots:materials.lots.filter(x=>x.materialId!=='nitrogen')}}),/Missing physically owned/);
assert.throws(()=>Hose.transfer({...a,materials:{...materials,lots:materials.lots.filter(x=>x.materialId!=='water')}}),/Missing physically owned/);
assert.throws(()=>Hose.transfer({...a,materials:{...materials,operations:[{status:'RESERVED',lotId:materials.lots[0].id,massKg:req.oxygen}]}}),/Missing physically owned/);
assert.throws(()=>Hose.transfer({...a,assembly:{schema:1,receipts:[]}}),/Original consumed/);
assert.throws(()=>Hose.transfer({...a,physical:{...physical,assets:physical.assets.map(x=>x.id===hId?{...x,state:{...x.state,habitatCharge8g:{jobId:'preexisting'}}}:x)}}),/already received a charge/);
const shipVessel={...a,physical:{...physical,assets:physical.assets.map(x=>x.id===oId?
 {...x,location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'}}:x)}};
assert.equal(Hose.preview(shipVessel).ready,true,'A legitimately loaded ship gas cradle is a valid pressurized source');
console.log('PASS 8G habitat rated hose: real O2/N2 vessels + finite 20 kg ship water, T09 pressure, 1.5MJ debit, original truck, no gas duplication or instant life support');
