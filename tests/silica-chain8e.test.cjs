'use strict';
/* Mined 8C quartz-bearing rock (measured grade) -> 8E concentrate ->
 * chemical-identifiable 99%-grade SiO2, with exact finite inventory
 * accounting. This is mineral concentration, NOT silicon refining. */
const assert=require('node:assert/strict');
const A=require('../src/physics/material-ledger8a.js');
const T=require('../src/physics/transformation8e.js');
const R=require('../src/physics/refinery8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Site=require('../src/physics/industrial-plant8e.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const ship='8d:ship-main:materials';
const model=A.create();model.registerContainer({id:ship,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
model.importLot({id:'8d:mined-quartz:1',containerId:ship,materialId:'silica',massKg:20,
  volumeM3:.012,grade:.7,provenance:'8d:8c:surveyed-quartz-site'});
let inventory=model.snapshot(),operations=T.create().snapshot(),paid=0;
function run(mode){
 const factory=R.create(),job=factory.start({mode,materials:inventory,sourceContainerId:ship,
  outputContainerId:ship,workshopInstalled:true,shipLanded:true,shipBodyId:'world1',
  powerEnabled:true,batteryJ:10e6});
 while(factory.active.elapsedS+1e-8<job.seconds){
  const step=factory.step(Math.min(10,job.seconds-factory.active.elapsedS),1e9,true);
  paid+=step.usedJ;
 }
 const result=factory.commit(inventory,T.create(operations));
 inventory=result.materials;operations=result.transformations;return result;
}
assert.throws(()=>R.quote('silica_polish',inventory,ship,ship),/provenanced/);
const first=run('silica_sort');
const firstConcentrate=inventory.lots.find(l=>l.materialId==='silica_concentrate');
close(firstConcentrate.grade,.95);
assert.ok(firstConcentrate.massKg>10);
assert.equal(firstConcentrate.provenance,'process:refine8e:1');
const last=run('silica_polish');
const purified=inventory.lots.find(l=>l.materialId==='silicon_dioxide');
assert.ok(purified);
close(purified.grade,.99);close(purified.massKg,10*.95*.82/.99);
close(inventory.lots.reduce((a,l)=>a+l.massKg,0),20);
close(paid,1500*130+4200*320);
assert.ok(inventory.lots.some(l=>l.materialId==='silica_polishing_tailings'));
assert.ok(inventory.lots.some(l=>l.materialId==='silicate_tailings'));
assert.equal(T.create(operations).convert({operationId:last.receipt.id,
  containerId:ship,outputContainerId:ship,materials:inventory}).duplicate,true);
const independentlyImported=A.create();independentlyImported.registerContainer({id:ship,ownerId:'ship-main',maxMassKg:1000,maxVolumeM3:10});
independentlyImported.importLot({id:'pretend',containerId:ship,materialId:'silica_concentrate',massKg:10,
  volumeM3:.006,grade:1,provenance:'unverified:claim'});
assert.throws(()=>R.quote('silica_polish',independentlyImported.snapshot(),ship,ship),/provenanced/);
const recipe=Chem.batch('glass_fusing',100);
const assetState={schema:1,assets:[{id:'real-glass-furnace',type:'industrial_plant',condition:1,
  location:{kind:'surface',bodyId:'world1',local:[0,1,0]}}]};
const station={id:'real-glass-furnace',physicalAssetId:'real-glass-furnace',
  kind:'glass_furnace',bodyId:'world1',sourceContainerId:ship,enabled:true,installed:true,condition:1,
  tools:['glass_furnace','mold'],vesselAssetIds:{}};
const converted=Site.create().process({id:'test-glass-1',reactionId:'glass_fusing',scaleMol:100,
 materials:inventory,sourceContainerId:ship,destinations:{glass:ship},assetState,station,bodyId:'world1',
 energyReceipt:{operationId:'test-glass-1',sourceId:'ship-battery',usedJ:recipe.energyJ}});
close(converted.materials.lots.reduce((a,l)=>a+l.massKg,0),20);
assert.ok(converted.materials.lots.some(l=>l.materialId==='glass'));
console.log('PASS 8E: mined quartz grade 70% -> concentrate 95% -> SiO2 99% -> glass, finite power, mass, provenance and duplicate checks');
