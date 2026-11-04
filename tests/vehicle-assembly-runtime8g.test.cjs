'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8');
const UI=fs.readFileSync(path.join(__dirname,'../src/physics/assembly-inspector-ui8g.js'),'utf8');
const HTML=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const id of ['StarfallVehicleAssemblyContract8G.create(session.vehicleAssembly8g)',
 'vehicleAssembly8g:vehicleAssembly8g.snapshot()','function assemblyStage8G','function assemblyQuote8G',
 'newMaterials=StarfallMaterials8A.create(output.materials)',
 'newPhysical=StarfallPhysical8A.create(output.physical)',"energyJ:ship.state.energyJ-200000",
 'assemblyContext8G,assemblyQuote8G,assemblyStage8G']){
 assert.ok(Flight.includes(id),'Expected live 8G integration: '+id);
}
assert.ok(UI.includes('rt.assemblyStage8G(select.value,pad.value)'));
assert.ok(UI.includes('stage.disabled='));
assert.ok(HTML.includes('src/physics/vehicle-assembly-contract8g.js'));
assert.ok(HTML.includes('src/physics/vehicle-drive8g.js'));
const A=require('../src/physics/assembly8g.js'),C=require('../src/physics/vehicle-assembly-contract8g.js');
const parts=A.DEFINITIONS.science_rover.parts;
const lots=Object.entries(parts).map(([materialId,massKg],i)=>({
 id:'lot:'+i,materialId,massKg,volumeM3:massKg*.001,containerId:'ship',grade:1,provenance:'fabricated:8f'}));
const mats={schema:1,lots,operations:[],containers:[{id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}]};
const physical={schema:1,assets:[{id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,condition:1,
 location:{kind:'ship',slot:'starboard-hangar'}},{id:'pad',type:'industrial_plant',massKg:760,volumeM3:2.8,condition:1,
 location:{kind:'surface',bodyId:'world',local:[0,1,0]},state:{station:'vehicle_assembly',enabled:true}}]};
const args={jobId:'vehicle8g:1',blueprintId:'science_rover',facilityId:'pad',containerId:'ship',bodyId:'world',
 local:[0,1,0],materials:mats,physical,powerReceipt:{operationId:'vehicle8g:1',
 status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:200000}};
const staged=C.create().stage(args),loaded=C.create(staged.assembly),again=loaded.stage({...args,
 materials:staged.materials,physical:staged.physical});
assert.equal(again.duplicate,true);
assert.equal(staged.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1);
assert.equal(staged.physical.assets.filter(x=>x.id==='vehicle8g:1').length,1);
assert.equal(staged.physical.assets.find(x=>x.id==='vehicle8g:1').state.operational,false);
assert.ok(!staged.materials.lots.length);
const pre=mats.lots.reduce((a,x)=>a+x.massKg,0)+physical.assets.reduce((a,x)=>a+x.massKg,0);
const post=staged.materials.lots.reduce((a,x)=>a+x.massKg,0)+staged.physical.assets.reduce((a,x)=>a+x.massKg,0);
assert.ok(Math.abs(pre-post)<1e-7,'Matter gained/lost in assembly transaction');
console.log('PASS 8G assembly source integration anchors, conservation, no original truck duplication, nonoperational staging and reload idempotence');
