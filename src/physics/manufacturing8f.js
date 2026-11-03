/* STARFALL 8F manufacturing core — additive, dependency-free, data-only.
 * Inputs must be real refined lots from 8E, not raw 8C ore.
 * This module does not create stocks or grant machinery on its own.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-8;
const STATIONS=Object.freeze({assembly:{tools:['kit-fixture']},foundry:{tools:['caster']},machine:{tools:['lathe','cnc','grinder']},printer:{tools:['polymer-printer','powder-printer']},wire:{tools:['wire-die']},polymer:{tools:['extruder']},winding:{tools:['coil-winder']},motor:{tools:['motor-fixture']},electronics:{tools:['etching','reflow']},pcb:{tools:['solder-station']},battery:{tools:['cell-assembly']},solar:{tools:['module-laminator']},cleanroom:{tools:['photolithography','ultrapure-process']}});
// Illustrative process budgets: W and s, not industrial engineering certification.
// Mass difference is explicitly returned as scrap/consumable remainder, NEVER destroyed silently.
const RECIPES=Object.freeze({
 beam:{category:'structure',station:'foundry',tool:'caster',inputs:{steel:10},outputs:{beam:9.6},powerW:3200,seconds:180,toleranceMm:1.5},
 gear:{category:'mechanical',station:'machine',tool:'cnc',inputs:{steel:2},outputs:{gear:1.7},powerW:1700,seconds:210,toleranceMm:0.08},
 bearing:{category:'mechanical',station:'machine',tool:'grinder',inputs:{bearing_steel:1},outputs:{bearing:0.85},powerW:2000,seconds:300,toleranceMm:0.015},
 copper_wire:{category:'electrical',station:'wire',tool:'wire-die',inputs:{copper:2},outputs:{bare_wire:1.96},powerW:800,seconds:130,toleranceMm:0.1},
 insulated_wire:{category:'electrical',station:'polymer',tool:'extruder',inputs:{bare_wire:1,insulation_polymer:0.25},outputs:{insulated_wire:1.22},powerW:850,seconds:85,toleranceMm:0.2},
 stator:{category:'electrical',station:'winding',tool:'coil-winder',inputs:{insulated_wire:2,steel:3},outputs:{stator:4.9},powerW:700,seconds:220,toleranceMm:0.3},
 motor:{category:'electromechanical',station:'motor',tool:'motor-fixture',inputs:{stator:4.9,magnets:1,steel:2,bearing:0.85},outputs:{electric_motor:8.5},powerW:1100,seconds:420,toleranceMm:0.3},
 pcb:{category:'electronics',station:'electronics',tool:'etching',inputs:{copper:0.15,laminate:0.4,etchant:0.06},outputs:{bare_pcb:0.48},powerW:500,seconds:180,toleranceMm:0.2},
 populated_board:{category:'electronics',station:'pcb',tool:'solder-station',inputs:{bare_pcb:0.48,discrete_components:0.1,stocked_chips:0.02,solder:0.03},outputs:{control_board:0.6},powerW:400,seconds:240,toleranceMm:0.2},
 battery_cell:{category:'energy',station:'battery',tool:'cell-assembly',inputs:{electrode_active:1.2,copper:0.15,aluminum:0.1,electrolyte:0.25,separator:0.08,cell_casing:0.3},outputs:{battery_cell:1.95},powerW:1800,seconds:400,toleranceMm:0.5},
 solar_module:{category:'energy',station:'solar',tool:'module-laminator',inputs:{pv_cells:2,glass:4,aluminum_frame:2,insulated_wire:0.5,encapsulant:0.6},outputs:{solar_module:8.8},powerW:2200,seconds:370,toleranceMm:1},
 // Semiconductor-grade manufacturing only from existing certified feedstocks and equipment.
 pv_cells:{category:'semiconductor',station:'cleanroom',tool:'photolithography',inputs:{electronic_silicon:2,dopant:0.01,process_chemicals:0.5},outputs:{pv_cells:2.15},powerW:12000,seconds:900,toleranceMm:0.001},
 ...(root.StarfallKitRecipes8F?.RECIPES||{})
});
for(const [id,r] of Object.entries(RECIPES)){
 const input=Object.values(r.inputs).reduce((a,b)=>a+b,0),output=Object.values(r.outputs).reduce((a,b)=>a+b,0);
 if(output>input+EPS)throw Error('Unbalanced recipe '+id);
}
function normalize(saved){
 if(saved==null)return{schema:1,seq:0,machines:[],jobs:[],parts:[]};
 if(saved.schema!==1||!Number.isSafeInteger(saved.seq)||saved.seq<0||!Array.isArray(saved.machines)||!Array.isArray(saved.jobs)||!Array.isArray(saved.parts))throw Error('Corrupt manufacturing save');
 if(new Set(saved.machines.map(m=>m.id)).size!==saved.machines.length||new Set(saved.jobs.map(j=>j.id)).size!==saved.jobs.length)throw Error('Duplicate manufacturing IDs');
 return copy(saved);
}
function create(saved){let state=normalize(saved);
 function machine(m){if(!m||!ident(m.id)||!STATIONS[m.station]||!Array.isArray(m.tools)||!m.tools.every(t=>STATIONS[m.station].tools.includes(t))||!valid(m.condition)||m.condition>1||!ident(m.bodyId)||!ident(m.containerId))throw Error('Invalid physical manufacturing station');
  if(state.machines.some(x=>x.id===m.id))throw Error('Duplicate station');state.machines.push(copy(m));return copy(m);}
 function inspect(recipeId,machineId,ledger,energyJ,options={}){
  const r=RECIPES[recipeId],m=state.machines.find(x=>x.id===machineId);
  if(!r)throw Error('Unknown part definition');if(!m)throw Error('Station not installed');
  if(m.station!==r.station||!m.tools.includes(r.tool))throw Error('Missing required tool capability: '+r.tool);
  if(m.condition<0.5)throw Error('Station requires maintenance');
  if(options.bodyId&&options.bodyId!==m.bodyId)throw Error('Stock and station on different worlds');
  const lots=ledger.inventory(m.containerId);const needs=[];
  for(const [materialId,kg] of Object.entries(r.inputs)){
   const available=lots.filter(l=>l.materialId===materialId).reduce((v,l)=>v+l.massKg,0);
   if(available+EPS<kg)needs.push({materialId,requiredKg:kg,availableKg:available});
  }
  if(needs.length)throw Error('Missing real feedstock: '+needs.map(n=>n.materialId).join(', '));
  const needJ=r.powerW*r.seconds;if(!valid(energyJ)||energyJ+EPS<needJ)throw Error('Insufficient metered electrical energy');
  return {recipeId,machineId,needJ,seconds:r.seconds,inputs:copy(r.inputs),outputs:copy(r.outputs),scrapKg:Object.values(r.inputs).reduce((a,b)=>a+b,0)-Object.values(r.outputs).reduce((a,b)=>a+b,0)};
 }
 // Atomic on cloned 8A ledger. Caller must persist both returned snapshot and manufacturing state together.
 // This bounded batch implementation charges a caller-provided metered energy receipt; it never creates energy.
 function manufacture({jobId,recipeId,machineId,ledger,energyReceipt,bodyId,transformer,outputContainerId}){
  if(!ident(jobId))throw Error('Invalid job ID');
  const existing=state.jobs.find(j=>j.id===jobId);if(existing)return{duplicate:true,receipt:copy(existing),materials:ledger.snapshot(),manufacturing:snapshot()};
  if(!energyReceipt||energyReceipt.jobId!==jobId||!valid(energyReceipt.usedJ)||!ident(energyReceipt.sourceId))throw Error('Missing authoritative electrical debit receipt');
  const r=RECIPES[recipeId],m=state.machines.find(x=>x.id===machineId);
  const quote=inspect(recipeId,machineId,ledger,energyReceipt.usedJ,{bodyId});
  if(energyReceipt.usedJ+EPS<quote.needJ)throw Error('Unpaid manufacturing work');
  if(!transformer||typeof transformer.convert!=='function')throw Error('8E transformation adapter not installed');
  if(!ident(outputContainerId))throw Error('Missing physical output container');
  const scrap=quote.scrapKg;
  const outputRecipe={station:m.station,inputs:r.inputs,outputs:{...r.outputs,...(scrap>EPS?{manufacturing_scrap:scrap}:{})},powerW:r.powerW,seconds:r.seconds};
  const result=transformer.convert({operationId:jobId,recipeId,recipe:outputRecipe,materials:ledger.snapshot(),
   containerId:m.containerId,outputContainerId,energyReceipt:{operationId:jobId,sourceId:energyReceipt.sourceId,usedJ:energyReceipt.usedJ},
   station:{id:m.id,kind:m.station,containerId:m.containerId,condition:m.condition,enabled:m.enabled!==false}});
  const receipt={id:jobId,recipeId,machineId,kind:'PART_LOT',massKg:Object.values(r.outputs).reduce((a,b)=>a+b,0),status:'COMMITTED',energyJ:quote.needJ};
  const next=normalize(state);next.jobs.push(receipt);return {duplicate:false,receipt,materials:result.materials,manufacturing:next,conversion:result.operations};
 }
 function snapshot(){return copy(state)}
 return Object.freeze({machine,inspect,manufacture,snapshot});
}
root.StarfallManufacturing8F=Object.freeze({schema:1,STATIONS,RECIPES,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallManufacturing8F;
})(typeof globalThis!=='undefined'?globalThis:this);