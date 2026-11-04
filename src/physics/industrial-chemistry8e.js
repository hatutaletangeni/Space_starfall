/* STARFALL 8E — stoichiometry-validated industrial chemistry.
 * Equations are simplified idealized complete reactions. Reagent lots and product
 * vessels are mandatory; this file never grants feedstocks, instruments or energy.
 */
(function(root){'use strict';
const atomic=Object.freeze({H:1.008,C:12.011,O:15.999,Fe:55.845,Cu:63.546,Si:28.085,Al:26.982});
const species=Object.freeze({
 water:{formula:{H:2,O:1},phase:'liquid'},
 hydrogen:{formula:{H:2},phase:'gas'},
 oxygen:{formula:{O:2},phase:'gas'},
 carbon:{formula:{C:1},phase:'solid'},
 carbon_monoxide:{formula:{C:1,O:1},phase:'gas'},
 carbon_dioxide:{formula:{C:1,O:2},phase:'gas'},
 methane:{formula:{C:1,H:4},phase:'gas'},
 hematite:{formula:{Fe:2,O:3},phase:'solid'},
 iron:{formula:{Fe:1},phase:'solid'},
 copper_oxide:{formula:{Cu:1,O:1},phase:'solid'},
 copper:{formula:{Cu:1},phase:'solid'},
 silicon_dioxide:{formula:{Si:1,O:2},phase:'solid'},
 glass:{formula:{Si:1,O:2},phase:'solid'},
 aluminum_oxide:{formula:{Al:2,O:3},phase:'solid'},
 aluminum:{formula:{Al:1},phase:'solid'},
 steel:{formula:{Fe:99,C:1},phase:'alloy'} // 99:1 molar formula for recipe accounting, NOT commercial steel grade
});
const molesMassKg=(name,moles)=>Object.entries(species[name].formula).reduce((acc,[element,count])=>acc+atomic[element]*count*moles/1000,0);
const reactions=Object.freeze({
 water_splitting:{label:'Water electrolysis (ideal)',equation:'2 H2O → 2 H2 + O2',station:'electrolyzer',
  input:{water:2},output:{hydrogen:2,oxygen:1},powerW:9000,seconds:720,
  requiredTools:['electrolyzer','gas_separator','hydrogen_tank','oxygen_tank'],notes:'Hydrogen and oxygen must enter physically distinct rated gas vessels.'},
 sabatier:{label:'CO₂ methanation (ideal)',equation:'CO2 + 4 H2 → CH4 + 2 H2O',station:'catalytic_reactor',
  input:{carbon_dioxide:1,hydrogen:4},output:{methane:1,water:2},powerW:4400,seconds:540,
  requiredTools:['catalytic_reactor','gas_separator','methane_tank'],notes:'Requires catalyst, heating, cooling and CO2 from finite captured gas stock.'},
 hematite_reduction:{label:'Hematite carbothermic reduction (ideal)',equation:'Fe2O3 + 3 C → 2 Fe + 3 CO',station:'reduction_furnace',
  input:{hematite:1,carbon:3},output:{iron:2,carbon_monoxide:3},powerW:25000,seconds:900,
  requiredTools:['reduction_furnace','gas_capture'],notes:'Generic iron_ore and iron_concentrate are NOT assumed to be pure hematite; assay/purify first.'},
 copper_oxide_reduction:{label:'Copper oxide reduction (ideal)',equation:'2 CuO + C → 2 Cu + CO2',station:'reduction_furnace',
  input:{copper_oxide:2,carbon:1},output:{copper:2,carbon_dioxide:1},powerW:12500,seconds:620,
  requiredTools:['reduction_furnace','gas_capture'],notes:'Requires chemically identified CuO, not generic copper sulfide rock.'},
 aluminum_electrolysis:{label:'Alumina electrolysis (ideal carbon-anode)',equation:'2 Al2O3 + 3 C → 4 Al + 3 CO2',station:'high_temp_cell',
  input:{aluminum_oxide:2,carbon:3},output:{aluminum:4,carbon_dioxide:3},powerW:38000,seconds:1300,
  requiredTools:['high_temp_cell','carbon_anode','gas_capture'],notes:'Ideal overall carbon-anode process; electrolytic voltage and bath losses are approximated.'},
 steel_alloying:{label:'Iron-carbon alloying (simplified steel)',equation:'99 Fe + C → Fe99C (single idealized alloy unit)',
  station:'reduction_furnace',input:{iron:99,carbon:1},output:{steel:1},
  powerW:14500,seconds:480,requiredTools:['reduction_furnace','alloy_crucible'],
  notes:'Solid solution alloying from actual iron plus carbon. Not industrial specification steel or controlled microstructure.'},
  glass_fusing:{label:'Fused silica glass',equation:'SiO2 (solid) → SiO2 (glass)',station:'glass_furnace',
  input:{silicon_dioxide:1},output:{glass:1},powerW:6400,seconds:520,
  requiredTools:['glass_furnace','mold'],notes:'Only high-purity source silica; no magical glass from undifferentiated regolith.'}
});
function molarMass(name){if(!species[name])throw Error('Unknown chemical species: '+name);
 return molesMassKg(name,1000);}
function validate(reaction){
 if(!reaction||!reaction.input||!reaction.output||!reaction.station)throw Error('Invalid chemical reaction');
 const atoms=(side)=>{const sums={};for(const [name,count] of Object.entries(side)){
  if(!species[name]||!Number.isSafeInteger(count)||count<=0)throw Error('Invalid stoichiometric term: '+name);
  for(const [element,n] of Object.entries(species[name].formula))sums[element]=(sums[element]||0)+n*count;
 }return sums;};
 const input=atoms(reaction.input),output=atoms(reaction.output);
 for(const key of new Set([...Object.keys(input),...Object.keys(output)]))
  if(input[key]!==output[key])throw Error('Reaction not element-balanced: '+key);
 const total=s=>Object.entries(s).reduce((sum,[sp,n])=>sum+molesMassKg(sp,n),0);
 const incoming=total(reaction.input),outgoing=total(reaction.output);
 if(Math.abs(incoming-outgoing)>1e-9)throw Error('Reaction mass mismatch');
 if(!(reaction.powerW>0&&reaction.seconds>0))throw Error('Reaction must consume energy and time');
 return true;
}
for(const r of Object.values(reactions))validate(r);
function batch(id,scaleMol=100){
 const r=reactions[id];if(!r)throw Error('Unknown chemical reaction');
 if(!Number.isFinite(scaleMol)||scaleMol<=0||scaleMol>100000)throw Error('Invalid batch scale');
 const inputs={},outputs={};
 for(const [sp,m] of Object.entries(r.input))inputs[sp]=molesMassKg(sp,m*scaleMol);
 for(const [sp,m] of Object.entries(r.output))outputs[sp]=molesMassKg(sp,m*scaleMol);
 const kg=x=>Object.values(x).reduce((s,n)=>s+n,0);
 return {id,label:r.label,equation:r.equation,station:r.station,requiredTools:[...r.requiredTools],
  inputs,outputs,powerW:r.powerW,seconds:r.seconds,energyJ:r.powerW*r.seconds,
  totalMassKg:kg(inputs),residualKg:kg(inputs)-kg(outputs),notes:r.notes,
  phases:Object.fromEntries(Object.keys(outputs).map(k=>[k,species[k].phase]))};
}
root.StarfallIndustrialChemistry8E=Object.freeze({atomic,species,reactions,molarMass,validate,batch});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialChemistry8E;
})(typeof globalThis!=='undefined'?globalThis:this);
