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
