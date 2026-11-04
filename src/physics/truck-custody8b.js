/* 8B: custody reconciliation. Never spawn or move the truck. */
(function(root){'use strict';
function restore(saved,truck,landedBodyId){
 const cargo=root.StarfallCargo8B.snapshot(saved),B=root.StarfallCargo8B.BAY;
 if(!truck)return {cargo,issue:'MISSING'};
 if(truck.location?.kind==='ship'){
  if(cargo.mode==='secured')return {cargo,issue:null};
  return {cargo:{...cargo,mode:'secured',pose:{x:B.centerX,z:5.7,y:B.floorY}},issue:'REPAIRED'};
 }
 if(truck.location?.kind==='surface'){
  const mode=cargo.mode==='ramp'&&truck.location.bodyId===landedBodyId?'ramp':'ground';
  return {cargo:{...cargo,mode},issue:mode===cargo.mode?null:'REPAIRED'};
 }
 return {cargo,issue:'UNSUPPORTED'};
}
function description(truck,cargo,landedBodyId){
 if(!truck)return 'TRUCK MISSING FROM AUTHORITATIVE INVENTORY. No vehicle was created. Restore a previous backup.';
 if(truck.location?.kind==='ship')
  return 'TRUCK truck-expedition-001 IS SECURED INSIDE SHIP STARBOARD CARGO BAY (not listed under planetary assets). Land, walk EVA to wide right-hand ramp, press B to RELEASE. If hidden behind hull, use this physical custody record.';
 if(truck.location?.kind==='surface')
  return 'TRUCK truck-expedition-001 ON PLANET '+truck.location.bodyId+
   (truck.location.bodyId===landedBodyId?' (this world)':' (DIFFERENT WORLD—cannot remotely deploy)')+
   ' / ramp '+cargo.mode+'. Return to its actual planet; no duplicate will spawn.';
 return 'Truck custody location invalid; restore a backup.';
}
root.StarfallTruckCustody8B=Object.freeze({restore,description});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTruckCustody8B;
})(typeof globalThis!=='undefined'?globalThis:this);
