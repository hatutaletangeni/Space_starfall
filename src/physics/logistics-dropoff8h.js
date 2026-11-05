/* STARFALL 8H — register a physical, ALREADY LOADED 8D-mined ore lot
 * for delivery to an installed manufactured dry depot. No imaginary
 * pickup/transfer: the original mining drill already put real ore in the
 * original expedition truck hopper, with an 8D extraction receipt.
 * This reserves the exact original carrier lot + destination room. Real
 * loading/unloading work and truck movement remain external/sourced.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const TRUCK='truck-expedition-001',HOPPER='8d:truck-expedition-001:hopper';
const GASES=new Set(['oxygen','nitrogen','hydrogen','carbon_dioxide','carbon_monoxide',
 'sulfur_dioxide','methane','helium','argon','ammonia']);
const radiusOk=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((v,x,i)=>v+x*b[i],0))))*r;
function reserve({id,lotId,depotId,materials,physical,mining,orders,
 actor,operatorNear,timeS,bodyRadius}){
 if(!ident(id)||!id.startsWith('8h-ore:')||!ident(lotId)||!ident(depotId)||
 !finite(timeS)||!finite(bodyRadius)||bodyRadius<=0)
  throw Error('8H valid unique ore delivery identifiers and clock required');
 if(!root.StarfallMaterials8A?.create||!root.StarfallPhysical8A?.create||
    !root.StarfallLogisticsOrders8H?.create)
  throw Error('8H original 8A physical, material and logistics owners missing');
 if(operatorNear!==true)
  throw Error('8H physical EVA operator must be near original stopped truck');
 if(!actor||actor.id!==TRUCK||actor.kind!=='truck'||actor.operational!==true||
  !ident(actor.bodyId)||!radiusOk(actor.local)||actor.containerId!==HOPPER)
  throw Error('8H requires original operating surface truck and ore hopper');
 const assets=root.StarfallPhysical8A.create(physical);
 const truck=assets.get(TRUCK),depot=assets.get(depotId);
 if(!truck||truck.type!=='truck'||truck.condition<.2||
  truck.location?.kind!=='surface'||truck.location.bodyId!==actor.bodyId||
  !radiusOk(truck.location.local)||arc(truck.location.local,actor.local,bodyRadius)>0.01)
  throw Error('8H actor pose differs from original physical truck');
 if(!depot||depot.type!=='industrial_plant'||depot.state?.station!=='cargo_depot'||
  depot.state?.enabled!==true||depot.condition<.5||
  depot.location?.kind!=='surface'||depot.location.bodyId!==actor.bodyId||
  !radiusOk(depot.location.local)||!ident(depot.state.containerId))
  throw Error('8H destination requires installed, operational manufactured dry cargo depot on same world');
 const ledger=root.StarfallMaterials8A.create(materials);
 const source=ledger.containers().find(x=>x.id===HOPPER&&x.ownerId===TRUCK);
 const destination=ledger.containers().find(x=>x.id===depot.state.containerId&&
  x.ownerId===depot.id&&/dry-solid cargo dock/i.test(x.kind));
 if(!source||!destination)throw Error('8H source hopper or manufactured dry dock custody missing');
 const lot=ledger.inventory(HOPPER).find(x=>x.id===lotId);
 if(!lot||GASES.has(lot.materialId)||!finite(lot.massKg)||lot.massKg<=0||
  !finite(lot.volumeM3))throw Error('8H original verified solid ore hopper lot missing');
 if(!mining||mining.schema!==1||!Array.isArray(mining.history))
  throw Error('8H original 8D mining receipts missing');
 const drill=mining.history.find(x=>x.type==='DRILL'&&x.status==='COMMITTED'&&
  lot.id==='mine:'+x.id&&x.destination===HOPPER&&
  x.source===lot.provenance&&Math.abs(x.massKg-lot.massKg)<EPS);
 if(!drill)throw Error('8H original physical 8D drill extraction receipt does not own this ore lot');
 const previous=root.StarfallLogisticsOrders8H.create(orders).snapshot();
 if(previous.orders.length>=500)throw Error('8H order capacity exceeded');
 if(previous.orders.some(x=>x.id===id||
  (x.status==='LOADED'&&x.carrierLotId===lot.id)))
  throw Error('8H duplicate order or previously reserved ore lot');
 const unloadOperationId='8h-unload:'+id,loadOperationId='8h-load:'+id;
 ledger.reserve(unloadOperationId,lot.id,destination.id,lot.massKg);
 const record={schema:1,id,status:'LOADED',bodyId:actor.bodyId,
  sourceId:TRUCK,destinationId:depot.id,carrierId:TRUCK,
  sourceContainerId:HOPPER,destinationContainerId:destination.id,
  carrierContainerId:HOPPER,lotId:lot.id,carrierLotId:lot.id,
  massKg:lot.massKg,createdS:timeS,loadedAtS:timeS,
  deliveredAtS:null,loadOperationId,unloadOperationId,
  loadJ:0,unloadJ:1200,miningReceiptId:drill.id,
  provenance:lot.provenance};
 const next={schema:1,orders:[...previous.orders,record]};
 root.StarfallLogisticsOrders8H.create(next);
 return{orders:next,materials:ledger.snapshot(),record:cp(record)};
}
/* A loaded order is a capacity/stock reservation, not an irreversible
 * packet movement. Release it only while the original ore is still aboard
 * the same physical truck; cancellation grants no energy or extra stock.
 */
