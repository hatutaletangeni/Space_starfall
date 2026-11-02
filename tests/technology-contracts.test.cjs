/* STARFALL T00: source-catalog freeze; no engine/runtime modification. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=require('./technology-contracts.json');
require('../src/physics/outposts.js');
require('../src/physics/vehicles.js');
require('../src/physics/science-field.js');
require('../src/physics/launch-systems.js');
require('../src/physics/satellites7c.js');
require('../src/physics/assets7a.js');
assert.equal(data.schemaVersion,1);
assert.equal(data.baseline.commit,'3b4cddd84197716f55183de9eb5431de416f44c7');
assert.equal(data.baseline.branch,'feature/update-7f-expedition-hardening');
const categories={
 constructible: Object.keys(globalThis.StarfallOutposts.SPECS),
 'vehicle-component': Object.keys(globalThis.StarfallVehicles.components),
 'scientific-instrument': Object.keys(globalThis.StarfallFieldScience.INSTRUMENTS),
 'rocket-engine': Object.keys(globalThis.StarfallLaunch.ENGINES),
 'launch-payload': Object.keys(globalThis.StarfallLaunch.PAYLOADS),
 'satellite-payload': Object.keys(globalThis.StarfallSatelliteOps7C.PAYLOADS),
 'abstract-contract': Object.keys(globalThis.StarfallEngineering7A.COMP)
};
const ids=new Set();
for (const x of data.inventory) {
 assert.equal(typeof x.id,'string');
 assert(!ids.has(x.id),'Duplicate equipment record '+x.id);
 ids.add(x.id);
 for(const field of ['originalAssetId','label','category','sourcePath','sourceLine','ownerStore','stateSchema','creationSource','powerSource','consumption','inputs','outputs','controlMethod','hardwarePreconditions','dependencies','safetyLimits','faultModes','fidelity','saveMigrationOwner','userVisibleProof','automatedTests','remainingUnverified']){
  assert(x[field]!==null&&x[field]!==undefined&&String(x[field]).length>0,x.id+' missing '+field);
 }
 assert(fs.existsSync(path.join(__dirname,'..',x.sourcePath)),x.id+' source missing: '+x.sourcePath);
 assert.equal(x.status.integrationProven,'NOT VERIFIED');
 assert.equal(x.status.manualRunProven,'NOT VERIFIED');
}
for (const [category,actualIds] of Object.entries(categories)){
 const documented=data.inventory.filter(x=>x.category===category).map(x=>x.originalAssetId).sort();
 assert.deepEqual(documented,actualIds.sort(),'Technology catalog drift: '+category);
 assert.equal(data.categoryCounts[category],actualIds.length);
}
assert.equal(data.inventory.reduce((n,x)=>n+(x.category==='operational-subsystem'),0),19);
for(const k of ['foundation','hab','lab','battery','solar','storage','antenna','connector','outpost-wire','spacecraft','science-rover-local','remote-probe','expedition-truck','satellite-observatory','satellite-relay','rover-camera-7f','satellite-camera-7f','engineering-workbench','research-bench-7e','orbital-survey-map']) {
 assert(typeof data.acceptanceContracts[k]==='string','Missing hardware acceptance: '+k);
}
for(let i=1;i<=18;i++)assert(Array.isArray(data.changeScopes['T'+String(i).padStart(2,'0')]),'Missing T stage scope '+i);
for(const [globalName, contract] of Object.entries(data.expectedExports)) {
 const source=globalThis[globalName];
 assert(source, 'Missing public global contract: '+globalName);
 for(const name of contract.names)assert(Object.hasOwn(source,name),globalName+' missing export '+name);
 if(typeof source.SCHEMA==='number')assert.equal(source.SCHEMA,contract.schema,globalName+' schema drift');
}
for(const [name,version] of Object.entries(data.saveSchemas)) {
 assert(Number.isInteger(version)&&version>=1,'Invalid documented save schema: '+name);
}
assert.equal(data.verification.modelTestsExecutedHere,false);
console.log('PASS T00 catalog/schema audit: '+data.inventory.length+' unique records, '+Object.keys(categories).length+' source catalogs; operational gameplay not claimed.');
