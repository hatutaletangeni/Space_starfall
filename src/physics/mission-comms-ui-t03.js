/* STARFALL T03 — live adapter for the *existing* 7D/7C/7F stores.
 * Ground, rover, satellite and photo data are NOT copied into this ledger.
 * Local radios use actual body geometry, sunlight, source charge and existing
 * outpost power reports. No fabricated interplanetary or unlimited receiver.
 */
(function(root){'use strict';
const T=root.StarfallTransportT03,RT=root.StarfallRuntime,O=root.StarfallOutposts,
 G=root.StarfallGroundOps7D,S=root.StarfallSatelliteOps7C,L=root.StarfallLaunch,
 UI=root.StarfallLaunchUI,P=root.StarfallPhysics;
if(!T||!RT||!O||!G||!S||!L||!UI)return;
const seed=RT.galaxy.seed,raw=root.SF.load().commsT03;
const transport=new T.Transport(seed,RT.time,raw);
let serial=raw?.schema===1&&raw.seed===seed&&Number.isSafeInteger(raw.serial)?raw.serial:0;
let dirty=false,stamp=0,lastWarning='';
const sat=id=>UI.store.satellites.find(x=>x.id===id);
const rover=id=>UI.store.rovers.find(x=>x.id===id);
const sourcePhoto=id=>root.StarfallImagingUI7F?.store?.get(id);
const finite=Number.isFinite;
const copy=x=>JSON.parse(JSON.stringify(x));
const calcBody=(bodyId,t)=>{
 const resolver=root.StarfallMissionOperationsUI?.resolveBody;
 return resolver?.(bodyId,t)||RT.galaxy.byId.get(bodyId)||null;
};
function shipNode(body,t){
 const ctx=RT.outpostContext(),pose=RT.engineeringAssetPoses()?.shipPose,v=RT.vehicleStore.get('ship');
 if(!ctx.landed||ctx.bodyId!==body.id||!pose||pose.bodyId!==body.id||!pose.local)return null;
 // Compatibility: old ships are allowed their already-installed emergency
 // radio despite powerEnabled=false. The actual ship battery still pays.
 if(v.state.energyJ<100)return null;
 const rad=O.rotate(pose.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 const position=O.V.add(body.position,O.V.mul(rad,body.radius+12));
 return{id:'starfall-ship',kind:'ship-radio',bodyId:body.id,position,rangeScene:45,
  bandwidthBps:128000,energyJ:v.state.energyJ,txPowerW:60};
}
function towerNodes(body){
 return (root.StarfallOutpostUI?.store?.items||[]).filter(x=>x.kind==='antenna'&&x.bodyId===body.id&&x.enabled!==false&&x.condition>.02
  &&root.StarfallOutpostUI.powerReports.get(body.id)?.byId?.[x.id]?.power===true).map(x=>{
   const rad=O.rotate(x.local,body.spinAxis||[0,1,0],body.spinAngle||0);
   return{id:x.id,kind:'wired-radio',bodyId:body.id,position:O.V.add(body.position,O.V.mul(rad,body.radius+Math.max(8,x.height||0))),
    rangeScene:O.SPECS.antenna.rangeScene,bandwidthBps:O.SPECS.antenna.bandwidthBps,txPowerW:24};
  });
}
function roverNode(r,body){
 if(!(r.batteryJ>300)||!Array.isArray(r.local))return null;
 const rad=O.rotate(r.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return{id:r.id,kind:'rover-radio',bodyId:body.id,position:O.V.add(body.position,O.V.mul(rad,body.radius+3)),
  rangeScene:45,bandwidthBps:48000,txPowerW:34};
}
function satelliteNode(s,body,t){
 const ops=S.ensure(s);
 if(!S.relayOperational(s))return null;
 try{
  return{id:s.id,kind:'orbital-radio',bodyId:body.id,position:L.orbit(s,body,t,P.SCENE_METERS_PER_UNIT).position,
   rangeScene:S.CONFIG.radioRangeScene,bandwidthBps:1000000,txPowerW:S.CONFIG.radioW};
 }catch(_){return null;}
}
function hop(a,b,body){
 if(!a||!b||a.bodyId!==b.bodyId)return null;
 const range=Math.min(a.rangeScene,b.rangeScene),h=O.radioLink(a.position,b.position,[{position:body.position,radius:body.radius}],range,P.SCENE_METERS_PER_UNIT);
 if(!h.connected)return null;
 return{connected:true,delayS:Math.max(.001,h.delayS),bandwidthBps:Math.min(a.bandwidthBps,b.bandwidthBps),quality:h.quality,txPowerW:a.txPowerW};
}
function routeFor(packet,at,phase='send'){
 const body=calcBody(packet.bodyId,at);
 if(!body?.position||!finite(body.radius))return{connected:false,reason:'Destination ephemeris is not loaded/cached; no invented radio route'};
 const current=shipNode(body,at),towers=towerNodes(body);
 // A tower can buffer local traffic, but *global* player journal access has
 // no distant interplanetary trunk yet; receiving here requires same-world ship.
 if(!current)return{connected:false,reason:'No present, battery-powered ship ground transceiver on destination body (T08 cross-planet link absent)'};
 const sources=[],targets=[];
 const node=id=>{
  if(id==='starfall-ship')return current;
  if(rover(id))return roverNode(rover(id),body);
  if(sat(id))return satelliteNode(sat(id),body,at);
  return towers.find(x=>x.id===id)||null;
 };
 const source=node(packet.sourceId),dest=node(packet.destId);
 if(!source||!dest)return{connected:false,reason:'Radio endpoint has no energy, is disabled or is outside this real system'};
 if(source.bodyId!==body.id||dest.bodyId!==body.id)return{connected:false,reason:'Cross-body/intersystem radio requires commissioned T08 hardware'};
 const candidates=[];
 function offer(hops){
  const links=[];
  for(let i=0;i<hops.length-1;i++){const q=hop(hops[i],hops[i+1],body);if(!q)return;links.push(q);}
  candidates.push({connected:true,hops:hops.map(x=>x.id),bandwidthBps:Math.min(...links.map(x=>x.bandwidthBps)),
   delayS:links.reduce((n,x)=>n+x.delayS,0),txPowerW:source.txPowerW,reason:hops.map(x=>x.kind).join(' → ')});
 }
 offer([source,dest]);
 for(const tower of towers)if(![source.id,dest.id].includes(tower.id))offer([source,tower,dest]);
 // Relay requires a real, active 7C spacecraft and actual two-hop visibility.
 for(const satellite of UI.store.satellites){
  if(satellite.bodyId!==body.id||[source.id,dest.id].includes(satellite.id))continue;
  const relay=satelliteNode(satellite,body,at);if(relay)offer([source,relay,dest]);
 }
 candidates.sort((a,b)=>a.delayS-b.delayS||b.bandwidthBps-a.bandwidthBps||a.hops.join('').localeCompare(b.hops.join('')));
 return candidates[0]||{connected:false,reason:'No real line of sight across current planetary horizon or relay pass'};
}
function energy(packet,j){
 if(!(j>=0&&finite(j)))return false;
 if(j===0)return true;
 if(packet.sourceId==='starfall-ship'){
  const v=RT.vehicleStore.get('ship');if(v.state.energyJ<j+100)return false;
  RT.vehicleStore.update('ship',{...v.state,energyJ:v.state.energyJ-j});
  return true;
 }
 const r=rover(packet.sourceId);
 if(r){if(r.batteryJ<j+400000)return false;r.batteryJ-=j;return true;}
 const s=sat(packet.sourceId);
 if(s){const o=S.ensure(s);if(o.energyJ<j+150)return false;o.energyJ-=j;s.powerJ=o.energyJ;return true;}
 // Powered antenna already draws T02's modeled 165 W operating load. A later
 // T04 dynamic load model must split TX amplifier demand; never double-debit.
 return !!root.StarfallOutpostUI?.powerReports?.get(packet.bodyId)?.byId?.[packet.sourceId]?.power;
}
function queue({id:pid,type,sourceId,destId,bodyId,systemId,bytes,ref,createdS=RT.time}){
 const packet=transport.queue({id:pid,type,sourceId,destId,bodyId,systemId,bytes,ref,createdS});dirty=true;return packet;
}
function command(r,script,time=RT.time,isStop=false){
 if(!r)throw Error('Select an actual deployed rover');
 const program=isStop?[{op:'STOP'}]:L.validateScript(script);
 if(!program?.length||program.length>24)throw Error('Rover program empty or oversized');
 const payload=JSON.stringify(program);
 const pid='comms-command-'+seed+'-'+(++serial);
 const q=queue({id:pid,type:isStop?'EMERGENCY_STOP':'ROVER_COMMAND',sourceId:'starfall-ship',
  destId:r.id,bodyId:r.bodyId,systemId:r.systemId,bytes:Math.max(64,Math.ceil(payload.length*1.2)),
  ref:{commands:program},createdS:time});
 return{...q,status:q.state,commands:program};
}
function camera(job){if(!job)return null;
 return queue({id:'comms-camera-'+job.id,type:'CAMERA_REQUEST',sourceId:'starfall-ship',
  destId:job.assetId,bodyId:(rover(job.assetId)||sat(job.assetId))?.bodyId||RT.nearest.id,
  systemId:(rover(job.assetId)||sat(job.assetId))?.systemId||RT.nearest.systemId,
  bytes:256,ref:{jobId:job.id},createdS:job.createdS});
}
function photo(p){if(!p)return null;
 return queue({id:'comms-photo-'+p.id,type:'IMAGE_REF',sourceId:p.sourceAssetId,destId:'starfall-ship',
  bodyId:p.bodyId,systemId:p.systemId,bytes:p.bytes,ref:{photoId:p.id},createdS:p.timeS});
}
function observations(at){
 for(const r of UI.store.rovers){
  for(const o of r.ground7d?.queuedObservations||[]){
   queue({id:'comms-obs-'+o.id,type:'ROVER_OBSERVATION',sourceId:r.id,destId:'starfall-ship',
    bodyId:r.bodyId,systemId:r.systemId,bytes:Math.max(180,Math.ceil(JSON.stringify(o).length)),
    ref:{observationId:o.id},createdS:Math.max(0,o.timeS||at)});
  }
 }
}
function satelliteObservation(s,ob,at){
 return queue({id:'comms-sat-'+ob.id,type:'SATELLITE_OBSERVATION',sourceId:s.id,destId:'starfall-ship',
  bodyId:s.bodyId,systemId:s.systemId,bytes:Math.max(1,Number(ob.dataBytes)||85000),
  ref:{observationId:ob.id},createdS:Math.max(0,ob.timeS||at)});
}
function queueSatellite(s,at=RT.time){
 if(!s)throw Error('Select a real satellite');const o=S.ensure(s);
 if(!o.storage.length)throw Error('No onboard observations');
 const arr=o.storage.slice(0,8).map(obs=>satelliteObservation(s,obs,at));dirty=true;return arr;
}
function imagingScan(at){
 const store=root.StarfallImagingUI7F?.store;if(!store)return;
 for(const j of store.jobs)if(j.deliveredS===null)camera(j);
 for(const p of store.photos)if(['queued','transmitting','in-transit'].includes(p.status))photo(p);
}
function receiveEnergy(p){
 const wattS=Math.max(.1,8*p.encodedBytes/Math.max(1,p.lastLink?.bandwidthBps||48000));
 const cost=8*wattS;
 if(p.destId==='starfall-ship'){
  const v=RT.vehicleStore.get('ship');if(v.state.energyJ<cost+100)return false;
  RT.vehicleStore.update('ship',{...v.state,energyJ:v.state.energyJ-cost});return true;
 }
 const r=rover(p.destId);
 if(r){if(r.batteryJ<cost+400000)return false;r.batteryJ-=cost;return true;}
 const s=sat(p.destId);
 if(s){const o=S.ensure(s);if(o.energyJ<cost+150)return false;o.energyJ-=cost;s.powerJ=o.energyJ;return true;}
 return false;
}
function receive(p,at){
 if(['ROVER_COMMAND','EMERGENCY_STOP'].includes(p.type)){
  const r=rover(p.destId);if(!r||!receiveEnergy(p))return false;
  G.acceptPacket(r,p.ref.commands,at,p.id);return true;
 }
 if(p.type==='CAMERA_REQUEST'){
  const store=root.StarfallImagingUI7F?.store;if(!store)return false;
  const job=store.jobs.find(x=>x.id===p.ref.jobId);
  if(!job)return false;
  if(!receiveEnergy(p))return false;
  if(job.deliveredS===null)store.markDelivered(job.id,at);return true;
 }
 if(p.type==='ROVER_OBSERVATION'){
  const r=rover(p.sourceId),o=r?.ground7d?.queuedObservations?.find(x=>x.id===p.ref.observationId);
  if(!r||!o||!root.StarfallScienceUI?.ingestRover)return false;
  if(!receiveEnergy(p))return false;
  root.StarfallScienceUI.ingestRover(o);
  const g=G.migrate(r);if(!g.receivedIds.includes(o.id))g.receivedIds.push(o.id);
  g.queuedObservations=g.queuedObservations.filter(x=>x.id!==o.id);return true;
 }
 if(p.type==='SATELLITE_OBSERVATION'){
  const s=sat(p.sourceId),o=s&&S.ensure(s),obs=o?.storage.find(x=>x.id===p.ref.observationId)||o?.inTransit.find(x=>x.id===p.ref.observationId);
  if(!obs||!root.StarfallScienceUI?.ingestOrbital)return false;
  if(!receiveEnergy(p))return false;
  root.StarfallScienceUI.ingestOrbital({...obs,receivedAtS:at});root.StarfallSurveyUI?.recordOrbitalFootprint?.(obs);
  o.storage=o.storage.filter(x=>x.id!==obs.id);o.inTransit=o.inTransit.filter(x=>x.id!==obs.id);if(!o.received.some(x=>x.id===obs.id))o.received.push({...obs,receivedAtS:at});
  return true;
 }
 if(p.type==='IMAGE_REF'){
  const store=root.StarfallImagingUI7F?.store;if(!store||!store.get(p.ref.photoId))return false;
  if(!receiveEnergy(p))return false;
  // Bytes are received, but the original gallery unlocks only after durable ACK.
  return true;
 }
 return false;
}
function advanceTo(at){
 const out=transport.advanceTo(at,routeFor,receive,energy);
 const gallery=root.StarfallImagingUI7F?.store;
 if(gallery)for(const p of transport.packets){
  if(p.type!=='IMAGE_REF')continue;
  const picture=gallery.get(p.ref.photoId);if(!picture||picture.status==='downlinked')continue;
  if(p.state==='ACKED')gallery.applyTransportProgress(p.ref.photoId,p.bytes,p.bytes,at);
  else if(p.sendBytes>0)gallery.applyTransportProgress(p.ref.photoId,Math.max(0,p.sendBytes-96),p.bytes);
 }
 if(dirty||out.steps){dirty=true;const now=performance.now();if(now-stamp>3000){persist();stamp=now;}}
 return out;
}
function poll(at){
 observations(at);imagingScan(at);
 // Conservatively requeue old 7C in-transit observations through physical T03 routes.
 for(const s of UI.store.satellites){for(const old of S.ensure(s).inTransit)satelliteObservation(s,old,at);}
 // Preserve old saves with old pre-T03 uplink queue instead of silently losing it.
 for(const r of UI.store.rovers){
  const g=G.migrate(r);
  for(const legacy of [...g.pending]){
   queue({id:'comms-legacy-'+legacy.id,type:legacy.commands?.[0]?.op==='STOP'?'EMERGENCY_STOP':'ROVER_COMMAND',
    sourceId:'starfall-ship',destId:r.id,bodyId:r.bodyId,systemId:r.systemId,
    bytes:Math.max(64,JSON.stringify(legacy.commands||[]).length),ref:{commands:legacy.commands||[]},createdS:Math.max(0,legacy.queuedAtS||at)});
  }
  g.pending=[];
 }
}
function persist(){
 const result=root.SF.save({commsT03:{...transport.serialize(),serial},launch7:UI.store.serialize(),
  engineeringVehicles:RT.vehicleStore.serialize(),imaging7f:root.StarfallImagingUI7F?.store?.serialize()||root.SF.load().imaging7f||{}});
 if(result===false){lastWarning='Radio and source-owner state could not be saved atomically (browser storage quota).';return false;}
 dirty=false;lastWarning='';return true;
}
function status(assetId){
 const records=transport.list(assetId);
 return{schema:1,assetId,clockS:transport.cursorS,packets:records,
  pending:records.filter(p=>p.state!=='ACKED').length,failed:records.filter(p=>['OFFLINE','WAITING_FOR_ROUTE','PAUSED','FAILED'].includes(p.state)).length,
  reason:lastWarning||null};
}
root.StarfallCommsT03={transport,queue,command,camera,photo,queueSatellite,satelliteObservation,routeFor,advanceTo,poll,persist,status};
addEventListener('pagehide',persist);
})(window);
