'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
const Repair=require('../src/physics/structure-repair8g.js');
function fixture(type,energy=3000000){
 const spec=Repair.SPECS[type],assetId='structure8g:1';
 const lots=Object.entries(spec.parts).map(([materialId,massKg],i)=>({
  id:'finished8f:'+i,materialId,massKg,
  volumeM3:massKg*.001,containerId:'hold',grade:1,
  provenance:'physical-machined-component'}));
 return{jobId:'repair8g:1',assetId,bodyId:'planet',containerId:'hold',
  materials:{schema:1,containers:[{id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],
   lots,operations:[]},
  physical:{schema:1,assets:[
   {id:'ship-main',type:'ship',massKg:0,volumeM3:0,condition:1,
    location:{kind:'ship',slot:'self'}},
   {id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,condition:1,
    location:{kind:'ship',slot:'starboard-hangar'}},
   {id:'repair-pad',type:'industrial_plant',massKg:900,volumeM3:3,condition:1,
    location:{kind:'surface',bodyId:'planet',local:[0,1,0]},
    state:{enabled:true,station:spec.station}},
   {id:assetId,type,massKg:950,volumeM3:20,condition:.52,
    location:{kind:'surface',bodyId:'planet',local:[.08,Math.sqrt(1-.08**2),0]},
    state:{commissioned:false,operational:false,assemblyFacilityId:'repair-pad',
     pressurePa:0,habitable:false,launchReady:false}}
  ],transfers:[]},
  powerReceipt:{operationId:'repair8g:1',status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:energy}};
}
for(const type of Object.keys(Repair.SPECS)){
 const a=fixture(type),spec=Repair.SPECS[type],old=JSON.stringify(a);
 const total=x=>x.materials.lots.reduce((s,y)=>s+y.massKg,0)+
   x.physical.assets.reduce((s,y)=>s+y.massKg,0);
 const prior=total(a),q=Repair.quote(a);
 assert.equal(q.ready,true);
 assert.equal(q.replacementMassKg,Object.values(spec.parts).reduce((s,x)=>s+x,0));
 assert.equal(q.conditionAfter,.77);
 const r=Repair.repair(a);
 assert.equal(JSON.stringify(a),old,'Source inventory mutated');
 assert.equal(r.duplicate,false);
 assert.equal(r.asset.condition,.77);
 assert.equal(r.asset.massKg,950);
 assert.equal(r.asset.state.commissioned,false);
 assert.equal(r.asset.state.operational,false);
 assert.equal(r.asset.state.pressurePa,0);
 assert.equal(r.asset.state.habitable,false);
 assert.equal(r.asset.state.launchReady,false);
 assert.equal(r.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1);
 assert.equal(r.physical.assets.filter(x=>x.id==='structure8g:1').length,1);
 assert.equal(r.materials.lots.length,1);
 assert.equal(r.materials.lots[0].materialId,'manufacturing_scrap');
 assert.equal(r.materials.lots[0].massKg,q.replacementMassKg);
 assert.ok(Math.abs(prior-total(r))<1e-7,'Mass created by repair');
 assert.equal(Repair.repair({...a,materials:r.materials,physical:r.physical}).duplicate,true);
 assert.throws(()=>Repair.repair({...a,physical:{...a.physical,
  assets:a.physical.assets.filter(x=>x.id!=='repair-pad')}}),/facility/);
 assert.throws(()=>Repair.repair({...a,powerReceipt:{...a.powerReceipt,usedJ:0}}),/repair debit/);
 assert.throws(()=>Repair.repair({...a,powerReceipt:{...a.powerReceipt,sourceId:'fictional'}}),/repair debit/);
 const reserved={...a,materials:{...a.materials,operations:[{
   id:'held',status:'RESERVED',lotId:a.materials.lots[0].id,massKg:1}]}};
 assert.equal(Repair.quote(reserved).ready,false);
 assert.throws(()=>Repair.repair(reserved),/Missing certified/);
 const lowgrade={...a,materials:{...a.materials,lots:a.materials.lots.map((x,i)=>i===0?{...x,grade:.1}:x)}};
 assert.equal(Repair.quote(lowgrade).ready,false);
 assert.throws(()=>Repair.repair(lowgrade),/Missing certified/);
 const noRoom={...a,materials:{...a.materials,
  containers:[{...a.materials.containers[0],maxVolumeM3:.0001}]}};
 assert.throws(()=>Repair.repair(noRoom),/Destination capacity|exceeded/);
}
console.log('PASS 8G structural repair: finite energy/parts, conserved recovered scrap, repeated idempotence, original vehicles, launch/habitat safety gates');
