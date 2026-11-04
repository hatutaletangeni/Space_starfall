/* 8G: conservative material-to-chassis transaction. Never grants a drivable vehicle. */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0,id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const EPS=1e-7;
function create(saved){
 const state=saved?copy(saved):{schema:1,receipts:[]};
 if(state.schema!==1||!Array.isArray(state.receipts)||new Set(state.receipts.map(x=>x.id)).size!==state.receipts.length)throw Error('Invalid assembly history');
 function prepare(a){
  if(!id(a.jobId)||!['truck','science_rover'].includes(a.blueprintId)||!id(a.facilityId)||!id(a.containerId)||!id(a.bodyId))throw Error('Invalid vehicle assembly IDs');
  const def=root.StarfallAssembly8G?.DEFINITIONS?.[a.blueprintId];
  if(!def||def.facility!=='vehicle_assembly')throw Error('Missing 8G blueprint');
  if(a.materials?.schema!==1||!Array.isArray(a.materials.lots)||!Array.isArray(a.materials.containers)||!Array.isArray(a.materials.operations)||a.physical?.schema!==1||!Array.isArray(a.physical.assets))throw Error('Missing authoritative stock or assets');
  if(!Array.isArray(a.local)||a.local.length!==3||!a.local.every(Number.isFinite)||Math.abs(Math.hypot(...a.local)-1)>1e-4)throw Error('Invalid body-fixed pose');
  const pad=a.physical.assets.find(x=>x.id===a.facilityId);
  if(!pad||pad.type!=='industrial_plant'||pad.location?.kind!=='surface'||pad.location.bodyId!==a.bodyId||pad.state?.station!=='vehicle_assembly'||pad.state?.enabled===false||!finite(pad.condition)||pad.condition<.5)throw Error('Real active assembly pad required on target world');
  if(!a.materials.containers.some(x=>x.id===a.containerId&&id(x.ownerId)))throw Error('Physical source container missing');
  const e=a.powerReceipt;
  if(!e||e.operationId!==a.jobId||e.status!=='COMMITTED'||!id(e.sourceId)||!finite(e.usedJ)||e.usedJ<200000)throw Error('Committed source-owned electrical debit required');
  if(a.physical.assets.some(x=>x.id===a.jobId))throw Error('Duplicate physical identity');
  const reserved=new Map(),seen=new Set();
  for(const op of a.materials.operations)if(op.status==='RESERVED'){
   if(!id(op.lotId)||!finite(op.massKg))throw Error('Invalid reserved quantity');
   reserved.set(op.lotId,(reserved.get(op.lotId)||0)+op.massKg);
  }
  for(const l of a.materials.lots){
   if(!id(l.id)||seen.has(l.id)||!id(l.materialId)||!finite(l.massKg)||!finite(l.volumeM3))throw Error('Invalid/duplicate stock lot');
   seen.add(l.id);
   if((reserved.get(l.id)||0)>l.massKg+EPS)throw Error('Over-reserved stock');
  }
  const allocations=[],shortages=[];
  for(const [materialId,requiredKg] of Object.entries(def.parts)){
   let left=requiredKg;
   for(const l of a.materials.lots){
    if(l.containerId!==a.containerId||l.materialId!==materialId||!finite(l.grade)||l.grade<.98||!id(l.provenance))continue;
    const quantity=Math.min(left,Math.max(0,l.massKg-(reserved.get(l.id)||0)));
    if(quantity>EPS){allocations.push({lotId:l.id,materialId,massKg:quantity});left-=quantity;}
    if(left<=EPS)break;
   }
   if(left>EPS)shortages.push({materialId,missingKg:left});
  }
  return {def,allocations,shortages,massKg:Object.values(def.parts).reduce((s,n)=>s+n,0)};
 }
 function quote(a){const prior=state.receipts.find(x=>x.id===a.jobId);
  if(prior)return{duplicate:true,receipt:copy(prior),shortages:[]};
  const r=prepare(a);return{ready:r.shortages.length===0,shortages:copy(r.shortages),requiredMassKg:r.massKg,facilityId:a.facilityId,canDrive:false};
 }
 function stage(a){
  const prior=state.receipts.find(x=>x.id===a.jobId);
  if(prior){if(prior.blueprintId!==a.blueprintId||prior.bodyId!==a.bodyId)throw Error('Assembly ID reused for another design');
   return{duplicate:true,receipt:copy(prior),materials:copy(a.materials),physical:copy(a.physical),assembly:copy(state)};}
  const r=prepare(a);if(r.shortages.length)throw Error('Missing certified manufactured parts: '+r.shortages.map(x=>x.materialId).join(','));
  const materials=copy(a.materials),physical=copy(a.physical);
  for(const take of r.allocations){const l=materials.lots.find(x=>x.id===take.lotId),before=l.massKg;
   l.massKg=Math.max(0,before-take.massKg);l.volumeM3=before?l.volumeM3*l.massKg/before:0;}
  materials.lots=materials.lots.filter(x=>x.massKg>EPS);
  physical.assets.push({id:a.jobId,type:'vehicle_frame',massKg:r.massKg,volumeM3:r.def.volumeM3,condition:1,
   provenance:'physical-8g-assembly:'+a.jobId,location:{kind:'surface',bodyId:a.bodyId,local:copy(a.local)},
   components:[{blueprintId:a.blueprintId}],state:{intendedKind:r.def.kind,assemblyStatus:'AWAITING_RUNTIME_CERTIFICATION',
   operational:false,rideable:false,commissioned:false,facilityId:a.facilityId}});
  const receipt={id:a.jobId,assetId:a.jobId,blueprintId:a.blueprintId,bodyId:a.bodyId,facilityId:a.facilityId,
   status:'ASSEMBLED_NOT_OPERATIONAL',massKg:r.massKg,energyJ:a.powerReceipt.usedJ,
   powerSourceId:a.powerReceipt.sourceId,consumedLots:copy(r.allocations)};
  const assembly=copy(state);assembly.receipts.push(receipt);
  return{duplicate:false,receipt,materials,physical,assembly};
 }
 return Object.freeze({quote,stage,snapshot:()=>copy(state)});
}
root.StarfallVehicleAssemblyContract8G=Object.freeze({create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallVehicleAssemblyContract8G;
})(typeof globalThis!=='undefined'?globalThis:this);
