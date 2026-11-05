/* STARFALL 8H — real paid 8E chemical station <-> rated vessel flange.
 *
 * A gaseous chemical input or output may NEVER traverse an implied 75 scene
 * unit graph edge. Its adjacent physical route is station → genuine factory-
 * paid 320 kg pressure pipeline → genuine factory-paid gas vessel. The same
 * exact pipe must have its real native T02 420W pump port wired and served by
 * an existing PAID original T02 solar/battery/generator source at the current
 * source-owned clock. No new gas, stock, pump, time or electricity exists here.
 *
 * This is a safety gate for the existing batch chemical process. It does NOT
 * yet meter transient plant↔pipe↔vessel gas holdup at batch completion:
 * original 8A chemistry remains the sole source-owned batch material owner.
 */
(function(root){'use strict';
const EPS=1e-5,MAX_LEG_SCENE=12,MAX_REPORT_AGE_S=10,POWER_W=420;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const unit=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,
 a.reduce((sum,x,i)=>sum+x*b[i],0))))*r;
function inspect({physical8a,materials8a,outpost5,powerReport,stationId,
 vesselId,bodyId,bodyRadius,timeS,materialId}={}){
 if(!physical8a||physical8a.schema!==1||
  !Array.isArray(physical8a.assets)||!Array.isArray(physical8a.transfers)||
  !materials8a||materials8a.schema!==1||
  !Array.isArray(materials8a.lots)||!Array.isArray(materials8a.containers)||
  !valid(stationId)||!valid(vesselId)||!valid(bodyId)||!valid(materialId)||
  !finite(bodyRadius)||bodyRadius<=0||!finite(timeS))
  throw Error('8H requires authentic same-world 8A station, gas stock and current native T02 owners');
 const assets=new Map(physical8a.assets.map(a=>[a.id,a])),
  station=assets.get(stationId),vessel=assets.get(vesselId);
 if(!station||station.type!=='industrial_plant'||
    station.state?.station==='pressure_pipeline'||
    !valid(station.state?.kitMaterialId)||
    station.condition<.8||station.state?.enabled!==true||
    !vessel||vessel.type!=='industrial_vessel'||
    vessel.state?.materialId!==materialId||
    vessel.condition<.8||vessel.state?.enabled!==true||
    vessel.state?.ratedPressurePa<5e6)
  throw Error('8H chemical manifold requires intact originally installed real 8E station and certified same-species gas vessel');
 const certified=a=>physical8a.transfers.some(t=>
  t.action==='INSTALL'&&t.status==='COMMITTED'&&t.assetId===a.id&&
  valid(t.sourceLotId)&&finite(t.massKg)&&
  Math.abs(t.massKg-a.massKg)<EPS);
 const same=a=>a.location?.kind==='surface'&&a.location.bodyId===bodyId&&
   unit(a.location.local);
 if(!same(station)||!same(vessel)||!certified(station)||!certified(vessel))
  throw Error('8H missing original PAID same-world station or vessel installation receipt');
 const vesselBin=materials8a.containers.find(c=>
  c.id===vessel.state?.containerId&&c.ownerId===vessel.id&&
  /gas/i.test(c.kind)&&finite(c.maxMassKg)&&finite(c.maxVolumeM3)&&
  c.maxMassKg>0&&c.maxVolumeM3>0);
 if(!vesselBin||materials8a.lots.some(l=>
  l.containerId===vesselBin.id&&l.materialId!==materialId))
  throw Error('8H gas manifold requires original bounded single-species rated 8A storage');
 // Original idle T02 sites sample the sun at a paid interval MIDPOINT.
 // Active physical 8H batches instead use exact <=10s END timestamps.
 // A start/quote at 100x must accept ONLY a very recently completed,
 // bounded native 120s midpoint pulse whose ORIGINAL persisted end-of-
 // interval clock equals the current world time; never invent an unbilled
 // power report from an arbitrary stale source.
 const nativeEnd=outpost5?.lastPoweredAt?.[bodyId];
 const originalCompletedMidpoint=finite(nativeEnd)&&
  Math.abs(nativeEnd-timeS)<=EPS&&
  finite(powerReport?.dtS)&&powerReport.dtS>0&&powerReport.dtS<=120+EPS&&
  finite(powerReport?.simulatedAtS)&&
  Math.abs(powerReport.simulatedAtS-(nativeEnd-powerReport.dtS/2))<=EPS;
 const freshLastReport=finite(powerReport?.simulatedAtS)&&
  powerReport.simulatedAtS<=timeS+EPS&&
  timeS-powerReport.simulatedAtS<=MAX_REPORT_AGE_S+EPS;
 if(!outpost5||outpost5.schema!==1||
  !Array.isArray(outpost5.items)||!Array.isArray(outpost5.wires)||
  !powerReport||powerReport.schema!==1||
  powerReport.bodyId!==bodyId||!(freshLastReport||originalCompletedMidpoint))
  throw Error('8H chemical manifold needs a fresh ORIGINAL PAID native T02 power report or exact paid bounded midpoint interval');
 const nodes=new Map(outpost5.items.filter(x=>x.bodyId===bodyId).map(x=>[x.id,x]));
 const wires=outpost5.wires,byId=powerReport.byId||{};
 const candidates=physical8a.assets.filter(a=>
  a.type==='industrial_plant'&&a.state?.station==='pressure_pipeline'&&
  a.state?.kitMaterialId==='plant_kit_pressure_pipeline'&&
  a.state?.ratedPressurePa>=8e6&&a.state?.enabled===true&&
  a.massKg===320&&a.condition>=.8&&same(a)&&certified(a)).sort((a,b)=>
   a.id.localeCompare(b.id));
 const reasons=[];
 for(const pipe of candidates){
  const lengths=[arc(station.location.local,pipe.location.local,bodyRadius),
   arc(pipe.location.local,vessel.location.local,bodyRadius)];
  if(lengths.some(d=>d>MAX_LEG_SCENE+EPS||d<.01)){continue;}
  const pipeBin=materials8a.containers.find(c=>c.id===pipe.state.containerId&&
   c.ownerId===pipe.id&&/gas pipe/i.test(c.kind)&&
   Math.abs(c.maxMassKg-25)<EPS&&Math.abs(c.maxVolumeM3-.08)<EPS);
  if(!pipeBin){reasons.push('missing genuine original 8A 80L/25kg pipe holdup');continue;}
  const portId=pipe.state?.t02LoadId,item=nodes.get(portId),watts=byId[portId];
  if(!valid(portId)||!item||item.kind!=='pressure_pipeline_pump'||
    item.enabled!==true||item.condition<.8||!unit(item.local)||
    arc(item.local,pipe.location.local,bodyRadius)>.01||
    !watts||watts.power!==true||watts.bodyId!==bodyId||
    !finite(watts.servedW)||watts.servedW+EPS<POWER_W||
    !Array.isArray(watts.sourceIds)||!watts.sourceIds.length||
    watts.busId==null){
   reasons.push('physical 8MPa pump has NO recent ORIGINAL served 420W native T02 report');
   continue;
  }
  const adj=new Map();
  for(const w of wires){
   if(!nodes.has(w.a)||!nodes.has(w.b)||w.a===w.b)continue;
   if(!adj.has(w.a))adj.set(w.a,[]);
   if(!adj.has(w.b))adj.set(w.b,[]);
   adj.get(w.a).push(w.b);adj.get(w.b).push(w.a);
  }
  const reached=new Set([portId]),queue=[portId];
  for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[])
   if(!reached.has(next)){reached.add(next);queue.push(next);}
  const truePowerSource=watts.sourceIds.find(id=>
    reached.has(id)&&nodes.has(id)&&
    ['solar','battery','generator'].includes(nodes.get(id).kind)&&
    nodes.get(id).enabled===true&&nodes.get(id).condition>=.8);
  if(!truePowerSource){reasons.push('original 420W load not WIRED to reported actual T02 source');continue;}
  return Object.freeze({schema:1,status:'ORIGINAL_PHYSICAL_FLANGE_AND_POWER_VERIFIED',
   bodyId,stationId,vesselId,materialId,pipeId:pipe.id,
   originalVesselContainerId:vesselBin.id,originalPipeContainerId:pipeBin.id,
   sourcePortId:portId,paidPowerW:POWER_W,sourceId:truePowerSource,
   busId:watts.busId,reportAtS:powerReport.simulatedAtS,
   segmentMetersScene:lengths,gasCreatedKg:0,energyCreatedJ:0,
   note:'Physical rated station-to-pipe-to-vessel path and live original native T02; batch chemical outputs still use the original 8A lot owner, not transient flow modeling.'});
 }
 throw Error('8H chemical gas vessel is NOT physically connected by a PAID manufactured 8MPa pressure pipeline (two <=12 scene-unit flanges) with 420W genuine native T02 wiring: '+(reasons[0]||'no eligible same-world installed pipe'));
}
root.StarfallIndustrialGasManifold8H=Object.freeze({inspect,MAX_LEG_SCENE,POWER_W,MAX_REPORT_AGE_S});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallIndustrialGasManifold8H;
})(typeof globalThis!=='undefined'?globalThis:this);
