/* STARFALL Update 8K bootstrap: a one-time, inspectable PRE-EXPEDITION manifest.
 * These are genuinely imported/previously manufactured goods, not fabricated
 * from planetary ore, no per-landing freebies and no old-save migration grant.
 * Individual original 8A lots account for every kilogram and packed cubic metre.
 */
(function(root){'use strict';
const LOTS=Object.freeze([
 // All large hardware kits retain EXACT original 8E / 8F certified package bills.
 ['plant_kit_reduction_furnace',1100,3.4],
 ['vessel_kit_carbon_monoxide',170,4],
 ['plant_kit_pressure_pipeline',320,.95],
 ['plant_kit_air_fractionation',740,2.4],
 ['vessel_kit_nitrogen',195,4],
 ['machine_kit_cnc',220,.42],
 ['machine_kit_caster',260,.68],
 // Finite spare stocks were produced before launch; no replenishment on travel.
 ['stocked_chips',.10,.0005],['discrete_components',.30,.001],
 ['laminate',.70,.0014],['etchant',.50,.001],['solder',.30,.0001],
 ['insulation_polymer',2,.002],['magnets',2,.001],
 ['copper',6,.0008],['aluminum',4,.0015],
 ['refractory_block',6,.003],['steel',8,.002],
 ['water',10,.01],['carbon',6,.003]
]);
const HOLD='8d:ship-main:materials';
const fixed=(x)=>Number(x.toFixed(8));
function summary(){
 return Object.freeze({massKg:fixed(LOTS.reduce((a,l)=>a+l[1],0)),
 volumeM3:fixed(LOTS.reduce((a,l)=>a+l[2],0)),entries:LOTS.length});
}
function eligible(session,materials){
 if(!session||!materials||typeof materials.snapshot!=='function')throw Error('8K authoritative source-owned 8A ledger required');
 // Preserve ALL old saves, including pre-8A saves, without guessing an original
 // manifest. A true new-galaxy reset intentionally contains no old runtime.
 if(['flightGalaxy','physical8a','materials8a','mining8d','factory8f',
       'refinery8e','industrialPlant8e','launch7','outpost','research7e']
      .some(k=>session[k]!=null))return false;
 if(!session.freshExpedition&&Array.isArray(session.discoveries)&&session.discoveries.length)return false;
 return materials.inventory().length===0;
}
function initialize(session,ledger){
 if(!eligible(session,ledger))return{materials:ledger,seeded:false,summary:summary()};
 const Material=root.StarfallMaterials8A,Industry=root.StarfallIndustrialSite8E,
       Machine=root.StarfallMachineInstall8F;
 if(!Material||!Industry?.KITS||!Machine?.CAPS)throw Error('8K required original 8A/8E/8F contracts unavailable');
 const clone=Material.create(ledger.snapshot());
 const hold=clone.containers().find(x=>x.id===HOLD);
 if(!hold||hold.ownerId!=='ship-main'||hold.maxMassKg<summary().massKg||
    hold.maxVolumeM3<summary().volumeM3)
  throw Error('Starter industrial manifest does not fit the original physical ship cargo hold');
 for(let n=0;n<LOTS.length;n++){
  const [name,massKg,volumeM3]=LOTS[n],spec=Industry.KITS[name]||Machine.CAPS[name];
  if(spec&&(Math.abs(spec.massKg-massKg)>1e-8||Math.abs(spec.volumeM3-volumeM3)>1e-8))
   throw Error('Expedition kit no longer matches certified physical BOM: '+name);
  // The imported raw/finished stock is explicitly scarce and finite.
  clone.importLot({id:'preflight8k:'+String(n+1).padStart(2,'0'),
    materialId:name,containerId:HOLD,massKg,volumeM3,
    grade:.999,provenance:'initial_manifest:v1:preflight_industrial_supply'});
 }
 const total=clone.used(HOLD);
 if(total.massKg>hold.maxMassKg+1e-6||total.volumeM3>hold.maxVolumeM3+1e-8)
  throw Error('Unphysical overpacked industrial manifest');
 return{materials:clone,seeded:true,summary:summary()};
}
const api=Object.freeze({HOLD,LOTS,summary,eligible,initialize});
root.StarfallExpeditionManifest8K=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
