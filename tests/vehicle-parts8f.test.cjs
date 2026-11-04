'use strict';
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Transform=require('../src/physics/transformation8e.js');
require('../src/physics/stock-parts8f.js');
require('../src/physics/kit-recipes8f.js');
const Man=require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
const materials=Stock.create();
materials.registerContainer({id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
let serial=0;
const initial={steel:42.5,aluminum:4.5,copper:.8,carbon:.2};
for(const [materialId,massKg] of Object.entries(initial))materials.importLot({
 id:'finished-metal-'+ ++serial,containerId:'hold',materialId,massKg,
 volumeM3:massKg*.001,grade:1,provenance:'physically-refined-8E'});
let stock=materials.snapshot(),conversions=Transform.create().snapshot(),energy=0;
const factory=Factory.create();
const tools={
 foundry:{id:'installed:c',station:'foundry',tools:['caster'],installed:true,condition:1},
 lathe:{id:'installed:l',station:'machine',tools:['lathe'],installed:true,condition:1},
 grinder:{id:'installed:g',station:'machine',tools:['grinder'],installed:true,condition:1},
 press:{id:'installed:p',station:'press',tools:['manual-press'],installed:true,condition:1},
 fixture:{id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1}
};
// These test fixtures model ALREADY installed hardware; the runtime requires actual
// 8A machine-kit installation to obtain corresponding tools in gameplay.
function build(recipeId,machine){
 const recipe=Man.RECIPES[recipeId];const q=Factory.billOfMaterials(recipeId);
 near(q.scrapKg,Object.values(q.inputs).reduce((s,v)=>s+v,0)-
 Object.values(q.outputs).reduce((s,v)=>s+v,0));
 const job=factory.start({recipeId,materials:stock,sourceContainerId:'hold',
  outputContainerId:'hold',machine,shipLanded:true,bodyId:'world',
  powerEnabled:true,batteryJ:1e9});
 for(let i=0;i<100&&factory.active?.elapsedS<job.seconds-1e-8;i++){
  const k=factory.step(10,1e9,true);energy+=k.usedJ;
 }
 const done=factory.commit({materials:stock,transformer:Transform.create(conversions),machine});
 stock=done.materials;conversions=done.transformations;factory.apply(done.factory);
 assert.ok(stock.lots.some(l=>l.materialId===recipeId));
 near(stock.lots.reduce((s,l)=>s+l.massKg,0),48);
 return done;
}
assert.throws(()=>Factory.quote({recipeId:'wheel_rim',materials:stock,sourceContainerId:'hold',outputContainerId:'hold',machine:tools.fixture}),/tool/);
build('chassis_rail',tools.foundry);
build('wheel_rim',tools.lathe);
build('wheel_hub',tools.grinder);
build('axle_shaft',tools.lathe);
build('leaf_spring',tools.press);
const outputsBefore=stock.lots.filter(l=>l.materialId==='rolling_wheel_core').length;
assert.equal(outputsBefore,0);
build('rolling_wheel_core',tools.fixture);
const core=stock.lots.find(l=>l.materialId==='rolling_wheel_core');
near(core.massKg,7.3);assert.equal(core.grade,1);
assert.equal(stock.lots.some(l=>l.materialId==='wheel_tire'),false);
assert.throws(()=>Factory.quote({recipeId:'wheel_bushing',materials:stock,
 sourceContainerId:'hold',outputContainerId:'hold',machine:tools.fixture}),/tool/);
build('wheel_bushing',tools.lathe);
build('wheel_grouser',tools.press);
const final=build('low_speed_rover_wheel',tools.fixture);
const metalWheel=stock.lots.find(l=>l.materialId==='low_speed_rover_wheel');
near(metalWheel.massKg,10.02);assert.equal(metalWheel.grade,1);
assert.equal(stock.lots.some(l=>l.materialId==='wheel_tire'),false);
assert.equal(factory.receipts.length,9);
assert.equal(stock.lots.some(x=>x.materialId==='truck' || x.materialId==='new_truck'),false,'Parts fabrication must not spawn a vehicle');
assert.ok(stock.lots.some(l=>l.materialId==='manufacturing_scrap'));
const expected=Object.values(Man.RECIPES).length;
assert.ok(expected>20);
near(energy,['chassis_rail','wheel_rim','wheel_hub','axle_shaft','leaf_spring','rolling_wheel_core','wheel_bushing','wheel_grouser','low_speed_rover_wheel']
 .reduce((s,k)=>s+Man.RECIPES[k].powerW*Man.RECIPES[k].seconds,0));
const replay=Transform.create(conversions).snapshot();
assert.equal(replay.operations.length,9);
console.log('PASS 8F vehicle parts: full nine paid jobs: chassis rail, rim/hub, axle, spring, metal wheel bushing+cleats and final low-speed wheel; finite material+scrap and tool gating, no truck magically commissioned');
