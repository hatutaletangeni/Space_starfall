/* STARFALL 8K — finite prebuilt expedition manifest, NOT free material generation.
 * Only an explicitly new game carrying freshExpedition may receive this once.
 * Parts were manufactured/imported before launch; raw local ores and plants
 * must still be surveyed, mined, processed and assembled during the game.
 * Older saves never receive a fabricated cargo top-up.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-8;
const CONTENT=Object.freeze([
 ['stocked_chips',.5,.0005,'prelaunch_imported_semiconductors'],
 ['pv_cells',4,.02,'prelaunch_certified_photovoltaics_for_two_finite_modules'],
 ['discrete_components',1,.002,'prelaunch_electronic_components'],
 ['solder',1,.001,'prelaunch_solder_supply'],
 ['copper',8,.003,'prelaunch_refined_copper_repair_stock'],
 ['aluminum',10,.004,'prelaunch_refined_aluminum_repair_stock'],
 ['steel',20,.008,'prelaunch_structural_spares'],
 ['glass',8,.004,'prelaunch_verified_glass'],
 ['insulation_polymer',5,.007,'prelaunch_polymer_feedstock'],
 ['crop_seeds',.05,.0001,'prelaunch_biological_seed_packet'],
 ['fertilizer',2,.002,'prelaunch_finite_plant_nutrients'],
 ['zeolite',5,.005,'prelaunch_sorbent_mineral'],
 ['magnets',1,.001,'prelaunch_motor_magnets'],
 ['electrolyte',3,.003,'prelaunch_electrochemical_supply'],
 ['electrode_active',9.6,.006,'prelaunch_certified_cell_electrode_mix_single_pack_only'],
 ['encapsulant',1.2,.002,'prelaunch_certified_photovoltaic_uv_encapsulant_two_modules_only'],
 ['separator',1,.002,'prelaunch_battery_separator'],
 ['refractory_block',10,.005,'prelaunch_firebrick_spares'],
 ['laminate',1,.002,'prelaunch_electrical_laminate'],
 ['etchant',1,.001,'prelaunch_reaction_consumable'],
 ['carbon',3,.002,'prelaunch_reductant'],
 ['water',50,.05,'prelaunch_sealed_water_stock'],
 // These are SEALED, physically shipped premanufactured machine kits, NOT
 // magically installed machinery. Original 8F kit installer must charge its
 // own work energy and move each exact 8A kit lot into an 8A machine asset.
 ['machine_kit_extruder',160,.30,'prelaunch_finite_polymer_extruder_kit_uninstalled'],
 ['machine_kit_laminator',210,.39,'prelaunch_finite_pv_laminator_kit_uninstalled'],
 ['machine_kit_battery',260,.44,'prelaunch_finite_cell_assembly_kit_uninstalled'],
]);
const SUM=Object.freeze({massKg:CONTENT.reduce((s,x)=>s+x[1],0),
 volumeM3:CONTENT.reduce((s,x)=>s+x[2],0),uniqueLots:CONTENT.length});
function prepare(saved,expedition,oldReceipt,shipContainerId){
 if(!expedition||expedition.schema!==1||!Number.isSafeInteger(expedition.seed)||
  !Number.isFinite(expedition.startedAt)||!shipContainerId)
  return{applied:false,reason:'NOT_EXPLICIT_NEW_EXPEDITION',materials:cp(saved),receipt:oldReceipt||null};
 if(oldReceipt){
  if(oldReceipt.schema!==1||oldReceipt.seed!==expedition.seed||
    oldReceipt.startedAt!==expedition.startedAt)
   throw Error('8K starter receipt conflicts with expedition identity');
  return{applied:false,reason:'ALREADY_DELIVERED',materials:cp(saved),receipt:cp(oldReceipt)};
 }
 if(!saved||saved.schema!==1||!Array.isArray(saved.lots)||!Array.isArray(saved.operations)||
    !Array.isArray(saved.containers))throw Error('8K needs real original 8A material ledger');
 if(saved.lots.length||saved.operations.length)
  throw Error('8K refuses to mint prelaunch supplies into a populated or imported save');
 const ship=saved.containers.find(c=>c.id===shipContainerId);
 if(!ship||ship.ownerId!=='ship-main'||ship.maxMassKg+EPS<SUM.massKg||
  ship.maxVolumeM3+EPS<SUM.volumeM3)
  throw Error('8K original ship hold cannot contain the audited starter manifest');
 const M=root.StarfallMaterials8A;
 if(!M?.create)throw Error('8A source owner required to register prelaunch stock');
 const materials=M.create(saved),origin='preexisting_ship_manifest8k:'+expedition.seed+':'+expedition.startedAt;
 for(const [materialId,massKg,volumeM3,source]of CONTENT){
  materials.importLot({id:'8k:manifest:'+materialId,materialId,containerId:shipContainerId,
   massKg,volumeM3,grade:1,provenance:origin+':'+source});
 }
 const receipt={schema:1,id:'8k:starter:'+expedition.seed+':'+expedition.startedAt,
  seed:expedition.seed,startedAt:expedition.startedAt,status:'COMMITTED',source:origin,
  sourceStatement:'Pre-manufactured finite ship-owned cargo before expedition launch, NOT in-situ manufacture',
  destinationContainerId:shipContainerId,massKg:SUM.massKg,volumeM3:SUM.volumeM3,
  lotIds:CONTENT.map(x=>'8k:manifest:'+x[0])};
 const state=materials.snapshot(),mass=state.lots.reduce((s,l)=>s+l.massKg,0),
   volume=state.lots.reduce((s,l)=>s+l.volumeM3,0);
 if(Math.abs(mass-SUM.massKg)>EPS||Math.abs(volume-SUM.volumeM3)>EPS||
  state.lots.length!==SUM.uniqueLots)throw Error('8K prelaunch inventory mass/volume reconciliation failed');
 return{applied:true,materials:state,receipt,audit:{...SUM}};
}
root.StarfallStarterManifest8K=Object.freeze({prepare,CONTENTS:CONTENT,SUM});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallStarterManifest8K;
})(typeof globalThis!=='undefined'?globalThis:this);
