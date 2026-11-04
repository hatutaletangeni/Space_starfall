/* STARFALL 8B — lossless location resolver for the ORIGINAL truck.
 * No movement, asset creation, save mutation, warp or ship physics changes. */
(function(root){'use strict';
function locate(truck,galaxy,currentSeed,savedSeed){
 if(!truck)return {status:'MISSING',message:'No physical truck record in this save. Restore backup; do not spawn a duplicate.'};
 if(truck.location?.kind==='ship')return {status:'SHIP',message:'Truck is inside the starboard ship cargo bay, not on a planet.'};
 if(truck.location?.kind!=='surface')return {status:'INVALID',message:'Truck has unsupported physical custody.'};
 const id=truck.location.bodyId;
 if(Number.isInteger(savedSeed)&&Number.isInteger(currentSeed)&&savedSeed!==currentSeed)
  return {status:'SEED_MISMATCH',bodyId:id,savedSeed,currentSeed,
   message:'The save was created in galaxy seed '+savedSeed+' but this game is running seed '+currentSeed+'. Navigate cannot safely resolve the original physical planet; reload the same galaxy seed with a backup.'};
 const world=galaxy?.byId?.get(id)||galaxy?.allWorlds?.find(x=>x.id===id);
 if(!world||!world.systemId||!world.name)
  return {status:'UNRESOLVED',bodyId:id,message:'Planet '+id+' is absent from the CURRENT generated galaxy. Keep the save intact; do not reinterpret a different planet as the original location.'};
 const system=galaxy?.byId?.get(world.systemId)||galaxy?.systems?.find(x=>x.id===world.systemId);
 if(!system)return {status:'UNRESOLVED',bodyId:id,message:'Planet '+id+' exists but the parent star system is unavailable.'};
 return {status:'SURFACE',bodyId:id,world,system,
   worldName:world.name,systemName:system.name,display:system.name+' / '+world.name,
   local:[...truck.location.local],message:'Original truck on '+world.name+' in '+system.name+'. Plot course; no vehicle transport or spawn occurs.'};
}
root.StarfallTruckNavigation8B=Object.freeze({locate});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTruckNavigation8B;
})(typeof globalThis!=='undefined'?globalThis:this);
