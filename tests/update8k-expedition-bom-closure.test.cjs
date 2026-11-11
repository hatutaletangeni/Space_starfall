/* Whole-expedition dependency closure. Uses real 8F recipes, actual kit
 * tool requirements and full 8G bills, preserving integer batch leftovers.
 * This is planning evidence: native mineral chemistry is allowed as a raw
 * material source. It does not certify transport, power, or a playthrough.
 */
'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const path='../src/physics/';
const S=require(path+'starter-manifest8k.js');require(path+'stock-parts8f.js');require(path+'kit-recipes8f.js');const F=require(path+'manufacturing8f.js'),A=require(path+'assembly8g.js');
function plan(contents){
const stock=Object.fromEntries(contents.map(x=>[x[0],x[1]])),natural=new Set(['steel','iron','copper','aluminum','glass','carbon','water']);
const base={},finite={},batches={},done=new Set(['hand-shear','bending-brake','glass-cutter','kit-fixture','wire-die']),doing=new Set();
const tools={'hand-winder':'machine_kit_hand_winder',cnc:'machine_kit_cnc',lathe:'machine_kit_cnc',grinder:'machine_kit_grinder',caster:'machine_kit_caster','manual-press':'machine_kit_manual_press',extruder:'machine_kit_extruder','coil-winder':'machine_kit_winder','motor-fixture':'machine_kit_motor_fixture',etching:'machine_kit_etcher','solder-station':'machine_kit_solder_station','module-laminator':'machine_kit_laminator','cell-assembly':'machine_kit_battery'};
function get(id,kg){const n=Math.min(stock[id]||0,kg);stock[id]=(stock[id]||0)-n;kg-=n;if(kg<1e-6)return;if(natural.has(id)){base[id]=(base[id]||0)+kg;return;}if(['pv_cells','encapsulant','electrode_active','electrolyte','separator','bearing_steel','refractory_block','stocked_chips','laminate','insulation_polymer','etchant','solder','discrete_components','zeolite','crop_seeds','fertilizer'].includes(id)){finite[id]=(finite[id]||0)+kg;return;}const rid=id==='electric_motor'?'brushed_dc_motor':Object.keys(F.RECIPES).find(k=>F.RECIPES[k].outputs[id]);if(!rid){finite[id]=(finite[id]||0)+kg;return;}const r=F.RECIPES[rid];if(doing.has(rid))throw Error('circular '+rid);doing.add(rid);if(!done.has(r.tool)){get(tools[r.tool],globalThis.StarfallKitRecipes8F.RECIPES[tools[r.tool]].outputs[tools[r.tool]]);for(const [t,k]of Object.entries(tools))if(k===tools[r.tool])done.add(t);}const count=Math.ceil((kg-1e-8)/r.outputs[id]);batches[rid]=(batches[rid]||0)+count;for(const [i,q]of Object.entries(r.inputs))get(i,q*count);for(const [o,q]of Object.entries(r.outputs))stock[o]=(stock[o]||0)+q*count;stock[id]-=kg;doing.delete(rid);}
for(const id of ['science_rover','habitat_shell','rocket_stage']){for(const [i,q]of Object.entries(A.DEFINITIONS[id].parts))get(i,q);}
for(const id of ['plant_kit_vehicle_assembly_pad','plant_kit_habitat_construction_pad','plant_kit_rocket_integration','plant_kit_electrolyzer','plant_kit_glass_furnace','plant_kit_high_temp_cell','plant_kit_air_fractionation','vessel_kit_sulfur_dioxide','vessel_kit_carbon_dioxide','vessel_kit_oxygen','vessel_kit_nitrogen','vessel_kit_hydrogen','plant_kit_cargo_depot','plant_kit_cargo_depot','plant_kit_conveyor_drive'])get(id,globalThis.StarfallKitRecipes8F.RECIPES[id].outputs[id]);
// Seven distinct real 8H gas services: CO out, H2/O2 out, roaster O2 in/SO2 out, Cu CO2 out, Al CO2 out.
for(let n=0;n<7;n++)get('plant_kit_pressure_pipeline',320);
get('plant_kit_tailings_stockpile',10);get('vessel_kit_sulfur_dioxide',210);
get('solar_module',17.6);get('battery_cell',15.6);get('greenhouse_kit',3.7);get('scrubber_media',1.02);
return {finiteShortages:finite,naturalAdditional:base,machines:[...done],batches,stock};
}
test('finite shipped specialty stock closes the rover, habitat, power, dry-stage and plant dependency graph',()=>{
 const p=plan(S.CONTENTS);
 assert.deepEqual(p.finiteShortages,{});
 assert.equal(p.batches.solar_module,4);
 assert.equal(p.batches.battery_cell,15);
 assert.ok(p.batches.populated_board>400 && p.batches.populated_board<=500);
 assert.ok(p.naturalAdditional.steel>5000 && p.naturalAdditional.copper>1000,
  'local refining is essential; the finite manifest cannot replace the mining game');
 assert.ok(p.stock.refractory_block>=0);
 assert.ok(p.batches.bearing>0);
 console.log('PASS full integer-batch expedition BOM closure',JSON.stringify({
  boards:p.batches.populated_board,modules:p.batches.solar_module,cells:p.batches.battery_cell,
  rawProductionRequiredKg:p.naturalAdditional}));
});
test('previous starter shortages are detected across the whole expedition rather than individual builds',()=>{
 const previous=S.CONTENTS.filter(x=>x[0]!=='bearing_steel').map(x=>[...x]);
 for(const x of previous){if(x[0]==='stocked_chips')x[1]=8;if(x[0]==='laminate')x[1]=160;if(x[0]==='discrete_components')x[1]=40;
  if(x[0]==='pv_cells')x[1]=4;if(x[0]==='encapsulant')x[1]=1.2;
  if(x[0]==='electrode_active')x[1]=9.6;if(x[0]==='separator')x[1]=.64;if(x[0]==='electrolyte')x[1]=3;}
 const p=plan(previous);
 for(const id of ['pv_cells','encapsulant','electrode_active','separator','bearing_steel','stocked_chips','laminate','discrete_components'])
  assert.ok(p.finiteShortages[id]>0,id+' must expose the original progression blockage');
});
