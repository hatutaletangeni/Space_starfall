/* STARFALL 7D — bounded remote ground operations, terrain, batteries and delayed uplinks.
 * Coordinates are planet-fixed radial unit vectors. Travel, work, energy are SI.
 * Scene-unit/physical-unit conversion is explicit; simplified six-contact traction
 * and terrain-gradient limits, not six-body wheel suspension. No arbitrary JS.
 */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), norm=a=>{const m=Math.hypot(...a);return m>1e-10?a.map(x=>x/m):[0,1,0];};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);const MAXLOG=40,MAXQUEUE=4,C=299792458;
function direction(local,heading){const up=norm(local),pole=Math.abs(up[1])>.95?[1,0,0]:[0,1,0],side=norm(cross(up,pole)),other=norm(cross(up,side));return norm(side.map((v,i)=>v*Math.cos(heading)+other[i]*Math.sin(heading)));}
function advance(local,distanceM,heading,radiusM){if(!Number.isFinite(radiusM)||radiusM<=0)throw Error('Physical planet radius unavailable');const u=norm(local),f=direction(u,heading),angle=distanceM/radiusM;return norm(u.map((x,i)=>x*Math.cos(angle)+f[i]*Math.sin(angle)));}
function arcMeters(a,b,r){return Math.acos(clamp(dot(norm(a),norm(b)),-1,1))*r;}
function validateSnapshot(r){if(!r||!Array.isArray(r.local)||r.local.length!==3||r.local.some(x=>!Number.isFinite(x))||!(r.batteryJ>=0))throw Error('Invalid deployed rover state');}
function migrate(r){validateSnapshot(r);if(r.ground7d?.schema===1)return r.ground7d;
 const state={schema:1,mode:r.status==='running'?'DRIVING':'IDLE',reason:'',pending:[],queuedObservations:[],receivedIds:[],distanceM:0,totalEnergyJ:0,remainingM:0,remainingS:0,lastLink:null,lastTickS:Number.isFinite(r.lastS)?r.lastS:null,safeReserveJ:400000,events:[],hardware:{massKg:1200,driveTorqueNm:1400,wheelRadiusM:.48,traction:.76}};
 r.ground7d=state;return state;}
function event(g,time,kind,message){g.events.push({timeS:time,kind,message:String(message).slice(0,170)});g.events=g.events.slice(-MAXLOG);g.reason=String(message).slice(0,170);}
function uplink(r,program,time,link){const g=migrate(r);if(!Array.isArray(program)||program.length>24)throw Error('Program command count invalid');if(g.pending.length>=MAXQUEUE)throw Error('Uplink queue full: wait for connection');
 const id='cmd-'+r.id+'-'+Math.round(time*1000)+'-'+g.pending.length;
 const validLink=link?.connected===true;
 const record={id,commands:program.map(x=>({...x})),queuedAtS:time,deliverAtS:validLink?time+Math.max(.001,Number(link.delayS)||0):null,status:validLink?'IN_TRANSIT':'AWAITING_LINK'};
 g.pending.push(record);event(g,time,'QUEUED',validLink?'Program uplink in transit':'Awaiting an available radio link');return record;}
function stop(r,time,link){return uplink(r,[{op:'STOP'}],time,link);}
function acceptPacket(r,program,time,packetId){
 const g=migrate(r);if(!Array.isArray(program)||program.length>24||!packetId)throw Error('Invalid physically received command packet');
 const hw=root.StarfallRoverT06?.hardware(r);
 if(hw&&['ENTRY','DESCENT','FAULT'].includes(hw.state))throw Error('Rover receiver not deployed/healthy enough to accept a mission');
 if(!Array.isArray(g.acceptedPackets))g.acceptedPackets=[];
 if(g.acceptedPackets.includes(packetId))return false;
 r.commands=program.map(x=>({...x}));r.index=0;r.remaining=0;
 g.remainingM=0;g.remainingS=0;r.status=program.length?'running':'parked';g.mode=program.length?'DRIVING':'IDLE';
 if(hw)hw.state=program.length?'TRAVERSING':'READY';
 g.acceptedPackets.push(packetId);if(g.acceptedPackets.length>500)g.acceptedPackets=g.acceptedPackets.slice(-500);
 event(g,time,'UPLINK','Packet '+packetId+' accepted by powered rover transceiver');
 return true;
}
function useLink(g,time,link){g.lastLink={atS:time,connected:!!link?.connected,reason:link?.reason||'No receiver',delayS:Math.max(0,Number(link?.delayS)||0)};return g.lastLink;}
function deliver(r,g,time,link){for(const q of g.pending){if(q.status==='AWAITING_LINK'&&link?.connected){q.status='IN_TRANSIT';q.deliverAtS=time+Math.max(.001,Number(link.delayS)||0);}
  if(q.status==='IN_TRANSIT'&&q.deliverAtS<=time){q.status='DELIVERED';r.commands=q.commands.map(x=>({...x}));r.index=0;r.remaining=0;g.remainingM=0;g.remainingS=0;r.status=q.commands.length?'running':'parked';g.mode=q.commands.length?'DRIVING':'IDLE';event(g,time,'UPLINK','Onboard program accepted');}}
 g.pending=g.pending.filter(q=>q.status!=='DELIVERED').slice(-MAXQUEUE);}
