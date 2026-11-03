'use strict';
/* STARFALL 8F: certified parts → correctly dimensioned installation kit →
 * real physical pressure vessel, with exact matter and finite energy. */
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Physical=require('../src/physics/physical-inventory8a.js');
const Catalog=require('../src/physics/kit-recipes8f.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const Transformation=require('../src/physics/transformation8e.js');
const Site=require('../src/physics/industrial-site8e.js');
const id='vessel_kit_oxygen',recipe=Catalog.recipe(id);
const kit=Site.KITS[id];
assert.ok(kit,'Kit definition must match constructed physical equipment');
assert.equal(recipe.outputs[id],kit.massKg);
assert.equal(recipe.outputVolumesM3[id],kit.volumeM3);
for(const [key,r] of Object.entries(Catalog.RECIPES)){
 const expected=Site.KITS[key]||require('../src/physics/machine-install8f.js').CAPS[key];
 assert.ok(expected,'Missing matching installation target: '+key);
 assert.ok(Math.abs(r.outputs[key]-expected.massKg)<1e-8);
 assert.ok(Math.abs(r.outputVolumesM3[key]-expected.volumeM3)<1e-8);
 assert.ok(Math.abs(Object.values(r.inputs).reduce((x,y)=>x+y,0)-expected.massKg)<1e-7);
}
const ledger=Stock.create();
ledger.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
let i=0;for(const [materialId,massKg] of Object.entries(recipe.inputs)){
 ledger.importLot({id:'component:'+ (++i),materialId,containerId:'ship',massKg,
  volumeM3:massKg*.001,grade:1,provenance:'finite-certified-manufacture'});
}
const before=ledger.used('ship').massKg;
const machine={id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],
 installed:true,condition:1};
const factory=Factory.create();
const task=factory.start({recipeId:id,materials:ledger.snapshot(),sourceContainerId:'ship',
 outputContainerId:'ship',machine,shipLanded:true,bodyId:'planet',powerEnabled:true,batteryJ:5e6});
let paid=0;for(let i=0;i<200;i++){
 const step=factory.step(10,2e6,true);paid+=step.usedJ;
 if(step.completed)break;
}
const output=factory.commit({materials:ledger.snapshot(),transformer:Transformation.create(),machine});
const after=Stock.create(output.materials),finished=after.inventory('ship').find(l=>l.materialId===id);
assert.ok(finished,'Assembled kit not in authoritative physical ship stock');
assert.equal(after.used('ship').massKg,before);
assert.ok(Math.abs(finished.massKg-kit.massKg)<1e-7);
assert.ok(Math.abs(finished.volumeM3-kit.volumeM3)<1e-7);
assert.equal(finished.grade,1);
assert.ok(Math.abs(paid-recipe.powerW*recipe.seconds)<1e-7);
assert.equal(Factory.create(output.factory).active,null);
const physical=Physical.create().serialize(),surface=[Math.sin(.05),Math.cos(.05),0],
 ship=[0,1,0];
const installed=Site.install({jobId:'plant8e:1',assetId:'facility8e:1',materials:output.materials,
 physical,shipContainerId:'ship',kitLotId:finished.id,bodyId:'planet',local:surface,
 bodyRadius:1000,shipLocal:ship,operatorLocal:surface,
 energyReceipt:{operationId:'plant8e:1',sourceId:'ship-battery',usedJ:kit.workJ}});
const installedStock=Stock.create(installed.materials);
assert.equal(installedStock.inventory('ship').some(x=>x.id===finished.id),false);
assert.ok(Math.abs(installed.physical.assets.reduce((s,a)=>s+a.massKg,0)+
 installedStock.inventory().reduce((s,a)=>s+a.massKg,0)-
 (physical.assets.reduce((s,a)=>s+a.massKg,0)+before))<1e-7);
assert.equal(installed.machine.state.materialId,'oxygen');
assert.equal(Site.install({jobId:'plant8e:1',assetId:'facility8e:1',materials:installed.materials,
 physical:installed.physical,shipContainerId:'ship',kitLotId:finished.id,bodyId:'planet',
 local:surface,bodyRadius:1000,shipLocal:ship,operatorLocal:surface}).duplicate,true);
{
 const poor=Stock.create();poor.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
 assert.throws(()=>Factory.quote({recipeId:id,materials:poor.snapshot(),sourceContainerId:'ship',
 outputContainerId:'ship',machine}),/Missing refined/);
}
{
 const tight=Stock.create();tight.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:.5});
 for(const x of ledger.inventory('ship'))tight.importLot(x);
 assert.throws(()=>Factory.quote({recipeId:id,materials:tight.snapshot(),sourceContainerId:'ship',
 outputContainerId:'ship',machine}),/volume/);
}
console.log('PASS: 22 kit BOMs match physical assets; certified finite materials become one packed oxygen vessel, installation consumes it exactly once; power and volume verified');
