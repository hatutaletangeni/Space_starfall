/* STARFALL T04 — verified antenna hardware contracts.
 * T02 Store.items owns antenna configuration/thermal; T03 owns packets.
 * This pure layer never creates another mutable energy, orbit or evidence store.
 */
(function(root){'use strict';
const SCHEMA=1,TRACK_W=35,BASE_W=165,TOWER_BUFFER_BYTES=4194304,RELAY_BUFFER_BYTES=4194304,MAX_HOPS=4;
const C=299792458,PI=Math.PI;
const min=(a,b)=>Math.min(a,b),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=x=>typeof x==='number'&&Number.isFinite(x);
const V={add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),mul:(a,n)=>a.map(x=>x*n),dot:(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),length:x=>Math.hypot(...x),unit:x=>{const n=Math.hypot(...x);return n>1e-9?x.map(v=>v/n):[0,1,0]}};
const deep=x=>JSON.parse(JSON.stringify(x));
function normalized(v){return Array.isArray(v)&&v.length===3&&v.every(num)&&V.length(v)>.5?V.unit(v):[0,0,1];}
function repair(raw){
 const o=raw&&raw.schema===SCHEMA?raw:{};
 return{schema:SCHEMA,mode:['omni','fixed','tracking'].includes(o.mode)?o.mode:'omni',
  boresightLocal:normalized(o.boresightLocal),targetId:typeof o.targetId==='string'?o.targetId.slice(0,160):'',
  radioEnabled:o.radioEnabled!==false,
  bufferCapacityBytes:TOWER_BUFFER_BYTES,deepT08:root.StarfallDeepSpaceT08?.repair(o.deepT08)||o.deepT08||null,
  inbox:Array.isArray(o.inbox)?o.inbox.filter(v=>v&&typeof v.packetId==='string'&&typeof v.observationId==='string'&&typeof v.sourceId==='string'&&Number.isSafeInteger(v.bytes)&&v.bytes>0&&v.bytes<=TOWER_BUFFER_BYTES&&num(v.receivedAtS))
   .slice(-80).reduce((arr,v)=>{if(!arr.some(x=>x.packetId===v.packetId)&&arr.reduce((n,x)=>n+x.bytes,0)+v.bytes<=TOWER_BUFFER_BYTES)arr.push({packetId:v.packetId,observationId:v.observationId,sourceId:v.sourceId,bytes:v.bytes,receivedAtS:v.receivedAtS});return arr;},[]):[],
  // Last contact is telemetry, not radio delivery authority; packets are T03-owned.
  lastContactS:num(o.lastContactS)&&o.lastContactS>=0?o.lastContactS:null,
  lastPeerId:typeof o.lastPeerId==='string'?o.lastPeerId.slice(0,160):'',
  fault:String(o.fault||'').slice(0,130)};
}
function configure(item,{mode,targetId='',boresightLocal,radioEnabled}){
 if(item?.kind!=='antenna')throw Error('T04 only real Outpost antennas can be commissioned');
 const next=repair(item.radioT04);
 if(mode!==undefined){if(!['omni','fixed','tracking'].includes(mode))throw Error('T04 unsupported antenna mode');next.mode=mode;}
 if(targetId!==undefined){if(typeof targetId!=='string'||targetId.length>160||!/^[\w:./-]*$/.test(targetId))throw Error('T04 target ID invalid');next.targetId=targetId;}
 if(boresightLocal!==undefined){if(!Array.isArray(boresightLocal)||boresightLocal.length!==3||!boresightLocal.every(num)||V.length(boresightLocal)<.5)throw Error('T04 boresight invalid');next.boresightLocal=V.unit(boresightLocal);}
 if(radioEnabled!==undefined)next.radioEnabled=!!radioEnabled;
 item.radioT04=next;return deep(next);
}
function loadW(item,specWatts=BASE_W){if(item?.kind!=='antenna')return specWatts;const c=repair(item.radioT04);return (c.radioEnabled?specWatts+(c.mode==='tracking'?TRACK_W:0):12)+(root.StarfallDeepSpaceT08?.watts(item)||0);}
function position(item,body,rotate){
 const radial=rotate(item.local,body.spinAxis||[0,1,0],body.spinAngle||0);
 return V.add(body.position,V.mul(radial,body.radius+Math.max(8,item.height||0)));
}
function station(item,body,powerReport,rotate){
 if(item?.kind!=='antenna'||item.bodyId!==body?.id)return null;
 const config=repair(item.radioT04),electrical=powerReport?.byId?.[item.id]||null;
 const powered=item.enabled!==false&&item.condition>.02&&electrical?.power===true&&config.radioEnabled;
 const fault=!item.enabled?'SWITCHED_OFF':item.condition<=.02?'HARDWARE_FAILED':!electrical?.power?'DC_BUS_OFFLINE':!config.radioEnabled?'RADIO_DISABLED':'';
 return{id:item.id,kind:'wired-radio',bodyId:item.bodyId,position:position(item,body,rotate),
   powered,reason:fault,mode:config.mode,config,boresightLocal:config.boresightLocal,
   targetId:config.targetId,up:rotate(item.local,body.spinAxis||[0,1,0],body.spinAngle||0),
   spinAxis:body.spinAxis||[0,1,0],spinAngle:body.spinAngle||0,
   rangeScene:120000,bandwidthBps:250000,txPowerW:24,rxPowerW:12,temperatureK:item.temperatureK,
   condition:item.condition,voltageV:electrical?.voltageV||0,busId:electrical?.busId||null,
   loadW:electrical?.servedW||0,bufferCapacityBytes:TOWER_BUFFER_BYTES};
}
function gain(endpoint,peer,rotate){
 if(!endpoint||!peer)return 0;
 if(endpoint.mode===undefined||endpoint.mode==='omni')return 1;
 const toward=V.unit(V.sub(peer.position,endpoint.position));
 if(endpoint.mode==='tracking'){
  // A single mechanically tracked target, not an omnidirectional virtual dish.
  return endpoint.targetId===peer.id?1:0;
 }
 // Fixed mode uses the persisted body-fixed boresight, rotating with the planet.
 const axis=endpoint.spinAxis||[0,1,0],angle=endpoint.spinAngle||0;
 const bore=rotate?rotate(endpoint.boresightLocal,axis,angle):endpoint.boresightLocal;
 const c=clamp(V.dot(V.unit(bore),toward),-1,1);
 return c>=.80?clamp((c-.8)/.2,0,1):0;
}
function link(a,b,body,radioLink,rotate,metresPerSceneUnit=1000){
 if(!a||!b||a.bodyId!==body?.id||b.bodyId!==body.id)return{connected:false,reason:'Missing actual same-world receiver',quality:0};
 if(a.powered===false||b.powered===false)return{connected:false,reason:(!a.powered?a.id+': '+a.reason:b.id+': '+b.reason),quality:0};
 if(a.kind==='wired-lab-port'||b.kind==='wired-lab-port'){
  const antenna=a.kind==='wired-radio'?a:b.kind==='wired-radio'?b:null,lab=a.kind==='wired-lab-port'?a:b.kind==='wired-lab-port'?b:null;
  if(!antenna||!lab||!antenna.busId||antenna.busId!==lab.busId)return{connected:false,reason:'LAB_WIRED_PORT_DISCONNECTED',quality:0};
  return{connected:true,reason:'Powered same-bus antenna ↔ laboratory data cable',quality:1,delayS:.001,
   bandwidthBps:1000000,distanceM:V.length(V.sub(a.position,b.position))*metresPerSceneUnit,
   txPowerW:a.txPowerW??5,rxPowerW:b.rxPowerW??5};
 }
 // Simplified reciprocal link budget: baseline omni link has range R;
 // an active high-gain station extends link distance by the geometric mean of
 // endpoint range ratings. Both radios still require their own DC power.
 const effectiveRange=Math.sqrt(Math.max(0,a.rangeScene)*Math.max(0,b.rangeScene));
 const los=radioLink(a.position,b.position,[{position:body.position,radius:body.radius}],effectiveRange,metresPerSceneUnit);
 if(!los.connected)return{...los,connected:false,reason:los.reason||'Planetary occultation / beyond antenna horizon'};
 const aGain=gain(a,b,rotate),bGain=gain(b,a,rotate),health=min(a.condition??1,b.condition??1);
 const quality=clamp((los.quality??1)*aGain*bGain*health,0,1);
 if(quality<.08)return{connected:false,reason:'POINTING_OR_LINK_MARGIN: antenna gain below 8% threshold',quality,
  los:true,aGain,bGain,delayS:los.delayS};
 return{connected:true,reason:'POWERED_LOS',quality,delayS:Math.max(.001,los.delayS||0),
  bandwidthBps:Math.max(128,Math.floor(min(a.bandwidthBps,b.bandwidthBps)*quality)),
  aGain,bGain,distanceM:V.length(V.sub(a.position,b.position))*metresPerSceneUnit,
  txPowerW:a.txPowerW??24,rxPowerW:b.rxPowerW??10};
}
function candidates(source,destination,intermediates,body,radioLink,rotate,unitScale=1000,bufferAllowed=()=>true){
 if(!source||!destination||source.id===destination.id)return[];
 const ranked=intermediates.filter(n=>n.id!==source.id&&n.id!==destination.id)
   .sort((x,y)=>(V.length(V.sub(x.position,source.position))+V.length(V.sub(x.position,destination.position)))-
                (V.length(V.sub(y.position,source.position))+V.length(V.sub(y.position,destination.position)))||x.id.localeCompare(y.id))
   .slice(0,12);
 const nodes=[source,...ranked,destination],found=[];let expansions=0;
 function visit(path,links){
  if(++expansions>400)return;
  const last=path[path.length-1];
  if(last.id===destination.id){
   const bw=Math.min(...links.map(x=>x.bandwidthBps)),delay=links.reduce((n,x)=>n+x.delayS,0);
   found.push({connected:true,hops:path.map(x=>x.id),hopReports:links.map((x,i)=>({from:path[i].id,to:path[i+1].id,quality:x.quality,delayS:x.delayS,bandwidthBps:x.bandwidthBps,distanceM:x.distanceM})),
    bandwidthBps:bw,delayS:delay,quality:Math.min(...links.map(x=>x.quality)),txPowerW:source.txPowerW??24,
    reason:path.map(x=>x.kind).join(' → ')});return;
  }
  if(path.length>=MAX_HOPS)return;
  for(const next of nodes.slice(1)){
   if(path.some(x=>x.id===next.id)||next.id===source.id)continue;
   if(next.id!==destination.id&&!bufferAllowed(next))continue;
   const h=link(last,next,body,radioLink,rotate,unitScale);
   if(h.connected)visit([...path,next],[...links,h]);
  }
 }
 visit([source],[]);
 // Signal margin first, then latency, then fewer independent relay failures.
 return found.sort((a,b)=>b.quality-a.quality||a.delayS-b.delayS||a.hops.length-b.hops.length||a.hops.join('|').localeCompare(b.hops.join('|')));
}
function bufferLoad(packets,nodeId){
 return packets.filter(p=>p?.route?.slice(1,-1).includes(nodeId)&&!['ACKED','FAILED','EXPIRED'].includes(p.state))
   .reduce((n,p)=>n+Math.max(0,Number(p.encodedBytes)||0),0);
}
function diagnostics(item,body,report,packets,rotate,timeS){
 const stationNode=station(item,body,report,rotate);if(!stationNode)return null;
 const backlog=bufferLoad(packets,stationNode.id)+repair(item.radioT04).inbox.reduce((n,x)=>n+x.bytes,0),records=packets.filter(p=>p.route?.includes(item.id)).slice(-25);
 const c=stationNode.config;
 return{id:item.id,bodyId:item.bodyId,mode:c.mode,targetId:c.targetId,enabled:item.enabled!==false,
  radioEnabled:c.radioEnabled,powered:stationNode.powered,busId:stationNode.busId,
  nominalW:BASE_W,trackingW:c.mode==='tracking'&&c.radioEnabled?TRACK_W:0,actualLoadW:stationNode.loadW,
  voltageV:stationNode.voltageV,txPowerW:stationNode.txPowerW,rxPowerW:stationNode.rxPowerW,
  rangeScene:stationNode.rangeScene,bandwidthBps:stationNode.bandwidthBps,
  temperatureK:item.temperatureK,health:item.condition,
  bufferUsedBytes:backlog,bufferCapacityBytes:TOWER_BUFFER_BYTES,
  packetsAwaitingACK:records.filter(p=>p.state!=='ACKED'&&p.state!=='FAILED'&&p.state!=='EXPIRED').length,
  lastContactS:c.lastContactS,lastPeerId:c.lastPeerId,
  lastSimulatedS:report?.simulatedAtS??timeS,deepT08:root.StarfallDeepSpaceT08?.inspected(item,report,timeS)||null,
  fault:stationNode.reason|| (backlog>TOWER_BUFFER_BYTES?'RELAY_BUFFER_FULL':''),
  queuedPacketIds:records.map(p=>p.id),receivedReferenceIds:c.inbox.map(x=>x.observationId)};
}
const API={SCHEMA,BASE_W,TRACK_W,TOWER_BUFFER_BYTES,RELAY_BUFFER_BYTES,MAX_HOPS,repair,configure,loadW,station,position,gain,link,candidates,bufferLoad,diagnostics};
root.StarfallAntennaT04=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
