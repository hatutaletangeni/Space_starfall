/* STARFALL 8J — conservative incremental atmosphere budget (global mean approximation). */
(function(root){'use strict';const copy=x=>JSON.parse(JSON.stringify(x));
function advance(saved,{deliveredGasKg=0,capturedGasKg=0,lostGasKg=0,seconds=0,receiptId}){
 const s=copy(saved);if(!s||s.schema!==1||!Number.isFinite(s.radiusM)||s.radiusM<=0||!Number.isFinite(s.gravityMS2)||s.gravityMS2<=0||!Number.isFinite(s.atmosphereKg)||s.atmosphereKg<0||!Array.isArray(s.receipts))throw Error('Invalid world reservoir');
 if(![deliveredGasKg,capturedGasKg,lostGasKg,seconds].every(x=>Number.isFinite(x)&&x>=0)||
   typeof receiptId!=='string'||!receiptId.trim()||receiptId.length>160)
  throw Error('Invalid terraforming intervention');
 const previous=s.receipts.find(x=>x.id===receiptId);
 if(previous){
  if(previous.deliveredGasKg!==deliveredGasKg||previous.capturedGasKg!==capturedGasKg||
     previous.lostGasKg!==lostGasKg||previous.seconds!==seconds)
   throw Error('Conflicting terraforming receipt ID');
  return{duplicate:true,state:s};
 }
 // Compute and validate all derived state before writing an irreversible receipt.
 const availableKg=s.atmosphereKg+deliveredGasKg;
 const withdrawnKg=capturedGasKg+lostGasKg;
 if(!Number.isFinite(availableKg)||!Number.isFinite(withdrawnKg)||
    withdrawnKg>availableKg+1e-7)
  throw Error('Invalid or insufficient atmospheric mass');
 const nextMassKg=availableKg-withdrawnKg;
 const areaM2=4*Math.PI*s.radiusM*s.radiusM;
 const nextPressurePa=nextMassKg*s.gravityMS2/areaM2;
 if(!Number.isFinite(nextMassKg)||nextMassKg<0||
    !Number.isFinite(areaM2)||areaM2<=0||
    !Number.isFinite(nextPressurePa)||nextPressurePa<0)
  throw Error('Non-finite atmosphere state');
 s.atmosphereKg=nextMassKg;
 s.pressurePa=nextPressurePa;
 s.receipts.push({id:receiptId,deliveredGasKg,capturedGasKg,lostGasKg,seconds});
 return{duplicate:false,state:s};
}
/* Canonical seeded physics makes this a transparent planning estimate, never
 * a resource grant or world transformation. No stock is debited by this call. */
function feasibility(profile,{targetPressurePa=101325,externalImportKgS=1,
 nativeLife=false,archaeologicalProtection=false,landable=true}={}){
 if(!profile||!(Number.isFinite(profile.radiusM)&&profile.radiusM>0)||
 !(Number.isFinite(profile.surfaceGravityMS2)&&profile.surfaceGravityMS2>0)||
 !(Number.isFinite(profile.atmospherePressurePa)&&profile.atmospherePressurePa>=0)||
 !(Number.isFinite(profile.mu)&&profile.mu>0)||
 !(Number.isFinite(targetPressurePa)&&targetPressurePa>=0&&targetPressurePa<=1e7)||
 !(Number.isFinite(externalImportKgS)&&externalImportKgS>=0))
  throw Error('8J needs original canonical SI world profile and valid planning rate');
 const massPerPa=4*Math.PI*profile.radiusM**2/profile.surfaceGravityMS2,
  deltaPa=targetPressurePa-profile.atmospherePressurePa,
  massDeltaKg=deltaPa*massPerPa,requiredImportKg=Math.max(0,massDeltaKg),
  captureKg=Math.max(0,-massDeltaKg),
  escapeSpeedMS=Math.sqrt(2*profile.mu/profile.radiusM),
  yearsAtRate=requiredImportKg===0?0:
   externalImportKgS===0?null:requiredImportKg/(externalImportKgS*365.25*86400);
 const protectedWorld=!!nativeLife||!!archaeologicalProtection;
 return Object.freeze({
  schema:1,bodyId:profile.id,model:'uniform spherical atmosphere; fixed g, fixed R; seeded unobserved baseline',
  radiusM:profile.radiusM,gravityMS2:profile.surfaceGravityMS2,
  baselinePressurePa:profile.atmospherePressurePa,targetPressurePa,
  massPerPa,deltaPa,requiredImportKg,captureKg,escapeSpeedMS,
  hypotheticalRateKgS:externalImportKgS,yearsAtRate,
  noPhysicalOperation:true,protectedWorld,landable:!!landable,
  globalActionPermitted:false,
  warnings:[
   'Planning only: no 8A gas lots, ship delivery, power or climate reservoir debited.',
   'Real retention requires atmospheric composition, stellar UV/wind, exobase and temperature measurements.',
   'A planetary pressure change needs physical imported/captured gas and time; warming never generates oxygen.',
   ...(escapeSpeedMS<3000?['Low modeled escape speed raises volatile-retention concerns.']:[]),
   ...(!landable?['This world is not a physical settlement surface; consider sealed/orbital habitats.']:[]),
   ...(protectedWorld?['Native life or archaeological protection: harmful global intervention must remain locked.']:[])
  ]});
}
root.StarfallTerraform8J=Object.freeze({advance,feasibility});if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallTerraform8J;
})(typeof globalThis!=='undefined'?globalThis:this);