function downlink(r,g,time,link){if(!link?.connected)return[];
 const seen=new Set(g.receivedIds),received=[];let n=0;
 while(g.queuedObservations.length&&n++<4){const record=g.queuedObservations.shift();if(!seen.has(record.id)){seen.add(record.id);received.push(record);}}
 if(received.length){g.receivedIds=[...seen].slice(-160);event(g,time,'DOWNLINK','Received '+received.length+' rover measurements');}return received;}
/* Physically bounded next step in metres, using same six-contact traction solver as the local rover. */
function terrainStep(r,body,distanceM,height,unitScale=1000){const G=root.StarfallRoverDynamics;if(!G?.sixWheels)throw Error('Rover traction model unavailable');if(!body||!Number.isFinite(body.radius)||body.radius<=0)throw Error('Destination terrain body unavailable');if(typeof height!=='function')throw Error('Planetary terrain samples unavailable');
 const radiusM=body.radius*unitScale,next=advance(r.local,distanceM,r.heading,radiusM),heights=local=>{const h=height(local,body);if(!Number.isFinite(h))throw Error('Non-finite fixed terrain sample');return h*unitScale;};
 const data=G.sixWheels({body,local:next,forward:direction(next,r.heading),surfaceHeight:heights,sceneRadius:radiusM,sceneToMeters:1,gravityMS2:Math.max(.05,(body.gravity||1)*9.80665),vehicle:migrate(r).hardware,command:1,dt:.05,enabled:true});
 if(!data.safe||data.speedSceneS<=.05)return{ok:false,reason:'Unsafe slope/traction: '+data.slopeDeg.toFixed(1)+'° · slip '+data.slip.toFixed(2),data};
 const before=heights(r.local),after=heights(next),grade=Math.atan2(Math.abs(after-before),Math.max(.1,distanceM));if(grade>0.48)return{ok:false,reason:'Terrain gradient exceeds 25.6° safe operating limit',data};
 return{ok:true,next,data,energyJ:Math.max(0,distanceM)*(245+Math.max(0,after-before)*115+data.slip*160),speedMS:Math.min(1.65,Math.max(.25,data.speedSceneS))};}
