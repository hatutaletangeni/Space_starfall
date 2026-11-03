'use strict';
const assert=require('node:assert/strict');
const A=require('../src/physics/material-ledger8a.js');
const P=require('../src/physics/physical-inventory8a.js');
const S=require('../src/physics/industrial-site8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
function fresh(){
 const led=A.create();led.registerContainer({id:'ship-hold',ownerId:'ship-main',maxMassKg:10000,maxVolumeM3:20});
 let i=0;for(const materialId of ['plant_kit_electrolyzer','vessel_kit_hydrogen','vessel_kit_oxygen']){
  const spec=S.KITS[materialId];led.importLot({id:'kit:'+(++i),materialId,containerId:'ship-hold',
   massKg:spec.massKg,volumeM3:spec.volumeM3,grade:1,provenance:'finite-engineered-kit'});
 }
 led.importLot({id:'finite-water',materialId:'water',containerId:'ship-hold',
  massKg:10,volumeM3:.01,grade:1,provenance:'8E-ice-refinery'});
 return{materials:led.snapshot(),physical:P.create().serialize()};
}
const radius=1000,shipLocal=[0,1,0],vector=t=>[Math.sin(t),Math.cos(t),0];
let state=fresh(),initial=state.materials.lots.reduce((x,a)=>x+a.massKg,0)+state.physical.assets.reduce((x,a)=>x+a.massKg,0);
const sites=[
 {kitLotId:'kit:1',assetId:'facility8e:1',jobId:'plant8e:1',local:vector(.052)},
 {kitLotId:'kit:2',assetId:'facility8e:2',jobId:'plant8e:2',local:vector(.065)},
 {kitLotId:'kit:3',assetId:'facility8e:3',jobId:'plant8e:3',local:vector(.075)}
];
// 8E installations must be separated, yet also within reach of ship / EVA operator.
sites[1].local=[Math.sin(.054)*Math.cos(.02),Math.cos(.054),Math.sin(.054)*Math.sin(.02)];
sites[2].local=[Math.sin(.068)*Math.cos(-.02),Math.cos(.068),Math.sin(.068)*Math.sin(-.02)];
function build(q,operatorLocal=q.local){
 const spec=S.KITS[state.materials.lots.find(x=>x.id===q.kitLotId).materialId];
 const done=S.install({...q,materials:state.materials,physical:state.physical,shipContainerId:'ship-hold',bodyId:'world1',
   bodyRadius:radius,shipLocal,operatorLocal,energyReceipt:{operationId:q.jobId,sourceId:'real-ship-battery',usedJ:spec.workJ}});
 state={materials:done.materials,physical:done.physical};return done;
}
const placed=build(sites[0]);
assert.equal(placed.machine.type,'industrial_plant');assert.equal(placed.machine.massKg,450);
assert.equal(S.install({...sites[0],materials:state.materials,physical:state.physical,shipContainerId:'ship-hold',
 bodyId:'world1',bodyRadius:radius,shipLocal,operatorLocal:sites[0].local}).duplicate,true);
assert.throws(()=>S.install({...sites[1],materials:state.materials,physical:state.physical,
 shipContainerId:'ship-hold',bodyId:'world1',bodyRadius:radius,shipLocal,operatorLocal:sites[0].local,
 energyReceipt:{operationId:sites[1].jobId,sourceId:'battery',usedJ:1e9}}),/overlaps/);
// Use distinct locations well separated horizontally around ship while respecting umbilical.
sites[1].local=[Math.sin(.052)*Math.cos(1.2),Math.cos(.052),Math.sin(.052)*Math.sin(1.2)];
sites[2].local=[Math.sin(.056)*Math.cos(-1.2),Math.cos(.056),Math.sin(.056)*Math.sin(-1.2)];
build(sites[1]);build(sites[2]);
const after=state.materials.lots.reduce((x,a)=>x+a.massKg,0)+state.physical.assets.reduce((x,a)=>x+a.massKg,0);
assert.ok(Math.abs(initial-after)<1e-8);
assert.equal(state.materials.containers.filter(x=>x.kind==='gas pressure vessel').length,2);
const reaction=Chem.batch('water_splitting',100);
const stationAsset=state.physical.assets.find(x=>x.id==='facility8e:1');
const args={id:'electrolysis-one',reactionId:'water_splitting',materials:state.materials,
 sourceContainerId:'ship-hold',destinations:{hydrogen:'vessel8e:facility8e:2',oxygen:'vessel8e:facility8e:3'},
 assetState:state.physical,
 station:{id:stationAsset.id,kind:'electrolyzer',installed:true,enabled:true,condition:1,
   bodyId:'world1',sourceContainerId:'ship-hold',tools:stationAsset.state.tools,physicalAssetId:stationAsset.id,
   vesselAssetIds:{hydrogen:'facility8e:2',oxygen:'facility8e:3'}},
 energyReceipt:{operationId:'electrolysis-one',sourceId:'ship-battery',usedJ:reaction.energyJ},bodyId:'world1'};
const done=Plant.create().process(args);
const mass=x=>x.lots.reduce((a,l)=>a+l.massKg,0);
assert.ok(Math.abs(mass(done.materials)-mass(state.materials))<1e-8);
assert.equal(done.materials.lots.find(x=>x.materialId==='hydrogen').containerId,'vessel8e:facility8e:2');
assert.equal(done.materials.lots.find(x=>x.materialId==='oxygen').containerId,'vessel8e:facility8e:3');
assert.equal(Plant.create(done.operations).process({...args,materials:done.materials}).duplicate,true);
assert.throws(()=>Plant.create().process({...args,energyReceipt:null}),/power debit/);
assert.throws(()=>Plant.create().process({...args,assetState:{...state.physical,assets:state.physical.assets.filter(a=>a.id!=='facility8e:3')}}),/vessel/);
assert.throws(()=>S.install({...sites[0],jobId:'plant8e:4',assetId:'facility8e:4',
 materials:state.materials,physical:state.physical,shipContainerId:'ship-hold',bodyId:'world1',
 bodyRadius:radius,shipLocal,operatorLocal:sites[0].local,energyReceipt:{operationId:'plant8e:4',sourceId:'battery',usedJ:1e9}}),/not onboard/);
console.log('PASS 8E three physical placed assets, finite kit/capacity/energy, element balance, two real gas vessels, no duplicate matter');
