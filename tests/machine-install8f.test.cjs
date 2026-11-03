'use strict';
const assert=require('node:assert/strict');
const Materials=require('../src/physics/material-ledger8a.js');
const Physical=require('../src/physics/physical-inventory8a.js');
const Installation=require('../src/physics/machine-install8f.js');
const beforeMaterials=Materials.create();
beforeMaterials.registerContainer({id:'ship-hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:20});
beforeMaterials.importLot({id:'kit-1',materialId:'machine_kit_cnc',containerId:'ship-hold',
 massKg:220,volumeM3:.42,grade:1,provenance:'finite-certified-import'});
const originalPhysical=Physical.create().serialize();
const beforeMass=beforeMaterials.inventory().reduce((a,l)=>a+l.massKg,0)+originalPhysical.assets.reduce((a,x)=>a+x.massKg,0);
const args={lotId:'kit-1',materials:beforeMaterials.snapshot(),physical:originalPhysical,
 containerId:'ship-hold',assetId:'machine8f:1',operationId:'install8f:1',
 energyReceipt:{operationId:'install8f:1',sourceId:'ship-battery',usedJ:360000},
 shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:'world1'};
const output=Installation.install(args);
assert.equal(output.duplicate,false);
assert.equal(output.materials.lots.length,0);
assert.equal(Physical.create(output.physical).get('machine8f:1').type,'industrial_machine');
assert.equal(Physical.create(output.physical).get('machine8f:1').state.station,'machine');
const afterMass=Materials.create(output.materials).inventory().reduce((a,x)=>a+x.massKg,0)+output.physical.assets.reduce((a,x)=>a+x.massKg,0);
assert.ok(Math.abs(afterMass-beforeMass)<1e-8);
assert.equal(Installation.install({...args,materials:output.materials,physical:output.physical}).duplicate,true);
const reserved=Materials.create(args.materials);reserved.registerContainer({id:'other-hold',ownerId:'remote',maxMassKg:1000,maxVolumeM3:2});
reserved.reserve('reserved-kit','kit-1','other-hold',10);
assert.throws(()=>Installation.install({...args,materials:reserved.snapshot()}),/reserved for a different operation/);
assert.throws(()=>Installation.install({...args,operationId:'install8f:2',assetId:'machine8f:2',
 materials:output.materials,physical:output.physical}),/must be onboard/);
function denied(patch,matcher){assert.throws(()=>Installation.install({...args,...patch}),matcher);}
denied({energyReceipt:null},/energy not paid/);
denied({operatorNear:false},/Board/);
denied({materials:{...args.materials,lots:[]}},/must be onboard/);
denied({materials:{...args.materials,lots:[{...args.materials.lots[0],grade:.2}]}},/certification/);
denied({physical:{...args.physical,assets:[...args.physical.assets,{...output.machine}]}},/already owned/);
assert.throws(()=>Physical.create().install(output.machine,{status:'COMMITTED',id:'fake',assetId:'machine8f:1',
 sourceLotId:'kit-1',massKg:1}),/requires a verified/);
const restored=Physical.create(output.physical);assert.equal(restored.list().filter(a=>a.type==='industrial_machine').length,1);
console.log('PASS 8F one certified real machine kit -> one persistent physically owned machine, exact mass conserved, duplicate and missing-energy guards');
