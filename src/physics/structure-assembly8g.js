/* STARFALL 8G — honest structural staging: dry rocket stages and unpressurized habitats.
 * Consumes actual certified 8F parts, paid energy and an installed physical
 * 8G assembly facility. Objects are NOT operational rockets or habitats.
 * The source 8A material and asset snapshots are never mutated in-place.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const blueprints=Object.freeze({
 rocket_stage:{type:'rocket_stage_dry',station:'rocket_integration',
  workJ:3000000,assemblySeconds:1800,minimumClearanceScene:17,
  state:{operational:false,commissioned:false,launchReady:false,propellantKg:0,
    pressureValidated:false,hotFireValidated:false,assemblyStatus:'DRY_UNQUALIFIED_STAGE'}},
 habitat_shell:{type:'habitat_envelope',station:'habitat_pad',
  workJ:4000000,assemblySeconds:2400,minimumClearanceScene:21,
  state:{operational:false,commissioned:false,habitable:false,pressurePa:0,
    oxygenKg:0,waterKg:0,airlockSealed:false,lifeSupportOnline:false,
    assemblyStatus:'UNPRESSURIZED_ENVELOPE'}}
});
const sum=x=>x.reduce((s,l)=>s+l.massKg,0);
function create(saved){
 const ledger=saved?copy(saved):{schema:1,receipts:[]};
 if(ledger.schema!==1||!Array.isArray(ledger.receipts)||
   new Set(ledger.receipts.map(x=>x.id)).size!==ledger.receipts.length)
  throw Error('Corrupt 8G assembly receipt history');
 function prepare(a){
  const spec=blueprints[a?.blueprintId],def=root.StarfallAssembly8G?.DEFINITIONS?.[a?.blueprintId];
  if(!spec||!def||def.facility!==spec.station)throw Error('Unsupported structural blueprint');
  if(!id(a.jobId)||!a.jobId.startsWith('structure8g:')||!id(a.facilityId)||!id(a.bodyId)||!id(a.containerId))
   throw Error('Missing unique physical structural build IDs');
  if(!a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
   !Array.isArray(a.materials.operations)||!Array.isArray(a.materials.containers)||
   !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets))
    throw Error('Authoritative 8A material and physical snapshots required');
  if(!a.materials.containers.some(x=>x.id===a.containerId&&id(x.ownerId)))
   throw Error('No physical source cargo container');
  if(!Array.isArray(a.local)||a.local.length!==3||!a.local.every(Number.isFinite)||
   Math.abs(Math.hypot(...a.local)-1)>1e-4)throw Error('Invalid unit body-fixed construction site');
  const facility=a.physical.assets.find(x=>x.id===a.facilityId);
  if(!facility||facility.type!=='industrial_plant'||facility.location?.kind!=='surface'||
   facility.location.bodyId!==a.bodyId||facility.state?.station!==spec.station||
   facility.state?.enabled===false||!valid(facility.condition)||facility.condition<.5)
   throw Error('Installed, operational rocket/habitat construction pad required');
  if(a.physical.assets.some(x=>x.id===a.jobId))throw Error('Structure asset ID collision');
  const reserved=new Map(),lotsSeen=new Set();
  for(const op of a.materials.operations)if(op.status==='RESERVED'){
   if(!id(op.lotId)||!valid(op.massKg))throw Error('Invalid reservation');
   reserved.set(op.lotId,(reserved.get(op.lotId)||0)+op.massKg);
  }
  for(const l of a.materials.lots){
   if(!id(l.id)||lotsSeen.has(l.id)||!id(l.materialId)||!valid(l.massKg)||!valid(l.volumeM3))
    throw Error('Invalid/duplicated material lot');
   lotsSeen.add(l.id);
   if((reserved.get(l.id)||0)>l.massKg+EPS)throw Error('Over-reserved materials');
  }
  const take=[],shortages=[];
  for(const [materialId,kg] of Object.entries(def.parts)){
   let remain=kg;
   for(const l of a.materials.lots){
    if(l.containerId!==a.containerId||l.materialId!==materialId||!valid(l.grade)||
       l.grade<.98||!id(l.provenance))continue;
    const free=Math.max(0,l.massKg-(reserved.get(l.id)||0));
    const amount=Math.min(free,remain);
    if(amount>EPS){take.push({lotId:l.id,materialId,massKg:amount});remain-=amount;}
    if(remain<=EPS)break;
   }
   if(remain>EPS)shortages.push({materialId,missingKg:remain});
  }
  const e=a.energyReceipt;
  if(!e||e.operationId!==a.jobId||e.status!=='COMMITTED'||
    e.sourceId!=='ship-main:engineering-battery'||!valid(e.usedJ)||e.usedJ+EPS<spec.workJ)
   throw Error('Committed, properly sourced structural assembly power debit required');
  return {def,spec,take,shortages,massKg:Object.values(def.parts).reduce((s,n)=>s+n,0)};
 }
 function quote(a){
  const prior=ledger.receipts.find(x=>x.id===a?.jobId);
  if(prior)return {duplicate:true,receipt:copy(prior)};
  const p=prepare(a);
  return {ready:p.shortages.length===0,shortages:copy(p.shortages),
    massKg:p.massKg,workJ:p.spec.workJ,assemblySeconds:p.spec.assemblySeconds,
    nonOperational:true,station:p.spec.station};
 }
 function stage(a){
  const prior=ledger.receipts.find(x=>x.id===a?.jobId);
  if(prior){
   if(prior.blueprintId!==a.blueprintId||prior.facilityId!==a.facilityId||prior.bodyId!==a.bodyId||
     !a.physical?.assets?.some(x=>x.id===prior.assetId&&x.provenance==='structural-8g:'+a.jobId))
    throw Error('Repeated 8G structure ID does not match its original physical receipt');
   return{duplicate:true,receipt:copy(prior),materials:copy(a.materials),
     physical:copy(a.physical),assembly:copy(ledger)};
  }
  const p=prepare(a);if(p.shortages.length)
   throw Error('Missing certified structural components: '+p.shortages.map(x=>x.materialId).join(', '));
  const materials=copy(a.materials),physical=copy(a.physical);
  const before=sum(materials.lots)+sum(physical.assets);
  for(const item of p.take){
   const lot=materials.lots.find(x=>x.id===item.lotId);
   const prev=lot.massKg;lot.massKg=Math.max(0,prev-item.massKg);
   lot.volumeM3=prev?lot.volumeM3*lot.massKg/prev:0;
  }
  materials.lots=materials.lots.filter(x=>x.massKg>EPS);
  const asset={id:a.jobId,type:p.spec.type,massKg:p.massKg,
    volumeM3:p.def.volumeM3,condition:1,provenance:'structural-8g:'+a.jobId,
    location:{kind:'surface',bodyId:a.bodyId,local:copy(a.local)},
    components:[{blueprintId:a.blueprintId,parts:copy(p.def.parts)}],
    state:{...copy(p.spec.state),assemblyFacilityId:a.facilityId,
      assemblyWorkJ:p.spec.workJ,assemblySeconds:p.spec.assemblySeconds}};
  physical.assets.push(asset);
  if(Math.abs(before-sum(materials.lots)-sum(physical.assets))>EPS)
   throw Error('Structural assembly violated physical mass conservation');
  const receipt={id:a.jobId,assetId:a.jobId,blueprintId:a.blueprintId,
   facilityId:a.facilityId,bodyId:a.bodyId,status:'ASSEMBLED_NOT_OPERATIONAL',
   massKg:p.massKg,energyJ:p.spec.workJ,assemblySeconds:p.spec.assemblySeconds,
   consumedLots:copy(p.take)};
  const assembly=copy(ledger);assembly.receipts.push(receipt);
  return {duplicate:false,receipt,asset,materials,physical,assembly};
 }
 return Object.freeze({quote,stage,snapshot:()=>copy(ledger)});
}
root.StarfallStructureAssembly8G=Object.freeze({create,BLUEPRINTS:blueprints});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallStructureAssembly8G;
})(typeof globalThis!=='undefined'?globalThis:this);
