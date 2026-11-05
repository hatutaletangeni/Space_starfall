/* STARFALL Update 8H — physically confined, source-owned compressed gas
 * packets. A full shipment has TWO real charged, timed custody hops:
 * installed 8E rated vessel → manufactured EMPTY 80 L pipe → separate
 * installed 8E rated vessel. Only original 8A reserve+commit moves gas.
 *
 * Original T02 (not this module) owns power, solar, battery and the clock.
 * observe() consumes its ALREADY-PAID 420 W native report; it NEVER runs grid
 * or grants free Joules. Returned 8A, packet and the already-charged original
 * outpost5 must be atomically persisted by caller before live state swapping.
 *
 * Ideal-gas isothermal 293.15 K pressure is an educational model, not a
 * pressure-vessel design standard. No simulated hidden leakage or magically
 * unaccounted gas: damaged pumps HOLD closed, with gas trapped physically.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6,R=8.314462618,
 TEMP_K=293.15,MAX_DT_S=10,MAX_PACKET_KG=5,MAX_LEG_M=12;
const MOL=Object.freeze({
 oxygen:.031998,nitrogen:.028014,hydrogen:.00201588,methane:.016043,
 carbon_dioxide:.0440095,carbon_monoxide:.0280101,sulfur_dioxide:.064066
});
const id=x=>typeof x==='string'&&x.length>0&&x.length<=112;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const unit=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,
 a.reduce((sum,x,i)=>sum+x*b[i],0))))*r;
function pressure(lots,containerM3,more={}){
 if(!finite(containerM3)||containerM3<=0)
  throw Error('8H pressure calculation requires finite physical gas volume');
 let n=0;
 for(const lot of lots){const mm=MOL[lot.materialId];
  if(!mm||!finite(lot.massKg)||!finite(lot.volumeM3))
   throw Error('8H source owner contains unsupported or invalid gas');
  n+=lot.massKg/mm;
 }
 if(more.materialId){if(!MOL[more.materialId]||!finite(more.massKg))
  throw Error('8H unsupported gas or invalid packet mass');
  n+=more.massKg/MOL[more.materialId];
 }
 return n*R*TEMP_K/containerM3;
}
function create(saved){
 const state=saved==null?{schema:1,jobs:[]}:cp(saved);
 if(state.schema!==1||!Array.isArray(state.jobs)||state.jobs.length>200)
  throw Error('8H invalid original compressed gas packet archive');
 const ids=new Set();
 for(const j of state.jobs){
  if(!id(j.id)||ids.has(j.id)||!id(j.bodyId)||!id(j.sourceId)||
   !id(j.pipeId)||!id(j.targetId)||!id(j.currentLotId)||
   !id(j.materialId)||!MOL[j.materialId]||
   !finite(j.massKg)||j.massKg<=0||j.massKg>MAX_PACKET_KG||
   !Number.isInteger(j.stage)||j.stage<0||j.stage>2||
   !finite(j.remainingS)||!finite(j.lastS)||
   !['ACTIVE','DELIVERED'].includes(j.status)||
   (j.status==='DELIVERED'&&j.stage!==2))
    throw Error('8H corrupt finite pressure packet custody');
  ids.add(j.id);
 }
 function snapshot(){return cp(state);}
 function list(){return cp(state.jobs);}
 function installed(physical8a,materials8a,bodyId,bodyRadius,
    sourceId,pipeId,targetId){
  if(!root.StarfallPhysical8A?.create||!root.StarfallMaterials8A?.create)
   throw Error('8H original 8A material/physical owners missing');
  if(!id(bodyId)||!finite(bodyRadius)||bodyRadius<=0||
    ![sourceId,pipeId,targetId].every(id)||
    new Set([sourceId,pipeId,targetId]).size!==3)
   throw Error('8H gas route requires distinct same-world physical assets');
  const phys=root.StarfallPhysical8A.create(physical8a),
   ledger=root.StarfallMaterials8A.create(materials8a),
   assets=[sourceId,pipeId,targetId].map(x=>phys.get(x));
  if(assets.some(a=>!a||a.location?.kind!=='surface'||
    a.location.bodyId!==bodyId||!unit(a.location.local)||
    a.condition<.8||a.state?.enabled!==true))
   throw Error('8H rated vessel/pipe damaged, disabled, mobile or not on original world');
  const [src,pipe,dst]=assets;
  if(src.type!=='industrial_vessel'||dst.type!=='industrial_vessel'||
     pipe.type!=='industrial_plant'||pipe.state?.station!=='pressure_pipeline'||
     pipe.state?.kitMaterialId!=='plant_kit_pressure_pipeline'||
     pipe.massKg!==320||pipe.state?.ratedPressurePa<8e6||
     !id(pipe.state?.t02LoadId))
    throw Error('8H genuine rated source/destination pressure vessels and installed 320kg T02 pump required');
  if(!MOL[src.state?.materialId]||
    src.state?.materialId!==dst.state?.materialId||
    src.state.ratedPressurePa<5e6||dst.state.ratedPressurePa<5e6||
    !finite(src.state.ratedPressurePa)||!finite(dst.state.ratedPressurePa))
   throw Error('8H matching supported gas, rated source and rated destination required');
  for(const a of assets){
   if(!physical8a?.transfers?.some(t=>t.action==='INSTALL'&&
     t.status==='COMMITTED'&&t.assetId===a.id&&id(t.sourceLotId)&&
     finite(t.massKg)&&Math.abs(t.massKg-a.massKg)<EPS))
    throw Error('8H certified, actually consumed installation kit receipt missing');
  }
  const containers=assets.map((a,i)=>ledger.containers().find(c=>
   c.id===a.state.containerId&&c.ownerId===a.id&&
   (i===1?/gas pipe/i:/gas/i).test(c.kind)));
  if(containers.some(x=>!x))
   throw Error('8H original source-owned 8A gas vessel/pipe hold-up container missing');
  if(Math.abs(containers[1].maxMassKg-25)>EPS||
    Math.abs(containers[1].maxVolumeM3-.08)>EPS)
   throw Error('8H pressure pipe cannot exceed its certified physical 25kg/80L hold-up');
  const lengths=[
   arc(src.location.local,pipe.location.local,bodyRadius),
   arc(pipe.location.local,dst.location.local,bodyRadius)];
  if(lengths.some(x=>x>MAX_LEG_M+EPS||x<.01))
   throw Error('8H rated flanged gas ports physically disconnected (>12 scene units)');
  for(const a of [src,dst]){
   const bin=containers[a===src?0:2],ls=ledger.inventory(bin.id);
   if(ls.some(x=>x.materialId!==src.state.materialId||
      !finite(x.volumeM3)||x.volumeM3<0))
    throw Error('8H source/destination vessel gas mixed or contaminated');
   if(pressure(ls,Math.max(a.volumeM3,.001))>a.state.ratedPressurePa+EPS)
    throw Error('8H source or destination gas vessel exceeds certified physical pressure');
  }
  const resident=ledger.inventory(containers[1].id);
  if(resident.some(x=>x.materialId!==src.state.materialId))
   throw Error('8H pipe has incompatible previous gas, must be emptied first');
  if(pressure(resident,containers[1].maxVolumeM3)>pipe.state.ratedPressurePa+EPS)
   throw Error('8H gas pipe pressure exceeds original mechanical rating');
  return{ledger,assets,containers,lengths,materialId:src.state.materialId};
 }
 function powered({outpost5,powerReport,pipe,bodyId,timeS}){
  if(!outpost5||outpost5.schema!==1||!Array.isArray(outpost5.items)||
    !Array.isArray(outpost5.wires)||!powerReport||
    powerReport.schema!==1||powerReport.bodyId!==bodyId||
    !finite(powerReport.simulatedAtS)||Math.abs(powerReport.simulatedAtS-timeS)>EPS)
   return{eligible:false,fault:'NO_AUTHENTIC_NATIVE_T02_REPORT'};
  const portId=pipe.state?.t02LoadId;
  const item=outpost5.items.find(x=>x.id===portId&&x.bodyId===bodyId);
  const report=powerReport.byId?.[portId];
  if(!item||item.kind!=='pressure_pipeline_pump'||
     item.enabled!==true||item.condition<.8||
     !unit(item.local)||arc(item.local,pipe.location.local,1)>.01||
     !report||report.power!==true||report.bodyId!==bodyId||
     !finite(report.servedW)||report.servedW<420-EPS||
     !Array.isArray(report.sourceIds)||!report.sourceIds.length||
     report.busId==null)
   return{eligible:false,fault:'PUMP_LOAD_UNPOWERED_OR_DAMAGED'};
  const nodes=new Map(outpost5.items.filter(x=>x.bodyId===bodyId).map(x=>[x.id,x]));
  const adj=new Map();
  for(const wire of outpost5.wires)if(nodes.has(wire.a)&&nodes.has(wire.b)){
   if(!adj.has(wire.a))adj.set(wire.a,[]);
   if(!adj.has(wire.b))adj.set(wire.b,[]);
   adj.get(wire.a).push(wire.b);adj.get(wire.b).push(wire.a);
  }
  const seen=new Set([portId]),queue=[portId];
  for(let i=0;i<queue.length;i++)for(const v of adj.get(queue[i])||[])
   if(!seen.has(v)){seen.add(v);queue.push(v);}
  if(!report.sourceIds.some(x=>seen.has(x)&&nodes.has(x)&&
    ['solar','battery','generator'].includes(nodes.get(x).kind)))
   return{eligible:false,fault:'NO_WIRED_PAID_T02_SOURCE'};
  return{eligible:true,fault:null,powerW:report.servedW,loadId:portId,
   busId:report.busId,sourceIds:[...report.sourceIds]};
 }
 function start({id:jobId,sourceLotId,sourceId,pipeId,targetId,
   massKg,bodyId,bodyRadius,timeS,physical8a,materials8a,
   outpost5,powerReport,operatorLocal}={}){
  if(!id(jobId)||!id(sourceLotId)||!finite(massKg)||
    massKg<=0||massKg>MAX_PACKET_KG||!finite(timeS)||!unit(operatorLocal))
   throw Error('8H requires bounded, on-foot local pressure gas packet');
  if(state.jobs.some(j=>j.id===jobId)||state.jobs.length>=200||
     state.jobs.some(j=>j.status==='ACTIVE'))
   throw Error('8H already pumping gas or packet identity replay');
  if(!outpost5||!finite(outpost5.lastTick)||
     Math.abs(outpost5.lastTick-timeS)>EPS)
   throw Error('8H original T02 source clock must equal physical gas reservation time');
  const route=installed(physical8a,materials8a,bodyId,bodyRadius,
   sourceId,pipeId,targetId),[src,pipe,dst]=route.assets,
   [srcBin,pipeBin,dstBin]=route.containers;
  if(arc(pipe.location.local,operatorLocal,bodyRadius)>15)
   throw Error('8H operator must physically stand within 15 scene units of real pipe');
  const source=route.ledger.inventory(srcBin.id).find(x=>x.id===sourceLotId);
  if(!source||source.materialId!==route.materialId||
    source.massKg+EPS<massKg||!finite(source.grade)||source.grade<.98)
   throw Error('8H missing genuinely produced certified single-species source gas');
  if(route.ledger.inventory(pipeBin.id).length)
   throw Error('8H pipeline must be genuinely EMPTY before a new gas packet');
  const pipeVolume=source.volumeM3*massKg/source.massKg;
  if(pipeVolume>pipeBin.maxVolumeM3+EPS||massKg>pipeBin.maxMassKg)
   throw Error('8H actual finite 80L/25kg pipeline cannot hold this compressed volume');
  const p=pressure([],pipeBin.maxVolumeM3,{materialId:source.materialId,massKg});
  if(p>pipe.state.ratedPressurePa+EPS)
   throw Error('8H isothermal line packet pressure exceeds 8MPa pipe rating');
  const receiverPressure=pressure(route.ledger.inventory(dstBin.id),
   Math.max(dst.volumeM3,.001),{materialId:source.materialId,massKg});
  if(receiverPressure>dst.state.ratedPressurePa+EPS)
   throw Error('8H destination vessel would exceed its rated pressure');
  // 8A validates both real original lot mass and free physical tray capacity.
  route.ledger.reserve('8h-gas:'+jobId+':0',source.id,pipeBin.id,massKg);
  const report=powered({outpost5,powerReport,pipe,bodyId,timeS});
  if(!report.eligible)
   throw Error('8H gas pump requires actual current native T02 420W wiring: '+report.fault);
  const j={id:jobId,sourceId,pipeId,targetId,bodyId,
   materialId:source.materialId,massKg,currentLotId:source.id,
   stage:0,lastS:timeS,remainingS:Math.max(4,route.lengths[0]+massKg/0.5),
   status:'ACTIVE',createdS:timeS,completionS:null};
  state.jobs.push(j);
  return{packets:snapshot(),materials8a:route.ledger.snapshot(),
   receipt:{id:jobId,status:'RESERVED',sourceLotId:source.id,
    materialId:j.materialId,massKg,gasCreatedKg:0,
    initialPipePressurePa:p,energizedByNativeT02:report.loadId}};
 }
 function observe({packets,materials8a,physical8a,outpost5,powerReport,
   bodyId,bodyRadius,timeS}={}){
  const engine=create(packets),original=engine.snapshot();
  const active=original.jobs.filter(j=>j.status==='ACTIVE'&&j.bodyId===bodyId);
  if(!active.length)return{changed:false,reason:'NO_ACTIVE_GAS_PACKET',packets:original,materials8a};
  if(active.length!==1)throw Error('8H multiple same-world source gas jobs cannot share pump');
  const job=active[0];
  if(!finite(timeS)||!finite(bodyRadius)||bodyRadius<=0||!powerReport||
    !finite(powerReport.dtS)||powerReport.dtS<=0||
    !finite(powerReport.simulatedAtS)||Math.abs(powerReport.simulatedAtS-timeS)>EPS||
    powerReport.bodyId!==bodyId)
   throw Error('8H actual native T02 paid gas clock report required');
  const dt=timeS-job.lastS;
  if(dt<=EPS)return{changed:false,reason:'DUPLICATE_OR_OLD_T02_TICK',
   packets:original,materials8a};
  const next=cp(original),current=next.jobs.find(x=>x.id===job.id);
  if(dt>MAX_DT_S+EPS||dt>powerReport.dtS+EPS){
   current.lastS=timeS;
   return{changed:true,reason:'PAUSED_UNOBSERVED_CLOCK',
    packets:next,materials8a,additionalElectricalDebitJ:0};
  }
  const route=installed(physical8a,materials8a,bodyId,bodyRadius,
   current.sourceId,current.pipeId,current.targetId);
  const [src,pipe,dst]=route.assets,[srcBin,pipeBin,dstBin]=route.containers;
  const poweredReport=powered({outpost5,powerReport,pipe,bodyId,timeS});
  const massBefore=route.ledger.inventory().reduce((s,x)=>s+x.massKg,0);
  let status=poweredReport.eligible?'MOVING':'PAUSED_'+poweredReport.fault,
   receipt=null,pressurePa=pressure(route.ledger.inventory(pipeBin.id),pipeBin.maxVolumeM3);
  if(poweredReport.eligible){
   current.remainingS=Math.max(0,current.remainingS-dt);
   if(current.remainingS<=EPS){
    const from=current.stage===0?srcBin:pipeBin,
     to=current.stage===0?pipeBin:dstBin;
    const lot=route.ledger.inventory(from.id).find(x=>x.id===current.currentLotId);
    if(!lot||lot.materialId!==current.materialId||
      lot.massKg+EPS<current.massKg)
     throw Error('8H original compressed gas custody lot changed unexpectedly');
    const extraPressure=pressure(route.ledger.inventory(to.id),
     to===pipeBin?pipeBin.maxVolumeM3:Math.max(dst.volumeM3,.001),
     {materialId:current.materialId,massKg:current.massKg});
    const rating=to===pipeBin?pipe.state.ratedPressurePa:dst.state.ratedPressurePa;
    if(extraPressure>rating+EPS)
     status='HELD_DESTINATION_PRESSURE_RATING';
    else{
     try{
      const opId='8h-gas:'+current.id+':'+current.stage;
      route.ledger.reserve(opId,lot.id,to.id,current.massKg);
      receipt=route.ledger.commit(opId);
      current.currentLotId=receipt.outputLotId;current.stage++;
      pressurePa=pressure(route.ledger.inventory(pipeBin.id),pipeBin.maxVolumeM3);
      if(current.stage===2){current.status='DELIVERED';
       current.completionS=timeS;status='DELIVERED';}
      else{current.remainingS=Math.max(4,route.lengths[1]+current.massKg/0.5);
       status='PHYSICAL_PIPE_HOP_COMMITTED';}
     }catch(e){status='HELD_CAPACITY_OR_CUSTODY: '+String(e.message||e);}
    }
   }
  }
  current.lastS=timeS;
  const after=route.ledger.inventory().reduce((s,x)=>s+x.massKg,0);
  if(Math.abs(after-massBefore)>EPS)
   throw Error('8H gas source-owned original 8A mass conservation violated');
  return{changed:true,packets:next,materials8a:route.ledger.snapshot(),
   status,receipt:receipt?cp(receipt):null,pipePressurePa:pressurePa,
   stage:current.stage,remainingS:current.remainingS,
   materialMassKg:current.massKg,
   originalGridAlreadyPaidJ:poweredReport.eligible?poweredReport.powerW*dt:0,
   additionalElectricalDebitJ:0,gasCreatedKg:0,gasVentedKg:0};
 }
 return Object.freeze({snapshot,list,start,observe});
}
root.StarfallPressureGasPackets8H=Object.freeze({
 create,pressure,MOL,TEMP_K,MAX_DT_S,MAX_PACKET_KG});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallPressureGasPackets8H;
})(typeof globalThis!=='undefined'?globalThis:this);
