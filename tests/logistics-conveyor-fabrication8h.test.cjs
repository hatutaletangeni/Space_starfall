'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/kit-recipes8f.js');
require('../src/physics/stock-parts8f.js');
require('../src/physics/manufacturing8f.js');
const Site=require('../src/physics/industrial-site8e.js');
const Kit=globalThis.StarfallKitRecipes8F;
const M=globalThis.StarfallManufacturing8F;
const direction=t=>[Math.cos(t),Math.sin(t),0],bodyId='star-0-p0',R=1000;
const materials=()=>({schema:1,containers:[
 {id:'8d:ship-main:materials',ownerId:'ship-main',maxMassKg:1000,maxVolumeM3:30}],
 lots:[{id:'real-manufactured-conveyor-kit',materialId:'plant_kit_conveyor_drive',
  containerId:'8d:ship-main:materials',massKg:180,volumeM3:.55,
  provenance:'8f:manufactured:certified',grade:1}],operations:[]});
const physical=()=>({schema:1,assets:[],transfers:[]});
test('8F certified conveyor hardware recipe conserves real inputs and uses finite time/energy',()=>{
 const recipe=Kit.RECIPES.plant_kit_conveyor_drive;
 assert.ok(recipe,'8F kit is actually registered in the core recipe catalog');
 assert.equal(recipe.station,'assembly');
 assert.equal(recipe.tool,'kit-fixture');
 assert.equal(recipe.outputs.plant_kit_conveyor_drive,180);
 assert.ok(Math.abs(Object.values(recipe.inputs).reduce((a,b)=>a+b,0)-180)<1e-7,
  '8F floating point input mass must conserve exactly within numerical tolerance');
 assert.ok(recipe.inputs.electric_motor>0&&recipe.inputs.insulated_wire>0&&
  recipe.inputs.control_board>0,'no magically fabricated motor or control board');
 const bill=M.RECIPES.plant_kit_conveyor_drive;
 assert.deepEqual(bill,recipe);
 assert.ok(bill.powerW>0&&bill.seconds>0);
});
test('8E consumes exactly one certified 180kg kit to install same-mass physical drive',()=>{
 const originalMaterials=materials(),originalPhysical=physical();
 const install=Site.install({
   jobId:'plant8e:conveyor-001',assetId:'facility8e:conveyor-001',
   materials:originalMaterials,physical:originalPhysical,
   shipContainerId:'8d:ship-main:materials',kitLotId:'real-manufactured-conveyor-kit',
   bodyId,local:direction(.05),bodyRadius:R,shipLocal:direction(0),
   operatorLocal:direction(.05),
   energyReceipt:{operationId:'plant8e:conveyor-001',sourceId:'ship-main:engineering-battery',usedJ:410000}
 });
 assert.equal(install.machine.type,'industrial_plant');
 assert.equal(install.machine.state.station,'conveyor_drive');
 assert.equal(install.machine.massKg,180);
 assert.equal(install.machine.state.t02LoadId,undefined,
  'installed machinery must NOT invent a T02 electric connection');
 assert.equal(install.materials.lots.length,0);
 assert.equal(install.physical.assets[0].massKg,180);
 assert.equal(install.physical.transfers[0].action,'INSTALL');
 assert.equal(install.physical.transfers[0].sourceLotId,'real-manufactured-conveyor-kit');
 assert.deepEqual(originalMaterials,materials(),'original inventory unchanged before atomic runtime save');
 assert.deepEqual(originalPhysical,physical(),'original physical world unchanged');
});
test('no free drive without certified grade, physical clearance, or paid energy',()=>{
 const base={jobId:'plant8e:conveyor-1',assetId:'facility8e:conveyor-1',
   materials:materials(),physical:physical(),shipContainerId:'8d:ship-main:materials',
   kitLotId:'real-manufactured-conveyor-kit',bodyId,
   local:direction(.05),bodyRadius:R,shipLocal:direction(0),
   operatorLocal:direction(.05),
   energyReceipt:{operationId:'plant8e:conveyor-1',sourceId:'ship-main:engineering-battery',usedJ:410000}};
 const unpowered=structuredClone(base);unpowered.energyReceipt.usedJ=0;
 assert.throws(()=>Site.install(unpowered),/Insufficient actual installation power/);
 const unqualified=structuredClone(base);unqualified.materials.lots[0].grade=.7;
 assert.throws(()=>Site.install(unqualified),/Incomplete or uncertified/);
 const noKit=structuredClone(base);noKit.materials.lots=[];
 assert.throws(()=>Site.install(noKit),/not onboard/);
 const tooClose=structuredClone(base);tooClose.local=direction(.001);
 tooClose.operatorLocal=direction(.001);
 assert.throws(()=>Site.install(tooClose),/block spacecraft ramps/);
 const duplicateId=structuredClone(base);duplicateId.physical.assets.push({
  id:'facility8e:conveyor-1',type:'industrial_plant',massKg:180,volumeM3:.55,
  condition:1,location:{kind:'surface',bodyId,local:direction(.2)},state:{station:'conveyor_drive'}});
 assert.throws(()=>Site.install(duplicateId),/Duplicate facility asset ID/);
});
