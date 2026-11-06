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
/* One-time accessibility rescue of a stranded saved truck, not a physical 8H delivery.
 * The exact original asset and cargo stay source-owned; no battery or matter is created.
 */
function recoverStrandedTruckForMobile(session){
 const unchanged=reason=>({session,recovered:false,reason});
 if(!session?.flightGalaxy||session.assistedTruckRecovery8b)return unchanged('NOT_ELIGIBLE');
 const original=session.flightGalaxy,store=root.StarfallPhysical8A.create(session.physical8a,{
  truckPose:original.truckPose,roverPose:original.roverPose});
 const truck=store.get('truck-expedition-001'),id='8b-assisted-mobile-recovery-v1';
 if(!truck||truck.location.kind!=='surface')return unchanged('ALREADY_STOWED_OR_MISSING');
 if(store.get('ship-main')?.type!=='ship')return unchanged('MISSING_SHIP');
 if(store.serialize().transfers.some(t=>t.id===id||
   t.action==='ASSISTED_RECOVERY'&&t.assetId===truck.id))return unchanged('ASSISTED_BEFORE');
 if(session.mining8d?.active)return unchanged('ACTIVE_MINING');
 if((session.logisticsOrders8h?.orders||[]).some(o=>o.carrierId===truck.id&&
    ['RESERVED','LOADED'].includes(o.status)))return unchanged('ACTIVE_ORDER');
 if(store.list().some(a=>a.id!==truck.id&&a.location.kind==='ship'&&
  a.location.slot==='starboard-hangar'))return unchanged('BAY_OCCUPIED');
 const cargo=root.StarfallCargo8B.snapshot(original.shipCargo8b),bay=root.StarfallCargo8B.BAY;
 if(cargo.mode==='ramp')return unchanged('ACTIVE_RAMP');
 const materials=session.materials8a?root.StarfallMaterials8A.create(session.materials8a)
  .used(root.StarfallMining8D.TRUCK):{massKg:0,volumeM3:0};
 if(!root.StarfallCargo8B.fit({...truck,massKg:truck.massKg+materials.massKg,
   volumeM3:truck.volumeM3+materials.volumeM3}).ok)return unchanged('CARGO_CAPACITY');
 // The final saved truck pose can be newer than the 8A surface state.
 // Preserve actual remaining energy and carried payload; do not recharge.
 if(original.truckPose?.bodyId===truck.location.bodyId&&
   Number.isFinite(original.truckPose.batteryJ)&&
   original.truckPose.batteryJ>=0&&original.truckPose.batteryJ<=44e6){
  const ownerState=store.get(truck.id)?.state||{};
  // When two older save mirrors disagree, take the lower actual charge/cargo,
  // never grant free stored Joules or stock from an inflated legacy pose.
  const physicalState={batteryJ:Number.isFinite(ownerState.batteryJ)?
   Math.min(ownerState.batteryJ,original.truckPose.batteryJ):original.truckPose.batteryJ};
  if(Number.isFinite(original.truckPose.cargo)&&original.truckPose.cargo>=0)
   physicalState.cargoKg=Number.isFinite(ownerState.cargoKg)?
    Math.min(ownerState.cargoKg,original.truckPose.cargo):original.truckPose.cargo;
  if(typeof original.truckPose.lights==='boolean')
   physicalState.lights=original.truckPose.lights;
  if(Array.isArray(original.truckPose.forward))physicalState.forward=original.truckPose.forward;
  store.setSurface(truck.id,truck.location.bodyId,truck.location.local,physicalState);
 }
 store.move(truck.id,{kind:'ship',slot:'starboard-hangar'},id,{
  expected:truck.location,maxMassKg:bay.maxCargoMassKg,maxVolumeM3:bay.maxCargoVolumeM3});
 const physical=store.serialize(),receipt=physical.transfers.find(t=>t.id===id);
 receipt.action='ASSISTED_RECOVERY';receipt.excludedFromNoCheatAcceptance=true;
 const next=JSON.parse(JSON.stringify(session));
 next.physical8a=physical;
 next.flightGalaxy={...next.flightGalaxy,truckPose:null,shipCargo8b:{
  schema:1,mode:'secured',pose:{x:bay.centerX,z:5.7,y:bay.floorY},counter:cargo.counter}};
 next.assistedTruckRecovery8b={schema:1,id,assetId:truck.id,status:'ASSISTED',
  notPhysical8HDelivery:true,source:truck.location,destination:receipt.destination,
  carriedMassKg:materials.massKg,carriedVolumeM3:materials.volumeM3};
 return{session:next,recovered:true,receipt:next.assistedTruckRecovery8b};
}
root.StarfallTruckCustody8B=Object.freeze({restore,description,recoverStrandedTruckForMobile});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTruckCustody8B;
})(typeof globalThis!=='undefined'?globalThis:this);
