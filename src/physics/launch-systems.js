/* STARFALL 7 - modular launch engineering and seeded mission inventory.
   SI units for rocket performance. Guided ascent is an explicitly approximate
   launch-state visualization, while deployed satellites use two-body circular orbits.
   Interstellar transit is FICTIONAL warp-carrier transport, never rocket thrust. */
(function(root){'use strict';
const MAX_INVENTORY=Object.freeze({launches:240,satellites:160,rovers:100});
const G0=9.80665,TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ENGINES=Object.freeze({
 'aether':{label:'Aether vacuum bell',thrustN:980000,ispS:356,dryKg:880},
 'atlas':{label:'Atlas sea-level engine',thrustN:2280000,ispS:318,dryKg:1380},
 'cluster':{label:'Tri-engine cluster',thrustN:5400000,ispS:332,dryKg:3200}
});
const PAYLOADS=Object.freeze({'relay':{label:'Communications satellite',massKg:480},'observatory':{label:'Science satellite',massKg:730},'rover':{label:'Autonomous survey rover + landing capsule',massKg:1680}});
const safe=x=>JSON.parse(JSON.stringify(x));
function checked(x,values,label){if(!Object.hasOwn(values,x))throw Error('Unknown '+label);return x;}
function build(def={},profile={}){
 const engine=ENGINES[checked(def.engine||'atlas',ENGINES,'engine')],payload=PAYLOADS[checked(def.payload||'relay',PAYLOADS,'payload')];
 const tanks=clamp(Math.round(Number(def.tanks)||4),1,16),stages=clamp(Math.round(Number(def.stages)||2),1,3),boosters=clamp(Math.round(Number(def.boosters)||0),0,4);
 const g=Number.isFinite(profile.surfaceGravityMS2)?profile.surfaceGravityMS2:G0,r=Number.isFinite(profile.radiusM)?profile.radiusM:6.4e6,mu=Number.isFinite(profile.mu)?profile.mu:g*r*r;
 if(!(g>0&&r>0&&mu>0))throw Error('Invalid gravity or body radius');
 const stageConfig=[];for(let i=0;i<stages;i++){
  const entry=Array.isArray(def.stageConfig)?def.stageConfig[i]:null;
  const count=entry?Number(entry.tanks):Math.max(1,Math.floor(tanks/(i+1)));
  if(entry&&(!Number.isInteger(count)||count<1||count>16))throw Error('Stage '+(i+1)+' requires 1–16 tank modules');
  const engineId=checked(entry?.engine|| (i===0?(def.engine||'atlas'):'aether'),ENGINES,'stage engine');
  if(!Number.isFinite(count))throw Error('Invalid stage tank count');
  stageConfig.push({tanks:count,engine:engineId});
 }
 const boosterPropKg=boosters*4500,boosterDryKg=boosters*320,boosterThrustN=boosters*1350000,boosterIspS=280;
 const stageParts=stageConfig.map(({tanks:count,engine:engineId})=>{
  const e=ENGINES[engineId];return {tanks:count,engine:engineId,dryKg:count*640+e.dryKg,propKg:count*6600,ispS:e.ispS,thrustN:e.thrustN,label:e.label};
 });
 let above=payload.massKg+210,deltaV=0,burnTimeS=0;
 for(let i=stageParts.length-1;i>=0;i--){const stage=stageParts[i],boosterDry=i===0?boosterDryKg:0,boosterProp=i===0?boosterPropKg:0;
  const wet=above+stage.dryKg+stage.propKg+boosterDry+boosterProp,dry=above+stage.dryKg+boosterDry;
  // For boosters burning in parallel this is only an ideal delta-v estimate, never the flight solver.
  const combinedIsp=i===0&&boosters>0?(stage.ispS*stage.thrustN+boosterIspS*boosterThrustN)/(stage.thrustN+boosterThrustN):stage.ispS;
  deltaV+=combinedIsp*G0*Math.log(wet/dry);burnTimeS+=stage.propKg*stage.ispS*G0/stage.thrustN;
  above=wet;
 }
 const massKg=above,circularSpeedMS=Math.sqrt(mu/(r+180000)),requiredDeltaVMS=circularSpeedMS+g*135+380;
 const launchTWR=(stageParts[0].thrustN+boosterThrustN)/(g*massKg);
 const valid=launchTWR>=1.08&&deltaV>=requiredDeltaVMS;
 return{engine:def.engine||'atlas',tanks,stages,boosters,payload:def.payload||'relay',payloadKg:payload.massKg,stageParts,stageConfig,boosterPropKg,boosterDryKg,boosterThrustN,boosterIspS,massKg,deltaVMS:deltaV,burnTimeS,circularSpeedMS,requiredDeltaVMS,launchTWR,valid,problem:launchTWR<1.08?'Low liftoff thrust-to-weight ratio':deltaV<requiredDeltaVMS?'Ideal delta-v below preliminary launch budget':'Preliminary launch envelope reasonable',mu,radiusM:r,model:'Ideal stage delta-v is only a design estimate. Powered flight integrates variable-mass thrust, central gravity and simplified atmospheric drag.'};
}
function norm(v){const n=Math.hypot(...v);return n>1e-9?v.map(x=>x/n):[0,1,0];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function add(a,b){return a.map((x,i)=>x+b[i]);}function mul(a,v){return a.map(x=>x*v);}
function rotate(v,axis,angle){const u=norm(axis),c=Math.cos(angle),ss=Math.sin(angle),k=cross(u,v),dot=u.reduce((z,a,i)=>z+a*v[i],0);return add(add(mul(v,c),mul(k,ss)),mul(u,dot*(1-c)));}
function tangent(direction){const radial=norm(direction),pole=Math.abs(radial[1])>.95?[1,0,0]:[0,1,0];return norm(cross(radial,pole));}
function orbit(relay,body,time,unit){
 // 7B: newly launched payloads retain orbital energy, eccentricity, and phase.
 // Analytic two-body Kepler propagation uses their true insertion state; it does
 // NOT replace an elliptical launch with an invented circular satellite orbit.
 const state=relay.inertial2d;
 if(state&&[state.x,state.y,state.vx,state.vy,state.mu,state.epochS].every(Number.isFinite)&&state.mu>0){
  const {x,y,vx,vy,mu}=state,r0=Math.hypot(x,y),h=x*vy-y*vx,energy=(vx*vx+vy*vy)/2-mu/r0,a=-mu/(2*energy);
  if(energy<0&&a>0){
   const ex=vy*h/mu-x/r0,ey=-vx*h/mu-y/r0,e=Math.hypot(ex,ey);
   if(e<1){const per=e>1e-8?[ex/e,ey/e]:[x/r0,y/r0],perp=[-per[1],per[0]],cross2=per[0]*y-per[1]*x;
    const cosNu=(per[0]*x+per[1]*y)/r0,sinNu=cross2/r0;
    const ecc0=Math.atan2(Math.sqrt(1-e*e)*sinNu/(1+e*cosNu),(e+cosNu)/(1+e*cosNu));
    const n=Math.sqrt(mu/(a*a*a)),M=ecc0-e*Math.sin(ecc0)+n*(time-state.epochS);
    let ecc=M;for(let i=0;i<12;i++){const den=Math.max(1e-6,1-e*Math.cos(ecc)),shift=(ecc-e*Math.sin(ecc)-M)/den;ecc-=shift;if(Math.abs(shift)<1e-12)break;}
    const px=a*(Math.cos(ecc)-e),py=a*Math.sqrt(1-e*e)*Math.sin(ecc),xx=per[0]*px+perp[0]*py,yy=per[1]*px+perp[1]*py;
    const up=norm(state.launchUp||relay.axis||[0,1,0]),side=tangent(up),position=add(body.position,mul(add(mul(up,xx),mul(side,yy)),1/unit));
    return{position,periodS:TAU/n,periapsisM:a*(1-e)-body.radius*unit,apoapsisM:a*(1+e)-body.radius*unit,eccentricity:e};
   }
  }
 }
 // Update 7 and earlier saved satellites retain their legacy analytic circle.
 const r=body.radius+relay.altitudeM/unit,period=TAU*Math.sqrt(Math.pow(body.radius*unit+relay.altitudeM,3)/relay.mu),ang=(time-relay.epochS)*TAU/period+relay.phase,up=norm(relay.axis),e1=tangent(up),e2=norm(cross(up,e1));return{position:add(body.position,mul(add(mul(e1,Math.cos(ang)),mul(e2,Math.sin(ang))),r)),periodS:period};
}
function moveOnSphere(local,metres,heading,radiusScene){const u=norm(local),axis=norm(cross(u,tangent(u))),dir=norm(add(mul(tangent(u),Math.cos(heading)),mul(axis,Math.sin(heading))));const a=metres/Math.max(1,radiusScene);return norm(add(mul(u,Math.cos(a)),mul(dir,Math.sin(a))));}
function validateScript(text){if(root.StarfallRoverT06)return root.StarfallRoverT06.parse(text);
const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));if(lines.length>24)throw Error('Maximum 24 script commands');const commands=[];for(const line of lines){const m=/^(DRIVE|TURN|WAIT|SAMPLE|STOP)(?:\s+([\w.\-]+))?$/i.exec(line);if(!m)throw Error('Unknown command: '+line);const op=m[1].toUpperCase(),value=m[2]||'';if(op==='DRIVE'||op==='TURN'||op==='WAIT'){const n=Number(value);if(!Number.isFinite(n)||n< (op==='TURN'?-180:0)||n>(op==='DRIVE'?300:op==='WAIT'?120:180))throw Error('Unsafe '+op+' parameter');commands.push({op,value:n});}else if(op==='SAMPLE'){if(!['spectrometer','thermometer','barometer','magnetometer','radar','seismometer','sampler','bioassay'].includes(value))throw Error('Unsupported remote instrument');commands.push({op,value});}else commands.push({op});}return commands;}
class Store{
 constructor(seed,saved){this.seed=seed;this.launches=[];this.satellites=[];this.rovers=[];this.serial=0;this.restore(saved);}
 restore(saved){if(saved?.schema!==1||saved.seed!==this.seed)return;this.serial=clamp(Number(saved.serial)||0,0,1e8);this.launches=(Array.isArray(saved.launches)?saved.launches:[]).filter(x=>x?.id&&x.bodyId&&Number.isFinite(x.startS));this.satellites=(Array.isArray(saved.satellites)?saved.satellites:[]).filter(x=>x?.id&&x.bodyId&&Number.isFinite(x.altitudeM)&&x.altitudeM>0&&Number.isFinite(x.mu)&&x.mu>0&&Array.isArray(x.axis));this.rovers=(Array.isArray(saved.rovers)?saved.rovers:[]).filter(x=>x?.id&&x.bodyId&&Array.isArray(x.local)&&x.local.length===3&&x.local.every(Number.isFinite)).map(x=>({...x,local:norm(x.local),commands:Array.isArray(x.commands)?x.commands.slice(0,24):[],heading:Number.isFinite(x.heading)?x.heading:0}));}
 serialize(){return safe({schema:1,seed:this.seed,serial:this.serial,launches:this.launches,satellites:this.satellites,rovers:this.rovers});}
 launch({body,foundation,design,time,destinationBody=null,destinationSystem=null,landingLocal=null,unit=1000,padContext=null}){
  // Legacy designs synthesize stage propellant and a satellite/rover payload.
  // They remain available in legacy saves, never as a free Industrial path.
  // 8G dry structures explicitly have no pressure/hot-fire certification or
  // propellant: their presence alone cannot authorize this legacy launcher.
  if(root.SF?.load?.()?.freshExpedition?.schema===1)
   throw Error('Industrial ignition requires qualified manufactured stages, payload and source-owned propellant. The legacy Rocket Lab is design-preview only; an 8G dry shell is not launch-ready.');
  if(!body?.id||!body.landable||foundation?.kind!=='foundation'||foundation.bodyId!==body.id)throw Error('Select an actual surface foundation as launch pad');
  if(!Number.isFinite(time)||time<0)throw Error('Invalid mission time');
  if(this.launches.length>=MAX_INVENTORY.launches)throw Error('Launch archive full: export/backup your save before removing completed missions; no records were deleted');
  const wantsRover=design?.payload==='rover';
  if(this[wantsRover?'rovers':'satellites'].length+this.launches.filter(m=>m.phase!=='failed'&&m.phase!=='deployed'&&(m.payload==='rover')===wantsRover).length>=(wantsRover?MAX_INVENTORY.rovers:MAX_INVENTORY.satellites))throw Error('Destination payload inventory full; no asset was discarded');
  const g=body.gravity*G0,radiusM=body.radius*unit,mu=g*radiusM**2;
  const profile=build(design,{surfaceGravityMS2:g,radiusM,mu});
  if(profile.payload==='rover'&&(!destinationBody?.landable||!destinationSystem?.id))throw Error('Rover requires a solid target body and destination system');
  if(this.launches.some(x=>x.padId===foundation.id&&['ascent','coast'].includes(x.phase)))throw Error('Launch pad in use');
  if(!root.StarfallRocketFlight7B)throw Error('7B force-integrated flight model unavailable');
  const atm=body.atmosphere;
  const rho0=Number.isFinite(atm?.densityKgM3)?atm.densityKgM3:(atm?1.05:0);
  const flight=root.StarfallRocketFlight7B.init(profile,{radiusM,mu,rho0,scaleHeightM:8000,areaM2:14},{mode:design?.mode||'assisted',targetAltitudeM:design?.targetAltitudeM||180000});
  if(root.StarfallPadT11)root.StarfallPadT11.validateLaunch({pad:foundation,body,launchStore:this,design,destinationBody,destinationSystem,landingLocal,...(padContext||{})});
  const id='launch-'+this.seed+'-'+(++this.serial);
  const mission={id,padId:foundation.id,bodyId:body.id,systemId:body.systemId,destinationSnapshot:destinationBody?{...safe(destinationBody),moons:[],sites:[],parentOrbit:destinationBody.parentId?(()=>{const p=root.StarfallRuntime?.galaxy?.byId?.get(destinationBody.parentId);return p?{id:p.id,orbitRadius:p.orbitRadius,orbitPeriod:p.orbitPeriod,phase:p.phase,tilt:p.tilt}:null;})():null}:null,
   local:norm(foundation.local),launchUp:rotate(norm(foundation.local),body.spinAxis||[0,1,0],body.spinAngle||0),startS:time,phase:'ascent',elapsedS:0,ascentS:profile.burnTimeS+45,altitudeM:flight.targetAltitudeM,profile,flight,velocityMS:0,trajectoryAltitudeM:0,stage:0,payload:profile.payload,destinationBodyId:destinationBody?.id||body.id,destinationSystemId:destinationSystem?.id||body.systemId,landingTargetLocal:landingLocal?norm(landingLocal):null,transferS:0,lastUpdateS:time,completedAtS:null};
  if(root.StarfallPadT11)mission.payloadT11=root.StarfallPadT11.manifest({mission,design,profile,body,destinationBody,destinationSystem,landingLocal});
  this.launches.push(mission);return safe(mission);
 }
 control(id,op,value){const m=this.launches.find(v=>v.id===id);if(!m?.flight||!['ascent','coast'].includes(m.phase))throw Error('No active rocket to command');const F=root.StarfallRocketFlight7B;
  if(op==='stage'){if(!F.stage(m.flight,m.profile))throw Error('Stage is not ready');}
  else F.command(m.flight,op,value);return m;}
 update(time,byId){if(!Number.isFinite(time))return[];const events=[];const F=root.StarfallRocketFlight7B;
  for(const m of this.launches){if(['deployed','failed'].includes(m.phase)||time<m.startS)continue;
   if(m.phase==='ascent'||m.phase==='coast'){
    if(!m.flight){ // Upgrade 7 / 7A / 7A.1 active launches from an older save: retain ID,
     // restart physics from their pad rather than fabricate an orbital insertion.
     const b=byId(m.bodyId)||{},atm=b.atmosphere;
     const r=m.profile?.radiusM||(Number.isFinite(b.radius)?b.radius*1000:2e6),g=(Number.isFinite(b.gravity)?b.gravity:1)*G0;
     m.profile=build(m.profile||{},{surfaceGravityMS2:g,radiusM:r,mu:g*r*r});
     m.flight=F.init(m.profile,{radiusM:r,mu:g*r*r,rho0:atm?1.05:0});m.lastUpdateS=time;m.migratedLegacyFlight=true;
    }
    const available=Math.max(0,time-(m.lastUpdateS||m.startS));
    if(available>0){const result=F.advance(m.flight,m.profile,available);m.lastUpdateS+=result.advancedS;m.elapsedS=m.flight.elapsedS;m.stage=m.flight.stageIndex;m.trajectoryAltitudeM=Math.max(0,result.orbit?.altitudeM||0);m.velocityMS=result.orbit?.speedMS||0;
     for(const item of result.events){if(item==='STAGE_SEPARATED')events.push({id:m.id,kind:'stage',message:'Stage separated under integrated flight'});}}
    if(m.flight.phase==='failed'){m.phase='failed';m.failure=m.flight.reason;events.push({id:m.id,kind:'failed',message:'Launch failed: '+m.failure});continue;}
    if(m.flight.phase==='orbit'){
     const orbital=F.elements(m.flight,m.profile.mu,m.profile.radiusM);m.altitudeM=Math.max(25000,orbital?.semiMajorM-m.profile.radiusM||180000);
     m.phase='orbit';m.orbitalElements=orbital;
     if(m.payload==='rover'&&m.destinationSystemId!==m.systemId){m.phase='transfer';const from=byId(m.systemId),to=byId(m.destinationSystemId),sep=from&&to?Math.hypot(...from.position.map((v,i)=>v-to.position[i])):1e7;m.transferS=Math.max(180,sep/5000000);m.transferStartS=m.lastUpdateS;events.push({id:m.id,kind:'transfer',message:'Physical orbit achieved; fictional warp carrier in transit'});continue;}
     if(this.deploy(m,m.lastUpdateS,byId))events.push({id:m.id,kind:m.payload==='rover'&&root.StarfallRoverT06?'entry':'deployed',message:m.payload==='rover'&&root.StarfallRoverT06?'Real rover capsule entry sequence started':'Payload deployed from achieved bound orbit'});
     else events.push({id:m.id,kind:'failed',message:'Payload deployment failed: '+m.failure});
    }else m.phase=m.flight.phase==='coast'||m.flight.phase==='awaiting-stage'?'coast':'ascent';
   }else if(m.phase==='transfer'&&time-m.transferStartS>=m.transferS){if(this.deploy(m,time,byId))events.push({id:m.id,kind:'entry',message:'Fictional interstellar carrier arrival; powered capsule entry still required'});else events.push({id:m.id,kind:'failed',message:'Payload delivery failed: '+m.failure});}
   else if(m.phase==='entry'&&root.StarfallRoverT06&&time-m.entryAtS>=12){
    const r=this.rovers.find(x=>x.launchId===m.id);if(r){m.phase='descent';m.descentAtS=m.entryAtS+12;
      r.status='descent';root.StarfallRoverT06.hardware(r).state='DESCENT';
      events.push({id:m.id,kind:'descent',message:'Rover capsule entry envelope reached; descending to independently validated destination site'});}
    else{m.phase='failed';m.failure='Capsule lost before descent';}
   }else if(m.phase==='descent'&&root.StarfallRoverT06&&time-m.descentAtS>=26){
    const r=this.rovers.find(x=>x.launchId===m.id),T=root.StarfallRoverT06,hw=r&&T.hardware(r);
    if(!r||!hw){m.phase='failed';m.failure='Capsule asset missing';continue;}
    const decision=hw.landing;if(!decision?.safe){m.phase='failed';m.failure=decision?.reason||'No safe verified landing';
      T.fault(r,time,m.failure,'FAULT');r.batteryJ=Math.max(0,r.batteryJ-100000);
      events.push({id:m.id,kind:'failed',message:'Capsule touchdown failed: '+m.failure});continue;}
    r.status='parked';hw.state='READY';hw.deliveredAtS=m.descentAtS+26;hw.fault='';
    m.phase='deployed';m.completedAtS=hw.deliveredAtS;
    events.push({id:m.id,kind:'deployed',message:'Destination terrain verified; capsule soft landing '+decision.estimatedTouchdownMS+' m/s; rover deployed at '+hw.landSiteId});
   }
  }if(root.StarfallPadT11)for(const m of this.launches)root.StarfallPadT11.observe(m,time);return events;}
 deploy(m,time,byId){const body=byId(m.destinationBodyId)||m.destinationSnapshot;if(!body){m.phase='failed';m.failure='Destination body and saved snapshot unavailable';return false;}
  const kind=m.payload==='rover'?'rovers':'satellites';if(this[kind].length>=MAX_INVENTORY[kind]){m.phase='failed';m.failure='Payload inventory cap reached during deployment; existing assets preserved';return false;}
  if(this[kind].some(x=>x.launchId===m.id)){m.phase='failed';m.failure='Duplicate payload from this launch prevented';return false;}
  if(root.StarfallPadT11){const check=root.StarfallPadT11.canDeploy(m);if(!check.ok){m.phase='failed';m.failure=check.reason;return false;}}
  if(m.payload==='rover'){
   const T=root.StarfallRoverT06;
   let site=null,landing=null;
   if(T){
    try{site=T.chooseSite(body,(u,b)=>root.Starfall3D.groundHeight(u,b),m.id,
      m.landingTargetLocal,root.StarfallPhysics?.SCENE_METERS_PER_UNIT||1000);
      landing=T.landingDecision(body,site);
    }catch(e){m.phase='failed';m.failure='Unsafe/unresolved rover landing: '+e.message;return false;}
   }
   const start=site?.local||norm(m.local),rover={id:'probe-'+m.id,launchId:m.id,bodyId:body.id,systemId:body.systemId,
    local:start,bodySnapshot:m.destinationSnapshot,heading:0,batteryJ:2.2e7,
    commands:[],index:0,remaining:0,records:[],status:T?'entry':'parked',lastS:time};
   if(T){const hw=T.hardware(rover);hw.state='ENTRY';hw.homeLocal=start;
    hw.landSiteId=site.siteId;hw.landing={...landing,site:{...site},entryAtS:time,descentAtS:time+12};
    m.entryAtS=time;m.descentAtS=time+12;m.phase='entry';m.landingT06={site:{...site},...landing};}
   this.rovers.push(rover);
  }
  else{const mu=Math.max(1,(body.gravity*G0)*Math.pow(body.radius*1000,2));this.satellites.push({id:'sat-'+m.id,launchId:m.id,bodyId:body.id,systemId:body.systemId,kind:m.payload,altitudeM:m.altitudeM,epochS:time,phase:0,axis:norm(m.launchUp||m.local),mu,inertial2d:m.flight?{x:m.flight.x,y:m.flight.y,vx:m.flight.vx,vy:m.flight.vy,mu:m.profile.mu,epochS:time,launchUp:m.launchUp||norm(m.local)}:undefined,bodySnapshot:{id:body.id,systemId:body.systemId,parentId:body.parentId||null,kind:body.kind,type:body.type,seed:body.seed,radius:body.radius,gravity:body.gravity,landable:body.landable,atmosphere:body.atmosphere,life:body.life,spinPeriod:body.spinPeriod,spinPhase:body.spinPhase,spinAxis:body.spinAxis,orbitRadius:body.orbitRadius,orbitPeriod:body.orbitPeriod,phase:body.phase,tilt:body.tilt,parentOrbit:body.parentId?(()=>{const p=root.StarfallRuntime?.galaxy?.byId?.get(body.parentId);return p?{id:p.id,orbitRadius:p.orbitRadius,orbitPeriod:p.orbitPeriod,phase:p.phase,tilt:p.tilt}:null;})():null},powerJ:5e6,radioRangeScene:180000});}
  if(root.StarfallPadT11)root.StarfallPadT11.release(m,this[kind][this[kind].length-1],time);
  if(m.phase!=='entry'){m.phase='deployed';m.completedAtS=time;}return true;}
 command(id,text){const r=this.rovers.find(x=>x.id===id);if(!r)throw Error('Rover not found');const cmd=validateScript(text);r.commands=cmd;r.index=0;r.remaining=0;r.status=cmd.length?'running':'parked';return r;}
 queueProgram(id,text,time,link){const r=this.rovers.find(x=>x.id===id);if(!r)throw Error('Rover not found');if(!root.StarfallGroundOps7D)throw Error('7D ground operations unavailable');const program=validateScript(text);return root.StarfallGroundOps7D.uplink(r,program,time,link);}
 queueStop(id,time,link){const r=this.rovers.find(x=>x.id===id);if(!r)throw Error('Rover not found');return root.StarfallGroundOps7D.stop(r,time,link);}

 tickRovers(time,byId,science,groundOps){if(groundOps?.enabled&&root.StarfallGroundOps7D){for(const r of this.rovers){const body=byId(r.bodyId)||r.bodySnapshot,link=groundOps.link(r,time);root.StarfallGroundOps7D.tick(r,time,{body,height:groundOps.height,science,seed:this.seed,link,unitScale:groundOps.unitScale||1000,onReceive:groundOps.onReceive});}return;}for(const r of this.rovers){const dt=clamp(time-(r.lastS||time),0,5);r.lastS=time;if(r.status!=='running'||!r.commands.length||!dt)continue;let remain=dt,loops=0;
  while(remain>0&&loops++<28&&r.index<r.commands.length){const op=r.commands[r.index];if(op.op==='STOP'){r.status='parked';r.index=r.commands.length;break;}
   if(op.op==='TURN'){r.heading=(r.heading+op.value*Math.PI/180)%(2*Math.PI);r.index++;continue;}
   if(op.op==='SAMPLE'){const body=byId(r.bodyId)||r.bodySnapshot;if(science&&body&&r.batteryJ>50000){try{const sample=science.sample({body,seed:this.seed,local:r.local,altitudeM:.6,instrument:op.value,simTime:time,nonce:r.records.length,energyAvailableJ:r.batteryJ});r.records.push({...sample,probeId:r.id});r.batteryJ-=sample.powerJ;}catch(error){r.status='instrument error: '+error.message;break;}}r.index++;continue;}
   const maximum=op.op==='DRIVE'?op.value/Math.max(.2,1.5):op.value;
   if(!r.remaining)r.remaining=maximum;
   const step=Math.min(remain,r.remaining);if(op.op==='DRIVE'){r.local=moveOnSphere(r.local,step*1.5,r.heading,(byId(r.bodyId)||r.bodySnapshot)?.radius||6000);r.batteryJ-=step*180;}
   remain-=step;r.remaining-=step;if(r.remaining<1e-7){r.remaining=0;r.index++;}if(r.batteryJ<=0){r.batteryJ=0;r.status='battery depleted';break;}
  }if(r.index>=r.commands.length&&r.status==='running')r.status='complete';}}
}
root.StarfallLaunch={G0,ENGINES,PAYLOADS,MAX_INVENTORY,build,orbit,validateScript,moveOnSphere,Store};
})(typeof window!=='undefined'?window:globalThis);
