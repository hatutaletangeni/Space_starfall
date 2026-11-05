'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
const kit=require('../src/physics/kit-recipes8f.js');
const industrial=require('../src/physics/industrial-site8e.js');
const orders=require('../src/physics/logistics-orders8h.js');
const local=t=>[Math.cos(t),Math.sin(t),0];
const shipLocal=local(0),depotLocal=local(.055),bodyId='star-0-p0',radius=1000;
const kitId='kit:factory8f:cargo-depot';
function source(){
 return{
  materials:{schema:1,containers:[{id:'8d:ship-main:materials',
   ownerId:'ship-main',kind:'raw-material cargo hold',maxMassKg:9000,maxVolumeM3:16}],
   lots:[{id:kitId,containerId:'8d:ship-main:materials',
   materialId:'plant_kit_cargo_depot',massKg:480,volumeM3:1.8,grade:1,
   provenance:'manufacture8f:certified-finite-inputs'}],operations:[]},
  physical:{schema:1,assets:[],transfers:[]}
 };
}
function install(q,jobId='plant8e:depot-001',assetId='facility8e:depot-001'){
 return industrial.install({jobId,assetId,kitLotId:kitId,
  shipContainerId:'8d:ship-main:materials',bodyId,local:depotLocal,
  bodyRadius:radius,shipLocal,operatorLocal:depotLocal,
  materials:q.materials,physical:q.physical,
  energyReceipt:{operationId:jobId,status:'COMMITTED',usedJ:950000,
   sourceId:'ship-main:engineering-battery'}});
}
test('8H cargo dock is a finite certified 8F kit and conserves every kilogram',()=>{
 const recipe=kit.recipe('plant_kit_cargo_depot');
 assert.equal(Object.values(recipe.inputs).reduce((a,b)=>a+b,0),480);
 assert.equal(recipe.outputs.plant_kit_cargo_depot,480);
 assert.equal(recipe.outputVolumesM3.plant_kit_cargo_depot,1.8);
 assert.equal(industrial.KITS.plant_kit_cargo_depot.workJ,950000);
 const a=source(),stage=install(a);
 const asset=stage.physical.assets.find(x=>x.id==='facility8e:depot-001');
 const container=stage.materials.containers.find(x=>x.ownerId===asset.id);
 assert.equal(stage.receipt.status,'COMMITTED');
 assert.equal(asset.type,'industrial_plant');
 assert.equal(asset.state.station,'cargo_depot');
 assert.equal(asset.massKg,480);
 assert.equal(container.id,asset.state.containerId);
 assert.equal(container.maxMassKg,1200);
 assert.equal(container.maxVolumeM3,1.6);
 assert.equal(stage.materials.lots.length,0,'NEW DEPOT HAS NO FREE STOCK');
 assert.equal(stage.physical.assets.reduce((a,x)=>a+x.massKg,0),480);
 const m=globalThis.StarfallMaterials8A.create(stage.materials);
 assert.throws(()=>m.importLot({id:'overfill',materialId:'iron_ore',
  containerId:container.id,massKg:100,volumeM3:1.61,provenance:'actual-mining'}),/capacity/);
});
test('no install when original kit missing, short or energy unpaid',()=>{
 const a=source();
 const short=structuredClone(a);short.materials.lots[0].massKg=479;
 assert.throws(()=>install(short),/Incomplete or uncertified/);
 const unpaid=industrial.install.bind(null,{...{
  jobId:'plant8e:depot-001',assetId:'facility8e:depot-001',
  kitLotId:kitId,shipContainerId:'8d:ship-main:materials',
  bodyId,local:depotLocal,bodyRadius:radius,shipLocal,operatorLocal:depotLocal,
  materials:a.materials,physical:a.physical},
  energyReceipt:{operationId:'plant8e:depot-001',sourceId:'ship-main:engineering-battery',usedJ:900}});
 assert.throws(unpaid,/Insufficient actual installation power/);
 assert.equal(a.materials.lots.length,1);
});
test('gas pressure vessels cannot transfer gas through unpressurized ore truck/depot',()=>{
 const a=install(source()),depot=a.physical.assets[0],dest=depot.state.containerId;
 const m=globalThis.StarfallMaterials8A.create(a.materials);
 m.registerContainer({id:'rated-oxygen',ownerId:'tank-001',kind:'gas pressure vessel',
  maxMassKg:100,maxVolumeM3:1});
 m.registerContainer({id:'8d:truck-expedition-001:hopper',ownerId:'truck-expedition-001',
  kind:'sealed ore hopper',maxMassKg:800,maxVolumeM3:1.2});
 m.importLot({id:'real-oxygen-lot',materialId:'oxygen',containerId:'rated-oxygen',
  massKg:4,volumeM3:.01,provenance:'real-8E-pressure-vessel',grade:1});
 const sourceSite={id:'tank-001',bodyId,local:depotLocal,containerId:'rated-oxygen'};
 const destinationSite={id:depot.id,bodyId,local:depotLocal,containerId:dest};
 const truck={id:'truck-expedition-001',kind:'truck',bodyId,local:depotLocal,
  containerId:'8d:truck-expedition-001:hopper',operational:true,condition:1};
 assert.throws(()=>orders.create().reserve({id:'8h:gas:unsafe',source:sourceSite,
  destination:destinationSite,actor:truck,lotId:'real-oxygen-lot',
  massKg:1,materials:m.snapshot(),timeS:1,bodyRadius:radius}),/pressurized gas/);
 assert.equal(m.inventory('rated-oxygen')[0].massKg,4);
});