/* Caller supplies the same seeded height function and actual world-body snapshot used for local navigation. */
function tick(rover,time,{body,height,science,seed,link,unitScale=1000,onReceive,transportActive=false}={}){const r=rover,g=migrate(r);if(!Number.isFinite(time))return g;
 const start=g.lastTickS===null?time:g.lastTickS,elapsed=clamp(time-start,0,15);g.lastTickS=time;r.lastS=time;
 const T=root.StarfallRoverT06,hw=T?.hardware(r);
 if(hw&&hw.state==='FAULT')return g;
 if(hw&&r.status==='running'&&hw.state!=='TRAVERSING'&&hw.state!=='SCIENCE'){hw.state='TRAVERSING';}
 if(hw){
  const e=Math.min(elapsed*5,Math.max(0,r.batteryJ));
  r.batteryJ=Math.max(0,r.batteryJ-e);g.totalEnergyJ+=e;
  // Passive thermal relaxation is bounded, autonomous computer draws real Joules.
  g.temperatureK=clamp((Number.isFinite(g.temperatureK)?g.temperatureK:290)+elapsed*((r.status==='running'?.38:-.09)),205,400);
  if(g.temperatureK>365){T.fault(r,time,'Rover controller overheated · passive cooling required');event(g,time,'THERMAL','Controller thermal hard limit; resume only after safe cool-down');return g;}
  if(r.batteryJ<g.safeReserveJ&&r.status==='running'){T.fault(r,time,'Power reserve reached; rover hibernated');event(g,time,'POWER','Reserve reached: local motion and science halted, awaiting physical charge');return g;}
 }
 useLink(g,time,link);if(!transportActive)deliver(r,g,time,link);const received=transportActive?[]:downlink(r,g,time,link);if(received.length&&onReceive)for(const obs of received)onReceive(obs,r);
 if(r.status!=='running'||!r.commands.length||elapsed<=0)return g;
 let budget=elapsed,cycles=0;while(budget>1e-7&&cycles++<48&&r.index<r.commands.length){const op=r.commands[r.index];
  if(op.op==='STOP'){r.status='parked';g.mode='SAFE_STOP';r.index=r.commands.length;
   if(hw)hw.state='SAFE_STOP';event(g,time,'STOP','Program stopped safely');break;}
  if(op.op==='STATUS'){
   if(r.batteryJ<g.safeReserveJ+25){if(T)T.fault(r,time,'Computer reserve insufficient for status telemetry');break;}
   r.batteryJ-=25;g.totalEnergyJ+=25;
   event(g,time,'TELEMETRY','BODY '+r.bodyId+' · SoC '+Math.round(r.batteryJ/22000000*100)+'% · position '+r.local.map(n=>n.toFixed(4)).join(',')+' · '+g.mode);
   r.index++;continue;
  }
  if(op.op==='CAPTURE'){
   const ui=root.StarfallImagingUI7F,archive=ui?.store,jobCost=op.resolution===512?900:520;
   if(!archive||!T){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'CAMERA','Camera 7F not initialized; job retained');break;}
   if(r.batteryJ<g.safeReserveJ+jobCost+600){T.fault(r,time,'Camera battery reserve; acquisition paused');break;}
   const key='t06-cam-'+r.id+'-'+(g.acceptedPackets?.at(-1)||'legacy')+'-'+r.index;
   if(!hw.cameraJobIds.includes(key)){
    try{const j=archive.request('rover',r.id,op.mode,op.resolution,time);
     archive.markDelivered(j.id,time);hw.cameraJobIds.push(key);hw.cameraJobIds=hw.cameraJobIds.slice(-24);
     ui.persist();event(g,time,'CAMERA','Onboard autonomous camera job '+j.id+' accepted · no fake radio ACK');
    }catch(e){T.fault(r,time,'Camera onboard storage/job queue: '+e.message);break;}
   }
   r.index++;continue;
  }
  if(op.op==='TURN'){r.heading=(r.heading+op.value*Math.PI/180)%(2*Math.PI);r.index++;continue;}
  if(op.op==='SAMPLE'){
   if(!science||!body){if(T)T.fault(r,time,'Science/terrain provider unavailable','FAULT');else r.status='fault';g.mode='FAULT';event(g,time,'FAULT','Science/terrain provider unavailable');break;}
   if(r.batteryJ<g.safeReserveJ+60000){if(T)T.fault(r,time,'Insufficient energy reserve for sample');else r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'POWER','Insufficient energy reserve for sample');break;}
   try{const obs=science.sample({body,seed,local:r.local,altitudeM:.6,instrument:op.value,simTime:time,nonce:(r.records?.length||0),energyAvailableJ:r.batteryJ-g.safeReserveJ});if(!Array.isArray(r.records))r.records=[];
   if(r.records.length>=100||g.queuedObservations.length>=120){if(T)T.fault(r,time,'Onboard science archive full; export/downlink before collecting more');else r.status='safe-stop';break;}
   const rawRecord={...obs,id:obs.id||('probe-'+r.id+'-'+time),probeId:r.id,sourceAssetId:r.id};
   const record=root.StarfallScienceT14?.annotateObservation(rawRecord,{
     spec:root.StarfallScienceT14.sensorSpecs(science.INSTRUMENTS)[op.value],
     sourceAssetId:r.id,calibrated:obs.calibrated!==false,
     temperatureK:r.ground7d?.temperatureK||290,health:r.roverT06?.health??1,
     dataBytes:256})||rawRecord;
   if(op.value==='sampler'&&root.StarfallScienceCustodyT10){
     // This is a physically collected, model-derived 150 g regolith plug,
     // NOT a numeric observation converted into a sample after downlink.
     const inventory=Array.isArray(r.sampleInventory)?r.sampleInventory:[];
     if(inventory.length>=12)throw Error('Physical rover sample cartridge full (12); return to storage before more sampling');
     const specimen=root.StarfallScienceCustodyT10.cleanSample({id:'specimen-'+record.id,
       type:'regolith',massKg:.15,volumeL:.1,bodyId:body.id,location:r.local.slice(),
       extractedAtS:time,sourceId:r.id,instrument:'sampler',observationId:record.id,
       contaminated:false,custody:[{atS:time,from:'terrain',to:r.id,method:'physical sampler cartridge',operator:'rover'}]});
     inventory.push(specimen);r.sampleInventory=inventory;
   }
   r.records.push(record);g.queuedObservations.push(record);r.batteryJ-=obs.powerJ;g.totalEnergyJ+=obs.powerJ;event(g,time,'SAMPLE','Measurement stored onboard, awaiting downlink');r.index++;}catch(e){if(T)T.fault(r,time,'INSTRUMENT '+e.message,'FAULT');else r.status='fault';g.mode='FAULT';event(g,time,'INSTRUMENT',e.message);break;}continue;}
  if(op.op==='WAIT'){if(!g.remainingS)g.remainingS=op.value;const dt=Math.min(budget,g.remainingS);g.remainingS-=dt;budget-=dt;const e=dt*12;r.batteryJ=Math.max(0,r.batteryJ-e);g.totalEnergyJ+=e;if(g.remainingS<1e-6){g.remainingS=0;r.index++;}continue;}
  let nav=null;
  if(T&&['GO_TO','RETURN','DOCK'].includes(op.op)){
   if(!body||!height){T.fault(r,time,'Cannot navigate without actual destination terrain');break;}
   let target=op.op==='GO_TO'?op.local:hw.homeLocal;
   if(op.op==='DOCK'){
    const station=T.dockingTarget(r,body,root.StarfallOutpostUI?.store?.items||[],unitScale);
    if(!station){T.fault(r,time,'No enabled charged outpost battery port on destination planet');break;}
    target=station.battery.local;
   }
   nav=T.route(r,body,target,unitScale);
   if(!nav.ok){T.fault(r,time,nav.reason);break;}
   if(nav.distanceM<=2){
    g.remainingM=0;r.index++;
    if(op.op==='DOCK'){hw.state='RECOVERY';r.status='parked';g.mode='RECOVERY';event(g,time,'DOCK','Arrived near physical charge port; operator must connect for real battery transfer');break;}
    event(g,time,'WAYPOINT','Reached '+op.op+' at '+T.latLon(r.local).lat.toFixed(3)+'° latitude');
    continue;
   }
   r.heading=nav.heading;
  }
  if(op.op==='DRIVE'||nav){
   if(!body||!height){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'TERRAIN','Terrain unavailable; drive paused instead of teleporting');break;}
   if(nav)g.remainingM=nav.distanceM;else if(!g.remainingM)g.remainingM=op.value;if(g.remainingM<1e-7){g.remainingM=0;r.index++;continue;}
   const distance=Math.min(.8,g.remainingM,budget*1.5),step=terrainStep(r,body,distance,height,unitScale);
   if(!step.ok){if(T)T.fault(r,time,step.reason);else{r.status='safe-stop';g.mode='SAFE_STOP';}event(g,time,'HAZARD',step.reason);break;}
   if(r.batteryJ-step.energyJ<g.safeReserveJ){if(T)T.fault(r,time,'Battery reserve reached; rover halted safely');else{r.status='safe-stop';g.mode='SAFE_STOP';}event(g,time,'POWER','Battery reserve reached; rover halted safely');break;}
   r.local=step.next;r.batteryJ-=step.energyJ;g.totalEnergyJ+=step.energyJ;g.distanceM+=distance;g.remainingM-=distance;budget-=distance/Math.max(.1,step.speedMS);
   if(nav?T.route(r,body,nav.targetLocal,unitScale).distanceM<2:g.remainingM<1e-5){g.remainingM=0;r.index++;}continue;
  }
  if(T)T.fault(r,time,'Unsupported program operation','FAULT');else r.status='fault';g.mode='FAULT';event(g,time,'OPCODE','Unsupported program operation');break;
 }
 if(r.index>=r.commands.length&&r.status==='running'){r.status='complete';g.mode='COMPLETE';if(hw)hw.state='READY';event(g,time,'COMPLETE','Onboard program complete');}
 return g;}
