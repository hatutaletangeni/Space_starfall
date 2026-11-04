'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
const R=require('../src/physics/field-repair8g.js');
const FIX=[0,1,0];
for(const [kind,rule] of Object.entries(R.REPAIRS)){
 const assetId='structure8g:1',jobId='repair8g:1';
 const parts=[{id:'certified-spare',containerId:'ship8d:hold',materialId:rule.part,
  massKg:rule.kg,volumeM3:.01,grade:1,provenance:'test real manufactured finished part'}];
 const materials={schema:1,containers:[{id:'ship8d:hold',ownerId:'ship-main',
  maxMassKg:9000,maxVolumeM3:16}],lots:parts,operations:[]};
 const assets=[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
  condition:1,location:{kind:'ship',parentId:'ship-main',slot:'starboard-hangar'}},
 {id:assetId,type:kind,massKg:750,volumeM3:8,condition:.6,
  location:{kind:'surface',bodyId:'planet',local:FIX},
  state:kind==='habitat_envelope'?{habitable:false,pressurePa:0}:
   kind==='rocket_stage_dry'?{launchReady:false,propellantKg:0}:{operational:false}}];
 const physical={schema:1,assets,transfers:[]};
 const a={assetId,asset:assets[1],jobId,bodyId:'planet',containerId:'ship8d:hold',
  materials,physical,landed:true,eva:true,shipPowered:true,bodyRadius:1000,
  evaLocal:FIX,shipLocal:FIX,
  powerReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
    usedJ:rule.workJ,status:'COMMITTED'}};
 const old=JSON.stringify(a),out=R.operate(a);
 assert.equal(JSON.stringify(a),old);
 assert.equal(out.physical.assets.length,2);
 assert.equal(out.physical.assets[0].id,'truck-expedition-001');
 assert.equal(out.physical.assets[1].massKg,750);
 assert.equal(out.physical.assets[1].condition,Math.min(.999,.6+rule.gain));
 assert.equal(out.receipt.part,rule.part);
 assert.equal(out.materials.lots.length,1);
 assert.equal(out.materials.lots[0].materialId,'manufacturing_scrap');
 assert.equal(out.materials.lots[0].massKg,rule.kg);
 assert.equal(out.materials.lots[0].volumeM3,.01);
 assert.equal(R.operate({...a,physical:out.physical,materials:out.materials}).duplicate,true);
 assert.throws(()=>R.operate({...a,landed:false}),/Landed/);
 assert.throws(()=>R.operate({...a,evaLocal:[1,0,0]}),/nearby EVA/);
 assert.throws(()=>R.operate({...a,powerReceipt:{...a.powerReceipt,usedJ:0}}),/energy/);
 assert.throws(()=>R.operate({...a,materials:{...materials,lots:[]}}),/Missing unreserved/);
 assert.throws(()=>R.operate({...a,materials:{...materials,operations:[{status:'RESERVED',lotId:'certified-spare',massKg:rule.kg}]}}),/Missing unreserved/);
 assert.throws(()=>R.operate({...a,materials:{...materials,lots:[{...parts[0],grade:.4}]}}),/Missing unreserved/);
 assert.throws(()=>R.operate({...a,asset:{...a.asset,type:'bogus'}}),/Unsupported/);
 if(kind==='habitat_envelope')assert.equal(out.physical.assets[1].state.habitable,false);
 if(kind==='rocket_stage_dry')assert.equal(out.physical.assets[1].state.launchReady,false);
 if(kind==='vehicle_frame')assert.equal(out.physical.assets[1].state.operational,false);
}
console.log('PASS 8G finite field repairs: real hardware and energy, exact scrap replacement, no asset creation, no fake life-support/launch status');
