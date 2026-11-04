/* STARFALL 8G — gameplay commissioning of an already manufactured frame.
 * A simulated prototype certification, not a claim of real-world road safety.
 * Requires certified finished 8F parts in the immutable assembly receipt,
 * actual landed ship power and an energy debit for charging the fabricated pack.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const WORK_J=2500000,CHARGE_J=2000000,EPS=1e-7;
function activate({assetId,physical,assembly,powerReceipt,bodyId,facilityId}){
 if(!assetId||!physical||physical.schema!==1||!Array.isArray(physical.assets)||
  !assembly||assembly.schema!==1||!Array.isArray(assembly.receipts))
  throw Error('Real 8G physical custody and assembly ledger required');
 const current=physical.assets.find(x=>x.id===assetId);
 if(!current||current.type!=='vehicle_frame')throw Error('Only actual manufactured chassis may be commissioned');
 const prior=current.state?.activationReceipt;
 if(prior){if(prior.assetId!==assetId)return{duplicate:true,physical:clone(physical)};
  throw Error('Invalid repeated activation receipt');}
 if(current.state?.operational||current.state?.commissioned)throw Error('Vehicle already active');
 if(current.location?.kind!=='surface'||current.location.bodyId!==bodyId)throw Error('Vehicle must be on its own surface');
 if(!num(current.condition)||current.condition<.9)throw Error('Frame needs structural repair');
 const receipt=assembly.receipts.find(x=>x.id===assetId&&x.assetId===assetId);
 if(!receipt||receipt.status!=='ASSEMBLED_NOT_OPERATIONAL'||receipt.bodyId!==bodyId||
  receipt.facilityId!==facilityId||!Array.isArray(receipt.consumedLots))
  throw Error('Original paid manufacturing receipt or assembly pad missing');
 const def=root.StarfallAssembly8G?.DEFINITIONS?.[receipt.blueprintId];
 if(!def||!['truck','science_rover'].includes(receipt.blueprintId))throw Error('Unsupported manufactured vehicle');
 const byMaterial=new Map();
 for(const item of receipt.consumedLots){
  if(!item||typeof item.materialId!=='string'||!num(item.massKg))throw Error('Untrusted manufacturing material receipt');
  byMaterial.set(item.materialId,(byMaterial.get(item.materialId)||0)+item.massKg);
 }
 for(const [materialId,kg] of Object.entries(def.parts))
  if(Math.abs((byMaterial.get(materialId)||0)-kg)>EPS)
   throw Error('Missing paid mechanical part: '+materialId);
 if(Math.abs(current.massKg-receipt.massKg)>EPS)throw Error('Physical chassis mass differs from paid receipt');
 if(!powerReceipt||powerReceipt.operationId!=='activate:'+assetId||powerReceipt.status!=='COMMITTED'||
   powerReceipt.sourceId!=='ship-main:engineering-battery'||!num(powerReceipt.usedJ)||
   powerReceipt.usedJ<WORK_J)throw Error('2500 kJ ship energy debit required for calibration and pack charge');
 const wheelCount=receipt.blueprintId==='truck'?4:6;
 const hardware={certified:true,brakesCertified:true,steeringCertified:true,wheelsCertified:true,drivetrainCertified:true,
  massKg:current.massKg,wheelCount,wheelRadiusM:.45,motorTorqueNm:40*(def.parts.electric_motor/8.5),
  maxMotorPowerW:2500*(def.parts.electric_motor/8.5),maxBrakeForceN:current.massKg*6,
  drivetrainEfficiency:.78,rollingResistanceCoefficient:.035,batteryCapacityJ:CHARGE_J,batteryEnergyJ:CHARGE_J};
 root.StarfallVehicleDrive8G.validateHardware(hardware);
 const next=clone(physical),a=next.assets.find(x=>x.id===assetId);
 a.state={...a.state,commissioned:true,operational:true,rideable:true,
  assemblyStatus:'LOW_SPEED_GAMEPLAY_PROTOTYPE',hardware,
  drive:{schema:1,distanceM:0,speedMS:0,batteryEnergyJ:CHARGE_J},
  activationReceipt:{assetId,receiptId:receipt.id,sourceId:powerReceipt.sourceId,energyJ:powerReceipt.usedJ,
   calibrationJ:powerReceipt.usedJ-CHARGE_J,chargeJ:CHARGE_J},forward:[0,0,1]};
 a.components=[...a.components,{system:'8G_gameplay_low_speed_controls',receiptId:receipt.id,
  note:'Sandbox engineering prototype; physical roadworthiness is not certified'}];
 return {duplicate:false,physical:next,asset:clone(a),energyJ:powerReceipt.usedJ};
}
root.StarfallVehicleActivation8G=Object.freeze({activate,WORK_J,CHARGE_J});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallVehicleActivation8G;
})(typeof globalThis!=='undefined'?globalThis:this);
