'use strict';
/* Sequential 8C/8D-like aluminum-ore lots -> 8E mineral separation ->
 * balanced model alumina -> carbon-anode electrolytic Al with captured CO2.
 * This is NOT a validated industrial Bayer digestion / Hall–Héroult model. */
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Trans=require('../src/physics/transformation8e.js');
const Ref=require('../src/physics/refinery8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
const hold='ship',tank='co2-vessel';
const src=Stock.create();
src.registerContainer({id:hold,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
src.registerContainer({id:tank,ownerId:'aluminum-site',kind:'gas pressure vessel',maxMassKg:40,maxVolumeM3:1});
src.importLot({id:'mined-8d-aluminosilicate',materialId:'aluminum_ore',containerId:hold,
 massKg:20,volumeM3:.013,grade:.30,provenance:'8d:8c:mineral-survey'});
src.importLot({id:'mined-8d-carbon',materialId:'carbon_feed',containerId:hold,
 massKg:10,volumeM3:.007,grade:.2,provenance:'8d:8c:carbon-rock'});
let m=src.snapshot(),ops=Trans.create().snapshot(),chemOps=Plant.create().snapshot(),spent=0;
const baseMass=m.lots.reduce((n,l)=>n+l.massKg,0),ref=Ref.create();
function processRefinery(mode){
 const a=ref.start({mode,materials:m,sourceContainerId:hold,outputContainerId:hold,
  workshopInstalled:true,shipLanded:true,shipBodyId:'alumina-world',powerEnabled:true,batteryJ:1e9});
 for(let i=0;i<300&&ref.active?.elapsedS<a.seconds-1e-8;i++)spent+=ref.step(10,1e9,true).usedJ;
 const done=ref.commit(m,Trans.create(ops));m=done.materials;ops=done.transformations;return done;
}
processRefinery('aluminum_sort');
const concentrate=m.lots.find(x=>x.materialId==='aluminosilicate_concentrate');
assert.ok(concentrate&&concentrate.grade===.65&&concentrate.massKg>2);
processRefinery('aluminosilicate_identification');
const clay=m.lots.find(x=>x.materialId==='hydrated_aluminosilicate');
assert.ok(clay&&clay.grade===1);
near(clay.massKg,2*.65*.80);
assert.ok(m.lots.some(x=>x.materialId==='aluminosilicate_mineralogy_tailings'));
processRefinery('carbon_recovery');
const loc={kind:'surface',bodyId:'alumina-world',local:[0,1,0]};
const assets={schema:1,assets:[
 {id:'kiln-1',condition:1,type:'industrial_plant',location:loc},
 {id:'electrolyzer-1',condition:1,type:'industrial_plant',location:loc},
 {id:'co2-1',condition:1,type:'industrial_vessel',location:loc,
  state:{materialId:'carbon_dioxide',containerId:tank,ratedPressurePa:8e6}}
]};
function react(reactionId,scaleMol,station,destinations){
 const batch=Chem.batch(reactionId,scaleMol),receiptId='al-chem:'+reactionId;
 const done=Plant.create(chemOps).process({id:receiptId,reactionId,scaleMol,materials:m,
  sourceContainerId:hold,destinations,assetState:assets,station,bodyId:'alumina-world',
  energyReceipt:{operationId:receiptId,sourceId:'ship-power-bus',usedJ:batch.energyJ}});
 m=done.materials;chemOps=done.operations;spent+=batch.energyJ;return done;
}
const kiln={id:'kiln-1',kind:'reduction_furnace',installed:true,enabled:true,condition:1,
 bodyId:'alumina-world',sourceContainerId:hold,
 tools:['reduction_furnace','calcination_tray'],physicalAssetId:'kiln-1',vesselAssetIds:{}};
const calc=react('aluminosilicate_calcination',1,kiln,{aluminum_oxide:hold,silicon_dioxide:hold,water:hold});
assert.ok(m.lots.some(x=>x.materialId==='aluminum_oxide'&&x.grade===1));
assert.ok(m.lots.some(x=>x.materialId==='silicon_dioxide'&&x.grade===1));
assert.ok(m.lots.some(x=>x.materialId==='water'&&x.grade===1));
const cell={id:'electrolyzer-1',kind:'high_temp_cell',installed:true,enabled:true,condition:1,
 bodyId:'alumina-world',sourceContainerId:hold,
 tools:['high_temp_cell','carbon_anode','gas_capture'],
 physicalAssetId:'electrolyzer-1',vesselAssetIds:{carbon_dioxide:'co2-1'}};
react('aluminum_electrolysis',.4,cell,{aluminum:hold,carbon_dioxide:tank});
const al=m.lots.find(x=>x.materialId==='aluminum');
assert.ok(al&&al.grade===1&&al.massKg>0);
assert.ok(m.lots.some(x=>x.materialId==='carbon_dioxide'&&x.containerId===tank));
near(m.lots.reduce((n,l)=>n+l.massKg,0),baseMass);
assert.ok(spent>2e7);
assert.equal(Stock.create(m).inventory(tank).some(x=>x.materialId==='carbon_dioxide'),true);
assert.equal(Plant.create(chemOps).process({id:'al-chem:aluminum_electrolysis',
 sourceContainerId:hold,materials:m}).duplicate,true);
const forged=Stock.create();forged.registerContainer({id:hold,ownerId:'ship',maxMassKg:9000,maxVolumeM3:16});
forged.importLot({id:'forged',materialId:'aluminosilicate_concentrate',containerId:hold,
 massKg:2,volumeM3:.003,grade:1,provenance:'unverified'});
assert.throws(()=>Ref.quote('aluminosilicate_identification',forged.snapshot(),hold,hold),/provenanced/);
assert.throws(()=>Plant.create().process({id:'al-no-gas',reactionId:'aluminum_electrolysis',scaleMol:.05,
 materials:m,sourceContainerId:hold,destinations:{aluminum:hold,carbon_dioxide:tank},
 assetState:{...assets,assets:assets.assets.slice(0,2)},station:cell,bodyId:'alumina-world',
 energyReceipt:{operationId:'al-no-gas',sourceId:'battery',usedJ:1e9}}),/vessel/);
console.log('PASS 8E aluminum: mined 20kg aluminosilicate ore -> identified mineral -> finite alumina + silica + water -> Al + separately captured CO2, 30kg conserved');
