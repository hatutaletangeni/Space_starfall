'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallCompositionCW01=require('../src/physics/celestial-composition-cw01.js');
globalThis.StarfallResources8C=require('../src/physics/planetary-resources8c.js');
globalThis.StarfallMaterials8A=require('../src/physics/material-ledger8a.js');
const Air=require('../src/physics/air-fractionation8g.js');
const Kit=require('../src/physics/kit-recipes8f.js'),
 Site=require('../src/physics/industrial-site8e.js');
const body={id:'star-0-p0',type:'Temperate',kind:'planet',landable:true},galaxy={seed:742};
const local=[0,1,0],vloc=[Math.sin(.02),Math.cos(.02),0];
const plant={id:'facility8e:1',type:'industrial_plant',condition:1,massKg:740,volumeM3:2.4,
 location:{kind:'surface',bodyId:body.id,local},
 state:{station:'air_fractionation',enabled:true,tools:[...Air.REQUIRED_TOOLS]}};
const vessel={id:'facility8e:2',type:'industrial_vessel',condition:1,massKg:195,volumeM3:4,
 location:{kind:'surface',bodyId:body.id,local:vloc},
 state:{materialId:'nitrogen',ratedPressurePa:8e6,containerId:'vessel8e:facility8e:2'}};
const physical={schema:1,assets:[{id:'truck-expedition-001',type:'truck',condition:1,massKg:1600,volumeM3:13,
 location:{kind:'ship',slot:'starboard-hangar'}},plant,vessel],transfers:[]};
const materials={schema:1,containers:[{id:'vessel8e:facility8e:2',ownerId:vessel.id,
 kind:'gas pressure vessel',maxMassKg:1000,maxVolumeM3:4}],lots:[],operations:[]};
const base={jobId:'air8g:1',plantId:plant.id,vesselId:vessel.id,
 outputContainerId:vessel.state.containerId,bodyId:body.id,body,galaxy,physical,materials,
 bodyRadius:1000,shipLocal:local,evaLocal:local,shipLanded:true,operatorEVA:true,shipPowered:true,
 energyReceipt:{operationId:'air8g:1',sourceId:'ship-main:engineering-battery',
  status:'COMMITTED',usedJ:Air.WORK_J}};
const k=Kit.RECIPES.plant_kit_air_fractionation,tank=Kit.RECIPES.vessel_kit_nitrogen;
assert.equal(k.outputs.plant_kit_air_fractionation,740);
assert.equal(tank.outputs.vessel_kit_nitrogen,195);
assert.equal(Site.KITS.plant_kit_air_fractionation.station,'air_fractionation');
assert.equal(Site.KITS.vessel_kit_nitrogen.materialId,'nitrogen');
assert.equal(Object.values(k.inputs).reduce((s,x)=>s+x,0),740);
assert.equal(Object.values(tank.inputs).reduce((s,x)=>s+x,0),195);
assert.ok(k.powerW*k.seconds>0&&Site.KITS.plant_kit_air_fractionation.workJ>0);
const p=Air.parcel(body,galaxy,local);
assert.ok(p.nitrogenMoleFraction>.7);
assert.ok(p.nitrogenMassFraction>.7);
assert.equal(Air.create().remaining(p),Air.AIR_KG_PER_CELL);
const inventory=Air.create(),q=inventory.quote(base);
assert.ok(q.ready&&q.nitrogenKg>11&&q.nitrogenKg<17,q);
assert.equal(q.airBatchKg,20);
assert.ok(Math.abs(q.nitrogenKg+q.ventToAtmosphereKg-20)<1e-7);
const old=JSON.stringify(base),r=inventory.capture(base);
assert.equal(JSON.stringify(base),old,'Side effect on original authoritative inventory');
assert.equal(r.receipt.status,'COMMITTED');
assert.equal(r.materials.lots.length,1);
assert.equal(r.materials.lots[0].materialId,'nitrogen');
assert.equal(r.materials.lots[0].containerId,vessel.state.containerId);
assert.equal(r.physical,undefined);
assert.equal(r.receipt.energyJ,Air.WORK_J);
assert.ok(Math.abs(r.receipt.nitrogenKg-r.materials.lots[0].massKg)<1e-8);
assert.equal(r.atmosphere.harvests.length,1);
const saved=Air.create(r.atmosphere);
assert.equal(saved.remaining(p),Air.AIR_KG_PER_CELL-20);
assert.equal(saved.capture({...base,materials:r.materials}).duplicate,true);
assert.throws(()=>saved.capture({...base,vesselId:'another',materials:r.materials}),/Replayed air harvest/);
assert.throws(()=>Air.create().capture({...base,shipLanded:false}),/Landed powered/);
assert.throws(()=>Air.create().capture({...base,shipPowered:false}),/Landed powered/);
assert.throws(()=>Air.create().capture({...base,energyReceipt:{...base.energyReceipt,usedJ:0}}),/810 kJ/);
assert.throws(()=>Air.create().capture({...base,body:{...body,type:'Rocky'}}),/No usable modeled/);
assert.throws(()=>Air.create().capture({...base,body:{...body,kind:'moon'}}),/non-vacuum planetary/);
assert.throws(()=>Air.create().capture({...base,physical:{...physical,assets:[physical.assets[0],plant]}}),/rated nitrogen vessel/);
assert.throws(()=>Air.create().capture({...base,physical:{...physical,assets:[
 physical.assets[0],{...plant,state:{...plant.state,tools:[]}},vessel]}}),/fully equipped/);
assert.throws(()=>Air.create().capture({...base,physical:{...physical,assets:[
 physical.assets[0],plant,{...vessel,state:{...vessel.state,materialId:'oxygen'}}]}}),/rated nitrogen vessel/);
assert.throws(()=>Air.create().capture({...base,materials:{...materials,lots:[{
 id:'wrongGas',materialId:'oxygen',containerId:vessel.state.containerId,
 massKg:1,volumeM3:.01,grade:1,provenance:'fixture'}]}}),/contaminated/);
assert.throws(()=>Air.create().capture({...base,evaLocal:[1,0,0]}),/hose range/);
const cell=p.cellKey;
const almostDepleted=Air.create({schema:1,harvests:[{
 id:'air8g:history',cellKey:cell,bodyId:body.id,plantAssetId:plant.id,
 vesselAssetId:vessel.id,outputLotId:'nitrogen:history',airKg:2390,
 nitrogenKg:1800,ventKg:590,energyJ:Air.WORK_J,status:'COMMITTED'}]});
assert.equal(almostDepleted.quote(base).ready,false);
assert.equal(almostDepleted.quote(base).blockedReason,'Finite parcel depleted');
assert.throws(()=>almostDepleted.capture(base),/parcel depleted/);
console.log('PASS 8G N2 collection: physically built separator+vessel, CW01 planet prior, bounded per-cell atmosphere, 8A gas lot, 810 kJ and exact intake/vent mass balance');
