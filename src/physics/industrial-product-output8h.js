/* Update 8H: fail-closed contract for moving an EXISTING solid product
 * from an original 8E output bin into an installed 8E cargo depot.
 * This module does NOT create a conveyor, debit power, or imply runtime
 * integration. Call only after authoritative native T02 transport completion.
 */
(function(root){'use strict';
const EPS=1e-7,cp=x=>JSON.parse(JSON.stringify(x));
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const unit=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&Math.abs(Math.hypot(...v)-1)<1e-3;
const gases=new Set(['hydrogen','oxygen','nitrogen','carbon_dioxide','carbon_monoxide','methane','sulfur_dioxide','argon','helium','ammonia']);
function commit({operationId,lotId,massKg,stationId,depotId,bodyId,materials8a,physical8a,transportReceipt,packetArchive8h}={}){
 if(!valid(operationId)||!operationId.startsWith('8h-product:')||!valid(lotId)||!valid(stationId)||!valid(depotId)||!valid(bodyId)||!finite(massKg)||massKg<=0)
  throw Error('Invalid original 8H product transfer request');
 if(!materials8a||materials8a.schema!==1||!physical8a||physical8a.schema!==1||
   !Array.isArray(physical8a.assets)||!Array.isArray(physical8a.transfers))
  throw Error('Original 8A custody owners missing');
 const assets=physical8a.assets,plant=assets.find(a=>a.id===stationId),depot=assets.find(a=>a.id===depotId);
 const installed=a=>a&&physical8a.transfers.some(t=>t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===a.id&&valid(t.sourceLotId)&&Math.abs(t.massKg-a.massKg)<EPS);
 const active=a=>installed(a)&&a.type==='industrial_plant'&&a.condition>=.8&&a.state?.enabled===true&&a.location?.kind==='surface'&&a.location.bodyId===bodyId&&unit(a.location.local);
 if(!active(plant)||!active(depot)||plant.id===depot.id||depot.state.station!=='cargo_depot'||!['reduction_furnace','glass_furnace','high_temp_cell','electrolyzer','catalytic_reactor'].includes(plant.state.station))
  throw Error('Paid same-world original station and receiving depot required');
 const sourceId=transportReceipt?.sourceContainerId,targetId=depot.state.containerId;
 const source=materials8a.containers?.find(c=>c.id===sourceId&&c.ownerId===stationId);
 const target=materials8a.containers?.find(c=>c.id===targetId&&c.ownerId===depotId&&/dry-solid cargo dock/i.test(c.kind));
 if(!source||!target||!valid(sourceId)||!valid(targetId)||!/dry[ -]solid output/i.test(source.kind))
  throw Error('Physical source output and receiving 8A depot bins required');
 if(!transportReceipt||transportReceipt.operationId!==operationId||transportReceipt.lotId!==lotId||
    transportReceipt.sourceId!==stationId||transportReceipt.destinationId!==depotId||
    transportReceipt.bodyId!==bodyId||transportReceipt.massKg!==massKg||
    transportReceipt.status!=='DELIVERED'||transportReceipt.nativeT02Paid!==true||
    !finite(transportReceipt.usedJ)||transportReceipt.usedJ<=0||
    !valid(transportReceipt.powerReceiptId))
  throw Error('Actual completed original T02 transport receipt required; no free output teleport');
 // A caller-supplied receipt is never sufficient proof of transport.
 // The original conveyor archive must independently own a completed packet.
 // The current original conveyor only supports depot -> plant input, not
 // plant output -> depot. Therefore no such packet can currently qualify.
 // This deliberately blocks product teleportation until reverse transport
 // is implemented by the authoritative powered conveyor runtime.
 const jobs=packetArchive8h?.schema===1&&Array.isArray(packetArchive8h.jobs)
   ?packetArchive8h.jobs:[];
 const packet=jobs.find(j=>j.id===transportReceipt.packetId);
 if(!valid(transportReceipt.packetId)||!packet||!Array.isArray(packet.driveIds)||packet.driveIds.length===0||!packet.driveIds.every(valid)||packet.status!=='DELIVERED'||packet.sourceId!==stationId||
    packet.targetId!==depotId||packet.bodyId!==bodyId||
    packet.massKg!==massKg||packet.currentLotId!==lotId||
    (!finite(packet.completionS))||packet.cursor!==packet.driveIds?.length+1)
  throw Error('Authoritative original 8H delivered conveyor packet required');
 const ledger=root.StarfallMaterials8A?.create(materials8a);
 if(!ledger)throw Error('Original 8A ledger unavailable');
 const prior=ledger.operations().find(o=>o.id===operationId);
 if(prior){
  if(prior.status!=='COMMITTED'||prior.lotId!==lotId||prior.destinationId!==targetId||Math.abs(prior.massKg-massKg)>EPS)
   throw Error('Conflicting product custody replay');
  return {duplicate:true,materials8a:cp(materials8a),receipt:cp(prior)};
 }
 const lot=ledger.inventory(sourceId).find(l=>l.id===lotId);
 if(!lot||gases.has(lot.materialId)||lot.materialId==='water'||lot.materialId==='ice'||lot.massKg+EPS<massKg)
  throw Error('Original solid product lot missing or not dry');
 const before=ledger.inventory().reduce((s,l)=>s+l.massKg,0);
 ledger.reserve(operationId,lotId,targetId,massKg);
 const receipt=ledger.commit(operationId),after=ledger.inventory().reduce((s,l)=>s+l.massKg,0);
 if(Math.abs(before-after)>EPS)throw Error('Original 8A product custody mass mismatch');
 return {duplicate:false,materials8a:ledger.snapshot(),receipt};
}
root.StarfallIndustrialProductOutput8H=Object.freeze({commit});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialProductOutput8H;
})(typeof globalThis!=='undefined'?globalThis:this);
