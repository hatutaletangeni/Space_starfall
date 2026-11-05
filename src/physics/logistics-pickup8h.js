/* STARFALL Update 8H: pay to retrieve a genuinely deposited, dry-solid
 * 8A lot from an installed cargo depot into the SAME original truck hopper.
 * This is a pure, fail-closed save transaction kernel. No world movement,
 * inventory source, battery or depot is created here. Runtime MUST provide
 * observed EVA/dock proximity, then commit/read back all saved owners at once.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const good=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-6,TRUCK='truck-expedition-001',HOPPER='8d:truck-expedition-001:hopper';
const SOURCE='starfall-truck',JOULES=1200;
const GAS=new Set(['oxygen','nitrogen','hydrogen','carbon_dioxide',
 'carbon_monoxide','sulfur_dioxide','methane','helium','argon','ammonia']);
const coord=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))))*r;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function project(saved,{pickupId,lotId,depotId,operatorNear,bodyId,bodyRadius,timeS}={}){
 if(!id(pickupId)||!pickupId.startsWith('8h-pickup:')||!id(lotId)||!id(depotId)||
 !good(timeS)||!good(bodyRadius)||bodyRadius<=0||!id(bodyId))
  throw Error('8H invalid pickup identity, location or simulation clock');
 if(operatorNear!==true)throw Error('8H pickup requires a physical EVA operator at stopped truck and dock');
 if(!root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create||
  !root.StarfallLogisticsEnergy8H?.debit)
  throw Error('8H original material, physical and battery owners unavailable');
 if(!saved||!saved.physical8a||!saved.materials8a||!saved.flightGalaxy||
   !saved.logisticsOrders8h||!Array.isArray(saved.logisticsEnergyReceipts8h)||
   !saved.engineeringVehicles)
  throw Error('8H incomplete original flight save; refusing free stock migration');
 const history=saved.logisticsPickupReceipts8h||[];
 if(!Array.isArray(history)||history.length>=500||history.some(x=>!id(x.id)))
  throw Error('8H invalid/full pickup receipt history');
 if(history.some(x=>x.id===pickupId))
  throw Error('8H duplicate pickup ID cannot be replayed');
 const phys=root.StarfallPhysical8A.create(saved.physical8a);
 const truck=phys.get(TRUCK),dock=phys.get(depotId),pose=saved.flightGalaxy.truckPose;
 if(!saved.flightGalaxy.landed||!truck||truck.type!=='truck'||truck.condition<.2||
   truck.location?.kind!=='surface'||truck.location.bodyId!==bodyId||
   !coord(truck.location.local)||!pose||pose.bodyId!==bodyId||!coord(pose.local)||
   arc(truck.location.local,pose.local,bodyRadius)>.01||
   !good(pose.batteryJ)||!good(truck.state?.batteryJ)||
   Math.abs(pose.batteryJ-truck.state.batteryJ)>EPS)
  throw Error('8H original truck ground pose, battery or custody mismatch');
 if(!dock||dock.type!=='industrial_plant'||dock.state?.station!=='cargo_depot'||
  dock.state?.enabled!==true||dock.condition<.5||dock.location?.kind!=='surface'||
  dock.location.bodyId!==bodyId||!coord(dock.location.local))
  throw Error('8H actual manufactured operational dry depot required');
 if(arc(truck.location.local,dock.location.local,bodyRadius)>24)
  throw Error('8H original truck not physically at manufactured depot');
 const m=root.StarfallMaterials8A.create(saved.materials8a);
 const dc=m.containers().find(c=>c.id===dock.state.containerId&&c.ownerId===depotId&&
  /dry-solid cargo dock/i.test(c.kind));
 const hc=m.containers().find(c=>c.id===HOPPER&&c.ownerId===TRUCK);
 if(!dc||!hc)throw Error('8H original dry depot / ore hopper custody missing');
 const l=m.inventory(dc.id).find(x=>x.id===lotId);
 if(!l||GAS.has(l.materialId)||!good(l.massKg)||l.massKg<=0||!good(l.volumeM3))
  throw Error('8H actual dry solid lot not present in manufactured depot');
 // Accept only cargo that the player genuinely delivered through the original
 // 8H truck flow, not unverified standalone/magically seeded stock.
 const prior=saved.logisticsOrders8h.orders;
 if(!Array.isArray(prior))throw Error('8H invalid persisted original delivery history');
 const delivered=prior.find(o=>o.status==='DELIVERED'&&o.outputLotId===lotId&&
  o.destinationId===depotId&&o.destinationContainerId===dc.id&&
  o.carrierId===TRUCK&&o.carrierContainerId===HOPPER&&
  good(o.deliveredAtS)&&o.deliveredAtS<=timeS+EPS);
 if(!delivered)throw Error('8H depot lot lacks real original truck delivery provenance');
 if(lotId!=='transfer:'+delivered.unloadOperationId)
  throw Error('8H deposited lot ID disagrees with committed 8A delivery');
 const opId='8h-pickup:'+pickupId;
 // The real 8A reserve enforces outstanding reservations and hopper mass/volume.
 m.reserve(opId,lotId,HOPPER,l.massKg);
 const beforeMass=saved.materials8a.lots.reduce((n,x)=>n+x.massKg,0);
 const operation=m.commit(opId);
 const afterMass=m.snapshot().lots.reduce((n,x)=>n+x.massKg,0);
 if(Math.abs(beforeMass-afterMass)>EPS||operation.outputLotId!=='transfer:'+opId)
  throw Error('8H pickup violated original cargo conservation');
 const e=root.StarfallLogisticsEnergy8H.debit({
  state:{schema:1,stores:{[SOURCE]:{carrierId:TRUCK,energyJ:pose.batteryJ,capacityJ:44e6}},
   receipts:cp(saved.logisticsEnergyReceipts8h)},
  operationId:opId,carrierId:TRUCK,sourceId:SOURCE,usedJ:JOULES});
 const next=cp(saved);
 next.materials8a=m.snapshot();next.logisticsEnergyReceipts8h=e.state.receipts;
 next.flightGalaxy.truckPose.batteryJ=e.receipt.afterJ;
 const sourceTruck=next.physical8a.assets.find(x=>x.id===TRUCK);
 if(!sourceTruck)throw Error('8H original truck asset disappeared');
 sourceTruck.state.batteryJ=e.receipt.afterJ;
 const receipt={id:pickupId,operationId:opId,sourceLotId:lotId,
  destinationLotId:operation.outputLotId,sourceDepotId:depotId,
  originalDeliveryId:delivered.id,carrierId:TRUCK,bodyId,massKg:l.massKg,
  energyJ:JOULES,timeS,status:'COMMITTED'};
 next.logisticsPickupReceipts8h=[...history,receipt];
 root.StarfallMaterials8A.create(next.materials8a);
 root.StarfallPhysical8A.create(next.physical8a);
 return{saved:next,receipt:cp(receipt),energyReceipt:e.receipt,materialReceipt:operation};
}
function commit({storage,request}){
 if(!storage||typeof storage.read!=='function'||typeof storage.write!=='function'||
  typeof storage.status!=='function'||storage.status()?.durable!==true)
  throw Error('8H durable source-owned storage required for pickup');
 const original=storage.read();
 const q=project(original,request);
 if(storage.write(q.saved)!==true)
  throw Error('8H pickup save failed; do not mutate live source owners');
 if(storage.status()?.durable!==true)
  throw Error('8H pickup storage lost durability');
 const actual=storage.read();
 for(const key of ['materials8a','physical8a','logisticsOrders8h',
  'logisticsEnergyReceipts8h','logisticsPickupReceipts8h'])
  if(!same(actual?.[key],q.saved[key]))
   throw Error('8H pickup persistence readback failed: '+key);
 if(!same(actual?.flightGalaxy?.truckPose,q.saved.flightGalaxy.truckPose))
  throw Error('8H original truck battery readback failed');
 return q;
}
const API=Object.freeze({project,commit,TRUCK,HOPPER,JOULES});
root.StarfallLogisticsPickup8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
