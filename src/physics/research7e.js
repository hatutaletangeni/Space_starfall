/* STARFALL 7E — bounded engineering experiment and blueprint records.
   Test output is computed by existing STARFALL engineering/flight/rover solvers.
   It is simulated evidence, NOT measurements from a real-world instrument.
   No currency, progression gate, dynamic code execution or mandatory services. */
(function(root){'use strict';
const SCHEMA=1,MAX_PLANS=50,MAX_RUNS=160,MAX_BLUEPRINTS=45;
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const bound=(v,a,b)=>Math.max(a,Math.min(b,v));
const text=(x,max=90)=>String(x??'').trim().slice(0,max);
const TYPES=['rover','power','rocket'];
const isObj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const safeId=x=>typeof x==='string'&&/^[\w:.-]{1,120}$/.test(x);
function validDefinition(def){
 const M=root.StarfallVehicles;
 if(!M||!isObj(def)||M.validate(def).length)throw Error('A valid installed ship or rover configuration is required');
 return clone(def);
}
function normalize(input){
 if(!isObj(input)||!TYPES.includes(input.type))throw Error('Choose a supported experiment');
 const type=input.type,title=text(input.title||input.type+' engineering trial');
 if(!title)throw Error('Experiment name required');
 const raw=isObj(input.conditions)?input.conditions:{},c={};
 const num=(key,fallback,lo,hi)=>{const v=raw[key]===undefined?fallback:Number(raw[key]);if(!finite(v)||v<lo||v>hi)throw Error(key+' must be '+lo+' to '+hi);return v;};
 c.durationS=num('durationS',120,1,1200);
 if(type==='rover'){
  c.slopeDeg=num('slopeDeg',8,0,45);c.gravityMS2=num('gravityMS2',9.81,.1,100);
  c.gearRatio=num('gearRatio',1,.5,6);c.wheelScale=num('wheelScale',1,.6,1.8);
 }else if(type==='power'){
  c.daylight=num('daylight',.7,0,1);c.chargeFraction=num('chargeFraction',.8,0,1);
  c.driveFraction=num('driveFraction',.4,0,1);c.lights=!!raw.lights;
 }else{
  c.gravityMS2=num('gravityMS2',9.81,.1,100);c.radiusM=num('radiusM',6371000,100000,100000000);
  c.rho0=num('rho0',1.1,0,40);c.targetAltitudeM=num('targetAltitudeM',180000,50000,1000000);
 }
 let def=null;
 if(type!=='rocket'){def=validDefinition(input.definition);if(type==='rover'&&def.kind!=='rover')throw Error('Rover experiments require a rover design');}
 const rocket=type==='rocket'?clone(input.rocket||{engine:'atlas',payload:'relay',stages:2,tanks:4,boosters:2}):null;
 if(rocket&&JSON.stringify(rocket).length>4000)throw Error('Rocket configuration is too large');
 const world=isObj(input.world)?input.world:{};
 return{type,title,definition:def,rocket,conditions:c,sourceAssetId:text(input.sourceAssetId||def?.id||'rocket-bench',120),bodyId:text(world.bodyId||'bench-body',120),systemId:text(world.systemId||'bench-system',120),observations:(Array.isArray(input.observations)?input.observations:[]).filter(safeId).slice(0,12),photoRefs:(Array.isArray(input.photoRefs)?input.photoRefs:[]).filter(safeId).slice(0,12),notes:text(input.notes,300)};
}
function roverRun(plan){
 const R=root.StarfallRoverDynamics,M=root.StarfallVehicles;
 if(!R?.sixWheels||!M)throw Error('Rover dynamics model unavailable');
 const st=M.evaluate(plan.definition),c=plan.conditions,ratio=c.gearRatio,radius=Math.max(.1,st.wheelRadiusM*c.wheelScale);
 const body={id:plan.bodyId,seed:plan.bodyId,type:'Rocky',radius:4000};
 const angle=Math.tan(c.slopeDeg*Math.PI/180);
 const terrain=v=>Math.atan2(v[0],v[1])*4000*angle;
 const model=R.sixWheels({body,local:[0,1,0],forward:[1,0,0],surfaceHeight:terrain,sceneRadius:4000,sceneToMeters:1,
  vehicle:{massKg:st.massKg,driveTorqueNm:st.driveTorqueNm*ratio,wheelRadiusM:radius,traction:st.traction},gravityMS2:c.gravityMS2,dt:.02,command:1,enabled:true});
 const speed=model.safe?Math.min(model.speedSceneS,12/ratio):0;
 const duration=c.durationS,energyJ=Math.max(0,speed*model.maxForceN*duration/.8); // required mechanical-work estimate, NOT clamped to available battery
 const predictedForceN=Math.min(st.driveTorqueNm*ratio*6/radius,st.massKg*c.gravityMS2*st.traction);
 return{model:'six-contact rover traction + bounded motor-speed bench approximation',unit:'N',
  predicted:{maxForceN:predictedForceN,energyJ:energyJ,distanceM:speed*duration},
  simulated:{maxForceN:model.maxForceN,energyJ,distanceM:speed*duration,slopeDeg:model.slopeDeg,slip:model.slip,material:model.material},
  success:model.safe&&energyJ<=st.batteryCapacityJ,reason:!model.safe?'Unsafe terrain slope or slip':energyJ>st.batteryCapacityJ?'Battery reserve insufficient':'Bench terrain traversal feasible'};
}
function powerRun(plan){
 const P=root.StarfallPower,M=root.StarfallVehicles;
 if(!P?.step||!M)throw Error('Power model unavailable');
 const st=M.evaluate(plan.definition),c=plan.conditions,capacity=st.batteryCapacityJ,initial=capacity*c.chargeFraction;
 let state={energyJ:initial,temperatureK:290,loads:{avionics:true,lights:c.lights,radiator:true,drive:true,instruments:true}};
 const sunlight={luminosityW:3.828e26,distanceM:149597870700,incidence:c.daylight,transmission:1,occluded:c.daylight===0,ambientK:240};
 const activity={driveW:st.drivePowerW*c.driveFraction,lightsW:c.lights?(plan.definition.kind==='ship'?1200:180):0};
 const generation=P.generation(st,sunlight),load=P.loadPower(st,state,activity);
 const wanted=Object.entries(load).reduce((sum,[key,v])=>sum+(state.loads[key]?v:0),0);
 const forecast=bound(initial+(generation.totalW-wanted)*c.durationS,0,capacity);
 let sheds=new Set(),elapsed=0,deliveredJ=0,generatedJ=0,lastTemp=state.temperatureK;
 while(elapsed<c.durationS-1e-9){
  const step=Math.min(20,c.durationS-elapsed),r=P.step(st,state,step,sunlight,activity);
  state=r.state;r.shed.forEach(x=>sheds.add(x));deliveredJ+=r.usedJ;generatedJ+=r.generated.totalW*step;lastTemp=state.temperatureK;elapsed+=step;
 }
 return{model:'shared power bus / priority loads / thermal integrator',unit:'J',
  predicted:{batteryRemainingJ:forecast,powerDemandW:wanted,generatedW:generation.totalW},
  simulated:{batteryRemainingJ:state.energyJ,temperatureK:lastTemp,batteryConsumedJ:deliveredJ,totalGenerationJ:generatedJ,shed:[...sheds]},
  success:sheds.size===0&&finite(state.energyJ),reason:sheds.size?'Load shedding: '+[...sheds].join(', '):'Electrical test completed without load shedding'};
}
function rocketRun(plan){
 const X=root.StarfallLaunch,F=root.StarfallRocketFlight7B;
 if(!X?.build||!F?.init)throw Error('Rocket flight solver unavailable');
 const c=plan.conditions,mu=c.gravityMS2*c.radiusM*c.radiusM;
 const p=X.build(plan.rocket,{surfaceGravityMS2:c.gravityMS2,radiusM:c.radiusM,mu});
 const f=F.init(p,{radiusM:c.radiusM,mu,rho0:c.rho0,scaleHeightM:8500,areaM2:14},{mode:'assisted',targetAltitudeM:c.targetAltitudeM});
 let elapsed=0,maxAltitudeM=0,last=null;
 while(elapsed<c.durationS-1e-8&&['powered','coast','awaiting-stage'].includes(f.phase)){
  const segment=Math.min(30,c.durationS-elapsed),r=F.advance(f,p,segment);
  elapsed+=r.advancedS;last=r.orbit;
  maxAltitudeM=Math.max(maxAltitudeM,r.orbit?.altitudeM||0);
  if(r.advancedS<=1e-9)break;
 }
 last=F.elements(f,mu,c.radiusM);
 return{model:'7B force-integrated planar rocket, simplified atmosphere',unit:'m/s',
  predicted:{idealDeltaVMS:p.deltaVMS,launchTWR:p.launchTWR,requiredDeltaVMS:p.requiredDeltaVMS},
  simulated:{elapsedS:elapsed,maximumAltitudeM:maxAltitudeM,finalAltitudeM:last?.altitudeM??0,finalSpeedMS:last?.speedMS??0,phase:f.phase,stableOrbit:!!last?.stable,stagesSeparated:f.discards.length},
  success:!!last?.stable&&f.phase==='orbit',reason:f.reason||('Flight state: '+f.phase)};
}
function runModel(plan){if(plan.type==='rover')return roverRun(plan);if(plan.type==='power')return powerRun(plan);return rocketRun(plan);}
function restore(saved){
 const empty={schema:SCHEMA,serial:0,plans:[],runs:[],blueprints:[]};
 if(!isObj(saved)||saved.schema!==SCHEMA)return empty;
 const ids=new Set(),keep=(arr,max)=>Array.isArray(arr)?arr.filter(x=>isObj(x)&&safeId(x.id)&&!ids.has(x.id)&&(ids.add(x.id),true)).map(clone):[];
 return{schema:SCHEMA,serial:finite(saved.serial)?bound(Math.floor(saved.serial),0,1e9):0,
  plans:keep(saved.plans,MAX_PLANS),runs:keep(saved.runs,MAX_RUNS),blueprints:keep(saved.blueprints,MAX_BLUEPRINTS)};
}
class Store{
 constructor(saved){this.data=restore(saved);}
 next(prefix){this.data.serial++;return prefix+'-'+this.data.serial.toString(36);}
 plan(input){if(this.data.plans.length>=MAX_PLANS)throw Error('Research plans full: export expedition backup before explicitly archiving any plan');const p=normalize(input);p.id=this.next('exp');p.schema=SCHEMA;this.data.plans.push(p);return clone(p);}
 run(planId,timeS=0){if(this.data.runs.length>=MAX_RUNS)throw Error('Research runs full: export expedition backup and archive explicitly before another test');const p=this.data.plans.find(x=>x.id===planId);if(!p)throw Error('Experiment plan not found');
  const result=runModel(p),run={id:this.next('run'),schema:SCHEMA,planId:p.id,type:p.type,title:p.title,sourceAssetId:p.sourceAssetId,
   timeS:finite(timeS)?bound(timeS,0,1e13):0,bodyId:p.bodyId,systemId:p.systemId,conditions:clone(p.conditions),
   sourceDefinition:p.definition?clone(p.definition):null,observationRefs:p.observations.slice(),photoRefs:(p.photoRefs||[]).slice(),...result};
  this.data.runs.push(run);return clone(run);}
 blueprint(runId,title){if(this.data.blueprints.length>=MAX_BLUEPRINTS)throw Error('Research blueprints full: export expedition backup before adding another design');const r=this.data.runs.find(x=>x.id===runId);if(!r)throw Error('Test run not found');
  if(!r.success)throw Error('Cannot validate failed/incomplete engineering test');
  const p=this.data.plans.find(x=>x.id===r.planId);
  if(!p)throw Error('Original test plan is no longer present');
  const b={id:this.next('bp'),schema:SCHEMA,title:text(title||r.title),type:r.type,sourceRunId:r.id,sourceAssetId:r.sourceAssetId,
   definition:p.definition?validDefinition(p.definition):null,rocket:p.rocket?clone(p.rocket):null,conditions:clone(p.conditions),
   predicted:clone(r.predicted),simulated:clone(r.simulated),observationRefs:r.observationRefs.slice(),photoRefs:(r.photoRefs||[]).slice(),
   model:r.model,createdS:r.timeS,benchOnly:r.type==='rocket'||p.type==='rover'&&(p.conditions.gearRatio!==1||p.conditions.wheelScale!==1)};
  this.data.blueprints.push(b);return clone(b);}
 compare(a,b){const x=this.data.runs.find(r=>r.id===a),y=this.data.runs.find(r=>r.id===b);
  if(!x||!y||x.type!==y.type)throw Error('Compare two runs of the same test type');
  const keys=Object.keys(x.simulated).filter(k=>finite(x.simulated[k])&&finite(y.simulated[k]));
  return keys.map(key=>({metric:key,first:x.simulated[key],second:y.simulated[key],difference:y.simulated[key]-x.simulated[key]}));}
 exportBlueprint(id){const b=this.data.blueprints.find(x=>x.id===id);if(!b)throw Error('Unknown blueprint');
  return JSON.stringify({format:'starfall-blueprint-7e',schema:SCHEMA,blueprint:b},null,2);}
 importBlueprint(raw){if(this.data.blueprints.length>=MAX_BLUEPRINTS)throw Error('Research blueprints full: export expedition backup before import');if(typeof raw!=='string'||raw.length>100000)throw Error('Blueprint exceeds 100 KB import limit');
  let pack;try{pack=JSON.parse(raw);}catch(_){throw Error('Invalid blueprint JSON');}
  if(pack?.format!=='starfall-blueprint-7e'||pack?.schema!==SCHEMA||!isObj(pack.blueprint))throw Error('Unsupported blueprint format');
  const b=pack.blueprint;
  if(!safeId(b.sourceRunId)||!TYPES.includes(b.type)||!isObj(b.conditions)||!isObj(b.simulated)||!isObj(b.predicted)||!text(b.title))throw Error('Invalid blueprint metadata');
  if(b.definition)validDefinition(b.definition);
  else if(b.type!=='rocket')throw Error('Blueprint must have a validated vehicle');
  if(b.type==='rocket'&&(!isObj(b.rocket)||JSON.stringify(b.rocket).length>4000))throw Error('Rocket design missing');
  const fresh={id:this.next('bp'),schema:SCHEMA,title:text(b.title),type:b.type,sourceRunId:b.sourceRunId,sourceAssetId:text(b.sourceAssetId),
   definition:b.definition?clone(b.definition):null,rocket:b.rocket?clone(b.rocket):null,conditions:clone(b.conditions),
   predicted:clone(b.predicted),simulated:clone(b.simulated),observationRefs:Array.isArray(b.observationRefs)?b.observationRefs.filter(safeId).slice(0,12):[],photoRefs:Array.isArray(b.photoRefs)?b.photoRefs.filter(safeId).slice(0,12):[],
   model:text(b.model,120),createdS:finite(b.createdS)?b.createdS:0,benchOnly:!!b.benchOnly,
   imported:true};this.data.blueprints.push(fresh);return clone(fresh);}
 serialize(){return clone(this.data);}
 get plans(){return clone(this.data.plans);}
 get runs(){return clone(this.data.runs);}
 get blueprints(){return clone(this.data.blueprints);}
}
const API={SCHEMA,MAX_PLANS,MAX_RUNS,MAX_BLUEPRINTS,TYPES,normalize,runModel,restore,Store};
root.StarfallResearch7E=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);