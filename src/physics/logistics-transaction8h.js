/* STARFALL 8H — conservative logistics transaction composition.
 * A load/unload operation pays its source-owned battery proposal and moves the
 * same physical 8A material lot on CLONES. Caller commits all three returned
 * snapshots in one durable SF.save; partial results must never be published.
 * This is a pure model, NOT an invented battery or an automatic vehicle move.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-7;
function totalMass(a){
 if(!a||a.schema!==1||!Array.isArray(a.lots))throw Error('8H original 8A mass ledger missing');
 return a.lots.reduce((n,l)=>{if(!finite(l.massKg))throw Error('8H invalid source lot mass');return n+l.massKg;},0);
}
function transaction({action,orders,materials,energy,orderId,actor,site,bodyRadius,timeS,sourceId}){
 if(!['LOAD','DELIVER'].includes(action)||!id(orderId)||!finite(timeS)||
 !finite(bodyRadius)||bodyRadius<=0||!id(sourceId))
  throw Error('8H physical transaction request invalid');
 const O=root.StarfallLogisticsOrders8H,E=root.StarfallLogisticsEnergy8H,
  M=root.StarfallMaterials8A;
 if(!O?.create||!E?.debit||!M?.create)
  throw Error('8H physical custody, energy and 8A owners required');
 const o=O.create(clone(orders)),current=o.get(orderId);
 if(!current)throw Error('8H order absent');
 const expected=action==='LOAD'?'RESERVED':'LOADED';
 if(current.status!==expected)throw Error('8H duplicate or out-of-order cargo transaction blocked');
 const operationId=action==='LOAD'?current.loadOperationId:current.unloadOperationId;
 const usedJ=action==='LOAD'?current.loadJ:current.unloadJ;
 if(!finite(usedJ)||usedJ<=0)throw Error('8H paid handling work missing');
 if(!actor||actor.id!==current.carrierId)throw Error('8H source-owned carrier identity mismatch');
 // Reject corrupt stock before considering any debit. Physical position/owner
 // is rechecked by the order model below; no caller-supplied prepaid receipt.
 const baseline=totalMass(materials);
 M.create(clone(materials));
 const payment=E.debit({state:clone(energy),operationId,
  carrierId:current.carrierId,sourceId,usedJ});
 const params={id:orderId,actor,bodyRadius,timeS,materials:clone(materials),
  energyReceipt:payment.receipt};
 const moved=action==='LOAD'?o.load({...params,source:site}):
  o.deliver({...params,destination:site});
 const afterMass=totalMass(moved.materials);
 if(Math.abs(baseline-afterMass)>EPS)
  throw Error('8H physical cargo mass conservation violated');
 const post=O.create(o.snapshot()).get(orderId);
 if(post.status!==(action==='LOAD'?'LOADED':'DELIVERED')||
  moved.receipt.status!=='COMMITTED'||payment.receipt.status!=='COMMITTED'||
  payment.receipt.operationId!==operationId||
  moved.receipt.id!==operationId)
  throw Error('8H source-owned paired receipt mismatch');
 M.create(moved.materials);
 if(Math.abs(payment.receipt.beforeJ-payment.receipt.afterJ-usedJ)>EPS)
  throw Error('8H vehicle power debit not conserved');
 return Object.freeze({
  orders:o.snapshot(),materials:moved.materials,energy:payment.state,
  receipt:clone(moved.receipt),energyReceipt:clone(payment.receipt),
  action,orderId,chargedJ:usedJ,transferredKg:current.massKg
 });
}
const API=Object.freeze({transaction});
root.StarfallLogisticsTransaction8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
