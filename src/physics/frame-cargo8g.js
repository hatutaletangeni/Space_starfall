/* STARFALL 8G — bounded manufactured-frame cargo custody.
 * This DOES NOT invent a second truck, add a drivable vehicle, or use 8B's
 * unique expedition-truck ramp. A stationary EVA-assisted gantry transaction.
 * Distances are scene units consistent with the existing surface construction.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),valid=n=>typeof n==='number'&&Number.isFinite(n);
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-6;
const LIMIT=Object.freeze({massKg:3500,volumeM3:155,sceneRangeFromShip:55,
 sceneRangeFromEva:30,workJ:30000,slot:'engineering-frame-cradle'});
function distance(a,b,r){const dot=a.reduce((n,x,i)=>n+x*b[i],0);return Math.acos(Math.max(-1,Math.min(1,dot)))*r;}
function transfer({jobId,assetId,action,physical,bodyId,shipLocal,evaLocal,bodyRadius,
  shipLanded,operatorEVA,powerReceipt,unloadLocal,materials}){
 if(!id(jobId)||!id(assetId)||!id(bodyId)||!['load','unload'].includes(action))
  throw Error('Invalid 8G cargo operation');
 if(!shipLanded||!operatorEVA||!valid(bodyRadius)||bodyRadius<=0)
  throw Error('Surface EVA and landed ship required for mechanical frame transfer');
 const radial=x=>Array.isArray(x)&&x.length===3&&x.every(valid)&&Math.abs(Math.hypot(...x)-1)<1e-4;
 if(!radial(shipLocal)||!radial(evaLocal))throw Error('Invalid EVA/ship surface pose');
 if(!physical||physical.schema!==1||!Array.isArray(physical.assets))throw Error('Authoritative 8A inventory required');
 const prior=(physical.transfers||[]).find(x=>x.id===jobId);
 if(prior){if(prior.assetId!==assetId||prior.action!=='MOVE'||prior.reason!=='8G_FRAME_'+action.toUpperCase())
  throw Error('Cargo transfer ID collision');
  return {duplicate:true,receipt:copy(prior),physical:copy(physical)};
 }
 const asset=physical.assets.find(x=>x.id===assetId);
 if(!asset||asset.type!=='vehicle_frame')
  throw Error('Only manufactured physical 8G frames or activated prototypes fit the cradle');
 const activated=asset.state?.operational===true||asset.state?.commissioned===true;
 if(activated&&(!asset.state?.operational||!asset.state?.rideable||
   asset.state?.activationReceipt?.assetId!==assetId))
  throw Error('Unverified active vehicle cannot enter ship cradle');
 const velocity=Number.isFinite(asset.state?.speedMS)?Math.abs(asset.state.speedMS):
  Math.abs(asset.state?.drive?.speedMS||0);
 if(activated&&(!Number.isFinite(velocity)||velocity>.05))
  throw Error('Bring the manufactured vehicle to a complete stop before loading');

 if(!valid(asset.massKg)||asset.massKg<=0||!valid(asset.volumeM3)||asset.volumeM3<=0)
  throw Error('Invalid frame mass or volume');
 if(!powerReceipt||powerReceipt.operationId!==jobId||powerReceipt.status!=='COMMITTED'||
  !id(powerReceipt.sourceId)||!valid(powerReceipt.usedJ)||powerReceipt.usedJ<LIMIT.workJ)
  throw Error('Committed electrical loading-work debit required');
 let source,destination;
 if(action==='load'){
  source=asset.location;
  if(source?.kind!=='surface'||source.bodyId!==bodyId||!radial(source.local))
   throw Error('Frame is not on the landed world');
  if(distance(source.local,shipLocal,bodyRadius)>LIMIT.sceneRangeFromShip||
     distance(source.local,evaLocal,bodyRadius)>LIMIT.sceneRangeFromEva)
   throw Error('Frame outside powered gantry or EVA supervision range');
  // The existing unique 8B truck cargo is unchanged. All real ship-stowed
  // physical objects count toward its mass/volume envelope, including truck.
  const stowed=physical.assets.filter(x=>x.id!==assetId&&x.location?.kind==='ship'&&x.type!=='ship');
  let mass=stowed.reduce((s,x)=>s+x.massKg,0),volume=stowed.reduce((s,x)=>s+x.volumeM3,0);
  const shipGas=stowed.filter(x=>x.type==='industrial_vessel');
  if(shipGas.length){
   if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||
     !Array.isArray(materials.containers))throw Error('Physical cargo manifest requires contained gas inventory');
   for(const vessel of shipGas){
    const id=vessel.state?.containerId;
    if(!materials.containers.some(x=>x.id===id&&x.ownerId===vessel.id))
     throw Error('Gas vessel lacks owned material container');
    mass+=materials.lots.filter(x=>x.containerId===id).reduce((n,x)=>n+x.massKg,0);
   }
  }
  if(mass+asset.massKg>LIMIT.massKg+EPS||volume+asset.volumeM3>LIMIT.volumeM3+EPS)
   throw Error('Engineering cradle exceeds shared rated ship cargo capacity');
  if(stowed.some(x=>x.type==='vehicle_frame'))throw Error('Engineering cradle already occupied by a frame');
  destination={kind:'ship',parentId:'ship-main',slot:LIMIT.slot};
 }else{
  source=asset.location;
  if(source?.kind!=='ship'||source.parentId!=='ship-main'||source.slot!==LIMIT.slot)
   throw Error('Frame is not secured in engineering cradle');
  if(!radial(unloadLocal))throw Error('Missing safe surface unloading footprint');
  if(distance(unloadLocal,shipLocal,bodyRadius)>LIMIT.sceneRangeFromShip||
     distance(unloadLocal,evaLocal,bodyRadius)>LIMIT.sceneRangeFromEva)
   throw Error('Unloading site beyond ship gantry/EVA supervision');
  for(const other of physical.assets){
   if(other.id===assetId||other.location?.kind!=='surface'||other.location.bodyId!==bodyId||
      !radial(other.location.local))continue;
   if(distance(other.location.local,unloadLocal,bodyRadius)<16)
    throw Error('Unloading site obstructed by another physical asset');
  }
  destination={kind:'surface',bodyId,local:copy(unloadLocal)};
 }
 const registry=root.StarfallPhysical8A.create(physical);
 const receipt=registry.move(assetId,destination,jobId,{expected:source,
  maxMassKg:LIMIT.massKg,maxVolumeM3:LIMIT.volumeM3});
 const updated=registry.serialize();
 const t=updated.transfers.find(x=>x.id===jobId);
 t.action='MOVE';t.reason='8G_FRAME_'+action.toUpperCase();t.energyJ=powerReceipt.usedJ;t.powerSourceId=powerReceipt.sourceId;
 const before=physical.assets.reduce((s,x)=>s+x.massKg,0),
       after=updated.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(before-after)>EPS||updated.assets.length!==physical.assets.length)
  throw Error('Cargo transfer unexpectedly changed physical mass or asset count');
 return {duplicate:false,receipt:copy(t),physical:updated};
}
root.StarfallFrameCargo8G=Object.freeze({LIMIT,transfer});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallFrameCargo8G;
})(typeof globalThis!=='undefined'?globalThis:this);
