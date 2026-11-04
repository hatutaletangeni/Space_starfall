'use strict';
const assert=require('node:assert/strict');
const Chem=require('../src/physics/industrial-chemistry8e.js'),Plant=require('../src/physics/industrial-plant8e.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,Math.abs(a-b)+' expected <1e-8');
for(const [id,reaction] of Object.entries(Chem.reactions)){
 assert.equal(Chem.validate(reaction),true);
 const b=Chem.batch(id,100);
 close(Object.values(b.inputs).reduce((a,v)=>a+v,0),Object.values(b.outputs).reduce((a,v)=>a+v,0));
 assert.ok(b.energyJ>0&&b.seconds>0);
}
assert.throws(()=>Chem.validate({station:'test',powerW:10,seconds:1,input:{water:1},output:{hydrogen:1}}),/balanced/);
const recipe=Chem.batch('water_splitting',100);
const materials={schema:1,containers:[
 {id:'feed',kind:'storage',ownerId:'base',maxMassKg:100,maxVolumeM3:1},
 {id:'hydrogen-tank',kind:'gas pressure cylinder',ownerId:'base',maxMassKg:10,maxVolumeM3:.3},
 {id:'oxygen-tank',kind:'gas pressure cylinder',ownerId:'base',maxMassKg:10,maxVolumeM3:.3}],
 lots:[{id:'finite-water',materialId:'water',containerId:'feed',massKg:10,volumeM3:.01,grade:1,provenance:'real-8e-water-lot'}],
 operations:[]};
const surface={kind:'surface',bodyId:'world',local:[0,1,0]};
const assetState={schema:1,assets:[
 {id:'machine',condition:1,location:surface},
 {id:'H2-vessel',condition:1,location:surface,state:{materialId:'hydrogen',containerId:'hydrogen-tank',ratedPressurePa:8e6}},
 {id:'O2-vessel',condition:1,location:surface,state:{materialId:'oxygen',containerId:'oxygen-tank',ratedPressurePa:8e6}}]};
const station={id:'electrolyzer',kind:'electrolyzer',installed:true,enabled:true,condition:1,
 bodyId:'world',sourceContainerId:'feed',tools:Chem.reactions.water_splitting.requiredTools,
 physicalAssetId:'machine',vesselAssetIds:{hydrogen:'H2-vessel',oxygen:'O2-vessel'}};
const args={id:'job-1',reactionId:'water_splitting',materials,sourceContainerId:'feed',
 destinations:{hydrogen:'hydrogen-tank',oxygen:'oxygen-tank'},assetState,station,
 energyReceipt:{operationId:'job-1',usedJ:recipe.energyJ,sourceId:'battery'},bodyId:'world'};
const completed=Plant.create().process(args);
const sum=xs=>xs.reduce((a,l)=>a+l.massKg,0);
close(sum(materials.lots),sum(completed.materials.lots));
assert.equal(completed.materials.lots.find(l=>l.materialId==='hydrogen').containerId,'hydrogen-tank');
assert.equal(completed.materials.lots.find(l=>l.materialId==='oxygen').containerId,'oxygen-tank');
assert.equal(Plant.create(completed.operations).process({...args,materials:completed.materials}).duplicate,true);
const bad=(patch,matcher)=>assert.throws(()=>Plant.create().process({...args,...patch}),matcher);
bad({energyReceipt:null},/power debit/);
bad({station:{...station,installed:false}},/plant/);
bad({assetState:{schema:1,assets:assetState.assets.slice(0,1)}},/vessel/);
bad({materials:{...materials,lots:[]}},/reagent/);
bad({materials:{...materials,lots:[{...materials.lots[0],grade:.6}]}},/reagent/);
console.log('PASS 8E six atom-balanced reactions, two real gas vessels, conservation, idempotency, missing-input/tool/power safety');
