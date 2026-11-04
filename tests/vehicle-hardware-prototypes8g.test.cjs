'use strict';
const assert=require('node:assert/strict'),Stock=require('../src/physics/stock-parts8f.js'),
 Assembly=require('../src/physics/assembly8g.js'),Contract=require('../src/physics/vehicle-assembly-contract8g.js');
const ids=['brake_rotor','brake_caliper','steering_knuckle','steering_rack','motor_controller'];
for(const id of ids){
 const r=Stock.RECIPES[id];assert.ok(r,'Missing produced stock '+id);
 const input=Object.values(r.inputs).reduce((a,b)=>a+b,0),output=Object.values(r.outputs).reduce((a,b)=>a+b,0);
 assert.ok(input>output&&output>0,'Unbalanced new hardware recipe '+id);
 assert.ok(r.powerW*r.seconds>0,'Unpaid part recipe '+id);
 assert.match(r.engineeringNote,/not certified|not yet|unimplemented/i);
 for(const blueprint of ['science_rover','truck'])assert.ok(Assembly.DEFINITIONS[blueprint].parts[id]>0);
}
for(const blueprintId of ['science_rover','truck']){
 const parts=Assembly.DEFINITIONS[blueprintId].parts;
 const lots=Object.entries(parts).map(([materialId,massKg],i)=>({
  id:'part:'+i,materialId,massKg,volumeM3:massKg*.001,grade:1,
  provenance:'real-fabrication-8f',containerId:'hold'}));
 const args={jobId:'new-8g-'+blueprintId,blueprintId,facilityId:'pad',containerId:'hold',bodyId:'planet',local:[0,1,0],
 materials:{schema:1,containers:[{id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],lots,operations:[]},
 physical:{schema:1,assets:[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,location:{kind:'ship',slot:'stowage'}},
  {id:'pad',type:'industrial_plant',massKg:760,volumeM3:2.8,condition:1,
   location:{kind:'surface',bodyId:'planet',local:[0,1,0]},state:{station:'vehicle_assembly',enabled:true}}]},
 powerReceipt:{operationId:'new-8g-'+blueprintId,status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:200000}};
 const c=Contract.create(),quote=c.quote(args);assert.equal(quote.ready,true);
 const built=c.stage(args);assert.equal(built.materials.lots.length,0);
 assert.equal(built.physical.assets.find(x=>x.id===args.jobId).state.operational,false);
 assert.equal(built.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1);
 assert.equal(built.receipt.massKg,Object.values(parts).reduce((a,b)=>a+b,0));
 const missing={...args,materials:{...args.materials,lots:lots.filter(x=>x.materialId!=='brake_rotor')}};
 assert.equal(c.quote(missing).ready,false);
 assert.throws(()=>c.stage(missing),/Missing certified manufactured parts/);
}
console.log('PASS 8G steering and braking hardware: finite paid prototypes, complete BOM, conserved assembly and no premature certification');
