'use strict';
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Transform=require('../src/physics/transformation8e.js');
const Refinery=require('../src/physics/refinery8e.js');
const Chemistry=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, String(a)+' != '+b);
const hold='8d:ship-main:materials';
const ledger=Stock.create();ledger.registerContainer({id:hold,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
ledger.registerContainer({id:'co-capture',ownerId:'site1',kind:'gas pressure vessel',maxMassKg:100,maxVolumeM3:2});
ledger.importLot({id:'8d-iron',containerId:hold,materialId:'iron_ore',massKg:20,volumeM3:.012,
 grade:.35,provenance:'8d:8c:surveyed-iron-rock'});
ledger.importLot({id:'8d-carbon',containerId:hold,materialId:'carbon_feed',massKg:10,volumeM3:.006,
 grade:.2,provenance:'8d:8c:surveyed-carbon-rock'});
let materials=ledger.snapshot(),transforms=Transform.create().snapshot(),operations=Plant.create().snapshot();
const refinery=Refinery.create();let energy=0;
function refine(mode){
 const job=refinery.start({mode,materials,sourceContainerId:hold,outputContainerId:hold,
  workshopInstalled:true,shipLanded:true,shipBodyId:'planet1',powerEnabled:true,batteryJ:1e9});
 for(let n=0;n<300&&refinery.active?.elapsedS<job.seconds-1e-8;n++){
  const r=refinery.step(10,1e9,true);energy+=r.usedJ;
 }
 const done=refinery.commit(materials,Transform.create(transforms));
 materials=done.materials;transforms=done.transformations;
 return done;
}
const mass=x=>x.lots.reduce((a,l)=>a+l.massKg,0);
refine('iron_sort');
const ore=materials.lots.find(l=>l.materialId==='iron_concentrate');
assert.ok(ore?.grade===.6&&ore.massKg>2);
refine('iron_mineralogy');
const hematite=materials.lots.find(l=>l.materialId==='hematite');
assert.ok(hematite&&hematite.grade===1);
const fraction=(2*55.845)/(2*55.845+3*15.999);
close(hematite.massKg*fraction,2*.6*.8);
assert.ok(materials.lots.some(l=>l.materialId==='iron_mineralogy_tailings'));
refine('carbon_recovery');
assert.ok(materials.lots.some(l=>l.materialId==='carbon'&&l.grade===1));
close(mass(materials),30);
const loc={kind:'surface',bodyId:'planet1',local:[0,1,0]};
const assets={schema:1,assets:[
 {id:'furnace-1',condition:1,type:'industrial_plant',location:loc},
 {id:'carbon-monoxide-tank',condition:1,type:'industrial_vessel',location:loc,
  state:{materialId:'carbon_monoxide',containerId:'co-capture',ratedPressurePa:8e6}}
]};
const station={id:'furnace-1',kind:'reduction_furnace',enabled:true,condition:1,
 bodyId:'planet1',sourceContainerId:hold,installed:true,
 tools:['reduction_furnace','gas_capture','alloy_crucible'],physicalAssetId:'furnace-1',
 vesselAssetIds:{carbon_monoxide:'carbon-monoxide-tank'}};
function chemistry(id,scaleMol,destinations){
 const batch=Chemistry.batch(id,scaleMol);
 const operationId='react:'+id;
 const x=Plant.create(operations).process({id:operationId,reactionId:id,scaleMol,materials,
  sourceContainerId:hold,destinations,assetState:assets,station,bodyId:'planet1',
  energyReceipt:{operationId,sourceId:'real-ship-battery',usedJ:batch.energyJ}});
 energy+=batch.energyJ;materials=x.materials;operations=x.operations;return x;
}
const reduction=chemistry('hematite_reduction',5,{iron:hold,carbon_monoxide:'co-capture'});
close(mass(materials),30);
assert.ok(materials.lots.some(l=>l.materialId==='iron'&&l.grade===1));
assert.ok(materials.lots.some(l=>l.materialId==='carbon_monoxide'&&l.containerId==='co-capture'));
const steel=chemistry('steel_alloying',.1,{steel:hold});
close(mass(materials),30);
const alloy=materials.lots.find(l=>l.materialId==='steel');
assert.ok(alloy&&alloy.grade===1);
close(alloy.massKg,(99*55.845+12.011)*.1/1000);
assert.ok(energy>1e7);
assert.equal(Plant.create(operations).process({id:'react:steel_alloying',sourceContainerId:hold,materials}).duplicate,true);
assert.throws(()=>Refinery.quote('iron_mineralogy',{
 ...ledger.snapshot(),lots:[{id:'forged',containerId:hold,materialId:'iron_concentrate',
 massKg:4,volumeM3:.004,grade:1,provenance:'unverified'}]
},hold,hold),/provenanced/);
const noCarbon={...materials,lots:materials.lots.filter(l=>l.materialId!=='carbon')};
assert.throws(()=>Plant.create().process({id:'missing-carbon',reactionId:'steel_alloying',
 scaleMol:.1,materials:noCarbon,sourceContainerId:hold,destinations:{steel:hold},
 assetState:assets,station,bodyId:'planet1',
 energyReceipt:{operationId:'missing-carbon',sourceId:'battery',usedJ:1e9}}),/reagent/);
console.log('PASS iron 8D ore to 8E Fe-concentrate to hematite, carbon recovery, captured CO, iron, steel, source mass=30 kg, paid work and duplicate guards');