function cancel({id,materials,orders,physical,actor,operatorNear,timeS,bodyRadius}){
 if(!ident(id)||!finite(timeS)||!finite(bodyRadius)||bodyRadius<=0||
    operatorNear!==true)
  throw Error('8H cancellation requires on-foot original truck operator and valid clock');
 if(!actor||actor.id!==TRUCK||actor.kind!=='truck'||
    actor.containerId!==HOPPER||!radiusOk(actor.local)||!ident(actor.bodyId))
  throw Error('8H original truck missing at cancellation');
 const truck=root.StarfallPhysical8A.create(physical).get(TRUCK);
 if(!truck||truck.type!=='truck'||truck.condition<.2||
    truck.location?.kind!=='surface'||truck.location.bodyId!==actor.bodyId||
    arc(truck.location.local,actor.local,bodyRadius)>0.01)
  throw Error('8H cancellation truck physical custody/position mismatch');
 const current=root.StarfallLogisticsOrders8H.create(orders).snapshot(),o=current.orders.find(x=>x.id===id);
 if(!o||o.status!=='LOADED'||!o.miningReceiptId||o.carrierId!==TRUCK||
    o.carrierContainerId!==HOPPER||o.carrierLotId!==o.lotId||
    o.bodyId!==actor.bodyId)
  throw Error('8H only a real original mined-ore delivery reservation can be cancelled');
 if(timeS+EPS<o.loadedAtS)throw Error('8H cancellation clock cannot reverse');
 const ledger=root.StarfallMaterials8A.create(materials);
 const lot=ledger.inventory(HOPPER).find(x=>x.id===o.lotId);
 if(!lot||Math.abs(lot.massKg-o.massKg)>EPS)
  throw Error('8H original loaded ore moved or consumed before cancellation');
 const op=ledger.operations().find(x=>x.id===o.unloadOperationId);
 if(!op||op.status!=='RESERVED'||op.lotId!==o.lotId||
    op.destinationId!==o.destinationContainerId||Math.abs(op.massKg-o.massKg)>EPS)
  throw Error('8H exact outstanding 8A destination reservation missing');
 ledger.cancel(o.unloadOperationId);
 const next={...current,orders:current.orders.map(x=>x.id===id?
  {...x,status:'CANCELLED',canceledAtS:timeS}:x)};
 root.StarfallLogisticsOrders8H.create(next);
 return{orders:next,materials:ledger.snapshot(),
  receipt:{id,operationId:o.unloadOperationId,status:'CANCELLED',
   originalLotId:o.lotId,massKg:o.massKg}};
}
root.StarfallLogisticsDropoff8H=Object.freeze({reserve,cancel,TRUCK,HOPPER});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallLogisticsDropoff8H;
})(typeof window!=='undefined'?window:globalThis);
