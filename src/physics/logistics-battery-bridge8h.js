/* STARFALL 8H — source-owned existing vehicle batteries, never a free
 * parallel energy store. Converts real 8E/T12 vehicle snapshots into the 8H
 * transaction proposal and returns new originals on one all-or-nothing clone.
 * The caller must persist source vehicle + materials + orders + replay receipts
 * together; do not mutate runtime objects before durable commit.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const SOURCE=Object.freeze({
 'starfall-ship':{id:'ship-main',kind:'ship'},
 'starfall-rover':{id:'rover-science-001',kind:'rover'},
 'starfall-truck':{id:'truck-expedition-001',kind:'truck'}
});
const EPS=1e-7;
function parse(authority,sourceId,carrierId){
 if(!authority||!SOURCE[sourceId]||SOURCE[sourceId].id!==carrierId)
  throw Error('8H carrier is not the actual source-owned expedition vehicle');
 if(sourceId==='starfall-truck'){
  const t=authority.truck;
  if(!t||t.assetId!==carrierId||!valid(t.energyJ)||!valid(t.capacityJ)||
    t.capacityJ<=0||t.energyJ>t.capacityJ||t.location?.kind!=='surface')
    throw Error('8H original physical truck battery or surface custody missing');
  return{energyJ:t.energyJ,capacityJ:t.capacityJ};
 }
 const kind=SOURCE[sourceId].kind,v=authority.engineeringVehicles;
 const state=v?.states?.[kind],definition=v?.definitions?.[kind];
 if(!v||!Number.isInteger(v.schema)||!definition||!state||
    !valid(state.energyJ)||!valid(state.health)||state.health<=0||
    state.energyJ>1e12||!definition.slots?.battery)
  throw Error('8H original installed ship/rover electrical state missing');
 // The actual component is in the original authoritative vehicle catalog.
 if(!root.StarfallVehicles?.evaluate||!root.StarfallVehicles?.components)
  throw Error('8H engineering battery evaluator missing');
 const part=root.StarfallVehicles.components[definition.slots.battery];
 if(!part||part.type!=='battery'||!valid(part.capacityJ)||part.capacityJ<=0||
   state.energyJ>part.capacityJ+EPS)
  throw Error('8H original battery slot is not physical/within rated capacity');
 return{energyJ:state.energyJ,capacityJ:part.capacityJ};
}
function execute({authority,receipts,sourceId,orderId,action,orders,materials,actor,site,bodyRadius,timeS}){
 if(!Array.isArray(receipts)||receipts.length>500||
    receipts.some(r=>!ident(r.operationId)||r.status!=='COMMITTED'))
  throw Error('8H replay history invalid; never reset committed source energy');
 if(!actor||!ident(actor.id)||!ident(sourceId))
  throw Error('8H source carrier required');
 const start=parse(authority,sourceId,actor.id);
 if(receipts.some(r=>r.sourceId===sourceId&&r.carrierId!==actor.id))
  throw Error('8H existing receipt carrier identity mismatch');
 const T=root.StarfallLogisticsTransaction8H;
 if(!T?.transaction)throw Error('8H real 8A transaction not loaded');
 const energy={schema:1,stores:{[sourceId]:{carrierId:actor.id,
   energyJ:start.energyJ,capacityJ:start.capacityJ}},receipts:cp(receipts)};
 const q=T.transaction({action,orders,materials,energy,orderId,actor,site,bodyRadius,timeS,sourceId});
 if(q.energyReceipt.beforeJ!==start.energyJ||
   !valid(q.energyReceipt.afterJ)||q.energyReceipt.afterJ>start.energyJ||
   q.energyReceipt.sourceId!==sourceId||q.energyReceipt.carrierId!==actor.id)
  throw Error('8H source battery proposal cannot be reconciled with real vehicle');
 const updated=cp(authority);
 if(sourceId==='starfall-truck')updated.truck.energyJ=q.energyReceipt.afterJ;
 else updated.engineeringVehicles.states[SOURCE[sourceId].kind].energyJ=q.energyReceipt.afterJ;
 const check=parse(updated,sourceId,actor.id);
 if(Math.abs(check.energyJ-q.energyReceipt.afterJ)>EPS)
  throw Error('8H authoritative energy reconciliation failed');
 return Object.freeze({authority:updated,orders:q.orders,materials:q.materials,
  receipts:q.energy.receipts,energyReceipt:q.energyReceipt,
  materialReceipt:q.receipt,chargedJ:q.chargedJ,transferredKg:q.transferredKg});
}
const API=Object.freeze({execute,parse,SOURCE});
root.StarfallLogisticsBatteryBridge8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
