'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/physics/expedition-audit8k.js');
const blank=()=>({physical8a:{schema:1,assets:[]},materials8a:{schema:1,lots:[],containers:[],operations:[]}});
const get=(r,id)=>r.stages.find(x=>x.id===id);
test('8K fresh incomplete save cannot be represented as a completed expedition',()=>{
 const s=blank(),before=structuredClone(s),r=A.evaluate(s);
 assert.equal(r.certified,false);
 assert.equal(r.evidenceComplete,false);
 assert.ok(r.stages.length>=12);
 assert.ok(r.stages.every(x=>x.status==='NOT_PROVEN'));
 assert.deepEqual(s,before);
});
test('8K original truck duplicate fails while one physical owner contributes evidence',()=>{
 const s=blank();s.physical8a.assets.push({id:'truck-expedition-001',location:{kind:'ship'}});
 assert.equal(get(A.evaluate(s),'original_truck').status,'EVIDENCE');
 s.physical8a.assets.push({id:'truck-expedition-001',location:{kind:'surface'}});
 assert.equal(get(A.evaluate(s),'original_truck').status,'NOT_PROVEN');
 assert.equal(A.evaluate(s).integrity.originalTruckCount,2);
});
test('8K creative/test lot and fake manufacturing receipt must not certify physical chain',()=>{
 const s=blank();
 s.materials8a.lots.push({id:'fake',provenance:'TEST_FIXTURE_ONLY',massKg:1});
 s.factory8f={receipts:[{id:'TEST_FIXTURE_fake',status:'COMMITTED',recipeId:'copper_wire'},
   {id:'creative-battery',status:'COMMITTED',recipeId:'battery_cell'}]};
 const r=A.evaluate(s);
 assert.equal(r.integrity.suspiciousFixtureLots,1);
 assert.equal(get(r,'electrical').status,'NOT_PROVEN');
 assert.equal(get(r,'energy').status,'NOT_PROVEN');
 assert.equal(r.certified,false);
});
test('8K real provenance only advances inspected phases; cannot assert unassisted/GPU',()=>{
 const s=blank();
 Object.assign(s,{freshExpedition:{schema:1},initialIndustrialManifest8k:{status:'COMMITTED'},
  resources8c:{surveys:[{id:'survey-1'}],depletions:[{id:'d1',massKg:20}],
    transactions:[{id:'extract-1',status:'COMMITTED'}]},
  refinery8e:{receipts:['copper','iron','water'].map((x,i)=>({
   id:'refine-'+i,mode:x+'_separation',product:x,status:'COMMITTED'}))},
  factory8f:{receipts:['copper_wire','populated_board','solar_module'].map((x,i)=>({
   id:'factory-'+i,recipeId:x,status:'COMMITTED'}))},
  vehicleAssembly8g:{receipts:[{id:'assemble-1',blueprintId:'truck',status:'COMMITTED'}]},
  logisticsOffworldManifests8h:{manifests:[{id:'ship-1',status:'DELIVERED',
   sourceWorldId:'world-a',destinationWorldId:'world-b'}]},
  terraformWorlds8j:{'world-b':{receipts:[{id:'world-gas-1',
    status:'COMMITTED',kind:'PLANET_ATMOSPHERE_EMISSION_8J',massKg:1,
    sourceBatteryJBefore:100000,sourceBatteryJAfter:0}]}}});
 s.physical8a.assets.push({id:'truck-expedition-001',location:{kind:'ship'}},
  {id:'manufactured-truck-002',type:'truck',provenance:'assembly:assemble-1',location:{kind:'surface'}});
 s.outpost5={items:[{id:'hab-1',kind:'hab',enabled:true,habT09:{schema:1,
  enabled:true,waterL:50,oxygenTankMol:1000,scrubberCapacityMol:10,
  airlock:'CLOSED',greenhouse8i:{installed:true,carbonConsumedMol:1,oxygenProducedMol:1}}}]};
 const r=A.evaluate(s);
 for(const id of ['manifest','original_truck','survey','mining','refine','electrical',
  'energy','vehicle','interplanetary','habitat','greenhouse','terraform'])
  assert.equal(get(r,id).status,'EVIDENCE',id);
 assert.equal(get(r,'legacy').status,'NOT_PROVEN');
 assert.equal(get(r,'gpu').status,'NOT_PROVEN');
 assert.equal(r.certified,false);
 assert.equal(r.evidenceComplete,false);
});
