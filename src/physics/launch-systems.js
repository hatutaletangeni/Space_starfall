/* STARFALL 7 - modular launch engineering and seeded mission inventory.
   SI units for rocket performance. Guided ascent is an explicitly approximate
   launch-state visualization, while deployed satellites use two-body circular orbits.
   Interstellar transit is FICTIONAL warp-carrier transport, never rocket thrust. */
(function(root){'use strict';
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
 const stageParts=[];for(let i=0;i<stages;i++){
  const count=Math.max(1,Math.floor(tanks/(i+1))),stageEngine=i===0?engine:ENGINES.aether;
  const propKg=count*6600,dryKg=count*640+stageEngine.dryKg+(i===0?boosters*320:0);
  stageParts.push({dryKg,propKg,ispS:stageEngine.ispS,thrustN:stageEngine.thrustN+(i===0?boosters*1350000:0),label:stageEngine.label});
 }
 let above=payload.massKg+210,deltaV=0,burnTimeS=0;
 for(let i=stageParts.length-1;i>=0;i--){const s=stageParts[i],wet=above+s.dryKg+s.propKg,dry=above+s.dryKg;deltaV+=s.ispS*G0*Math.log(wet/dry);burnTimeS+=s.propKg*s.ispS*G0/s.thrustN;above=wet;}
 const massKg=above,circularSpeedMS=Math.sqrt(mu/(r+350000)),requiredDeltaVMS=circularSpeedMS+g*135+380,twR=stageParts[0].thrustN/(g*massKg),valid=twR>=1.08&&deltaV>=requiredDeltaVMS;
 return{engine:def.engine||'atlas',tanks,stages,boosters,payload:def.payload||'relay',payloadKg:payload.massKg,stageParts,massKg,deltaVMS:deltaV,burnTimeS,circularSpeedMS,requiredDeltaVMS,launchTWR:twR,valid,problem:twR<1.08?'Launch thrust-to-weight ratio below 1.08':deltaV<requiredDeltaVMS?'Insufficient delta-v for guided orbit insertion':'Launch envelope satisfied',model:'ideal rocket equation + conservative modeled gravity/steering/drag losses; guided ascent is approximate'};
}
function norm(v){const n=Math.hypot(...v);return n>1e-9?v.map(x=>x/n):[0,1,0];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function add(a,b){return a.map((x,i)=>x+b[i]);}function mul(a,v){return a.map(x=>x*v);}
function tangent(direction){const radial=norm(direction),pole=Math.abs(radial[1])>.95?[1,0,0]:[0,1,0];return norm(cross(radial,pole));}
function orbit(relay,body,time,unit){const r=body.radius+relay.altitudeM/unit,period=TAU*Math.sqrt(Math.pow(body.radius*unit+relay.altitudeM,3)/relay.mu),ang=(time-relay.epochS)*TAU/period+relay.phase,up=norm(relay.axis),e1=tangent(up),e2=norm(cross(up,e1));return{position:add(body.position,mul(add(mul(e1,Math.cos(ang)),mul(e2,Math.sin(ang))),r)),periodS:period};}
function moveOnSphere(local,metres,heading,radiusScene){const u=norm(local),axis=norm(cross(u,tangent(u))),dir=norm(add(mul(tangent(u),Math.cos(heading)),mul(axis,Math.sin(heading))));const a=metres/Math.max(1,radiusScene);return norm(add(mul(u,Math.cos(a)),mul(dir,Math.sin(a))));}
function validateScript(text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));if(lines.length>24)throw Error('Maximum 24 script commands');const commands=[];for(const line of lines){const m=/^(DRIVE|TURN|WAIT|SAMPLE|STOP)(?:\s+([\w.\-]+))?$/i.exec(line);if(!m)throw Error('Unknown command: '+line);const op=m[1].toUpperCase(),value=m[2]||'';if(op==='DRIVE'||op==='TURN'||op==='WAIT'){const n=Number(value);if(!Number.isFinite(n)||n< (op==='TURN'?-180:0)||n>(op==='DRIVE'?300:op==='WAIT'?120:180))throw Error('Unsafe '+op+' parameter');commands.push({op,value:n});}else if(op==='SAMPLE'){if(!['spectrometer','thermometer','barometer','magnetometer','radar','seismometer','sampler','bioassay'].includes(value))throw Error('Unsupported remote instrument');commands.push({op,value});}else commands.push({op});}return commands;}
class Store{
 constructor(seed,saved){this.seed=seed;this.launches=[];this.satellites=[];this.rovers=[];this.serial=0;this.restore(saved);}
 restore(saved){if(saved?.schema!==1||saved.seed!==this.seed)return;this.serial=clamp(Number(saved.serial)||0,0,1e8);this.launches=(Array.isArray(saved.launches)?saved.launches:[]).slice(-45).filter(x=>x?.id&&x.bodyId&&Number.isFinite(x.startS));this.satellites=(Array.isArray(saved.satellites)?saved.satellites:[]).slice(-70).filter(x=>x?.id&&x.bodyId&&Number.isFinite(x.altitudeM)&&x.altitudeM>0&&Number.isFinite(x.mu)&&x.mu>0&&Array.isArray(x.axis));this.rovers=(Array.isArray(saved.rovers)?saved.rovers:[]).slice(-36).filter(x=>x?.id&&x.bodyId&&Array.isArray(x.local)&&x.local.length===3&&x.local.every(Number.isFinite)).map(x=>({...x,local:norm(x.local),commands:Array.isArray(x.commands)?x.commands.slice(0,24):[],heading:Number.isFinite(x.heading)?x.heading:0}));}
 serialize(){return safe({schema:1,seed:this.seed,serial:this.serial,launches:this.launches,satellites:this.satellites,rovers:this.rovers});}
 launch({body,foundation,design,time,destinationBody=null,destinationSystem=null,unit=1000}){
  if(!body?.id||!body.landable||foundation?.kind!=='foundation'||foundation.bodyId!==body.id)throw Error('Select an actual surface foundation as the launch pad');
  if(!Number.isFinite(time)||time<0)throw Error('Invalid mission time');
  const profile=build(design,{surfaceGravityMS2:body.gravity*G0,radiusM:body.radius*unit,mu:(body.gravity*G0)*Math.pow(body.radius*unit,2)});
  if(!profile.valid)throw Error(profile.problem+'; change engine, stages, tanks, or boosters');
  if(profile.payload==='rover'&&(!destinationBody?.landable||!destinationSystem?.id))throw Error('Rover requires a solid target body and destination system');
  if(this.launches.some(x=>x.padId===foundation.id&&x.phase==='ascent'))throw Error('Launch pad currently in use');
  const id='launch-'+this.seed+'-'+(++this.serial),ascentS=Math.max(38,profile.burnTimeS+45),altitudeM=350000;
  const mission={id,padId:foundation.id,bodyId:body.id,systemId:body.systemId,destinationSnapshot:destinationBody?{id:destinationBody.id,systemId:destinationBody.systemId,landable:destinationBody.landable,type:destinationBody.type,kind:destinationBody.kind,seed:destinationBody.seed,radius:destinationBody.radius,gravity:destinationBody.gravity,life:destinationBody.life,spinPeriod:destinationBody.spinPeriod,atmosphere:destinationBody.atmosphere}:null,local:norm(foundation.local),startS:time,phase:'ascent',elapsedS:0,ascentS,altitudeM,profile,velocityMS:0,trajectoryAltitudeM:0,stage:0,payload:profile.payload,destinationBodyId:destinationBody?.id||body.id,destinationSystemId:destinationSystem?.id||body.systemId,transferS:0,lastUpdateS:time,completedAtS:null};
  this.launches.push(mission);if(this.launches.length>45)this.launches.shift();return safe(mission);
 }
 update(time,byId){if(!Number.isFinite(time))return[];const events=[];for(const m of this.launches){if(['deployed','failed'].includes(m.phase)||time<m.startS)continue;m.lastUpdateS=time;const elapsed=time-m.startS;
  if(m.phase==='ascent'){
   m.elapsedS=Math.min(elapsed,m.ascentS);const f=clamp(m.elapsedS/m.ascentS,0,1);
   m.trajectoryAltitudeM=m.altitudeM*(3*f*f-2*f*f*f);m.velocityMS=m.profile.circularSpeedMS*f;m.stage=Math.min(m.profile.stages-1,Math.floor(f*m.profile.stages));
   if(f<1)continue;
   if(m.payload==='rover'&&m.destinationSystemId!==m.systemId){m.phase='transfer';const from=byId(m.systemId),to=byId(m.destinationSystemId);const sep=from&&to?Math.hypot(...from.position.map((v,i)=>v-to.position[i])):1e7;m.transferS=Math.max(180,sep/5000000);m.transferStartS=time;events.push({id:m.id,kind:'transfer',message:'Guided orbital insertion complete; FICTIONAL warp carrier crossing systems'});continue;}
   this.deploy(m,time,byId);events.push({id:m.id,kind:'deployed',message:'Payload deployed'});
  }else if(m.phase==='transfer'&&time-m.transferStartS>=m.transferS){this.deploy(m,time,byId);events.push({id:m.id,kind:'deployed',message:'Interstellar carrier delivered rover capsule'});}
 }return events;}
 deploy(m,time,byId){const body=byId(m.destinationBodyId)||m.destinationSnapshot;if(!body){m.phase='failed';return;}
  if(m.payload==='rover')this.rovers.push({id:'probe-'+m.id,launchId:m.id,bodyId:body.id,systemId:body.systemId,local:norm(m.local),bodySnapshot:m.destinationSnapshot,heading:0,batteryJ:2.2e7,commands:[],index:0,remaining:0,records:[],status:'parked',lastS:time});
  else{const mu=Math.max(1,(body.gravity*G0)*Math.pow(body.radius*1000,2));this.satellites.push({id:'sat-'+m.id,launchId:m.id,bodyId:body.id,systemId:body.systemId,kind:m.payload,altitudeM:m.altitudeM,epochS:time,phase:0,axis:norm(m.local),mu,powerJ:5e6,radioRangeScene:180000});}
  m.phase='deployed';m.completedAtS=time;}
 command(id,text){const r=this.rovers.find(x=>x.id===id);if(!r)throw Error('Rover not found');const cmd=validateScript(text);r.commands=cmd;r.index=0;r.remaining=0;r.status=cmd.length?'running':'parked';return r;}
 tickRovers(time,byId,science){for(const r of this.rovers){const dt=clamp(time-(r.lastS||time),0,5);r.lastS=time;if(r.status!=='running'||!r.commands.length||!dt)continue;let remain=dt,loops=0;
  while(remain>0&&loops++<28&&r.index<r.commands.length){const op=r.commands[r.index];if(op.op==='STOP'){r.status='parked';r.index=r.commands.length;break;}
   if(op.op==='TURN'){r.heading=(r.heading+op.value*Math.PI/180)%(2*Math.PI);r.index++;continue;}
   if(op.op==='SAMPLE'){const body=byId(r.bodyId)||r.bodySnapshot;if(science&&body&&r.batteryJ>50000){try{const sample=science.sample({body,seed:this.seed,local:r.local,altitudeM:.6,instrument:op.value,simTime:time,nonce:r.records.length,energyAvailableJ:r.batteryJ});r.records.push({...sample,probeId:r.id});r.batteryJ-=sample.powerJ;}catch(error){r.status='instrument error: '+error.message;break;}}r.index++;continue;}
   const maximum=op.op==='DRIVE'?op.value/Math.max(.2,1.5):op.value;
   if(!r.remaining)r.remaining=maximum;
   const step=Math.min(remain,r.remaining);if(op.op==='DRIVE'){r.local=moveOnSphere(r.local,step*1.5,r.heading,(byId(r.bodyId)||r.bodySnapshot)?.radius||6000);r.batteryJ-=step*180;}
   remain-=step;r.remaining-=step;if(r.remaining<1e-7){r.remaining=0;r.index++;}if(r.batteryJ<=0){r.batteryJ=0;r.status='battery depleted';break;}
  }if(r.index>=r.commands.length&&r.status==='running')r.status='complete';}}
}
root.StarfallLaunch={G0,ENGINES,PAYLOADS,build,orbit,validateScript,moveOnSphere,Store};
})(typeof window!=='undefined'?window:globalThis);
