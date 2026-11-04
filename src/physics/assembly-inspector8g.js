/* STARFALL 8G — non-mutating vehicle assembly engineering preflight.
 * No vehicle commissioning, inventory transfer, asset creation or power debit. */
(function(root){'use strict';
const good=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function report({blueprintId,materials,physical,containerId,bodyId,shipLanded,powerEnabled,operatorNear}){
 const def=root.StarfallAssembly8G?.DEFINITIONS?.[blueprintId];
 if(!def)throw Error('Unknown 8G engineering blueprint');
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.operations)||
    !physical||physical.schema!==1||!Array.isArray(physical.assets)||!containerId)throw Error('Missing authoritative inventory');
 const parts=Object.entries(def.parts).map(([materialId,requiredKg])=>{
  const availableKg=materials.lots.filter(l=>l.containerId===containerId&&l.materialId===materialId&&good(l.grade)&&l.grade>=.98)
   .reduce((sum,l)=>{
    const reserved=materials.operations.filter(x=>x.status==='RESERVED'&&x.lotId===l.id).reduce((n,x)=>n+x.massKg,0);
    return sum+Math.max(0,l.massKg-reserved);
   },0);
  return {materialId,requiredKg,availableKg,missingKg:Math.max(0,requiredKg-availableKg)};
 });
 const pad=physical.assets.find(a=>a.type==='industrial_plant'&&a.condition>=.5&&a.location?.kind==='surface'&&
   a.location.bodyId===bodyId&&a.state?.station===def.facility&&a.state?.enabled!==false);
 const flags={shipLanded:!!shipLanded,powerEnabled:!!powerEnabled,operatorNear:!!operatorNear,
   physicalFacility:!!pad,components:parts.every(p=>p.missingKg<=1e-7)};
 return Object.freeze({blueprintId,kind:def.kind,facilityNeeded:def.facility,facilityId:pad?.id||null,
  nominalBlueprintMassKg:def.massKg,exactPartMassKg:parts.reduce((s,p)=>s+p.requiredKg,0),
  volumeM3:def.volumeM3,parts,flags,readyForEngineeringReview:Object.values(flags).every(Boolean),
  canCommission:false,reason:'READ-ONLY PREFLIGHT. No verified drivable vehicle or rocket/habitat commissioning path is enabled.'});
}
root.StarfallAssemblyInspector8G=Object.freeze({report});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallAssemblyInspector8G;
})(typeof globalThis!=='undefined'?globalThis:this);