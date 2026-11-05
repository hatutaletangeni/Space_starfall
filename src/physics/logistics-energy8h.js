/* STARFALL 8H — immutable T02 vehicle handling debit proposal.
 * No cargo moves here. Runtime must commit this returned energy state together
 * with the 8A material snapshot and order snapshot in one save transaction.
 * A receipt alone is never proof that a source-owned battery was debited.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
function debit({state,operationId,carrierId,sourceId,usedJ}){
 if(!ident(operationId)||!ident(carrierId)||!['starfall-truck','starfall-ship','starfall-rover'].includes(sourceId)||
    !valid(usedJ)||usedJ<=0)throw Error('8H invalid vehicle handling debit');
 if(!state||state.schema!==1||!Array.isArray(state.receipts)||!state.stores||typeof state.stores!=='object')
  throw Error('8H energy snapshot missing or unsupported');
 if(state.receipts.some(r=>r.operationId===operationId))
  throw Error('8H duplicate energy operation blocked');
 const store=state.stores[sourceId];
 if(!store||store.carrierId!==carrierId||!valid(store.energyJ)||!valid(store.capacityJ)||
    store.energyJ>store.capacityJ||store.energyJ<usedJ)
  throw Error('8H authoritative vehicle battery missing, mismatched or insufficient');
 const next=copy(state);
 next.stores[sourceId].energyJ=store.energyJ-usedJ;
 const receipt={operationId,carrierId,sourceId,usedJ,status:'COMMITTED',
  beforeJ:store.energyJ,afterJ:next.stores[sourceId].energyJ};
 next.receipts.push(receipt);
 return{state:next,receipt:copy(receipt)};
}
const API=Object.freeze({debit});
root.StarfallLogisticsEnergy8H=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
