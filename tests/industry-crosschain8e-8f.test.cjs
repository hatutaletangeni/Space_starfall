'use strict';
/* End-to-end material math with explicit finite certified chemical feedstocks and
 * physically registered equipment. Does not bypass missing raw ore chemistry. */
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const Transfer=require('../src/physics/transformation8e.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' ≠ '+b);
const batch=Chem.batch('copper_oxide_reduction',100);
const material=Stock.create();
material.registerContainer({id:'workshop',ownerId:'ship-main',kind:'solid stock',maxMassKg:100,maxVolumeM3:1});
material.registerContainer({id:'co2-tank',ownerId:'ship-main',kind:'gas pressure vessel',maxMassKg:100,maxVolumeM3:.2});
for(const [materialId,massKg] of Object.entries(batch.inputs))
 material.importLot({id:'cert:'+materialId,materialId,massKg,volumeM3:massKg*.001,
  grade:1,containerId:'workshop',provenance:'finite-certified-import'});
const before=material.inventory().reduce((s,l)=>s+l.massKg,0);
const loc={kind:'surface',bodyId:'world1',local:[0,1,0]};
const machine={id:'reduction-station',kind:'reduction_furnace',bodyId:'world1',condition:1,installed:true,
 sourceContainerId:'workshop',enabled:true,tools:Chem.reactions.copper_oxide_reduction.requiredTools,
 physicalAssetId:'station-object',vesselAssetIds:{carbon_dioxide:'co2-object'}};
const assets={schema:1,assets:[{id:'station-object',condition:1,location:loc},
 {id:'co2-object',condition:1,location:loc,state:{materialId:'carbon_dioxide',containerId:'co2-tank',ratedPressurePa:8e6}}]};
const chemical=Plant.create().process({id:'reduce1',reactionId:'copper_oxide_reduction',scaleMol:100,
 materials:material.snapshot(),sourceContainerId:'workshop',
 destinations:{copper:'workshop',carbon_dioxide:'co2-tank'},assetState:assets,station:machine,
 energyReceipt:{operationId:'reduce1',sourceId:'power-cell',usedJ:batch.energyJ},bodyId:'world1'});
const refined=Stock.create(chemical.materials),wireDie={id:'die',station:'wire',installed:true,tools:['wire-die'],condition:1};
const factory=Factory.create();const j=factory.start({recipeId:'copper_wire',
 materials:refined.snapshot(),sourceContainerId:'workshop',outputContainerId:'workshop',
 machine:wireDie,shipLanded:true,bodyId:'world1',powerEnabled:true,batteryJ:1e6});
for(let i=0;i<13;i++)factory.step(10,1e6,true);
const wire=factory.commit({materials:refined.snapshot(),transformer:Transfer.create(),machine:wireDie});
const final=Stock.create(wire.materials);
eq(final.inventory().reduce((s,l)=>s+l.massKg,0),before);
eq(final.inventory().find(l=>l.materialId==='bare_wire').massKg,1.96);
eq(final.inventory().find(l=>l.materialId==='manufacturing_scrap').massKg,.04);
assert.ok(final.inventory().some(l=>l.materialId==='carbon_dioxide'&&l.containerId==='co2-tank'));
assert.ok(wire.receipt.energyJ>0&&chemical.receipt.energyJ>0);
assert.equal(Factory.create(wire.factory).active,null);
console.log('PASS 8E certified CuO + C → copper + CO2, 8F copper → wire + scrap; total mass conserved, power paid');
