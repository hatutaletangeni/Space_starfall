/* STARFALL 8G — factory commissioning: exact one BOM -> one physical asset. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const DEFINITIONS=Object.freeze({
 science_rover:{kind:'rover',massKg:260,volumeM3:1.5,parts:{electric_motor:8.5,control_board:0.6,battery_cell:9.75,beam:28,gear:6.8,bearing:5.1,chassis_rail:47.6,axle_shaft:39.6,leaf_spring:28.2,low_speed_rover_wheel:60.12,brake_rotor:22.2,brake_caliper:18,steering_knuckle:11.1,steering_rack:11.7,motor_controller:1.42},facility:'vehicle_assembly'},
 truck:{kind:'truck',massKg:900,volumeM3:5,parts:{electric_motor:34,control_board:1.2,battery_cell:39,beam:350,gear:13.6,bearing:13.6,chassis_rail:47.6,axle_shaft:26.4,leaf_spring:18.8,low_speed_rover_wheel:40.08,brake_rotor:14.8,brake_caliper:12,steering_knuckle:11.1,steering_rack:11.7,motor_controller:1.42},facility:'vehicle_assembly'},
 satellite_bus:{kind:'satellite',massKg:48,volumeM3:0.6,parts:{control_board:0.6,battery_cell:5.85,solar_module:8.8,beam:19.2},facility:'precision_assembly'},
 habitat_shell:{kind:'habitat',massKg:1100,volumeM3:25,parts:{beam:960,control_board:1.2,solar_module:17.6},facility:'habitat_pad'},
 rocket_stage:{kind:'rocket_stage',massKg:220,volumeM3:3,parts:{beam:96,control_board:0.6,gear:3.4,bearing:1.7},facility:'rocket_integration'}
});
function create(saved){const state=saved?copy(saved):{schema:1,receipts:[]};if(state.schema!==1||!Array.isArray(state.receipts))throw Error('Invalid assembly history');
function commission({jobId,blueprintId,facility,materials,partsContainerId,assetState,location,energyReceipt}){
 const old=state.receipts.find(x=>x.id===jobId);if(old)return{duplicate:true,receipt:copy(old),materials:copy(materials),assets:copy(assetState),assembly:copy(state)};
 const def=DEFINITIONS[blueprintId];if(!def)throw Error('Unknown blueprint');
 if(!facility||facility.kind!==def.facility||!facility.enabled||facility.condition<.5||facility.bodyId!==location.bodyId)throw Error('Assembly facility not physically available');
 if(!energyReceipt||energyReceipt.operationId!==jobId||!finite(energyReceipt.usedJ)||energyReceipt.usedJ<200000||!energyReceipt.sourceId)throw Error('Missing assembly energy');
 if(!assetState||assetState.schema!==1||!Array.isArray(assetState.assets))throw Error('Missing 8A asset registry');
 if(assetState.assets.some(a=>a.id===jobId))throw Error('Asset ID already exists');
 if(!location||location.kind!=='surface'||!Array.isArray(location.local)||location.local.length!==3||location.local.some(x=>!Number.isFinite(x)))throw Error('Invalid assembly pad coordinates');
 const inventory=copy(materials),assets=copy(assetState);for(const [materialId,kg] of Object.entries(def.parts)){
  let left=kg;for(const lot of inventory.lots){if(lot.containerId!==partsContainerId||lot.materialId!==materialId)continue;const used=Math.min(left,lot.massKg);if(used>0){const previous=lot.massKg;lot.massKg-=used;lot.volumeM3*=lot.massKg/previous;left-=used;}if(left<1e-7)break;}
  if(left>1e-7)throw Error('Missing manufactured part: '+materialId);
 }
 inventory.lots=inventory.lots.filter(l=>l.massKg>1e-7);
 const actualPartMass=Object.entries(def.parts).reduce((a,[,n])=>a+n,0);
 // The remaining mass is not materialized. A finished asset mass must equal consumed part mass.
 const newAsset={id:jobId,type:def.kind,massKg:actualPartMass,volumeM3:def.volumeM3,condition:1,provenance:'assembly:'+jobId,
  location:copy(location),components:[{blueprintId}],state:{installed:true,commissioned:true}};
 assets.assets.push(newAsset);
 const receipt={id:jobId,blueprintId,assetId:jobId,status:'COMMITTED',massKg:actualPartMass,energyJ:200000};
 const assembly=copy(state);assembly.receipts.push(receipt);
 return{duplicate:false,receipt,materials:inventory,assets,assembly};
}
return Object.freeze({commission,snapshot:()=>copy(state)});
}
root.StarfallAssembly8G=Object.freeze({DEFINITIONS,create});if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallAssembly8G;
})(typeof globalThis!=='undefined'?globalThis:this);