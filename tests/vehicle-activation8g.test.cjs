'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallAssembly8G=require('../src/physics/assembly8g.js');
globalThis.StarfallVehicleDrive8G=require('../src/physics/vehicle-drive8g.js');
const Activation=require('../src/physics/vehicle-activation8g.js');
for(const blueprintId of ['truck','science_rover']){
 const def=StarfallAssembly8G.DEFINITIONS[blueprintId],assetId='vehicle8g:1',
  parts=Object.entries(def.parts).map(([materialId,massKg])=>({materialId,massKg,lotId:materialId+':made'}));
 const kg=Object.values(def.parts).reduce((s,x)=>s+x,0);
 const a={assetId,bodyId:'earth',facilityId:'pad',
  physical:{schema:1,assets:[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
   location:{kind:'ship',slot:'starboard-hangar'}},{id:assetId,type:'vehicle_frame',
   condition:1,massKg:kg,volumeM3:def.volumeM3,location:{kind:'surface',bodyId:'earth',local:[0,1,0]},
   state:{operational:false,commissioned:false},components:[]}],transfers:[]},
  assembly:{schema:1,receipts:[{id:assetId,assetId,bodyId:'earth',facilityId:'pad',
   blueprintId,status:'ASSEMBLED_NOT_OPERATIONAL',massKg:kg,consumedLots:parts}]},
  powerReceipt:{operationId:'activate:'+assetId,status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:2500000}};
 const prev=JSON.stringify(a.physical),done=Activation.activate(a);
 assert.equal(JSON.stringify(a.physical),prev,'Activation mutated authoritative data');
 assert.equal(done.physical.assets.length,2);
 assert.equal(done.physical.assets[0].id,'truck-expedition-001');
 assert.equal(done.asset.id,assetId);
 assert.equal(done.asset.state.operational,true);
 assert.equal(done.asset.state.rideable,true);
 assert.equal(done.asset.state.drive.batteryEnergyJ,Activation.CHARGE_J);
 assert.equal(done.asset.massKg,kg);
 const h=done.asset.state.hardware;
 assert.equal(h.wheelCount,blueprintId==='truck'?4:6);
 assert.ok(StarfallVehicleDrive8G.create(h,done.asset.state.drive).step({throttle:1},
  {gravityMS2:9.81,slopeRad:0,frictionCoefficient:.7},.05).speedMS>0);
 assert.throws(()=>Activation.activate({...a,physical:done.physical}),/already active|Invalid repeated/);
 assert.throws(()=>Activation.activate({...a,powerReceipt:{...a.powerReceipt,usedJ:2000000}}),/2500 kJ/);
 assert.throws(()=>Activation.activate({...a,powerReceipt:{...a.powerReceipt,sourceId:'invented'}}),/2500 kJ/);
 assert.throws(()=>Activation.activate({...a,assembly:{...a.assembly,
  receipts:[{...a.assembly.receipts[0],consumedLots:parts.filter(x=>x.materialId!=='brake_rotor')} ]}}),/Missing paid/);
 assert.throws(()=>Activation.activate({...a,physical:{...a.physical,
  assets:a.physical.assets.map(x=>x.id===assetId?{...x,location:{kind:'ship',slot:'hold'}}:x)}}),/own surface/);
}
console.log('PASS 8G activation: paid complete hardware, 2 MJ charged pack, drivable low speed model, no duplicate originals, no free matter/energy');
