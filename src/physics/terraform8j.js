/* STARFALL 8J — conservative incremental atmosphere budget (global mean approximation). */
(function(root){'use strict';const copy=x=>JSON.parse(JSON.stringify(x));
function advance(saved,{deliveredGasKg=0,capturedGasKg=0,lostGasKg=0,seconds=0,receiptId}){
 const s=copy(saved);if(!s||s.schema!==1||!Number.isFinite(s.radiusM)||s.radiusM<=0||!Number.isFinite(s.gravityMS2)||s.gravityMS2<=0||!Number.isFinite(s.atmosphereKg)||s.atmosphereKg<0||!Array.isArray(s.receipts))throw Error('Invalid world reservoir');
 if(![deliveredGasKg,capturedGasKg,lostGasKg,seconds].every(x=>Number.isFinite(x)&&x>=0)||!receiptId)throw Error('Invalid terraforming intervention');
 if(s.receipts.some(x=>x.id===receiptId))return{duplicate:true,state:s};
 if(capturedGasKg+lostGasKg>s.atmosphereKg+deliveredGasKg+1e-7)throw Error('Cannot withdraw more atmosphere than exists');
 s.atmosphereKg+=deliveredGasKg-capturedGasKg-lostGasKg;
 s.pressurePa=s.atmosphereKg*s.gravityMS2/(4*Math.PI*s.radiusM*s.radiusM);
 s.receipts.push({id:receiptId,deliveredGasKg,capturedGasKg,lostGasKg,seconds});
 return{duplicate:false,state:s};
}
root.StarfallTerraform8J=Object.freeze({advance});if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTerraform8J;
})(typeof globalThis!=='undefined'?globalThis:this);