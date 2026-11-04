'use strict';
const assert=require('node:assert/strict');
const Assembly=require('../src/physics/assembly8g.js');
const Inspector=require('../src/physics/assembly-inspector8g.js');
const defs=Assembly.DEFINITIONS;
const materials={schema:1,containers:[{id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],operations:[],lots:[]};
let i=0;for(const [k,n] of Object.entries(defs.truck.parts)){
 materials.lots.push({id:'real:'+ ++i,containerId:'ship',materialId:k,massKg:n,volumeM3:n*.001,grade:1,provenance:'real-8f-manufacture'});
}
const surface={kind:'surface',bodyId:'worldA',local:[0,1,0]};
const physical={schema:1,assets:[{id:'truck-expedition-001',type:'truck',location:{kind:'ship',parentId:'ship-main',slot:'starboard-hangar'},massKg:1600},
 {id:'pad1',type:'industrial_plant',location:surface,condition:1,state:{station:'vehicle_assembly',enabled:true}}]};
const input={blueprintId:'truck',materials,physical,containerId:'ship',bodyId:'worldA',shipLanded:true,powerEnabled:true,operatorNear:true};
const before=JSON.stringify({materials,physical});
const ready=Inspector.report(input);
assert.equal(ready.readyForEngineeringReview,true);
assert.equal(ready.canCommission,false);
assert.equal(ready.facilityId,'pad1');
assert.equal(ready.exactPartMassKg,Object.values(defs.truck.parts).reduce((a,n)=>a+n,0));
assert.equal(ready.parts.every(p=>p.missingKg===0),true);
assert.equal(JSON.stringify({materials,physical}),before,'inspector changed live stock or vehicle assets');
assert.equal(Inspector.report({...input,bodyId:'worldB'}).flags.physicalFacility,false);
assert.equal(Inspector.report({...input,powerEnabled:false}).readyForEngineeringReview,false);
const reserved=JSON.parse(JSON.stringify(materials));
reserved.operations.push({status:'RESERVED',lotId:'real:1',massKg:1});
const q=Inspector.report({...input,materials:reserved});
assert.equal(q.readyForEngineeringReview,false);
assert.ok(q.parts.some(p=>p.missingKg>=1));
const low=JSON.parse(JSON.stringify(materials));low.lots[0].grade=.5;
assert.equal(Inspector.report({...input,materials:low}).readyForEngineeringReview,false);
const foreign=JSON.parse(JSON.stringify(materials));foreign.lots[0].containerId='otherplanet';
assert.equal(Inspector.report({...input,materials:foreign}).readyForEngineeringReview,false);
assert.throws(()=>Inspector.report({...input,blueprintId:'fake-truck'}),/Unknown/);
assert.equal(physical.assets.filter(a=>a.type==='truck').length,1);
console.log('PASS 8G: existing expedition truck unchanged; future truck BOM read-only, real pad, real source, grade, reservation and power gates');
