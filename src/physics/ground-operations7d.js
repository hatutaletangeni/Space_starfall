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
 if(!Array.isArray(g.acceptedPackets))g.acceptedPackets=[];
 if(g.acceptedPackets.includes(packetId))return false;
 r.commands=program.map(x=>({...x}));r.index=0;r.remaining=0;
 g.remainingM=0;g.remainingS=0;r.status=program.length?'running':'parked';g.mode=program.length?'DRIVING':'IDLE';
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
 const start=g.lastTickS===null?time:g.lastTickS,elapsed=clamp(time-start,0,15);g.lastTickS=time;r.lastS=time;useLink(g,time,link);if(!transportActive)deliver(r,g,time,link);const received=transportActive?[]:downlink(r,g,time,link);if(received.length&&onReceive)for(const obs of received)onReceive(obs,r);
 if(r.status!=='running'||!r.commands.length||elapsed<=0)return g;
 let budget=elapsed,cycles=0;while(budget>1e-7&&cycles++<48&&r.index<r.commands.length){const op=r.commands[r.index];
  if(op.op==='STOP'){r.status='parked';g.mode='SAFE_STOP';r.index=r.commands.length;event(g,time,'STOP','Program stopped safely');break;}
  if(op.op==='TURN'){r.heading=(r.heading+op.value*Math.PI/180)%(2*Math.PI);r.index++;continue;}
  if(op.op==='SAMPLE'){
   if(!science||!body){r.status='fault';g.mode='FAULT';event(g,time,'FAULT','Science/terrain provider unavailable');break;}
   if(r.batteryJ<g.safeReserveJ+60000){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'POWER','Insufficient energy reserve for sample');break;}
   try{const obs=science.sample({body,seed,local:r.local,altitudeM:.6,instrument:op.value,simTime:time,nonce:(r.records?.length||0),energyAvailableJ:r.batteryJ-g.safeReserveJ});if(!Array.isArray(r.records))r.records=[];const record={...obs,id:obs.id||('probe-'+r.id+'-'+time),probeId:r.id,sourceAssetId:r.id};r.records.push(record);r.records=r.records.slice(-100);g.queuedObservations.push(record);g.queuedObservations=g.queuedObservations.slice(-120);r.batteryJ-=obs.powerJ;g.totalEnergyJ+=obs.powerJ;event(g,time,'SAMPLE','Measurement stored onboard, awaiting downlink');r.index++;}catch(e){r.status='fault';g.mode='FAULT';event(g,time,'INSTRUMENT',e.message);break;}continue;}
  if(op.op==='WAIT'){if(!g.remainingS)g.remainingS=op.value;const dt=Math.min(budget,g.remainingS);g.remainingS-=dt;budget-=dt;const e=dt*12;r.batteryJ=Math.max(0,r.batteryJ-e);g.totalEnergyJ+=e;if(g.remainingS<1e-6){g.remainingS=0;r.index++;}continue;}
  if(op.op==='DRIVE'){
   if(!body||!height){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'TERRAIN','Terrain unavailable; drive paused instead of teleporting');break;}
   if(!g.remainingM)g.remainingM=op.value;if(g.remainingM<1e-7){g.remainingM=0;r.index++;continue;}
   const distance=Math.min(.8,g.remainingM,budget*1.5),step=terrainStep(r,body,distance,height,unitScale);
   if(!step.ok){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'HAZARD',step.reason);break;}
   if(r.batteryJ-step.energyJ<g.safeReserveJ){r.status='safe-stop';g.mode='SAFE_STOP';event(g,time,'POWER','Battery reserve reached; rover halted safely');break;}
   r.local=step.next;r.batteryJ-=step.energyJ;g.totalEnergyJ+=step.energyJ;g.distanceM+=distance;g.remainingM-=distance;budget-=distance/Math.max(.1,step.speedMS);
   if(g.remainingM<1e-5){g.remainingM=0;r.index++;}continue;
  }
  r.status='fault';g.mode='FAULT';event(g,time,'OPCODE','Unsupported program operation');break;
 }
 if(r.index>=r.commands.length&&r.status==='running'){r.status='complete';g.mode='COMPLETE';event(g,time,'COMPLETE','Onboard program complete');}
 return g;}
function recover({truckLocal,roverLocal,radiusScene,truckEnergyJ,body,height,limitScene=55,unitScale=1000}){if(!Array.isArray(truckLocal)||!Array.isArray(roverLocal)||!body)throw Error('Truck/rover positions unavailable');const distance=arcMeters(truckLocal,roverLocal,radiusScene);if(distance>limitScene)throw Error('Winch cable limit: '+distance.toFixed(1)+' > '+limitScene+' scene units');if(distance<3)throw Error('Truck and rover already close enough');
 const n=Math.max(3,Math.ceil(distance/5));if(typeof height!=='function')throw Error('Terrain unavailable for winch safety check');const h1=height(truckLocal,body),h2=height(roverLocal,body);for(let i=1;i<n;i++){const a=i/n,dir=norm(truckLocal.map((x,j)=>x*(1-a)+roverLocal[j]*a)),h=height(dir,body),line=h1*(1-a)+h2*a;if(!Number.isFinite(h)||h>line+1.6)throw Error('Winch cable obstructed by ridge');}
 const pullScene=Math.max(0,distance-13),loadKg=1200,workJ=Math.max(50000,pullScene*unitScale*.15*loadKg*9.81*.12);if(truckEnergyJ<workJ+30000)throw Error('Truck lacks sufficient reserve for a safe pull');return{distanceBefore:distance,pullScene,workJ,remainingJ:truckEnergyJ-workJ};}
const API={migrate,uplink,stop,acceptPacket,tick,terrainStep,advance,arcMeters,recover};root.StarfallGroundOps7D=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
