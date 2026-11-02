/* STARFALL T06 — deployed rover landing, navigation & servicing contract.
 * Authoritative states: launch7 missions/rovers, ground7d programs, outpost5
 * batteries, imaging7f jobs, commsT03 radio packets. No mirrored inventory.
 */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),finite=Number.isFinite;
const G0=9.80665,RAD=Math.PI/180,UNIT=()=>root.StarfallPhysics?.SCENE_METERS_PER_UNIT||1000;
const norm=x=>{const k=Math.hypot(...x)||1;return x.map(a=>a/k);};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a);
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const instruments=new Set(['spectrometer','thermometer','barometer','magnetometer','radar','seismometer','sampler','bioassay']);
const camModes=new Set(['forward','left','right','panorama','target']);
const states=Object.freeze(['IN_PAYLOAD','ORBIT','TRANSFER','ENTRY','DESCENT','LANDING','DEPLOYED','READY','TRAVERSING','SCIENCE','SAFE_STOP','FAULT','RECOVERY']);
function fromLatLon(lat,lon){if(!finite(lat)||!finite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('T06 landing/waypoint latitude or longitude out of bounds');const a=lat*RAD,b=lon*RAD;return [Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)];}
function latLon(local){const d=norm(local);return{lat:Math.asin(clamp(d[1],-1,1))/RAD,lon:Math.atan2(d[0],d[2])/RAD};}
function parse(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
 if(!lines.length||lines.length>24)throw Error('Rover program must contain 1–24 commands');
 return lines.map(line=>{
  const a=line.split(/\s+/),op=a[0]?.toUpperCase();const v=a.slice(1);
  if(['DRIVE','TURN','WAIT'].includes(op)){
   if(v.length!==1||!finite(Number(v[0])))throw Error(op+' requires one finite number');
   const n=Number(v[0]),range=op==='DRIVE'?[0,300]:op==='WAIT'?[0,120]:[-180,180];
   if(n<range[0]||n>range[1])throw Error('Unsafe '+op+' parameter');
   return{op,value:n};
  }
  if(op==='SAMPLE'){if(v.length!==1||!instruments.has(v[0]))throw Error('Unsupported remote instrument');return{op,value:v[0]};}
  if(op==='CAPTURE'){
   if(v.length!==2||!camModes.has(v[0])||![256,512].includes(Number(v[1])))throw Error('CAPTURE requires mode forward|left|right|panorama|target and 256/512 px');
   return{op,mode:v[0],resolution:Number(v[1])};
  }
  if(['GO_TO','TARGET'].includes(op)){
   if(v.length!==2||!v.every(x=>x.trim()!==''&&finite(Number(x))))throw Error('GO_TO requires latitude and longitude in degrees');
   const lat=Number(v[0]),lon=Number(v[1]);return{op:'GO_TO',lat,lon,local:fromLatLon(lat,lon)};
  }
  if(['RETURN','DOCK','STATUS','STOP'].includes(op)){if(v.length)throw Error(op+' takes no arguments');return{op};}
  throw Error('Unknown rover command: '+line);
 });
}
function hardware(r){
 if(!r||!r.id||!r.bodyId||!Array.isArray(r.local))throw Error('Real deployed rover ID, planet and site required');
 const raw=r.roverT06||{};
 const old=typeof r.status==='string'?r.status:'parked';
 const state=states.includes(raw.state)?raw.state:old==='running'?'TRAVERSING':old==='safe-stop'?'SAFE_STOP':old==='fault'?'FAULT':'READY';
 const out={schema:1,state,homeLocal:Array.isArray(raw.homeLocal)&&raw.homeLocal.length===3&&raw.homeLocal.every(finite)?norm(raw.homeLocal):norm(r.local),
  deliveredAtS:finite(raw.deliveredAtS)?raw.deliveredAtS:(finite(r.lastS)?r.lastS:0),
  landSiteId:String(raw.landSiteId||'legacy-installed').slice(0,90),
  landing:raw.landing&&typeof raw.landing==='object'?raw.landing:null,
  fault:String(raw.fault||'').slice(0,180),
  faults:Array.isArray(raw.faults)?raw.faults.slice(-30):[],
  cameraJobIds:Array.isArray(raw.cameraJobIds)?raw.cameraJobIds.filter(x=>typeof x==='string').slice(-24):[],
  chargeReadyAtS:finite(raw.chargeReadyAtS)?raw.chargeReadyAtS:0,
  health:finite(raw.health)?clamp(raw.health,0,1):1};
 r.roverT06=out;return out;
}
function fault(r,at,why,mode='SAFE_STOP'){
 const hw=hardware(r);if(hw.fault!==why||hw.state!==mode){hw.fault=why;hw.faults.push({timeS:at,state:mode,reason:String(why).slice(0,180)});hw.faults=hw.faults.slice(-30);}
 hw.state=mode;r.status=mode==='FAULT'?'fault':'safe-stop';return hw;
}
function terrainAt(body,local,height,unit=UNIT()){
 if(!body?.landable||!finite(body.radius)||typeof height!=='function'||!Array.isArray(local))throw Error('Destination solid terrain and original height field required');
 const h=height(norm(local),body);if(!finite(h))throw Error('Destination height sample unavailable');return h*unit;
}
function footprint(body,local,height,unit=UNIT()){
 const up=norm(local),east=norm(cross(Math.abs(up[1])>.96?[0,0,1]:[0,1,0],up)),north=norm(cross(up,east));
 const radius=body.radius*unit,h0=terrainAt(body,up,height,unit),corners=[];
 for(const x of [-7,0,7])for(const z of [-7,0,7]){
  const n=norm(up.map((v,i)=>v+(east[i]*x+north[i]*z)/radius));
  corners.push(terrainAt(body,n,height,unit));
 }
 const delta=Math.max(...corners)-Math.min(...corners),grade=Math.atan2(delta,14)*180/Math.PI;
 return{heightM:h0,roughnessM:delta,slopeDeg:grade,safe:grade<=16&&delta<=4.5,
  reason:grade>16?'HAZARD: entry footprint slope exceeds 16°':delta>4.5?'HAZARD: footprint relief exceeds 4.5 metres':'SAFE'};
}
function chooseSite(body,height,missionId,preferred=null,unit=UNIT()){
 if(!body?.landable||!finite(body.radius))throw Error('Rover capsule destination is not a valid solid planet');
 if(preferred){const site=footprint(body,preferred,height,unit);return{local:norm(preferred),...site,siteId:'specified-'+body.id};}
 let best=null;
 const hash=x=>{let h=2166136261>>>0;for(const c of x)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 for(let i=0;i<32;i++){
  const h=hash(String(body.seed)+':'+body.id+':'+missionId+':'+i);
  const lat=Math.asin(2*((h&65535)+.5)/65536-1)/RAD,lon=(((h>>>16)+.5)/65536*360)-180;
  const local=fromLatLon(lat,lon),v=footprint(body,local,height,unit);
  const site={local,...v,siteId:'seeded-'+body.id+'-'+i};
  if(!best||site.slopeDeg<best.slopeDeg)best=site;
  if(site.safe)return site;
 }
 return best;
}
function landingDecision(body,site,descent,{entryVelocityMS=2200,propellantJ=110e6,capsuleMassKg=1680}={}){
 const g=Math.max(.02,(body.gravity||1)*G0),energy=capsuleMassKg*g*1800+0.5*capsuleMassKg*(entryVelocityMS*.065)**2;
 const aerodynamic=String(body.atmosphere||'').toLowerCase().includes('vacuum')?0.0:.65;
 const demand=energy*(1-.35*aerodynamic),burn=Math.max(0,propellantJ-demand);
 const safe=site.safe&&propellantJ>=demand&&entryVelocityMS<=5500;
 return{safe,requiredJ:demand,propellantRemainingJ:burn,entryVelocityMS,estimatedTouchdownMS:safe?1.45:Math.max(8,entryVelocityMS*.065),
  reason:!site.safe?site.reason:propellantJ<demand?'DESCENT_PROPELLANT_EXHAUSTED':entryVelocityMS>5500?'ENTRY_HEAT_ENVELOPE_EXCEEDED':'SOFT_LANDING',
  model:'Fictional single-use powered capsule: conservative energy+roughness envelope, NOT a continuous aerodynamic 6DOF trajectory'};
}
function route(r,body,target,unit=UNIT()){
 if(!body||!Array.isArray(target))return{ok:false,reason:'Destination map ephemeris unavailable'};
 const current=norm(r.local),dest=norm(target),ang=Math.acos(clamp(dot(current,dest),-1,1)),distanceM=ang*body.radius*unit;
 const pole=Math.abs(current[1])>.95?[1,0,0]:[0,1,0],east=norm(cross(current,pole)),north=norm(cross(current,east));
 const v=norm(subtract(dest,current.map(x=>x*dot(dest,current))));
 const heading=((Math.atan2(dot(v,north),dot(v,east))+2*Math.PI)%(2*Math.PI));
 return{ok:finite(distanceM),heading,distanceM,etaS:distanceM/1.2,
  reason:distanceM<2?'AT_WAYPOINT':'WAYPOINT_ROUTE',
  targetLocal:dest,coordinates:latLon(dest)};
}
function dockingTarget(r,body,items,unit=UNIT()){
 const batteries=items.filter(x=>x.kind==='battery'&&x.bodyId===body.id&&x.enabled!==false&&x.condition>.1&&x.energyJ>1000000);
 return batteries.map(x=>({battery:x,distanceM:Math.acos(clamp(dot(norm(x.local),norm(r.local)),-1,1))*body.radius*unit}))
  .sort((a,b)=>a.distanceM-b.distanceM)[0]||null;
}
function service(r,source,body,outposts,simS,unit=UNIT()){
 const hw=hardware(r),T=root.StarfallPowerLedgerT02;
 if(!T?.transfer||!body?.id||body.id!==r.bodyId||!outposts?.store?.items?.includes(source))
  throw Error('ROVER SERVICE: real local battery source and original T02 ledger required');
 if(source.kind!=='battery'||source.enabled===false||source.condition<=.1||
  !outposts.powerReports.get(body.id)?.byId?.[source.id]?.power)
  throw Error('ROVER SERVICE: live powered, enabled outpost battery socket required');
 const dist=Math.acos(clamp(dot(norm(source.local),norm(r.local)),-1,1))*body.radius;
 if(dist>36)throw Error('ROVER SERVICE: within 36 scene units of physical battery connector required');
 if(simS<hw.chargeReadyAtS)throw Error('ROVER SERVICE: charging connector cooldown');
 const j=T.transfer({id:source.id,energyJ:source.energyJ,capacityJ:root.StarfallOutposts.SPECS.battery.capacityJ},
 {id:r.id,energyJ:r.batteryJ,capacityJ:22e6},180000,{efficiency:.9,maxPowerW:6000,seconds:40,maxSourceJ:220000});
 if(!(j.deliveredJ>0))throw Error('ROVER SERVICE: source empty or rover fully charged');
 source.energyJ=j.fromEnergyJ;r.batteryJ=j.toEnergyJ;hw.chargeReadyAtS=simS+40;
 if(hw.state==='SAFE_STOP'&&r.batteryJ>600000){hw.state='READY';hw.fault='';r.status='parked';}
 return{...j,distanceScene:dist,roverBatteryJ:r.batteryJ};
}
const API={SCHEMA:1,states,parse,hardware,fault,fromLatLon,latLon,footprint,chooseSite,landingDecision,route,dockingTarget,service};
root.StarfallRoverT06=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
