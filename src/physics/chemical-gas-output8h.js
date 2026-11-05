/* STARFALL Update 8H — exact source-owned 8E product gas custody:
 * completed original chemistry -> original physical 80 L / 25 kg pipe
 * -> native original T02-powered timed discharge -> original rated vessel.
 *
 * The original 8A material ledger alone reserves/commits both physical
 * owners. The original 8E chemistry already paid ship electricity, and
 * the original T02 grid ALREADY PAID each 420W pump pulse. This model
 * never manufactures a gas molecule, calls grid(), or charges a battery.
 * Never count an installed flange as proof of gas travel.
 *
 * Scope deliberately OUTBOUND only; incoming chemical reactants still
 * use their original 8E rated source vessels, not a fabricated pipe hop.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6,MAX_JOBS=120,MAX_DT=10;
const name=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const pipeApi=()=>root.StarfallPressureGasPackets8H;
const ledgerApi=()=>root.StarfallMaterials8A;
const manifoldApi=()=>root.StarfallIndustrialGasManifold8H;
const chemistry=()=>root.StarfallIndustrialChemistry8E;
const mass=m=>m.lots.reduce((s,l)=>s+l.massKg,0);
function create(saved){
 const state=saved==null?{schema:1,jobs:[]}:cp(saved);
 if(state.schema!==1||!Array.isArray(state.jobs)||state.jobs.length>MAX_JOBS||
    new Set(state.jobs.map(x=>x.id)).size!==state.jobs.length||
    state.jobs.some(x=>!name(x.id)||!name(x.bodyId)||
      !name(x.pipeId)||!name(x.stationId)||!name(x.vesselId)||
      !name(x.materialId)||!name(x.sourceLotId)||
      !finite(x.massKg)||x.massKg<=0||!finite(x.remainingS)||
      !finite(x.lastS)||!finite(x.paidJ)||!finite(x.minimumCompressionJ)||
      !['ACTIVE','DELIVERED'].includes(x.status)))
  throw Error('8H corrupt original chemical product gas custody');
 function snapshot(){return cp(state);}
 function list(){return snapshot().jobs;}
 function active(bodyId){return state.jobs.some(x=>x.status==='ACTIVE'&&x.bodyId===bodyId);}
 function prepare({materials8a,physical8a,receipt,gasManifolds,bodyId,bodyRadius,timeS}={}){
  if(!ledgerApi()?.create||!pipeApi()?.pressure||!chemistry()?.species||
     !name(receipt?.id)||receipt.status!=='COMMITTED'||
     !name(bodyId)||!finite(bodyRadius)||bodyRadius<=0||!finite(timeS)||
     !materials8a||!physical8a||typeof gasManifolds!=='object')
   throw Error('8H product gas staging requires original paid chemistry and 8A owners');
  const ledger=ledgerApi().create(materials8a),assets=new Map(physical8a.assets.map(a=>[a.id,a])),
   before=mass(materials8a),newJobs=[];
  for(const [species,quantity] of Object.entries(receipt.outputs||{})){
   if(chemistry().species[species]?.phase!=='gas')continue;
   const route=gasManifolds['output:'+species],pipe=assets.get(route?.pipeId),
    vessel=assets.get(route?.vesselId);
   if(!pipe||!vessel||!name(route.powerPortId)||
      pipe.type!=='industrial_plant'||pipe.state?.station!=='pressure_pipeline'||
      pipe.state.t02LoadId!==route.powerPortId||
      pipe.state.ratedPressurePa<8e6||pipe.massKg!==320||
      vessel.type!=='industrial_vessel'||vessel.state?.materialId!==species||
      vessel.state.ratedPressurePa<5e6||
      pipe.location?.bodyId!==bodyId||vessel.location?.bodyId!==bodyId)
    throw Error('8H unverified source-owned chemical output pressure hardware');
   const pipeBin=ledger.containers().find(c=>
     c.id===pipe.state.containerId&&c.ownerId===pipe.id&&
     /gas pipe/i.test(c.kind)&&Math.abs(c.maxVolumeM3-.08)<EPS&&
     Math.abs(c.maxMassKg-25)<EPS);
   const tankBin=ledger.containers().find(c=>
     c.id===vessel.state.containerId&&c.ownerId===vessel.id&&/gas/i.test(c.kind));
   const lotId='chemical:'+receipt.id+':'+species;
   const lot=ledger.inventory(pipeBin?.id).find(l=>l.id===lotId);
   if(!pipeBin||!tankBin||!lot||
      lot.materialId!==species||lot.provenance!=='chemical:'+receipt.id||
      !finite(quantity)||Math.abs(lot.massKg-quantity)>EPS)
    throw Error('8H gas was not actually produced inside its finite original 8A pressure pipe');
   if(ledger.inventory(pipeBin.id).some(l=>l.id!==lotId))
    throw Error('8H chemical output pressure pipe must be empty before reactor batch');
   const pressure=pipeApi().pressure([lot],pipeBin.maxVolumeM3);
   const receiverPressure=pipeApi().pressure(ledger.inventory(tankBin.id),
     Math.max(.001,vessel.volumeM3),{materialId:species,massKg:lot.massKg});
   if(pressure>pipe.state.ratedPressurePa+EPS||
      receiverPressure>vessel.state.ratedPressurePa+EPS)
    throw Error('8H actual chemical gas pressure exceeds manufactured hardware rating');
   const distance=Math.acos(Math.max(-1,Math.min(1,pipe.location.local.reduce(
      (s,v,i)=>s+v*vessel.location.local[i],0))))*bodyRadius;
   if(distance>.000001+12||distance<.01)
    throw Error('8H chemical product gas flanges disconnected beyond real pipe reach');
   const operationId='8h-chem-gas:'+receipt.id+':'+species;
   if(operationId.length>128||state.jobs.some(x=>x.id===operationId)||
       newJobs.some(x=>x.id===operationId)||state.jobs.length+newJobs.length>=MAX_JOBS)
    throw Error('8H duplicate or exhausted chemical gas cargo receipt');
   const workJ=pipeApi().compressionJ(species,lot.massKg,pressure,receiverPressure);
   const seconds=pipeApi().legSeconds(distance,lot.massKg,workJ);
   ledger.reserve(operationId,lotId,tankBin.id,lot.massKg);
   newJobs.push({id:operationId,bodyId,stationId:receipt.stationAssetId,
    pipeId:pipe.id,vesselId:vessel.id,powerPortId:route.powerPortId,
    materialId:species,sourceLotId:lotId,massKg:lot.massKg,remainingS:seconds,
    requiredS:seconds,lastS:timeS,paidJ:0,minimumCompressionJ:workJ,
    status:'ACTIVE',startedS:timeS,completionS:null,outputLotId:null});
  }
  if(!newJobs.length)return{changed:false,materials8a,transit:snapshot(),jobs:[]};
  if(state.jobs.some(x=>x.status==='ACTIVE'&&newJobs.some(y=>y.pipeId===x.pipeId)))
   throw Error('8H already transporting gas in the original pressure line');
  const updated=ledger.snapshot();
  if(Math.abs(mass(updated)-before)>EPS)throw Error('8H gas staging created or destroyed mass');
  return{changed:true,materials8a:updated,
   transit:{schema:1,jobs:state.jobs.concat(newJobs).map(cp)},
   jobs:cp(newJobs),createdKg:0,additionalElectricalDebitJ:0};
 }
 function observe({materials8a,physical8a,outpost5,powerReport,bodyId,
   bodyRadius,timeS}={}){
  const pending=state.jobs.filter(j=>j.status==='ACTIVE'&&j.bodyId===bodyId);
  if(!pending.length)return{changed:false,materials8a,transit:snapshot(),
   reason:'NO_ACTIVE_PRODUCED_GAS'};
  if(!finite(timeS)||!finite(bodyRadius)||bodyRadius<=0||
     !powerReport||powerReport.schema!==1||powerReport.bodyId!==bodyId||
     !finite(powerReport.dtS)||powerReport.dtS<=0||
     !finite(powerReport.simulatedAtS)||Math.abs(powerReport.simulatedAtS-timeS)>EPS)
   throw Error('8H chemical gas release must use original current native T02 report');
  const dtByJob=state.jobs.map(x=>x.status==='ACTIVE'&&x.bodyId===bodyId?
    timeS-x.lastS:0);
  if(dtByJob.every(d=>d<=EPS))return{changed:false,materials8a,transit:snapshot(),
   reason:'DUPLICATE_OR_OLD_T02_REPORT'};
  const next=snapshot(),ledger=ledgerApi().create(materials8a),priorKg=mass(materials8a);
  const arrivals=[];
  for(const j of next.jobs.filter(x=>x.status==='ACTIVE'&&x.bodyId===bodyId)){
   const dt=timeS-j.lastS;
   if(dt<=EPS)continue;
   j.lastS=timeS;
   if(dt>MAX_DT+EPS||dt>powerReport.dtS+EPS)continue; // fail closed for unobserved solar changes
   let proof;
   try{
    proof=manifoldApi().inspect({physical8a,materials8a:ledger.snapshot(),
     outpost5,powerReport,stationId:j.stationId,vesselId:j.vesselId,
     bodyId,bodyRadius,timeS,materialId:j.materialId});
   }catch(e){continue;} // current native pump unpowered/invalid: no discharge progress
   if(proof.pipeId!==j.pipeId||proof.sourcePortId!==j.powerPortId)continue;
   const pipe=physical8a.assets.find(a=>a.id===j.pipeId),
    vessel=physical8a.assets.find(a=>a.id===j.vesselId),
    pipeBin=ledger.containers().find(x=>x.id===pipe.state.containerId),
    vesselBin=ledger.containers().find(x=>x.id===vessel.state.containerId);
   const lot=ledger.inventory(pipeBin.id).find(x=>x.id===j.sourceLotId);
   if(!lot||lot.materialId!==j.materialId||
       lot.massKg+EPS<j.massKg||!vesselBin)continue;
   const p=pipeApi().pressure(ledger.inventory(vesselBin.id),
      Math.max(.001,vessel.volumeM3),{materialId:j.materialId,massKg:j.massKg});
   if(p>vessel.state.ratedPressurePa+EPS)continue;
   j.paidJ+=proof.paidPowerW*dt;
   j.remainingS=Math.max(0,j.remainingS-dt);
   if(j.remainingS>EPS||j.paidJ+1e-4<j.minimumCompressionJ)continue;
   const moved=ledger.commit(j.id); // EXACT original reserved 8A source -> vessel
   j.outputLotId=moved.outputLotId;j.status='DELIVERED';j.completionS=timeS;
   arrivals.push({jobId:j.id,materialId:j.materialId,massKg:j.massKg,
    sourceLotId:j.sourceLotId,outputLotId:j.outputLotId,
    original8AOperationId:moved.id,pipeId:j.pipeId,vesselId:j.vesselId,
    originalGridAlreadyPaidJ:j.paidJ});
  }
  const final=ledger.snapshot();
  if(Math.abs(mass(final)-priorKg)>EPS)
   throw Error('8H chemical gas moved mass without original 8A debit');
  return{changed:true,materials8a:final,transit:next,
   arrivals,createdKg:0,additionalElectricalDebitJ:0};
 }
 return Object.freeze({snapshot,list,active,prepare,observe});
}
root.StarfallChemicalGasOutput8H=Object.freeze({create,MAX_DT,MAX_JOBS});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallChemicalGasOutput8H;
})(typeof globalThis!=='undefined'?globalThis:this);
