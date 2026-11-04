/* STARFALL 8F — low-tech parts from actual refined raw stocks.
 * Already fitted ship fabrication bay contains hand shears, a small bending
 * brake and a guarded glass scoring bench. No motor, chip or industrial plant
 * is conjured by these tools. All swarf/shards become physical scrap lots.
 */
(function(root){'use strict';
const RECIPES=Object.freeze({
 copper_busbar:{category:'electrical_stock',station:'bench',tool:'hand-shear',inputs:{copper:.5},outputs:{copper_busbar:.48},powerW:420,seconds:95,toleranceMm:.8},
 copper_contact:{category:'electrical_stock',station:'bench',tool:'hand-shear',inputs:{copper:.2},outputs:{copper_contact:.19},powerW:360,seconds:70,toleranceMm:.5},
 aluminum_frame:{category:'lightweight_structure',station:'bench',tool:'hand-shear',
  inputs:{aluminum:2.1},outputs:{aluminum_frame:2},powerW:610,seconds:130,toleranceMm:1.1},
 aluminum_sheet:{category:'lightweight_structure',station:'bench',tool:'hand-shear',
  inputs:{aluminum:1},outputs:{aluminum_sheet:.95},powerW:520,seconds:110,toleranceMm:1},
 motor_field_coil:{category:'electromagnetic_stock',station:'bench',tool:'hand-winder',
  inputs:{copper:.70,glass:.10},outputs:{motor_field_coil:.76},
  powerW:640,seconds:260,toleranceMm:.5},
 brushed_dc_motor:{category:'electromechanical_prototype',station:'bench',tool:'hand-winder',
  inputs:{motor_field_coil:.76,steel:.80,iron:.70,aluminum:.40,copper:.24,carbon:.06},
  outputs:{electric_motor:2.70},powerW:1100,seconds:620,toleranceMm:.5,
  engineeringNote:'Small wound-field brushed DC motor: copper coil, steel/iron rotor and pole pieces, segmented copper commutator, carbon brushes and aluminum enclosure. Simplified prototype; not a tested rated electric machine.'},
 chassis_rail:{category:'vehicle_structure',station:'foundry',tool:'caster',
  inputs:{steel:25},outputs:{chassis_rail:23.8},powerW:3400,seconds:280,toleranceMm:2,
  engineeringNote:'One cast vehicle frame rail blank, not a complete chassis.'},
 wheel_rim:{category:'vehicle_wheel_hardware',station:'machine',tool:'lathe',
  inputs:{aluminum:4.5},outputs:{wheel_rim:4.2},powerW:1450,seconds:240,toleranceMm:.3,
  engineeringNote:'Machined rigid wheel rim only; tire/tread and wheel bearing are separate parts.'},
 wheel_hub:{category:'vehicle_wheel_hardware',station:'machine',tool:'grinder',
  inputs:{steel:3.5},outputs:{wheel_hub:3.2},powerW:1900,seconds:210,toleranceMm:.1,
  engineeringNote:'Hub blank, not a bearing-certified road wheel.'},
 axle_shaft:{category:'vehicle_drivetrain',station:'machine',tool:'lathe',
  inputs:{steel:7},outputs:{axle_shaft:6.6},powerW:1750,seconds:260,toleranceMm:.2,
  engineeringNote:'Axle shaft blank; hardening, seals, fit and fatigue qualification are not simulated.'},
 leaf_spring:{category:'vehicle_suspension',station:'press',tool:'manual-press',
  inputs:{steel:5},outputs:{leaf_spring:4.7},powerW:1250,seconds:210,toleranceMm:1,
  engineeringNote:'Formed leaf spring stock; heat treatment and mechanical performance are not validated.'},
 rolling_wheel_core:{category:'vehicle_wheel_subassembly',station:'assembly',tool:'kit-fixture',
  inputs:{wheel_rim:4.2,wheel_hub:3.2},outputs:{rolling_wheel_core:7.3},
  powerW:780,seconds:170,toleranceMm:.5,
  engineeringNote:'Rigid wheel hub+rim assembly only: no tire, wheel bearing, brakes or drive coupling. NOT a roadworthy wheel.'},
 wheel_bushing:{category:'vehicle_wheel_hardware',station:'machine',tool:'lathe',
  inputs:{copper:.8,carbon:.2},outputs:{wheel_bushing:.92},powerW:1150,seconds:205,toleranceMm:.2},
 wheel_grouser:{category:'offroad_traction',station:'press',tool:'manual-press',
  inputs:{steel:1.6},outputs:{wheel_grouser:1.52},powerW:820,seconds:155,toleranceMm:.9},
 low_speed_rover_wheel:{category:'vehicle_wheel_subassembly',station:'assembly',tool:'kit-fixture',
  inputs:{rolling_wheel_core:7.3,wheel_bushing:.92,wheel_grouser:1.52,steel:.4},
  outputs:{low_speed_rover_wheel:10.02},powerW:900,seconds:255,toleranceMm:.6},
  brake_rotor:{category:'vehicle_brake_prototype',station:'machine',tool:'lathe',
  inputs:{steel:4},outputs:{brake_rotor:3.7},powerW:1700,seconds:230,toleranceMm:.2,
  engineeringNote:'Machined rotor blank only; friction lining, caliper, hydraulic actuator and heat testing are not certified.'},
 brake_caliper:{category:'vehicle_brake_prototype',station:'machine',tool:'grinder',
  inputs:{steel:3,copper:.2},outputs:{brake_caliper:3.0},powerW:1450,seconds:270,toleranceMm:.15,
  engineeringNote:'Caliper housing prototype; fluid pressure and emergency parking brake are not yet modeled.'},
 steering_knuckle:{category:'vehicle_steering_prototype',station:'machine',tool:'lathe',
  inputs:{steel:6},outputs:{steering_knuckle:5.55},powerW:1700,seconds:290,toleranceMm:.15,
  engineeringNote:'Machined steering pivot stock; joint bearing, fatigue and geometry validation remain unimplemented.'},
 steering_rack:{category:'vehicle_steering_prototype',station:'machine',tool:'cnc',
  inputs:{steel:12,copper:.4},outputs:{steering_rack:11.7},powerW:1850,seconds:320,toleranceMm:.12,
  engineeringNote:'Mechanical rack stock; steering actuator and end-stop safety not yet certified.'},
 motor_controller:{category:'vehicle_power_electronics_prototype',station:'electronics',tool:'etching',
  inputs:{control_board:.6,copper:.5,insulated_wire:.4},outputs:{motor_controller:1.42},
  powerW:700,seconds:330,toleranceMm:.25,
  engineeringNote:'Assembly of pre-existing manufactured controls, copper and insulation; motor switching, protection and EMC are not certified.'},
  iron_bracket:{category:'structural_stock',station:'bench',tool:'bending-brake',inputs:{iron:.5},outputs:{iron_bracket:.46},powerW:650,seconds:125,toleranceMm:1.1},
 steel_bracket:{category:'structural_stock',station:'bench',tool:'bending-brake',inputs:{steel:.8},outputs:{steel_bracket:.75},powerW:740,seconds:145,toleranceMm:1},
 glass_panel:{category:'glazing',station:'bench',tool:'glass-cutter',inputs:{glass:.6},outputs:{glass_panel:.55},powerW:380,seconds:110,toleranceMm:1.2},
 stamped_steel_plate:{category:'structural_stock',station:'press',tool:'manual-press',inputs:{steel:2},outputs:{stamped_steel_plate:1.92},powerW:980,seconds:180,toleranceMm:.65}
});
const kgs=x=>Object.values(x).reduce((a,b)=>a+b,0);
for(const [key,s] of Object.entries(RECIPES)){
 if(!(kgs(s.inputs)>kgs(s.outputs))||!Number.isFinite(s.powerW)||s.powerW<=0||s.seconds<=0)
  throw Error('Invalid finished-stock recipe '+key);
}
root.StarfallStockParts8F=Object.freeze({RECIPES});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallStockParts8F;
})(typeof globalThis!=='undefined'?globalThis:this);
