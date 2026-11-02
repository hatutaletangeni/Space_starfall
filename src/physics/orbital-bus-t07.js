/* STARFALL T07 — additive operational spacecraft bus for the original 7C store.
 * Satellite charge/observations: s.ops7c. Orbit: StarfallLaunch.orbit(s,...).
 * No second battery, satellite inventory or radio packet ledger.
 */
(function(root){'use strict';
const C=Object.freeze({schema:1,maxJobs:20,maxHistory:48,reserveJ:140000,slewDegS:3.0,
 slewW:44,trackW:17,antennaW:12,maxTemperatureK:348,minTemperatureK:238,
 maxPointingErrorDeg:2.2,solarRatedW:1150,predictionSamples:480});
const MODES=Object.freeze(['SAFE','SOLAR_TRACK','NADIR_IMAGING','GROUND_TRACK','RELAY_TRACK']);
const DUR=Object.freeze({camera:12,spectrometer:16,atmosphere:10});
const copy=x=>JSON.parse(JSON.stringify(x));
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const length=x=>Math.hypot(...x);
const norm=x=>{const d=length(x);return d>1e-12?x.map(v=>v/d):[0,1,0];};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function bus(s){
 const o=root.StarfallSatelliteOps7C.ensure(s),previous=o.t07||{};
 if(previous._normalizedT07)return previous;
 const target=MODES.includes(previous.mode)?previous.mode:(s.kind==='relay'?'RELAY_TRACK':o.pointing==='safe'?'SAFE':'NADIR_IMAGING');
 const b={schema:1,_normalizedT07:true,mode:target,
  desiredMode:MODES.includes(previous.desiredMode)?previous.desiredMode:target,
  pointingErrorDeg:finite(previous.pointingErrorDeg)?clamp(previous.pointingErrorDeg,0,180):0,
  lastS:finite(previous.lastS)?previous.lastS:o.lastS,
  jobs:Array.isArray(previous.jobs)?previous.jobs.filter(x=>x?.id&&x.status!=='COMPLETED').slice(-C.maxJobs):[],
  completed:Array.isArray(previous.completed)?previous.completed.filter(x=>x?.id).slice(-C.maxHistory):[],
  seq:Math.max(0,Math.min(1000000,Math.floor(previous.seq||0))),
  faults:Array.isArray(previous.faults)?previous.faults.slice(-24):[],
  activeW:Math.max(0,Number(previous.activeW)||0),
  state:String(previous.state||'READY').slice(0,50),
  health:finite(previous.health)?clamp(previous.health,0,1):1,
  momentumNms:Math.max(0,Number(previous.momentumNms)||0),
  lastOrbit:previous.lastOrbit||null,lastContactS:finite(previous.lastContactS)?previous.lastContactS:null,
  lastObservationId:previous.lastObservationId||null};
 o.t07=b;return b;
}
function addFault(b,at,why){
 const message=String(why).slice(0,190);if(!b.faults.length||b.faults.at(-1).reason!==message)
  b.faults.push({timeS:at,reason:message});
 b.faults=b.faults.slice(-24);
}
function command(s,mode,at=0){
 if(!MODES.includes(mode))throw Error('Unknown satellite attitude mode');
 const b=bus(s),o=root.StarfallSatelliteOps7C.ensure(s);
 if(!o.enabled&&mode!=='SAFE')throw Error('Sat bus is powered OFF; restore battery before slewing');
 if(mode==='RELAY_TRACK'&&s.kind!=='relay'&&s.kind!=='observatory')throw Error('No compatible antenna bus');
 b.desiredMode=mode;
 b.pointingErrorDeg=Math.max(b.pointingErrorDeg,mode===b.mode?0:
  mode==='SAFE'?6:mode==='SOLAR_TRACK'?38:mode==='NADIR_IMAGING'?48:55);
 b.state=mode===b.mode?'HOLDING':'SLEWING';
 if(mode==='SAFE')o.pointing='safe';
 return{...copy(b),requestedAtS:at};
}
function inspect(s,body,star,at,units,orbit){
 const b=bus(s),o=root.StarfallSatelliteOps7C.ensure(s);
 if(!body?.position||!Array.isArray(star)||typeof orbit!=='function')throw Error('Source-owned orbital ephemeris unavailable');
 const M=root.StarfallSatelliteOps7C,g=M.geometry(s,body,star,at,units,orbit);
 const radius=g.rScene*units,mu=s.mu||Math.max(1,body.gravity*9.80665*Math.pow(body.radius*units,2));
 let speedMS=null;
 if(finite(s.inertial2d?.mu)&&finite(g.periapsisM)&&finite(g.apoapsisM)){
  const a=body.radius*units+(g.periapsisM+g.apoapsisM)/2;
  speedMS=Math.sqrt(Math.max(0,s.inertial2d.mu*(2/radius-1/a)));
 }else if(mu>0&&radius>0)speedMS=Math.sqrt(mu/radius);
 const subpoint=root.StarfallOutposts?.rotate?norm(root.StarfallOutposts.rotate(g.nadir,body.spinAxis||[0,1,0],-(body.spinAngle||0))):g.nadir;
 const orbitalElements={altitudeM:g.altitudeM,periodS:g.periodS??null,
  periapsisM:finite(g.periapsisM)?g.periapsisM:null,apoapsisM:finite(g.apoapsisM)?g.apoapsisM:null,
  eccentricity:finite(g.eccentricity)?g.eccentricity:null,
  speedMS:finite(speedMS)?speedMS:null,relativePositionScene:g.relative.slice(),
  model:s.inertial2d?'7B achieved bound two-body Kepler elements':'legacy 7C circular ephemeris fallback'};
 return{satelliteId:s.id,bodyId:s.bodyId,timeS:at,position:g.position.slice(),subpoint,
  footprintRadiusM:Math.max(150,Math.min(5000,g.altitudeM*.012)),sunlit:g.sunlit,
  eclipse:g.shadow,orbit:orbitalElements,batteryJ:o.energyJ,capacityJ:o.capacityJ,
  temperatureK:o.temperatureK,solarRatedW:C.solarRatedW,solarActualW:o.lastSolarW,
  loadW:o.lastLoadW+Math.max(0,b.activeW),enabled:o.enabled,radioEnabled:o.radioEnabled,
  mode:b.mode,desiredMode:b.desiredMode,pointingErrorDeg:b.pointingErrorDeg,
  health:b.health,jobs:b.jobs.length,records:o.storage.length,received:o.received.length,
  nextScheduledS:b.jobs.filter(x=>x.status==='QUEUED').map(x=>x.eligibleAtS).sort((a,c)=>a-c)[0]??null,
  faults:b.faults.slice(-4)};
}
function preflight(s,body,star,at,units,orbit,sensor){
 const M=root.StarfallSatelliteOps7C,o=M.ensure(s),b=bus(s);
 if(s.kind!=='observatory')throw Error('RELAY_ONLY: no installed science payload');
 if(!M.PAYLOADS[sensor])throw Error('INSTALLED_PAYLOAD_REQUIRED: invalid observatory instrument');
 if(!o.enabled||o.energyJ<C.reserveJ)throw Error('SATELLITE_POWER: bus below reserve');
 if(b.desiredMode!=='NADIR_IMAGING'||b.mode!=='NADIR_IMAGING'||b.pointingErrorDeg>C.maxPointingErrorDeg||o.pointing!=='nadir')
  throw Error('ATTITUDE_UNSETTLED: request NADIR_IMAGING and wait for slew');
 if(o.temperatureK<C.minTemperatureK||o.temperatureK>C.maxTemperatureK)throw Error('THERMAL: sensor out of envelope');
 if(b.health<.2)throw Error('SATELLITE_FAULT: bus damaged');
 if(o.storage.length>=M.CONFIG.storageMax)throw Error('STORAGE_FULL: keep onboard and schedule downlink');
 if(!body?.landable)throw Error('SOLID_WORLD_REQUIRED: no terrestrial survey model');
 const g=M.geometry(s,body,star,at,units,orbit);
 if(g.altitudeM<25000||g.altitudeM>5e7||(finite(g.periapsisM)&&g.periapsisM<25000))
  throw Error('ORBIT_UNSAFE: acquisition outside stable imaging altitude envelope');
 if(M.PAYLOADS[sensor].needsSun&&!g.sunlit)throw Error('ECLIPSE: camera sunlight required');
 return{g,o,b};
}
function schedule(s,sensor,at,opts={}){
 const M=root.StarfallSatelliteOps7C,o=M.ensure(s),b=bus(s);
 if(s.kind!=='observatory'||!M.PAYLOADS[sensor])throw Error('Only observatory installed payloads may acquire science');
 if(!finite(at)||at<0)throw Error('Invalid original mission time');
 if(b.jobs.length>=C.maxJobs)throw Error('Onboard spacecraft job queue is full');
 if(o.storage.length+b.jobs.length>=M.CONFIG.storageMax)throw Error('Finite science recorder capacity reached');
 const ordinal=++b.seq,id='t07-'+s.id+'-'+ordinal.toString(36);
 const job={id,satelliteId:s.id,sensor,createdAtS:at,eligibleAtS:at+DUR[sensor],
  durationS:DUR[sensor],attempts:0,lastAttemptS:null,lastReason:'',status:'QUEUED'};
 b.jobs.push(job);return copy(job);
}
function emitImage(s,j,o,at){
 if(j.sensor!=='camera')return;
 const archive=root.StarfallImagingUI7F?.store;
 if(!archive)return;
 // Original 7C measurement and real 7F image are distinct entities linked
 // by the same capture job ID. A render failure creates no synthetic image.
 try{
  const existing=archive.jobs.find(x=>x.t07JobId===j.id);
  if(existing)return;
  const job=archive.request('satellite',s.id,'nadir',256,at);
  archive.markDelivered(job.id,at);
  const mutable=archive.jobs.find(x=>x.id===job.id);
  if(mutable)mutable.t07JobId=j.id;
  j.photoJobId=job.id;
  root.StarfallImagingUI7F.persist();
 }catch(e){j.photoReason=String(e.message||e).slice(0,150);}
}
function advance(s,body,star,time,units,orbit){
 const o=root.StarfallSatelliteOps7C.ensure(s),b=bus(s);
 if(!finite(time))return b;
 const old=finite(b.lastS)?b.lastS:time,elapsed=Math.max(0,time-old);
 const dt=Math.min(elapsed,3600);
 if(elapsed>3600)addFault(b,time,'AWAITING_REVIEW: T07 cannot integrate more than one hour of lost spacecraft control time');
 b.lastS=time;
 const movement=dt*C.slewDegS;
 if(b.pointingErrorDeg>0){
  b.pointingErrorDeg=Math.max(0,b.pointingErrorDeg-movement);
  if(b.pointingErrorDeg<=C.maxPointingErrorDeg){b.mode=b.desiredMode;b.pointingErrorDeg=0;b.state='HOLDING';}
  else b.state='SLEWING';
 }
 const activeSlew=b.state==='SLEWING',extraW=o.enabled?
  (activeSlew?C.slewW:(b.mode==='SAFE'?0:C.trackW)):0;
 const debit=Math.min(o.energyJ,extraW*dt);o.energyJ=Math.max(0,o.energyJ-debit);
 s.powerJ=o.energyJ;b.activeW=extraW;
 if(o.energyJ<C.reserveJ&&b.mode!=='SAFE'){
  b.mode='SAFE';b.desiredMode='SAFE';b.state='BROWNOUT';o.pointing='safe';
  addFault(b,time,'Bus reserve reached; science and relay pointing paused');
 }else if(b.mode==='NADIR_IMAGING'&&b.pointingErrorDeg<=C.maxPointingErrorDeg)o.pointing='nadir';
 else if(b.mode==='SAFE')o.pointing='safe';
 if(!body?.position||!star||typeof orbit!=='function')return b;
 try{
  const status=inspect(s,body,star,time,units,orbit);
  b.lastOrbit={timeS:time,altitudeM:status.orbit.altitudeM,periodS:status.orbit.periodS,
   eclipse:status.eclipse,footprintRadiusM:status.footprintRadiusM,velocityMS:status.orbit.speedMS};
 }catch(e){addFault(b,time,'ORBIT_UNAVAILABLE: '+String(e.message||e));return b;}
 const F=root.StarfallFieldScience,height=root.Starfall3D?.groundHeight;
 for(const j of b.jobs){
  if(j.status!=='QUEUED'||j.eligibleAtS>time)continue;
  if(!F||!height){j.lastReason='Science or terrain provider unavailable';continue;}
  j.attempts++;j.lastAttemptS=time;
  if(j.attempts>36){j.status='PAUSED';j.lastReason='Too many denied capture windows; operator review required';continue;}
  try{
   preflight(s,body,star,time,units,orbit,j.sensor);
   const oldSensor=o.sensor;o.sensor=j.sensor;
   let obs;
   try{obs=root.StarfallSatelliteOps7C.capture(s,body,star,time,root.StarfallRuntime?.galaxy?.seed??s.seed??742,
     units,orbit,F,height);}finally{o.sensor=oldSensor;}
   if(o.storage.some(x=>x.id===obs.id)){
    obs.t07JobId=j.id;obs.captureDurationS=j.durationS;
    obs.captureStartS=j.createdAtS;obs.numericNotImage=j.sensor==='camera';
    j.observationId=obs.id;j.status='COMPLETED';j.completedAtS=time;j.lastReason='';
    b.lastObservationId=obs.id;emitImage(s,j,o,time);
    b.completed.push(copy(j));b.completed=b.completed.slice(-C.maxHistory);
   }
  }catch(e){j.lastReason=String(e.message||e).slice(0,180);
   if(/ATTITUDE_UNSETTLED|ECLIPSE|THERMAL|ORBIT_UNSAFE|POWER|STORAGE|interval/i.test(j.lastReason))
    j.eligibleAtS=time+Math.max(5,Math.min(120,j.durationS));
   else{j.status='PAUSED';addFault(b,time,j.lastReason);}
  }
 }
 b.jobs=b.jobs.filter(j=>j.status!=='COMPLETED');return b;
}
function radioReady(s){
 const o=root.StarfallSatelliteOps7C.ensure(s),b=bus(s);
 return o.enabled&&o.radioEnabled&&o.energyJ>=root.StarfallSatelliteOps7C.CONFIG.radioW*2+
  (b.mode==='SAFE'?0:100)&&b.mode!=='SAFE'&&b.health>.15;
}
function predict(s,body,star,at,units,orbit,receiverAt,radioLink,bodyAt=null,count=3){
 if(!finite(at)||typeof receiverAt!=='function'||typeof radioLink!=='function')return{passes:[],sunWindows:[],reason:'No prediction ephemeris/receiver'};
 const q=orbit(s,body,at,units),period=q.periodS;
 if(!(finite(period)&&period>0))return{passes:[],sunWindows:[],reason:'No valid achieved Kepler period'};
 const end=at+Math.min(period*3,86400),step=Math.max(10,(end-at)/C.predictionSamples);
 const passes=[],sunWindows=[];let pass=null,sun=null;
 for(let t=at;t<=end+step*.4;t+=step){
  let b=body;if(bodyAt){b=bodyAt(t);if(!b?.position)break;}
  let g;try{g=root.StarfallSatelliteOps7C.geometry(s,b,star,t,units,orbit);}catch(_){continue;}
  const raw=receiverAt(t,b),receiver=Array.isArray(raw)?raw:raw?.position;
  const link=receiver&&radioLink(g.position,receiver,[{position:b.position,radius:b.radius}],
   root.StarfallSatelliteOps7C.CONFIG.radioRangeScene,units);
  if(link?.connected&&!pass)pass={startS:t,endS:t};
  if(link?.connected&&pass)pass.endS=t+step;
  else if(!link?.connected&&pass){passes.push(pass);pass=null;}
  if(g.sunlit&&!sun)sun={startS:t,endS:t};
  if(g.sunlit&&sun)sun.endS=t+step;
  else if(!g.sunlit&&sun){sunWindows.push(sun);sun=null;}
  if(passes.length>=count&&sunWindows.length>=count)break;
 }
 if(pass)passes.push(pass);if(sun)sunWindows.push(sun);
 const o=root.StarfallSatelliteOps7C.ensure(s);
 return{passes:passes.slice(0,count),sunWindows:sunWindows.slice(0,count),
  nextContactS:passes[0]?.startS??null,
  nextSolarS:sunWindows[0]?.startS??null,
  estimatedBatteryFullS:o.lastSolarW>o.lastLoadW?(o.capacityJ-o.energyJ)/(o.lastSolarW-o.lastLoadW):null,
  predictionModel:'Sampled single authoritative Kepler state and actual current receiver sites; no invented interplanetary endpoint'};
}
const API={CONFIG:C,MODES,DUR,bus,command,inspect,preflight,schedule,advance,radioReady,predict};
root.StarfallOrbitalBusT07=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
