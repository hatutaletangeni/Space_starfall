/* STARFALL 8H — custody checked local transfer with real carrier and metered energy. */
(function(root){'use strict';const copy=x=>JSON.parse(JSON.stringify(x));
function deliver({transferId,sourceLotId,destinationId,massKg,carrier,materials,energyReceipt}){
 if(!carrier||!carrier.id||!carrier.location||carrier.location.kind!=='surface'||carrier.bodyId!==carrier.destinationBodyId||!carrier.arrived||!carrier.capacityKg||massKg>carrier.capacityKg)throw Error('No arrived physical carrier with capacity');
 if(!energyReceipt||energyReceipt.operationId!==transferId||energyReceipt.usedJ<carrier.requiredJ||!energyReceipt.sourceId)throw Error('Transport energy not paid');
 const api=root.StarfallMaterials8A;if(!api)throw Error('8A stock ledger unavailable');
 const ledger=api.create(materials);ledger.reserve(transferId,sourceLotId,destinationId,massKg);const receipt=ledger.commit(transferId);
 return{materials:ledger.snapshot(),receipt:copy(receipt)};
}
root.StarfallLogistics8H=Object.freeze({deliver});if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallLogistics8H;
})(typeof globalThis!=='undefined'?globalThis:this);