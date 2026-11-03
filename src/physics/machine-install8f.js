/* 8F -- mass-accounted installation of a REAL physical machine-kit lot into
 * the authoritative physical 8A ship workshop. No kits are spawned or imported.
 * Callers MUST atomically persist returned material and custody snapshots with
 * the authoritative battery-energy debit. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const CAPS=Object.freeze({
 machine_kit_cnc:{station:'machine',tools:['cnc','lathe'],massKg:220,volumeM3:.42,workJ:360000,seconds:300},
 machine_kit_grinder:{station:'machine',tools:['grinder'],massKg:85,volumeM3:.18,workJ:120000,seconds:140},
 machine_kit_caster:{station:'foundry',tools:['caster'],massKg:260,volumeM3:.68,workJ:420000,seconds:380},
 machine_kit_extruder:{station:'polymer',tools:['extruder'],massKg:160,volumeM3:.30,workJ:250000,seconds:230},
 machine_kit_winder:{station:'winding',tools:['coil-winder'],massKg:80,volumeM3:.14,workJ:95000,seconds:120},
 machine_kit_motor_fixture:{station:'motor',tools:['motor-fixture'],massKg:130,volumeM3:.25,workJ:170000,seconds:160},
 machine_kit_etcher:{station:'electronics',tools:['etching'],massKg:230,volumeM3:.47,workJ:380000,seconds:350},
 machine_kit_solder_station:{station:'pcb',tools:['solder-station'],massKg:65,volumeM3:.12,workJ:80000,seconds:105},
 machine_kit_battery:{station:'battery',tools:['cell-assembly'],massKg:260,volumeM3:.44,workJ:380000,seconds:300},
 machine_kit_laminator:{station:'solar',tools:['module-laminator'],massKg:210,volumeM3:.39,workJ:350000,seconds:290},
 machine_kit_cleanroom:{station:'cleanroom',tools:['photolithography','ultrapure-process'],massKg:940,volumeM3:1.9,workJ:2400000,seconds:1900},
 machine_kit_printer:{station:'printer',tools:['polymer-printer'],massKg:160,volumeM3:.38,workJ:210000,seconds:220}
});
const good=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function quote({lotId,materials,physical,containerId}){
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.operations)||!Array.isArray(materials.containers)||
  !physical||physical.schema!==1||!Array.isArray(physical.assets))throw Error('8A physical inventory snapshots required');
 const lot=materials.lots.find(x=>x.id===lotId&&x.containerId===containerId);
 if(!lot)throw Error('Physical machine kit lot must be onboard');
 const spec=CAPS[lot.materialId];if(!spec)throw Error('Lot is not a recognized manufactured machine kit');
 if(!good(lot.massKg)||Math.abs(lot.massKg-spec.massKg)>EPS||!good(lot.volumeM3)||lot.volumeM3+EPS<spec.volumeM3)
  throw Error('Incomplete or unsealed machine kit (mass/volume)');
 if(!good(lot.grade)||lot.grade<.98)throw Error('Machine kit certification missing');
 const held=materials.operations.filter(x=>x.status==='RESERVED'&&x.lotId===lot.id).reduce((a,o)=>a+o.massKg,0);
 if(held>EPS)throw Error('Machine kit reserved for a different operation');
 const a=physical.assets.filter(x=>x.type==='industrial_machine'&&x.location?.kind==='ship'&&x.location.slot==='workshop');
 return{lotId,materialId:lot.materialId,serial:a.length+1,station:spec.station,tools:[...spec.tools],
  massKg:spec.massKg,volumeM3:lot.volumeM3,workJ:spec.workJ,seconds:spec.seconds};
}
function install({lotId,materials,physical,containerId,assetId,operationId,energyReceipt,shipLanded,
 operatorNear,workshopInstalled,shipPowerEnabled,bodyId}){
 if(!shipLanded||!operatorNear||!workshopInstalled||!shipPowerEnabled||!bodyId)
  throw Error('Board the powered landed ship fabrication workshop to install equipment');
 if(typeof assetId!=='string'||!assetId.startsWith('machine8f:')||
  typeof operationId!=='string'||!operationId.startsWith('install8f:'))throw Error('Invalid equipment or operation ID');
 const previous=physical.transfers?.find(x=>x.id===operationId&&x.action==='INSTALL');
 if(previous){if(previous.assetId!==assetId||previous.sourceLotId!==lotId)throw Error('Installation ID reused');return{duplicate:true,physical:copy(physical),materials:copy(materials),receipt:copy(previous)}}
 const q=quote({lotId,materials,physical,containerId});
 if(!energyReceipt||energyReceipt.operationId!==operationId||
  !energyReceipt.sourceId||!good(energyReceipt.usedJ)||energyReceipt.usedJ+EPS<q.workJ)
  throw Error('Physical installation work energy not paid');
 if(physical.assets.some(a=>a.id===assetId))throw Error('Physical machine already owned');
 const m=copy(materials),p=copy(physical);
 m.lots=m.lots.filter(l=>l.id!==lotId);
 const machine={id:assetId,type:'industrial_machine',location:{kind:'ship',slot:'workshop'},
  massKg:q.massKg,volumeM3:q.volumeM3,condition:1,provenance:'installed-kit:'+lotId,
  state:{station:q.station,tools:q.tools,commissionedOnBodyId:bodyId,
   sourceKitLotId:lotId,installationJ:q.workJ}};
 const receipt={id:operationId,assetId,status:'COMMITTED',sourceLotId:lotId,massKg:q.massKg,
  workJ:q.workJ,bodyId};
 const model=root.StarfallPhysical8A?.create(p);if(!model?.install)throw Error('8A physical installation API missing');
 model.install(machine,receipt);
 const ledger=root.StarfallMaterials8A?.create(m);if(!ledger)throw Error('8A inventory transaction unavailable');
 const after=model.serialize();const beforeKg=materials.lots.reduce((s,l)=>s+l.massKg,0)+physical.assets.reduce((s,a)=>s+a.massKg,0);
 const afterKg=ledger.inventory().reduce((s,l)=>s+l.massKg,0)+after.assets.reduce((s,a)=>s+a.massKg,0);
 if(Math.abs(beforeKg-afterKg)>EPS)throw Error('Machine installation violated material conservation');
 return{duplicate:false,receipt,physical:after,materials:ledger.snapshot(),machine};
}
root.StarfallMachineInstall8F=Object.freeze({CAPS,quote,install});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallMachineInstall8F;
})(typeof globalThis!=='undefined'?globalThis:this);
