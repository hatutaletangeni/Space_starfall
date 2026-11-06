/* STARFALL 8H — finite, time-stepped dry cargo packets through real conveyor
 * trays. An actual 8A lot occupies exactly ONE source-owned physical container
 * at any time; every hop is an 8A reserve+commit, never graph teleportation.
 * One original T02 grid step pays EVERY wired motor load before a hop.
 * Caller must atomically persist returned material, outpost and packet owners,
 * and must not advance T02 a second time for the same simulation interval.
 * This is a pure release foundation, NOT live flight.js/UI integration.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=96;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const DRY_DENIED=new Set(['oxygen','nitrogen','hydrogen','carbon_dioxide',
 'carbon_monoxide','sulfur_dioxide','methane','argon','helium','ammonia',
 'water','ice','liquid_water']);
const SPEED_M_S=1,MIN_LEG_S=4,MAX_DT_S=10,MAX_PACKET_KG=40;
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))))*r;}
function create(saved){
 const state=saved==null?{schema:1,jobs:[]}:cp(saved);
 if(state.schema!==1||!Array.isArray(state.jobs)||state.jobs.length>200)
  throw Error('8H unsupported conveyor packet archive');
 for(const j of state.jobs){
  if(!id(j.id)||!id(j.bodyId)||!id(j.sourceId)||!id(j.targetId)||
    !id(j.currentLotId)||!Array.isArray(j.driveIds)||j.driveIds.length<1||
    j.driveIds.length>16||j.driveIds.some(x=>!id(x))||
    !Number.isInteger(j.cursor)||j.cursor<0||j.cursor>j.driveIds.length+1||
    !finite(j.massKg)||j.massKg<=0||j.massKg>MAX_PACKET_KG||
    !finite(j.lastS)||!finite(j.remainingS)||!['ACTIVE','DELIVERED'].includes(j.status)||
    (j.status==='DELIVERED'&&j.cursor!==j.driveIds.length+1))
   throw Error('8H corrupt material custody packet');
 }
 if(new Set(state.jobs.map(j=>j.id)).size!==state.jobs.length)
  throw Error('8H duplicate conveyor packet identities');
 const list=()=>cp(state.jobs),snapshot=()=>cp(state);
 const byId=x=>state.jobs.find(j=>j.id===x);
 function equipment(physical8a,materials8a,sourceId,targetId,driveIds,bodyId){
  if(!root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create)
   throw Error('8H original physical and 8A ledger owners missing');
  const phys=root.StarfallPhysical8A.create(physical8a),
   materials=root.StarfallMaterials8A.create(materials8a);
  const assets=[sourceId,...driveIds,targetId].map(x=>phys.get(x));
  if(assets.some(a=>!a||a.location?.kind!=='surface'||a.location.bodyId!==bodyId||
    a.condition<.5||a.state?.enabled!==true))
   throw Error('8H conveyor stations must be installed, healthy and same-world');
  if(assets[0].state?.station!=='cargo_depot'||
    !(assets.at(-1).state?.station==='cargo_depot'||
     ['reduction_furnace','glass_furnace','high_temp_cell','electrolyzer','catalytic_reactor']
      .includes(assets.at(-1).state?.station))||
    assets.slice(1,-1).some(a=>a.state?.station!=='conveyor_drive'||
     a.state?.kitMaterialId!=='plant_kit_conveyor_drive'||a.massKg!==180))
   throw Error('8H original certified dry depot and manufactured conveyor drive required');
  const containers=assets.map((a,i)=>{
   const isPlant=i===assets.length-1&&a.state.station!=='cargo_depot';
   const containerId=isPlant?a.state.dryFeedContainerId:a.state.containerId;
   const c=materials.containers().find(v=>v.id===containerId&&v.ownerId===a.id);
   if(!c||!new RegExp(isPlant?'dry-reactant feed hopper':
     i===0||i===assets.length-1?'dry-solid cargo dock':'dry-solid conveyor tray','i').test(c.kind)||
     isPlant&&(containerId!=='plantfeed8h:'+a.id||
      Math.abs(c.maxMassKg-120)>EPS||Math.abs(c.maxVolumeM3-.20)>EPS))
    throw Error('8H original dry cargo ports and bounded conveyor trays missing');
   return c;
  });
  return{assets,containers,materials};
 }
 const paid=(network)=>network.eligible===true&&
  network.fault==='TRANSFER_ENGINE_NOT_INSTALLED'&&network.throughputKgS===0;
 function start({id:packetId,sourceLotId,sourceId,targetId,driveIds,massKg,
   bodyId,bodyRadius,timeS,physical8a,materials8a,outpost5,powerReport}){
  if(!id(packetId)||!id(sourceLotId)||!id(sourceId)||!id(targetId)||
   !id(bodyId)||!Array.isArray(driveIds)||driveIds.length<1||
   driveIds.length>16||driveIds.some(x=>!id(x))||
   new Set(driveIds).size!==driveIds.length||
   !finite(massKg)||massKg<=0||massKg>MAX_PACKET_KG||
   !finite(bodyRadius)||bodyRadius<=0||!finite(timeS))
   throw Error('8H invalid finite dry cargo packet request');
  if(byId(packetId)||state.jobs.length>=200||state.jobs.some(x=>x.status==='ACTIVE'))
   throw Error('8H original conveyor line already busy or packet ID replayed');
  if(!outpost5||!finite(outpost5.lastTick)||Math.abs(outpost5.lastTick-timeS)>EPS)
   throw Error('8H original T02 power clock must match reservation clock');
  const n=root.StarfallPoweredNetwork8H;
  if(!n?.inspect)throw Error('8H certified installed network interlock unavailable');
  const inspection=n.inspect({physical8a,materials8a,outpost5,powerReport,
   sourceId,targetId,driveIds,bodyId,bodyRadius,timeS});
  if(!paid(inspection))throw Error('8H physically wired and currently T02-powered conveyors required: '+inspection.fault);
  const {assets,containers,materials}=equipment(physical8a,materials8a,sourceId,targetId,driveIds,bodyId);
  const lot=materials.inventory(containers[0].id).find(l=>l.id===sourceLotId);
  if(!lot||DRY_DENIED.has(lot.materialId)||!finite(lot.massKg)||
    lot.massKg+EPS<massKg)
   throw Error('8H original dry source lot unavailable or unsafe for conveyor');
  const availableVolume=lot.volumeM3*massKg/lot.massKg;
  if(availableVolume>.05+EPS)throw Error('8H physically guarded tray volume too small');
  materials.reserve('8h-belt:'+packetId+':0',sourceLotId,containers[1].id,massKg);
  const first=arc(assets[0].location.local,assets[1].location.local,bodyRadius);
  const job={id:packetId,sourceId,targetId,driveIds:[...driveIds],bodyId,
   bodyRadius,massKg,materialId:lot.materialId,
   currentLotId:sourceLotId,cursor:0,remainingS:Math.max(MIN_LEG_S,first/SPEED_M_S),
   lastS:timeS,status:'ACTIVE',createdS:timeS,completionS:null};
  state.jobs.push(job);
  return{packets:snapshot(),materials8a:materials.snapshot(),receipt:{
   id:packetId,status:'RESERVED',sourceLotId,massKg,
   firstPhysicalContainer:containers[1].id,energyGrantedJ:0}};
 }
 function advance({id:packetId,timeS,dtS,physical8a,materials8a,outpost5,
   body,starPos,luminosityW,metresPerUnit=1}){
  const j=byId(packetId);
  if(!j||j.status!=='ACTIVE')throw Error('8H no active original conveyor packet to advance');
  if(!finite(timeS)||!finite(dtS)||dtS<=0||dtS>MAX_DT_S||
   Math.abs(timeS-j.lastS-dtS)>EPS||body?.id!==j.bodyId||
   !Array.isArray(starPos)||starPos.length!==3||!starPos.every(Number.isFinite)||
   !finite(luminosityW)||luminosityW<=0||
   !finite(metresPerUnit)||metresPerUnit<=0||
   !outpost5||!finite(outpost5.lastTick)||Math.abs(outpost5.lastTick-j.lastS)>EPS)
   throw Error('8H T02-powered conveyor must advance once per bounded source-owned clock step');
  if(!root.StarfallOutposts?.Store||!root.StarfallPowerLedgerT02?.grid)
   throw Error('8H real T02 electrical solver required');
  const {assets,containers,materials}=equipment(
    physical8a,materials8a,j.sourceId,j.targetId,j.driveIds,j.bodyId);
  const originalMass=materials.inventory().reduce((s,x)=>s+x.massKg,0);
  const store=new root.StarfallOutposts.Store(outpost5.seed,outpost5);
  const report=root.StarfallPowerLedgerT02.grid(store,body,starPos,luminosityW,timeS,dtS,metresPerUnit);
  store.lastTick=timeS;
  const wired=root.StarfallPoweredNetwork8H.inspect({
   physical8a,materials8a,outpost5:store.serialize(),powerReport:report,
   bodyId:j.bodyId,bodyRadius:j.bodyRadius,sourceId:j.sourceId,
   targetId:j.targetId,driveIds:j.driveIds,timeS});
  const next=cp(j),powerJ=paid(wired)?wired.powerW*dtS:0;
  let reason=paid(wired)?'MOVING':'PAUSED_'+wired.fault;
  let receipt=null;
  if(paid(wired)){
   next.remainingS=Math.max(0,next.remainingS-dtS);
   if(next.remainingS<=EPS){
    const destination=containers[next.cursor+1],
     opId='8h-belt:'+packetId+':'+next.cursor;
    try{
     const source=materials.inventory().find(x=>x.id===next.currentLotId);
     if(!source||source.containerId!==containers[next.cursor].id||
       source.materialId!==next.materialId||source.massKg+EPS<next.massKg)
      throw Error('source lot custody changed');
     materials.reserve(opId,source.id,destination.id,next.massKg);
     receipt=materials.commit(opId);
     next.currentLotId=receipt.outputLotId;
     next.cursor++;
     if(next.cursor===containers.length-1){
      next.status='DELIVERED';next.completionS=timeS;reason='DELIVERED';
     }else{
      const dist=arc(assets[next.cursor].location.local,
       assets[next.cursor+1].location.local,j.bodyRadius);
      next.remainingS=Math.max(MIN_LEG_S,dist/SPEED_M_S);reason='HOP_COMMITTED';
     }
    }catch(e){reason='HELD_CAPACITY_OR_CUSTODY: '+String(e.message||e);}
   }
  }
  next.lastS=timeS;
  const afterMass=materials.inventory().reduce((s,x)=>s+x.massKg,0);
  if(Math.abs(afterMass-originalMass)>EPS)
   throw Error('8H original conveyor mass conservation violated');
  state.jobs[state.jobs.findIndex(x=>x.id===packetId)]=next;
  return{packets:snapshot(),materials8a:materials.snapshot(),outpost5:store.serialize(),
   network:wired,report,status:reason,receipt:receipt?cp(receipt):null,
   sourceEnergyServedJ:powerJ,stage:next.cursor,remainingS:next.remainingS,
   materialMassKg:next.massKg,completed:next.status==='DELIVERED'};
 }
 return Object.freeze({snapshot,list,start,advance});
}
root.StarfallConveyorPackets8H=Object.freeze({create,SPEED_M_S,MAX_DT_S,MAX_PACKET_KG});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallConveyorPackets8H;
})(typeof globalThis!=='undefined'?globalThis:this);
