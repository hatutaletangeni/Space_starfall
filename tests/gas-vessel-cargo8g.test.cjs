'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
const C=require('../src/physics/gas-vessel-cargo8g.js');
const surface={kind:'surface',bodyId:'star-0-p0',local:[0,1,0]};
const asset={id:'facility8e:11',type:'industrial_vessel',massKg:195,volumeM3:4,
 condition:1,provenance:'8E physical kit:actual-factory-kit',location:surface,
 state:{materialId:'nitrogen',containerId:'vessel8e:facility8e:11',ratedPressurePa:8e6,enabled:true}};
const originalTruck={id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
 condition:1,location:{kind:'ship',slot:'starter-truck'}};
const originalRover={id:'rover-science-001',type:'science-rover',massKg:380,volumeM3:3,
 condition:1,location:{kind:'ship',slot:'starter-rover'}};
const materials={schema:1,containers:[{id:asset.state.containerId,ownerId:asset.id,kind:'gas pressure vessel',maxMassKg:1000,maxVolumeM3:4}],
 lots:[{id:'nitrogen:air8g:1',materialId:'nitrogen',containerId:asset.state.containerId,
 massKg:12.8,volumeM3:.063,grade:.999,provenance:'atmosphere-8g:742:tile'}],operations:[]};
const physical={schema:1,assets:[originalTruck,originalRover,asset],transfers:[]};
const args={jobId:'gasCargo8g:1',assetId:asset.id,action:'load',materials,physical,
 bodyId:surface.bodyId,bodyRadius:1000,shipLocal:[0,1,0],evaLocal:[0,1,0],
 shipLanded:true,operatorEVA:true,shipPowered:true,
 powerReceipt:{operationId:'gasCargo8g:1',status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:90000}};
const orig=JSON.stringify(args);
const quote=C.cargoOf(asset,materials);
assert.ok(Math.abs(quote.massKg-207.8)<1e-7);
assert.equal(quote.volumeM3,4);
const loaded=C.transfer(args);
assert.equal(JSON.stringify(args),orig,'Authoritative inputs must not be mutated');
assert.equal(loaded.physical.assets.length,3);
assert.equal(loaded.physical.assets[0].id,originalTruck.id);
assert.equal(loaded.physical.assets[1].id,originalRover.id);
assert.equal(loaded.physical.assets[2].location.slot,C.LIMIT.slot);
assert.equal(loaded.receipt.transportMassKg,207.8);
assert.equal(loaded.receipt.gasLotIds[0],materials.lots[0].id);
assert.deepEqual(loaded.materials,materials,'No cargo gas lot may change ownership or duplicate itself');
assert.equal(C.transfer({...args,physical:loaded.physical}).duplicate,true);
const unload={...args,jobId:'gasCargo8g:2',action:'unload',physical:loaded.physical,
 unloadLocal:[Math.sin(.033),Math.cos(.033),0],
 powerReceipt:{...args.powerReceipt,operationId:'gasCargo8g:2'}};
const recovered=C.transfer(unload);
assert.equal(recovered.physical.assets[2].location.kind,'surface');
assert.equal(recovered.physical.assets[2].location.bodyId,surface.bodyId);
assert.deepEqual(recovered.materials,materials);
assert.equal(C.transfer({...unload,physical:recovered.physical}).duplicate,true);
assert.throws(()=>C.transfer({...args,shipLanded:false}),/Landed powered/);
assert.throws(()=>C.transfer({...args,powerReceipt:{...args.powerReceipt,usedJ:0}}),/90 kJ/);
assert.throws(()=>C.transfer({...args,physical:{...physical,assets:[originalTruck,originalRover]}}),/rated physical gas vessels/);
assert.throws(()=>C.transfer({...args,materials:{...materials,operations:[{id:'r',lotId:materials.lots[0].id,
 destinationId:'vessel',massKg:1,status:'RESERVED'}]}}),/Reserved gas/);
assert.throws(()=>C.transfer({...args,physical:{...physical,assets:[
 originalTruck,originalRover,{...asset,state:{...asset.state,materialId:'oxygen'}}]}}),/Contaminated/);
assert.throws(()=>C.transfer({...args,physical:{...physical,assets:[
 originalTruck,originalRover,{...asset,condition:.1}]}}),/intact/);
assert.throws(()=>C.transfer({...args,physical:{...physical,assets:[
 {...originalTruck,massKg:3500},originalRover,asset]}}),/cargo mass/);
assert.throws(()=>C.transfer({...args,physical:{...physical,assets:[
 originalTruck,originalRover,{...asset,location:{kind:'ship',parentId:'ship-main',slot:C.LIMIT.slot}}]}}),/actual planetary surface/);
assert.throws(()=>C.transfer({...unload,unloadLocal:[0,1,0]}),/obstruct/);
assert.throws(()=>C.transfer({...unload,physical:{...loaded.physical,assets:[
 ...loaded.physical.assets,{id:'another-vessel',type:'industrial_vessel',condition:1,
 massKg:195,volumeM3:4,location:{kind:'surface',bodyId:surface.bodyId,local:unload.unloadLocal},
 state:{materialId:'nitrogen',containerId:'vessel-another',ratedPressurePa:8e6}}]}}),/occupied/);
console.log('PASS 8G rated gas transport: loaded nitrogen stays in single physical vessel and unchanged 8A container, total ship cargo accounts for wet gas mass, paid crane, collision and save-safe custody');