function recover({truckLocal,roverLocal,radiusScene,truckEnergyJ,body,height,limitScene=55,unitScale=1000}){if(!Array.isArray(truckLocal)||!Array.isArray(roverLocal)||!body)throw Error('Truck/rover positions unavailable');const distance=arcMeters(truckLocal,roverLocal,radiusScene);if(distance>limitScene)throw Error('Winch cable limit: '+distance.toFixed(1)+' > '+limitScene+' scene units');if(distance<3)throw Error('Truck and rover already close enough');
 const n=Math.max(3,Math.ceil(distance/5));if(typeof height!=='function')throw Error('Terrain unavailable for winch safety check');const h1=height(truckLocal,body),h2=height(roverLocal,body);for(let i=1;i<n;i++){const a=i/n,dir=norm(truckLocal.map((x,j)=>x*(1-a)+roverLocal[j]*a)),h=height(dir,body),line=h1*(1-a)+h2*a;if(!Number.isFinite(h)||h>line+1.6)throw Error('Winch cable obstructed by ridge');}
 const pullScene=Math.max(0,distance-13),loadKg=1200,workJ=Math.max(50000,pullScene*unitScale*.15*loadKg*9.81*.12);if(truckEnergyJ<workJ+30000)throw Error('Truck lacks sufficient reserve for a safe pull');return{distanceBefore:distance,pullScene,workJ,remainingJ:truckEnergyJ-workJ};}
const API={migrate,uplink,stop,acceptPacket,tick,terrainStep,advance,arcMeters,recover};root.StarfallGroundOps7D=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
