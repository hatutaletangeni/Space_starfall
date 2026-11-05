/* STARFALL 8H — one-way bridge from the ORIGINAL T02 grid clock to
 * already-reserved 8A conveyor material. NEVER calls the grid again.
 *
 * Original StarfallOutpostUI owns native T02 battery/solar debits. Pass the
 * report returned by THAT grid step, the corresponding physical outpost
 * snapshot, and actual 8A/8E owners. Packet dwell time can advance only when
 * every manufactured drive was served by that native grid. Caller must durably
 * commit BOTH owners and packet archive in one SF.save before applying live
 * material. This module never creates hardware, lots, ship energy or time.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-5;
const num=n=>Number.isFinite(n)&&n>=0;
const M=()=>root.StarfallMaterials8A;
const P=()=>root.StarfallConveyorPackets8H;
const I=()=>root.StarfallPoweredNetwork8H;
function observe({packets,materials8a,physical8a,outpost5,powerReport,
 bodyId,bodyRadius,timeS}={}){
 if(!P()?.create||!M()?.create||!I()?.inspect)
  throw Error('8H original finite packet, power interlock and material owners required');
 const state=P().create(packets).snapshot(),active=state.jobs.filter(x=>x.status==='ACTIVE'&&x.bodyId===bodyId);
 if(!active.length)return{changed:false,packets:state,materials8a,reason:'NO_ACTIVE_PACKET'};
 if(active.length!==1)throw Error('8H only one source-owned line can progress per original grid tick');
 const j=active[0];
 if(!num(timeS)||!num(bodyRadius)||bodyRadius<=0||
    !powerReport||powerReport.schema!==1||powerReport.bodyId!==bodyId||
    !num(powerReport.dtS)||powerReport.dtS<=0||
    !num(powerReport.simulatedAtS)||Math.abs(powerReport.simulatedAtS-timeS)>EPS||
    !outpost5||outpost5.schema!==1||!Array.isArray(outpost5.items)||
    !Array.isArray(outpost5.wires))
  throw Error('8H only native original T02 grid owner can report conveyor motion');
 const elapsed=timeS-j.lastS;
 if(elapsed<=EPS)return{changed:false,packets:state,materials8a,reason:'REPLAY_OR_OLD_GRID_TICK'};
 if(elapsed>10+EPS||elapsed>powerReport.dtS+EPS){
  // No retroactive instantaneous movement across long unloaded intervals.
  // Rebase ONLY the observed clock, preserving exact original lot custody,
  // remaining journey time and battery charges made by native T02. Otherwise
  // an outage or 100x time skip could permanently strand a saved packet.
  const held=cp(state),job=held.jobs.find(x=>x.id===j.id);
  job.lastS=timeS;
  return{changed:true,packets:held,materials8a,reason:'PAUSED_UNOBSERVED_CLOCK',
   elapsedS:elapsed,additionalElectricalDebitJ:0};
 }
 const ledger=M().create(materials8a),massBefore=ledger.inventory().reduce((sum,x)=>sum+x.massKg,0);
 const report=I().inspect({physical8a,materials8a,outpost5,powerReport,
  bodyId,bodyRadius,sourceId:j.sourceId,targetId:j.targetId,
  driveIds:j.driveIds,timeS});
 const powered=report.eligible===true&&report.fault==='TRANSFER_ENGINE_NOT_INSTALLED'&&
  report.throughputKgS===0&&report.sourceLoads?.length===j.driveIds.length;
 const next=cp(state),job=next.jobs.find(x=>x.id===j.id);
 let outcome=powered?'MOVING':'PAUSED_'+report.fault,receipt=null;
 if(powered){
  job.remainingS=Math.max(0,job.remainingS-elapsed);
  if(job.remainingS<=EPS){
   const phys=root.StarfallPhysical8A.create(physical8a);
   const chain=[j.sourceId,...j.driveIds,j.targetId].map(id=>phys.get(id));
   if(chain.some(a=>!a||a.location?.bodyId!==bodyId||a.condition<.5||
     a.state?.enabled!==true))throw Error('8H conveyor physically installed line changed');
   const from=chain[j.cursor],to=chain[j.cursor+1];
   if(!from||!to)throw Error('8H packet has no real next physical conveyor port');
   const src=ledger.inventory().find(x=>x.id===job.currentLotId);
   if(!src||src.containerId!==from.state.containerId||src.materialId!==job.materialId||
     src.massKg+EPS<job.massKg)
    throw Error('8H actual 8A source custody changed before physical hop');
   const reserveId='8h-belt:'+job.id+':'+job.cursor;
   try{
    ledger.reserve(reserveId,src.id,to.state.containerId,job.massKg);
    receipt=ledger.commit(reserveId);
    job.currentLotId=receipt.outputLotId;job.cursor++;
    if(job.cursor===chain.length-1){
     job.status='DELIVERED';job.completionS=timeS;outcome='DELIVERED';
    }else{
     const unit=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((sum,v,i)=>sum+v*b[i],0))))*bodyRadius;
     job.remainingS=Math.max(4,unit(chain[job.cursor].location.local,
       chain[job.cursor+1].location.local));outcome='HOP_COMMITTED';
    }
   }catch(error){outcome='HELD_CAPACITY_OR_CUSTODY: '+String(error.message||error);}
  }
 }
 job.lastS=timeS;
 const massAfter=ledger.inventory().reduce((sum,x)=>sum+x.massKg,0);
 if(Math.abs(massAfter-massBefore)>EPS)
  throw Error('8H original 8A dry conveyor transport mass conservation violated');
 return{changed:true,packets:next,materials8a:ledger.snapshot(),receipt:receipt?cp(receipt):null,
  report,status:outcome,sourceEnergyAlreadyPaidJ:powered?report.powerW*elapsed:0,
  stepS:elapsed,physicalContainerId:ledger.inventory().find(x=>x.id===job.currentLotId)?.containerId||null,
  // ZERO additional watts and joules charged here: real native T02 grid
  // already changed the true outpost battery owner before this observation.
  additionalElectricalDebitJ:0};
}
root.StarfallConveyorNativeBridge8H=Object.freeze({observe});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallConveyorNativeBridge8H;
})(typeof globalThis!=='undefined'?globalThis:this);
