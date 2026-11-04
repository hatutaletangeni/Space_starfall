'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
globalThis.StarfallAssembly8G=require('../src/physics/assembly8g.js');
const Structure=require('../src/physics/structure-assembly8g.js');
const Kit=require('../src/physics/kit-recipes8f.js');
const Site=require('../src/physics/industrial-site8e.js');
const Parts=require('../src/physics/stock-parts8f.js');
const manufacturing=require('../src/physics/manufacturing8f.js');
const EPS=1e-7;
for(const [kitId,station] of [['plant_kit_rocket_integration','rocket_integration'],
 ['plant_kit_habitat_construction_pad','habitat_pad']]){
 const k=Site.KITS[kitId],r=Kit.RECIPES[kitId];
 assert.equal(k.station,station);
 assert.equal(r.outputs[kitId],k.massKg);
 assert.equal(r.outputVolumesM3[kitId],k.volumeM3);
 assert.ok(Math.abs(Object.values(r.inputs).reduce((s,v)=>s+v,0)-k.massKg)<EPS);
 assert.ok(k.workJ>1000000&&r.powerW*r.seconds>1000000);
}
const partIDs=[
 'rocket_tank_section','rocket_engine_chamber','rocket_engine_nozzle','rocket_feed_assembly',
 'rocket_valve_set','rocket_avionics_module','habitat_pressure_section','habitat_airlock_frame',
 'habitat_seal_kit','habitat_life_support_rack','habitat_power_distribution'];
for(const partId of partIDs){
 const r=Parts.RECIPES[partId];
 assert.ok(r&&manufacturing.RECIPES[partId]===r,partId+' absent from actual 8F factory');
 assert.ok(manufacturing.STATIONS[r.station]?.tools.includes(r.tool),partId+' cannot use installed machine tool');
 const before=Object.values(r.inputs).reduce((s,v)=>s+v,0),
   output=Object.values(r.outputs).reduce((s,v)=>s+v,0);
 assert.ok(before>output&&r.powerW*r.seconds>0,partId+' unaccounted matter or power');
}
for(const blueprintId of ['rocket_stage','habitat_shell']){
 const def=StarfallAssembly8G.DEFINITIONS[blueprintId],spec=Structure.BLUEPRINTS[blueprintId],
  mass=Object.values(def.parts).reduce((s,v)=>s+v,0);
 const stock=Object.entries(def.parts).map(([materialId,massKg],i)=>({
  id:'8f-component:'+i,materialId,grade:1,massKg,volumeM3:massKg*.001,
  containerId:'hold',provenance:'manufactured-by-accounted-8f-factory'}));
 const assets=[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
  condition:1,location:{kind:'ship',slot:'starboard-hangar'}},
 {id:'facility-pad',type:'industrial_plant',massKg:800,volumeM3:3,condition:1,
  location:{kind:'surface',bodyId:'planet',local:[0,1,0]},
  state:{station:spec.station,enabled:true}}];
 const a={blueprintId,jobId:'structure8g:1',facilityId:'facility-pad',bodyId:'planet',
  containerId:'hold',local:[.10,Math.sqrt(.99),0],
  materials:{schema:1,containers:[{id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],
   lots:stock,operations:[]},
  physical:{schema:1,assets,transfers:[]},
  energyReceipt:{operationId:'structure8g:1',status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}};
 const priorMass=[...stock,...assets].reduce((n,l)=>n+l.massKg,0);
 const saved=JSON.stringify(a);
 const contract=Structure.create(),quote=contract.quote(a);
 assert.equal(quote.ready,true);
 assert.equal(quote.massKg,mass);
 const r=contract.stage(a);
 assert.equal(JSON.stringify(a),saved);
 assert.equal(r.materials.lots.length,0);
 assert.ok(Math.abs(r.asset.massKg-mass)<EPS);
 assert.equal(r.physical.assets.find(x=>x.id==='truck-expedition-001').location.slot,'starboard-hangar');
 assert.equal(r.physical.assets.filter(x=>x.id===a.jobId).length,1);
 assert.equal(r.asset.state.operational,false);
 assert.equal(r.asset.state.commissioned,false);
 assert.ok(Math.abs(priorMass-
  [...r.materials.lots,...r.physical.assets].reduce((n,l)=>n+l.massKg,0))<EPS);
 if(blueprintId==='rocket_stage'){
  assert.equal(r.asset.state.launchReady,false);assert.equal(r.asset.state.propellantKg,0);
 }else{
  assert.equal(r.asset.state.habitable,false);assert.equal(r.asset.state.pressurePa,0);
 }
 assert.equal(Structure.create(r.assembly).stage({...a,materials:r.materials,physical:r.physical}).duplicate,true);
 assert.throws(()=>Structure.create(r.assembly).stage({...a,physical:a.physical}),/does not match/);
 assert.throws(()=>Structure.create().stage({...a,energyReceipt:{...a.energyReceipt,usedJ:0}}),/power debit/);
 assert.throws(()=>Structure.create().stage({...a,physical:{...a.physical,assets:[assets[0]]}}),/construction pad/);
 assert.throws(()=>Structure.create().stage({...a,physical:{...a.physical,assets:[...assets,{id:a.jobId}]}}),/collision/);
 const noPart={...a,materials:{...a.materials,lots:stock.slice(1)}};
 assert.equal(Structure.create().quote(noPart).ready,false);
 assert.throws(()=>Structure.create().stage(noPart),/Missing certified/);
 const reserved={...a,materials:{...a.materials,
  operations:[{status:'RESERVED',lotId:stock[0].id,massKg:1}]}};
 assert.equal(Structure.create().quote(reserved).ready,false);
 const lowGrade={...a,materials:{...a.materials,lots:stock.map((l,i)=>i===0?{...l,grade:.8}:l)}};
 assert.equal(Structure.create().quote(lowGrade).ready,false);
}
console.log('PASS 8G rocket+habitat construction: actual 8F tools, finite facility kits, exact conserved physical staged assets, no free propellant/oxygen/truck');
