'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=fs.readFileSync('src/engine.js','utf8'),
 outposts=fs.readFileSync('src/physics/outposts-ui.js','utf8'),
 flight=fs.readFileSync('src/flight.js','utf8'),
 index=fs.readFileSync('index.html','utf8');
for(const [path,src] of [['src/engine.js',engine],['src/physics/outposts-ui.js',outposts],['src/flight.js',flight]])new vm.Script(src,{filename:path});
const stationKinds=['reduction_furnace','glass_furnace','air_fractionation','electrolyzer',
 'high_temp_cell','catalytic_reactor','pressure_pipeline','conveyor_drive','cargo_depot',
 'cargo_depot_loaded','vehicle_assembly','rocket_integration','habitat_pad'];
for(const suffix of stationKinds)assert.ok(engine.includes('industrial_'+suffix),
 'Real distinct shared GPU mesh required for '+suffix);
assert.match(outposts,/kind='industrial_'\+asset\.state\.station/,'Render derives machine from original physical state');
assert.match(outposts,/RT\.materials8a\?\.inventory\?\.\(asset\.state\.containerId\)/,
 'Do not fake depot crate contents; read 8A source-owned cargo lots');
assert.match(outposts,/industrial_cargo_depot_loaded/);
assert.match(engine,/kind==='industrial_cargo_depot_loaded'/);
assert.match(engine,/this\.infrastructure=new Map\(\)/,'Shared GPU meshes are cached');
assert.match(flight,/infrastructure:window\.StarfallOutpostUI\?\.scene\(\)\|\|\[\]/);
assert.ok(index.includes('src/ui22-workflow.js'),'Keep UI22 mission hierarchy');
assert.ok(index.includes('src/physics/resource-test-lab-ui8h.js'),'Do not regress existing real 8H mining/gas controls');
console.log('PASS: physical 8E/8H machine-specific GPU mesh prototypes and source-backed depot cargo visuals');
