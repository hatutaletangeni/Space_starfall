/* STARFALL 8I — source-paid T02 installation proposal.
 * Pure snapshot transaction. Never calls the free Store.add path.
 * The runtime must commit both returned snapshots atomically; until wired,
 * this is NOT a playable Industrial installation feature.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const positive=x=>Number.isFinite(x)&&x>0;
const SPECS=Object.freeze({
 solar:{part:'solar_module',kg:830,watts:4000},
 battery:{part:'battery_cell',kg:1950,capacityJ:72000000}
});
function install(a){
 if(!a||!validId(a.operationId)||!validId(a.bodyId)||!validId(a.assetId)||
 !SPECS[a.kind]||!a.outpost||a.outpost.schema!==1||!Array.isArray(a.outpost.items)||
 !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
 !Array.isArray(a.materials.operations)||!Array.isArray(a.lotIds)||!a.lotIds.length||
 !a.manufacturing||a.manufacturing.schema!==1||!Array.isArray(a.manufacturing.jobs)||
 !positive(a.installEnergyJ)||!positive(a.installSeconds)||
 !Array.isArray(a.local)||a.local.length!==3||!a.local.every(Number.isFinite)||
 Math.abs(Math.hypot(...a.local)-1)>1e-4)
 throw Error('T02 installation requires valid paid 8A/8F snapshots, site and work');
 const spec=SPECS[a.kind],id='t02paid:'+a.assetId;
 const previous=a.outpost.items.find(x=>x.id===id);
 if(previous){
  if(previous.installOperationId===a.operationId)return{duplicate:true,outpost:cp(a.outpost),materials:cp(a.materials)};
  throw Error('T02 physical asset identity already installed');
 }
 if(a.outpost.items.some(x=>x.installOperationId===a.operationId||x.physicalAssetId===a.assetId))
 throw Error('T02 installation operation or asset reused');
 if(new Set(a.lotIds).size!==a.lotIds.length)throw Error('Duplicate lot IDs');
 const lots=a.lotIds.map(id=>a.materials.lots.find(x=>x.id===id));
 if(lots.some(x=>!x||x.materialId!==spec.part||!positive(x.massKg)||
 x.bodyId!==a.bodyId||x.containerId!==a.containerId))
 throw Error('T02 requires physical same-world manufactured part lots');
 const mass=lots.reduce((s,x)=>s+x.massKg,0);
 if(mass+1e-8<spec.kg)throw Error('T02 module bill of materials not paid');
 // All selected lots must be traceable to committed 8F part jobs.
 for(const lot of lots){
  const matches=a.manufacturing.jobs.filter(j=>j.status==='COMMITTED'&&
   j.recipeId===spec.part&&j.id===lot.provenance);
  if(matches.length!==1)throw Error('T02 part lot lacks unique committed 8F job provenance');
 }
 if(a.materials.operations.some(x=>x.operationId===a.operationId))
 throw Error('T02 installation operation already consumed');
 // No partial deductions: construct and return new snapshots.
 const materials=cp(a.materials),outpost=cp(a.outpost);
 for(const lot of lots){
  const i=materials.lots.findIndex(x=>x.id===lot.id);
  materials.lots.splice(i,1);
 }
 materials.operations.push({operationId:a.operationId,kind:'T02_INSTALL',bodyId:a.bodyId,
  consumedLots:cp(a.lotIds),massKg:mass,energyJ:a.installEnergyJ,seconds:a.installSeconds});
 outpost.items.push({id,kind:a.kind,bodyId:a.bodyId,physicalAssetId:a.assetId,
  installOperationId:a.operationId,local:cp(a.local),facing:[0,0,1],
  height:0,energyJ:0,temperatureK:290,condition:1,enabled:true,samples:[]});
 return{duplicate:false,outpost,materials,receipt:{operationId:a.operationId,assetId:a.assetId,
  bodyId:a.bodyId,kind:a.kind,consumedLots:cp(a.lotIds),energyJ:a.installEnergyJ,
  seconds:a.installSeconds,initialChargeJ:0}};
}
root.StarfallT02PaidInstall8I=Object.freeze({SPECS,install});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallT02PaidInstall8I;
})(globalThis);
