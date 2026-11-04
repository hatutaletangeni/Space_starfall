/* STARFALL 8H — physical carrier custody contracts, first conservative slice.
 * This module NEVER moves a ship, truck, world object or planet. It requires
 * observed source/carrier/destination locations, and the real 8A material
 * reserve/commit API. Loading/unloading uses an actual carrier-owned 8A
 * container: there is no direct world-to-world stock teleport.
 * The runtime controls how actors physically travel and pays their energy.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-7,MAX_ORDERS=500,MAX_RANGE=24;
function arc(a,b,r){const dot=a.reduce((s,x,i)=>s+x*b[i],0);
 return Math.acos(Math.max(-1,Math.min(1,dot)))*r;}
function validLocal(x){return Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;}
function site(x){if(!x||!ident(x.id)||!ident(x.bodyId)||!validLocal(x.local)||
 !ident(x.containerId))throw Error('8H requires a real source/destination local site and stock container');
 return x;}
function carrier(x){if(!x||!ident(x.id)||!ident(x.bodyId)||!validLocal(x.local)||
 !ident(x.containerId)||!['truck','ship','rover','cargo'].includes(x.kind)||
 x.operational!==true||x.condition<.2)
 throw Error('8H needs an operational physical carrier with actual local position');
 return x;}
function nearby(actor,point,radius){if(actor.bodyId!==point.bodyId||
 !finite(radius)||radius<=0||arc(actor.local,point.local,radius)>MAX_RANGE)
 throw Error('8H loading dock or carrier is not physically nearby on the same world');}
function stockApi(){if(!root.StarfallMaterials8A?.create)
 throw Error('8H authoritative 8A material ledger missing');
 return root.StarfallMaterials8A;}
function inventory(ledger,containerId){const c=ledger.containers().find(v=>v.id===containerId);
 if(!c)throw Error('8H physical material container missing');
 return c;}
function checkReceipt(receipt,operationId,carrierId,minJ){
 if(!receipt||receipt.operationId!==operationId||receipt.status!=='COMMITTED'||
 !ident(receipt.sourceId)||receipt.carrierId!==carrierId||
 !finite(receipt.usedJ)||receipt.usedJ+EPS<minJ)
  throw Error('8H physical carrier handling energy has not been paid/verified');
}
function create(saved){
 if(saved!=null&&(!saved||saved.schema!==1||!Array.isArray(saved.orders)))
  throw Error('8H logistics save schema unsupported');
 const orders=new Map();
 for(const raw of saved?.orders||[]){
  if(!ident(raw.id)||orders.has(raw.id)||!['RESERVED','LOADED','DELIVERED','CANCELLED'].includes(raw.status)||
     !ident(raw.sourceContainerId)||!ident(raw.destinationContainerId)||
     !ident(raw.carrierContainerId)||!ident(raw.carrierId)||!ident(raw.lotId)||
     !ident(raw.bodyId)||!finite(raw.massKg)||raw.massKg<=0||!finite(raw.createdS)||
     !ident(raw.loadOperationId)||!ident(raw.unloadOperationId))
    throw Error('Invalid/duplicate 8H logistics order');
  orders.set(raw.id,clone(raw));
 }
 function snapshot(){return{schema:1,orders:[...orders.values()].map(clone)};}
 function list(){return[...orders.values()].map(clone);}
 function get(id){return orders.has(id)?clone(orders.get(id)):null;}
 function reserve({id,source,destination,actor,lotId,massKg,materials,timeS,bodyRadius}){
  if(!ident(id)||!ident(lotId)||!finite(massKg)||massKg<=0||
   !finite(timeS)||!finite(bodyRadius)||bodyRadius<=0)
   throw Error('8H invalid order identity, mass or simulation time');
  if(orders.has(id))throw Error('8H order ID already exists: cannot duplicate shipment');
  if(orders.size>=MAX_ORDERS)throw Error('8H order archive limit reached');
  site(source);site(destination);carrier(actor);
  if(source.bodyId!==destination.bodyId||source.bodyId!==actor.bodyId)
   throw Error('8H this physical ground order cannot teleport stock to another world');
  if(source.containerId===destination.containerId||actor.containerId===source.containerId||
   actor.containerId===destination.containerId)
   throw Error('8H distinct source, carrier and destination containers required');
  nearby(actor,source,bodyRadius);
  const ledger=stockApi().create(materials);
  const sourceStock=inventory(ledger,source.containerId),carrierStock=inventory(ledger,actor.containerId);
  const destinationStock=inventory(ledger,destination.containerId);
  if(sourceStock.ownerId!==source.id||destinationStock.ownerId!==destination.id||
     carrierStock.ownerId!==actor.id)
   throw Error('8H material container ownership does not match physical endpoints');
  const lot=ledger.inventory(source.containerId).find(x=>x.id===lotId);
  if(!lot||lot.massKg+EPS<massKg)throw Error('8H source lot unavailable');
  const loadOperationId='8h-load:'+id,unloadOperationId='8h-unload:'+id;
  // This is a genuine 8A reservation; it locks both source quantity and
  // bounded carrier destination capacity until explicitly loaded/cancelled.
  ledger.reserve(loadOperationId,lotId,actor.containerId,massKg);
  const o={schema:1,id,status:'RESERVED',bodyId:source.bodyId,
   sourceId:source.id,destinationId:destination.id,carrierId:actor.id,
   sourceContainerId:source.containerId,destinationContainerId:destination.containerId,
   carrierContainerId:actor.containerId,lotId,massKg,createdS:timeS,
   loadOperationId,unloadOperationId,loadJ:1200,unloadJ:1200,
   loadedAtS:null,deliveredAtS:null,carrierLotId:null};
  orders.set(id,o);
  return{order:clone(o),materials:ledger.snapshot()};
 }
 function load({id,actor,source,bodyRadius,materials,energyReceipt,timeS}){
  const o=orders.get(id);if(!o)throw Error('8H order missing');
  if(o.status==='LOADED'||o.status==='DELIVERED')
   throw Error('8H duplicate load blocked: cargo already moved');
  if(o.status!=='RESERVED')throw Error('8H shipment cannot be loaded in this state');
  carrier(actor);site(source);
  if(actor.id!==o.carrierId||actor.containerId!==o.carrierContainerId||
     source.id!==o.sourceId||source.containerId!==o.sourceContainerId||
     actor.bodyId!==o.bodyId||source.bodyId!==o.bodyId)
   throw Error('8H source or carrier custody changed');
  nearby(actor,source,bodyRadius);
  if(!finite(timeS)||timeS<o.createdS)throw Error('8H reverse loading clock');
  checkReceipt(energyReceipt,o.loadOperationId,o.carrierId,o.loadJ);
  const ledger=stockApi().create(materials),op=ledger.operations().find(x=>x.id===o.loadOperationId);
  if(!op||op.status!=='RESERVED'||op.lotId!==o.lotId||
     op.destinationId!==o.carrierContainerId||Math.abs(op.massKg-o.massKg)>EPS)
   throw Error('8H missing or altered real 8A loading reservation');
  const receipt=ledger.commit(o.loadOperationId);
  const next={...o,status:'LOADED',loadedAtS:timeS,carrierLotId:receipt.outputLotId};
  orders.set(id,next);
  return{order:clone(next),materials:ledger.snapshot(),receipt:clone(receipt)};
 }
 function deliver({id,actor,destination,bodyRadius,materials,energyReceipt,timeS}){
  const o=orders.get(id);if(!o)throw Error('8H order missing');
  if(o.status==='DELIVERED')throw Error('8H duplicate delivery blocked');
  if(o.status!=='LOADED')throw Error('8H shipment was not physically loaded');
  carrier(actor);site(destination);
  if(actor.id!==o.carrierId||actor.containerId!==o.carrierContainerId||
     destination.id!==o.destinationId||destination.containerId!==o.destinationContainerId||
     actor.bodyId!==o.bodyId||destination.bodyId!==o.bodyId)
   throw Error('8H wrong carrier/world/delivery container');
  nearby(actor,destination,bodyRadius);
  if(!finite(timeS)||timeS<o.loadedAtS)throw Error('8H reverse delivery clock');
  checkReceipt(energyReceipt,o.unloadOperationId,o.carrierId,o.unloadJ);
  const ledger=stockApi().create(materials);
  const lot=ledger.inventory(o.carrierContainerId).find(x=>x.id===o.carrierLotId);
  if(!lot||Math.abs(lot.massKg-o.massKg)>EPS)
   throw Error('8H original carrier lot was lost, consumed or altered');
  inventory(ledger,o.destinationContainerId);
  ledger.reserve(o.unloadOperationId,o.carrierLotId,o.destinationContainerId,o.massKg);
  const receipt=ledger.commit(o.unloadOperationId);
  const next={...o,status:'DELIVERED',deliveredAtS:timeS,outputLotId:receipt.outputLotId};
  orders.set(id,next);
  return{order:clone(next),materials:ledger.snapshot(),receipt:clone(receipt)};
 }
 function cancel({id,materials}){
  const o=orders.get(id);if(!o||o.status!=='RESERVED')
   throw Error('8H only an unloaded reservation can be cancelled; loaded cargo must return physically');
  const ledger=stockApi().create(materials),op=ledger.operations().find(x=>x.id===o.loadOperationId);
  if(!op||op.status!=='RESERVED')throw Error('8H missing original stock reservation');
  ledger.cancel(o.loadOperationId);orders.set(id,{...o,status:'CANCELLED'});
  return{order:get(id),materials:ledger.snapshot()};
 }
 return Object.freeze({snapshot,list,get,reserve,load,deliver,cancel});
}
const API=Object.freeze({create,MAX_RANGE});
root.StarfallLogisticsOrders8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
