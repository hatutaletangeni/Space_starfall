'use strict';
/* 8G's first physical infrastructure slice: real component BOM, cargo volume,
 * battery-powered EVA erection and a persistent unique assembly pad. No fake
 * commissioned/drivable truck is produced by installing the pad. */
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Physical=require('../src/physics/physical-inventory8a.js');
const BOM=require('../src/physics/kit-recipes8f.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const Transfer=require('../src/physics/transformation8e.js');
const Site=require('../src/physics/industrial-site8e.js');
const id='plant_kit_vehicle_assembly_pad',kit=Site.KITS[id],recipe=BOM.recipe(id);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
assert.equal(kit.massKg,760);
assert.equal(kit.volumeM3,2.8);
assert.equal(kit.station,'vehicle_assembly');
close(Object.values(recipe.inputs).reduce((a,b)=>a+b,0),760);
assert.equal(recipe.outputVolumesM3[id],kit.volumeM3);
const ledger=Stock.create();ledger.registerContainer({id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
let index=0;
for(const [materialId,massKg] of Object.entries(recipe.inputs))
 ledger.importLot({id:'real-part:'+ ++index,materialId,massKg,containerId:'hold',
  volumeM3:massKg*.001,grade:1,provenance:'manufactured-with-physical-origin'});
const initial=ledger.used('hold').massKg,originalPhysical=Physical.create().serialize();
const jig={id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1};
const factory=Factory.create(),job=factory.start({recipeId:id,materials:ledger.snapshot(),
 sourceContainerId:'hold',outputContainerId:'hold',machine:jig,
 shipLanded:true,bodyId:'world',powerEnabled:true,batteryJ:1e9});
let used=0;
while(factory.active.elapsedS<job.seconds-1e-8)used+=factory.step(10,1e9,true).usedJ;
close(used,recipe.powerW*recipe.seconds);
const finished=factory.commit({materials:ledger.snapshot(),transformer:Transfer.create(),machine:jig});
const lot=finished.materials.lots.find(x=>x.materialId===id);
assert.ok(lot);close(lot.massKg,760);close(lot.volumeM3,2.8);
const loc=[Math.sin(.06),Math.cos(.06),0],ship=[0,1,0];
const args={jobId:'plant8e:assembly-pad-1',assetId:'facility8e:assembly-pad-1',
 materials:finished.materials,physical:originalPhysical,kitLotId:lot.id,shipContainerId:'hold',
 bodyId:'world',bodyRadius:1000,local:loc,shipLocal:ship,operatorLocal:loc,
 energyReceipt:{operationId:'plant8e:assembly-pad-1',sourceId:'ship-battery',usedJ:kit.workJ}};
const installed=Site.install(args);
assert.equal(installed.machine.type,'industrial_plant');
assert.equal(installed.machine.state.station,'vehicle_assembly');
assert.deepEqual(installed.machine.state.tools,kit.tools);
assert.equal(installed.physical.assets.filter(a=>a.type==='truck').length,1);
assert.equal(installed.physical.assets.filter(a=>a.type==='science-rover').length,1);
close(installed.materials.lots.reduce((s,l)=>s+l.massKg,0)+installed.physical.assets.reduce((s,a)=>s+a.massKg,0),
 initial+originalPhysical.assets.reduce((s,a)=>s+a.massKg,0));
assert.equal(Site.install({...args,materials:installed.materials,physical:installed.physical}).duplicate,true);
assert.throws(()=>Site.install({...args,jobId:'plant8e:assembly-pad-2',assetId:'facility8e:assembly-pad-2',
 materials:installed.materials,physical:installed.physical}),/onboard ship/);
assert.throws(()=>Site.quote({...args,materials:finished.materials,physical:originalPhysical,
 local:[Math.sin(.01),Math.cos(.01),0],operatorLocal:[Math.sin(.01),Math.cos(.01),0]}),/block spacecraft ramps/);
assert.throws(()=>Factory.quote({recipeId:id,materials:{...ledger.snapshot(),lots:[]},
 sourceContainerId:'hold',outputContainerId:'hold',machine:jig}),/Missing refined/);
assert.ok(installed.physical.assets.some(a=>a.id===args.assetId));
console.log('PASS 8G: finite 760 kg BOM -> physical pad installed once; original truck/rover retained, battery and global mass conserved');
