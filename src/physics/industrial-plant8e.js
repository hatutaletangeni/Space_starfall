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
    vessel.state?.materialId!==materialId||
    !finite(vessel.state.ratedPressurePa)||vessel.state.ratedPressurePa<storagePressurePa)
    throw Error('Required original certified gas reactant vessel missing: '+materialId);
   if(station.gasInputStaged8H===true){
    // Real chemical inlet has already consumed original native 420W T02
    // motor work to move source gas INTO an installed 80L pipe, and then
    // paid a second finite pipe→reactor inlet-handoff step. It is STILL
    // actual original 8A mass inside the pipeline until the chemical
    // reactor consumes it here. No free reactor chamber is manufactured.
    const j=station.gasInputProofs8H?.[materialId],
     route=station.gasManifolds?.['input:'+materialId],
     pipe=assets.find(a=>a.id===j?.pipeId);
    const kit=assetState?.transfers?.some(t=>t.action==='INSTALL'&&
     t.status==='COMMITTED'&&t.assetId===pipe?.id&&ident(t.sourceLotId)&&
     finite(t.massKg)&&Math.abs(t.massKg-pipe.massKg)<EPS);
    const reservedReceipt=snapshot.operations.find(o=>
     o.id===j?.operationId&&o.status==='COMMITTED'&&
     o.outputLotId===j?.currentLotId);
    const sourceLot=snapshot.lots.find(l=>l.id===j?.currentLotId&&
     l.containerId===reagentContainer&&l.materialId===materialId);
    if(!j||j.status!=='READY'||j.stage!==2||
       j.stationId!==station.physicalAssetId||j.vesselId!==vessel.id||
       j.massKg+EPS<quantity||!finite(j.paidJ)||j.paidJ<=0||
       !pipe||!kit||pipe.condition<.8||
       pipe.state?.station!=='pressure_pipeline'||
       pipe.state?.kitMaterialId!=='plant_kit_pressure_pipeline'||
       pipe.state?.ratedPressurePa<8e6||pipe.massKg!==320||
       pipe.location?.kind!=='surface'||pipe.location.bodyId!==bodyId||
       !route||route.pipeId!==pipe.id||route.vesselId!==vessel.id||
       route.powerPortId!==pipe.state.t02LoadId||
       pipe.state.containerId!==reagentContainer||
       !bin||bin.ownerId!==pipe.id||!String(bin.kind).includes('gas')||
       Math.abs(bin.maxMassKg-25)>EPS||Math.abs(bin.maxVolumeM3-.08)>EPS||
       !reservedReceipt||!sourceLot||sourceLot.massKg+EPS<quantity)
      throw Error('8H actual incoming reagent gas not delivered through real paid 80L pipe and original T02 reactor flange: '+materialId);
   }else if(vessel.state?.containerId!==reagentContainer||
     !bin||!String(bin.kind).includes('gas'))
     throw Error('Original pressure-rated reactant vessel missing: '+materialId);
  }
  for(const lot of snapshot.lots){
    if(lot.containerId!==reagentContainer||lot.materialId!==materialId)continue;
    // An exact chemical identifier is not sufficient: raw, low-grade ore cannot be used as pure reagent.
    if(!finite(lot.grade)||lot.grade<.99)continue;
    if(isGas&&station.gasInputStaged8H===true&&
       lot.id!==station.gasInputProofs8H?.[materialId]?.currentLotId)
     continue; // NEVER consume another gas lot bypassing source-pinned line
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
    const manifold=station.gasManifolds?.['output:'+materialId];
    // A staged physical chemical job cannot silently fall back to direct
    // vessel credit when a gas route is missing. Solid-only reactions remain
    // unchanged; every actual gas product must use its original 8A pipe.
    if(station.gasOutputStaged8H===true&&!manifold)
     throw Error('8H staged gas product missing paid physical output pressure pipeline: '+materialId);
    const staged=station.gasOutputStaged8H===true&&!!manifold;
    const pipe=staged?assets.find(a=>a.id===manifold.pipeId):null;
    if(!vessel||vessel.location?.kind!=='surface'||vessel.location.bodyId!==bodyId||vessel.condition<.5||
      vessel.state?.materialId!==materialId||
      (!staged&&vessel.state?.containerId!==destinationId)||
      !finite(vessel.state?.ratedPressurePa)||vessel.state.ratedPressurePa<storagePressurePa||
      !String(bin.kind).includes('gas'))throw Error('Missing rated '+materialId+' gas vessel');
    if(staged){
     // In a REAL manufactured 8H connection the gas leaves chemistry into
     // the physical 80L pipe, NOT an imaginary direct vessel credit.
     // The T02-owned 420W pump must subsequently make the reserved 8A hop.
     const installed=assetState?.transfers?.some(t=>
       t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===pipe?.id&&
       ident(t.sourceLotId)&&finite(t.massKg)&&Math.abs(t.massKg-pipe.massKg)<EPS);
     if(!pipe||pipe.type!=='industrial_plant'||pipe.state?.station!=='pressure_pipeline'||
        pipe.state.kitMaterialId!=='plant_kit_pressure_pipeline'||
        pipe.state.ratedPressurePa<8e6||pipe.massKg!==320||
        pipe.state.t02LoadId!==manifold.powerPortId||
        pipe.state.containerId!==destinationId||bin.ownerId!==pipe.id||
        Math.abs(bin.maxMassKg-25)>EPS||Math.abs(bin.maxVolumeM3-.08)>EPS||
        vessel.id!==manifold.vesselId||!installed||
        snapshot.lots.some(l=>l.containerId===destinationId))
      throw Error('Original paid 8H gas output needs a genuinely EMPTY 80 L / 25 kg manufactured 8 MPa pipe');
     const p=(massKg/(c.molarMass(materialId)/1000))*R*temperatureK/.08;
     const destinationPressure=(snapshot.lots.filter(l=>l.containerId===vessel.state.containerId)
       .reduce((sum,l)=>sum+l.massKg/(c.molarMass(materialId)/1000),0)
       +massKg/(c.molarMass(materialId)/1000))*R*temperatureK/
       Math.max(.001,vessel.volumeM3);
     if(p>pipe.state.ratedPressurePa+EPS||
        destinationPressure>vessel.state.ratedPressurePa+EPS)
      throw Error('8H actual staged chemical gas exceeds pipe or destination vessel pressure rating');
    }
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
    gasTransportAccounting:station.gasOutputStaged8H===true?
     (station.gasInputStaged8H===true?
       'OUTBOUND_REAL_80L_PIPE_NATIVE_T02_DELIVERY;INBOUND_REAL_VESSEL_TO_PIPE_AND_PAID_REACTOR_INLET':
       'OUTBOUND_IN_ORIGINAL_80L_PIPE_RESERVED_UNTIL_NATIVE_T02_DELIVERY;INBOUND_GAS_STILL_DIRECT_VESSEL'):
     (station.gasInputStaged8H===true?
       'INBOUND_REAL_VESSEL_TO_PIPE_AND_PAID_REACTOR_INLET;NO_OUTBOUND_GAS':
       'PAID_ORIGINAL_T02_CERTIFIED_FLANGE_BUT_8A_BATCH_DIRECT_CONTAINER'),
    note:station.gasOutputStaged8H===true?
     (station.gasInputStaged8H===true?
      'Original 8A incoming gases are physically transferred from real rated vessels into manufactured 80L pipes by original 420W T02 grid, receive a second paid reactor inlet step, then are consumed by real 8E chemistry; output gases occupy other 80L pipes until separate paid delivery to rated vessels.' :
      'Original 8A chemistry creates its balanced output gas IN real manufactured 80L pipe holdup. Separate original native T02 powered, timed reservation/commit is REQUIRED before its actual rated vessel receives it. Inbound gas reactants still directly debit source vessels and are not claimed as fully metered.') :
     'Gas source and receiving vessel have physically certified rated lines. This receipt DOES NOT prove transient pipe-holdup gas flow during the chemical batch.'}:{})};
  const operations=copy(state);operations.operations.push(receipt);
  return {duplicate:false,receipt,materials:snapshot,operations};
 }
 return Object.freeze({process,snapshot:()=>copy(state)});
}
root.StarfallIndustrialPlant8E=Object.freeze({create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallIndustrialPlant8E;
})(typeof globalThis!=='undefined'?globalThis:this);
