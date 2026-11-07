'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../src/physics/greenhouse8i.js');
const M=require('../src/physics/material-ledger8a.js');
const start=()=>({
 materials:{schema:1,containers:[{id:'ship-hold',ownerId:'ship-main',kind:'cargo',maxMassKg:200,maxVolumeM3:10}],
 lots:[{id:'kit',materialId:'greenhouse_kit',containerId:'ship-hold',massKg:2,volumeM3:.28,
 grade:1,provenance:'8f:assembly-greenhouse-kit'},
 {id:'seeds',materialId:'crop_seeds',containerId:'ship-hold',massKg:.1,volumeM3:.001,grade:1,
 provenance:'legacy_import:finite_explicit_seed_manifest'},
 {id:'nutrient',materialId:'fertilizer',containerId:'ship-hold',massKg:1,volumeM3:.001,grade:1,
 provenance:'8e:verified-nutrient-import'}],operations:[]},
 habitat:{id:'real-hab',kind:'hab',enabled:true,bodyId:'world',condition:1,
 local:[0,1,0],habT09:{schema:1,enabled:true,airlock:'CLOSED',
 oxygenMol:300,inertMol:2000,carbonMol:20,waterL:300,tempK:293.15,
 scrubberCapacityMol:0,filteredAirMol:0}}
});
const input=(more={})=>({...start(),operationId:'greenhouse8i:real-hab:1',
 habitatId:'real-hab',shipContainerId:'ship-hold',bodyId:'world',bodyRadius:600,
 shipLocal:[0,1,0],evaLocal:[0,1,0],shipLanded:true,operatorEVA:true,
 shipPowered:true,shipEnergyJ:2000000,timeS:100, ...more});
function mass(h){
 const t=h.habT09,g=t.greenhouse8i;
 return t.carbonMol*.04401+t.waterL+t.oxygenMol*.031998+
  g.nutrientKg+g.cropBiomassKg;
}
test('8I physically manufactured kit, seed and fertilizer installation is source-conservative',()=>{
 const a=input(),before=structuredClone(a),r=G.install(a);
 assert.equal(r.duplicate,false);
 assert.equal(r.habitat.habT09.greenhouse8i.installed,true);
 assert.equal(r.habitat.habT09.greenhouse8i.seedMassKg,.02);
 assert.equal(r.habitat.habT09.greenhouse8i.nutrientKg,.2);
 assert.equal(r.habitat.habT09.greenhouse8i.cropBiomassKg,.02);
 assert.equal(r.shipEnergyJ,1600000);
 assert.equal(r.receipt.workJ,400000);
 assert.equal(r.materials.lots.find(x=>x.id==='kit').massKg,1);
 assert.ok(Math.abs(r.materials.lots.find(x=>x.id==='seeds').massKg-.08)<1e-8);
 assert.equal(r.materials.lots.find(x=>x.id==='nutrient').massKg,.8);
 assert.deepEqual(a,before);
 assert.equal(M.create(r.materials).inventory('ship-hold').length,3);
});
test('8I greenhouse photosynthesis conserves C/O/H mass inside original T09',()=>{
 const a=G.install(input()).habitat,initialMass=mass(a);
 const r=G.grow(a,{seconds:3600,powered:true,irradianceWm2:900,nowS:3700});
 assert.equal(r.advanced,true);
 assert.ok(r.co2Mol>0&&r.waterKg>0&&r.oxygenMol>0&&r.biomassKg>0);
 assert.ok(Math.abs(mass(a)-initialMass)<1e-8,'CO2+water+nutrients -> oxygen+biomass balance');
 assert.ok(a.habT09.greenhouse8i.oxygenProducedMol===r.oxygenMol);
});
test('8I greenhouse cannot grow in darkness, when T02 unpowered, without nutrients/water/CO2',()=>{
 const initial=G.install(input()).habitat;
 for(const [setup,parameters] of [
   [h=>{}, {irradianceWm2:0,powered:true}],
   [h=>{}, {irradianceWm2:900,powered:false}],
   [h=>{h.habT09.carbonMol=0;},{irradianceWm2:900,powered:true}],
   [h=>{h.habT09.waterL=0;},{irradianceWm2:900,powered:true}],
   [h=>{h.habT09.greenhouse8i.nutrientKg=0;},{irradianceWm2:900,powered:true}],
   [h=>{h.habT09.airlock='OPEN_OUT';},{irradianceWm2:900,powered:true}]
 ]){
  const h=structuredClone(initial);setup(h);const before=mass(h);
  const r=G.grow(h,{seconds:3600,nowS:3700,...parameters});
  assert.equal(r.advanced,false);
  assert.ok(Math.abs(mass(h)-before)<1e-8);
 }
});
test('8I greenhouse cannot advance same sim timestamp twice, preserves split-step mass',()=>{
 const initial=G.install(input()).habitat;
 const a=structuredClone(initial),b=structuredClone(initial);
 G.grow(a,{seconds:3600,nowS:3700,powered:true,irradianceWm2:900});
 G.grow(b,{seconds:1800,nowS:1900,powered:true,irradianceWm2:900});
 G.grow(b,{seconds:1800,nowS:3700,powered:true,irradianceWm2:900});
 assert.ok(Math.abs(a.habT09.greenhouse8i.cropBiomassKg-b.habT09.greenhouse8i.cropBiomassKg)<1e-12);
 const before=structuredClone(a);
 assert.equal(G.grow(a,{seconds:3600,nowS:3700,powered:true,irradianceWm2:900}).advanced,false);
 assert.deepEqual(a,before);
});
test('8I greenhouse no duplicate kit or seed grant under repeat/reload',()=>{
 const r=G.install(input());
 const b=G.install(input({materials:r.materials,habitat:r.habitat,shipEnergyJ:r.shipEnergyJ}));
 assert.equal(b.duplicate,true);
 assert.deepEqual(b.habitat,r.habitat);
 assert.throws(()=>G.install(input({habitat:r.habitat,operationId:'greenhouse8i:real-hab:2'})),/already installed/);
});
