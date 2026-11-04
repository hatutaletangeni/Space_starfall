/* STARFALL 8G — full rated industrial gas vessel custody and cargo transport.
 * The gas stays in its OWN vessel's 8A container; no magically generated ship
 * lots or unqualified pressure hose. Rigid vessel + contained gas count toward
 * the ONE finite spacecraft hold, and a loaded vessel cannot be used by a
 * surface plant. Uses 8A's immutable source/destination physical move ledger.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128,EPS=1e-6;
const LIMIT=Object.freeze({massKg:3500,volumeM3:155,workJ:90000,sceneFromShip:60,
 sceneFromEVA:35,slot:'engineering-gas-cradle',minSeparationScene:13,
 transportMaterials:Object.freeze(['nitrogen','oxygen','hydrogen','methane','carbon_dioxide'])});
function radial(x){return Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;}
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;}
function cargoOf(a,materials){
 if(!a||!finite(a.massKg)||!finite(a.volumeM3))throw Error('Invalid ship freight');
 const vessel=a.type==='industrial_vessel';
 if(!vessel)return{massKg:a.massKg,volumeM3:a.volumeM3};
 const cid=a.state?.containerId,c=materials.containers.find(x=>x.id===cid);
 if(!c||c.ownerId!==a.id||!String(c.kind).includes('gas'))
  throw Error('Industrial gas vessel lacks an owned rated 8A gas container');
 const lots=materials.lots.filter(x=>x.containerId===cid);
 for(const l of lots)if(l.materialId!==a.state.materialId||!finite(l.massKg)||!finite(l.volumeM3))
  throw Error('Contaminated/untrusted pressure vessel cargo');
 const gasKg=lots.reduce((s,x)=>s+x.massKg,0);
 return{massKg:a.massKg+gasKg,volumeM3:a.volumeM3,gasKg,
  gasVolumeM3:lots.reduce((s,x)=>s+x.volumeM3,0)};
}
function transfer(a){
 if(!a||!id(a.jobId)||!a.jobId.startsWith('gasCargo8g:')||!id(a.assetId)||
 !id(a.bodyId)||!['load','unload'].includes(a.action))throw Error('Invalid unique 8G rated gas custody operation');
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered||!finite(a.bodyRadius)||a.bodyRadius<=0||
 !radial(a.shipLocal)||!radial(a.evaLocal))throw Error('Landed powered spacecraft and EVA required');
 const energy=a.powerReceipt;
 if(!energy||energy.operationId!==a.jobId||energy.status!=='COMMITTED'||
 energy.sourceId!=='ship-main:engineering-battery'||!finite(energy.usedJ)||energy.usedJ<LIMIT.workJ)
 throw Error('90 kJ committed ship winch-work debit required');
 const physical=a.physical,materials=a.materials;
 if(!physical||physical.schema!==1||!Array.isArray(physical.assets)||!Array.isArray(physical.transfers)||
 !materials||materials.schema!==1||!Array.isArray(materials.containers)||
 !Array.isArray(materials.lots)||!Array.isArray(materials.operations))
 throw Error('Both authoritative 8A material and physical custody ledgers required');
 const prior=physical.transfers.find(x=>x.id===a.jobId);
 if(prior){
  if(prior.assetId!==a.assetId||prior.reason!=='8G_GAS_'+a.action.toUpperCase())
   throw Error('Replayed gas crane operation ID collision');
  return {duplicate:true,receipt:clone(prior),physical:clone(physical),materials:clone(materials)};
 }
 const vessel=physical.assets.find(x=>x.id===a.assetId);
 if(!vessel||vessel.type!=='industrial_vessel'||!LIMIT.transportMaterials.includes(vessel.state?.materialId)||
 !finite(vessel.massKg)||vessel.massKg<=0||!finite(vessel.volumeM3)||vessel.volumeM3<=0||
 !finite(vessel.condition)||vessel.condition<.8||!finite(vessel.state?.ratedPressurePa)||
 vessel.state.ratedPressurePa<5e6||vessel.state?.enabled!==true)
 throw Error('Only intact, enabled 5 MPa+ rated physical gas vessels can be moved');
 const internal=cargoOf(vessel,materials);
 const store=materials.containers.find(x=>x.id===vessel.state.containerId);
 if(internal.gasKg>store.maxMassKg+EPS||internal.gasVolumeM3>store.maxVolumeM3+EPS)
 throw Error('Vessel contains unsafe over-capacity gas charge');
 if(materials.operations.some(x=>x.status==='RESERVED'&&
  materials.lots.some(l=>l.id===x.lotId&&l.containerId===store.id)))
 throw Error('Reserved gas must be committed or cancelled before vessel transport');
 const source=vessel.location;
 let destination;
 if(a.action==='load'){
  if(source?.kind!=='surface'||source.bodyId!==a.bodyId||!radial(source.local))
   throw Error('Load must occur at the vessel actual planetary surface');
  if(arc(source.local,a.shipLocal,a.bodyRadius)>LIMIT.sceneFromShip||
   arc(source.local,a.evaLocal,a.bodyRadius)>LIMIT.sceneFromEVA)
   throw Error('Vessel beyond physical ship gantry or EVA handling reach');
  const stowed=physical.assets.filter(x=>x.id!==vessel.id&&x.id!=='ship-main'&&
   x.location?.kind==='ship');
  if(stowed.some(x=>x.type==='industrial_vessel'&&x.location.slot===LIMIT.slot))
   throw Error('Engineering rated-gas cradle is already occupied');
  let weight=internal.massKg,volume=internal.volumeM3;
  for(const x of stowed){const p=cargoOf(x,materials);weight+=p.massKg;volume+=p.volumeM3;}
  if(weight>LIMIT.massKg+EPS||volume>LIMIT.volumeM3+EPS)
   throw Error('Gas vessel plus contents exceed shared ship cargo mass/volume capacity');
  destination={kind:'ship',parentId:'ship-main',slot:LIMIT.slot};
 }else{
  if(source?.kind!=='ship'||source.parentId!=='ship-main'||source.slot!==LIMIT.slot)
   throw Error('Rated vessel is not secured in the gas cradle');
  if(!radial(a.unloadLocal)||arc(a.unloadLocal,a.shipLocal,a.bodyRadius)>LIMIT.sceneFromShip||
   arc(a.unloadLocal,a.evaLocal,a.bodyRadius)>LIMIT.sceneFromEVA)
   throw Error('Need accessible clear surface unloading location');
  if(arc(a.unloadLocal,a.shipLocal,a.bodyRadius)<26)
   throw Error('Pressure vessel unloading would obstruct the spacecraft ramp');
  for(const other of physical.assets){
   if(other.id===vessel.id||other.location?.kind!=='surface'||
      other.location.bodyId!==a.bodyId||!radial(other.location.local))continue;
   if(arc(a.unloadLocal,other.location.local,a.bodyRadius)<LIMIT.minSeparationScene)
    throw Error('Pressure vessel unloading footprint occupied');
  }
  destination={kind:'surface',bodyId:a.bodyId,local:clone(a.unloadLocal)};
 }
 const next=root.StarfallPhysical8A.create(physical);
 next.move(vessel.id,destination,a.jobId,{expected:source});
 const saved=next.serialize(),receipt=saved.transfers.find(t=>t.id===a.jobId);
 receipt.reason='8G_GAS_'+a.action.toUpperCase();receipt.energyJ=energy.usedJ;
 receipt.dryMassKg=vessel.massKg;receipt.containedGasKg=internal.gasKg;
 receipt.transportMassKg=internal.massKg;receipt.gasContainerId=store.id;
 receipt.gasLotIds=materials.lots.filter(l=>l.containerId===store.id).map(l=>l.id);
 if(saved.assets.length!==physical.assets.length||saved.assets.reduce((s,x)=>s+x.massKg,0)!==
  physical.assets.reduce((s,x)=>s+x.massKg,0))
  throw Error('Physical vessel move may not create or destroy solid structure');
 root.StarfallMaterials8A.create(materials);
 return {duplicate:false,receipt:clone(receipt),physical:saved,materials:clone(materials)};
}
root.StarfallGasVesselCargo8G=Object.freeze({LIMIT,cargoOf,transfer});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallGasVesselCargo8G;
})(typeof globalThis!=='undefined'?globalThis:this);
