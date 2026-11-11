/* STARFALL 8E surface industrial construction.
   A REAL certified kit lot is exchanged 1:1 for a physical mass-bearing plant
   or pressure vessel. Nothing is spawned, no stock is gifted, and duplicate
   operations cannot produce a second structure. Coordinate units are body-fixed. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ids=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const KITS=Object.freeze({
 plant_kit_tailings_stockpile:{type:'industrial_plant',station:'tailings_stockpile',
  tools:['ground_liner','retaining_mesh','surveyed_pile_boundary'],
  massKg:10,volumeM3:.04,workJ:120000,radiusScene:3},
 plant_kit_electrolyzer:{type:'industrial_plant',station:'electrolyzer',tools:['electrolyzer','gas_separator','hydrogen_tank','oxygen_tank'],massKg:450,volumeM3:1.2,workJ:7e5,radiusScene:5},
 plant_kit_reduction_furnace:{type:'industrial_plant',station:'reduction_furnace',tools:['reduction_furnace','gas_capture','alloy_crucible','sulfide_roaster','calcination_tray'],massKg:1100,volumeM3:3.4,workJ:1.5e6,radiusScene:7},
 plant_kit_glass_furnace:{type:'industrial_plant',station:'glass_furnace',tools:['glass_furnace','mold'],massKg:520,volumeM3:1.8,workJ:9e5,radiusScene:5},
 plant_kit_catalytic_reactor:{type:'industrial_plant',station:'catalytic_reactor',tools:['catalytic_reactor','gas_separator','methane_tank'],massKg:640,volumeM3:2,workJ:1e6,radiusScene:6},
 plant_kit_high_temp_cell:{type:'industrial_plant',station:'high_temp_cell',tools:['high_temp_cell','carbon_anode','gas_capture'],massKg:1320,volumeM3:3.6,workJ:2e6,radiusScene:7},
 plant_kit_vehicle_assembly_pad:{type:'industrial_plant',station:'vehicle_assembly',
  tools:['frame_jig','wheel_fixture','torque_wrench','wheel_alignment'],
  massKg:760,volumeM3:2.8,workJ:1800000,radiusScene:8},
 plant_kit_rocket_integration:{type:'industrial_plant',station:'rocket_integration',
  tools:['rocket_stage_fixture','overhead_hoist','tank_alignment','dry_weight_scale'],
  massKg:900,volumeM3:2.9,workJ:2100000,radiusScene:10},
 plant_kit_air_fractionation:{type:'industrial_plant',station:'air_fractionation',
  tools:['air_intake','dust_filter','gas_separator','compressor','nitrogen_storage_interface'],
  massKg:740,volumeM3:2.4,workJ:1350000,radiusScene:8},
 plant_kit_cargo_depot:{type:'industrial_plant',station:'cargo_depot',
  tools:['dry_cargo_locker','calibrated_scale','mechanical_coupler','stock_manifest'],
  massKg:480,volumeM3:1.8,workJ:950000,radiusScene:6},
 // Real 8E INSTALL consumes one certified 180 kg kit from the landed ship.
 // This is mechanical hardware only, not a magically powered conveyor or
 // registered T02 load. Segments must be physically connected later.
 plant_kit_conveyor_drive:{type:'industrial_plant',station:'conveyor_drive',
  tools:['belt_drive','support_idler','drive_guard','power_disconnect'],
  massKg:180,volumeM3:.55,workJ:410000,radiusScene:3},
 // Certified pressure-rated pair of short lines around a source-owned 420W
 // electric pump, relief valve and flow meter. No operating pipe until T02
 // electrical port is installed and wired and real gas packet verified.
 plant_kit_pressure_pipeline:{type:'industrial_plant',station:'pressure_pipeline',
  tools:['seamless_steel_tube','rated_flange','isolation_valve','electric_pump',
   'pressure_regulator','relief_valve','flow_meter','leak_monitor'],
  massKg:320,volumeM3:.95,workJ:720000,radiusScene:3.5,pressurePa:8e6},
 plant_kit_habitat_construction_pad:{type:'industrial_plant',station:'habitat_pad',
  tools:['pressure_section_jig','airlock_alignment','shell_welding_fixture','leak_test_port'],
  massKg:1120,volumeM3:3.7,workJ:2500000,radiusScene:11},
 vessel_kit_hydrogen:{type:'industrial_vessel',materialId:'hydrogen',massKg:160,volumeM3:4,workJ:1.8e5,radiusScene:4,pressurePa:8e6},
 vessel_kit_oxygen:{type:'industrial_vessel',materialId:'oxygen',massKg:195,volumeM3:4,workJ:1.8e5,radiusScene:4,pressurePa:8e6},
 vessel_kit_nitrogen:{type:'industrial_vessel',materialId:'nitrogen',massKg:195,volumeM3:4,workJ:1.8e5,radiusScene:4,pressurePa:8e6},
 vessel_kit_sulfur_dioxide:{type:'industrial_vessel',materialId:'sulfur_dioxide',
  massKg:210,volumeM3:4,workJ:225000,radiusScene:4,pressurePa:8e6},
 vessel_kit_carbon_monoxide:{type:'industrial_vessel',materialId:'carbon_monoxide',massKg:170,volumeM3:4,workJ:2e5,radiusScene:4,pressurePa:8e6},
 vessel_kit_carbon_dioxide:{type:'industrial_vessel',materialId:'carbon_dioxide',massKg:195,volumeM3:4,workJ:1.8e5,radiusScene:4,pressurePa:8e6},
 vessel_kit_methane:{type:'industrial_vessel',materialId:'methane',massKg:195,volumeM3:4,workJ:1.8e5,radiusScene:4,pressurePa:8e6}
});
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,i)=>s+v*b[i],0))))*r;
function quote({materials,physical,kitLotId,shipContainerId,bodyId,local,bodyRadius,shipLocal,operatorLocal}){
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.operations)||
    !physical||physical.schema!==1||!Array.isArray(physical.assets))throw Error('Missing 8A owner snapshots');
 const l=materials.lots.find(x=>x.id===kitLotId&&x.containerId===shipContainerId);
 if(!l)throw Error('Certified plant/vessel kit is not onboard ship');
 const k=KITS[l.materialId];if(!k)throw Error('Kit has no supported 8E facility definition');
 if(Math.abs(l.massKg-k.massKg)>EPS||!finite(l.volumeM3)||l.volumeM3<k.volumeM3-EPS||!finite(l.grade)||l.grade<.98)
  throw Error('Incomplete or uncertified industrial kit');
 const held=materials.operations.filter(o=>o.status==='RESERVED'&&o.lotId===l.id).reduce((s,o)=>s+o.massKg,0);
 if(held>EPS)throw Error('Kit is already reserved');
 if(!ids(bodyId)||!Array.isArray(local)||local.length!==3||!local.every(Number.isFinite)||
    !finite(bodyRadius)||bodyRadius<=0||Math.abs(Math.hypot(...local)-1)>1e-3)
  throw Error('Invalid surface placement');
 if(!Array.isArray(shipLocal)||!Array.isArray(operatorLocal))throw Error('Ship and EVA operator must be present');
 if(arc(local,shipLocal,bodyRadius)>75||arc(local,operatorLocal,bodyRadius)>40)
  throw Error('Plant must be within 75 units of landed ship and 40 of EVA operator');
 if(arc(local,shipLocal,bodyRadius)<k.radiusScene+35)
  throw Error('Plant would block spacecraft ramps, move farther away');
 for(const asset of physical.assets){
  if(asset.location?.kind!=='surface'||asset.location.bodyId!==bodyId)continue;
  const limit=(asset.type==='industrial_plant'||asset.type==='industrial_vessel'?KITS[asset.state?.kitMaterialId]?.radiusScene||5:9);
  if(arc(local,asset.location.local,bodyRadius)<k.radiusScene+limit+2)throw Error('Industrial footprint overlaps an owned asset');
 }
 return {kitLotId,materialId:l.materialId,spec:copy(k),massKg:k.massKg,workJ:k.workJ,bodyId,local:[...local]};
}
function install({jobId,assetId,materials,physical,shipContainerId,kitLotId,bodyId,local,
  bodyRadius,shipLocal,operatorLocal,energyReceipt}){
 if(!ids(jobId)||!jobId.startsWith('plant8e:')||!ids(assetId)||!assetId.startsWith('facility8e:'))
  throw Error('Invalid installation identity');
 const prior=physical?.transfers?.find(x=>x.id===jobId&&x.action==='INSTALL');
 if(prior){if(prior.assetId!==assetId||prior.sourceLotId!==kitLotId)throw Error('Installation receipt conflict');
  return {duplicate:true,receipt:copy(prior),materials:copy(materials),physical:copy(physical)};}
 const q=quote({materials,physical,shipContainerId,kitLotId,bodyId,local,bodyRadius,shipLocal,operatorLocal});
 if(!energyReceipt||energyReceipt.operationId!==jobId||!ids(energyReceipt.sourceId)||
    !finite(energyReceipt.usedJ)||energyReceipt.usedJ+EPS<q.workJ)
   throw Error('Insufficient actual installation power debit');
 if(physical.assets.some(a=>a.id===assetId))throw Error('Duplicate facility asset ID');
 const m=copy(materials);m.lots=m.lots.filter(x=>x.id!==kitLotId);
 const k=q.spec,isVessel=k.type==='industrial_vessel',
  isTailings=k.station==='tailings_stockpile',
  isCargoDock=k.station==='cargo_depot',
  isDryConveyor=k.station==='conveyor_drive',
  isPressureLine=k.station==='pressure_pipeline',
  containerId=isTailings?'tailings8h:'+assetId:isVessel?'vessel8e:'+assetId:isCargoDock?'depot8h:'+assetId:
    isDryConveyor?'conveyor8h:'+assetId:
    isPressureLine?'pressurepipe8h:'+assetId:
    // Every FULL paid 8E chemical station installation includes an EMPTY
    // built-in dry feed hopper; no free raw material or separate hardware.
    (k.type==='industrial_plant'&&
     ['reduction_furnace','glass_furnace','high_temp_cell','electrolyzer','catalytic_reactor']
      .includes(k.station))?'plantfeed8h:'+assetId:null;
 if(containerId)m.containers.push({id:containerId,ownerId:assetId,
  kind:isTailings?'open lined mineral-tailings stockpile':isCargoDock?'sealed dry-solid cargo dock':
    isDryConveyor?'guarded dry-solid conveyor tray':
    isPressureLine?'sealed 8MPa gas pipe hold-up':
    isVessel?'gas pressure vessel':'integrated 8E dry-reactant feed hopper',
  // Machine hopper is a small EMPTY fixture included in the already paid
  // original complete 8F factory kit, never an inventory grant or a tank.
  maxMassKg:isTailings?40000:isCargoDock?1200:isDryConveyor?40:isPressureLine?25:
    isVessel?1000:120,
  maxVolumeM3:isTailings?20:isCargoDock?1.6:isDryConveyor?.05:isPressureLine?.08:
    isVessel?k.volumeM3:.20});
 const machine={id:assetId,type:k.type,massKg:k.massKg,volumeM3:k.volumeM3,
  condition:1,location:{kind:'surface',bodyId,local:copy(local)},provenance:'8E physical kit:'+kitLotId,
  state:{kitMaterialId:q.materialId,station:k.station||null,tools:k.tools||[],
   materialId:k.materialId||null,containerId,
   dryFeedContainerId:containerId?.startsWith('plantfeed8h:')?containerId:null,
   ratedPressurePa:k.pressurePa||null,enabled:true}};
 const receipt={id:jobId,assetId,status:'COMMITTED',sourceLotId:kitLotId,massKg:k.massKg};
 const physicalState=root.StarfallPhysical8A.create(physical);
 physicalState.install(machine,receipt);
 const checked=root.StarfallMaterials8A.create(m);
 const newPhysical=physicalState.serialize();
 const sum=(ls)=>ls.reduce((a,x)=>a+x.massKg,0);
 const before=sum(materials.lots)+sum(physical.assets),after=sum(checked.inventory())+sum(newPhysical.assets);
 if(Math.abs(before-after)>EPS)throw Error('Industrial construction violated conservation of mass');
 return{duplicate:false,receipt,machine,materials:checked.snapshot(),physical:newPhysical};
}
root.StarfallIndustrialSite8E=Object.freeze({KITS,quote,install});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialSite8E;
})(typeof globalThis!=='undefined'?globalThis:this);
