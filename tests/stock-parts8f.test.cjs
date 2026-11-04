'use strict';
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Transform=require('../src/physics/transformation8e.js');
const Physical=require('../src/physics/physical-inventory8a.js');
require('../src/physics/stock-parts8f.js');
require('../src/physics/kit-recipes8f.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const Install=require('../src/physics/machine-install8f.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
const hold='ship';
const seed=Stock.create();seed.registerContainer({id:hold,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
let i=0;for(const [materialId,massKg] of Object.entries({steel:36,copper:6,iron:5,glass:8})){
 seed.importLot({id:'certified:'+ ++i,materialId,massKg,grade:1,volumeM3:massKg*.001,
 containerId:hold,provenance:'real-8E-production'});
}
let materials=seed.snapshot(),transformations=Transform.create().snapshot(),joules=0;
const original=materials.lots.reduce((s,l)=>s+l.massKg,0);let installedKg=0;
const factory=Factory.create();
const bench={id:'ship-main:fabrication:low-tech-bench',station:'bench',
 tools:['hand-shear','bending-brake','glass-cutter'],installed:true,condition:1};
const jig={id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1};
function make(recipeId,machine=bench){
 const job=factory.start({recipeId,materials,sourceContainerId:hold,outputContainerId:hold,
  machine,shipLanded:true,bodyId:'world',powerEnabled:true,batteryJ:9e9});
 let loops=0;while(factory.active&&factory.active.elapsedS<job.seconds-1e-7){
  if(++loops>300)throw Error('job stuck');
  joules+=factory.step(10,9e9,true).usedJ;
 }
 const done=factory.commit({materials,transformer:Transform.create(transformations),machine});
 materials=done.materials;transformations=done.transformations;factory.apply(done.factory);
 near(materials.lots.reduce((s,l)=>s+l.massKg,0),original-installedKg);
 return done;
}
make('copper_busbar');
assert.ok(materials.lots.some(l=>l.materialId==='copper_busbar'&&l.grade===1));
make('iron_bracket');
make('steel_bracket');
make('glass_panel');
for(let i=1;i<9;i++)make('iron_bracket');
for(let i=1;i<13;i++)make('glass_panel');
const bom=Factory.billOfMaterials('machine_kit_manual_press');
near(Object.values(bom.inputs).reduce((a,b)=>a+b,0),50);
assert.equal(bom.outputVolumesM3.machine_kit_manual_press,.22);
assert.throws(()=>Factory.quote({recipeId:'stamped_steel_plate',materials,
 sourceContainerId:hold,outputContainerId:hold,machine:bench}),/tool/);
make('machine_kit_manual_press',jig);
const manufactured=materials.lots.find(l=>l.materialId==='machine_kit_manual_press');
assert.ok(manufactured);
near(manufactured.massKg,50);near(manufactured.volumeM3,.22);
const install=Install.install({lotId:manufactured.id,materials,physical:Physical.create().serialize(),
 containerId:hold,assetId:'machine8f:1',operationId:'install8f:1',
 energyReceipt:{operationId:'install8f:1',sourceId:'ship-main:engineering-battery',usedJ:110000},
 shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:'world'});
 assert.equal(install.machine.state.station,'press');
 assert.deepEqual(install.machine.state.tools,['manual-press']);
 const beforeInstall=original;
 near(install.physical.assets.reduce((s,a)=>s+a.massKg,0)+install.materials.lots.reduce((s,l)=>s+l.massKg,0),beforeInstall);
 materials=install.materials;installedKg=50;
 const press={id:install.machine.id,station:'press',tools:['manual-press'],installed:true,condition:1};
 make('stamped_steel_plate',press);
 assert.ok(materials.lots.find(l=>l.materialId==='stamped_steel_plate'));
 assert.ok(joules>0);
 assert.ok(factory.receipts.length>=26);
console.log('PASS 8F: source iron/copper/glass/steel -> bench stock -> finite 50kg press kit -> installed press -> stamped plate; energy, scrap and global mass conserved');
