/* STARFALL 8E — atom-balanced, equipment-gated and container-gated plant transaction.
 * Authoritative power must be debited before calling; the caller atomically persists
 * BOTH returned material and plant receipts with the energy-source state.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),R=8.314462618,EPS=1e-7;
const chemistry=()=>root.StarfallIndustrialChemistry8E;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const sum=xs=>xs.reduce((a,b)=>a+b,0);
function create(saved){
 const state=saved==null?{schema:1,operations:[]}:copy(saved);
 if(state.schema!==1||!Array.isArray(state.operations)||
  new Set(state.operations.map(o=>o.id)).size!==state.operations.length)throw Error('Invalid 8E plant state');
 function process({id,reactionId,scaleMol=100,materials,sourceContainerId,destinations={},reactantSources={},assetState,
    station,energyReceipt,bodyId,temperatureK=293.15,storagePressurePa=5e6}){
  if(!ident(id)||!ident(sourceContainerId))throw Error('Missing job or physical source container');
  const old=state.operations.find(x=>x.id===id);
  if(old)return{duplicate:true,receipt:copy(old),materials:copy(materials),operations:copy(state)};
  const c=chemistry();if(!c)throw Error('Chemical reaction library not loaded');
  const recipe=c.batch(reactionId,scaleMol),spec=c.reactions[reactionId];
  if(!materials||materials.schema!==1||!Array.isArray(materials.containers)||!Array.isArray(materials.lots)||!Array.isArray(materials.operations))throw Error('8A stock missing');
  if(!station||!ident(station.id)||station.kind!==spec.station||station.enabled!==true||!finite(station.condition)||station.condition<.5||
    station.bodyId!==bodyId||station.sourceContainerId!==sourceContainerId||!station.installed||
    !spec.requiredTools.every(t=>station.tools?.includes(t))||
    !ident(station.physicalAssetId))throw Error('Required installed physical plant/tool not available');
  const assets=assetState?.assets||[];
  const asset=assets.find(a=>a.id===station.physicalAssetId);
  if(!asset||asset.condition<.5||asset.location?.kind!=='surface'||asset.location.bodyId!==bodyId)throw Error('Plant lacks registered surface asset');
  if(!energyReceipt||energyReceipt.operationId!==id||!ident(energyReceipt.sourceId)||!finite(energyReceipt.usedJ)||
   energyReceipt.usedJ+EPS<recipe.energyJ)throw Error('Missing verified station power debit');
  if(!(temperatureK>=150&&temperatureK<=700)||!finite(storagePressurePa)||storagePressurePa<=0||storagePressurePa>3e7)throw Error('Invalid gas handling state');
  const snapshot=copy(materials);
  const taken=[];
  for(const [materialId,quantity] of Object.entries(recipe.inputs)){
   let remaining=quantity;
   const isGas=c.species[materialId]?.phase==='gas';
  const reagentContainer=isGas?reactantSources[materialId]:sourceContainerId;
  if(isGas){
   const vessel=assets.find(x=>x.id===station.reactantAssetIds?.[materialId]);
   const bin=snapshot.containers.find(x=>x.id===reagentContainer);
   if(!vessel||vessel.type!=='industrial_vessel'||vessel.condition<.5||
    vessel.location?.kind!=='surface'||vessel.location.bodyId!==bodyId||
    vessel.state?.materialId!==materialId||vessel.state?.containerId!==reagentContainer||
    !bin||!String(bin.kind).includes('gas')||!finite(vessel.state.ratedPressurePa)||
    vessel.state.ratedPressurePa<storagePressurePa)
    throw Error('Required pressure-rated reactant vessel missing: '+materialId);
  }
  for(const lot of snapshot.lots){
    if(lot.containerId!==reagentContainer||lot.materialId!==materialId)continue;
    // An exact chemical identifier is not sufficient: raw, low-grade ore cannot be used as pure reagent.
    if(!finite(lot.grade)||lot.grade<.99)continue;
    const reserved=sum(snapshot.operations.filter(op=>op.status==='RESERVED'&&op.lotId===lot.id).map(op=>op.massKg));
    const free=Math.max(0,lot.massKg-reserved),used=Math.min(free,remaining);
    if(used>EPS){taken.push({lot,used});remaining-=used;}if(remaining<EPS)break;
   }
   if(remaining>EPS)throw Error('Missing certified reagent: '+materialId);
  }
  const containers=new Map(snapshot.containers.map(x=>[x.id,x])),outputs=[],amountByBin=new Map();
  for(const [materialId,massKg] of Object.entries(recipe.outputs)){
   const destinationId=destinations[materialId];if(!ident(destinationId))throw Error('Output vessel not selected: '+materialId);
   const bin=containers.get(destinationId);if(!bin)throw Error('Output vessel not physically registered: '+destinationId);
   const phase=recipe.phases[materialId];
   let volumeM3;
   if(phase==='gas'){
    const vessel=assets.find(a=>a.id===station.vesselAssetIds?.[materialId]);
    if(!vessel||vessel.location?.kind!=='surface'||vessel.location.bodyId!==bodyId||vessel.condition<.5||
      vessel.state?.materialId!==materialId||vessel.state?.containerId!==destinationId||
      !finite(vessel.state?.ratedPressurePa)||vessel.state.ratedPressurePa<storagePressurePa||
      !String(bin.kind).includes('gas'))throw Error('Missing rated '+materialId+' gas vessel');
    const molar=c.molarMass(materialId)/1000; // kg/mol
    volumeM3=(massKg/molar)*R*temperatureK/storagePressurePa;
   }else{
    if(String(bin.kind).includes('gas'))throw Error('Solids/liquids cannot enter gas-only tank');
    volumeM3=massKg*.001; // conservative approximate packed volume, station chemistry may override
   }
   const current=amountByBin.get(destinationId)||{massKg:0,volumeM3:0};
   current.massKg+=massKg;current.volumeM3+=volumeM3;amountByBin.set(destinationId,current);
   outputs.push({id:'chemical:'+id+':'+materialId,materialId,containerId:destinationId,massKg,volumeM3,
    grade:1,provenance:'chemical:'+id});
  }
  // Capacity checked after the already-reserved source quantities are debited.
  for(const [containerId,value] of amountByBin){
   const bin=containers.get(containerId),existing=snapshot.lots.filter(l=>l.containerId===containerId);
   const removed=taken.filter(d=>d.lot.containerId===containerId);
   const kg=sum(existing.map(l=>l.massKg))-sum(removed.map(d=>d.used));
   const vol=sum(existing.map(l=>l.volumeM3))-sum(removed.map(d=>d.used*d.lot.volumeM3/d.lot.massKg));
   if(kg+value.massKg>bin.maxMassKg+EPS||vol+value.volumeM3>bin.maxVolumeM3+EPS)
    throw Error('Output tank full: '+containerId);
  }
  for(const d of taken){const before=d.lot.massKg;d.lot.massKg-=d.used;d.lot.volumeM3*=d.lot.massKg/before;}
  snapshot.lots=snapshot.lots.filter(x=>x.massKg>EPS).concat(outputs);
  const physicalGasPorts=station.gasManifolds&&typeof station.gasManifolds==='object'?
    Object.fromEntries(Object.entries(station.gasManifolds).map(([k,v])=>
     [k,{vesselId:v.vesselId,pipeId:v.pipeId,powerPortId:v.powerPortId}])):null;
  const receipt={id,reactionId,stationAssetId:station.physicalAssetId,inputs:copy(recipe.inputs),reactantSources:copy(reactantSources),
   outputs:copy(recipe.outputs),energyJ:recipe.energyJ,bodyId,status:'COMMITTED',
   ...(physicalGasPorts&&Object.keys(physicalGasPorts).length?{
    physicalGasPorts:copy(physicalGasPorts),
    gasTransportAccounting:'PAID_ORIGINAL_T02_CERTIFIED_FLANGE_BUT_8A_BATCH_DIRECT_CONTAINER',
    note:'Gas source and receiving vessel have physically certified rated lines. This receipt DOES NOT prove transient pipe-holdup gas flow during the chemical batch.'}:{})};
  const operations=copy(state);operations.operations.push(receipt);
  return {duplicate:false,receipt,materials:snapshot,operations};
 }
 return Object.freeze({process,snapshot:()=>copy(state)});
}
root.StarfallIndustrialPlant8E=Object.freeze({create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialPlant8E;
})(typeof globalThis!=='undefined'?globalThis:this);
