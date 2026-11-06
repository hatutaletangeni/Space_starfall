/* STARFALL 8H: Real finite gas INPUT to original 8E chemistry.
 *
 * Actual original 8A certified vessel → manufactured 320kg 8MPa 80L pipe
 * (real 8A reserve/commit after original source-paid 420W T02 timed pulse)
 * → actual chemical reactor inlet readiness (second timed paid T02 flange)
 * → original 8E balanced chemical reaction consumes the physical PIPE lot.
 *
 * The process never credits a fictional gas reactor chamber or creates
 * electricity, gas, a tank, pipes or starter stock. A READY gas remains a
 * real 8A mass-bearing lot in the 80L pipe until the plant consumes it.
 * Input cancellation does NOT refund already transferred physical gas.
 */
(function(root){'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6,MAX_JOBS=120,MAX_DT=10;
const name=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const api=()=>root.StarfallPressureGasPackets8H,ledgerAPI=()=>root.StarfallMaterials8A;
const chemistry=()=>root.StarfallIndustrialChemistry8E,flange=()=>root.StarfallIndustrialGasManifold8H;
const qty=m=>m.lots.reduce((s,l)=>s+l.massKg,0);
function create(saved){
 const state=saved==null?{schema:1,jobs:[]}:copy(saved);
 if(state.schema!==1||!Array.isArray(state.jobs)||state.jobs.length>MAX_JOBS||
   new Set(state.jobs.map(x=>x.id)).size!==state.jobs.length||
   state.jobs.some(x=>!name(x.id)||!name(x.reactionJobId)||!name(x.bodyId)||
     !name(x.pipeId)||!name(x.vesselId)||!name(x.stationId)||
     !name(x.materialId)||!name(x.sourceLotId)||!name(x.operationId)||
     !finite(x.massKg)||x.massKg<=0||!finite(x.lastS)||
     !finite(x.remainingS)||!finite(x.paidJ)||!finite(x.stagePaidJ)||
     !finite(x.requiredWorkJ)||![0,1,2].includes(x.stage)||
     !['ACTIVE','READY','CONSUMED','CANCELLED'].includes(x.status)))
   throw Error('8H invalid durable original chemical inlet gas shipment');
 const snapshot=()=>copy(state);
 const list=()=>snapshot().jobs;
 const active=bodyId=>state.jobs.some(x=>x.bodyId===bodyId&&x.status==='ACTIVE');
 const forJob=chemicalJobId=>list().filter(x=>x.reactionJobId===chemicalJobId);
 function prepare({chemicalJobId,reactionId,scaleMol,stationId,materials8a,physical8a,
   gasManifolds,outpost5,powerReport,bodyId,bodyRadius,timeS}={}){
  if(!name(chemicalJobId)||!name(stationId)||!name(bodyId)||!finite(timeS)||
     !finite(bodyRadius)||bodyRadius<=0||!chemistry()?.batch||
     !api()?.pressure||!ledgerAPI()?.create||
     !physical8a||!materials8a||!gasManifolds||typeof gasManifolds!=='object')
   throw Error('8H incoming chemical gas requires original 8A, 8E, and physical owners');
  if(state.jobs.some(j=>j.reactionJobId===chemicalJobId))
   throw Error('8H original chemical input gas duplicate active job');
  const batch=chemistry().batch(reactionId,scaleMol),
   incoming=Object.entries(batch.inputs).filter(([sp])=>chemistry().species[sp]?.phase==='gas');
  if(!incoming.length)return{changed:false,materials8a,transit:snapshot(),
   jobs:[],createdGasKg:0,additionalElectricalDebitJ:0};
  const assets=new Map(physical8a.assets.map(a=>[a.id,a]));
  const ledger=ledgerAPI().create(materials8a),before=qty(materials8a),newJobs=[];
  if(state.jobs.length+incoming.length>MAX_JOBS)
   throw Error('8H physical inlet gas shipment archive full');
  const priorBusy=new Set(state.jobs.filter(j=>['ACTIVE','READY'].includes(j.status)).map(j=>j.pipeId));
  for(const [species,massKg] of incoming){
   const route=gasManifolds['input:'+species],vessel=assets.get(route?.vesselId),
    pipe=assets.get(route?.pipeId);
   if(!route||!vessel||!pipe||!name(route.powerPortId)||
      priorBusy.has(pipe.id)||newJobs.some(j=>j.pipeId===pipe.id))
    throw Error('8H gas REAGENT needs its own empty physically manufactured pressure line: '+species);
   const proof=flange().inspect({physical8a,materials8a:ledger.snapshot(),
    outpost5,powerReport,stationId,
    vesselId:vessel.id,materialId:species,bodyId,bodyRadius,timeS});
   if(proof.pipeId!==pipe.id||proof.sourcePortId!==route.powerPortId)
    throw Error('8H gas reactant actual original 420W flange route changed');
   const src=ledger.containers().find(c=>c.id===vessel.state.containerId&&c.ownerId===vessel.id),
    dst=ledger.containers().find(c=>c.id===pipe.state.containerId&&c.ownerId===pipe.id);
   if(!src||!dst||Math.abs(dst.maxMassKg-25)>EPS||
     Math.abs(dst.maxVolumeM3-.08)>EPS||ledger.inventory(dst.id).length)
    throw Error('8H rated reactor feed pipe must be an EMPTY original 80L/25kg container');
   const lot=ledger.inventory(src.id).find(x=>x.materialId===species&&
     x.grade>=.99&&x.massKg+EPS>=massKg&&
     !ledger.operations().some(op=>op.status==='RESERVED'&&op.lotId===x.id));
   if(!lot)throw Error('8H no UNRESERVED real certified reactor feedstock gas: '+species);
   const actualVolume=lot.volumeM3*massKg/lot.massKg;
   if(actualVolume>dst.maxVolumeM3+EPS||massKg>dst.maxMassKg+EPS)
    throw Error('8H original 80L line cannot admit this actual source gas mass and volume');
   const linePressure=api().pressure([],.08,{materialId:species,massKg});
   if(linePressure>pipe.state.ratedPressurePa+EPS)
    throw Error('8H source gas would overpressure the actual manufactured pipe');
   const inletPressure=api().pressure(ledger.inventory(src.id),Math.max(.001,vessel.volumeM3));
   const workJ=api().compressionJ(species,massKg,inletPressure,linePressure);
   const distance=Math.acos(Math.max(-1,Math.min(1,vessel.location.local.reduce(
    (s,x,i)=>s+x*pipe.location.local[i],0))))*bodyRadius;
   if(distance<.01||distance>12+EPS)
    throw Error('8H certified gas vessel physically out of pipeline reach');
   const opId='8h-chem-in:'+chemicalJobId+':'+species+':0';
   if(opId.length>128)throw Error('8H source-owned inlet operation ID limit');
   ledger.reserve(opId,lot.id,dst.id,massKg);
   newJobs.push({id:'8h-in:'+chemicalJobId+':'+species,
    reactionJobId:chemicalJobId,reactionId,stationId:proof.stationId,
    bodyId,materialId:species,sourceLotId:lot.id,currentLotId:lot.id,
    vesselId:vessel.id,pipeId:pipe.id,powerPortId:route.powerPortId,
    operationId:opId,massKg,stage:0,status:'ACTIVE',
    lastS:timeS,remainingS:api().legSeconds(distance,massKg,workJ),
    requiredWorkJ:workJ,stagePaidJ:0,paidJ:0,
    startedS:timeS,readyS:null,consumedS:null});
  }
  const updated=ledger.snapshot();
  if(Math.abs(qty(updated)-before)>EPS)
   throw Error('8H 8A inbound reservation altered actual gas mass');
  return{changed:true,materials8a:updated,transit:{
   schema:1,jobs:state.jobs.concat(newJobs)},jobs:copy(newJobs),
   createdGasKg:0,additionalElectricalDebitJ:0};
 }
 function observe({materials8a,physical8a,outpost5,powerReport,
   bodyId,bodyRadius,timeS}={}){
  const live=state.jobs.filter(j=>j.bodyId===bodyId&&j.status==='ACTIVE');
  if(!live.length)return{changed:false,transit:snapshot(),materials8a,
   reason:'NO_ACTIVE_GAS_REAGENT_SHIPMENT'};
  if(!finite(timeS)||!finite(bodyRadius)||bodyRadius<=0||
     !powerReport||powerReport.schema!==1||powerReport.bodyId!==bodyId||
     !finite(powerReport.dtS)||powerReport.dtS<=0||
     !finite(powerReport.simulatedAtS)||Math.abs(powerReport.simulatedAtS-timeS)>EPS)
   throw Error('8H original T02 paid inlet pipe clock required');
  if(live.every(x=>timeS<=x.lastS+EPS))
   return{changed:false,transit:snapshot(),materials8a,
    reason:'SAME_OR_STALE_NATIVE_T02_TICK'};
  const result=snapshot(),ledger=ledgerAPI().create(materials8a),before=qty(materials8a);
  const receipts=[];
  for(const j of result.jobs.filter(x=>x.bodyId===bodyId&&x.status==='ACTIVE')){
   const dt=timeS-j.lastS;if(dt<=EPS)continue;
   j.lastS=timeS;
   if(dt>MAX_DT+EPS||dt>powerReport.dtS+EPS)continue;
   let proof;try{proof=flange().inspect({
    physical8a,materials8a:ledger.snapshot(),outpost5,powerReport,
    stationId:j.stationId,vesselId:j.vesselId,bodyId,bodyRadius,timeS,
    materialId:j.materialId});
   }catch(e){continue;}
   if(proof.pipeId!==j.pipeId||proof.sourcePortId!==j.powerPortId)continue;
   const pipe=physical8a.assets.find(a=>a.id===j.pipeId),
    vessel=physical8a.assets.find(a=>a.id===j.vesselId);
   if(!pipe||!vessel||pipe.condition<.8||vessel.condition<.8)continue;
   const lot=ledger.inventory(j.stage===0?vessel.state.containerId:pipe.state.containerId)
    .find(x=>x.id===j.currentLotId);
   if(!lot||lot.materialId!==j.materialId||lot.massKg+EPS<j.massKg)continue;
   j.paidJ+=proof.paidPowerW*dt;j.stagePaidJ+=proof.paidPowerW*dt;
   j.remainingS=Math.max(0,j.remainingS-dt);
   if(j.remainingS>EPS||j.stagePaidJ+1e-4<j.requiredWorkJ)continue;
   if(j.stage===0){
    const op=ledger.commit(j.operationId);
    j.currentLotId=op.outputLotId;j.stage=1;j.stagePaidJ=0;
    const pipePressure=api().pressure(ledger.inventory(pipe.state.containerId),.08);
    const work=api().compressionJ(j.materialId,j.massKg,pipePressure,5e6);
    const station=physical8a.assets.find(a=>a.id===j.stationId);
    const distance=Math.acos(Math.max(-1,Math.min(1,pipe.location.local.reduce(
      (s,x,i)=>s+x*station.location.local[i],0))))*bodyRadius;
    if(distance>12+EPS)throw Error('8H reactor flange disconnected mid-gas movement');
    j.requiredWorkJ=work;
    j.remainingS=api().legSeconds(distance,j.massKg,work);
    receipts.push({id:op.id,status:'PIPE_LOADED',materialId:j.materialId,
     lotId:j.currentLotId,massKg:j.massKg,gasCreatedKg:0});
   }else{
    j.stage=2;j.status='READY';j.readyS=timeS;
    receipts.push({id:j.id,status:'REACTOR_INLET_READY',lotId:j.currentLotId,
     materialId:j.materialId,massKg:j.massKg,gasCreatedKg:0});
   }
  }
  const material=ledger.snapshot();
  if(Math.abs(qty(material)-before)>EPS)throw Error('8H original 8A inbound gas conservation failed');
  return{changed:true,transit:result,materials8a:material,
   receipts,gasCreatedKg:0,additionalElectricalDebitJ:0};
 }
 function readyFor(chemicalJobId,materials8a,expectedGasSpecies=null){
  const jobs=state.jobs.filter(x=>x.reactionJobId===chemicalJobId);
  // CRITICAL: an empty/corrupted inbound archive is NEVER proof that
  // a gas-dependent original chemical reaction has physically received
  // all its reagents. Require the EXACT stoichiometric species list.
  if(expectedGasSpecies!==null){
   if(!Array.isArray(expectedGasSpecies)||
      new Set(expectedGasSpecies).size!==expectedGasSpecies.length||
      expectedGasSpecies.length!==jobs.length||
      expectedGasSpecies.some(sp=>!jobs.some(j=>j.materialId===sp)))
    return false;
  }
  if(!jobs.length)return expectedGasSpecies===null||expectedGasSpecies.length===0;
  if(jobs.some(x=>x.status!=='READY'||x.stage!==2))return false;
  const ledger=ledgerAPI().create(materials8a);
  return jobs.every(j=>ledger.inventory().some(l=>
   l.id===j.currentLotId&&l.materialId===j.materialId&&
   l.containerId===ledger.containers().find(c=>
    c.ownerId===j.pipeId&&/gas pipe/i.test(c.kind))?.id&&
   l.massKg+EPS>=j.massKg));
 }
 function consume({chemicalJobId,materialsBefore,materialsAfter,timeS}={}){
  if(!readyFor(chemicalJobId,materialsBefore))throw Error('8H reagent pipes not fully source-paid');
  const next=snapshot(),jobs=next.jobs.filter(x=>x.reactionJobId===chemicalJobId&&
   x.status==='READY');
  if(!jobs.length)return{changed:false,transit:next};
  const after=ledgerAPI().create(materialsAfter);
  for(const j of jobs){
   if(after.inventory().some(l=>l.id===j.currentLotId))
    throw Error('8H chemical reactor failed to consume the original READY pipe lot');
   j.status='CONSUMED';j.consumedS=timeS;
  }
  return{changed:true,transit:next};
 }
 function cancel({chemicalJobId,materials8a}={}){
  const next=snapshot(),ledger=ledgerAPI().create(materials8a),jobs=next.jobs.filter(x=>
   x.reactionJobId===chemicalJobId&&x.status==='ACTIVE');
  for(const j of jobs){
   if(j.stage===0)ledger.cancel(j.operationId);
   // Stage-1 or READY gas is genuinely already in the original pipe:
   // cancellation leaves that mass there, with NO fictional refund.
   j.status='CANCELLED';
  }
  for(const j of next.jobs.filter(x=>x.reactionJobId===chemicalJobId&&x.status==='READY'))
   j.status='CANCELLED';
  return{changed:next.jobs.some(x=>x.reactionJobId===chemicalJobId&&x.status==='CANCELLED'),
   transit:next,materials8a:ledger.snapshot(),
   gasCreatedKg:0,refundedGasKg:0,additionalElectricalDebitJ:0};
 }
 return Object.freeze({snapshot,list,active,forJob,prepare,observe,readyFor,consume,cancel});
}
root.StarfallChemicalGasInput8H=Object.freeze({create,MAX_DT,MAX_JOBS});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallChemicalGasInput8H;
})(typeof globalThis!=='undefined'?globalThis:this);
