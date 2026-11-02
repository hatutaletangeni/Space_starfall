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
 const hw=root.StarfallAntennaT04,ui=root.StarfallOutpostUI;
 if(hw&&ui)return ui.store.items.filter(x=>x.kind==='antenna'&&x.bodyId===body.id)
   .map(x=>hw.station(x,body,ui.powerReports.get(body.id),O.rotate))
   .filter(x=>x?.powered);
 return (ui?.store?.items||[]).filter(x=>x.kind==='antenna'&&x.bodyId===body.id&&x.enabled!==false&&x.condition>.02&&ui.powerReports.get(body.id)?.byId?.[x.id]?.power===true).map(x=>{
 const rad=O.rotate(x.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return{id:x.id,kind:'wired-radio',bodyId:body.id,position:O.V.add(body.position,O.V.mul(rad,body.radius+Math.max(8,x.height||0))),rangeScene:O.SPECS.antenna.rangeScene,bandwidthBps:O.SPECS.antenna.bandwidthBps,txPowerW:24};
 });
}
function labNode(item,body,towers){
 if(item?.kind!=='lab'||item.bodyId!==body.id)return null;
 const ui=root.StarfallOutpostUI,rep=ui?.powerReports?.get(body.id),line=rep?.byId?.[item.id];
 if(!line?.power||item.enabled===false)return null;
 const group=ui.store.connectedGroups(body.id).find(g=>g.some(x=>x.id===item.id))||[];
 if(!towers.some(t=>group.some(x=>x.id===t.id)))return null;
 const rad=O.rotate(item.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return{id:item.id,kind:'wired-lab-port',bodyId:body.id,position:O.V.add(body.position,O.V.mul(rad,body.radius+Math.max(3,item.height||0))),
  powered:true,busId:line.busId,rangeScene:0,bandwidthBps:1000000,txPowerW:5,rxPowerW:5};
}

function roverNode(r,body){
 if(['ENTRY','DESCENT','IN_PAYLOAD','ORBIT','TRANSFER','FAULT'].includes(r?.roverT06?.state))return null;
 if(!(r.batteryJ>300)||!Array.isArray(r.local))return null;
 const rad=O.rotate(r.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return{id:r.id,kind:'rover-radio',bodyId:body.id,position:O.V.add(body.position,O.V.mul(rad,body.radius+3)),
  rangeScene:45,bandwidthBps:48000,txPowerW:34};
}
function localRoverId(){return RT.vehicleStore.get('rover').definition.id;}
function localRoverNode(body){
 const pos=RT.roverAutonomyPosition?.(),v=RT.vehicleStore.get('rover');
 if(pos?.bodyId!==body.id||!pos.local||v.state.energyJ<300)return null;
 const rad=O.rotate(pos.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return{id:localRoverId(),kind:'local-rover-radio',bodyId:body.id,
  position:O.V.add(body.position,O.V.mul(rad,body.radius+3)),rangeScene:45,bandwidthBps:48000,txPowerW:34};
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
 if(root.StarfallAntennaT04)return root.StarfallAntennaT04.link(a,b,body,O.radioLink,O.rotate,P.SCENE_METERS_PER_UNIT);
 if(!a||!b||a.bodyId!==b.bodyId)return null;
 const range=Math.min(a.rangeScene,b.rangeScene),h=O.radioLink(a.position,b.position,[{position:body.position,radius:body.radius}],range,P.SCENE_METERS_PER_UNIT);
 if(!h.connected)return null;
 return{connected:true,delayS:Math.max(.001,h.delayS),bandwidthBps:Math.min(a.bandwidthBps,b.bandwidthBps),quality:h.quality,txPowerW:a.txPowerW};
}
function routeFor(packet,at,phase='send'){
 const body=calcBody(packet.bodyId,at);
 if(!body?.position||!finite(body.radius))return{connected:false,reason:'Destination ephemeris is not loaded/cached; no invented radio route'};
 const current=shipNode(body,at),towers=towerNodes(body),hw=root.StarfallAntennaT04;
 if(!current&&(packet.sourceId==='starfall-ship'||packet.destId==='starfall-ship'))
  return{connected:false,reason:'No present, battery-powered ship ground transceiver on destination body (T08 cross-planet link absent)'};
 const node=id=>{
  if(id==='starfall-ship')return current;
  if(id===localRoverId())return localRoverNode(body);
  if(rover(id))return roverNode(rover(id),body);
  if(sat(id))return satelliteNode(sat(id),body,at);
  const tower=towers.find(x=>x.id===id);
  if(tower)return tower;
  return labNode(root.StarfallOutpostUI?.store?.items.find(x=>x.id===id),body,towers);
 };
 const source=node(packet.sourceId),dest=node(packet.destId);
 if(!source||!dest)return{connected:false,reason:'RADIO_OFFLINE: actual endpoint lacks DC power, correct antenna orientation or commissioned receiver'};
 if(source.bodyId!==body.id||dest.bodyId!==body.id)return{connected:false,reason:'Cross-body/intersystem radio requires commissioned T08 hardware'};
 if(hw){
  const relays=UI.store.satellites.filter(x=>x.bodyId===body.id&&!([source.id,dest.id].includes(x.id)))
    .map(x=>satelliteNode(x,body,at)).filter(Boolean);
  const all=[...towers,...relays];
  const allowed=node=>{
   if(node.kind==='wired-radio'||node.kind==='orbital-radio'){
    const budget=node.kind==='wired-radio'?hw.TOWER_BUFFER_BYTES:hw.RELAY_BUFFER_BYTES;
    const used=hw.bufferLoad(transport.packets,node.id);
    return used+(packet.encodedBytes||0)<=budget || packet.route?.includes(node.id);
   }return false;
  };
  const routes=hw.candidates(source,dest,all,body,O.radioLink,O.rotate,P.SCENE_METERS_PER_UNIT,allowed);
  const path=routes[0];
  if(!path)return{connected:false,reason:'NO_PHYSICAL_ROUTE: blocked planetary horizon, dish pointing, power, receiver or full relay buffer'};
  return path;
 }
 const candidates=[];
 function offer(hops){
  const links=[];for(let i=0;i<hops.length-1;i++){const q=hop(hops[i],hops[i+1],body);if(!q?.connected)return;links.push(q);}
  candidates.push({connected:true,hops:hops.map(x=>x.id),bandwidthBps:Math.min(...links.map(x=>x.bandwidthBps)),
   delayS:links.reduce((n,x)=>n+x.delayS,0),txPowerW:source.txPowerW,reason:hops.map(x=>x.kind).join(' → ')});
 }
 offer([source,dest]);for(const tower of towers)if(![source.id,dest.id].includes(tower.id))offer([source,tower,dest]);
 for(const satellite of UI.store.satellites){if(satellite.bodyId!==body.id||[source.id,dest.id].includes(satellite.id))continue;
  const relay=satelliteNode(satellite,body,at);if(relay)offer([source,relay,dest]);}
 candidates.sort((a,b)=>a.delayS-b.delayS||b.bandwidthBps-a.bandwidthBps||a.hops.join('').localeCompare(b.hops.join('')));
 return candidates[0]||{connected:false,reason:'No real line of sight across current planetary horizon or relay pass'};
}
function energy(packet,j){
 if(!(j>=0&&finite(j)))return false;
 if(j===0)return true;
 if(packet.sourceId===localRoverId()){
  const v=RT.vehicleStore.get('rover');if(v.state.energyJ<j+400000)return false;
  RT.vehicleStore.update('rover',{...v.state,energyJ:v.state.energyJ-j});return true;
 }
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
   const id='comms-obs-'+o.id;
   if(transport.get(id))continue; // the original command/data owner retains packet ID through blackout.
   const bytes=Math.max(180,Math.ceil(JSON.stringify(o).length));
   const direct=routeFor({sourceId:r.id,destId:'starfall-ship',bodyId:r.bodyId,systemId:r.systemId,encodedBytes:bytes+96},at);
   let dest='starfall-ship';
   if(!direct.connected&&root.StarfallAntennaT04){
    const body=calcBody(r.bodyId,at);
    if(body){const tower=towerNodes(body).find(x=>{
     const radio=root.StarfallOutpostUI.store.items.find(i=>i.id===x.id);
     const used=root.StarfallAntennaT04.repair(radio?.radioT04).inbox.reduce((n,v)=>n+v.bytes,0);
     return used+bytes<=root.StarfallAntennaT04.TOWER_BUFFER_BYTES&&routeFor({sourceId:r.id,destId:x.id,bodyId:r.bodyId,systemId:r.systemId,encodedBytes:bytes+96},at).connected;
    });if(tower)dest=tower.id;}
   }
   queue({id,type:'ROVER_OBSERVATION',sourceId:r.id,destId:dest,
    bodyId:r.bodyId,systemId:r.systemId,bytes,
    ref:{observationId:o.id,originSourceId:r.id},createdS:Math.max(0,o.timeS||at)});
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
 if(p.destId===localRoverId()){
  const v=RT.vehicleStore.get('rover');if(v.state.energyJ<cost+400000)return false;
  RT.vehicleStore.update('rover',{...v.state,energyJ:v.state.energyJ-cost});return true;
 }
 const tower=root.StarfallOutpostUI?.store?.items.find(i=>i.id===p.destId&&i.kind==='antenna');
 if(tower){const radio=root.StarfallAntennaT04?.repair(tower.radioT04);
  return !!(radio?.radioEnabled&&root.StarfallOutpostUI.powerReports.get(tower.bodyId)?.byId?.[tower.id]?.power);}
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
  const r=rover(p.destId);if(!r)return false;
  if(G.migrate(r).acceptedPackets?.includes(p.id))return true;
  if(!receiveEnergy(p))return false;
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
  const tower=root.StarfallOutpostUI?.store?.items.find(i=>i.id===p.destId&&i.kind==='antenna');
  if(tower&&root.StarfallAntennaT04){
   if(!root.StarfallOutpostUI.powerReports.get(tower.bodyId)?.byId?.[tower.id]?.power)return false;
   const config=root.StarfallAntennaT04.repair(tower.radioT04),bufferUsed=config.inbox.reduce((n,x)=>n+x.bytes,0);
   if(config.inbox.some(x=>x.packetId===p.id))return true;
   if(bufferUsed+p.encodedBytes>root.StarfallAntennaT04.TOWER_BUFFER_BYTES)return false;
   if(!receiveEnergy(p))return false;
   config.inbox.push({packetId:p.id,observationId:p.ref.observationId,sourceId:p.ref.originSourceId||p.sourceId,
     bytes:p.encodedBytes,receivedAtS:at});
   config.lastContactS=at;config.lastPeerId=p.sourceId;
   tower.radioT04=config;
   // Custody moves to the real tower. The original rover.records[] still
   // owns evidence bytes; no science journal receipt exists until forward ACK.
   const r=rover(p.sourceId);
   if(r?.ground7d)r.ground7d.queuedObservations=r.ground7d.queuedObservations.filter(x=>x.id!==p.ref.observationId);
   return true;
  }
  const r=rover(p.ref.originSourceId||p.sourceId),o=r?.ground7d?.queuedObservations?.find(x=>x.id===p.ref.observationId)||r?.records?.find(x=>x.id===p.ref.observationId);
  if(r&&G.migrate(r).receivedIds.includes(p.ref.observationId))return true;
  if(!r||!o||!root.StarfallScienceUI?.ingestRover)return false;
  if(!receiveEnergy(p))return false;
  root.StarfallScienceUI.ingestRover(o);
  const g=G.migrate(r);if(!g.receivedIds.includes(o.id))g.receivedIds.push(o.id);
  g.queuedObservations=g.queuedObservations.filter(x=>x.id!==o.id);
  if(p.sourceId!==r.id){const station=root.StarfallOutpostUI?.store?.items.find(i=>i.id===p.sourceId&&i.kind==='antenna');
   if(station&&root.StarfallAntennaT04){const state=root.StarfallAntennaT04.repair(station.radioT04);
    state.inbox=state.inbox.filter(x=>x.observationId!==o.id);state.lastContactS=at;state.lastPeerId=p.destId;station.radioT04=state;}}
  return true;
 }
 if(p.type==='SATELLITE_OBSERVATION'){
  const s=sat(p.sourceId),o=s&&S.ensure(s),obs=o?.storage.find(x=>x.id===p.ref.observationId)||o?.inTransit.find(x=>x.id===p.ref.observationId);
  if(o?.received.some(x=>x.id===p.ref.observationId))return true;
  if(!obs||!root.StarfallScienceUI?.ingestOrbital)return false;
  if(!receiveEnergy(p))return false;
  root.StarfallScienceUI.ingestOrbital({...obs,receivedAtS:at});root.StarfallSurveyUI?.recordOrbitalFootprint?.(obs);
  o.storage=o.storage.filter(x=>x.id!==obs.id);o.inTransit=o.inTransit.filter(x=>x.id!==obs.id);if(!o.received.some(x=>x.id===obs.id))o.received.push({...obs,receivedAtS:at});
  return true;
 }
 if(p.type==='IMAGE_REF'){
  const store=root.StarfallImagingUI7F?.store;if(!store||!store.get(p.ref.photoId))return false;
  if(store.get(p.ref.photoId)?.status==='downlinked')return true;
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
 // Store-and-forward tower custody: referenced rover records remain with their
 // original rover owner until the actual downstream ship receives and ACKs.
 for(const tower of root.StarfallOutpostUI?.store?.items||[]){
  if(tower.kind!=='antenna'||!root.StarfallAntennaT04)continue;
  for(const row of root.StarfallAntennaT04.repair(tower.radioT04).inbox){
   const id='comms-forward-'+row.packetId;
   if(transport.get(id))continue;
   queue({id,type:'ROVER_OBSERVATION',sourceId:tower.id,destId:'starfall-ship',
    bodyId:tower.bodyId,systemId:tower.bodySnapshot?.systemId||calcBody(tower.bodyId,at)?.systemId||'unknown',
    bytes:row.bytes,ref:{observationId:row.observationId,originSourceId:row.sourceId},
    createdS:at});
  }
 }
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
 const outposts=root.StarfallOutpostUI?.store;
 const savedOutpost=root.SF.load().outpost5||{};
 const result=root.SF.save({commsT03:{...transport.serialize(),serial},launch7:UI.store.serialize(),
  ...(outposts?{outpost5:{...savedOutpost,...outposts.serialize()}}:{}),
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
