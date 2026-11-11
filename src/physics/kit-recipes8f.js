/* STARFALL 8F installation-kit fabrication: certified hardware from actual
 * finished manufactured parts. Every bill is finite, mass-balanced and paid.
 * No standalone kit acquisition from raw rock, and no imaginary starter chips. */
(function(root){'use strict';
const SPECS=Object.freeze({
 // Stakes, ground liner and retaining mesh for an OPEN mineral-waste pile.
 // The 20 m³ surface footprint is not a sealed container or a pressure vessel.
 plant_kit_tailings_stockpile:[10,.04,'tailings_stockpile'],
 machine_kit_hand_winder:[32,.16,'hand_winder'],
 machine_kit_cnc:[220,.42,'machine'],machine_kit_manual_press:[50,.22,'manual_press'],machine_kit_grinder:[85,.18,'machine'],
 machine_kit_caster:[260,.68,'foundry'],machine_kit_extruder:[160,.30,'machine'],
 machine_kit_winder:[80,.14,'machine'],machine_kit_motor_fixture:[130,.25,'machine'],
 machine_kit_etcher:[230,.47,'electronics'],machine_kit_solder_station:[65,.12,'electronics'],
 machine_kit_battery:[260,.44,'electronics'],machine_kit_laminator:[210,.39,'electronics'],
 machine_kit_cleanroom:[940,1.9,'cleanroom'],machine_kit_printer:[160,.38,'machine'],
 plant_kit_electrolyzer:[450,1.2,'plant'],plant_kit_reduction_furnace:[1100,3.4,'furnace'],
 plant_kit_glass_furnace:[520,1.8,'furnace'],plant_kit_catalytic_reactor:[640,2,'plant'],
 plant_kit_high_temp_cell:[1320,3.6,'furnace'],
 plant_kit_vehicle_assembly_pad:[760,2.8,'assembly_pad'],
 plant_kit_rocket_integration:[900,2.9,'rocket_integrator'],
 plant_kit_habitat_construction_pad:[1120,3.7,'habitat_builder'],
 plant_kit_air_fractionation:[740,2.4,'air_separator'],
 plant_kit_atmospheric_capture:[740,2.4,'air_separator'],
 // A sealed dry-goods depot is first fabricated from actual certified 8F parts.
 // Packaged machinery mass remains 480 kg; initially contains ZERO cargo.
 plant_kit_cargo_depot:[480,1.8,'assembly_pad'],
 // A single conveyor drive and short mechanically supported belt section,
 // built from finite refined material and manufactured electrical components.
 // No automatic powered movement until a real T02 load is installed/wired.
 plant_kit_conveyor_drive:[180,.55,'assembly_pad'],
 // Physically certified sealed 8 MPa pressure-line hardware from actual
 // finished steel, copper, motor and controls. Initially EMPTY, no free gas.
 plant_kit_pressure_pipeline:[320,.95,'plant'],
 vessel_kit_hydrogen:[160,4,'vessel'],vessel_kit_oxygen:[195,4,'vessel'],vessel_kit_nitrogen:[195,4,'vessel'],
 vessel_kit_sulfur_dioxide:[210,4,'vessel'],
 vessel_kit_carbon_monoxide:[170,4,'vessel'],vessel_kit_carbon_dioxide:[195,4,'vessel'],
 vessel_kit_methane:[195,4,'vessel']
});
const FRACTIONS=Object.freeze({
 tailings_stockpile:{steel:.8,insulation_polymer:.2},
 assembly_pad:{steel:.60,copper:.12,aluminum:.08,glass:.05,refractory_block:.05,insulated_wire:.04,electric_motor:.04,control_board:.02},
 rocket_integrator:{steel:.54,copper:.1,aluminum:.06,glass:.04,refractory_block:.11,insulated_wire:.05,electric_motor:.07,control_board:.03},
 habitat_builder:{steel:.55,copper:.12,aluminum:.07,glass:.05,refractory_block:.06,insulated_wire:.06,electric_motor:.06,control_board:.03},
 air_separator:{steel:.45,copper:.16,aluminum:.11,glass:.07,refractory_block:.05,insulated_wire:.07,electric_motor:.06,control_board:.03},
 hand_winder:{steel:.5625,copper:.09375,aluminum:.125,glass:.0625,iron_bracket:.0625,steel_bracket:.09375},
 manual_press:{steel:.66,copper:.12,iron_bracket:.08,glass_panel:.14},
 machine:{steel:.48,copper:.12,aluminum:.08,glass:.04,refractory_block:.10,insulated_wire:.05,electric_motor:.08,control_board:.05},
 electronics:{steel:.36,copper:.17,aluminum:.12,glass:.06,refractory_block:.06,insulated_wire:.08,electric_motor:.06,control_board:.09},
 cleanroom:{steel:.42,copper:.12,aluminum:.10,glass:.08,refractory_block:.12,insulated_wire:.05,electric_motor:.05,control_board:.06},
 foundry:{steel:.43,copper:.10,aluminum:.06,glass:.05,refractory_block:.27,insulated_wire:.03,electric_motor:.04,control_board:.02},
 furnace:{steel:.38,copper:.08,aluminum:.06,glass:.04,refractory_block:.34,insulated_wire:.03,electric_motor:.04,control_board:.03},
 plant:{steel:.50,copper:.14,aluminum:.10,glass:.05,refractory_block:.08,insulated_wire:.05,electric_motor:.05,control_board:.03},
 vessel:{steel:.68,aluminum:.12,glass:.02,refractory_block:.08,copper:.07,insulated_wire:.03}
});
function recipe(id){
 const s=SPECS[id];if(!s)throw Error('Unknown physical kit');
 const [massKg,volumeM3,className]=s,shares=FRACTIONS[className];
 if(!shares)throw Error('Unknown kit construction family');
 const keys=Object.keys(shares),inputs={};let left=massKg;
 keys.forEach((material,i)=>{const amount=i===keys.length-1?left:Math.round(massKg*shares[material]*100000)/100000;
   if(!(amount>0))throw Error('Invalid kit recipe quantity');inputs[material]=amount;left-=amount;});
 if(Math.abs(Object.values(inputs).reduce((a,b)=>a+b,0)-massKg)>1e-6)throw Error('Kit BOM must conserve mass');
 return Object.freeze({category:'industrial_kit',station:'assembly',tool:'kit-fixture',
   inputs:Object.freeze(inputs),outputs:Object.freeze({[id]:massKg}),
   outputVolumesM3:Object.freeze({[id]:volumeM3}),
   powerW:2400,seconds:Math.ceil(massKg*3),toleranceMm:1,
   engineeringNote:'Simplified finite equipment BOM. Requires certified completed components and actual ship fabrication bay. Installation requires additional power.'});
}
const RECIPES=Object.freeze(Object.fromEntries(Object.keys(SPECS).map(id=>[id,recipe(id)])));
root.StarfallKitRecipes8F=Object.freeze({SPECS,FRACTIONS,RECIPES,recipe});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallKitRecipes8F;
})(typeof globalThis!=='undefined'?globalThis:this);
