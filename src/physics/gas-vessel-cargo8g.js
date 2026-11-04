/* STARFALL 8G — rated gas-vessel ship custody, without loose-gas teleportation.
 * Physical pressure vessel moves as ONE asset; its actual 8A gas lots stay in
 * the vessel-owned container, aboard ship or on a planet.
 * Mass and bay limits include the contained gas, not just the steel tank.
 * Not a real-world certification for moving high-pressure gas aboard a craft.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const LIMIT=Object.freeze({slot:'engineering-gas-cradle',
 massKg:3500,volumeM3:155,workJ:120000,
 vesselMassKg:1300,vesselVolumeM3:8,
 sceneRangeFromShip:58,sceneRangeFromEva:32,clearanceScene:16,
 minimumRatingPa:5000000,
 materials:['nitrogen','oxygen']});
function radial(x){return Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&Math.abs(Math.hypot(...x)-1)<1e-4;}
function dist(a,b,r){return Math.acos(Math.max(-1,Math.min(1,a.reduce((s,n,i)=>s+n*b[i],0))))*r;}
function cargoMass(physical,materials,excludeId){
 const stowed=physical.assets.filter(x=>x.id!==excludeId&&x.type!=='ship'&&
   x.location?.kind==='ship'&&x.location.parentId==='ship-main');
 let massKg=0,volumeM3=0;
 for(const a of stowed){
  if(!finite(a.massKg)||!finite(a.volumeM3))throw Error('Invalid ship cargo asset');
  massKg+=a.massKg;volumeM3+=a.volumeM3;
  if(a.type==='industrial_vessel'){
   const containerId=a.state?.containerId;
   if(!id(containerId))throw Error('Stowed gas vessel lost its physical container');
   massKg+=materials.lots.filter(l=>l.containerId===containerId).reduce((s,l)=>s+l.massKg,0);
  }
 }
 return {massKg,volumeM3};
}
function transfer(args){
 const {jobId,assetId,action,physical,materials,bodyId,shipLocal,evaLocal,bodyRadius,
  shipLanded,operatorEVA,powerReceipt,unloadLocal}=args||{};
 if(!id(jobId)||!jobId.startsWith('gasCargo8g:')||!id(assetId)||!id(bodyId)||
   !['load','unload'].includes(action))throw Error('Invalid unique gas cargo transaction');
 if(!shipLanded||!operatorEVA||!finite(bodyRadius)||bodyRadius<=0||
   !radial(shipLocal)||!radial(evaLocal))
  throw Error('Landed ship and physically positioned EVA operator required');
 if(!physical||physical.schema!==1||!Array.isArray(physical.assets)||!Array.isArray(physical.transfers)||
   !materials||materials.schema!==1||!Array.isArray(materials.lots)||
   !Array.isArray(materials.containers)||!Array.isArray(materials.operations))
  throw Error('Actual 8A physical assets and material containers required');
 const previous=physical.transfers.find(x=>x.id===jobId);
 if(previous){
  if(previous.assetId!==assetId||previous.reason!=='8G_GAS_'+action.toUpperCase()||
    !physical.assets.some(x=>x.id===assetId&&x.type==='industrial_vessel')||
    !materials.containers.some(c=>c.id===previous.containerId&&c.ownerId===assetId))
   throw Error('Gas-vessel transfer receipt collision');
  return {duplicate:true,receipt:clone(previous),physical:clone(physical),materials:clone(materials)};
 }
 const vessel=physical.assets.find(x=>x.id===assetId);
 if(!vessel||vessel.type!=='industrial_vessel'||!finite(vessel.condition)||vessel.condition<.8)
  throw Error('Select an intact, actually installed gas pressure vessel');
 if(!finite(vessel.massKg)||!finite(vessel.volumeM3)||vessel.massKg<=0||vessel.volumeM3<=0||
   !finite(vessel.state?.ratedPressurePa)||vessel.state.ratedPressurePa<LIMIT.minimumRatingPa||
   !LIMIT.materials.includes(vessel.state?.materialId))
  throw Error('Gas vessel requires approved O2/N2 identity, rated pressure, physical size and mass');
 const containerId=vessel.state.containerId,container=materials.containers.find(x=>x.id===containerId);
 if(!id(containerId)||!container||container.ownerId!==vessel.id||
   !String(container.kind).includes('gas'))
  throw Error('Gas must remain inside the physical vessel-owned rated container');
 if(!finite(container.maxMassKg)||!finite(container.maxVolumeM3))
  throw Error('Gas storage rating unavailable');
 const lots=materials.lots.filter(x=>x.containerId===containerId);
 if(lots.some(l=>!id(l.id)||l.materialId!==vessel.state.materialId||!finite(l.massKg)||
    !finite(l.volumeM3)||!finite(l.grade)||l.grade<.98||!id(l.provenance)))
  throw Error('Uncertified or mixed gas in pressure vessel');
 const storedKg=lots.reduce((s,x)=>s+x.massKg,0),
  storedM3=lots.reduce((s,x)=>s+x.volumeM3,0);
 if(storedKg>container.maxMassKg+EPS||storedM3>container.maxVolumeM3+EPS)
  throw Error('Gas exceeds certified vessel container capacity');
 if(materials.operations.some(op=>op.status==='RESERVED'&&lots.some(l=>l.id===op.lotId)))
  throw Error('Cannot transport gas vessel while any of its contents are reserved');
 if(vessel.massKg+storedKg>LIMIT.vesselMassKg+EPS||vessel.volumeM3>LIMIT.vesselVolumeM3+EPS)
  throw Error('Loaded vessel exceeds dedicated pressure cargo rating');
 if(!powerReceipt||powerReceipt.operationId!==jobId||powerReceipt.status!=='COMMITTED'||
   powerReceipt.sourceId!=='ship-main:engineering-battery'||!finite(powerReceipt.usedJ)||
   powerReceipt.usedJ+EPS<LIMIT.workJ)
  throw Error('120 kJ real ship battery powered winch receipt required');
 let destination;
 if(action==='load'){
  if(vessel.location?.kind!=='surface'||vessel.location.bodyId!==bodyId||
    !radial(vessel.location.local))throw Error('Vessel not physically present on this world');
  if(dist(vessel.location.local,shipLocal,bodyRadius)>LIMIT.sceneRangeFromShip||
     dist(vessel.location.local,evaLocal,bodyRadius)>LIMIT.sceneRangeFromEva)
   throw Error('Surface gas vessel beyond ship gantry or EVA range');
  const other=physical.assets.filter(x=>x.id!==assetId&&x.type==='industrial_vessel'&&
     x.location?.kind==='ship'&&x.location.slot===LIMIT.slot);
  if(other.length)throw Error('Dedicated pressure-gas cradle already occupied');
  const aboard=cargoMass(physical,materials,assetId);
  if(aboard.massKg+vessel.massKg+storedKg>LIMIT.massKg+EPS||
     aboard.volumeM3+vessel.volumeM3>LIMIT.volumeM3+EPS)
   throw Error('Combined ship cargo exceeds rated mass or external volume');
  destination={kind:'ship',parentId:'ship-main',slot:LIMIT.slot};
 }else{
  if(vessel.location?.kind!=='ship'||vessel.location.parentId!=='ship-main'||
    vessel.location.slot!==LIMIT.slot)
   throw Error('Vessel is not in its own pressurized-gas cradle');
  if(!radial(unloadLocal))throw Error('No safe physical unloading position');
  if(dist(unloadLocal,shipLocal,bodyRadius)>LIMIT.sceneRangeFromShip||
     dist(unloadLocal,evaLocal,bodyRadius)>LIMIT.sceneRangeFromEva)
   throw Error('Gas-vessel unloading site beyond powered gantry or EVA');
  if(physical.assets.some(x=>x.id!==assetId&&x.location?.kind==='surface'&&
     x.location.bodyId===bodyId&&radial(x.location.local)&&
     dist(x.location.local,unloadLocal,bodyRadius)<LIMIT.clearanceScene))
   throw Error('Gas-vessel unloading site obstructed');
  destination={kind:'surface',bodyId,local:clone(unloadLocal)};
 }
 const next=root.StarfallPhysical8A.create(physical);
 const move=next.move(assetId,destination,jobId,{expected:vessel.location,
   maxMassKg:LIMIT.vesselMassKg,maxVolumeM3:LIMIT.vesselVolumeM3});
 const updated=next.serialize(),record=updated.transfers.find(x=>x.id===jobId);
 record.reason='8G_GAS_'+action.toUpperCase();record.action='MOVE';
 record.containerId=containerId;record.gasMaterialId=vessel.state.materialId;
 record.containedMassKg=storedKg;record.totalLoadedMassKg=vessel.massKg+storedKg;
 record.gasLotIds=lots.map(x=>x.id);
 record.energyJ=powerReceipt.usedJ;record.powerSourceId=powerReceipt.sourceId;
 if(JSON.stringify(updated.assets.find(x=>x.id===assetId).state)!==JSON.stringify(vessel.state)||
    JSON.stringify(materials.lots.filter(x=>x.containerId===containerId))!==JSON.stringify(lots))
  throw Error('Gas vessel or stored gas was altered by custody transfer');
 root.StarfallMaterials8A.create(materials);
 return {duplicate:false,receipt:clone(record),physical:updated,materials:clone(materials)};
}
root.StarfallGasVesselCargo8G=Object.freeze({LIMIT,transfer,cargoMass});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallGasVesselCargo8G;
})(typeof globalThis!=='undefined'?globalThis:this);
