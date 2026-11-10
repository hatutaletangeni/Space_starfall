/* 8K integration: finite 8A ship water + certified equipment kits
 * -> genuinely installed 8E electrolyzer and distinct H2/O2 rated vessels
 * -> actual 8E stoichiometric gas lot -> original 8J atmosphere intervention.
 * Source gas is NEVER injected by a test import. Exactly one 8A source lot
 * is spent by 8J and the planet's permanent mass/pressure receipt increases.
 * Explicit scope: test starts with finite certified kits and water, and an
 * explicit SI planetary profile. It does not prove player navigation,
 * original runtime ship battery mutability, or full climate terraforming.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
const M=require('../src/physics/material-ledger8a.js');
const P=require('../src/physics/physical-inventory8a.js');
const Site=require('../src/physics/industrial-site8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const Atmos=require('../src/physics/atmosphere-emission8j.js');
const cp=x=>JSON.parse(JSON.stringify(x)),eq=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,a+' != '+b);
const bodyId='planet-sterile-real-gas';
const profile={id:bodyId,radiusM:6e6,surfaceGravityMS2:9.8,atmospherePressurePa:80000,mu:3.5e14};
const local=(angle,azimuth=0)=>[Math.sin(angle)*Math.cos(azimuth),Math.cos(angle),Math.sin(angle)*Math.sin(azimuth)];
const sites=[
 {kit:'plant_kit_electrolyzer',id:'facility8e:electrolyzer',at:local(.052)},
 {kit:'vessel_kit_hydrogen',id:'facility8e:hydrogen',at:local(.052,1.2)},
 {kit:'vessel_kit_oxygen',id:'facility8e:oxygen',at:local(.056,-1.2)}
];
test('8K finite kit-paid 8E water electrolysis -> source-owned rated O2 -> paid persistent 8J planetary intervention',()=>{
 const hold='8d:ship-main:materials',ledger=M.create();
 ledger.registerContainer({id:hold,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16,kind:'ship hold'});
 for(let i=0;i<sites.length;i++){
  const s=sites[i],spec=Site.KITS[s.kit];
  ledger.importLot({id:'certified-kit-'+i,materialId:s.kit,containerId:hold,
   massKg:spec.massKg,volumeM3:spec.volumeM3,grade:1,
   provenance:'predeparture:finite-8f-certified-specialist-kit'});
 }
 ledger.importLot({id:'ice-derived-water',materialId:'water',containerId:hold,
  massKg:10,volumeM3:.01,grade:1,provenance:'process:refine8e:ice_recovery'});
 let materials=ledger.snapshot(),physical=P.create().serialize(),energyJ=30e6;
 const shipLocal=[0,1,0],totalMass=s=>s.lots.reduce((v,l)=>v+l.massKg,0);
 const allMass=(m,p)=>totalMass(m)+p.assets.reduce((v,a)=>v+a.massKg,0);
 const startMass=allMass(materials,physical),startBattery=energyJ;
 const paid=[];
 const debit=(id,j)=>{assert.ok(energyJ>=j);energyJ-=j;paid.push({id,j});return{operationId:id,sourceId:'ship-main:engineering-battery',usedJ:j};};
 for(let i=0;i<sites.length;i++){
  const s=sites[i],jobId='plant8e:real-'+i,spec=Site.KITS[s.kit];
  const made=Site.install({jobId,assetId:s.id,materials,physical,
   shipContainerId:hold,kitLotId:'certified-kit-'+i,bodyId,local:s.at,
   bodyRadius:1000,shipLocal,operatorLocal:s.at,energyReceipt:debit(jobId,spec.workJ)});
  assert.equal(made.duplicate,false);
  assert.equal(made.machine.id,s.id);
  materials=made.materials;physical=made.physical;
 }
 eq(startMass,allMass(materials,physical));
 const stationAsset=physical.assets.find(x=>x.id===sites[0].id);
 const reaction=Chem.batch('water_splitting',100),chemicalId='real-8e-electrolysis-8k';
 const plant=Plant.create();
 const afterChem=plant.process({
  id:chemicalId,reactionId:'water_splitting',scaleMol:100,materials,
  sourceContainerId:hold,
  destinations:{hydrogen:'vessel8e:'+sites[1].id,oxygen:'vessel8e:'+sites[2].id},
  assetState:physical,
  station:{id:sites[0].id,kind:'electrolyzer',installed:true,enabled:true,
   condition:1,bodyId,sourceContainerId:hold,physicalAssetId:sites[0].id,
   tools:stationAsset.state.tools,
   vesselAssetIds:{hydrogen:sites[1].id,oxygen:sites[2].id}},
  energyReceipt:debit(chemicalId,reaction.energyJ),bodyId});
 assert.equal(afterChem.receipt.status,'COMMITTED');
 materials=afterChem.materials;
 eq(startMass,allMass(materials,physical));
 const oxygen=materials.lots.find(x=>x.materialId==='oxygen'&&x.containerId==='vessel8e:'+sites[2].id);
 const hydrogen=materials.lots.find(x=>x.materialId==='hydrogen'&&x.containerId==='vessel8e:'+sites[1].id);
 assert.ok(oxygen&&hydrogen);
 assert.equal(oxygen.provenance,'chemical:'+chemicalId);
 eq(oxygen.massKg,reaction.outputs.oxygen);
 assert.ok(physical.transfers.some(x=>x.assetId===sites[2].id&&x.status==='COMMITTED'));
 const beforeWorld=Atmos.normalize(null,profile),beforeOxygen=oxygen.massKg;
 const massToEmitKg=1.5;
 const args={receiptId:'atm8j:source-owned-electrolysis-1',bodyId,profile,
  savedWorld:beforeWorld,materials,physical,vesselId:sites[2].id,
  sourceLotId:oxygen.id,kg:massToEmitKg,timeS:1000,
  shipLanded:true,operatorEVA:true,shipPowered:true,operatorNear:true,
  vesselNear:true,landable:true,shipEnergyJ:energyJ};
 const emitted=Atmos.emit(args);
 assert.equal(emitted.duplicate,false);
 energyJ=emitted.shipEnergyJ;
 assert.equal(emitted.receipt.sourceProvenance,'chemical:'+chemicalId);
 assert.equal(emitted.receipt.energySourceId,'ship-main:engineering-battery');
 eq(beforeOxygen-emitted.materials.lots.find(x=>x.id===oxygen.id).massKg,massToEmitKg);
 eq(emitted.world.netAddedKg,massToEmitKg);
 eq(emitted.world.emittedSpeciesKg.oxygen,massToEmitKg);
 const expectedPa=massToEmitKg*profile.surfaceGravityMS2/(4*Math.PI*profile.radiusM**2);
 eq(emitted.world.pressureDeltaPa,expectedPa,1e-18);
 eq(emitted.world.pressurePa,beforeWorld.pressurePa+expectedPa);
 eq(startMass,allMass(emitted.materials,physical)+emitted.world.netAddedKg,1e-6);
 eq(startBattery-energyJ,paid.reduce((s,x)=>s+x.j,0)+Atmos.WORK_J_KG*massToEmitKg);
 assert.equal(emitted.materials.operations.filter(x=>x.kind==='PLANET_ATMOSPHERE_EMISSION_8J').length,1);
 const reloadedWorld=Atmos.normalize(cp(emitted.world),profile);
 const reloadedStock=M.create(cp(emitted.materials)).snapshot();
 const replay=Atmos.emit({...args,materials:reloadedStock,savedWorld:reloadedWorld,shipEnergyJ:energyJ});
 assert.equal(replay.duplicate,true);
 assert.equal(replay.shipEnergyJ,energyJ);
 eq(replay.world.netAddedKg,massToEmitKg);
 assert.throws(()=>Atmos.emit({...args,materials:reloadedStock,savedWorld:reloadedWorld,
  shipEnergyJ:energyJ,kg:2}),/Conflicting/);
 assert.throws(()=>Atmos.emit({...args,materials:reloadedStock,savedWorld:reloadedWorld,
  receiptId:'atm8j:illegal-new',shipEnergyJ:energyJ,nativeLife:true}),/protection/);
 console.log('PASS finite certified kits + water -> installed 8E electrolysis '+reaction.outputs.oxygen.toFixed(4)+' kg O2 -> 8J debits 1.5 kg and 150 kJ; saved delta pressure '+expectedPa+' Pa');
});