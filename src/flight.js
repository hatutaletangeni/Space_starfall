/* STARFALL — single-scene, procedural multi-system navigation and physical landing.
 * All celestial positions are updated deterministically, and neither warp nor
 * surface contact changes HTML pages, cameras or rendering engines. */
(function(){'use strict';
const $=id=>document.getElementById(id),{Renderer,V,groundHeight}=Starfall3D;
const P=StarfallPhysics, FP=StarfallFlightPhysics;
const BIOMES=StarfallBiomes;
const SEED_QUERY=new URLSearchParams(location.search).get('seed'),GALAXY_SEED=SEED_QUERY!==null?(Number(SEED_QUERY)>>>0):742,galaxy=StarfallGalaxy.generateGalaxy(GALAXY_SEED,64);
const first=galaxy.systems[0].planets[0];
let target=first,nearest=first,renderer;
try{renderer=new Renderer($('universe'),galaxy);}catch(error){console.error('STARFALL initialization:',error);$('fatal').hidden=false;$('boot').hidden=true;return;}
let simTime=0,pos=V.add(first.position,[0,300,-(first.radius+3550)]),vel=[0,0,0],forward=V.norm(V.sub(first.position,pos)),up=[0,1,0];
let landed=false,warp=false,camMode=0,camEye=null,camDistance=70,orbitYaw=0,orbitPitch=0,heat=0,solarWarning=false,timeScale=1,altitude=3500,vertical=0,fps=60,lastPlanetId='',nearPhase='DEEP SPACE',hudClock=0,frames=0,frameClock=0,lastTime=performance.now(),lastSave=0,toastTimer=0,landingTimer=0;
let siteWaypoint=null,scan=null,landingCapture=null,groundLocal=null,headlights=true;
let interiorState=null;
let eva=false,evaLocal=null,evaForward=[...forward],shipLocal=null,shipForwardVec=[...forward],shipUpVec=[...up],shipBody=null;
let swimming=false,swimDepthScene=.01,swimVerticalSceneS=0;
let roverLocal=null,roverForwardVec=[...forward],roverBody=null,truckOccupied=false;
let truckLocal=null,truckForwardVec=[...forward],truckBody=null,truckBatteryJ=44e6,truckLights=true,truckCargo=0,winch7d=null,truckChargeReadyAtS=0,localRoverChargeReadyAtS=0,localRoverPortTemperatureK=290,localServiceT12=null;
let hatchCooldown=0,walkedSinceExit=0,shipExitProgress=0,roverEntryCooldown=0,roverExitMove=null,shipIdleElapsed=0,rampTransition=null,rampLift=0;
let engEnabled=false,engState=null,engBody=null,engAttitude='Manual',engLast={dragN:0,heatingW:0,temperatureK:290},engSteps=0;
const physicsClock=new P.SimulationClock(0);
galaxy.physicsOrbits=StarfallOrbitBridge.attach(galaxy);
const SHIP_CLEARANCE=7.5,EVA_HEIGHT=2.6,EVA_BOARD_DISTANCE=32,ROVER_CLEARANCE=2.1,TRUCK_CLEARANCE=4.2,TRUCK_BOARD_DISTANCE=19;
const scans=['Hydrology','Biosignatures','Geology'],keys=new Set();
const session=SF.load(),saved=session.flightGalaxy;
let shipDockT13=StarfallShipT13.repair(saved?.shipDockT13);
localServiceT12=StarfallFieldServiceT12.createService(saved?.truckPose?.fieldServiceT12);
localRoverChargeReadyAtS=Number.isFinite(saved?.truckPose?.roverChargeReadyAtS)?saved.truckPose.roverChargeReadyAtS:0;
localRoverPortTemperatureK=Number.isFinite(saved?.truckPose?.roverPortTemperatureK)?saved.truckPose.roverPortTemperatureK:290;
const controls=StarfallControls.create(session.controlSettings,keys);
controls.onChange=settings=>SF.save({controlSettings:settings});
window.StarfallInput=controls;
const science4Settings={roverPhysics:!!session.science4Settings?.roverPhysics};
let roverPhysicsReport=null;
const Vehicles=StarfallVehicles, Power=StarfallPower,vehicleStore=Vehicles.createStore(session.engineeringVehicles);
let equipmentT15=StarfallEquipmentT15.restore(session.equipmentT15);
let engineeringSystemReport={ship:null,rover:null},engineeringSystemSeconds=0;
function persistVehicles(){SF.save({engineeringVehicles:vehicleStore.serialize()});}
function rootSpaceWeather(){return window.StarfallSpaceWeatherLW06;}
function shipConfiguredState(){const x=vehicleStore.get('ship'),s=x.stats;return FP.shipState({dryMassKg:s.dryMassKg,fuelKg:x.state.fuelKg,thrustN:s.thrustN,ispS:s.ispS,radiatorAreaM2:s.radiatorAreaM2,emissivity:s.emissivity,temperatureK:x.state.temperatureK});}
function updateVehicleSystems(dt){
 const elapsed=dt*timeScale;
 if(!(elapsed>0))return;
 const sys=galaxy.byId.get((nearest||target).systemId),star=sys?.star;
 for(const kind of ['ship','rover']){
  const v=vehicleStore.get(kind),st=v.state,stats=v.stats;
  if(!st.powerEnabled){engineeringSystemReport[kind]=null;continue;}
  const craftPos=kind==='ship'?shipWorldState().position:(roverWorldState()?.position||pos);
  const direction=star?P.vec.sub(sys.position,craftPos):[0,1,0],distanceScene=P.vec.len(direction);
  const sunDir=V.norm(direction),normal=kind==='ship'?(landed?shipWorldState().up:up):(roverWorldState()?.up||up);
  const atmo=nearest?FP.atmosphere(nearest,Math.max(0,altitude)*P.SCENE_METERS_PER_UNIT):{densityKgM3:0};
  // Radiation storm mitigation consumes actual owner-managed electrical energy;
  // no fabricated ACKs, generator power, or save migrations.
  const stellar=rootSpaceWeather()?.exposure(sys,craftPos,simTime,GALAXY_SEED);
  const mitigationW=stellar?Math.round(stellar.ionizationIndex*850):0;
  const light={luminosityW:star?P.starProfile(star).luminosityW:0,distanceM:Math.max(1,distanceScene*P.SCENE_METERS_PER_UNIT),incidence:Math.max(0,V.dot(normal,sunDir)),transmission:Math.exp(-Math.min(9,atmo.densityKgM3*.1))*(landed&&nearest=== (kind==='ship'?shipBody:roverBody)?StarfallEvents.skyTransmission(nearest,V.rot(V.norm(V.sub(craftPos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),simTime,GALAXY_SEED):1)*(stellar?.solarTransmissionFactor??1),occluded:!!(nearest&&star&&!Power.visibleSun(P.vec.mul(craftPos,P.SCENE_METERS_PER_UNIT),P.vec.mul(sys.position,P.SCENE_METERS_PER_UNIT),{positionM:P.vec.mul(nearest.position,P.SCENE_METERS_PER_UNIT),radiusM:nearest.radius*P.SCENE_METERS_PER_UNIT})),ambientK:190};
  const shipThrust=kind==='ship'&&engEnabled&&!eva&&!landed&&(keys.has('KeyW')||keys.has('KeyS'));
  const driven=kind==='rover'&&!!window.StarfallScienceUI?.autoDriving;
  const result=Power.step(stats,st,elapsed,light,{engineActive:shipThrust,driveW:driven?stats.drivePowerW:0,lightsW:(headlights?(kind==='ship'?1200:180):0)+mitigationW,heatW:shipThrust?stats.engineHeatW:driven?stats.drivePowerW*.13:0});
  vehicleStore.update(kind,result.state);engineeringSystemReport[kind]=result;
 }
 engineeringSystemSeconds+=elapsed;
 shipDockT13.connectorK=Math.max(290,shipDockT13.connectorK-elapsed*.04);
 updateWinch7D(elapsed);
 localServiceT12.portTemperatureK=Math.max(290,localServiceT12.portTemperatureK-elapsed*.025);
 localRoverPortTemperatureK=Math.max(290,localRoverPortTemperatureK-elapsed*.025);
}
function safeToReconfigure(kind){
 if(!landed||!nearest?.landable||!['ship','rover'].includes(kind))return false;
 if(kind==='ship')return shipDockT13.state==='UNDOCKED';
 return roverBody===nearest&&!!roverLocal&&!window.StarfallScienceUI?.autoDriving&&
  !truckOccupied&&(!winch7d||winch7d.state!=='CONNECTED');
}
function equipmentSnapshotT15(kind){
 const v=vehicleStore.get(kind),report=engineeringSystemReport[kind];
 return{assetId:v.definition.id,kind,components:StarfallEquipmentT15.inspect(v,report,equipmentT15,kind),
  faults:StarfallEquipmentT15.faults(v,report),serviceEvents:equipmentT15.events.filter(e=>e.assetId===v.definition.id).slice(-12),
  backup:equipmentT15.backup[kind]?.definition||null,stats:v.stats,state:v.state};
}
function validateBlueprintT15(provenance,kind,definition){
 if(!provenance)return;
 const store=window.StarfallResearchUI7E?.store,run=store?.runs.find(x=>x.id===provenance.runId),
  bp=store?.blueprints.find(x=>x.id===provenance.blueprintId);
 if(!run?.success||!bp||bp.sourceRunId!==run.id||bp.imported||bp.benchOnly||
  bp.sourceAssetId!==vehicleStore.get(kind).definition.id||run.sourceAssetId!==bp.sourceAssetId||
  JSON.stringify(bp.definition)!==JSON.stringify(definition)||JSON.stringify(run.sourceDefinition)!==JSON.stringify(definition)||
  JSON.stringify(run.observationRefs)!==JSON.stringify(bp.observationRefs)||
  JSON.stringify(run.photoRefs)!==JSON.stringify(bp.photoRefs))
  throw Error('T15 original 7E experiment/run/blueprint/source asset or photo/measurement references do not match');
}
function configureVehicle(kind,definition,provenance=null){
 const original=vehicleStore.get(kind);
 validateBlueprintT15(provenance,kind,definition);
 StarfallEquipmentT15.validateChange(kind,original,definition,safeToReconfigure(kind),provenance);
 const prior=vehicleStore.serialize(),trial=Vehicles.createStore(prior);
 trial.apply(kind,definition);const predicted=trial.get(kind);
 if(!StarfallEquipmentT15.changedLive(original,predicted))throw Error('T15 proposed design would not change live machinery');
 const staged=StarfallEquipmentT15.append(equipmentT15,'CONFIG_APPLIED',{
  assetId:original.definition.id,kind,timeS:simTime,
  before:{...original.stats,energyJ:original.state.energyJ},after:{...predicted.stats,energyJ:predicted.state.energyJ},
  partBefore:original.definition.slots,partAfter:predicted.definition.slots,
  source:provenance?{type:'7E',...provenance}:{type:'WORKBENCH',model:'Original installed component changes'}});
 try{
  const applied=vehicleStore.apply(kind,definition),real=vehicleStore.get(kind);
  if(!StarfallEquipmentT15.changedLive(original,real)||
    JSON.stringify(real.definition)!==JSON.stringify(predicted.definition)||
    Math.abs(real.state.energyJ-predicted.state.energyJ)>1e-6)
    throw Error('T15 installed state mismatched verified assembly; rolled back');
  equipmentT15=staged.state;
  equipmentT15.backup[kind]={definition:original.definition,eventId:staged.event.id};
  if(kind==='ship'&&engState){const next=shipConfiguredState();engState.craft={...engState.craft,...next};}
  SF.save({engineeringVehicles:vehicleStore.serialize(),equipmentT15});
  window.StarfallEngineering7AUI?.registry?.event('DESIGN_APPLIED',real.definition.id,simTime,
   {kind,t15EventId:staged.event.id,sourceRunId:provenance?.runId||null});
  window.StarfallEngineering7AUI?.refreshRegistry(true);
  return{...applied,serviceId:staged.event.id};
 }catch(e){vehicleStore.replaceAll(prior);throw e;}
}
function restoreVehicleT15(kind){
 const b=equipmentT15.backup[kind],original=vehicleStore.get(kind);
 if(!b?.definition)throw Error('T15 no prior installed assembly to restore');
 StarfallEquipmentT15.validateChange(kind,original,b.definition,safeToReconfigure(kind));
 const beforeStore=vehicleStore.serialize(),trial=Vehicles.createStore(beforeStore);
 trial.apply(kind,b.definition);const predicted=trial.get(kind);
 const staged=StarfallEquipmentT15.append(equipmentT15,'CONFIG_RESTORED',{
  assetId:original.definition.id,kind,timeS:simTime,
  before:{...original.stats,energyJ:original.state.energyJ},after:{...predicted.stats,energyJ:predicted.state.energyJ},
  partBefore:original.definition.slots,partAfter:predicted.definition.slots,
  source:{type:'ROLLBACK',originalEventId:b.eventId}});
 try{
  vehicleStore.apply(kind,b.definition);const actual=vehicleStore.get(kind);
  if(!StarfallEquipmentT15.changedLive(original,actual)||actual.state.energyJ>original.state.energyJ+1e-6)
    throw Error('T15 rollback did not change parts or incorrectly increased battery energy');
  equipmentT15=staged.state;equipmentT15.backup[kind]=null;
  if(kind==='ship'&&engState){const next=shipConfiguredState();engState.craft={...engState.craft,...next};}
  SF.save({engineeringVehicles:vehicleStore.serialize(),equipmentT15});
  window.StarfallEngineering7AUI?.registry?.event('DESIGN_RESTORED',actual.definition.id,simTime,{kind,t15EventId:staged.event.id});
  window.StarfallEngineering7AUI?.refreshRegistry(true);
  return{before:original.stats,after:actual.stats,serviceId:staged.event.id};
 }catch(e){vehicleStore.replaceAll(beforeStore);throw e;}
}

engEnabled=session.scienceSettings?.flightMode==='Engineering';
engAttitude=['Manual','Hold','Prograde','Retrograde'].includes(session.scienceSettings?.sas)?session.scienceSettings.sas:'Manual';
if(saved&&saved.seed===GALAXY_SEED&&Array.isArray(saved.position)&&saved.position.length===3&&saved.position.every(Number.isFinite)){
 try{simTime=Number.isFinite(saved.time)&&saved.time>=0&&saved.time<1e13?saved.time:0;galaxy.update(simTime);if(saved.target?.startsWith('catalog-')){const sid=saved.target.replace(/-p\d+(?:-m\d+)?$|\-sun$/,'');const ss=galaxy.byId.get(sid);if(ss)galaxy.activate(ss);}target=galaxy.byId.get(saved.target)||first;galaxy.pinnedSystemId=target.systemId;nearest=galaxy.byId.get(saved.attached)||first;
  pos=saved.position.slice();forward=V.norm(saved.forward||forward);up=V.norm(saved.up||up);landed=!!saved.landed&&nearest.landable;
  if(engEnabled&&saved.engineering?.bodyId===nearest.id&&saved.engineering.rM?.length===3&&saved.engineering.vMS?.length===3){const current=shipConfiguredState(),legacyCraft=saved.engineering.craft||{};
   engState={rM:[...saved.engineering.rM],vMS:[...saved.engineering.vMS],craft:FP.shipState({...current,fuelKg:Number.isFinite(legacyCraft.fuelKg)?Math.min(Math.max(0,legacyCraft.fuelKg),vehicleStore.get('ship').stats.fuelCapacityKg):current.fuelKg,temperatureK:Number.isFinite(legacyCraft.temperatureK)?legacyCraft.temperatureK:current.temperatureK})};engBody=nearest.id;
   vehicleStore.update('ship',{...vehicleStore.get('ship').state,fuelKg:engState.craft.fuelKg,temperatureK:engState.craft.temperatureK});}
  if(landed&&Array.isArray(saved.groundDirection)){const dir=V.norm(saved.groundDirection);
   groundLocal=V.rot(dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(dir,nearest.radius+groundHeight(groundLocal,nearest)+SHIP_CLEARANCE));up=dir;
   shipBody=nearest;shipLocal=groundLocal?[...groundLocal]:null;shipForwardVec=[...forward];shipUpVec=[...up];}
 }catch(e){console.warn('Saved flight could not be restored:',e);}}
physicsClock.set(simTime);

// In-world archaeological interiors: no rewriting of flight or surface terrain.
// Body-fixed site coordinates preserve placement through orbit and axial spin.
function interiorWorld(at){const state=interiorState;if(!state)return null;
 const body=galaxy.byId.get(state.site.bodyId),local=StarfallInteriors.direction(state.site.local,state.basis,at.x,at.z,body.radius),axis=body.spinAxis||[0,1,0],upWorld=V.norm(V.rot(local,axis,body.spinAngle||0));
 return{body,local,up:upWorld,position:V.add(body.position,V.mul(upWorld,body.radius+state.site.height+state.layout.floorY+(state.kind==='cave'?state.layout.floorHeightAt(at.z):0)+EVA_HEIGHT))};
}
function enterInterior(site){
 if(interiorState)throw Error('Already inside a ruin.');
 if(!landed||!eva||truckOccupied||rampTransition||roverExitMove||!nearest||site?.bodyId!==nearest.id)throw Error('Exit the ship or rover and stand beside the ruin.');
 const local=evaLocal||V.rot(V.norm(V.sub(pos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
 const dist=StarfallArchaeology.arc(local,site.local,nearest.radius);
 if(dist>30)throw Error('Approach within 30 units of the ruin.');
 if(!StarfallRuinsUI.records.some(r=>r.id===site.id&&r.bodyId===site.bodyId&&r.level>=2))throw Error('First perform a field examination using ANCIENT RUINS.');
 if((site.slopeDeg||0)>20)throw Error('Unsafe entrance: steep terrain or collapsed foundation; survey another ruin.');
 const layout=StarfallInteriors.layout(site),basis=StarfallInteriors.basis(site.local);
 interiorState={site,layout,basis,at:{...layout.entry}};
 const initial=interiorWorld(interiorState.at);evaLocal=initial.local;pos=initial.position;up=initial.up;
 evaForward=V.rot(basis.forward,nearest.spinAxis||[0,1,0],nearest.spinAngle||0);camEye=null;orbitYaw=0;orbitPitch=0;vel=[0,0,0];
 showToast('ANCIENT INTERIOR · X inspect relics · ESC exit');return interiorState;
}
function enterCave(requested){
 const GEO=window.StarfallGeologyLW02;
 if(!GEO||!requested?.id||interiorState||!landed||!eva||truckOccupied||rampTransition||!nearest?.landable)throw Error('Approach a cave on foot in EVA.');
 const site=GEO.sites(nearest,GALAXY_SEED).find(x=>x.id===requested.id);
 if(!site)throw Error('Cave belongs to another world.');
 const local=evaLocal||V.rot(V.norm(V.sub(pos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
 if(GEO.arc(local,site.local,nearest.radius)>7)throw Error('Walk within 7 scene units of the cave entrance.');
 const anchored={...site,height:groundHeight(site.local,nearest)},layout=GEO.caveLayout(site),
  basis=StarfallInteriors.basis(site.local);
 interiorState={kind:'cave',site:anchored,layout,basis,at:{...layout.entry}};
 const q=interiorWorld(interiorState.at);evaLocal=q.local;pos=q.position;up=q.up;
 evaForward=V.rot(basis.forward,nearest.spinAxis||[0,1,0],nearest.spinAngle||0);
 camEye=null;orbitYaw=0;orbitPitch=0;vel=[0,0,0];
 showToast('CAVE ENTRANCE · W/S walk · A/D turn · ESC surface exit');
 return interiorState;
}
function leaveInterior(){if(!interiorState)return false;if(interiorState.kind==='cave')window.StarfallInteriorsUI?.checkpointCave?.(interiorState,true);const site=interiorState.site,body=nearest,b=interiorState.basis;
 // Safe exit onto deterministic original terrain, not through generated walls.
 const dir=StarfallInteriors.direction(site.local,b,0,-interiorState.layout.length-4,body.radius),axis=body.spinAxis||[0,1,0];
 evaLocal=dir;const radial=V.rot(dir,axis,body.spinAngle||0);pos=V.add(body.position,V.mul(radial,body.radius+groundHeight(dir,body)+EVA_HEIGHT));up=radial;
 evaForward=V.rot(V.mul(b.forward,-1),axis,body.spinAngle||0);interiorState=null;camEye=null;orbitYaw=0;orbitPitch=0;vel=[0,0,0];hatchCooldown=1;roverEntryCooldown=1;
 showToast('Returned to planetary surface');return true;
}
function shipWorldState(){
 if(eva&&shipBody&&shipLocal){
  const axis=shipBody.spinAxis||[0,1,0],radial=V.norm(V.rot(shipLocal,axis,shipBody.spinAngle||0));
  const height=groundHeight(shipLocal,shipBody);
  return{body:shipBody,position:V.add(shipBody.position,V.mul(radial,shipBody.radius+height+SHIP_CLEARANCE)),forward:shipForwardVec||forward,up:shipUpVec||radial};
 }
 return{body:nearest,position:pos,forward,up};
}
function roverWorldState(){
 if(!(roverBody&&roverLocal))return null;
 const axis=roverBody.spinAxis||[0,1,0],radial=V.norm(V.rot(roverLocal,axis,roverBody.spinAngle||0));
 const height=groundHeight(roverLocal,roverBody);
 return{body:roverBody,position:V.add(roverBody.position,V.mul(radial,roverBody.radius+height+ROVER_CLEARANCE)),forward:roverForwardVec||evaForward,up:radial};
}
function truckWorldState(){
 if(!(truckBody&&truckLocal))return null;
 const axis=truckBody.spinAxis||[0,1,0],radial=V.norm(V.rot(truckLocal,axis,truckBody.spinAngle||0));
 return{body:truckBody,position:V.add(truckBody.position,V.mul(radial,truckBody.radius+groundHeight(truckLocal,truckBody)+TRUCK_CLEARANCE)),forward:truckForwardVec,up:radial};
}
function tangentOffsetLocal(body,localRadial,worldForward,forwardMeters,rightMeters){
 const axis=body.spinAxis||[0,1,0],worldRadial=V.norm(V.rot(localRadial,axis,body.spinAngle||0));
 let tangent=V.norm(V.sub(worldForward,V.mul(worldRadial,V.dot(worldForward,worldRadial))));
 if(V.len(tangent)<.05)tangent=V.norm(V.cross(Math.abs(worldRadial[1])>.92?[0,0,1]:[0,1,0],worldRadial));
 const right=V.norm(V.cross(tangent,worldRadial));
 let d=[...worldRadial];
 const baseRadius=body.radius+groundHeight(localRadial,body)+Math.max(EVA_HEIGHT,ROVER_CLEARANCE);
 if(Math.abs(forwardMeters)>.001)d=V.norm(V.rot(d,right,-forwardMeters/Math.max(1,baseRadius)));
 if(Math.abs(rightMeters)>.001)d=V.norm(V.rot(d,tangent,rightMeters/Math.max(1,baseRadius)));
 return V.rot(d,axis,-(body.spinAngle||0));
}
function placeRoverNearShip(){
 if(!shipBody||!shipLocal)return;
 roverBody=shipBody;
 roverForwardVec=V.norm(shipForwardVec||forward);
 roverLocal=tangentOffsetLocal(shipBody,shipLocal,roverForwardVec,-9.5,10.5);
 if(!truckLocal||truckBody!==shipBody){truckBody=shipBody;truckForwardVec=[...shipForwardVec];truckLocal=tangentOffsetLocal(shipBody,shipLocal,truckForwardVec,-14,-18);}
}
function exitShip(){
 if(!landed||eva||!nearest?.landable)return;
 const ns=surfaceData(nearest,pos),axis=nearest.spinAxis||[0,1,0],radial=ns.dir;
 shipBody=nearest;shipLocal=V.rot(radial,axis,-(nearest.spinAngle||0));shipForwardVec=[...forward];shipUpVec=[...up];
 if(!roverBody||roverBody!==nearest||!roverLocal)placeRoverNearShip();
 const hatchLocal=tangentOffsetLocal(nearest,shipLocal,shipForwardVec,-10,0);
 const groundLocalEVA=tangentOffsetLocal(nearest,shipLocal,shipForwardVec,-37,0);
 const evacDir=V.norm(V.rot(hatchLocal,axis,nearest.spinAngle||0));
 evaLocal=hatchLocal;
 rampTransition={kind:'out',elapsed:0,duration:1.35,from:[...hatchLocal],to:[...groundLocalEVA]};rampLift=5.0;
 evaForward=V.norm(V.sub(forward,V.mul(evacDir,V.dot(forward,evacDir))));
 if(V.len(evaForward)<.05)evaForward=V.norm(V.cross(Math.abs(evacDir[1])>.92?[0,0,1]:[0,1,0],evacDir));
 pos=V.add(nearest.position,V.mul(evacDir,nearest.radius+groundHeight(evaLocal,nearest)+EVA_HEIGHT+rampLift));
 up=evacDir;vel=[0,0,0];eva=true;truckOccupied=false;camMode=0;camDistance=Math.min(camDistance,18);camEye=null;
 hatchCooldown=2;walkedSinceExit=0;roverEntryCooldown=2;shipIdleElapsed=0;
 showToast('EVA · science rover is AUTONOMOUS ONLY · approach truck and press X to drive');
}
function boardShip(){
 if(!eva||!shipBody||!shipLocal)return;
 const ship=shipWorldState();
 if(V.len(V.sub(pos,ship.position))>EVA_BOARD_DISTANCE){showToast('Move closer to the ship to board.');return;}
 eva=false;swimming=false;swimDepthScene=.01;swimVerticalSceneS=0;truckOccupied=false;rampTransition=null;rampLift=0;landed=true;nearest=shipBody;groundLocal=[...shipLocal];pos=[...ship.position];forward=V.norm(ship.forward);up=V.norm(ship.up);vel=[0,0,0];camEye=null;
 hatchCooldown=1.0;walkedSinceExit=0;shipIdleElapsed=0;showToast('Inside the ship · SPACE launch · hold S to walk back down the ramp');
}
function enterTruck(){
 if(!eva||truckOccupied||!truckBody||truckBody!==nearest||!truckLocal||interiorState||rampTransition)return false;
 const truck=truckWorldState();
 if(!truck||V.len(V.sub(pos,truck.position))>TRUCK_BOARD_DISTANCE)return false;
 if(winch7d){showToast('Cancel the powered winch before driving the truck');return false;}
  truckOccupied=true;pos=[...truck.position];evaForward=[...truck.forward];up=[...truck.up];camEye=null;camDistance=Math.max(camDistance,26);
 roverEntryCooldown=1.2;showToast('EXPEDITION TRUCK · WASD drive · X or ground click to exit · L lights');return true;
}
function exitTruck(){
 if(!truckOccupied||!truckBody||!truckLocal)return false;
 truckOccupied=false;const prev=truckLocal.slice(),dis=tangentOffsetLocal(truckBody,truckLocal,truckForwardVec,-4,-13);
 evaLocal=dis;const axis=truckBody.spinAxis||[0,1,0],dir=V.norm(V.rot(dis,axis,truckBody.spinAngle||0));
 evaForward=[...truckForwardVec];pos=V.add(truckBody.position,V.mul(dir,truckBody.radius+groundHeight(dis,truckBody)+EVA_HEIGHT));up=dir;camEye=null;
 roverEntryCooldown=2.4;roverExitMove={from:prev,to:dis,progress:0};evaLocal=prev;
 const truck=truckWorldState();pos=[...truck.position];showToast('Stepping away from expedition truck · move freely, X to re-enter');return true;
}
function projectToScreen(point,camera){
 const rel=V.sub(point,camera.eye),view=M.look([0,0,0],V.sub(camera.target,camera.eye),camera.up),proj=M.perspective(renderer.fov,renderer.aspect,.35,2e8),vp=M.mul(proj,view),x=rel[0],y=rel[1],z=rel[2];
 const clipX=vp[0]*x+vp[4]*y+vp[8]*z+vp[12],clipY=vp[1]*x+vp[5]*y+vp[9]*z+vp[13],clipW=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
 if(clipW<=0)return null;const ndcX=clipX/clipW,ndcY=clipY/clipW;
 return{visible:Math.abs(ndcX)<=1.2&&Math.abs(ndcY)<=1.2,x:(ndcX*.5+.5)*renderer.canvas.clientWidth,y:(1-(ndcY*.5+.5))*renderer.canvas.clientHeight,distance:V.len(rel)};
}
function updateAstronautSprite(camera){/* Removed: real 3D avatar renders directly with other WebGL geometry. */}

function setFlightPhysicsMode(mode){
 engEnabled=mode==='Engineering';if(engState){vehicleStore.update('ship',{...vehicleStore.get('ship').state,fuelKg:engState.craft.fuelKg,temperatureK:engState.craft.temperatureK});}engState=null;engBody=null;
 SF.save({scienceSettings:{schema:1,flightMode:engEnabled?'Engineering':'Assisted',sas:engAttitude}});
 showToast((engEnabled?'ENGINEERING':'ASSISTED')+' FLIGHT · '+(engEnabled?'real gravity and fuel active':'legacy controls restored'));
}
function engineeringInfo(){
 const b=nearest||target;if(!b||b.kind==='star')return null;
 const sys=galaxy.byId.get(b.systemId),parent=b.kind==='moon'?galaxy.byId.get(b.parentId):null;
 const physical=P.bodyProfile(b,parent?P.bodyProfile(parent,P.starProfile(sys.star)):P.starProfile(sys.star));
 const r=engState&&engBody===b.id?engState.rM:P.vec.mul(P.vec.sub(pos,b.position),P.SCENE_METERS_PER_UNIT);
 const v=engState&&engBody===b.id?engState.vMS:P.vec.mul(vel,P.SCENE_METERS_PER_UNIT);
 let elements=null;
 try{if(P.vec.len(r)>physical.radiusM*.9)elements=P.orbitalObservables(r,v,physical.mu);}catch(_){/* Undefined orbit: degenerate state, not a crash. */}
 const craft=engState?.craft||shipConfiguredState(),m=craft.dryMassKg+craft.fuelKg;
 const dv=craft.fuelKg>0?craft.ispS*P.G0*Math.log(m/craft.dryMassKg):0;
 const omega=2*Math.PI/Math.max(1,b.spinPeriod),groundWind=P.vec.cross(P.vec.mul(b.spinAxis||[0,1,0],omega),r);
 return{body:b,physical,elements,craft,vehicle:vehicleStore.get('ship').stats,power:engineeringSystemReport.ship,deltaVMS:dv,inertialVelocityMS:P.vec.len(v),groundVelocityMS:P.vec.len(P.vec.sub(v,groundWind)),rM:r,vMS:v,dragN:engLast.dragN||0,heatingW:engLast.heatingW||0,temperatureK:craft.temperatureK,steps:engSteps};
}
function engineeringTouchdown(ns){
 groundLocal=V.rot(ns.dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
 pos=V.add(nearest.position,V.mul(ns.dir,nearest.radius+ns.height+SHIP_CLEARANCE));
 landed=true;vel=[0,0,0];warp=false;if(engState)vehicleStore.update('ship',{...vehicleStore.get('ship').state,fuelKg:engState.craft.fuelKg,temperatureK:engState.craft.temperatureK});engState=null;engBody=null;up=ns.dir;
 let tangent=V.sub(forward,V.mul(up,V.dot(forward,up)));if(V.len(tangent)<.05)tangent=V.cross([0,1,0],up);forward=V.norm(tangent);
 shipBody=nearest;shipLocal=[...groundLocal];shipForwardVec=[...forward];shipUpVec=[...up];eva=false;evaLocal=null;truckOccupied=false;placeRoverNearShip();
 SF.recordDiscovery({id:'seamless-land:'+nearest.id,type:'landing',name:'Landed on '+nearest.name,detail:'Engineering physics touchdown',planet:nearest.name,system:nearest.system});
 showToast('ENGINEERING TOUCHDOWN · EVA descent underway');saveFlight();exitShip();
}
function engineeringFlight(dt){
 // Keep fictional warp separate; entering/exiting warp resets local inertial state.
 const body=nearest;if(!body||!body.radius)return;
 const sys=galaxy.byId.get(body.systemId),parent=body.kind==='moon'?galaxy.byId.get(body.parentId):null;
 const physical=P.bodyProfile(body,parent?P.bodyProfile(parent,P.starProfile(sys.star)):P.starProfile(sys.star));
 if(!engState||engBody!==body.id){
  engBody=body.id;
  engState={rM:P.vec.mul(P.vec.sub(pos,body.position),P.SCENE_METERS_PER_UNIT),vMS:P.vec.mul(vel,P.SCENE_METERS_PER_UNIT),craft:shipConfiguredState()};
 }
 const thr=keys.has('KeyW')?1:keys.has('KeyS')?.42:0,back=keys.has('KeyS')&&!keys.has('KeyW');
 const enginePowered=vehicleStore.get('ship').state.health>.05&&(!vehicleStore.get('ship').state.powerEnabled||engineeringSystemReport.ship?.enginePowered!==false);
 if(engAttitude==='Prograde'||engAttitude==='Retrograde'){
  const speed=P.vec.len(engState.vMS);
  if(speed>1){const wanted=V.mul(V.norm(engState.vMS),engAttitude==='Prograde'?1:-1);forward=V.norm(V.mix(forward,wanted,Math.min(1,dt*1.2)));}
 }
 const controlDirection=back?V.mul(forward,-1):forward,rotationRate=2*Math.PI/Math.max(1,body.spinPeriod);
 // Fixed 60 Hz near planets. At >1x in a vacuum, analytically coast through
 // the extra time. In atmosphere we cap physical time rather than tunnel.
 const total=dt*timeScale,atmos=FP.atmosphere(body,(P.vec.len(engState.rM)-physical.radiusM));
 const deepVacuum=atmos.densityKgM3<1e-8&&P.vec.len(engState.rM)>physical.radiusM+1000;
 const activeDt=timeScale>1&&deepVacuum&&!thr?0:Math.min(total,.3);
 let steps=0;
 if(activeDt){const n=Math.min(36,Math.max(1,Math.ceil(activeDt/(1/90)))),step=activeDt/n;
  for(let i=0;i<n;i++){
   const d=FP.integrateFixed(engState,{...physical,kind:body.kind,landable:body.landable,type:body.type,axis:body.spinAxis},step,{throttle:enginePowered?thr:0,engineHeatW:vehicleStore.get('ship').stats.engineHeatW,powerAvailable:enginePowered,forward:controlDirection,rotationRateRadS:rotationRate,groundHeightM:body.landable?Math.max(0,groundHeight(V.rot(V.norm(engState.rM),body.spinAxis||[0,1,0],-(body.spinAngle||0)),body)*P.SCENE_METERS_PER_UNIT):0});
   engState={rM:d.rM,vMS:d.vMS,craft:d.craft};engLast=d;steps++;
   if(d.impact&&body.landable){pos=V.add(body.position,P.vec.mul(d.rM,1/P.SCENE_METERS_PER_UNIT));const ns=surfaceData(body,pos);engineeringTouchdown(ns);return;}
  }
 }
 if(total>activeDt&&deepVacuum&&!thr){try{const d=FP.coast(engState.rM,engState.vMS,physical.mu,total-activeDt);engState.rM=d.rM;engState.vMS=d.vMS;}catch(e){/* If coast is ill-conditioned, bounded integration is safer than corrupting the ship. */}}
 engSteps=steps;
 if(engState)vehicleStore.update('ship',{...vehicleStore.get('ship').state,fuelKg:engState.craft.fuelKg,temperatureK:engState.craft.temperatureK});
 const next=P.vec.add(body.position,P.vec.mul(engState.rM,1/P.SCENE_METERS_PER_UNIT));
 if(!next.every(Number.isFinite))throw Error('Engineering position lost precision');
 const sunHit=checkStarCollision(pos,next);if(sunHit){engState=null;engBody=null;pos=V.add(sunHit.sys.position,V.mul(V.norm(V.sub(pos,sunHit.sys.position)),sunHit.sys.star.radius*1.008));vel=[0,0,0];return;}
 pos=next;vel=P.vec.mul(engState.vMS,1/P.SCENE_METERS_PER_UNIT);
 const ns=surfaceData(body,pos);altitude=ns.distance-body.radius-ns.height;vertical=V.dot(vel,ns.dir);
 if(body.landable&&altitude<=SHIP_CLEARANCE){engineeringTouchdown(ns);return;}
 // No fake atmosphere forces on vacuum moons; existing surface model handles collisions.
}
function formatDistance(n){if(n>=1e9)return(n/1e9).toFixed(2)+' Gu';if(n>=1e6)return(n/1e6).toFixed(2)+' Mu';if(n>=1000)return(n/1000).toFixed(1)+' ku';return Math.round(n)+' u';}
function showToast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function surveyKey(b){return b.system+':'+b.name+':'+b.seed;}
function survey(b){return SF.load().surveys?.[surveyKey(b)]||{scans:{},selected:null};}
function saveSurvey(b,s){const data=SF.load();data.surveys=data.surveys||{};data.surveys[surveyKey(b)]=s;SF.save(data);}
function latitudeVector(lat,lon){lat*=Math.PI/180;lon*=Math.PI/180;return[Math.sin(lon)*Math.cos(lat),Math.sin(lat),Math.cos(lon)*Math.cos(lat)];}
function updateSurveyUI(){const b=nearest||target,s=survey(b),done=scans.filter((_,i)=>s.scans?.[i]).length;$('scan-count').textContent=done+' / 3';
 document.querySelectorAll('.scan').forEach((el,i)=>{const d=!!s.scans?.[i];el.classList.toggle('done',d);el.disabled=d||!!scan;el.querySelector('.scan-state').textContent=d?'COMPLETE':scan?.index===i?'SCANNING':'SCAN →';});
 const list=$('site-list');list.replaceChildren();$('site-count').textContent=done===3?'03 AVAILABLE':'UNSURVEYED';
 if(done!==3){const msg=document.createElement('p');msg.className='panel-note';msg.textContent=b.landable?'Any surface can be landed on without a button. Scan to identify recommended sites.':'Gas giants have no solid landing terrain; their moons may be explored.';list.append(msg);return;}
 for(const entry of b.sites){const [name,score,lat,lon]=entry,btn=document.createElement('button');btn.type='button';btn.className='site'+(siteWaypoint?.name===name?' active':'');btn.innerHTML='<span class="site-name"></span><span class="site-score"></span><span class="site-coords"></span>';
 btn.querySelector('.site-name').textContent=name;btn.querySelector('.site-score').textContent=score+'% SAFE';btn.querySelector('.site-coords').textContent=lat.toFixed(1)+'° / '+lon.toFixed(1)+'°';btn.onclick=()=>{siteWaypoint={planet:b,name,dir:latitudeVector(lat,lon)};target=b;updateSurveyUI();showToast('Waypoint plotted: '+name+' — fly there manually.');};list.append(btn);}
}
function startScan(index){if(scan||!nearest||warp)return;const s=survey(nearest);if(s.scans?.[index])return;if(altitude<Math.min(240,nearest.radius*.5)){showToast('Start the survey from a higher altitude.');return;}scan={index,planet:nearest,progress:0};$('scan-note').textContent='Scanning '+scans[index].toLowerCase()+'…';updateSurveyUI();}
function finishScan(){const {index,planet}=scan,s=survey(planet);s.scans=s.scans||{};s.scans[index]=true;saveSurvey(planet,s);scan=null;$('scan-fill').style.width='0%';const reward=SF.awardOnce('flight:scan:'+surveyKey(planet)+':'+index,25);$('credits').textContent=SF.getCredits().toLocaleString()+' CR';$('scan-note').textContent=scans[index]+' acquired.'+(reward?' +25 CR.':'');showToast(scans[index]+' survey complete');updateSurveyUI();if(scans.every((_,i)=>s.scans[i]))SF.recordDiscovery({id:'survey:'+surveyKey(planet),type:'survey',name:planet.name,detail:'Complete orbital survey',planet:planet.name,system:planet.system});}
function updateBodyUI(){const b=nearest||target;$('planet-name').textContent=b.name;$('planet-description').textContent=b.type+' '+b.kind+' / '+b.system+' / '+b.gravity.toFixed(2)+' g';$('system-name').textContent=b.system;$('planet-type').textContent=b.type+(b.kind==='moon'?' moon':'');$('planet-gravity').textContent=b.gravity.toFixed(2)+' g';$('planet-atmosphere').textContent=b.atmosphere;$('day-length').textContent=Math.round(b.spinPeriod)+' s';$('credits').textContent=SF.getCredits().toLocaleString()+' CR';updateSurveyUI();}
let expandedSystemId=null;function drawChart(){const area=$('destinations'),term=($('chart-search')?.value||'').toLowerCase().trim();area.replaceChildren();let shown=0,matched=0;
 const ranked=[...galaxy.systems].sort((a,b)=>V.len(V.sub(a.position,pos))-V.len(V.sub(b.position,pos)));
 for(const sys of ranked){if(term&&!sys.name.toLowerCase().includes(term)&&!sys.star.type.toLowerCase().includes(term)&&!(sys.phenomenon||'').includes(term)&&!sys.planets.some(p=>p.name.toLowerCase().includes(term)||p.type.toLowerCase().includes(term)))continue;
  matched++;if(shown>=55)continue;const group=document.createElement('div');group.className='star-system';const header=document.createElement('button');header.className='destination system-head';header.type='button';const dist=V.len(V.sub(pos,sys.position));header.innerHTML='<div class="dest-top"><b></b><span class="distance"></span></div><small></small>';
  header.querySelector('b').textContent='✦ '+sys.name;header.querySelector('.distance').textContent=formatDistance(dist);header.querySelector('small').textContent=sys.star.type+' · '+sys.star.rarity.toUpperCase()+' · '+(sys.dormant?'UNSURVEYED':sys.planets.length+' PLANETS · '+sys.belts.length+' BELTS')+(sys.phenomenon?' · '+sys.phenomenon.toUpperCase():'');group.append(header);
  const sunBtn=document.createElement('button');sunBtn.type='button';sunBtn.className='sun-destination';sunBtn.textContent='◉ PLOT COURSE TO STAR · APPROACH CORONA';sunBtn.onclick=()=>{target=sys.star;galaxy.pinnedSystemId=sys.id;siteWaypoint=null;closeChart();showToast('Stellar approach plotted. The corona is accessible, but dangerous.');};group.append(sunBtn);
  const children=document.createElement('div');children.className='system-children';children.hidden=!(expandedSystemId===sys.id||(!sys.dormant&&target.systemId===sys.id));
  header.onclick=()=>{const open=children.hidden;expandedSystemId=open?sys.id:null;if(open&&sys.dormant)galaxy.activate(sys);drawChart();};
  for(const body of sys.planets){const b=document.createElement('button');b.className='destination body-dest'+(target===body?' active':'');b.type='button';b.innerHTML='<div class="dest-top"><b></b><span class="distance"></span></div><small></small>';
   b.querySelector('b').textContent=body.name;b.querySelector('.distance').textContent=formatDistance(V.len(V.sub(pos,body.position)));
   b.querySelector('small').textContent=body.type.toUpperCase()+' · DAY '+Math.round(body.spinPeriod)+' s · '+Math.round(body.radius*2).toLocaleString()+' DIAMETER · '+body.moons.length+' MOONS'+(body.ring?' · RINGS':'');
   b.onclick=()=>{target=body;galaxy.pinnedSystemId=body.systemId;siteWaypoint=null;closeChart();showToast('Course plotted to '+body.name+' · G aligns · SHIFT+W enables warp.');};children.append(b);
   for(const moon of body.moons){const m=document.createElement('button');m.className='destination moon-dest'+(target===moon?' active':'');m.type='button';m.innerHTML='<div class="dest-top"><b></b><span class="distance"></span></div><small></small>';
    m.querySelector('b').textContent='◦ '+moon.name;m.querySelector('.distance').textContent=formatDistance(V.len(V.sub(pos,moon.position)));m.querySelector('small').textContent=moon.type.toUpperCase()+' MOON · DAY '+Math.round(moon.spinPeriod)+' s · '+Math.round(moon.radius*2)+' DIAMETER';m.onclick=()=>{target=moon;galaxy.pinnedSystemId=moon.systemId;siteWaypoint=null;closeChart();showToast('Moon waypoint: '+moon.name+'. G to align.');};children.append(m);}
  }
  group.append(children);area.append(group);shown++;
 }
 $('systems-shown').textContent=(term?matched+' MATCHES · ':'')+shown+' SHOWN / '+galaxy.systems.length+' REAL SYSTEMS';
}
function openChart(){drawChart();$('chart').hidden=false;controls.clear();$('chart-search')?.focus();}
function closeChart(){if($('chart').contains(document.activeElement))document.activeElement.blur();$('chart').hidden=true;}
$('new-galaxy').onclick=()=>{const seed=((Date.now()^Math.floor(Math.random()*2**32))>>>0);const url=new URL(location.href);url.searchParams.set('seed',String(seed));location.href=url.href;};
$('chart-open').onclick=openChart;$('chart-close').onclick=closeChart;$('chart-search').oninput=drawChart;$('chart').addEventListener('click',e=>{if(e.target===$('chart'))closeChart();});
$('panel-toggle').onclick=()=>{const c=$('panel').classList.toggle('collapsed');$('panel-toggle').textContent=c?'+':'−';$('panel-toggle').setAttribute('aria-expanded',String(!c));};
document.querySelectorAll('.scan').forEach(b=>b.onclick=()=>startScan(Number(b.dataset.scan)));
function rotate(yaw,pitch,roll){const right=V.norm(V.cross(forward,up));if(yaw)forward=V.rot(forward,up,yaw);if(pitch){forward=V.rot(forward,right,pitch);up=V.rot(up,right,pitch);}if(roll)up=V.rot(up,forward,roll);forward=V.norm(forward);up=V.norm(V.sub(up,V.mul(forward,V.dot(forward,up))));}
function pointTowardWaypoint(){const b=siteWaypoint?.planet||target,way=siteWaypoint?V.add(b.position,V.mul(V.rot(siteWaypoint.dir,b.spinAxis||[0,1,0],b.spinAngle||0),b.radius+180)):b.position,delta=V.sub(way,pos);if(V.len(delta)<30)return;
 let d=V.norm(delta);if(landed){const radial=V.norm(V.sub(pos,nearest.position));d=V.norm(V.sub(d,V.mul(radial,V.dot(d,radial))));if(V.len(d)<.1)return;up=radial;}else{let right=V.norm(V.cross(forward,up));if(V.len(V.cross(right,d))<.01)right=[1,0,0];up=V.norm(V.cross(right,d));}forward=d;showToast('Heading aligned · thrust with W.');}
const busy=()=>['chart','workbench','field-lab','outpost','observatory','integration-modal','controls-modal','ruin-panel','discovery-panel','survey-panel','interior-panel','ecology-panel','events-panel','sandbox-panel','archive-t17'].some(id=>{const e=$(id);return e&&!e.hidden;});
function isTyping(target){return !!(target?.closest?.('input,textarea,select,[contenteditable=true]'));}
addEventListener('keydown',ev=>{
 const code=controls.resolve(ev.code)||ev.code;
 if(busy()||!$('launch-dialog').hidden||window.StarfallAssetUI7A1?.blocking||isTyping(ev.target)){controls.clear();if(code==='Escape'&&!$('chart').hidden)closeChart();return;}
 if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(code))ev.preventDefault();
 if(ev.code==='Escape'&&interiorState){leaveInterior();return;}
 const mapped=controls.press(ev.code);if(!mapped)return;
 if(ev.repeat)return;
 if(code==='KeyX'&&truckOccupied){exitTruck();return;}
 if(code==='KeyX'&&eva){if(interiorState){window.StarfallInteriorsUI?.interact();return;}const ctx=outpostContext(),A=window.StarfallArchaeology,R=window.StarfallRuinsUI;
   const entrance=ctx.body&&ctx.local&&A&&R?.visibleSites?.find(site=>site.bodyId===ctx.bodyId&&A.arc(site.local,ctx.local,ctx.body.radius)<30&&R.records.some(r=>r.id===site.id&&r.level>=2));
   if(entrance){window.StarfallInteriorsUI?.interact();return;}
   const GEO=window.StarfallGeologyLW02,cave=!interiorState&&GEO&&ctx.body?.landable&&ctx.local?
    GEO.sites(ctx.body,GALAXY_SEED).find(site=>GEO.arc(site.local,ctx.local,ctx.body.radius)<7):null;
   if(cave){enterCave(cave);window.StarfallInteriorsUI?.refresh();return;}
   if(enterTruck())return;window.StarfallInteriorsUI?.interact();return;}
 if(['Digit1','Digit2','Digit3'].includes(code))startScan(Number(code.slice(-1))-1);
 if(code==='KeyV'&&(!eva||truckOccupied)){camMode=(camMode+1)%2;camEye=null;showToast(camMode?(truckOccupied?'Truck cab camera':'Ship cockpit camera'):'Chase camera');}
 if(code==='KeyF'){orbitYaw=0;orbitPitch=0;showToast(truckOccupied?'Camera centred behind truck.':eva?'Camera centred behind astronaut.':'Camera centred behind spacecraft.');}
 if(code==='KeyG'&&!eva)pointTowardWaypoint();if(code==='KeyM')openChart();
 if(code==='KeyT'){timeScale=timeScale===1?10:timeScale===10?100:1;showToast('Orbital simulation speed '+timeScale+'×');}
 if(code==='KeyH'){renderer.terrainDebugEnabled=!renderer.terrainDebugEnabled;showToast('Terrain diagnostics '+(renderer.terrainDebugEnabled?'ON':'OFF'));}
 if(code==='KeyL'){headlights=!headlights;if(truckOccupied)truckLights=headlights;showToast((truckOccupied?'Truck floodlights ':eva?'Suit / ship lights ':'Landing floodlights ')+(headlights?'ON':'OFF'));}
 if(code==='KeyR'&&ev.shiftKey&&!eva){pos=V.add(target.position,[0,320,-(target.radius+3550)]);forward=V.norm(V.sub(target.position,pos));up=[0,1,0];vel=[0,0,0];landed=false;groundLocal=null;warp=false;camEye=null;showToast('Reset to target orbital approach.');}
});
addEventListener('keyup',ev=>controls.release(ev.code));addEventListener('blur',()=>controls.clear());
let dragging=false,dragButton=0,lastX=0,lastY=0,dragTravel=0,lastPickingCamera=null,lastAssetHighlightAt=0;const canvas=$('universe');
canvas.addEventListener('contextmenu',ev=>ev.preventDefault());

// 7A.1: project the same world transforms used by the renderer into bounded
// screen-space asset pick targets. No physics state or mesh ownership is changed.
function assetPickCandidates(){
 const result=[],reg=window.StarfallEngineering7AUI?.registry;
 const add=(id,position,radius=5,maxRange=500)=>{if(id&&reg?.assets.has(id)&&Array.isArray(position)&&position.every(Number.isFinite))result.push({id,position,radius,maxRange});};
 const ship=shipWorldState(),rover=roverWorldState(),truck=truckWorldState();
 if(landed){add('starfall-ship',ship?.position,18);add('starfall-rover',rover?.position,6);add('starfall-truck',truck?.position,8);}
 if(landed&&nearest){
  const axis=nearest.spinAxis||[0,1,0],spin=nearest.spinAngle||0;
  for(const item of (window.StarfallOutpostUI?.store?.items||[])){
   if(item.bodyId!==nearest.id)continue;
   const radial=V.norm(V.rot(item.local,axis,spin)),h=groundHeight(item.local,nearest),world=V.add(nearest.position,V.mul(radial,nearest.radius+h+.6));
   add(item.id,world,window.StarfallOutposts?.SPECS?.[item.kind]?.radius||4,450);
  }
  for(const r of (window.StarfallLaunchUI?.store?.rovers||[])){
   if(r.bodyId!==nearest.id||!r.local)continue;
   const radial=V.norm(V.rot(r.local,axis,spin)),world=V.add(nearest.position,V.mul(radial,nearest.radius+groundHeight(r.local,nearest)+1.8));add(r.id,world,6);
  }
 }
 const lu=window.StarfallLaunchUI,SU=window.StarfallEngineering7A;
 if(lu){
  for(const sat of lu.store.satellites.slice(-48)){
   const body=galaxy.byId.get(sat.bodyId);if(!body)continue;
   try{const location=SU.satellitePosition(sat,body,simTime,StarfallPhysics.SCENE_METERS_PER_UNIT);add(sat.id,location.position,55,350000);}catch(_){}
  }
  const active=lu.store.launches.filter(x=>x.phase==='ascent').slice(-3),scene=lu.sceneRockets();
  for(let i=0;i<Math.min(active.length,scene.length);i++)add(active[i].id,scene[i].position,25,120000);
 }
 return result;
}
function pickActualStar(clientX,clientY){
 const rect=canvas.getBoundingClientRect(),cam=lastPickingCamera;
 if(!cam||!renderer.skyPicks||eva||landed)return false;
 const x=(clientX-rect.left)/rect.width,y=(clientY-rect.top)/rect.height,tan=Math.tan(renderer.fov/2),aspect=renderer.aspect;
 let best=null,bestDist=14*14;
 for(const item of renderer.skyPicks){const z=V.dot(item.dir,cam.forward);if(z<=.01)continue;
  const sx=.5+.5*V.dot(item.dir,cam.right)/(z*tan*aspect),sy=.5-.5*V.dot(item.dir,cam.up)/(z*tan);
  const dx=(sx-x)*rect.width,dy=(sy-y)*rect.height,d=dx*dx+dy*dy;
  if(d<bestDist){best=item.system;bestDist=d;}}
 if(!best)return false;
 target=best.star;galaxy.pinnedSystemId=best.id;siteWaypoint=null;showToast('STAR ACQUIRED · '+best.name+' · G align · SHIFT+W warp');return true;
}
canvas.addEventListener('pointerdown',ev=>{if(busy()||!$('launch-dialog').hidden||window.StarfallAssetUI7A1?.blocking)return;dragging=true;dragButton=ev.button;lastX=ev.clientX;lastY=ev.clientY;dragTravel=0;canvas.setPointerCapture(ev.pointerId);});
canvas.addEventListener('pointermove',ev=>{if(!dragging||busy()||!$('launch-dialog').hidden||window.StarfallAssetUI7A1?.blocking)return;const rawDx=V.clamp(ev.clientX-lastX,-100,100),rawDy=V.clamp(ev.clientY-lastY,-100,100),{dx,dy}=controls.signedDrag(rawDx,rawDy);dragTravel+=Math.abs(dx)+Math.abs(dy);lastX=ev.clientX;lastY=ev.clientY;
 // EVA uses an independent full-range view pitch. Dragging upward looks at the sky;
 // the rover/ship camera keeps its original behavior and control sensitivity.
 if(dragButton===2){orbitYaw=V.clamp(orbitYaw-dx*.003,-Math.PI,Math.PI);orbitPitch=V.clamp(orbitPitch-dy*(eva?.0042:.003),eva?-1.3:-1.15,eva?1.72:1.15);return;}
 if(eva){orbitYaw=V.clamp(orbitYaw-dx*.004,-Math.PI,Math.PI);orbitPitch=V.clamp(orbitPitch-dy*.0042,-1.3,1.72);}else if(landed){const radial=V.norm(V.sub(pos,nearest.position));forward=V.norm(V.rot(forward,radial,-dx*.0025));up=radial;}else rotate(-dx*.0024,controls.flightPitch(-dy*.0021),0);
});
canvas.addEventListener('pointerup',ev=>{if(dragButton===0&&dragTravel<7)window.StarfallEngineering7AUI?.refreshRegistry?.();const selected=dragButton===0&&dragTravel<7&&window.StarfallAssetUI7A1?.pickWorld({...lastPickingCamera,fov:renderer.fov},canvas,ev.clientX,ev.clientY,assetPickCandidates());if(!selected&&truckOccupied&&dragButton===0&&dragTravel<12&&roverEntryCooldown<=0)exitTruck();else if(!selected&&!eva&&!landed&&dragButton===0&&dragTravel<7)pickActualStar(ev.clientX,ev.clientY);dragging=false;});canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',ev=>{ev.preventDefault();camDistance=V.clamp(camDistance*Math.exp(ev.deltaY*.0013),25,400);},{passive:false});
document.querySelectorAll('[data-control]').forEach(btn=>{const code=btn.dataset.control;btn.addEventListener('pointerdown',ev=>{if(busy()||!$('launch-dialog').hidden||window.StarfallAssetUI7A1?.blocking)return;ev.preventDefault();controls.touchDown(code);btn.setPointerCapture(ev.pointerId);});for(const kind of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(kind,()=>controls.touchUp(code));});
function surfaceData(body,point){const direction=V.norm(V.sub(point,body.position));const surfaceDirection=V.rot(direction,body.spinAxis||[0,1,0],-(body.spinAngle||0));return{dir:direction,height:body.landable?groundHeight(surfaceDirection,body):0,distance:V.len(V.sub(point,body.position))};}
function stage(alt,body){if(interiorState)return interiorState.kind==='cave'?'SUBTERRANEAN CAVE':'RUIN INTERIOR';if(truckOccupied)return 'SURFACE TRUCK';if(eva)return swimming?'UNDERWATER EVA':'SURFACE EVA';if(landed)return 'TOUCHDOWN';if(warp)return 'INTERSTELLAR WARP';if(!body)return 'INTERSTELLAR SPACE';if(!body.landable&&alt<750)return 'CLOUD DECK';if(alt<30)return 'FINAL DESCENT';if(alt<200)return 'LOW ATMOSPHERE';if(alt<680&&body.kind==='planet')return 'ATMOSPHERIC ENTRY';if(alt<2400)return 'ORBITAL APPROACH';return 'DEEP SPACE';}
function saveFlight(){const ship=shipWorldState(),body=ship.body||nearest,radial=body?V.norm(V.sub(ship.position,body.position)):[0,1,0];SF.save({engineeringVehicles:vehicleStore.serialize(),flightGalaxy:{seed:GALAXY_SEED,time:simTime,position:(eva?ship.position:pos).map(v=>+v.toFixed(3)),forward:eva?ship.forward:forward,up:eva?ship.up:up,target:target.id,attached:body?.id||null,groundDirection:landed?radial:null,landed,engineering:engEnabled&&engState?{bodyId:engBody,rM:engState.rM,vMS:engState.vMS,craft:engState.craft}:null,roverPose:roverBody&&roverLocal?{bodyId:roverBody.id,local:roverLocal,forward:roverForwardVec}:null,shipDockT13:shipDockT13,truckPose:truckBody&&truckLocal?{bodyId:truckBody.id,local:truckLocal,forward:truckForwardVec,batteryJ:truckBatteryJ,lights:truckLights,cargo:truckCargo,chargeReadyAtS:truckChargeReadyAtS,roverChargeReadyAtS:localRoverChargeReadyAtS,roverPortTemperatureK:localRoverPortTemperatureK,fieldServiceT12:localServiceT12,recovery:winch7d}:null}});}
function checkStarCollision(from,to){const segment=V.sub(to,from),den=V.dot(segment,segment);if(den===0)return null;
 for(const sys of galaxy.nearbySystems(V.mul(V.add(from,to),.5),Math.sqrt(den)*.5+2.5e7)){const center=V.sub(sys.position,from),t=V.clamp(V.dot(center,segment)/den,0,1),point=V.add(from,V.mul(segment,t)),gap=V.len(V.sub(point,sys.position));if(gap<sys.star.radius*1.008){return{sys,point};}}
 return null;
}
function updatePhysics(dt){if(busy()||document.hidden)return;
 hatchCooldown=Math.max(0,hatchCooldown-dt);roverEntryCooldown=Math.max(0,roverEntryCooldown-dt);
 simTime=physicsClock.advance(dt,timeScale);
 let attached=landed?nearest:(nearest&&V.len(V.sub(pos,nearest.position))<nearest.radius+75000?nearest:null);
 const previousCenter=attached?[...attached.position]:null,oldSpin=attached?.spinAngle||0;
 galaxy.update(simTime);galaxy.hydrateNear(pos,galaxy.byId.get(target.systemId));
 if(attached){
  if(landed){
   const axis=attached.spinAxis||[0,1,0],turn=(attached.spinAngle||0)-oldSpin;
   if(eva){
    if(shipForwardVec)shipForwardVec=V.rot(shipForwardVec,axis,turn);if(shipUpVec)shipUpVec=V.rot(shipUpVec,axis,turn);
    if(roverForwardVec)roverForwardVec=V.rot(roverForwardVec,axis,turn);
    if(truckForwardVec)truckForwardVec=V.rot(truckForwardVec,axis,turn);
  if(truckOccupied){
     if(!truckLocal)truckLocal=V.rot(V.norm(V.sub(pos,previousCenter)),axis,-oldSpin);
     up=V.rot(up,axis,turn);
     const radial=V.norm(V.rot(truckLocal,axis,attached.spinAngle||0));
     pos=V.add(attached.position,V.mul(radial,attached.radius+groundHeight(truckLocal,attached)+TRUCK_CLEARANCE));
    }else{
     if(!evaLocal)evaLocal=V.rot(V.norm(V.sub(pos,previousCenter)),axis,-oldSpin);
     evaForward=V.rot(evaForward,axis,turn);up=V.rot(up,axis,turn);
     const radial=V.norm(V.rot(evaLocal,axis,attached.spinAngle||0));
     pos=V.add(attached.position,V.mul(radial,attached.radius+groundHeight(evaLocal,attached)+EVA_HEIGHT));
    }
   }else{
    if(!groundLocal)groundLocal=V.rot(V.norm(V.sub(pos,previousCenter)),axis,-oldSpin);
    forward=V.rot(forward,axis,turn);up=V.rot(up,axis,turn);
    const radial=V.norm(V.rot(groundLocal,axis,attached.spinAngle||0));
    pos=V.add(attached.position,V.mul(radial,attached.radius+groundHeight(groundLocal,attached)+SHIP_CLEARANCE));
   }
  }else pos=V.add(attached.position,V.sub(pos,previousCenter));
 }
 const current=galaxy.nearestBody(pos);nearest=current.planet||first;const sample=surfaceData(nearest,pos);altitude=sample.distance-nearest.radius-sample.height;const radial=sample.dir;vertical=V.dot(vel,radial);
 let yaw=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
 if(truckOccupied)yaw=controls.roverYaw(yaw);
 const pitch=controls.flightPitch((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0)),roll=(keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0);
 if(landed){if(eva){
  warp=false;up=radial;
  if(rampTransition){
   rampTransition.elapsed+=dt;const t=Math.min(1,rampTransition.elapsed/rampTransition.duration),smooth=t*t*(3-2*t);
   evaLocal=V.norm(V.mix(rampTransition.from,rampTransition.to,smooth));
   rampLift=(rampTransition.kind==='out'?(1-smooth):smooth)*5.0;
   const dir=V.norm(V.rot(evaLocal,nearest.spinAxis||[0,1,0],nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(dir,nearest.radius+groundHeight(evaLocal,nearest)+EVA_HEIGHT+rampLift));up=dir;
   if(t>=1){const direction=rampTransition.kind;rampTransition=null;rampLift=0;
    if(direction==='in'){boardShip();vertical=0;vel=[0,0,0];return;}
   }vertical=0;vel=[0,0,0];return;
  }
  if(roverExitMove){
   roverExitMove.progress=Math.min(1,roverExitMove.progress+dt/0.85);
   const t=roverExitMove.progress,dir=V.norm(V.mix(roverExitMove.from,roverExitMove.to,t));
   evaLocal=dir;const worldDir=V.norm(V.rot(dir,nearest.spinAxis||[0,1,0],nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(worldDir,nearest.radius+groundHeight(dir,nearest)+EVA_HEIGHT));
   if(t>=1)roverExitMove=null;vertical=0;vel=[0,0,0];return;
  }
    if(interiorState){
   // Finite floor-space collision on stationary rectangular rooms and corridors.
   if(yaw)evaForward=V.norm(V.rot(evaForward,radial,yaw*dt*1.95));
   const walk=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
   if(walk){const basis=interiorState.basis,axis=nearest.spinAxis||[0,1,0],f=V.rot(evaForward,axis,-(nearest.spinAngle||0)),horizontal=V.norm(V.sub(f,V.mul(interiorState.site.local,V.dot(f,interiorState.site.local)))),rate=dt*(keys.has('ShiftLeft')?6.2:3.5)*walk;
    interiorState.at=(interiorState.kind==='cave'?window.StarfallGeologyLW02.move:StarfallInteriors.move)(interiorState.layout,interiorState.at,{x:V.dot(horizontal,basis.right)*rate,z:V.dot(horizontal,basis.forward)*rate});
   }
   const place=interiorWorld(interiorState.at);evaLocal=place.local;pos=place.position;up=place.up;vertical=0;vel=[0,0,0];return;
  }
  if(truckOccupied){
   if(yaw)truckForwardVec=V.norm(V.rot(truckForwardVec,radial,yaw*dt*1.13));
   truckForwardVec=V.norm(V.sub(truckForwardVec,V.mul(radial,V.dot(radial,truckForwardVec))));if(V.len(truckForwardVec)<.05)truckForwardVec=V.norm(V.cross(Math.abs(radial[1])>.92?[0,0,1]:[0,1,0],radial));
   const drive=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
   if(drive&&truckBatteryJ>0){
    const right=V.norm(V.cross(truckForwardVec,radial)),weather=window.StarfallMeteorologyLW03?.cell(nearest,truckLocal,simTime,GALAXY_SEED),
      traction=weather?.precipitationKgM2S>0?Math.max(.53,1-weather.precipitationKgM2S*95):weather?.regime==='dust'?.82:1,
      speed=((keys.has('ShiftLeft')||keys.has('ShiftRight'))?20:11.5)*traction;
    const step=drive*dt*speed,angle=step/Math.max(1,nearest.radius+groundHeight(truckLocal,nearest)+TRUCK_CLEARANCE);
    const nextDir=V.norm(V.rot(radial,right,-angle));truckForwardVec=V.norm(V.rot(truckForwardVec,right,-angle));
    const nextLocal=V.rot(nextDir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
    const dh=Math.abs(groundHeight(nextLocal,nearest)-groundHeight(truckLocal,nearest));
    if(dh<Math.max(.45,Math.abs(step)*.55)){truckLocal=nextLocal;pos=V.add(nearest.position,V.mul(nextDir,nearest.radius+groundHeight(truckLocal,nearest)+TRUCK_CLEARANCE));up=nextDir;truckBatteryJ=Math.max(0,truckBatteryJ-dt*(speed>12?4500:1800));}
   }
   evaForward=[...truckForwardVec];vertical=0;vel=[0,0,0];return;
  }
  if(yaw)evaForward=V.norm(V.rot(evaForward,radial,yaw*dt*1.95));
  evaForward=V.norm(V.sub(evaForward,V.mul(radial,V.dot(radial,evaForward))));if(V.len(evaForward)<.05)evaForward=V.norm(V.cross(Math.abs(radial[1])>.92?[0,0,1]:[0,1,0],radial));
  const walk=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
  const Hydro=window.StarfallHydrosphereLW04;
  const liquidDir=evaLocal||V.rot(radial,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
  const water=Hydro?.sample(nearest,liquidDir,groundHeight(liquidDir,nearest),simTime,GALAXY_SEED);
  if(!water?.hasWater){swimming=false;swimDepthScene=.3;swimVerticalSceneS=0;}
  else if(!swimming){swimming=true;swimDepthScene=-.5;swimVerticalSceneS=0;showToast('ENTERING WATER · W/S swim · Q rise · E dive · L lamp');}
  if(swimming){
   if(swimDepthScene<.001)swimDepthScene=Math.min(.001,swimDepthScene+dt*.75);
   else{
    const suit=Hydro.buoyancy(water,.11,105,dt),command=(keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0);
    swimVerticalSceneS=V.clamp((swimVerticalSceneS+suit.netAccelerationMS2*dt/Hydro.SCENE_M+command*dt*.009)*Math.exp(-dt*2.2),-.015,.015);
    swimDepthScene=V.clamp(swimDepthScene-swimVerticalSceneS*dt,.001,Math.min(.045,Math.max(.001,water.surfaceHeightScene-.35)));
   }
  }
  const weather=window.StarfallMeteorologyLW03?.cell(nearest,evaLocal||[0,1,0],simTime,GALAXY_SEED),windResistance=weather?.vacuum?1:Math.max(.52,1-(weather?.windMS||0)/185);
  if(walk){const right=V.norm(V.cross(evaForward,radial)),step=walk*dt*(swimming?2.4:((keys.has('ShiftLeft')||keys.has('ShiftRight'))?7.1:3.7))*windResistance,angle=step/Math.max(nearest.radius+groundHeight(evaLocal||V.rot(radial,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),nearest)+EVA_HEIGHT,1);
   const nextDir=V.norm(V.rot(radial,right,-angle));evaForward=V.norm(V.rot(evaForward,right,-angle));evaLocal=V.rot(nextDir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(nextDir,nearest.radius+(swimming?water.surfaceHeightScene-swimDepthScene:groundHeight(evaLocal,nearest)+EVA_HEIGHT)));up=nextDir;
   walkedSinceExit+=Math.abs(step);
  }
  if(swimming){
   const d=V.norm(V.rot(evaLocal||liquidDir,nearest.spinAxis||[0,1,0],nearest.spinAngle||0));
   const ocean=Hydro.sample(nearest,evaLocal||liquidDir,groundHeight(evaLocal||liquidDir,nearest),simTime,GALAXY_SEED);
   if(ocean.hasWater){pos=V.add(nearest.position,V.mul(d,nearest.radius+ocean.surfaceHeightScene-swimDepthScene));up=d;}
   else{swimming=false;swimDepthScene=.3;}
  }
  // Spatial transitions only. The astronaut physically walks into the rear ramp or rover seat.
  if(!swimming&&hatchCooldown<=0 && walkedSinceExit>3 && walk>0 && shipBody===nearest){
   const ship=shipWorldState(),delta=V.sub(pos,ship.position),ahead=V.dot(delta,ship.forward);
   const right=V.norm(V.cross(ship.forward,ship.up)),side=V.dot(delta,right);
   if(ahead> -29 && ahead < -17 && Math.abs(side)<4.8){
    const hatchLocal=tangentOffsetLocal(shipBody,shipLocal,shipForwardVec,-10,0);
    rampTransition={kind:'in',elapsed:0,duration:1.15,from:[...evaLocal],to:hatchLocal};
    showToast('Walking up the cargo ramp · boarding ship');vertical=0;vel=[0,0,0];return;
   }
  }
  // Science rover is never rideable; truck only boards through a deliberate X press.
  vertical=0;vel=[0,0,0];return;}
  shipIdleElapsed=keys.has('KeyS')?shipIdleElapsed+dt:0;
  if(shipIdleElapsed>.52&&hatchCooldown<=0){exitShip();vertical=0;vel=[0,0,0];return;}
  if(keys.has('Space')){if(shipDockT13.state!=='UNDOCKED'){showToast('T13 · UNDOCK SERVICE CABLE BEFORE TAKEOFF');vertical=0;vel=[0,0,0];return;}landingCapture=null;landed=false;groundLocal=null;eva=false;evaLocal=null;shipBody=null;truckOccupied=false;vel=V.add(V.mul(radial,38),V.mul(forward,14));pos=V.add(pos,V.mul(radial,5));showToast('Liftoff · atmospheric ascent');}else{
  if(yaw)forward=V.norm(V.rot(forward,radial,yaw*dt*1.65));forward=V.norm(V.sub(forward,V.mul(radial,V.dot(radial,forward))));up=radial;const desired=(keys.has('KeyW')?34:0)-(keys.has('KeyS')?15:0),speed=V.dot(vel,forward);
  vel=V.mul(forward,speed+(desired-speed)*Math.min(1,dt*2));const nextPos=V.add(pos,V.mul(vel,dt)),ns=surfaceData(nearest,nextPos);groundLocal=V.rot(ns.dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(ns.dir,nearest.radius+ns.height+SHIP_CLEARANCE));vertical=0;warp=false;return;}}
 if(yaw||pitch||roll)rotate(yaw*dt*1.27,pitch*dt*.98,roll*dt*1.03);
 if(nearest.landable&&altitude<120&&vertical<-1&&!keys.has('Space'))landingCapture=nearest.id;
 if(altitude>180||keys.has('Space')||landingCapture!==nearest.id)landingCapture=null;
 const boost=keys.has('ShiftLeft')||keys.has('ShiftRight'),thrust=keys.has('KeyW'),brake=keys.has('KeyS');
 const toTarget=V.sub(target.position,pos),range=V.len(toTarget),desiredStop=target.kind==='star'?target.radius*1.24:Math.max(125000,target.radius*38);
 const nearSun=galaxy.nearestStar(pos),starDist=nearSun.alt,starRadius=nearSun.system.star.radius;
 solarWarning=starDist<starRadius*.95;
 heat=V.clamp(heat+(solarWarning?Math.max(0,1.9-(starDist+starRadius)/starRadius)*27*dt:-13*dt),0,100);
 const canWarp=boost&&thrust&&altitude>2600&&range>desiredStop&&starDist>starRadius*.06&&(!nearest||altitude>nearest.radius*2.5);
 if(canWarp){engState=null;engBody=null;warp=true;const speed=Math.min(9e9,Math.max(220000,range*.27));const step=Math.min(range-desiredStop,speed*dt);const to=V.add(pos,V.mul(forward,step));const hit=checkStarCollision(pos,to);
  if(hit){const outside=V.norm(V.sub(hit.point,hit.sys.position)),safe=V.add(hit.sys.position,V.mul(outside,hit.sys.star.radius*1.008));pos=safe;vel=[0,0,0];warp=false;showToast('PHOTOSPHERE CONTACT · warp interrupted');}
  else{pos=to;vel=[0,0,0];}
  return;
 }
 if(warp){warp=false;vel=[0,0,0];engState=null;engBody=null;showToast('Warp drive disengaged · manual approach resumed');}
 if(engEnabled){engineeringFlight(dt);return;}
 let maxSpeed=boost?4800:2300;if(solarWarning)maxSpeed=boost?140000:55000;if(altitude<1800)maxSpeed=boost?800:490;if(altitude<680)maxSpeed=boost?420:280;if(altitude<210)maxSpeed=boost?150:110;if(altitude<65)maxSpeed=boost?48:34;
 const accel=solarWarning?22000:altitude<650?270:altitude<1800?450:900;
 if(thrust)vel=V.add(vel,V.mul(forward,accel*(boost?1.55:1)*dt));if(brake)vel=V.add(vel,V.mul(forward,-accel*.74*dt));
 if(keys.has('Space'))vel=V.add(vel,V.mul(radial,accel*.6*dt));if(keys.has('KeyC'))vel=V.add(vel,V.mul(radial,-accel*.5*dt));
 const atmos=nearest.kind==='planet'&&nearest.landable?1-V.clamp((altitude-250)/950,0,1):0;
 vel=V.mul(vel,Math.exp(-(.025+atmos*.26+(altitude<80&&nearest.landable?.31:0))*dt));
 if(altitude<950&&nearest.landable)vel=V.add(vel,V.mul(radial,-nearest.gravity*11*dt));
 const speed=V.len(vel);if(speed>maxSpeed)vel=V.mul(vel,maxSpeed/speed);
 if(nearest.landable){const down=V.dot(vel,radial);if(altitude<300&&down<0){const limit=altitude<14?5.5:altitude<42?11:altitude<90?30:altitude<175?66:130;if(-down>limit)vel=V.add(vel,V.mul(radial,-limit-down));}
  if(altitude<26&&!keys.has('Space')){const sink=V.dot(vel,radial),desired=-Math.min(6.5,Math.max(3.8,altitude*.33));vel=V.add(vel,V.mul(radial,(desired-sink)*Math.min(1,dt*3.1)));}}
 // Once a descending ship enters its final approach corridor, aerodynamic control
 // stabilizes horizontal drift and keeps actual vertical flight continuous to terrain.
 if(landingCapture===nearest.id&&altitude<135&&!keys.has('Space')){
  const sink=altitude<14?4.6:altitude<50?7.5:altitude<110?13:20;
  const lateral=V.sub(vel,V.mul(radial,V.dot(vel,radial)));
  vel=V.add(V.mul(lateral,Math.exp(-dt*2.4)),V.mul(radial,-sink));
 }
 const attempted=V.add(pos,V.mul(vel,dt));const sunImpact=checkStarCollision(pos,attempted);
 if(sunImpact){const outside=V.norm(V.sub(sunImpact.point,sunImpact.sys.position));pos=V.add(sunImpact.sys.position,V.mul(outside,sunImpact.sys.star.radius*1.008));vel=V.mul(outside,12);heat=100;showToast('PHOTOSPHERE CONTACT · CRITICAL HEAT · reverse thrust!');return;}
 pos=attempted;const ns=surfaceData(nearest,pos);altitude=ns.distance-nearest.radius-ns.height;vertical=V.dot(vel,ns.dir);
 if(!nearest.landable&&altitude<120){pos=V.add(nearest.position,V.mul(ns.dir,nearest.radius+120));vel=V.mul(ns.dir,90);if(altitude<20)showToast(nearest.type==='Shattered'?'Shattered world: unstable debris · no safe touchdown':'Gas giant: no solid surface · explore its moons');return;}
 if(nearest.landable&&altitude<66){const t=1-Math.max(0,altitude)/66,tangent=V.sub(forward,V.mul(ns.dir,V.dot(forward,ns.dir)));let d=V.len(tangent)>.05?V.norm(tangent):V.norm(V.cross(ns.dir,[1,0,0]));forward=V.norm(V.mix(forward,d,Math.min(.085,dt*2.3)*t));const upright=V.sub(ns.dir,V.mul(forward,V.dot(ns.dir,forward)));if(V.len(upright)>.03)up=V.norm(V.mix(up,V.norm(upright),Math.min(.085,dt*2.3)*t));}
 if(nearest.landable&&altitude<=7.5){
  groundLocal=V.rot(ns.dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
  pos=V.add(nearest.position,V.mul(ns.dir,nearest.radius+ns.height+SHIP_CLEARANCE));landed=true;landingCapture=null;vel=[0,0,0];up=ns.dir;let tangent=V.sub(forward,V.mul(up,V.dot(forward,up)));if(V.len(tangent)<.05)tangent=V.cross([0,1,0],up);forward=V.norm(tangent);
  shipBody=nearest;shipLocal=[...groundLocal];shipForwardVec=[...forward];shipUpVec=[...up];eva=false;evaLocal=null;truckOccupied=false;placeRoverNearShip();
 $('landed-label').textContent='Welcome to '+nearest.name;$('landing-banner').classList.add('show');clearTimeout(landingTimer);landingTimer=setTimeout(()=>$('landing-banner').classList.remove('show'),6500);
 SF.recordDiscovery({id:'seamless-land:'+nearest.id,type:'landing',name:'Landed on '+nearest.name,detail:'Continuous physical landing',planet:nearest.name,system:nearest.system});showToast('TOUCHDOWN CONFIRMED · disembarking onto surface');saveFlight();exitShip();}
}
function cameraState(dt){
 const radial=nearest?V.norm(V.sub(pos,nearest.position)):[0,1,0],groundMix=V.clamp((300-altitude)/260,0,1);
 if(truckOccupied){
  // UI20: V toggles an actual first-person truck cab, not a fake HUD
  // camera offset above the chase vehicle. All truck dynamics stay unchanged.
  if(camMode===1){
   const truck=truckWorldState(),cabUp=truck?.up||radial;
   if(truck){
    const tangent=V.norm(V.sub(truck.forward,V.mul(cabUp,V.dot(truck.forward,cabUp))));
    const cabRight=V.norm(V.cross(tangent,cabUp));
    const yawLook=V.rot(tangent,cabUp,orbitYaw);
    const pitchLook=V.rot(yawLook,cabRight,orbitPitch);
    const desired=V.add(truck.position,V.add(V.mul(cabUp,1.85),V.mul(tangent,1.75)));
    camEye=[...desired];
    const viewForward=V.norm(pitchLook),right=V.norm(V.cross(viewForward,cabUp)),viewUp=V.norm(V.cross(right,viewForward));
    return{eye:desired,target:V.add(desired,V.mul(viewForward,120)),forward:viewForward,right,up:viewUp};
   }
  }
  const tangent=V.norm(V.sub(truckForwardVec,V.mul(radial,V.dot(truckForwardVec,radial))));
  const rightR=V.norm(V.cross(tangent,radial));
  const orbitDirection=V.rot(V.rot(tangent,radial,orbitYaw),rightR,orbitPitch*.28);
  let desired=V.add(pos,V.add(V.mul(orbitDirection,-18),V.mul(radial,6.2)));
  if(nearest?.landable){const sample=surfaceData(nearest,desired),safeRadius=nearest.radius+sample.height+3.4;if(sample.distance<safeRadius)desired=V.add(nearest.position,V.mul(sample.dir,safeRadius));}
  const aim=V.add(pos,V.add(V.mul(tangent,7.5),V.mul(radial,2.5)));
  if(!camEye||V.len(V.sub(camEye,desired))>1200)camEye=[...desired];else camEye=V.mix(camEye,desired,1-Math.exp(-dt*10));
  if(nearest?.landable){const ground=surfaceData(nearest,camEye),clearance=nearest.radius+ground.height+3.4;if(ground.distance<clearance)camEye=V.add(nearest.position,V.mul(ground.dir,clearance));}
  const viewForward=V.norm(V.sub(aim,camEye)),right=V.norm(V.cross(viewForward,radial)),viewUp=V.norm(V.cross(right,viewForward));
  return{eye:camEye,target:aim,forward:viewForward,right,up:viewUp};
 }
 if(eva&&interiorState){
  // First-person camera keeps the roof and walls in view; third-person chase
  // would clip through the structure and expose terrain outside.
  const horizontal=V.norm(V.sub(evaForward,V.mul(radial,V.dot(evaForward,radial)))),lookPlanar=V.norm(V.rot(horizontal,radial,orbitYaw)),pitch=V.clamp(orbitPitch-.10,-1.35,1.35);
  camEye=V.add(pos,V.mul(radial,1.25));const viewForward=V.norm(V.add(V.mul(lookPlanar,Math.cos(pitch)),V.mul(radial,Math.sin(pitch))));
  const right=V.norm(V.cross(viewForward,radial)),viewUp=V.norm(V.cross(right,viewForward));
  return{eye:camEye,target:V.add(camEye,V.mul(viewForward,40)),forward:viewForward,right,up:viewUp};
 }
 if(eva){
  const tangent=V.norm(V.sub(evaForward,V.mul(radial,V.dot(evaForward,radial))));
  const lookPlanar=V.norm(V.rot(tangent,radial,orbitYaw));
  // The previous camera only nudged its position while always aiming at a fixed
  // ground-level point. This capped effective elevation near the horizon. Keep
  // the camera physically above terrain, and pitch the optical axis instead.
  const lookPitch=V.clamp(orbitPitch-.20,-1.50,1.50);
  let desired=V.add(pos,V.add(V.mul(lookPlanar,-12),V.mul(radial,4.5)));
  if(nearest?.landable){const sample=surfaceData(nearest,desired),safeRadius=nearest.radius+sample.height+2.8;if(sample.distance<safeRadius)desired=V.add(nearest.position,V.mul(sample.dir,safeRadius));}
  if(!camEye||V.len(V.sub(camEye,desired))>1200)camEye=[...desired];else camEye=V.mix(camEye,desired,1-Math.exp(-dt*13));
  if(nearest?.landable){const ground=surfaceData(nearest,camEye),clearance=nearest.radius+ground.height+2.8;if(ground.distance<clearance)camEye=V.add(nearest.position,V.mul(ground.dir,clearance));}
  const viewForward=V.norm(V.add(V.mul(lookPlanar,Math.cos(lookPitch)),V.mul(radial,Math.sin(lookPitch))));
  const right=V.norm(V.cross(viewForward,radial)),viewUp=V.norm(V.cross(right,viewForward));
  const aim=V.add(camEye,V.mul(viewForward,60));
  return{eye:camEye,target:aim,forward:viewForward,right,up:viewUp};
 }
 let camUp=V.norm(V.mix(up,radial,groundMix*.85)),cf=V.norm(forward);
 const rightShip=V.norm(V.cross(cf,camUp)),correctedUp=V.norm(V.cross(rightShip,cf));camUp=correctedUp;
 const orbitDirection=V.rot(V.rot(cf,camUp,orbitYaw),rightShip,orbitPitch);
 const cockpit=camMode===1;
 let desired=cockpit?V.add(pos,V.add(V.mul(cf,7),V.mul(camUp,3.0))):V.add(pos,V.add(V.mul(orbitDirection,-camDistance),V.mul(camUp,Math.max(9,camDistance*.22))));
 // Chase cameras must never pass under displaced terrain or the ocean surface.
 if(nearest?.landable&&altitude<Math.max(380,camDistance*2)){
  const sample=surfaceData(nearest,desired),safeRadius=nearest.radius+sample.height+(cockpit?4:Math.max(13,camDistance*.18));
  if(sample.distance<safeRadius)desired=V.add(nearest.position,V.mul(sample.dir,safeRadius));
 }
 const aim=cockpit?V.add(pos,V.mul(cf,200)):V.add(pos,V.mul(camUp,4));
 // No interpolation in world space while standing on a spinning/orbiting planet:
 // that would drag the view underground during 10x and 100x acceleration.
 if(!camEye||landed||altitude<70||warp||V.len(V.sub(camEye,desired))>200000)camEye=[...desired];
 else camEye=V.mix(camEye,desired,1-Math.exp(-dt*11));
 if(nearest?.landable&&altitude<Math.max(380,camDistance*2)){
  const ground=surfaceData(nearest,camEye),clearance=nearest.radius+ground.height+(cockpit?4:Math.max(13,camDistance*.18));
  if(ground.distance<clearance)camEye=V.add(nearest.position,V.mul(ground.dir,clearance));
 }
 const viewForward=V.norm(V.sub(aim,camEye)),right=V.norm(V.cross(viewForward,camUp)),viewUp=V.norm(V.cross(right,viewForward));
 return{eye:camEye,target:aim,forward:viewForward,right,up:viewUp};
}
function refreshHUD(dt){hudClock+=dt;if(hudClock<.16)return;hudClock=0;
 // Paint-only vehicle identity for UI20 cockpit frames (6 Hz bounded).
 document.body.dataset.sfView=truckOccupied?(camMode===1?'truck-cab':'truck-chase'):eva?'eva':camMode===1?'ship-cockpit':'ship-chase';
 const hint=$('control-live-hint');if(hint){const codes=controls.settings.bindings;const short=k=>String(k||'—').replace(/^Key/,'').replace(/^Digit/,'').replace(/^Arrow/,'ARROW ').replace('ShiftLeft','SHIFT').replace('Space','SPACE');
  const mode=interiorState?(interiorState.kind==='cave'?'CAVE':'RUIN INTERIOR'):truckOccupied?'TRUCK':eva?'EVA':landed?'LANDED SHIP':'SHIP';const word=mode==='SHIP'?'thrust / brake':mode==='LANDED SHIP'?'drive / reverse':'forward / reverse';
  const text=mode+' · '+short(codes.thrust)+' / '+short(codes.brake)+' '+word+' · '+short(codes.turnLeft)+' / '+short(codes.turnRight)+' turn'+(truckOccupied&&controls.settings.roverSteerInvert?' (INVERTED)':'')+' · MOUSE Y '+(controls.settings.lookInvertY?'INVERTED':'NORMAL')+(controls.settings.flightPitchInvert&&mode==='SHIP'?' · FLIGHT PITCH INVERTED':'')+' · CONTROLS ⚙ TO CUSTOMIZE';if(hint.textContent!==text)hint.textContent=text;
 }
const body=nearest||target,phase=solarWarning?'STELLAR CORONA':stage(altitude,body);$('phase-top').textContent='EXPEDITION / '+phase;$('flight-state').textContent=phase;$('mode-text').textContent=truckOccupied?'TRUCK':eva?'EVA':solarWarning?'CORONA':warp?'WARP':landed?'SURFACE':altitude<650?'ATMOSPHERE':altitude<2500?'ORBIT':'FREE FLIGHT';
 $('speed-text').textContent=warp?'FTL CRUISE':V.len(vel).toFixed(0)+' u/s';$('alt-text').textContent=formatDistance(Math.max(0,altitude));$('vertical-text').textContent=vertical.toFixed(0)+' u/s';$('star-count').textContent=renderer.starPoints.toLocaleString();$('body-count').textContent=renderer.renderedBodies+' / '+galaxy.allWorlds.length;$('system-count').textContent=String(galaxy.systems.length);$('coordinates').textContent=pos.map(n=>Math.round(n/1e6)).join(' / ')+' Mu';$('fps-text').textContent=Math.round(fps);$('effects-count').textContent=(renderer.effectsRendered||0).toLocaleString();$('time-scale').textContent=timeScale+'×';$('lighting-state').textContent=renderer.daylightLabel||'—';$('floodlights-state').textContent=headlights?'ON':'OFF';
 const biomeLabel=$('biome-label'),biomeDesc=$('biome-description');if(biomeLabel){const nearby=body?.landable&&altitude<1100;if(nearby){const d=V.rot(V.norm(V.sub(pos,body.position)),body.spinAxis||[0,1,0],-(body.spinAngle||0)),h=groundHeight(d,body),f=Starfall3D.field(d,body.seed),a=BIOMES.classify(body,d,h,f);biomeLabel.textContent=a.name.toUpperCase();biomeDesc.textContent=a.lifePotential?'Potential biology · unconfirmed':'Geological environment · unconfirmed biology';}else{biomeLabel.textContent='—';biomeDesc.textContent='Approach a solid world to survey the surface';}}
 const nearSys=galaxy.nearestSystem(pos);const types=[];if(nearSys?.belts.length)types.push(nearSys.belts.length+' ASTEROID BELT'+(nearSys.belts.length>1?'S':''));if(nearSys?.nebulae.length)types.push('NEBULA');if(nearSys?.comets.length)types.push('COMET');if(nearSys?.phenomenon)types.push(nearSys.phenomenon.toUpperCase());const eventVisible=nearSys&&V.len(V.sub(pos,nearSys.position))<nearSys.maxOrbit*2.5;$('space-event').hidden=!eventVisible;$('space-event').textContent=eventVisible?'SECTOR PHENOMENA / '+(types.join('  ·  ')||'QUIET SYSTEM'):'';
 $('solar-alert').hidden=!solarWarning;$('heat-fill').style.width=heat.toFixed(1)+'%';$('heat-number').textContent=Math.round(heat)+'%';$('corona-star').textContent=galaxy.nearestStar(pos).system?.name||'—';
 $('walk-context').textContent=truckOccupied?'X / CLICK TO EXIT THE TRUCK':eva?rampTransition?(rampTransition.kind==='out'?'WALKING DOWN REAR RAMP':'WALKING UP REAR RAMP'):roverExitMove?'STEPPING AWAY FROM TRUCK':(roverBody===nearest&&roverWorldState()&&V.len(V.sub(pos,roverWorldState().position))<24?'SCIENCE ROVER: PROGRAM ONLY · TRUCK: APPROACH AND PRESS X':'EVA · X NEAR TRUCK TO DRIVE · SCIENCE ROVER IS UNCREWED'):landed?'HOLD S TO WALK DOWN THE RAMP · SPACE TO LAUNCH':'';
 $('status-text').textContent=solarWarning?'CORONAL WARNING · THERMAL LOAD '+Math.round(heat)+'% · PHOTOSPHERE IS SOLID':truckOccupied?'TRUCK · W/S DRIVE · A/D STEER · X OR CLICK TO EXIT · BATTERY '+Math.round(truckBatteryJ/44e6*100)+'%':eva?'EVA · SKY LOOK · X NEAR TRUCK · SCIENCE ROVER IS UNCREWED':landed?'SHIP LANDED · SPACE TO TAKE OFF · HOLD S TO WALK DOWN RAMP':warp?'WARP CRUISE · RELEASE SHIFT TO EXIT · G ALIGNS':'LEFT DRAG STEER · RIGHT DRAG LOOK · SCROLL ZOOM · F CENTRE CAMERA';
 if(phase!==nearPhase){nearPhase=phase;if(phase==='ATMOSPHERIC ENTRY')showToast('Atmospheric entry · deceleration engaged');if(phase==='LOW ATMOSPHERE')showToast('Surface acquired · descend to land');if(phase==='STELLAR CORONA')showToast('CORONAL WARNING · stellar radiation increasing');}
 const goal=siteWaypoint?V.add(siteWaypoint.planet.position,V.mul(V.rot(siteWaypoint.dir,siteWaypoint.planet.spinAxis||[0,1,0],siteWaypoint.planet.spinAngle||0),siteWaypoint.planet.radius+8)):target.position,delta=V.sub(goal,pos),dist=V.len(delta),bearing=V.dot(V.norm(delta),forward);
 $('waypoint-label').textContent=truckOccupied?'TRUCK / '+body.name+' · PRESS X TO EXIT':eva?'EVA / '+body.name+' · WALK INTO REAR RAMP TO BOARD':landed?'SURFACE / '+body.name:siteWaypoint?'◆ '+siteWaypoint.name.toUpperCase()+' · '+formatDistance(dist):'✦ '+target.name.toUpperCase()+' · '+formatDistance(dist)+(bearing<.75?' · G TO ALIGN':'');
 $('entry-flash').style.opacity=String(altitude<650&&altitude>65?V.clamp((V.len(vel)-135)/600,0,.44)*Math.sin(performance.now()*.005)**2:0);
 if(lastPlanetId!==body.id){lastPlanetId=body.id;updateBodyUI();}
}
// LW05 local rigid-body contact approximation: never teleport, never edit the
// existing galaxy or orbit data. Real 3D rocks have authoritative hit radii.
let debrisLastCheckMS=0,debrisLastToastMS=-1e10,debrisLastContactS=-1e10,latestDebrisWarning=null;
function updateDebrisHazards(now){
 const D=window.StarfallDebrisLW05;
 if(!D||eva||landed||warp||truckOccupied||busy()||now-debrisLastCheckMS<65)return;
 debrisLastCheckMS=now;
 const rocks=D.nearby(galaxy,pos,simTime,520),risk=D.proximity(rocks,pos,4);
 latestDebrisWarning=risk;
 if(!risk)return;
 if(risk.clearance<150&&now-debrisLastToastMS>11000){
  debrisLastToastMS=now;
  showToast(risk.clearance<0?'ASTEROID IMPACT · collision impulse applied':
   'DEBRIS PROXIMITY · '+Math.max(0,Math.round(risk.clearance))+' scene units clearance');
 }
 if(!risk.collision||simTime-debrisLastContactS<.4)return;
 const rock=rocks.find(x=>x.id===risk.rockId);
 if(!rock)return;
 const outward=V.norm(V.sub(pos,rock.position));
 pos=V.add(rock.position,V.mul(outward,rock.radius+4.5));
 const incoming=V.dot(vel,outward);
 if(incoming<0)vel=V.sub(vel,V.mul(outward,incoming*1.25));
 if(engState?.vMS){const speed=P.SCENE_METERS_PER_UNIT;engState.vMS=V.mul(vel,speed);engState.rM=V.mul(V.sub(pos,nearest.position),speed);}
 debrisLastContactS=simTime;
 const ship=vehicleStore.get('ship'),previous=ship?.state;
 if(previous&&Number.isFinite(previous.health)){
  vehicleStore.update('ship',{...previous,health:Math.max(0,previous.health-Math.min(.12,.02+V.len(vel)*.00015))});
 }
}
function loop(now){const dt=Math.min(Math.max((now-lastTime)/1000,0),.04),perf=window.StarfallIntegration,started=perf?.enabled?performance.now():0;lastTime=now;
 try{if(!busy()){updateVehicleSystems(dt);updatePhysics(dt);updateDebrisHazards(now);if(window.StarfallScienceUI?.tick)window.StarfallScienceUI.tick(dt,timeScale);if(window.StarfallOutpostUI?.tick)window.StarfallOutpostUI.tick(dt,timeScale);if(window.StarfallRuinsUI?.tick)window.StarfallRuinsUI.tick(dt,timeScale);if(window.StarfallInteriorsUI?.tick)window.StarfallInteriorsUI.tick(dt,timeScale);if(window.StarfallEventsUI?.tick)window.StarfallEventsUI.tick(dt,timeScale);if(window.StarfallLaunchUI?.tick)window.StarfallLaunchUI.tick(dt,timeScale);window.StarfallMissionOperationsUI?.advanceTo(simTime);if(scan){scan.progress=Math.min(1,scan.progress+dt/2.2);$('scan-fill').style.width=(scan.progress*100).toFixed(1)+'%';if(scan.progress>=1)finishScan();}}
  const afterUpdate=started?performance.now():0;
  const camera=cameraState(dt),ship=shipWorldState(),rover=roverWorldState();lastPickingCamera=camera;
  const rad=nearest?V.norm(V.sub(pos,nearest.position)):[0,1,0];
  const portraitBase=eva&&!interiorState&&nearest&&nearest.landable?V.add(nearest.position,V.mul(rad,nearest.radius+groundHeight(evaLocal||V.rot(rad,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),nearest)+(swimming?Math.max(.03,(window.StarfallHydrosphereLW04?.material(nearest,GALAXY_SEED)?.seaLevelOffsetScene||2.1)-swimDepthScene-1.7):truckOccupied?3.4:.25)+rampLift+(eva&&!truckOccupied&&!rampTransition&&(keys.has('KeyW')||keys.has('KeyS'))?.10*Math.abs(Math.sin(performance.now()*.013)):0))):null;
  renderer.render({camera,swimming:swimming&&swimDepthScene>=.001,weather:!interiorState&&nearest?.landable&&altitude<600?StarfallEvents.evaluate(nearest,V.rot(V.norm(V.sub(pos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),simTime,GALAXY_SEED):null,position:pos,viewerPosition:pos,shipPosition:ship.position,hidePlayerShip:camMode===1&&!eva&&!truckOccupied,hidePlayerTruck:camMode===1&&truckOccupied,lightPosition:eva?pos:ship.position,headlampForward:eva?evaForward:forward,shipForward:eva?ship.forward:forward,shipUp:eva?ship.up:up,roverPosition:rover?.position||null,roverForward:rover?.forward||null,roverUp:rover?.up||null,truckPosition:truckWorldState()?.position||null,truckForward:truckWorldState()?.forward||null,truckUp:truckWorldState()?.up||null,extraRovers:window.StarfallLaunchUI?.sceneRovers()||[],satellites:window.StarfallLaunchUI?.sceneSatellites()||[],rockets:window.StarfallLaunchUI?.sceneRockets()||[],avatarBase:eva&&!truckOccupied&&!interiorState?portraitBase:null,avatarUp:rad,avatarForward:evaForward,avatarWalking:!!(rampTransition||roverExitMove||keys.has('KeyW')||keys.has('KeyS')||keys.has('ArrowUp')||keys.has('ArrowDown')),avatarSpeed:keys.has('ShiftLeft')||keys.has('ShiftRight')?1.7:1,avatarDelta:dt,nearest,altitude,headlights,infrastructure:window.StarfallOutpostUI?.scene()||[],ruins:window.StarfallRuinsUI?.scene()||[],ecology:!interiorState?(window.StarfallEcologyUI?.scene()||[]):[],interior:interiorState?(()=>{const site=interiorState.site,body=nearest,worldUp=V.rot(site.local,body.spinAxis||[0,1,0],body.spinAngle||0);return{kind:interiorState.kind||'ruin',siteId:site.id,tier:site.tier,site,position:V.add(body.position,V.mul(worldUp,body.radius+site.height)),up:worldUp,forward:V.rot(V.mul(interiorState.basis.forward,-1),body.spinAxis||[0,1,0],body.spinAngle||0)};})():null});window.StarfallImagingUI7F?.tick?.(dt*timeScale);if(renderer.terrainDebugEnabled&&now-(window.__terrainDebugAt||0)>260){window.__terrainDebugAt=now;const d=renderer.terrainDiagnostics();const tag=$('terrain-debug');if(tag){tag.hidden=false;tag.textContent='TERRAIN / FIXED TILES\n'+JSON.stringify(d,null,2);}}else if(!renderer.terrainDebugEnabled){const tag=$('terrain-debug');if(tag&&!tag.hidden)tag.hidden=true;}
 if(started)perf.recordFrame(now,performance.now()-started,afterUpdate-started,renderer,galaxy,simTime,timeScale);frames++;frameClock+=dt;
  if(frameClock>2.4){fps=frames/frameClock;frames=0;frameClock=0;if(fps<38&&renderer.pixelRatio>.7){renderer.pixelRatio=Math.max(.7,renderer.pixelRatio-.12);renderer.resize();}else if(fps>56&&renderer.pixelRatio<renderer.dprTarget){renderer.pixelRatio=Math.min(renderer.dprTarget,renderer.pixelRatio+.1);renderer.resize();}}
  window.StarfallAssetUI7A1?.tick();if(window.StarfallAssetUI7A1?.hasWorldSelection&&now-lastAssetHighlightAt>160){lastAssetHighlightAt=now;window.StarfallAssetUI7A1.syncHighlight({...camera,fov:renderer.fov},canvas,assetPickCandidates());}refreshHUD(dt);if(now-lastSave>4000){lastSave=now;saveFlight();}
 }catch(e){console.error('Starfall frame failed:',e);$('status-text').textContent='GRAPHICS / FLIGHT ERROR: '+String(e.message).slice(0,85);}requestAnimationFrame(loop);}
addEventListener('resize',()=>renderer.resize());addEventListener('pagehide',saveFlight);
nearest=galaxy.nearestBody(pos).planet||first;let initial=surfaceData(nearest,pos);altitude=initial.distance-nearest.radius-initial.height;
if(landed){if(!shipBody){shipBody=nearest;shipLocal=groundLocal?[...groundLocal]:null;shipForwardVec=[...forward];shipUpVec=[...up];}placeRoverNearShip();
 const tp=saved?.truckPose;if(tp?.bodyId===nearest.id&&Array.isArray(tp.local)&&tp.local.length===3&&tp.local.every(Number.isFinite)){truckLocal=V.norm(tp.local);if(Array.isArray(tp.forward)&&tp.forward.length===3&&tp.forward.every(Number.isFinite))truckForwardVec=V.norm(tp.forward);truckBatteryJ=V.clamp(Number(tp.batteryJ)||0,0,44e6);truckLights=tp.lights!==false;truckCargo=V.clamp(Number(tp.cargo)||0,0,800);truckChargeReadyAtS=Number.isFinite(tp.chargeReadyAtS)?Math.max(0,tp.chargeReadyAtS):0;if(tp.recovery&&Array.isArray(tp.recovery.destination)&&tp.recovery.destination.length===3&&tp.recovery.destination.every(Number.isFinite)&&Number.isFinite(tp.recovery.remainingWorkJ))winch7d=StarfallFieldServiceT12.restore(tp.recovery,nearest.id);}
 const pose=saved?.roverPose;if(pose?.bodyId===nearest.id&&Array.isArray(pose.local)&&pose.local.length===3&&pose.local.every(Number.isFinite)){
  roverLocal=V.norm(pose.local);const f=pose.forward;if(Array.isArray(f)&&f.length===3&&f.every(Number.isFinite)&&V.len(f)>.001)roverForwardVec=V.norm(f);
 }
 exitShip();}
updateBodyUI();setTimeout(()=>$('boot').classList.add('ready'),170);requestAnimationFrame(loop);
// Update 4 surface adapter. Never replaces flight, camera, rendering or boarding controls.
function scienceContext(){const body=nearest,foot=eva&&!truckOccupied;
 const local=foot&&evaLocal?evaLocal:truckOccupied&&truckBody===body&&truckLocal?truckLocal:roverBody===body&&roverLocal?roverLocal:groundLocal;
 return{seed:GALAXY_SEED,body,bodyId:body?.id,simTime,local,mode:foot?'EVA':truckOccupied?'TRUCK':landed?'LANDED':'FLIGHT',altitudeM:foot?.6:truckOccupied?1.0:landed?SHIP_CLEARANCE:Math.max(0,altitude)*P.SCENE_METERS_PER_UNIT,roverLocal:roverBody===body?roverLocal:null,roverOccupied:false,roverExists:roverBody===body&&!!roverLocal,truckOccupied,landed,energy:vehicleStore.get('rover').state.energyJ,roverStats:vehicleStore.get('rover').stats,roverState:vehicleStore.get('rover').state,roverPowerEnabled:vehicleStore.get('rover').state.powerEnabled};}
function acquireFieldReading(instrument,nonce=0,fromRover=false){const data=scienceContext(),info=StarfallFieldScience.INSTRUMENTS[instrument];
 if(!data.body?.landable||!data.landed)throw Error('Land on a solid body before sampling');
 if(!fromRover&&!(eva||truckOccupied))throw Error('Leave the ship to use the instrument');
 if(fromRover&&!data.roverExists)throw Error('Rover must be on this body');
 if(fromRover&&!Vehicles.allowsInstrument(vehicleStore.get('rover').definition,instrument))throw Error('T15 installed rover sensor suite does not carry '+instrument+'; fit a compatible suite at the parked Workbench');
 const st=vehicleStore.get('rover').state;if(fromRover&&st.powerEnabled&&st.loads.instruments===false)throw Error('Rover science power load disabled');
 const point=fromRover?roverLocal:data.local,alt=fromRover?.6:data.altitudeM;
 const result=StarfallFieldScience.sample({body:data.body,seed:GALAXY_SEED,local:point,altitudeM:alt,instrument,simTime,nonce,energyAvailableJ:fromRover&&st.powerEnabled?st.energyJ:Infinity});
 const surfacePoint=point||[0,1,0],biome=BIOMES.classify(data.body,surfacePoint,groundHeight(surfacePoint,data.body),Starfall3D.field(surfacePoint,data.body.seed));
 const rawObservation={...result,...(fromRover?{sourceAssetId:vehicleStore.get('rover').definition.id,probeId:vehicleStore.get('rover').definition.id}:{}),biome:biome.name,biomeModel:'seeded environmental classification; not measured'};
 const detailed=window.StarfallScienceT14?.annotateObservation(rawObservation,{
   spec:window.StarfallScienceT14.sensorSpecs(StarfallFieldScience.INSTRUMENTS)[instrument],
   sourceAssetId:fromRover?vehicleStore.get('rover').definition.id:null,
   calibrated:true,temperatureK:fromRover?st.temperatureK:290,health:fromRover?st.health:1});
 const observation=Object.freeze(detailed||rawObservation);
 if(fromRover&&st.powerEnabled){vehicleStore.update('rover',{...st,energyJ:st.energyJ-result.powerJ});persistVehicles();}
 return observation;
}
function roverAutonomyPosition(){if(!roverLocal||roverBody!==nearest)return null;return{bodyId:roverBody.id,local:[...roverLocal],forward:V.rot(roverForwardVec,roverBody.spinAxis||[0,1,0],-(roverBody.spinAngle||0)),radius:roverBody.radius};}
function roverDestination(forwardDistance,rightDistance){if(!roverLocal||!roverBody)throw Error('No surface rover');return tangentOffsetLocal(roverBody,roverLocal,roverForwardVec,forwardDistance,rightDistance);}
function driveRoverToward(dest,dt){if(!roverLocal||!roverBody||roverBody!==nearest)return Infinity;
 const start=V.norm(roverLocal),next=V.norm(dest),cos=V.clamp(V.dot(start,next),-1,1),distance=Math.acos(cos)*roverBody.radius;
 if(distance<.0001)return 0;
 const worldRad=V.norm(V.rot(start,roverBody.spinAxis||[0,1,0],roverBody.spinAngle||0)),worldGoal=V.norm(V.rot(next,roverBody.spinAxis||[0,1,0],roverBody.spinAngle||0));
 const tangent=V.norm(V.sub(worldGoal,V.mul(worldRad,V.dot(worldGoal,worldRad))));
 const config=vehicleStore.get('rover'),power=config.state.powerEnabled?(engineeringSystemReport.rover?.draws.drive>0):true;
 if(!power)return distance;
 const trial=StarfallRoverDynamics.sixWheels({body:roverBody,local:start,forward:V.rot(tangent,roverBody.spinAxis||[0,1,0],-(roverBody.spinAngle||0)),surfaceHeight:d=>groundHeight(d,roverBody),sceneRadius:roverBody.radius,vehicle:config.stats,gravityMS2:Math.max(.05,roverBody.gravity*9.80665),command:1,dt,enabled:true});
 roverPhysicsReport=trial;if(!trial.safe||trial.speedSceneS<=.001)return distance;
 const weather=window.StarfallMeteorologyLW03?.cell(roverBody,roverLocal,simTime,GALAXY_SEED),
     traction=weather?.precipitationKgM2S>0?Math.max(.45,1-weather.precipitationKgM2S*110):weather?.regime==='dust'?.85:1,
     traveled=Math.min(distance,trial.speedSceneS*traction*Math.max(0,Math.min(dt,.05)));
 roverLocal=V.norm(V.mix(start,next,traveled/Math.max(distance,1e-6)));
 roverForwardVec=tangent;return Math.max(0,distance-traveled);
}
function science4SetPhysics(on){science4Settings.roverPhysics=!!on;SF.save({science4Settings:{...science4Settings}});}
function outpostContext(){const body=nearest;const local=eva&&evaLocal?evaLocal:roverBody===body&&roverLocal?roverLocal:groundLocal;
 return{body,bodyId:body?.id,landed,eva:eva&&!truckOccupied,truckOccupied,local,shipLocal:shipBody===body?shipLocal:null,roverLocal:roverBody===body?roverLocal:null,position:[...pos],up:[...up],forward:[...(eva?evaForward:forward)],time:simTime};}
function truckSystems(){const truck=truckWorldState(),robot=roverWorldState(),body=nearest;
 if(!truck||!body)return{available:false};const dist=robot&&roverBody===body?V.len(V.sub(truck.position,robot.position)):Infinity;
 const at=truckLocal,frontLocal=tangentOffsetLocal(body,at,truck.forward,25,0),elevation=groundHeight(frontLocal,body)-groundHeight(at,body);
 return{available:true,bodyId:body.id,batteryJ:truckBatteryJ,lights:truckLights,cargoKg:truckCargo,scienceRoverDistance:dist,winch:winch7d?{...winch7d}:null,service:StarfallFieldServiceT12.diagnosis({service:localServiceT12,health:vehicleStore.get('rover').state.health}),forwardSlopeDeg:Math.atan2(elevation,25)*180/Math.PI,terrain:StarfallBiomes.classify(body,at,groundHeight(at,body),Starfall3D.field(at,body.seed)).name};}
function truckWinch(){
 if(!landed||!eva||truckOccupied||roverExitMove||rampTransition)throw Error('Exit truck and stand still to attach a winch cable');
 if(winch7d)throw Error('Recovery already connected: CANCEL before restarting');
 if(!evaLocal||StarfallOutposts.arc(evaLocal,truckLocal,truckBody.radius)>18)throw Error('T12 walk back within 18 scene units of parked truck to attach winch');
 const t=truckWorldState(),r=roverWorldState();
 if(!t||!r||truckBody!==roverBody)throw Error('Truck and local science rover must be on the same physical surface');
 const dest=tangentOffsetLocal(truckBody,truckLocal,truckForwardVec,0,13);
 const result=StarfallFieldServiceT12.start({body:truckBody,truckLocal,roverLocal,destination:dest,
  radiusScene:truckBody.radius,height:groundHeight,energyJ:truckBatteryJ,
  unit:P.SCENE_METERS_PER_UNIT,atS:simTime});
 winch7d=result;saveFlight();
 return{active:true,workJ:result.originalWorkJ,distanceAfter:result.initialDistance,cableLengthScene:result.initialCableScene,loadN:result.loadN};
}
function truckWinchCancel(){
 if(!winch7d)return false;winch7d=null;saveFlight();return true;
}
function updateWinch7D(elapsed){
 if(!winch7d)return;
 if(!landed||!eva||truckOccupied||!truckBody||truckBody.id!==winch7d.bodyId||!roverLocal||roverBody!==truckBody){
  winch7d.status='PAUSED';winch7d.reason='Operator/rover not in safe recovered configuration';return;
 }
 const step=StarfallFieldServiceT12.advance({state:winch7d,body:truckBody,truckLocal,roverLocal,
  radiusScene:truckBody.radius,height:groundHeight,truckEnergyJ:truckBatteryJ,dt:Math.min(elapsed,1)});
 truckBatteryJ=step.energyJ;roverLocal=step.roverLocal;winch7d=step.state;
 if(step.done){showToast('T12 · science rover recovered incrementally; work was debited');saveFlight();}
}
function wiredSource(sourceId,vehicleLocal,maxRange){
 const ui=window.StarfallOutpostUI,store=ui?.store,battery=store?.items.find(x=>x.id===sourceId);
 if(!ui||!battery||battery.kind!=='battery'||battery.bodyId!==truckBody?.id||!battery.enabled||battery.condition<=.1)
  throw Error('T12 requires a real enabled local outpost battery');
 if(!ui.powerReports.get(battery.bodyId)?.byId?.[battery.id]?.power)throw Error('T12 battery socket not live on its 48 V bus');
 const group=store.connectedGroups(battery.bodyId).find(g=>g.some(x=>x.id===battery.id))||[];
 if(!group.some(x=>x.kind==='solar'&&x.enabled&&x.condition>.02))throw Error('T12 charging requires an enabled, wired solar and battery group');
 if(StarfallOutposts.arc(battery.local,vehicleLocal,truckBody.radius)>maxRange)throw Error('T12 charging lead does not reach vehicle');
 return{ui,battery};
}
function truckRecharge(sourceId,deliveredJ=360000){
 if(!landed||!eva||truckOccupied||!truckLocal||truckBody!==nearest)throw Error('Park and exit truck on the battery world to connect its port');
 if(!evaLocal||StarfallOutposts.arc(evaLocal,truckLocal,truckBody.radius)>18)throw Error('T12 truck charge requires astronaut at physical socket');
 const{ui,battery}=wiredSource(sourceId,truckLocal,50),T=StarfallFieldServiceT12;
 const receipt=T.transfer({source:battery,sourceBodyId:truckBody.id,targetId:'starfall-truck',
  targetBodyId:truckBody.id,sourceLocal:battery.local,targetLocal:truckLocal,radiusScene:truckBody.radius,
  sourcePowered:true,grid:window.StarfallPowerLedgerT02,installed:true,targetEnergyJ:truckBatteryJ,
  targetCapacityJ:44e6,atS:simTime,readyAtS:truckChargeReadyAtS,
  portTemperatureK:localServiceT12.portTemperatureK,maxScene:50,desiredJ:deliveredJ});
 battery.energyJ=receipt.fromEnergyJ;truckBatteryJ=receipt.toEnergyJ;
 truckChargeReadyAtS=receipt.readyAtS;localServiceT12.portTemperatureK=receipt.portTemperatureK;
 ui.persist();saveFlight();
 const registry=window.StarfallEngineering7AUI?.registry;
 if(registry?.enabled){registry.recordTransfer(battery.id,'starfall-truck',receipt,simTime);window.StarfallEngineering7AUI.refreshRegistry(true);}
 return{...receipt,batteryJ:truckBatteryJ,sourceId};
}
function roverRechargeLocal(sourceId){
 if(!landed||!eva||truckOccupied||truckBody!==nearest||roverBody!==nearest||!roverLocal)throw Error('T12 service: park truck and work beside the local rover');
 if(StarfallOutposts.arc(roverLocal,truckLocal,truckBody.radius)>24)throw Error('T12 service truck must be within 24 scene units of the rover');
 if(!evaLocal||StarfallOutposts.arc(evaLocal,roverLocal,truckBody.radius)>18)throw Error('T12 astronaut must walk within 18 scene units of the local rover charging port');
 const{ui,battery}=wiredSource(sourceId,roverLocal,36),cfg=vehicleStore.get('rover');
 if(!cfg.definition.slots.docking||!cfg.definition.slots.battery)throw Error('T12 rover docking port or battery not installed');
 const receipt=StarfallFieldServiceT12.transfer({source:battery,sourceBodyId:truckBody.id,targetId:'starfall-rover',
  targetBodyId:truckBody.id,sourceLocal:battery.local,targetLocal:roverLocal,radiusScene:truckBody.radius,
  sourcePowered:true,grid:window.StarfallPowerLedgerT02,installed:true,
  targetEnergyJ:cfg.state.energyJ,targetCapacityJ:cfg.stats.batteryCapacityJ,atS:simTime,
  readyAtS:localRoverChargeReadyAtS,portTemperatureK:localRoverPortTemperatureK});
 battery.energyJ=receipt.fromEnergyJ;vehicleStore.update('rover',{...cfg.state,energyJ:receipt.toEnergyJ});
 localRoverChargeReadyAtS=receipt.readyAtS;localRoverPortTemperatureK=receipt.portTemperatureK;
 ui.persist();saveFlight();return receipt;
}
function fieldServiceStatus(remote=null){
 const body=nearest,local=remote?.local||roverLocal;
 const nearby=!!(landed&&eva&&!truckOccupied&&truckBody===body&&local&&(!remote||remote.bodyId===body.id)&&StarfallOutposts.arc(truckLocal,local,body.radius)<=18&&evaLocal&&StarfallOutposts.arc(evaLocal,local,body.radius)<=18);
 const s=remote?StarfallFieldServiceT12.createService(remote.fieldT12):localServiceT12;
 const health=remote?remote.roverT06?.health:vehicleStore.get('rover').state.health;
 return{nearby,bodyId:body?.id,parts:StarfallFieldServiceT12.diagnosis({service:s,rover:remote,health}),
  batteryJ:truckBatteryJ,records:s.records.slice(-10)};
}
function fieldRepair(slot,remote=null){
 const ctx=fieldServiceStatus(remote);
 if(!ctx.nearby||roverExitMove||rampTransition||winch7d)throw Error('T12 parked truck / EVA within 18 scene units of this rover required; detach winch');
 if(remote&&['entry','descent','running'].includes(remote.status))throw Error('T12 cannot service a moving or undeployed robot');
 const vehicle=vehicleStore.get('rover'),def=remote?Vehicles.presets.rover:vehicle.definition; // deployed capsule uses its fixed factory rover preset, not local Workbench upgrades
 const state=remote?remote.fieldT12:localServiceT12;
 const receipt=StarfallFieldServiceT12.maintain({service:state,slot,atS:simTime,truckEnergyJ,
  installedId:def.slots[slot],rover:remote,health:remote?remote.roverT06?.health:vehicle.state.health});
 truckBatteryJ=receipt.batteryJ;
 if(!remote){localServiceT12=receipt.service;if(vehicle.state.health<1)vehicleStore.update('rover',{...vehicle.state,health:Math.min(1,vehicle.state.health+.15)});}
 saveFlight();if(remote)window.StarfallLaunchUI?.persist();
 return receipt;
}
/* T13 uses flight-owned latch and receipts; neither vehicle nor journal charge is mirrored. */
function shipServiceTargetT13(id){
 const body=nearest,poses=shipBody===body&&landed;
 if(!poses)throw Error('T13 ship must be landed on destination world');
 const localId=vehicleStore.get('rover').definition.id;
 if(id===localId||id==='local-rover'){
  if(roverBody!==body||!roverLocal)throw Error('T13 local rover not deployed on this world');
  const v=vehicleStore.get('rover');
  return{id:localId,kind:'local-rover',bodyId:body.id,local:roverLocal,
    installed:!!v.definition.slots.docking&&StarfallVehicles.components[v.definition.slots.docking]?.type==='docking',
    busy:!!window.StarfallScienceUI?.autoDriving,vehicle:v};
 }
 const remote=window.StarfallLaunchUI?.store?.rovers?.find(x=>x.id===id);
 if(remote){
  return{id:remote.id,kind:'deployed-rover',bodyId:remote.bodyId,local:remote.local,installed:true,
   busy:['entry','descent','running','fault'].includes(remote.status)||['ENTRY','DESCENT','TRAVERSING','SCIENCE','FAULT'].includes(remote.roverT06?.state),
   rover:remote};
 }
 const os=window.StarfallOutpostUI?.store,battery=os?.items.find(x=>x.id===id&&x.kind==='battery');
 if(battery){
  const reports=window.StarfallOutpostUI?.powerReports?.get(battery.bodyId),group=os.connectedGroups(battery.bodyId).find(g=>g.some(x=>x.id===id))||[];
  return{id:battery.id,kind:'grid-battery',bodyId:battery.bodyId,local:battery.local,
   powered:reports?.byId?.[id]?.power===true&&battery.enabled!==false&&battery.condition>.1,
   connectedSolar:group.some(x=>x.kind==='solar'&&x.enabled!==false&&x.condition>.02),battery};
 }
 throw Error('T13 specified docking target is not a registered local rover / 48V socket');
}
function shipServiceTargetsT13(){
 if(!landed||!shipBody||!shipLocal)return[];
 const list=[],ship=vehicleStore.get('ship');
 if(roverBody===shipBody&&roverLocal){
  const r=shipServiceTargetT13(vehicleStore.get('rover').definition.id);
  list.push({id:r.id,kind:r.kind,distanceScene:StarfallShipT13.bodyDistance(shipLocal,r.local,shipBody.radius)});
 }
 for(const r of window.StarfallLaunchUI?.store?.rovers||[])if(r.bodyId===shipBody.id&&['parked','complete','safe-stop'].includes(r.status))
  list.push({id:r.id,kind:'deployed-rover',distanceScene:StarfallShipT13.bodyDistance(shipLocal,r.local,shipBody.radius)});
 for(const b of window.StarfallOutpostUI?.store?.items||[])if(b.bodyId===shipBody.id&&b.kind==='battery')
  list.push({id:b.id,kind:'grid-battery',distanceScene:StarfallShipT13.bodyDistance(shipLocal,b.local,shipBody.radius)});
 return list.filter(x=>x.distanceScene<=60).slice(0,50);
}
function shipServiceSnapshotT13(){
 const ship=vehicleStore.get('ship');
 return StarfallShipT13.diagnostic({ship,report:engineeringSystemReport.ship,state:shipDockT13,
  landed:landed&&!!shipLocal,bodyId:shipBody?.id,scienceCount:window.StarfallScienceUI?.journal?.length||0});
}
function shipDockConnectT13(targetId){
 if(!landed||!shipBody||!shipLocal)throw Error('T13 land before connecting a service umbilical');
 const ship=vehicleStore.get('ship'),target=shipServiceTargetT13(targetId);
 const manualShore=target.kind==='grid-battery'&&eva&&!!evaLocal&&
  StarfallShipT13.bodyDistance(evaLocal,shipLocal,shipBody.radius)<=18&&
  StarfallShipT13.bodyDistance(evaLocal,target.local,shipBody.radius)<=18&&
  target.battery?.energyJ>=2000;
 if(!manualShore&&!StarfallShipT13.radio({ship,report:engineeringSystemReport.ship}).ready)
  throw Error('T13 ship avionics bus not powered; manually attach a live shore cable on EVA or enable internal bus');
 if(!manualShore&&ship.state.energyJ<StarfallShipT13.SHIP_RESERVE_J+1200)
  throw Error('T13 ship docking actuator battery reserve unavailable');
 shipDockT13=StarfallShipT13.latch({state:shipDockT13,ship,landed,shipLocal,
  body:shipBody,relativeSpeedMS:0,target,timeS:simTime});
 if(manualShore){
  target.battery.energyJ-=1200;
  window.StarfallOutpostUI.persist();
 }else vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-1200});
 saveFlight();return shipServiceSnapshotT13();
}
function shipDockUndockT13(){
 shipDockT13=StarfallShipT13.undock({state:shipDockT13,timeS:simTime});
 saveFlight();return shipServiceSnapshotT13();
}
function shipDockChargeT13(){
 if(!landed||!shipBody||!shipLocal)throw Error('T13 no landed ship available');
 const ship=vehicleStore.get('ship'),t=shipServiceTargetT13(shipDockT13.targetId);
 const rover=t.kind==='local-rover'?{id:t.id,energyJ:t.vehicle.state.energyJ,capacityJ:t.vehicle.stats.batteryCapacityJ}:
  t.kind==='deployed-rover'?{id:t.id,energyJ:t.rover.batteryJ,capacityJ:22e6}:null;
 const q=StarfallShipT13.cycle({state:shipDockT13,ship,shipLocal,body:shipBody,target:t,
  timeS:simTime,report:engineeringSystemReport.ship,rover,source:t.battery||null});
 if(t.kind==='grid-battery'){
  t.battery.energyJ=q.transfer.fromEnergyJ;
  vehicleStore.update('ship',{...ship.state,energyJ:q.transfer.toEnergyJ});
  window.StarfallOutpostUI.persist();
 }else{
  vehicleStore.update('ship',{...ship.state,energyJ:q.transfer.fromEnergyJ});
  if(t.kind==='local-rover')vehicleStore.update('rover',{...t.vehicle.state,energyJ:q.transfer.toEnergyJ});
  else{t.rover.batteryJ=q.transfer.toEnergyJ;window.StarfallLaunchUI.persist();}
 }
 shipDockT13=q.state;saveFlight();return q.transfer;
}
function shipThermalObserveT13(){
 const ship=vehicleStore.get('ship'),st=ship.state,spec=StarfallFieldScience.INSTRUMENTS.thermometer;
 const r=StarfallShipT13.radio({ship,report:engineeringSystemReport.ship});
 if(!r.ready||!st.powerEnabled||st.loads.instruments===false||
  !ship.definition.slots.instruments||StarfallVehicles.components[ship.definition.slots.instruments]?.type!=='instrument')
  throw Error('T13 power up installed ship avionics and instruments before sampling');
 if(engineeringSystemReport.ship?.draws?.instruments<ship.stats.instrumentsW)
  throw Error('T13 instrument bus is shed by power deficit');
 const requiredJ=spec.powerW*spec.seconds;
 if(st.energyJ<StarfallShipT13.SHIP_RESERVE_J+requiredJ)
  throw Error('T13 ship battery below safe sensor acquisition reserve');
 const observation={
  id:'obs-ship-hull-'+GALAXY_SEED+'-'+Math.round(simTime*1000)+'-'+shipDockT13.observationSerial,
  kind:'measurement',sourceAssetId:'starfall-ship',bodyId:nearest?.id||'interstellar',
  instrument:'thermometer',parameter:'hullTemperatureK',value:Math.round(st.temperatureK*2)/2,
  unit:'K',uncertainty:.5,resolution:.5,timeS:simTime,receivedAtS:simTime,
  location:landed&&shipLocal?[...shipLocal]:nearest?V.norm(V.rot(V.norm(V.sub(pos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0))):[0,1,0],
  powerJ:requiredJ,model:'modeled hull thermal state; instrument does NOT measure planetary surface temperature',quality:'modeled',calibrated:true};
 if(!window.StarfallScienceUI?.ingestShip?.(observation))
  throw Error('T13 science ledger rejected duplicate or malformed ship instrument measurement');
 shipDockT13.observationSerial++;
 vehicleStore.update('ship',{...st,energyJ:st.energyJ-requiredJ});
 saveFlight();return observation;
}
function shipDockReceiveT13(observationId){
 if(!landed||!shipBody||!shipLocal)throw Error('T13 only actual same-world landed ship may receive dock data');
 const ship=vehicleStore.get('ship'),t=shipServiceTargetT13(shipDockT13.targetId);
 const obs=t.kind==='deployed-rover'?t.rover?.records?.find(x=>x.id===observationId):
  (window.StarfallScienceUI?.journal||[]).find(x=>x.id===observationId);
 if(!obs)throw Error('T13 observation not physically stored onboard selected rover');
 const report=StarfallShipT13.receiveRecord({state:shipDockT13,ship,shipLocal,body:shipBody,target:t,
  observation:obs,atS:simTime,report:engineeringSystemReport.ship,fromJournal:t.kind==='local-rover'});
 if(report.duplicate)return report;
 // Local rover observations already live in Science Journal. Remote, physically
 // plugged-in rover can deliver to Journal once, without inventing a radio ACK.
 if(t.kind==='deployed-rover'){
  const ok=window.StarfallScienceUI?.ingestRover?.({...obs,receivedAtS:simTime});
  if(!ok&&!(window.StarfallScienceUI?.journal||[]).some(x=>x.id===obs.id))
   throw Error('T13 science journal refused receipt; preserve original rover data');
 }
 shipDockT13=report.state;vehicleStore.update('ship',{...ship.state,energyJ:report.energyJ});
 saveFlight();return report;
}
function outpostOffset(front,right){const d=outpostContext();if(!d.body||!d.local||!d.landed)throw Error('Surface placement unavailable');return tangentOffsetLocal(d.body,d.local,d.forward,front,right);}
window.StarfallRuntime={galaxy,vehicleStore,captureScienceImage({body,eye,forward,up,size=512,caption='',wide=false}){
 if(!body||!Array.isArray(eye)||!Array.isArray(forward)||!Array.isArray(up))throw Error('Imaging requires a valid loaded camera position');
 return renderer.captureScience({eye,forward,up},body,{size,caption,wide});},assetPickView(){return{camera:lastPickingCamera?{...lastPickingCamera,fov:renderer.fov}:null,candidates:assetPickCandidates()};},engineeringAssetPoses(){return{
 shipPose:shipBody&&shipLocal?{bodyId:shipBody.id,systemId:shipBody.systemId,local:shipLocal}:null,
 roverPose:roverBody&&roverLocal?{bodyId:roverBody.id,systemId:roverBody.systemId,local:roverLocal}:null,
 truckPose:truckBody&&truckLocal?{bodyId:truckBody.id,local:truckLocal,batteryJ:truckBatteryJ}:null
};},enterInterior,enterCave,leaveInterior,get interiorState(){return interiorState?{...interiorState,at:{...interiorState.at}}:null;},outpostContext,outpostOffset,engineeringSystemReport:()=>engineeringSystemReport,renderStats:()=>({debrisNearby:renderer.debrisRendered||0,debrisRisk:latestDebrisWarning,pixelRatio:renderer.pixelRatio,patchRebuilds:renderer.patchDraws,terrain:renderer.terrainDiagnostics(),meshCache:renderer.meshCache.size,ringCache:renderer.ringCache.size,infrastructureMeshes:renderer.infrastructure.size,renderedBodies:renderer.renderedBodies,culledBodies:renderer.culledBodies,visibleStars:renderer.starPoints,drawCalls:renderer.lastDrawCalls??null,galaxyCacheLoaded:galaxy.skyCatalog.filter(s=>!s.dormant).length}),configureVehicle,safeToReconfigure,equipmentSnapshotT15,restoreVehicleT15,persistVehicles,plotSurfaceWaypoint(bodyId,direction,name='Geothermal source'){
 const body=galaxy.byId.get(bodyId);
 if(!body?.landable||!Array.isArray(direction)||direction.length!==3||!direction.every(Number.isFinite))throw Error('Invalid geological surface waypoint');
 const directionUnit=V.norm(direction);if(V.len(directionUnit)<.99)throw Error('Invalid waypoint direction');
 siteWaypoint={planet:body,name:String(name).slice(0,80),dir:directionUnit};target=body;
 updateSurveyUI();showToast('Waypoint plotted: '+siteWaypoint.name+' — approach manually.');
 return{bodyId,direction:directionUnit};
},get target(){return target;},get nearest(){return nearest;},get time(){return simTime;},get engineering(){return engEnabled;},get attitude(){return engAttitude;},setAttitude(v){engAttitude=['Manual','Hold','Prograde','Retrograde'].includes(v)?v:'Manual';SF.save({scienceSettings:{schema:1,flightMode:engEnabled?'Engineering':'Assisted',sas:engAttitude}});},setFlightPhysicsMode,engineeringInfo,get ship(){return engState;},get scenePosition(){return pos;},get landed(){return landed;},get eva(){return eva;},get swimming(){return swimming;},get swimDepthM(){return swimming?swimDepthScene*1000:0;},get truckOccupied(){return truckOccupied;},scienceContext,acquireFieldReading,roverAutonomyPosition,roverDestination,driveRoverToward,science4SetPhysics,get science4Settings(){return{...science4Settings};},get roverPhysicsReport(){return roverPhysicsReport;},truckSystems,truckWinch,truckWinchCancel,truckRecharge,roverRechargeLocal,fieldServiceStatus,fieldRepair,shipServiceSnapshotT13,shipServiceTargetsT13,shipDockConnectT13,shipDockUndockT13,shipDockChargeT13,shipDockReceiveT13,shipThermalObserveT13,get truck(){return{occupied:truckOccupied,local:truckLocal,bodyId:truckBody?.id,batteryJ:truckBatteryJ,lights:truckLights,cargo:truckCargo};}};
Object.defineProperty(window,'STARFALL_DEBUG',{value:{galaxy,get state(){return{interior:interiorState?{siteId:interiorState.site.id,at:{...interiorState.at}}:null,position:[...pos],altitude,landed,eva,truckOccupied,roverOccupied:false,hatchCooldown,roverEntryCooldown,portraitLoaded:!!renderer.avatarParts?.body,avatarLoaded:!!renderer.avatarParts?.body,avatarDrawCalls:renderer.avatarDrawCalls,avatarAnimation:renderer.avatarAnimation,rampState:rampTransition?.kind||null,shipAhead:shipBody?V.dot(V.sub(pos,shipWorldState().position),shipWorldState().forward):null,shipSide:shipBody?V.dot(V.sub(pos,shipWorldState().position),V.norm(V.cross(shipWorldState().forward,shipWorldState().up))):null,walkedSinceExit,roverRange:roverBody&&roverWorldState()?V.len(V.sub(pos,roverWorldState().position)):null,warp,target:target.id,body:nearest.id,mode:nearPhase,fps,systems:galaxy.systems.length,worlds:galaxy.allWorlds.length,renderedBodies:renderer.renderedBodies,culledBodies:renderer.culledBodies,visibleStars:renderer.starPoints,catalogStars:galaxy.skyCatalog.length,loadedCatalogSystems:galaxy.skyCatalog.filter(s=>!s.dormant).length,effectPoints:renderer.effectsRendered,heat,spinAngle:nearest.spinAngle,cameraZoom:camDistance,cameraOrbit:[orbitYaw,orbitPitch],cameraLookElevationDeg:lastPickingCamera&&nearest?Math.asin(V.clamp(V.dot(lastPickingCamera.forward,V.norm(V.sub(pos,nearest.position))),-1,1))*180/Math.PI:null,timeScale,headlights,groundLocal:groundLocal&&[...groundLocal],cameraClearance:nearest?.landable?surfaceData(nearest,camEye||pos).distance-nearest.radius-surfaceData(nearest,camEye||pos).height:null,daylight:renderer.daylightLabel,sunElevation:nearest&&galaxy.byId.get(nearest.systemId)?V.dot(V.norm(V.sub(pos,nearest.position)),V.norm(V.sub(galaxy.byId.get(nearest.systemId).position,nearest.position))):null,patchRebuilds:renderer.patchDraws,terrain:renderer.terrainDiagnostics()};},placeEvaNearTruck(){if(!landed||!eva||!truckBody||!truckLocal||truckBody!==nearest)throw Error('Require EVA and a surface truck');
 const local=tangentOffsetLocal(truckBody,truckLocal,truckForwardVec,0,-11),radial=V.rot(local,truckBody.spinAxis||[0,1,0],truckBody.spinAngle||0);
 evaLocal=local;pos=V.add(truckBody.position,V.mul(radial,truckBody.radius+groundHeight(local,truckBody)+EVA_HEIGHT));up=radial;evaForward=[...truckForwardVec];roverEntryCooldown=0;roverExitMove=null;rampTransition=null;camEye=null;},resetToOrbit(){pos=V.add(target.position,[0,300,-(target.radius+3550)]);vel=[0,0,0];forward=V.norm(V.sub(target.position,pos));up=[0,1,0];landed=false;groundLocal=null;camEye=null;},setTarget(id){const body=galaxy.byId.get(id);if(!body||!body.radius||!body.kind)throw Error('Unknown celestial target');target=body;},setPosition(next){if(!Array.isArray(next)||next.length!==3||!next.every(Number.isFinite))throw Error('Invalid position');pos=[...next];landed=false;groundLocal=null;camEye=null;},align(){pointTowardWaypoint();},setInteriorPosition(x,z){if(!interiorState||!(interiorState.kind==='cave'?window.StarfallGeologyLW02.canStand:StarfallInteriors.canStand)(interiorState.layout,x,z))throw Error('Not a valid interior floor coordinate');interiorState.at={x,z};const q=interiorWorld(interiorState.at);evaLocal=q.local;pos=q.position;up=q.up;camEye=null;},setCameraZoom(n){camDistance=V.clamp(Number(n),25,400);},setSimulationTime(t){if(!Number.isFinite(t)||t<0||t>=1e13)throw Error('Invalid simulation time');simTime=physicsClock.set(t);galaxy.update(simTime);},setTimeScale(t){if(![1,10,100].includes(t))throw Error('Expected 1,10,100');timeScale=t;},setHeadlights(on){headlights=!!on;}}});
})();
