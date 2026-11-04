'use strict';
const assert=require('node:assert/strict');
const Inventory=require('../src/physics/material-ledger8a.js');
const Transform=require('../src/physics/transformation8e.js');
const Refinery=require('../src/physics/refinery8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, String(a)+' ≠ '+b);
const hold='8d:ship-main:materials';
const stock=Inventory.create();
stock.registerContainer({id:hold,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
for(const materialId of ['oxygen','sulfur_dioxide','carbon_dioxide'])
 stock.registerContainer({id:materialId+'-vessel',ownerId:'site',kind:'gas pressure vessel',
 maxMassKg:50,maxVolumeM3:1});
stock.importLot({id:'copper-deposit-1',materialId:'copper_ore',containerId:hold,massKg:20,
 grade:.05,volumeM3:.01,provenance:'8d:8c:surveyed-copper-sulfides'});
stock.importLot({id:'carbon-deposit-1',materialId:'carbon_feed',containerId:hold,massKg:10,
 grade:.2,volumeM3:.005,provenance:'8d:8c:surveyed-carbon-source'});
// Test the oxygen is a real existing gas tank lot. Its upstream production via
// water electrolysis is already covered by industrial-site8e and chemistry tests.
stock.importLot({id:'electrolysis-produced-oxygen',materialId:'oxygen',containerId:'oxygen-vessel',
 massKg:1,grade:1,volumeM3:.0005,provenance:'chemical:water-electrolysis-prior'});
let materials=stock.snapshot(),transforms=Transform.create().snapshot(),chemOps=Plant.create().snapshot(),spent=0;
const sum=x=>x.lots.reduce((n,l)=>n+l.massKg,0),startMass=sum(materials);
const refinery=Refinery.create();
function refine(mode){
 const started=refinery.start({mode,materials,sourceContainerId:hold,outputContainerId:hold,
 shipLanded:true,shipBodyId:'planet',workshopInstalled:true,powerEnabled:true,batteryJ:1e9});
 while(refinery.active.elapsedS+1e-7<started.seconds)spent+=refinery.step(10,1e9,true).usedJ;
 const out=refinery.commit(materials,Transform.create(transforms));
 materials=out.materials;transforms=out.transformations;
}
refine('copper_sort');
assert.ok(materials.lots.some(x=>x.materialId==='copper_concentrate'&&x.grade===.25));
refine('copper_sulfide_identification');
const sulfide=materials.lots.find(x=>x.materialId==='copper_sulfide');
assert.ok(sulfide&&sulfide.grade===1);
const copperFraction=127.092/(127.092+32.06);
close(sulfide.massKg*copperFraction,2*.25*.78);
refine('carbon_recovery');
const loc={kind:'surface',bodyId:'planet',local:[0,1,0]};
const assets={schema:1,assets:[
 {id:'roaster',type:'industrial_plant',location:loc,condition:1},
 {id:'oxygen-tank',type:'industrial_vessel',location:loc,condition:1,
  state:{materialId:'oxygen',containerId:'oxygen-vessel',ratedPressurePa:8e6}},
 {id:'sulfur-tank',type:'industrial_vessel',location:loc,condition:1,
  state:{materialId:'sulfur_dioxide',containerId:'sulfur_dioxide-vessel',ratedPressurePa:8e6}},
 {id:'co2-tank',type:'industrial_vessel',location:loc,condition:1,
  state:{materialId:'carbon_dioxide',containerId:'carbon_dioxide-vessel',ratedPressurePa:8e6}}
]};
const station={id:'roaster',kind:'reduction_furnace',installed:true,enabled:true,
 condition:1,bodyId:'planet',sourceContainerId:hold,physicalAssetId:'roaster',
 tools:['reduction_furnace','gas_capture','sulfide_roaster'],
 vesselAssetIds:{sulfur_dioxide:'sulfur-tank',carbon_dioxide:'co2-tank'},
 reactantAssetIds:{oxygen:'oxygen-tank'}};
function process(reactionId,scaleMol,destinations,reactantSources={}){
 const batch=Chem.batch(reactionId,scaleMol),id='chemical:'+reactionId;
 const result=Plant.create(chemOps).process({id,reactionId,scaleMol,materials,
 sourceContainerId:hold,reactantSources,destinations,assetState:assets,station,bodyId:'planet',
 energyReceipt:{operationId:id,sourceId:'ship-battery',usedJ:batch.energyJ}});
 materials=result.materials;chemOps=result.operations;spent+=batch.energyJ;
}
assert.throws(()=>Plant.create().process({id:'cheat',reactionId:'copper_sulfide_roasting',
 scaleMol:1,materials,sourceContainerId:hold,
 destinations:{copper_oxide:hold,sulfur_dioxide:'sulfur_dioxide-vessel'},
 assetState:assets,station,bodyId:'planet',
 energyReceipt:{operationId:'cheat',sourceId:'ship-battery',usedJ:1e9}}),/vessel/);
process('copper_sulfide_roasting',1,
 {copper_oxide:hold,sulfur_dioxide:'sulfur_dioxide-vessel'},{oxygen:'oxygen-vessel'});
assert.ok(materials.lots.some(x=>x.materialId==='sulfur_dioxide'&&x.containerId==='sulfur_dioxide-vessel'));
assert.ok(materials.lots.some(x=>x.materialId==='copper_oxide'&&x.grade===1));
process('copper_oxide_reduction',1,{copper:hold,carbon_dioxide:'carbon_dioxide-vessel'});
assert.ok(materials.lots.some(x=>x.materialId==='copper'&&x.grade===1));
close(sum(materials),startMass);
assert.ok(spent>1e7);
const saved=Inventory.create(materials);
assert.equal(saved.inventory('sulfur_dioxide-vessel').some(x=>x.materialId==='sulfur_dioxide'),true);
assert.equal(Plant.create(chemOps).process({id:'chemical:copper_sulfide_roasting',
 sourceContainerId:hold,materials}).duplicate,true);
assert.throws(()=>Refinery.quote('copper_sulfide_identification',{
 ...stock.snapshot(),lots:[{id:'fabricated',materialId:'copper_concentrate',containerId:hold,
 massKg:2,volumeM3:.002,grade:1,provenance:'unverified-sulfide'}]
 },hold,hold),/provenanced/);
console.log('PASS 8E copper: 20 kg sulfide ore -> Cu2S -> CuO + captured SO2 -> pure Cu + captured CO2; oxygen consumed from real tank; mass unchanged');
