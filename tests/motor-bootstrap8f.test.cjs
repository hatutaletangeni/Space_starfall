'use strict';
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Physical=require('../src/physics/physical-inventory8a.js');
const Transform=require('../src/physics/transformation8e.js');
require('../src/physics/stock-parts8f.js');
const Kits=require('../src/physics/kit-recipes8f.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const Install=require('../src/physics/machine-install8f.js');
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-6,x+' != '+y);
const kit='machine_kit_hand_winder',bom=Factory.billOfMaterials(kit);
near(Object.values(bom.inputs).reduce((s,x)=>s+x,0),32);
assert.equal(bom.outputVolumesM3[kit],.16);
assert.equal(Object.hasOwn(bom.inputs,'electric_motor'),false,'hand-winder cannot require a motor');
assert.equal(Object.hasOwn(bom.inputs,'control_board'),false,'no invented electronics');
assert.equal(Object.hasOwn(bom.inputs,'stocked_chips'),false,'precision semiconductor inventory not conjured');
const store=Stock.create();
store.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
const seed={steel:18.8,copper:3.94,aluminum:4.4,glass:2.1,iron_bracket:2,steel_bracket:3,iron:.7,carbon:.06};
let serial=0;for(const [materialId,massKg] of Object.entries(seed)){
 store.importLot({id:'physically-sourced-'+ ++serial,containerId:'ship',materialId,massKg,
  volumeM3:massKg*.001,grade:1,provenance:'real-8E-and-8F-production'});
}
let materials=store.snapshot(),transformations=Transform.create().snapshot(),poweredJ=0;
let physics=Physical.create().serialize();
const originalAssetMass=physics.assets.reduce((s,a)=>s+a.massKg,0),originalStockMass=Object.values(seed).reduce((s,x)=>s+x,0);
const factory=Factory.create();
const assembly={id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1};
function make(recipeId,machine){
 const a=factory.start({recipeId,materials,sourceContainerId:'ship',outputContainerId:'ship',
  machine,shipLanded:true,bodyId:'planet',powerEnabled:true,batteryJ:1e9});
 let guard=0;while(factory.active?.elapsedS<a.seconds-1e-8){
  if(++guard>300)throw Error('manufacture stuck');
  poweredJ+=factory.step(10,1e9,true).usedJ;
 }
 const output=factory.commit({materials,transformer:Transform.create(transformations),machine});
 materials=output.materials;transformations=output.transformations;factory.apply(output.factory);return output;
}
const kitMade=make(kit,assembly);
const kitLot=materials.lots.find(x=>x.materialId===kit);
assert.ok(kitLot);
near(kitLot.massKg,32);near(kitLot.volumeM3,.16);
const quote=Install.quote({lotId:kitLot.id,materials,physical:physics,containerId:'ship'});
assert.equal(quote.station,'bench');
assert.deepEqual(quote.tools,['hand-winder']);
assert.equal(quote.workJ,65000);
assert.throws(()=>Install.install({lotId:kitLot.id,materials,physical:physics,containerId:'ship',
 assetId:'machine8f:hand-winder',operationId:'install8f:hand-winder',
 shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:'planet',
 energyReceipt:{operationId:'install8f:hand-winder',sourceId:'ship',usedJ:0}}),/energy/);
const inst=Install.install({lotId:kitLot.id,materials,physical:physics,containerId:'ship',
 assetId:'machine8f:hand-winder',operationId:'install8f:hand-winder',
 shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:'planet',
 energyReceipt:{operationId:'install8f:hand-winder',sourceId:'ship-real-battery',usedJ:65000}});
materials=inst.materials;physics=inst.physical;poweredJ+=65000;
const hand={id:inst.machine.id,station:inst.machine.state.station,
 tools:inst.machine.state.tools,installed:true,condition:1};
assert.throws(()=>Factory.quote({recipeId:'motor_field_coil',materials,sourceContainerId:'ship',
 outputContainerId:'ship',machine:assembly}),/tool/);
const coil=make('motor_field_coil',hand);
assert.ok(materials.lots.some(x=>x.materialId==='motor_field_coil'&&x.grade===1));
const motor=make('brushed_dc_motor',hand);
const result=materials.lots.find(x=>x.materialId==='electric_motor');
assert.ok(result&&result.grade===1);
near(result.massKg,2.7);
assert.equal(factory.receipts.length,3);
assert.equal(physics.assets.filter(x=>x.id==='machine8f:hand-winder').length,1);
near(materials.lots.reduce((s,x)=>s+x.massKg,0)+physics.assets.reduce((s,x)=>s+x.massKg,0),
 originalStockMass+originalAssetMass);
near(poweredJ,kitMade.receipt.energyJ+coil.receipt.energyJ+motor.receipt.energyJ+65000);
assert.equal(Install.install({lotId:kitLot.id,materials,physical:physics,containerId:'ship',
 assetId:'machine8f:hand-winder',operationId:'install8f:hand-winder',
 shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:'planet'}).duplicate,true);
assert.equal(physics.assets.filter(x=>x.type==='truck').length,1);
console.log('PASS 8F: real 32kg no-motor hand winder -> installed bench -> finite wound coil -> 2.7kg brushed DC motor; all mass, power and original truck preserved');
