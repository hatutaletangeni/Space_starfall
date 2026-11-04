'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
const Cargo=require('../src/physics/gas-vessel-cargo8g.js');
const fixed=(meters,r=1000)=>[Math.sin(meters/r),Math.cos(meters/r),0];
for(const gas of ['nitrogen','oxygen']){
 const ship={id:'ship-main',type:'ship',massKg:0,volumeM3:0,
  condition:1,location:{kind:'ship',slot:'self'}};
 const truck={id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
  condition:1,location:{kind:'ship',slot:'starboard-hangar'}};
 const rover={id:'rover-science-001',type:'science-rover',massKg:380,volumeM3:3,
  condition:1,location:{kind:'ship',slot:'rover-hold'}};
 const v={id:'facility8e:22',type:'industrial_vessel',massKg:195,volumeM3:4,condition:1,
  provenance:'8E physical kit',location:{kind:'surface',bodyId:'world-1',local:fixed(24)},
  state:{materialId:gas,containerId:'vessel8e:facility8e:22',ratedPressurePa:8e6}};
 const physical={schema:1,assets:[ship,truck,rover,v],transfers:[]};
 const gasLot={id:'chemical:8e:99:'+gas,materialId:gas,
  massKg:24,volumeM3:.11,grade:1,containerId:v.state.containerId,provenance:'physical-chemistry8e:99'};
 const materials={schema:1,containers:[{id:v.state.containerId,
  ownerId:v.id,kind:'gas pressure vessel',maxMassKg:1000,maxVolumeM3:4}],
  lots:[gasLot],operations:[]};
 const powerReceipt={operationId:'gasCargo8g:1',sourceId:'ship-main:engineering-battery',
  usedJ:Cargo.LIMIT.workJ,status:'COMMITTED'};
 const a={jobId:'gasCargo8g:1',assetId:v.id,action:'load',physical,materials,
  bodyId:'world-1',bodyRadius:1000,shipLocal:fixed(0),evaLocal:fixed(24),
  shipLanded:true,operatorEVA:true,powerReceipt};
 const initial=JSON.stringify(a),loaded=Cargo.transfer(a);
 assert.equal(JSON.stringify(a),initial,'Gas loading mutated authoritative snapshots');
 assert.equal(loaded.physical.assets.length,physical.assets.length);
 assert.equal(loaded.physical.assets.find(x=>x.id===v.id).location.slot,Cargo.LIMIT.slot);
 assert.equal(loaded.materials.lots.length,1);
 assert.deepEqual(loaded.materials.lots[0],gasLot);
 assert.equal(loaded.receipt.containedMassKg,24);
 assert.equal(loaded.receipt.totalLoadedMassKg,219);
 assert.equal(loaded.receipt.gasLotIds[0],gasLot.id);
 assert.equal(loaded.receipt.energyJ,Cargo.LIMIT.workJ);
 assert.deepEqual(Cargo.transfer({...a,physical:loaded.physical}).duplicate,true);
 assert.throws(()=>Cargo.transfer({...a,physical:loaded.physical,action:'unload'}),/collision/);
 assert.throws(()=>Cargo.transfer({...a,shipLanded:false}),/Landed ship/);
 assert.throws(()=>Cargo.transfer({...a,powerReceipt:{...powerReceipt,usedJ:0}}),/120 kJ/);
 assert.throws(()=>Cargo.transfer({...a,evaLocal:fixed(95)}),/gantry or EVA/);
 assert.throws(()=>Cargo.transfer({...a,physical:{...physical,assets:physical.assets.map(x=>
  x.id===v.id?{...x,state:{...x.state,ratedPressurePa:2e6}}:x)}}),/rated pressure/);
 assert.throws(()=>Cargo.transfer({...a,materials:{...materials,lots:[{...gasLot,materialId:'hydrogen'}]}}),/mixed gas/);
 assert.throws(()=>Cargo.transfer({...a,materials:{...materials,operations:[{
  id:'reserve1',lotId:gasLot.id,status:'RESERVED',massKg:1}]}}),/reserved/);
 assert.throws(()=>Cargo.transfer({...a,materials:{...materials,lots:[{...gasLot,grade:.6}]}}),/Uncertified/);
 assert.throws(()=>Cargo.transfer({...a,physical:{...physical,assets:[...physical.assets,
  {id:'other-gas',type:'industrial_vessel',massKg:100,volumeM3:2,condition:1,
  location:{kind:'ship',slot:Cargo.LIMIT.slot},
  state:{materialId:gas,containerId:'vessel8e:other',ratedPressurePa:8e6}}]}}),/cradle already occupied/);
 const loadedVessel=loaded.physical.assets.find(x=>x.id===v.id);
 assert.equal(Cargo.cargoMass(loaded.physical,loaded.materials).massKg,
  truck.massKg+rover.massKg+v.massKg+gasLot.massKg);
 const unloadArgs={...a,jobId:'gasCargo8g:2',action:'unload',
  physical:loaded.physical,materials:loaded.materials,
  evaLocal:fixed(36),unloadLocal:fixed(36),
  powerReceipt:{...powerReceipt,operationId:'gasCargo8g:2'}};
 const unloaded=Cargo.transfer(unloadArgs);
 assert.equal(unloaded.physical.assets.find(x=>x.id===v.id).location.bodyId,'world-1');
 assert.equal(unloaded.materials.lots[0].id,gasLot.id,'Gas remained with vessel unchanged');
 assert.equal(unloaded.materials.lots[0].massKg,24);
 assert.equal(unloaded.receipt.containedMassKg,24);
 assert.equal(unloaded.physical.assets.filter(x=>x.id===truck.id).length,1);
 assert.equal(unloaded.physical.assets.filter(x=>x.id===rover.id).length,1);
 assert.equal(Cargo.transfer({...unloadArgs,physical:unloaded.physical}).duplicate,true);
 assert.throws(()=>Cargo.transfer({...unloadArgs,unloadLocal:fixed(99)}),/beyond powered gantry/);
 assert.throws(()=>Cargo.transfer({...unloadArgs,physical:{
  ...loaded.physical,assets:[...loaded.physical.assets,
  {id:'obstruction',type:'industrial_plant',massKg:20,volumeM3:1,
    location:{kind:'surface',bodyId:'world-1',local:fixed(36)}}]}}),/obstructed/);
 const heavy={...a,physical:{...physical,assets:[...physical.assets,
  {id:'mass-blocker',type:'cargo',massKg:1399,volumeM3:10,
   location:{kind:'ship',slot:'other'}}]}};
 assert.throws(()=>Cargo.transfer(heavy),/rated mass/);
}
console.log('PASS 8G gas-vessel cargo: full N2/O2 owned gas lots, shared ship mass, physical bay/clearance and power, no duplicate truck, real load/unload, saved custody');
