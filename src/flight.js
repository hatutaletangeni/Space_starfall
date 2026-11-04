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
let landed=false,warp=false,camMode=0,camEye=null,camDistance=145,orbitYaw=0,orbitPitch=0,heat=0,solarWarning=false,timeScale=1,altitude=3500,vertical=0,fps=60,lastPlanetId='',nearPhase='DEEP SPACE',hudClock=0,frames=0,frameClock=0,lastTime=performance.now(),lastSave=0,toastTimer=0,landingTimer=0;
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
let physical8a=StarfallPhysical8A.create(session.physical8a,{truckPose:saved?.truckPose,roverPose:saved?.roverPose});
const START_TRUCK='truck-expedition-001',START_ROVER='rover-science-001';
const BAY8B=StarfallCargo8B;
const originalTruckCargo8B=StarfallTruckCustody8B.restore(saved?.shipCargo8b,physical8a.get(START_TRUCK),saved?.attached||null);
let cargo8b=originalTruckCargo8B.cargo;
if(originalTruckCargo8B.issue)console.warn('8B physical truck custody restored safely:',originalTruckCargo8B.issue);
let materials8a=StarfallMining8D.prepareContainers(StarfallMaterials8A.create(session.materials8a));
let vehicleAssembly8g=StarfallVehicleAssemblyContract8G.create(session.vehicleAssembly8g);
let manufacturedOccupied8G=null;
let resources8c=StarfallResources8C.create(session.resources8c);
let atmosphere8g=StarfallAirFractionation8G.create(session.atmosphere8g);
const mining8d=StarfallMining8D.create(session.mining8d,StarfallMaterials8A,StarfallResources8C);
let transformation8e=StarfallTransformation8E.create(session.transformations8e);
const refinery8e=StarfallRefinery8E.create(session.refinery8e);
let industrialPlant8e=StarfallIndustrialPlant8E.create(session.industrialPlant8e);
const industrialJob8e=(()=>{
 const v=session.industrialJob8e;
 if(v==null)return {schema:1,serial:0,active:null};
 if(v.schema!==1||!Number.isSafeInteger(v.serial)||v.serial<0||
  (v.active&&(!v.active.id||!v.active.reactionId||!Number.isFinite(v.active.elapsedS)||!Number.isFinite(v.active.energyJ))))
  throw Error('Corrupt surface industrial job — restore original save');
 return JSON.parse(JSON.stringify(v));
})();
let industrialSaveSeconds8E=0;
const factory8f=StarfallFactory8F.create(session.factory8f);
let factorySaveSeconds8F=0;
let refinerySaveSeconds8E=0;
const modularShip8e=StarfallModularShip8E.restore(session.modularShip8e);
let lifeSupport8e=StarfallLifeSupport8E.restore(session.lifeSupport8e);
let shipWalking8e=false,shipWalkAt8e=StarfallShipWalk8E.restore(saved?.shipWalk8e);
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
function shipCargoMass8A(){return physical8a.list().filter(a=>a.type!=='ship'&&a.location.kind==='ship'&&a.location.parentId==='ship-main').reduce((sum,a)=>sum+a.massKg+
 (a.type==='industrial_vessel'&&a.state?.containerId?
  materials8a.used(a.state.containerId).massKg:0),0);}
function shipConfiguredState(){const x=vehicleStore.get('ship'),s=x.stats;return FP.shipState({dryMassKg:s.dryMassKg+shipCargoMass8A()+materials8a.used(StarfallMining8D.SHIP).massKg+(physical8a.get(START_TRUCK)?.location.kind==='ship'?materials8a.used(StarfallMining8D.TRUCK).massKg:0),fuelKg:x.state.fuelKg,thrustN:s.thrustN,ispS:s.ispS,radiatorAreaM2:s.radiatorAreaM2,emissivity:s.emissivity,temperatureK:x.state.temperatureK});}
function updateVehicleSystems(dt){
 const elapsed=dt*timeScale;
 if(!(elapsed>0))return;
 const sys=galaxy.byId.get((nearest||target).systemId),star=sys?.star;
 for(const kind of ['ship','rover']){
  const v=vehicleStore.get(kind),st=v.state,stats=v.stats;
  if(!st.powerEnabled){
    if(kind==='ship')lifeSupport8e=StarfallLifeSupport8E.step(lifeSupport8e,elapsed,
     {powered:true,level:modularShip8e.describe('life').level});
    engineeringSystemReport[kind]=null;continue;
   }
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
  const result=Power.step(stats,st,elapsed,light,{engineActive:shipThrust,driveW:driven?stats.drivePowerW:0,lightsW:headlights?(kind==='ship'?1200:180):0,protectionW:mitigationW,lifeSupportW:kind==='ship'?StarfallLifeSupport8E.demandW(modularShip8e.describe('life').level):0,heatW:shipThrust?stats.engineHeatW:driven?stats.drivePowerW*.13:0});
  vehicleStore.update(kind,result.state);engineeringSystemReport[kind]=result;
   if(kind==='ship')lifeSupport8e=StarfallLifeSupport8E.step(lifeSupport8e,elapsed,
    {powered:result.draws.lifeSupport>=StarfallLifeSupport8E.demandW(modularShip8e.describe('life').level)-1e-8,
     level:modularShip8e.describe('life').level});
 }
 engineeringSystemSeconds+=elapsed;
 miningAdvance8D(dt);
 refineryAdvance8E(elapsed);
 industrialAdvance8E(elapsed);
 factoryAdvance8F(elapsed);
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
function shipWalkWorld8E(y=-1.0){
 const ship=shipWorldState(),right=V.norm(V.cross(ship.forward,ship.up));
 return V.add(ship.position,V.add(V.mul(right,shipWalkAt8e.x),
  V.add(V.mul(ship.up,y),V.mul(ship.forward,-shipWalkAt8e.z))));
}
function shipWalkHeading8E(){
 const ship=shipWorldState(),r=V.norm(V.cross(ship.forward,ship.up)),theta=shipWalkAt8e.heading;
 return V.norm(V.add(V.mul(ship.forward,Math.cos(theta)),V.mul(r,-Math.sin(theta))));
}
function interactShip8E(){
 const room=StarfallShipWalk8E.room(shipWalkAt8e.x,shipWalkAt8e.z);
 if(room==='bridge'){
  shipWalking8e=false;camMode=1;camEye=null;
  showToast('BRIDGE · pilot controls engaged · I to walk interior · SPACE launch');
  saveFlight();return true;
 }
 const target=room==='science'?'field-open':room==='fabrication'?'workbench-open':
  room==='cargo'?'physical8a-dialog':room==='power'?'systems-toggle':
  room==='life'?'systems-toggle':room==='habitat'?'discovery-open':null;
 if(room==='cargo'){window.StarfallInventoryUI8A?.open?.();return true;}
 if(target){document.getElementById(target)?.click();showToast('8E · '+room.toUpperCase()+' TERMINAL · existing system');return true;}
 showToast('8E · Walk through connected rooms, return to bridge and X to pilot');return true;
}
function shipCargoWorld8B(){
 const ship=shipWorldState(),right=V.norm(V.cross(ship.forward,ship.up)),p=cargo8b.pose;
 return {body:ship.body,position:V.add(ship.position,V.add(V.mul(right,p.x),V.add(V.mul(ship.up,p.y),V.mul(ship.forward,-p.z)))),forward:ship.forward,up:ship.up};
}
function cargoRelative8B(world){
 const ship=shipWorldState(),rel=V.sub(world,ship.position);
 return {x:V.dot(rel,V.norm(V.cross(ship.forward,ship.up))),z:-V.dot(rel,ship.forward),y:V.dot(rel,ship.up)};
}
function cargoSurfaceLocal8B(world){
 const body=shipBody||nearest,rad=V.norm(V.sub(world,body.position));
 return V.rot(rad,body.spinAxis||[0,1,0],-(body.spinAngle||0));
}
function cargoRampReady8B(){
 if(!landed||!shipBody||shipBody!==nearest)return false;
 const prior=cargo8b.pose;
 cargo8b.pose={x:BAY8B.BAY.centerX,z:BAY8B.BAY.rampEndZ,y:BAY8B.height(BAY8B.BAY.rampEndZ)};
 const tip=shipCargoWorld8B().position;cargo8b.pose=prior;
 const local=cargoSurfaceLocal8B(tip);
 return Math.abs(V.len(V.sub(tip,nearest.position))-nearest.radius-groundHeight(local,nearest))<3.25;
}
function cargoInteract8B(){
 if(!landed||!eva||truckOccupied||!shipBody||shipBody!==nearest||rampTransition)return false;
 const ship=shipWorldState(),access=V.add(ship.position,V.add(V.mul(V.norm(V.cross(ship.forward,ship.up)),BAY8B.BAY.centerX),V.mul(ship.forward,-27)));
 if(V.len(V.sub(pos,access))>35)return false;
 if(!cargoRampReady8B()){showToast('8B · CARGO RAMP TERRAIN BLOCKED — reland on flatter ground');return true;}
 const a=physical8a.get(START_TRUCK);
 const reconciled=StarfallTruckCustody8B.restore(cargo8b,a,shipBody?.id||null);
 if(reconciled.issue==='MISSING'||reconciled.issue==='UNSUPPORTED'){
  showToast('8B · '+StarfallTruckCustody8B.description(a,cargo8b,shipBody?.id||null));return true;
 }
 if(reconciled.issue){
  cargo8b=reconciled.cargo;
  showToast('8B · '+StarfallTruckCustody8B.description(a,cargo8b,shipBody?.id||null));
  saveFlight();return true;
 }
 if(a.location.kind==='surface'&&a.location.bodyId!==shipBody.id){
  showToast('8B · '+StarfallTruckCustody8B.description(a,cargo8b,shipBody.id));return true;
 }
 if(cargo8b.mode==='secured'&&a?.location.kind==='ship'){
  cargo8b.mode='ramp';cargo8b.pose={x:BAY8B.BAY.centerX,z:11.2,y:BAY8B.height(11.2)};cargo8b.counter++;
  truckBody=shipBody;truckLocal=cargoSurfaceLocal8B(shipCargoWorld8B().position);truckForwardVec=[...shipForwardVec];
  physical8a.move(START_TRUCK,{kind:'surface',bodyId:shipBody.id,local:truckLocal},'8b-release:'+cargo8b.counter,{expected:a.location});
  showToast('8B · TRUCK IS INSIDE STARBOARD BAY AT RAMP MOUTH. It may be hidden by hull: stand at WIDE RIGHT-HAND ramp access, press X to enter, then hold S to reverse it into view.');saveFlight();return true;
 }
 if(cargo8b.mode==='ramp'&&cargo8b.pose.z<=11.6&&a?.location.kind==='surface'){
  if(!BAY8B.fit(a).ok){showToast('8B · TRUCK EXCEEDS CARGO BAY CAPACITY');return true;}
  cargo8b.counter++;
  physical8a.move(START_TRUCK,{kind:'ship',slot:'starboard-hangar'},'8b-lock:'+cargo8b.counter,
   {expected:a.location,maxMassKg:BAY8B.BAY.maxCargoMassKg,maxVolumeM3:BAY8B.BAY.maxCargoVolumeM3});
  cargo8b.mode='secured';cargo8b.pose={x:BAY8B.BAY.centerX,z:5.7,y:BAY8B.BAY.floorY};
  truckBody=null;truckLocal=null;roverExitMove=null;
  showToast('8B · TRUCK SECURED · tie-downs locked · flight mass updated');saveFlight();return true;
 }
 const truckState=truckWorldState();
 const rel=truckState?.position?cargoRelative8B(truckState.position):null;
 const heading=truckState?.forward?-V.dot(truckState.forward,ship.forward):NaN;
 const cargoPos=cargo8b.mode==='ramp'?cargo8b.pose:rel;
 showToast('8B · '+BAY8B.loadingAdvice(cargo8b.mode,cargoPos,heading));return true;
}
function truckWorldState(){
 if((cargo8b.mode==='secured'&&physical8a.get(START_TRUCK)?.location.kind==='ship')||cargo8b.mode==='ramp')return shipCargoWorld8B();
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
 const deploy=(id,front,right)=>{const a=physical8a.get(id);if(!a)return null;
  if(a.location.kind==='ship'){const local=tangentOffsetLocal(shipBody,shipLocal,shipForwardVec,front,right);
   physical8a.move(id,{kind:'surface',bodyId:shipBody.id,local},'initial-deploy:'+id,{expected:a.location});return local;}
  return a.location.kind==='surface'&&a.location.bodyId===shipBody.id?a.location.local:null;};
 const r=deploy(START_ROVER,-9.5,10.5);
 const t=physical8a.get(START_TRUCK)?.location;
 const surface=t?.kind==='surface'&&t.bodyId===shipBody.id?t.local:null;
 roverBody=r?shipBody:null;roverLocal=r?[...r]:null;
 if(r){const rf=physical8a.get(START_ROVER)?.state?.forward;roverForwardVec=Array.isArray(rf)&&rf.length===3?V.norm(rf):V.norm(shipForwardVec||forward);}
 truckBody=surface?shipBody:null;truckLocal=surface?[...surface]:null;
 if(surface){const st=physical8a.get(START_TRUCK)?.state;
  truckForwardVec=Array.isArray(st?.forward)&&st.forward.length===3?V.norm(st.forward):[...shipForwardVec];
  if(Number.isFinite(st?.batteryJ))truckBatteryJ=V.clamp(st.batteryJ,0,44e6);}
}
function exitShip(){
 if(!landed||eva||!nearest?.landable)return;
 shipWalking8e=false;
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
 hatchCooldown=1.0;walkedSinceExit=0;shipIdleElapsed=0;
 shipWalking8e=true;shipWalkAt8e={x:0,z:25,heading:0};
 camMode=0;showToast('8E · Inside expedition vessel · WASD walk through ship · X near bridge to pilot · S to exit aft');
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
 for(const sys of ranked){if(term&&!sys.name.toLowerCase().includes(term)&&!sys.star.type.toLowerCase().includes(term)&&!(sys.phenomenon||'').includes(term)&&!sys.planets.some(p=>p.id.toLowerCase().includes(term)||p.name.toLowerCase().includes(term)||p.type.toLowerCase().includes(term)))continue;
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
function truckDestination8B(){
 return StarfallTruckNavigation8B.locate(physical8a.get(START_TRUCK),galaxy,GALAXY_SEED,saved?.seed);
}
function plotTruckDestination8B(){
 const destination=truckDestination8B();
 if(destination.status!=='SURFACE'){
  showToast('TRUCK NAV · '+destination.message);
  return destination;
 }
 // Activate dormant star systems through existing navigation, never teleport.
 const {world,system}=destination;
 if(system.dormant)galaxy.activate(system);
 galaxy.pinnedSystemId=system.id;
 expandedSystemId=system.id;
 target=world;
 siteWaypoint=null;
 const search=$('chart-search');if(search)search.value=system.name;
 drawChart();closeChart();
 showToast('TRUCK ROUTE · '+world.name+' in '+system.name+' plotted. Align with G, fly normally. The original vehicle stays on its saved planet.');
 return destination;
}
const truckLocateControl8B=document.createElement('button');
truckLocateControl8B.type='button';
truckLocateControl8B.id='truck-plot-course8b';
truckLocateControl8B.className='destination';
truckLocateControl8B.textContent='⌖ LOCATE MY ORIGINAL TRUCK';
truckLocateControl8B.title='Find the actual saved truck in the active seeded galaxy and plot course (no teleportation)';
truckLocateControl8B.onclick=plotTruckDestination8B;
$('chart-search')?.parentElement?.appendChild(truckLocateControl8B);
function openChart(){drawChart();$('chart').hidden=false;controls.clear();$('chart-search')?.focus();}
function closeChart(){if($('chart').contains(document.activeElement))document.activeElement.blur();$('chart').hidden=true;}
$('new-galaxy').onclick=()=>{const seed=((Date.now()^Math.floor(Math.random()*2**32))>>>0);const url=new URL(location.href);url.searchParams.set('seed',String(seed));location.href=url.href;};
$('chart-open').onclick=openChart;$('chart-close').onclick=closeChart;$('chart-search').oninput=drawChart;$('chart').addEventListener('click',e=>{if(e.target===$('chart'))closeChart();});
$('panel-toggle').onclick=()=>{const c=$('panel').classList.toggle('collapsed');$('panel-toggle').textContent=c?'+':'−';$('panel-toggle').setAttribute('aria-expanded',String(!c));};
document.querySelectorAll('.scan').forEach(b=>b.onclick=()=>startScan(Number(b.dataset.scan)));
function rotate(yaw,pitch,roll){const right=V.norm(V.cross(forward,up));if(yaw)forward=V.rot(forward,up,yaw);if(pitch){forward=V.rot(forward,right,pitch);up=V.rot(up,right,pitch);}if(roll)up=V.rot(up,forward,roll);forward=V.norm(forward);up=V.norm(V.sub(up,V.mul(forward,V.dot(forward,up))));}
function pointTowardWaypoint(){const b=siteWaypoint?.planet||target,way=siteWaypoint?V.add(b.position,V.mul(V.rot(siteWaypoint.dir,b.spinAxis||[0,1,0],b.spinAngle||0),b.radius+180)):b.position,delta=V.sub(way,pos);if(V.len(delta)<30)return;
 let d=V.norm(delta);if(landed){const radial=V.norm(V.sub(pos,nearest.position));d=V.norm(V.sub(d,V.mul(radial,V.dot(d,radial))));if(V.len(d)<.1)return;up=radial;}else{let right=V.norm(V.cross(forward,up));if(V.len(V.cross(right,d))<.01)right=[1,0,0];up=V.norm(V.cross(right,d));}forward=d;showToast('Heading aligned · thrust with W.');}
const busy=()=>['chart','workbench','field-lab','outpost','observatory','integration-modal','controls-modal','ruin-panel','discovery-panel','survey-panel','interior-panel','ecology-panel','events-panel','sandbox-panel','archive-t17','physical8a-dialog'].some(id=>{const e=$(id);return e&&!e.hidden;});
function isTyping(target){return !!(target?.closest?.('input,textarea,select,[contenteditable=true]'));}
addEventListener('keydown',ev=>{
 const code=controls.resolve(ev.code)||ev.code;
 if(busy()||!$('launch-dialog').hidden||window.StarfallAssetUI7A1?.blocking||isTyping(ev.target)){controls.clear();if(code==='Escape'&&!$('chart').hidden)closeChart();return;}
 if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(code))ev.preventDefault();
 if(ev.code==='Escape'&&interiorState){leaveInterior();return;}
 const mapped=controls.press(ev.code);if(!mapped)return;
 if(ev.repeat)return;
 if(code==='KeyX'&&manufacturedOccupied8G){exitManufactured8G();return;}
 if(code==='KeyX'&&truckOccupied){exitTruck();return;}
 if(code==='KeyX'&&shipWalking8e){interactShip8E();return;}
 if(code==='KeyB'&&eva){if(cargoInteract8B())return;}
 if(code==='KeyI'&&!eva&&!truckOccupied&&landed){
  if(shipWalking8e){if(StarfallShipWalk8E.room(shipWalkAt8e.x,shipWalkAt8e.z)!=='bridge'){showToast('8E · Return physically to the command bridge to pilot');return;}
   shipWalking8e=false;camMode=1;showToast('PILOT STATION · flight controls restored');}
  else{shipWalking8e=true;shipWalkAt8e={x:0,z:-40,heading:0};camMode=0;showToast('SHIP INTERIOR · walk to modules; X at stations');}
  camEye=null;saveFlight();return;
 }
 if(code==='KeyX'&&eva){if(interiorState){window.StarfallInteriorsUI?.interact();return;}const ctx=outpostContext(),A=window.StarfallArchaeology,R=window.StarfallRuinsUI;
   const entrance=ctx.body&&ctx.local&&A&&R?.visibleSites?.find(site=>site.bodyId===ctx.bodyId&&A.arc(site.local,ctx.local,ctx.body.radius)<30&&R.records.some(r=>r.id===site.id&&r.level>=2));
   if(entrance){window.StarfallInteriorsUI?.interact();return;}
   const GEO=window.StarfallGeologyLW02,cave=!interiorState&&GEO&&ctx.body?.landable&&ctx.local?
    GEO.sites(ctx.body,GALAXY_SEED).find(site=>GEO.arc(site.local,ctx.local,ctx.body.radius)<7):null;
   if(cave){enterCave(cave);window.StarfallInteriorsUI?.refresh();return;}
   if(enterManufactured8G()||enterTruck())return;window.StarfallInteriorsUI?.interact();return;}
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
function saveFlight(){
 if(truckBody&&truckLocal&&physical8a.get(START_TRUCK)?.location?.bodyId===truckBody.id)
  physical8a.setSurface(START_TRUCK,truckBody.id,truckLocal,{batteryJ:truckBatteryJ,lights:truckLights,cargoKg:truckCargo,forward:truckForwardVec});
 if(roverBody&&roverLocal&&physical8a.get(START_ROVER)?.location?.bodyId===roverBody.id)
  physical8a.setSurface(START_ROVER,roverBody.id,roverLocal,{forward:roverForwardVec});
 const ship=shipWorldState(),body=ship.body||nearest,radial=body?V.norm(V.sub(ship.position,body.position)):[0,1,0];SF.save({physical8a:physical8a.serialize(),materials8a:materials8a.snapshot(),vehicleAssembly8g:vehicleAssembly8g.snapshot(),resources8c:resources8c.serialize(),atmosphere8g:atmosphere8g.snapshot(),mining8d:mining8d.snapshot(),refinery8e:refinery8e.snapshot(),industrialPlant8e:industrialPlant8e.snapshot(),industrialJob8e:JSON.parse(JSON.stringify(industrialJob8e)),factory8f:factory8f.snapshot(),transformations8e:transformation8e.snapshot(),modularShip8e:modularShip8e.snapshot(),lifeSupport8e:lifeSupport8e,engineeringVehicles:vehicleStore.serialize(),flightGalaxy:{shipCargo8b:cargo8b,shipWalk8e:shipWalkAt8e,seed:GALAXY_SEED,time:simTime,position:(eva?ship.position:pos).map(v=>+v.toFixed(3)),forward:eva?ship.forward:forward,up:eva?ship.up:up,target:target.id,attached:body?.id||null,groundDirection:landed?radial:null,landed,engineering:engEnabled&&engState?{bodyId:engBody,rM:engState.rM,vMS:engState.vMS,craft:engState.craft}:null,roverPose:roverBody&&roverLocal?{bodyId:roverBody.id,local:roverLocal,forward:roverForwardVec}:null,shipDockT13:shipDockT13,truckPose:truckBody&&truckLocal?{bodyId:truckBody.id,local:truckLocal,forward:truckForwardVec,batteryJ:truckBatteryJ,lights:truckLights,cargo:truckCargo,chargeReadyAtS:truckChargeReadyAtS,roverChargeReadyAtS:localRoverChargeReadyAtS,roverPortTemperatureK:localRoverPortTemperatureK,fieldServiceT12:localServiceT12,recovery:winch7d}:null}});}
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
 if(shipWalking8e&&landed&&!eva){
  const turn=((keys.has('KeyA')||keys.has('ArrowLeft'))?1:0)-((keys.has('KeyD')||keys.has('ArrowRight'))?1:0);
  const move=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
  if(turn)shipWalkAt8e.heading+=turn*dt*1.85;
  if(move){const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?7:3.8,
   step=move*speed*dt,heading=shipWalkAt8e.heading;
   const next=StarfallShipWalk8E.move(shipWalkAt8e,-Math.sin(heading)*step,-Math.cos(heading)*step);
   shipWalkAt8e.x=next.x;shipWalkAt8e.z=next.z;
   if(shipWalkAt8e.z>29.5&&move<0&&Math.abs(shipWalkAt8e.x)<3.2){
    exitShip();showToast('8E · Physically exiting through crew cargo ramp');return;
   }
  }
  warp=false;vertical=0;vel=[0,0,0];return;
 }
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
   if(truckOccupied&&cargo8b.mode==='ramp'){
    const drive=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
    if(drive&&truckBatteryJ>0){
     const next=BAY8B.advance(cargo8b.pose,drive*dt*7.5);
     cargo8b.pose={x:next.x,y:next.y,z:next.z};
     truckBatteryJ=Math.max(0,truckBatteryJ-dt*2200);
     truckLocal=cargoSurfaceLocal8B(shipCargoWorld8B().position);
     if(next.atGround&&drive<0){cargo8b.mode='ground';showToast('8B · TRUCK EXITED THE LOADING RAMP · independent surface driving');}
    }
    truckForwardVec=[...shipForwardVec];
    const where=truckWorldState();pos=[...where.position];up=where.up;evaForward=[...where.forward];
    vertical=0;vel=[0,0,0];return;
   }
   if(truckOccupied&&cargo8b.mode==='ground'&&shipBody===nearest&&cargoRampReady8B()){
    const rel=cargoRelative8B(truckWorldState().position),heading=-V.dot(truckForwardVec,shipForwardVec);
    if(BAY8B.canApproach(rel,heading)&&(keys.has('KeyW')||keys.has('ArrowUp'))){
     cargo8b.mode='ramp';cargo8b.pose={x:rel.x,z:BAY8B.BAY.rampEndZ,y:BAY8B.height(BAY8B.BAY.rampEndZ)};
     showToast('8B · WIDE RAMP · Drive forward, park inside, exit X, secure with B');return;
    }
   }
   if(manufacturedOccupied8G){manufacturedDrive8G(dt,yaw);return;}
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
  if(keys.has('Space')){if(cargo8b.mode==='ramp'){showToast('8B · CARGO RAMP OCCUPIED · secure truck or unload before launch');vertical=0;vel=[0,0,0];return;}if(shipDockT13.state!=='UNDOCKED'){showToast('T13 · UNDOCK SERVICE CABLE BEFORE TAKEOFF');vertical=0;vel=[0,0,0];return;}landingCapture=null;landed=false;groundLocal=null;eva=false;evaLocal=null;shipBody=null;truckOccupied=false;vel=V.add(V.mul(radial,38),V.mul(forward,14));pos=V.add(pos,V.mul(radial,5));showToast('Liftoff · atmospheric ascent');}else{
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
 if(shipWalking8e){
  const ship=shipWorldState(),upV=ship.up,heading=shipWalkHeading8E(),base=shipWalkWorld8E(-1.0);
  const foot=V.add(base,V.mul(upV,2.15)),lookPitch=V.clamp(orbitPitch,-.95,.95),
   pitched=V.norm(V.add(V.mul(heading,Math.cos(lookPitch)),V.mul(upV,Math.sin(lookPitch))));
  const desired=camMode===1?foot:V.add(foot,V.add(V.mul(heading,-4),V.mul(upV,1.3)));
  camEye=[...desired];const aim=V.add(foot,V.mul(pitched,camMode===1?45:15));
  const front=V.norm(V.sub(aim,desired)),right=V.norm(V.cross(front,upV));
  return{eye:desired,target:aim,forward:front,right,up:V.norm(V.cross(right,front))};
 }
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
 document.body.dataset.sfView=shipWalking8e?'ship-interior':truckOccupied?(camMode===1?'truck-cab':'truck-chase'):eva?'eva':camMode===1?'ship-cockpit':'ship-chase';
 const hint=$('control-live-hint');if(hint){const codes=controls.settings.bindings;const short=k=>String(k||'—').replace(/^Key/,'').replace(/^Digit/,'').replace(/^Arrow/,'ARROW ').replace('ShiftLeft','SHIFT').replace('Space','SPACE');
  const mode=shipWalking8e?'SHIP INTERIOR':interiorState?(interiorState.kind==='cave'?'CAVE':'RUIN INTERIOR'):truckOccupied?'TRUCK':eva?'EVA':landed?'LANDED SHIP':'SHIP';const word=mode==='SHIP'?'thrust / brake':mode==='LANDED SHIP'?'drive / reverse':'forward / reverse';
  const text=mode+' · '+short(codes.thrust)+' / '+short(codes.brake)+' '+word+' · '+short(codes.turnLeft)+' / '+short(codes.turnRight)+' turn'+(truckOccupied&&controls.settings.roverSteerInvert?' (INVERTED)':'')+' · MOUSE Y '+(controls.settings.lookInvertY?'INVERTED':'NORMAL')+(controls.settings.flightPitchInvert&&mode==='SHIP'?' · FLIGHT PITCH INVERTED':'')+' · CONTROLS ⚙ TO CUSTOMIZE';if(hint.textContent!==text)hint.textContent=text;
 }
const body=nearest||target,phase=solarWarning?'STELLAR CORONA':stage(altitude,body);$('phase-top').textContent='EXPEDITION / '+phase;$('flight-state').textContent=phase;$('mode-text').textContent=truckOccupied?'TRUCK':eva?'EVA':solarWarning?'CORONA':warp?'WARP':landed?'SURFACE':altitude<650?'ATMOSPHERE':altitude<2500?'ORBIT':'FREE FLIGHT';
 $('speed-text').textContent=warp?'FTL CRUISE':V.len(vel).toFixed(0)+' u/s';$('alt-text').textContent=formatDistance(Math.max(0,altitude));$('vertical-text').textContent=vertical.toFixed(0)+' u/s';$('star-count').textContent=renderer.starPoints.toLocaleString();$('body-count').textContent=renderer.renderedBodies+' / '+galaxy.allWorlds.length;$('system-count').textContent=String(galaxy.systems.length);$('coordinates').textContent=pos.map(n=>Math.round(n/1e6)).join(' / ')+' Mu';$('fps-text').textContent=Math.round(fps);$('effects-count').textContent=(renderer.effectsRendered||0).toLocaleString();$('time-scale').textContent=timeScale+'×';$('lighting-state').textContent=renderer.daylightLabel||'—';$('floodlights-state').textContent=headlights?'ON':'OFF';
 const biomeLabel=$('biome-label'),biomeDesc=$('biome-description');if(biomeLabel){const nearby=body?.landable&&altitude<1100;if(nearby){const d=V.rot(V.norm(V.sub(pos,body.position)),body.spinAxis||[0,1,0],-(body.spinAngle||0)),h=groundHeight(d,body),f=Starfall3D.field(d,body.seed),a=BIOMES.classify(body,d,h,f);biomeLabel.textContent=a.name.toUpperCase();biomeDesc.textContent=a.lifePotential?'Potential biology · unconfirmed':'Geological environment · unconfirmed biology';}else{biomeLabel.textContent='—';biomeDesc.textContent='Approach a solid world to survey the surface';}}
 const nearSys=galaxy.nearestSystem(pos);const stellarStatus=window.StarfallSpaceWeatherLW06?.exposure(nearSys,pos,simTime,GALAXY_SEED);const types=[];if(nearSys?.belts.length)types.push(nearSys.belts.length+' ASTEROID BELT'+(nearSys.belts.length>1?'S':''));if(nearSys?.nebulae.length)types.push('NEBULA');if(nearSys?.comets.length)types.push('COMET');if(nearSys?.phenomenon)types.push(nearSys.phenomenon.toUpperCase());if(stellarStatus&&stellarStatus.hazard!=='NOMINAL')types.push('SPACE WEATHER '+stellarStatus.hazard+' · IONIZATION '+Math.round(stellarStatus.ionizationIndex*100)+'%');const eventVisible=nearSys&&(V.len(V.sub(pos,nearSys.position))<nearSys.maxOrbit*2.5||stellarStatus?.ionizationIndex>.06);$('space-event').hidden=!eventVisible;$('space-event').textContent=eventVisible?'SECTOR PHENOMENA / '+(types.join('  ·  ')||'QUIET SYSTEM'):'';
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
  renderer.render({camera,swimming:swimming&&swimDepthScene>=.001,weather:!interiorState&&nearest?.landable&&altitude<600?StarfallEvents.evaluate(nearest,V.rot(V.norm(V.sub(pos,nearest.position)),nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),simTime,GALAXY_SEED):null,position:pos,viewerPosition:pos,shipPosition:ship.position,hidePlayerShip:shipWalking8e||camMode===1&&!eva&&!truckOccupied,shipWalkInterior:shipWalking8e,hidePlayerTruck:camMode===1&&truckOccupied,lightPosition:eva?pos:ship.position,headlampForward:eva?evaForward:forward,shipForward:eva?ship.forward:forward,shipUp:eva?ship.up:up,roverPosition:rover?.position||null,roverForward:rover?.forward||null,roverUp:rover?.up||null,truckPosition:truckWorldState()?.position||null,truckForward:truckWorldState()?.forward||null,truckUp:truckWorldState()?.up||null,miningRig8D:!!mining8d.active&&miningContext8D().truckPresent,extraRovers:window.StarfallLaunchUI?.sceneRovers()||[],satellites:window.StarfallLaunchUI?.sceneSatellites()||[],rockets:window.StarfallLaunchUI?.sceneRockets()||[],avatarBase:shipWalking8e&&camMode!==1?shipWalkWorld8E(-1.0):eva&&!truckOccupied&&!interiorState?portraitBase:null,
 avatarUp:shipWalking8e?ship.up:rad,avatarForward:shipWalking8e?shipWalkHeading8E():evaForward,avatarWalking:!!(rampTransition||roverExitMove||keys.has('KeyW')||keys.has('KeyS')||keys.has('ArrowUp')||keys.has('ArrowDown')),avatarSpeed:keys.has('ShiftLeft')||keys.has('ShiftRight')?1.7:1,avatarDelta:dt,nearest,altitude,headlights,infrastructure:window.StarfallOutpostUI?.scene()||[],ruins:window.StarfallRuinsUI?.scene()||[],ecology:!interiorState?(window.StarfallEcologyUI?.scene()||[]):[],interior:interiorState?(()=>{const site=interiorState.site,body=nearest,worldUp=V.rot(site.local,body.spinAxis||[0,1,0],body.spinAngle||0);return{kind:interiorState.kind||'ruin',siteId:site.id,tier:site.tier,site,position:V.add(body.position,V.mul(worldUp,body.radius+site.height)),up:worldUp,forward:V.rot(V.mul(interiorState.basis.forward,-1),body.spinAxis||[0,1,0],body.spinAngle||0)};})():null});window.StarfallImagingUI7F?.tick?.(dt*timeScale);if(renderer.terrainDebugEnabled&&now-(window.__terrainDebugAt||0)>260){window.__terrainDebugAt=now;const d=renderer.terrainDiagnostics();const tag=$('terrain-debug');if(tag){tag.hidden=false;tag.textContent='TERRAIN / FIXED TILES\n'+JSON.stringify(d,null,2);}}else if(!renderer.terrainDebugEnabled){const tag=$('terrain-debug');if(tag&&!tag.hidden)tag.hidden=true;}
 if(started)perf.recordFrame(now,performance.now()-started,afterUpdate-started,renderer,galaxy,simTime,timeScale);frames++;frameClock+=dt;
  if(frameClock>2.4){fps=frames/frameClock;frames=0;frameClock=0;if(fps<38&&renderer.pixelRatio>.7){renderer.pixelRatio=Math.max(.7,renderer.pixelRatio-.12);renderer.resize();}else if(fps>56&&renderer.pixelRatio<renderer.dprTarget){renderer.pixelRatio=Math.min(renderer.dprTarget,renderer.pixelRatio+.1);renderer.resize();}}
  window.StarfallAssetUI7A1?.tick();if(window.StarfallAssetUI7A1?.hasWorldSelection&&now-lastAssetHighlightAt>160){lastAssetHighlightAt=now;window.StarfallAssetUI7A1.syncHighlight({...camera,fov:renderer.fov},canvas,assetPickCandidates());}refreshHUD(dt);if(now-lastSave>4000){lastSave=now;saveFlight();}
 }catch(e){console.error('Starfall frame failed:',e);$('status-text').textContent='GRAPHICS / FLIGHT ERROR: '+String(e.message).slice(0,85);}requestAnimationFrame(loop);}
addEventListener('resize',()=>renderer.resize());addEventListener('pagehide',saveFlight);
nearest=galaxy.nearestBody(pos).planet||first;let initial=surfaceData(nearest,pos);altitude=initial.distance-nearest.radius-initial.height;
if(landed){if(!shipBody){shipBody=nearest;shipLocal=groundLocal?[...groundLocal]:null;shipForwardVec=[...forward];shipUpVec=[...up];}placeRoverNearShip();
 const tp=saved?.truckPose;if(truckBody===nearest&&truckLocal&&tp?.bodyId===nearest.id&&Array.isArray(tp.local)&&tp.local.length===3&&tp.local.every(Number.isFinite)){truckLocal=V.norm(tp.local);if(Array.isArray(tp.forward)&&tp.forward.length===3&&tp.forward.every(Number.isFinite))truckForwardVec=V.norm(tp.forward);truckBatteryJ=V.clamp(Number(tp.batteryJ)||0,0,44e6);truckLights=tp.lights!==false;truckCargo=V.clamp(Number(tp.cargo)||0,0,800);truckChargeReadyAtS=Number.isFinite(tp.chargeReadyAtS)?Math.max(0,tp.chargeReadyAtS):0;if(tp.recovery&&Array.isArray(tp.recovery.destination)&&tp.recovery.destination.length===3&&tp.recovery.destination.every(Number.isFinite)&&Number.isFinite(tp.recovery.remainingWorkJ))winch7d=StarfallFieldServiceT12.restore(tp.recovery,nearest.id);}
 const pose=saved?.roverPose;if(roverBody===nearest&&roverLocal&&pose?.bodyId===nearest.id&&Array.isArray(pose.local)&&pose.local.length===3&&pose.local.every(Number.isFinite)){
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
 return{body,bodyId:body?.id,landed,eva:eva&&!truckOccupied&&!manufacturedOccupied8G,truckOccupied,local,shipLocal:shipBody===body?shipLocal:null,roverLocal:roverBody===body?roverLocal:null,position:[...pos],up:[...up],forward:[...(eva?evaForward:forward)],time:simTime};}
function refineryContext8E(){
 const ship=vehicleStore.get('ship'),room=shipWalking8e?StarfallShipWalk8E.room(shipWalkAt8e.x,shipWalkAt8e.z):null;
 const local=shipBody&&nearest===shipBody&&landed;
 const near=local&&(room==='fabrication'||(eva&&!truckOccupied&&!shipWalking8e&&
  V.len(V.sub(pos,shipWorldState().position))<50));
 return {bodyId:nearest?.id||null,shipLanded:!!local,operatorNear:!!near,workshopRoom:room,
  workshopInstalled:modularShip8e.describe('fabrication').status==='INSTALLED',
  powerEnabled:ship.state.powerEnabled&&ship.state.loads?.avionics!==false,
  energyJ:Math.max(0,ship.state.energyJ),active:refinery8e.active};
}
function refineryQuote8E(mode){
 return StarfallRefinery8E.quote(mode,materials8a.snapshot(),StarfallMining8D.SHIP,StarfallMining8D.SHIP);
}
function refineryStart8E(mode){
 const c=refineryContext8E();if(!c.operatorNear)throw Error('Approach landed ship workshop or walk to fabrication room');
 const job=refinery8e.start({mode,materials:materials8a.snapshot(),sourceContainerId:StarfallMining8D.SHIP,
  outputContainerId:StarfallMining8D.SHIP,shipLanded:c.shipLanded,shipBodyId:c.bodyId,
  workshopInstalled:c.workshopInstalled,powerEnabled:c.powerEnabled,batteryJ:c.energyJ});
 saveFlight();return job;
}
function refineryCancel8E(){if(!refinery8e.cancel())return false;saveFlight();return true;}
function refineryAdvance8E(elapsed){
 const a=refinery8e.active;if(!a)return;
 const c=refineryContext8E(),enabled=c.shipLanded&&c.bodyId===a.bodyId&&c.workshopInstalled&&c.powerEnabled;
 if(!enabled)return;
 try{
  const ship=vehicleStore.get('ship'),step=refinery8e.step(Math.min(elapsed,10),ship.state.energyJ,true);
  if(step.usedJ>0){
   vehicleStore.update('ship',{...ship.state,energyJ:Math.max(0,ship.state.energyJ-step.usedJ)});
   refinerySaveSeconds8E+=Math.min(elapsed,10);
  }
  if(step.completed){
   const result=refinery8e.commit(materials8a.snapshot(),StarfallTransformation8E.create(transformation8e.snapshot()));
   const nextMaterials=StarfallMaterials8A.create(result.materials);
   materials8a=nextMaterials;transformation8e=StarfallTransformation8E.create(result.transformations);
   saveFlight();refinerySaveSeconds8E=0;
   showToast('8E · '+result.receipt.productKg.toFixed(2)+' kg '+result.receipt.product+' recovered from '+result.receipt.inputKg+' kg ore');
  }else if(refinerySaveSeconds8E>=2){saveFlight();refinerySaveSeconds8E=0;}
 }catch(error){console.warn('8E refinery paused:',error);/* Preserve input and paid energy. User can cancel or correct stock. */}
}
function industrialConstruction8E(front=24,right=0){
 const holder=StarfallMining8D.SHIP;
 return materials8a.inventory(holder).filter(l=>StarfallIndustrialSite8E.KITS[l.materialId]).map(l=>{
  try{return {...StarfallIndustrialSite8E.quote({
   kitLotId:l.id,materials:materials8a.snapshot(),physical:physical8a.serialize(),shipContainerId:holder,
   bodyId:outpostContext().bodyId,bodyRadius:nearest?.radius||1,
   local:outpostOffset(front,right),shipLocal:shipLocal||[0,1,0],operatorLocal:evaLocal||[0,1,0]}),ready:true};}
  catch(e){return {kitLotId:l.id,materialId:l.materialId,ready:false,reason:e.message};}
 });
}
function industrialInstall8E(kitLotId,front=24,right=0){
 const c=outpostContext(),power=vehicleStore.get('ship');
 if(!c.landed||!c.eva||!c.body?.landable||shipBody!==c.body||!shipLocal||
    !power.state.powerEnabled)throw Error('Exit a landed powered ship before surface facility construction');
 if(!Number.isFinite(front)||!Number.isFinite(right)||Math.hypot(front,right)>73)
  throw Error('Industrial position exceeds ship umbilical');
 const local=outpostOffset(front,right),holder=StarfallMining8D.SHIP;
 // Reuse legacy outpost footprint protection; an industrial plant must never clip
 // into an existing hab, solar farm, storage node or launch pad.
 const outpostItems=window.StarfallOutpostUI?.store?.items||[];
 for(const other of outpostItems){
  if(other.bodyId!==c.bodyId)continue;
  const size=window.StarfallOutposts?.SPECS?.[other.kind]?.radius||8;
  const k=StarfallIndustrialSite8E.KITS[materials8a.inventory(holder).find(l=>l.id===kitLotId)?.materialId];
  if(k&&Math.acos(Math.max(-1,Math.min(1,local.reduce((a,v,i)=>a+v*other.local[i],0))))*
       c.body.radius < k.radiusScene+size+2)
   throw Error('Industrial site overlaps an existing outpost structure');
 }
 const quote=StarfallIndustrialSite8E.quote({materials:materials8a.snapshot(),physical:physical8a.serialize(),
  shipContainerId:holder,kitLotId,bodyId:c.bodyId,bodyRadius:c.body.radius,local,
  shipLocal,operatorLocal:evaLocal});
 if(power.state.energyJ+1e-7<quote.workJ)throw Error('Insufficient ship battery for facility erection');
 const serial=physical8a.serialize().transfers.filter(t=>t.id?.startsWith('plant8e:')).length+1;
 let number=serial;
 while(physical8a.get('facility8e:'+number))number++;
 const operationId='plant8e:'+number,assetId='facility8e:'+number;
 const result=StarfallIndustrialSite8E.install({jobId:operationId,assetId,materials:materials8a.snapshot(),
  physical:physical8a.serialize(),shipContainerId:holder,kitLotId,bodyId:c.bodyId,local,
  bodyRadius:c.body.radius,shipLocal,operatorLocal:evaLocal,
  energyReceipt:{operationId,sourceId:'ship-main:engineering-battery',usedJ:quote.workJ}});
 const materials=StarfallMaterials8A.create(result.materials),assets=StarfallPhysical8A.create(result.physical);
 materials8a=materials;physical8a=assets;
 vehicleStore.update('ship',{...power.state,energyJ:power.state.energyJ-quote.workJ});
 saveFlight();showToast('8E · '+result.machine.type+' erected from physical kit');
 return result.receipt;
}
function assemblyContext8G(){
 const c=outpostContext(),ship=vehicleStore.get('ship');
 return {bodyId:c.bodyId,landed:!!c.landed,eva:!!c.eva&&!truckOccupied&&!shipWalking8e,
  powered:!!ship.state.powerEnabled,energyJ:Math.max(0,ship.state.energyJ),
  padIds:physical8a.list().filter(a=>a.type==='industrial_plant'&&a.state?.station==='vehicle_assembly'&&
   a.location?.kind==='surface'&&a.location.bodyId===c.bodyId).map(a=>a.id)};
}
function assemblyQuote8G(blueprintId,facilityId){
 const c=assemblyContext8G();
 if(!['truck','science_rover'].includes(blueprintId))throw Error('Unsupported 8G surface vehicle blueprint');
 if(!c.landed||!c.eva||!c.powered||!shipLocal||!evaLocal)throw Error('Land, power ship and walk EVA to assembly site');
 const facility=physical8a.get(facilityId);
 if(!facility||facility.location?.kind!=='surface'||facility.location.bodyId!==c.bodyId)
  throw Error('Selected assembly pad not on this world');
 const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a),V.norm(b)))))*nearest.radius;
 if(arc(evaLocal,facility.location.local)>35||arc(shipLocal,facility.location.local)>80)
  throw Error('Operator >35 m or ship power umbilical >80 m from assembly pad');
 return StarfallVehicleAssemblyContract8G.create(vehicleAssembly8g.snapshot()).quote({
  jobId:'vehicle8g:preview',blueprintId,facilityId,containerId:StarfallMining8D.SHIP,bodyId:c.bodyId,
  local:facility.location.local,materials:materials8a.snapshot(),physical:physical8a.serialize(),
  powerReceipt:{operationId:'vehicle8g:preview',status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:200000}});
}
function assemblyStage8G(blueprintId,facilityId){
 const q=assemblyQuote8G(blueprintId,facilityId),c=assemblyContext8G();
 if(!q.ready)throw Error('Missing manufactured parts: '+q.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(2)+' kg').join(', '));
 if(c.energyJ<200000)throw Error('Assembly requires 200000 J of real ship battery energy');
 const facility=physical8a.get(facilityId),all=physical8a.list();let n=1;
 while(all.some(x=>x.id==='vehicle8g:'+n)||vehicleAssembly8g.snapshot().receipts.some(x=>x.id==='vehicle8g:'+n))n++;
 const jobId='vehicle8g:'+n;
 // Finished frame must occupy its own collision footprint, never the assembly
 // pad's center. Search a few deterministic tangent offsets; no asset is moved
 // or matter consumed unless a clear surface destination exists.
 const surfaceAssets=all.filter(a=>a.location?.kind==='surface'&&a.location.bodyId===c.bodyId);
 const separation=(a,b)=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a),V.norm(b)))))*nearest.radius;
 let assemblyLocal=null;
 for(const [front,right] of [[20,0],[-20,0],[0,20],[0,-20],[29,12],[-29,-12]]){
  const local=tangentOffsetLocal(nearest,facility.location.local,shipForwardVec||forward,front,right);
  if(separation(local,facility.location.local)<15)continue;
  if(shipLocal&&separation(local,shipLocal)<27)continue;
  if(surfaceAssets.some(a=>Array.isArray(a.location.local)&&
   separation(local,a.location.local)<(a.type==='industrial_plant'||a.type==='industrial_vessel'?16:14)))continue;
  assemblyLocal=local;break;
 }
 if(!assemblyLocal)throw Error('No clear chassis assembly bay: move plant or other equipment first');
 const output=vehicleAssembly8g.stage({jobId,blueprintId,facilityId,containerId:StarfallMining8D.SHIP,
  bodyId:c.bodyId,local:assemblyLocal,materials:materials8a.snapshot(),
  physical:physical8a.serialize(),powerReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:200000}});
 // Validate all next ledgers before modifying runtime state. This is one synchronous
 // transaction, followed by durable save; no new truck may enter legacy controls.
 const newMaterials=StarfallMaterials8A.create(output.materials);
 const newPhysical=StarfallPhysical8A.create(output.physical);
 const ship=vehicleStore.get('ship');
 if(ship.state.energyJ<200000)throw Error('Battery energy changed before commit');
 materials8a=newMaterials;physical8a=newPhysical;
 vehicleAssembly8g=StarfallVehicleAssemblyContract8G.create(output.assembly);
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-200000});
 saveFlight();showToast('8G · Manufactured non-operational '+blueprintId+' frame '+jobId);
 return output.receipt;
}
function manufacturedWorld8G(asset){
 const b=galaxy.byId.get(asset?.location?.bodyId);
 if(!b||asset.location.kind!=='surface'||!Array.isArray(asset.location.local))return null;
 const axis=b.spinAxis||[0,1,0],dir=V.norm(V.rot(asset.location.local,axis,b.spinAngle||0));
 const h=groundHeight(asset.location.local,b);
 const tangent=V.norm(V.sub(asset.state?.forward||[0,0,1],V.mul(dir,V.dot(asset.state?.forward||[0,0,1],dir))));
 return{body:b,up:dir,forward:V.len(tangent)>.01?tangent:V.norm(V.cross([1,0,0],dir)),
  position:V.add(b.position,V.mul(dir,b.radius+h+2.5))};
}
function activateManufactured8G(assetId){
 const c=assemblyContext8G(),asset=physical8a.get(assetId),ship=vehicleStore.get('ship');
 if(!c.landed||!c.eva||!c.powered||manufacturedOccupied8G||!asset||asset.type!=='vehicle_frame'||
  asset.location?.kind!=='surface'||asset.location.bodyId!==c.bodyId)throw Error('Land, power ship and approach an unfinished frame on EVA');
 const w=manufacturedWorld8G(asset);if(!w||V.len(V.sub(pos,w.position))>35)throw Error('Move within 35 scene units of the frame');
 if(!shipLocal||Math.acos(Math.max(-1,Math.min(1,V.dot(asset.location.local,shipLocal))))*nearest.radius>80)
  throw Error('Frame calibration needs ship power within 80 scene units');
 const facilityId=asset.state?.facilityId,facility=physical8a.get(facilityId);
 if(!facility||facility.location?.bodyId!==c.bodyId||facility.state?.station!=='vehicle_assembly')
  throw Error('Original physical assembly pad not available for commissioning');
 const cost=StarfallVehicleActivation8G.WORK_J;if(ship.state.energyJ<cost)throw Error('2.5 MJ ship battery charge required');
 const result=StarfallVehicleActivation8G.activate({assetId,physical:physical8a.serialize(),
  assembly:vehicleAssembly8g.snapshot(),bodyId:c.bodyId,facilityId,
  powerReceipt:{operationId:'activate:'+assetId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:cost}});
 physical8a=StarfallPhysical8A.create(result.physical);
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-cost});
 saveFlight();showToast('8G · LOW SPEED PROTOTYPE COMMISSIONED · walk to its chassis and press X');
 return result.asset;
}
function enterManufactured8G(){
 if(!eva||truckOccupied||manufacturedOccupied8G||interiorState||shipWalking8e||rampTransition)return false;
 for(const asset of physical8a.list()){
  if(asset.type!=='vehicle_frame'||asset.state?.operational!==true||
     asset.location?.kind!=='surface'||asset.location.bodyId!==nearest?.id)continue;
  const w=manufacturedWorld8G(asset);
  if(!w||V.len(V.sub(pos,w.position))>7.5)continue;
  manufacturedOccupied8G=asset.id;evaLocal=[...asset.location.local];evaForward=[...w.forward];
  pos=[...w.position];up=[...w.up];camEye=null;camDistance=Math.max(camDistance,24);
  roverEntryCooldown=1.2;showToast('8G · '+asset.id+' · W/S drive · A/D steer · SPACE brake · X exit');
  return true;
 }
 return false;
}
function exitManufactured8G(){
 if(!manufacturedOccupied8G)return false;
 const a=physical8a.get(manufacturedOccupied8G),w=manufacturedWorld8G(a);
 manufacturedOccupied8G=null;if(!w)return false;
 const local=tangentOffsetLocal(w.body,a.location.local,w.forward,-5,-7);
 evaLocal=local;const dir=V.norm(V.rot(local,w.body.spinAxis||[0,1,0],w.body.spinAngle||0));
 pos=V.add(w.body.position,V.mul(dir,w.body.radius+groundHeight(local,w.body)+EVA_HEIGHT));
 evaForward=[...w.forward];up=dir;camEye=null;roverEntryCooldown=1.4;
 saveFlight();showToast('8G · exited physical prototype');return true;
}
function manufacturedDrive8G(dt,yaw){
 const a=physical8a.get(manufacturedOccupied8G),w=manufacturedWorld8G(a);
 if(!w||w.body!==nearest||!a.state?.operational){manufacturedOccupied8G=null;return false;}
 const rad=w.up,v=a.state.drive||{},h=a.state.hardware,
  state={schema:1,distanceM:Number.isFinite(a.state.distanceM)?a.state.distanceM:v.distanceM||0,
   speedMS:Number.isFinite(a.state.speedMS)?a.state.speedMS:v.speedMS||0,
   batteryEnergyJ:Number.isFinite(a.state.batteryEnergyJ)?a.state.batteryEnergyJ:v.batteryEnergyJ||0};
 let f=w.forward;
 if(yaw)f=V.norm(V.rot(f,rad,yaw*dt*.75));
 const drive=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
 const brake=keys.has('Space')?1:0;
 const sys=galaxy.byId.get(w.body.systemId),parent=w.body.kind==='moon'?
  galaxy.byId.get(w.body.parentId):null;
 let grav=9.81;
 try{const profile=P.bodyProfile(w.body,parent?
    P.bodyProfile(parent,P.starProfile(sys.star)):P.starProfile(sys.star));
  if(Number.isFinite(profile.mu)&&Number.isFinite(profile.radiusM)&&profile.radiusM>0)
   grav=Math.max(.1,profile.mu/(profile.radiusM*profile.radiusM));
 }catch(_){/* Preserve playable movement when an exotic body profile is unavailable. */}
 const g=grav;
 const dyn=StarfallVehicleDrive8G.create(h,state);
 const result=dyn.step({throttle:drive,brake},
  {gravityMS2:g,slopeRad:0,frictionCoefficient:.65},Math.max(.001,Math.min(.1,dt)));
 const ds=(state.speedMS+result.speedMS)*.5*dt;
 const right=V.norm(V.cross(f,rad)),ang=ds/Math.max(1,w.body.radius+groundHeight(a.location.local,w.body)+2.5);
 const dir=V.norm(V.rot(rad,right,-ang));
 const local=V.rot(dir,w.body.spinAxis||[0,1,0],-(w.body.spinAngle||0));
 const dh=Math.abs(groundHeight(local,w.body)-groundHeight(a.location.local,w.body));
 const moveOk=dh<Math.max(.6,Math.abs(ds)*.5);
 if(moveOk){f=V.norm(V.rot(f,right,-ang));physical8a.setSurface(a.id,w.body.id,local,
  {speedMS:result.speedMS,batteryEnergyJ:result.batteryEnergyJ,distanceM:result.distanceM,forward:f});}
 else physical8a.setSurface(a.id,w.body.id,a.location.local,
  {speedMS:0,batteryEnergyJ:result.batteryEnergyJ,distanceM:state.distanceM,forward:f});
 const updated=manufacturedWorld8G(physical8a.get(a.id));
 pos=updated.position;up=updated.up;evaLocal=physical8a.get(a.id).location.local;
 evaForward=updated.forward;vertical=0;vel=[0,0,0];return true;
}
function fieldRepairContext8G(){
 const c=assemblyContext8G(),ship=vehicleStore.get('ship');
 return{...c,available:physical8a.list().filter(a=>
  StarfallFieldRepair8G.REPAIRS[a.type]&&a.location?.kind==='surface'&&
  a.location.bodyId===c.bodyId&&a.condition<.999).map(a=>({
   id:a.id,type:a.type,condition:a.condition,
   replacement:StarfallFieldRepair8G.REPAIRS[a.type].part,
   workJ:StarfallFieldRepair8G.REPAIRS[a.type].workJ})),
  sourceContainerId:StarfallMining8D.SHIP,shipPowered:!!ship.state.powerEnabled};
}
function fieldRepair8G(assetId){
 const c=fieldRepairContext8G(),asset=physical8a.get(assetId),ship=vehicleStore.get('ship');
 if(!asset||!StarfallFieldRepair8G.REPAIRS[asset.type])throw Error('Select an actual manufactured frame, dry stage, or habitat envelope');
 if(manufacturedOccupied8G||truckOccupied||shipWalking8e||
  !c.landed||!c.eva||!c.powered||!shipLocal||!evaLocal||shipBody!==nearest)
  throw Error('A landed powered ship and astronaut EVA are required for field repairs');
 const old=physical8a.serialize(),seq=(asset.state?.fieldRepairs8g?.length||0)+1;
 let n=seq,jobId='repair8g:'+asset.id+':'+n;
 while(asset.state?.fieldRepairs8g?.some(x=>x.jobId===jobId)){n++;jobId='repair8g:'+asset.id+':'+n;}
 const workJ=StarfallFieldRepair8G.REPAIRS[asset.type].workJ;
 if(ship.state.energyJ<workJ)throw Error('Not enough real ship energy for replacement-part repair');
 const result=StarfallFieldRepair8G.operate({assetId,asset,jobId,materials:materials8a.snapshot(),
  physical:old,containerId:StarfallMining8D.SHIP,bodyId:c.bodyId,bodyRadius:nearest.radius,
  shipLocal,evaLocal,landed:c.landed,eva:c.eva,shipPowered:c.powered,
  powerReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:workJ}});
 const checkedMaterials=StarfallMaterials8A.create(result.materials);
 const checkedPhysical=StarfallPhysical8A.create(result.physical);
 const latest=vehicleStore.get('ship');
 if(latest.state.energyJ<workJ)throw Error('Ship battery debit unavailable');
 materials8a=checkedMaterials;physical8a=checkedPhysical;
 vehicleStore.update('ship',{...latest.state,energyJ:latest.state.energyJ-workJ});
 saveFlight();showToast('8G · paid field repair '+assetId+'; damaged component returned as scrap');
 return result.receipt;
}
function airFractionationContext8G(){
 const c=assemblyContext8G(),ship=vehicleStore.get('ship');
 const all=physical8a.list(),local=all.filter(x=>x.location?.kind==='surface'&&x.location.bodyId===c.bodyId);
 return {...c,plantIds:local.filter(x=>x.type==='industrial_plant'&&
   x.state?.station==='air_fractionation'&&x.condition>=.5&&x.state?.enabled===true)
   .map(x=>x.id),
  vesselIds:local.filter(x=>x.type==='industrial_vessel'&&x.state?.materialId==='nitrogen'&&
   x.condition>=.5).map(x=>x.id),
  powerEnabled:!!ship.state.powerEnabled};
}
function airFractionationInput8G(plantId,vesselId,jobId){
 const c=airFractionationContext8G(),vessel=physical8a.get(vesselId),body=nearest;
 if(!c.landed||!c.eva||!c.powered||!body?.landable||body.kind!=='planet'||
    shipBody!==body||!shipLocal||!evaLocal||manufacturedOccupied8G||truckOccupied||
    shipWalking8e)throw Error('Nitrogen collection requires landed ship and powered nearby EVA on a planet');
 return {jobId,plantId,vesselId,outputContainerId:vessel?.state?.containerId,
  bodyId:body.id,body,galaxy,physical:physical8a.serialize(),
  materials:materials8a.snapshot(),shipLocal,evaLocal,bodyRadius:body.radius,
  shipLanded:c.landed,operatorEVA:c.eva,shipPowered:c.powerEnabled,
  energyReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
   status:'COMMITTED',usedJ:StarfallAirFractionation8G.WORK_J}};
}
function airFractionationQuote8G(plantId,vesselId){
 const c=airFractionationContext8G();
 const q=atmosphere8g.quote(airFractionationInput8G(plantId,vesselId,'air8g:preview'));
 return {...q,powered:c.energyJ>=q.energyJ};
}
function airFractionationCollect8G(plantId,vesselId){
 const c=airFractionationContext8G(),workJ=StarfallAirFractionation8G.WORK_J;
 if(c.energyJ<workJ)throw Error('Insufficient 810 kJ real ship-battery work for compression');
 const prev=atmosphere8g.snapshot();let n=prev.harvests.length+1;
 while(prev.harvests.some(h=>h.id==='air8g:'+n)||materials8a.inventory().some(l=>l.id==='nitrogen:air8g:'+n))n++;
 const jobId='air8g:'+n;
 const result=atmosphere8g.capture(airFractionationInput8G(plantId,vesselId,jobId));
 const checkedMaterials=StarfallMaterials8A.create(result.materials),
   checkedAtmosphere=StarfallAirFractionation8G.create(result.atmosphere),
   ship=vehicleStore.get('ship');
 if(ship.state.energyJ<workJ)throw Error('Ship energy changed before air separation commit');
 materials8a=checkedMaterials;atmosphere8g=checkedAtmosphere;
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-workJ});
 saveFlight();
 showToast('8G · '+result.receipt.nitrogenKg.toFixed(2)+' kg modeled N₂ stored in rated vessel; 810 kJ paid');
 return result.receipt;
}
function habitatHoseContext8G(){
 const ctx=assemblyContext8G(),all=physical8a.list();
 const nearby=all.filter(x=>x.type==='industrial_vessel'&&x.condition>=.8&&
  (x.location?.kind==='surface'&&x.location.bodyId===ctx.bodyId||
   x.location?.kind==='ship'&&x.location.slot==='engineering-gas-cradle'));
 return {...ctx,habitats:all.filter(x=>x.type==='habitat_envelope'&&
  x.location?.kind==='surface'&&x.location.bodyId===ctx.bodyId&&
  !x.state?.habitatCharge8g&&!(x.state?.pressurePa>0))
  .map(x=>({id:x.id,condition:x.condition,location:x.location})),
  oxygenVessels:nearby.filter(x=>x.state?.materialId==='oxygen')
    .map(x=>({id:x.id,location:x.location})),
  nitrogenVessels:nearby.filter(x=>x.state?.materialId==='nitrogen')
    .map(x=>({id:x.id,location:x.location}))};
}
function habitatHoseInput8G(assetId,oxygenVesselId,nitrogenVesselId,jobId){
 const ctx=habitatHoseContext8G(),ship=vehicleStore.get('ship');
 if(!ctx.landed||!ctx.eva||!ctx.powered||!shipLocal||!evaLocal||
  !nearest?.radius||shipBody!==nearest||manufacturedOccupied8G||
  truckOccupied||shipWalking8e)
  throw Error('Landed powered ship, on-foot EVA and a clear nearby habitat are required');
 return {jobId,habitatId:assetId,oxygenVesselId,nitrogenVesselId,
  bodyId:ctx.bodyId,bodyRadius:nearest.radius,shipLocal,evaLocal,
  shipLanded:ctx.landed,operatorEVA:ctx.eva,shipPowered:ctx.powered,
  physical:physical8a.serialize(),materials:materials8a.snapshot(),
  assembly:vehicleAssembly8g.snapshot(),shipContainerId:StarfallMining8D.SHIP,
  powerReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:StarfallHabitatHose8G.WORK_J}};
}
function habitatHoseQuote8G(assetId,oxygenVesselId,nitrogenVesselId){
 const ctx=habitatHoseContext8G();
 const result=StarfallHabitatHose8G.preview(
   habitatHoseInput8G(assetId,oxygenVesselId,nitrogenVesselId,'habhose8g:preview'));
 return {...result,powered:ctx.energyJ>=result.workJ};
}
function habitatHoseTransfer8G(assetId,oxygenVesselId,nitrogenVesselId){
 const ctx=habitatHoseContext8G(),cost=StarfallHabitatHose8G.WORK_J;
 if(ctx.energyJ<cost)throw Error('1.5 MJ ship regulator/compressor work is required');
 const jobId='habhose8g:'+assetId+':1';
 const result=StarfallHabitatHose8G.transfer(
  habitatHoseInput8G(assetId,oxygenVesselId,nitrogenVesselId,jobId));
 const nextMaterials=StarfallMaterials8A.create(result.materials),
  nextPhysical=StarfallPhysical8A.create(result.physical),
  ship=vehicleStore.get('ship');
 if(ship.state.energyJ<cost)throw Error('Ship energy changed before hose transfer commit');
 materials8a=nextMaterials;physical8a=nextPhysical;
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-cost});
 saveFlight();
 showToast('8G · RATED HOSE '+assetId+' · '+result.diagnostics.pressureKPa.toFixed(1)+
  ' kPa from REAL VESSELS · NO CREW SAFETY APPROVAL');
 return result.receipt;
}
function habitatChargeContext8G(){
 const c=assemblyContext8G();
 return {...c,habitats:physical8a.list().filter(a=>a.type==='habitat_envelope'&&
  a.location?.kind==='surface'&&a.location.bodyId===c.bodyId)
  .map(a=>({id:a.id,condition:a.condition,
   charged:!!a.state?.habitatCharge8g,pressureKPa:(a.state?.pressurePa||0)/1000}))};
}
function habitatChargeInput8G(assetId,jobId){
 const c=habitatChargeContext8G();
 if(!c.landed||!c.eva||!c.powered||!shipLocal||!evaLocal||
   !nearest?.radius||shipBody!==nearest||manufacturedOccupied8G||truckOccupied||shipWalking8e)
  throw Error('A powered landed ship and nearby astronaut EVA are required');
 return {jobId,assetId,bodyId:c.bodyId,containerId:StarfallMining8D.SHIP,
  materials:materials8a.snapshot(),physical:physical8a.serialize(),assembly:vehicleAssembly8g.snapshot(),
  bodyRadius:nearest.radius,shipLocal,evaLocal,
  shipLanded:c.landed,operatorEVA:c.eva,shipPowered:c.powered,
  powerReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:StarfallHabitatCharge8G.WORK_J}};
}
function habitatChargeQuote8G(assetId){
 const c=habitatChargeContext8G(),q=StarfallHabitatCharge8G.quote(
  habitatChargeInput8G(assetId,'habcharge8g:preview'));
 return {...q,powered:c.energyJ>=q.workJ};
}
function habitatCharge8G(assetId){
 const c=habitatChargeContext8G();
 if(c.energyJ<StarfallHabitatCharge8G.WORK_J)
  throw Error('Ship battery lacks 1.2 MJ of charge/compressor energy');
 const jobId='habcharge8g:'+assetId+':1',input=habitatChargeInput8G(assetId,jobId);
 const result=StarfallHabitatCharge8G.charge(input);
 const newMaterials=StarfallMaterials8A.create(result.materials);
 const newPhysical=StarfallPhysical8A.create(result.physical);
 const ship=vehicleStore.get('ship');
 if(ship.state.energyJ<StarfallHabitatCharge8G.WORK_J)
  throw Error('Ship battery changed before physical charging commit');
 materials8a=newMaterials;physical8a=newPhysical;
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-StarfallHabitatCharge8G.WORK_J});
 saveFlight();
 showToast('8G · finite O₂/N₂/water installed in '+assetId+' · '+
   result.diagnostics.pressureKPa.toFixed(1)+' kPa · NO life-support approval');
 return result.receipt;
}
function structureAssemblyContext8G(){
 const c=assemblyContext8G();
 return {...c,pads:physical8a.list().filter(a=>a.type==='industrial_plant'&&
  ['rocket_integration','habitat_pad'].includes(a.state?.station)&&
  a.location?.kind==='surface'&&a.location.bodyId===c.bodyId&&a.condition>=.5&&
  a.state?.enabled!==false).map(a=>({id:a.id,station:a.state.station}))};
}
function structuralBuildSite8G(blueprintId,facilityId){
 const ctx=structureAssemblyContext8G(),def=StarfallStructureAssembly8G.BLUEPRINTS[blueprintId];
 if(!def)throw Error('Unknown physical rocket/habitat construction blueprint');
 if(!ctx.landed||!ctx.eva||!ctx.powered||!shipLocal||!evaLocal||!nearest?.radius||
    shipBody!==nearest||manufacturedOccupied8G||truckOccupied)
   throw Error('Exit a powered landed spacecraft on EVA to operate the structure bay');
 const pad=physical8a.get(facilityId);
 if(!pad||pad.type!=='industrial_plant'||pad.state?.station!==def.station||
  pad.location?.kind!=='surface'||pad.location.bodyId!==ctx.bodyId||
  pad.condition<.5||pad.state?.enabled===false)
  throw Error('A paid, installed and healthy rocket/habitat integration pad is required on this world');
 const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a),V.norm(b)))))*nearest.radius;
 if(arc(evaLocal,pad.location.local)>48||arc(shipLocal,pad.location.local)>78)
  throw Error('Operator must stay within 48 surface units of the pad and ship within 78');
 const objects=physical8a.list().filter(a=>a.location?.kind==='surface'&&a.location.bodyId===ctx.bodyId);
 const siteItems=window.StarfallOutpostUI?.store?.items||[];
 for(const [front,right] of [[35,0],[-35,0],[0,35],[0,-35],[44,8],[-44,-8],[8,44],[-8,-44]]){
  const local=tangentOffsetLocal(nearest,pad.location.local,shipForwardVec||forward,front,right);
  if(arc(local,shipLocal)>82||arc(local,evaLocal)>65||arc(local,shipLocal)<38)continue;
  if(objects.some(a=>Array.isArray(a.location.local)&&
      arc(local,a.location.local)<def.minimumClearanceScene+
      (a.type==='industrial_plant'?9:a.type==='habitat_envelope'?14:a.type==='rocket_stage_dry'?9:7)))
   continue;
  if(siteItems.some(a=>a.bodyId===ctx.bodyId&&Array.isArray(a.local)&&
      arc(local,a.local)<def.minimumClearanceScene+
      (window.StarfallOutposts?.SPECS?.[a.kind]?.radius||8)))continue;
  return local;
 }
 throw Error('No physically clear integration footprint near pad, EVA or ship; relocate equipment');
}
function structureQuote8G(blueprintId,facilityId){
 const ctx=structureAssemblyContext8G(),spec=StarfallStructureAssembly8G.BLUEPRINTS[blueprintId],
  local=structuralBuildSite8G(blueprintId,facilityId);
 const quote=StarfallStructureAssembly8G.create(vehicleAssembly8g.snapshot()).quote({
  jobId:'structure8g:preview',blueprintId,facilityId,bodyId:ctx.bodyId,
  containerId:StarfallMining8D.SHIP,local,materials:materials8a.snapshot(),
  physical:physical8a.serialize(),
  energyReceipt:{operationId:'structure8g:preview',status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}});
 return {...quote,powered:ctx.energyJ>=spec.workJ,siteLocal:local};
}
function structureStage8G(blueprintId,facilityId){
 const quote=structureQuote8G(blueprintId,facilityId),ctx=structureAssemblyContext8G(),
   spec=StarfallStructureAssembly8G.BLUEPRINTS[blueprintId];
 if(!quote.ready)throw Error('Missing real rocket/habitat parts: '+
  quote.shortages.map(x=>x.materialId+' '+x.missingKg.toFixed(2)+' kg').join(', '));
 if(!quote.powered)throw Error('Ship battery must supply '+spec.workJ+' J installation power');
 const all=physical8a.serialize();let n=1;
 while(all.assets.some(a=>a.id==='structure8g:'+n)||
   vehicleAssembly8g.snapshot().receipts.some(x=>x.id==='structure8g:'+n))n++;
 const jobId='structure8g:'+n;
 const result=StarfallStructureAssembly8G.create(vehicleAssembly8g.snapshot()).stage({
  jobId,blueprintId,facilityId,bodyId:ctx.bodyId,local:quote.siteLocal,
  containerId:StarfallMining8D.SHIP,materials:materials8a.snapshot(),physical:all,
  energyReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}});
 const checkedMaterials=StarfallMaterials8A.create(result.materials);
 const checkedPhysical=StarfallPhysical8A.create(result.physical);
 const ship=vehicleStore.get('ship');
 if(ship.state.energyJ<spec.workJ)throw Error('Ship energy changed before structural assembly commit');
 materials8a=checkedMaterials;physical8a=checkedPhysical;
 vehicleAssembly8g=StarfallVehicleAssemblyContract8G.create(result.assembly);
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-spec.workJ});
 saveFlight();showToast('8G · '+blueprintId+' physical unqualified structure '+jobId+
  ' · not operational until pressure / propulsion validation');
 return result.receipt;
}
function gasVesselCargoContext8G(){
 const c=assemblyContext8G(),s=physical8a.serialize();
 return {...c,vessels:s.assets.filter(a=>a.type==='industrial_vessel'&&
  ['nitrogen','oxygen','hydrogen','methane','carbon_dioxide'].includes(a.state?.materialId)&&
  (a.location?.kind==='surface'&&a.location.bodyId===c.bodyId||
   a.location?.kind==='ship'&&a.location.slot===StarfallGasVesselCargo8G.LIMIT.slot))
  .map(a=>({id:a.id,materialId:a.state.materialId,location:a.location,
    dryMassKg:a.massKg,gasKg:materials8a.inventory(a.state.containerId)
     .reduce((v,l)=>v+l.massKg,0)}))};
}
function gasVesselCargoTransfer8G(action,assetId){
 const c=gasVesselCargoContext8G(),ship=vehicleStore.get('ship'),assets=physical8a.serialize(),
  workJ=StarfallGasVesselCargo8G.LIMIT.workJ;
 if(!c.landed||!c.eva||!c.powered||!shipLocal||!evaLocal||!nearest?.radius||
   shipBody!==nearest||manufacturedOccupied8G||truckOccupied||shipWalking8e)
  throw Error('Exit a powered landed ship on EVA to handle rated nitrogen/oxygen vessels');
 if(ship.state.energyJ<workJ)throw Error('Ship engineering battery lacks 90 kJ of gantry power');
 let unloadLocal=null;
 if(action==='unload'){
  const arc=local=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(local),V.norm(shipLocal)))))*nearest.radius;
  const near=local=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(local),V.norm(evaLocal)))))*nearest.radius;
  for(const [front,right] of [[28,0],[0,28],[-28,0],[0,-28],[38,10],[-38,-10]]){
   const candidate=outpostOffset(front,right);
   if(arc(candidate)>60||arc(candidate)<26||near(candidate)>35)continue;
   if(assets.assets.some(a=>a.id!==assetId&&a.location?.kind==='surface'&&
      a.location.bodyId===c.bodyId&&Array.isArray(a.location.local)&&
      Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(a.location.local),V.norm(candidate)))))*
      nearest.radius<StarfallGasVesselCargo8G.LIMIT.minSeparationScene))continue;
   unloadLocal=candidate;break;
  }
  if(!unloadLocal)throw Error('No collision-free gantry unloading site within EVA range');
 }
 let counter=assets.transfers.filter(t=>t.id?.startsWith('gasCargo8g:')).length+1;
 while(assets.transfers.some(t=>t.id==='gasCargo8g:'+counter))counter++;
 const jobId='gasCargo8g:'+counter;
 const result=StarfallGasVesselCargo8G.transfer({jobId,assetId,action,bodyId:c.bodyId,
  shipLocal,evaLocal,bodyRadius:nearest.radius,shipLanded:c.landed,
  operatorEVA:c.eva,shipPowered:c.powered,physical:assets,materials:materials8a.snapshot(),
  unloadLocal,powerReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
   usedJ:workJ,status:'COMMITTED'}});
 const verifiedPhysical=StarfallPhysical8A.create(result.physical),
  verifiedMaterials=StarfallMaterials8A.create(result.materials);
 if(vehicleStore.get('ship').state.energyJ<workJ)throw Error('Energy changed before vessel custody commit');
 physical8a=verifiedPhysical;materials8a=verifiedMaterials;
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-workJ});
 saveFlight();
 showToast('8G · '+action.toUpperCase()+' RATED '+result.receipt.containedGasKg.toFixed(2)+
  ' kg '+physical8a.get(assetId).state.materialId+' on physical vessel · 90 kJ paid');
 return result.receipt;
}
function frameCargoContext8G(){
 const c=outpostContext(),ship=vehicleStore.get('ship');
 return {bodyId:c.bodyId,landed:!!c.landed&&shipBody===c.body,
  eva:!!c.eva&&!truckOccupied&&!shipWalking8e,enabled:!!ship.state.powerEnabled,
  energyJ:ship.state.energyJ,
  frames:physical8a.list().filter(a=>a.type==='vehicle_frame'&&
    (a.location?.kind==='ship'&&a.location.slot===StarfallFrameCargo8G.LIMIT.slot||
     a.location?.kind==='surface'&&a.location.bodyId===c.bodyId))
   .map(a=>({id:a.id,massKg:a.massKg,location:a.location}))};
}
function frameCargoTransfer8G(action,assetId){
 const c=frameCargoContext8G(),ship=vehicleStore.get('ship'),all=physical8a.serialize(),asset=physical8a.get(assetId);
 if(!c.landed||!c.eva||!c.enabled||!shipLocal||!evaLocal||!nearest?.radius)
  throw Error('A powered landed ship and astronaut EVA are required');
 if(!asset||asset.type!=='vehicle_frame')throw Error('Select a manufactured physical frame');
 if(ship.state.energyJ<StarfallFrameCargo8G.LIMIT.workJ)
  throw Error('Ship engineering battery has insufficient winch energy');
 let unloadLocal=null;
 if(action==='unload'){
  // Actual visible frame must not spawn in the ship ramp, factory or other
  // owned asset: sample first unobstructed spot near the astronaut.
  for(const [front,right] of [[18,0],[0,18],[-18,0],[0,-18],[24,10],[-24,-10]]){
   const candidate=outpostOffset(front,right);
   const minArc=local=>Math.acos(Math.max(-1,Math.min(1,V.dot(V.norm(candidate),V.norm(local)))))*nearest.radius;
   if(minArc(shipLocal)<24||all.assets.some(a=>a.id!==assetId&&a.location?.kind==='surface'&&
     a.location.bodyId===c.bodyId&&Array.isArray(a.location.local)&&minArc(a.location.local)<16))continue;
   unloadLocal=candidate;break;
  }
  if(!unloadLocal)throw Error('No clear nearby frame unloading bay');
 }
 const n=all.transfers.filter(t=>t.id?.startsWith('frameCargo8g:')).length+1;
 let counter=n;while(all.transfers.some(t=>t.id==='frameCargo8g:'+counter))counter++;
 const jobId='frameCargo8g:'+counter,workJ=StarfallFrameCargo8G.LIMIT.workJ;
 const result=StarfallFrameCargo8G.transfer({jobId,assetId,action,physical:all,materials:materials8a.snapshot(),bodyId:c.bodyId,
  shipLocal,evaLocal,bodyRadius:nearest.radius,shipLanded:c.landed,operatorEVA:c.eva,
  unloadLocal,powerReceipt:{operationId:jobId,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:workJ}});
 const next=StarfallPhysical8A.create(result.physical);
 physical8a=next;vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-workJ});
 saveFlight();showToast('8G · FRAME '+action.toUpperCase()+' · paid '+workJ+' J · '+assetId);
 return result.receipt;
}
function industrialEquipment8E(reactionId,assetId){
 const recipe=StarfallIndustrialChemistry8E.reactions[reactionId];
 if(!recipe)throw Error('Unknown chemical reaction');
 const selected=physical8a.get(assetId);
 if(selected?.type!=='industrial_plant'||selected.state?.station!==recipe.station||
   selected.condition<.5||selected.location.kind!=='surface')
  throw Error('Install a real '+recipe.station+' station before processing');
 const vessels={},destinations={},reactantSources={},reactantAssetIds={};
 for(const materialId of Object.keys(recipe.input)){
  if(StarfallIndustrialChemistry8E.species[materialId]?.phase!=='gas')continue;
  const v=physical8a.list().find(a=>a.type==='industrial_vessel'&&a.condition>=.5&&
   a.state?.materialId===materialId&&a.location?.kind==='surface'&&
   a.location.bodyId===selected.location.bodyId&&
   Math.acos(Math.max(-1,Math.min(1,a.location.local.reduce((sum,n,i)=>sum+n*selected.location.local[i],0))))*
    (nearest?.radius||1)<75);
  if(!v)throw Error('Install a nearby rated '+materialId+' reactant supply vessel');
  reactantSources[materialId]=v.state.containerId;
  reactantAssetIds[materialId]=v.id;
 }
 for(const [materialId,count] of Object.entries(recipe.output)){
  if(StarfallIndustrialChemistry8E.species[materialId].phase!=='gas'){
   destinations[materialId]=StarfallMining8D.SHIP;continue;
  }
  const v=physical8a.list().find(a=>a.type==='industrial_vessel'&&a.condition>=.5&&
   a.state?.materialId===materialId&&a.location?.kind==='surface'&&
   a.location.bodyId===selected.location.bodyId&&
   Math.acos(Math.max(-1,Math.min(1,a.location.local.reduce((sum,n,i)=>sum+n*selected.location.local[i],0))))*
     (nearest?.radius||1)<75);
  if(!v)throw Error('Build a compatible nearby '+materialId+' gas pressure vessel');
  vessels[materialId]=v.id;destinations[materialId]=v.state.containerId;
 }
 return {asset:selected,station:{id:selected.id,kind:recipe.station,condition:selected.condition,
  installed:true,enabled:selected.state.enabled!==false,bodyId:selected.location.bodyId,
  sourceContainerId:StarfallMining8D.SHIP,tools:selected.state.tools,physicalAssetId:selected.id,
  vesselAssetIds:vessels,reactantAssetIds},destinations,reactantSources};
}
function industrialCandidates8E(){return physical8a.list().filter(a=>a.type==='industrial_plant'&&
 a.location?.kind==='surface'&&a.location.bodyId===nearest?.id).map(a=>({
 id:a.id,station:a.state?.station,bodyId:a.location.bodyId}));}
function industrialQuote8E(reactionId,stationId,scaleMol=100){
 const c=refineryContext8E(),r=StarfallIndustrialChemistry8E.batch(reactionId,scaleMol);
 const equipment=industrialEquipment8E(reactionId,stationId);
 if(!c.shipLanded||c.bodyId!==equipment.asset.location.bodyId)
  throw Error('Ship must be landed on same world as chemical plant');
 if(!shipLocal||Math.acos(Math.max(-1,Math.min(1,
  shipLocal.reduce((a,v,i)=>a+v*equipment.asset.location.local[i],0))))*nearest.radius>80)
  throw Error('Station outside ship electrical umbilical');
 const id='preview8e:temporary';
 StarfallIndustrialPlant8E.create(industrialPlant8e.snapshot()).process({
  id,reactionId,scaleMol,materials:materials8a.snapshot(),sourceContainerId:StarfallMining8D.SHIP,
  destinations:equipment.destinations,reactantSources:equipment.reactantSources,
  assetState:physical8a.serialize(),station:equipment.station,
  energyReceipt:{operationId:id,sourceId:'quote-only-not-debited',usedJ:r.energyJ},bodyId:c.bodyId});
 return {...r,stationId,destinations:equipment.destinations};
}
function industrialStart8E(reactionId,stationId,scaleMol=100){
 if(industrialJob8e.active)throw Error('Complete or cancel the current chemical job');
 const c=refineryContext8E();
 if(!c.operatorNear||!c.powerEnabled)throw Error('Use powered landed ship/nearby EVA service');
 const q=industrialQuote8E(reactionId,stationId,scaleMol);
 if(!c.energyJ||c.energyJ<100)throw Error('No ship electrical energy');
 industrialJob8e.serial++;
 industrialJob8e.active={schema:1,id:'chem8e:'+industrialJob8e.serial,
  reactionId,stationId,scaleMol,bodyId:c.bodyId,elapsedS:0,energyJ:0,
  seconds:q.seconds,powerW:q.powerW};
 saveFlight();return JSON.parse(JSON.stringify(industrialJob8e.active));
}
function industrialCancel8E(){
 if(!industrialJob8e.active)return false;
 industrialJob8e.active=null;saveFlight();return true;
}
function industrialAdvance8E(elapsed){
 const a=industrialJob8e.active;if(!a)return;
 const c=refineryContext8E();
 if(!c.shipLanded||!c.powerEnabled||c.bodyId!==a.bodyId)return;
 try{
  const selected=industrialEquipment8E(a.reactionId,a.stationId);
  if(!shipLocal||Math.acos(Math.max(-1,Math.min(1,
    shipLocal.reduce((sum,v,i)=>sum+v*selected.asset.location.local[i],0))))*
      (nearest?.radius||1)>80)return; // Physical power umbilical disconnected; preserve paid work.
  const ship=vehicleStore.get('ship');
  const delta=Math.min(10,Math.max(0,elapsed),a.seconds-a.elapsedS,ship.state.energyJ/a.powerW);
  if(delta>0){
   a.elapsedS+=delta;a.energyJ+=delta*a.powerW;
   vehicleStore.update('ship',{...ship.state,energyJ:Math.max(0,ship.state.energyJ-delta*a.powerW)});
   industrialSaveSeconds8E+=delta;
  }
  if(a.elapsedS+1e-7>=a.seconds){
   const result=StarfallIndustrialPlant8E.create(industrialPlant8e.snapshot()).process({
    id:a.id,reactionId:a.reactionId,scaleMol:a.scaleMol,materials:materials8a.snapshot(),
    sourceContainerId:StarfallMining8D.SHIP,destinations:selected.destinations,
    reactantSources:selected.reactantSources,
    assetState:physical8a.serialize(),station:selected.station,bodyId:a.bodyId,
    energyReceipt:{operationId:a.id,sourceId:'ship-main:engineering-battery',usedJ:a.energyJ}});
   materials8a=StarfallMaterials8A.create(result.materials);
   industrialPlant8e=StarfallIndustrialPlant8E.create(result.operations);
   industrialJob8e.active=null;saveFlight();industrialSaveSeconds8E=0;
   showToast('8E · '+a.reactionId+' complete; products captured in physical storage');
  }else if(industrialSaveSeconds8E>=2){saveFlight();industrialSaveSeconds8E=0;}
 }catch(e){console.warn('Industrial chemistry paused; no reagent was consumed',e);}
}
function factoryMachine8F(recipeId){
 const r=StarfallManufacturing8F.RECIPES[recipeId];if(!r)throw Error('Unknown 8F part recipe');
 if(r.station==='bench'&&['hand-shear','bending-brake','glass-cutter'].includes(r.tool)&&
  modularShip8e.describe('fabrication').status==='INSTALLED')
  return {id:'ship-main:fabrication:low-tech-bench',station:'bench',
    tools:['hand-shear','bending-brake','glass-cutter'],installed:true,condition:1};
 // The already installed fabrication room also contains a basic assembly jig.
 // It can fit certified complete components into one kit but cannot make chips,
 // motors, furnaces or metals from nothing.
 if(r.station==='assembly'&&r.tool==='kit-fixture'&&
  modularShip8e.describe('fabrication').status==='INSTALLED')
  return {id:'ship-main:fabrication:kit-fixture',station:'assembly',
   tools:['kit-fixture'],installed:true,condition:1};
 // Pre-existing wire die in the already installed ship fabrication workshop.
 // All other machine tools MUST have a real installed 8A physical asset.
 if(r.station==='wire'&&r.tool==='wire-die'&&modularShip8e.describe('fabrication').status==='INSTALLED')
  return {id:'ship-main:fabrication:wire-die',station:'wire',tools:['wire-die'],installed:true,condition:1};
 const installed=physical8a.list().find(asset=>
  asset.type==='industrial_machine'&&asset.location?.kind==='ship'&&
  asset.location.slot==='workshop'&&asset.state?.station===r.station&&
  asset.state?.tools?.includes(r.tool)&&asset.condition>=.5);
 if(!installed)throw Error('Install a physical '+r.station+' machine with '+r.tool+' tooling');
 return {id:installed.id,station:r.station,tools:installed.state.tools,installed:true,condition:installed.condition};
}
function machineKitQuotes8F(){
 const holder=StarfallMining8D.SHIP;
 return materials8a.inventory(holder).filter(l=>StarfallMachineInstall8F.CAPS[l.materialId]).map(l=>{
  try{return {lotId:l.id,...StarfallMachineInstall8F.quote({lotId:l.id,materials:materials8a.snapshot(),
   physical:physical8a.serialize(),containerId:holder}),ready:true};}
  catch(e){return {lotId:l.id,materialId:l.materialId,ready:false,reason:e.message};}
 });
}
function machineInstall8F(lotId){
 const ctx=refineryContext8E(),holder=StarfallMining8D.SHIP;
 if(!ctx.operatorNear||!ctx.shipLanded||!ctx.workshopInstalled||!ctx.powerEnabled)
  throw Error('Approach a landed, powered ship fabrication station');
 const q=StarfallMachineInstall8F.quote({lotId,materials:materials8a.snapshot(),
  physical:physical8a.serialize(),containerId:holder});
 const ship=vehicleStore.get('ship');
 if(ship.state.energyJ+1e-7<q.workJ)throw Error('Not enough ship battery for mechanical installation');
 const used=new Set(physical8a.list().map(a=>a.id));
 const installed=physical8a.serialize().transfers.filter(t=>t.action==='INSTALL').length;
 let serial=installed+1;while(used.has('machine8f:'+serial))serial++;
 const op='install8f:'+serial,assetId='machine8f:'+serial;
 const stage=StarfallMachineInstall8F.install({
  lotId,materials:materials8a.snapshot(),physical:physical8a.serialize(),
  containerId:holder,assetId,operationId:op,bodyId:ctx.bodyId,
  energyReceipt:{operationId:op,sourceId:'ship-main:engineering-battery',usedJ:q.workJ},
  operatorNear:ctx.operatorNear,workshopInstalled:ctx.workshopInstalled,
  shipLanded:ctx.shipLanded,shipPowerEnabled:ctx.powerEnabled});
 const m=StarfallMaterials8A.create(stage.materials),a=StarfallPhysical8A.create(stage.physical);
 materials8a=m;physical8a=a;
 vehicleStore.update('ship',{...ship.state,energyJ:ship.state.energyJ-q.workJ});
 saveFlight();
 showToast('8F · '+q.station+' machine installed from owned kit '+lotId);
 return stage.receipt;
}
function factoryContext8F(){
 const c=refineryContext8E();
 return {...c,active:factory8f.active,receipts:factory8f.receipts};
}
function factoryQuote8F(recipeId){
 return StarfallFactory8F.quote({recipeId,materials:materials8a.snapshot(),
  sourceContainerId:StarfallMining8D.SHIP,outputContainerId:StarfallMining8D.SHIP,
  machine:factoryMachine8F(recipeId)});
}
function factoryStart8F(recipeId){
 const c=factoryContext8F();
 if(!c.operatorNear)throw Error('Use the landed ship fabrication room or local EVA service terminal');
 const job=factory8f.start({recipeId,materials:materials8a.snapshot(),
  sourceContainerId:StarfallMining8D.SHIP,outputContainerId:StarfallMining8D.SHIP,
  machine:factoryMachine8F(recipeId),shipLanded:c.shipLanded,bodyId:c.bodyId,
  powerEnabled:c.powerEnabled,batteryJ:c.energyJ});
 saveFlight();return job;
}
function factoryCancel8F(){if(!factory8f.cancel())return false;saveFlight();return true;}
function factoryAdvance8F(elapsed){
 const a=factory8f.active;if(!a)return;
 const c=factoryContext8F(),enabled=c.shipLanded&&c.bodyId===a.bodyId&&c.workshopInstalled&&c.powerEnabled;
 if(!enabled)return;
 try{
  const machine=factoryMachine8F(a.recipeId);
  if(machine.id!==a.machineId)throw Error('Manufacturing machine removed mid-job');
  const ship=vehicleStore.get('ship');
  const step=factory8f.step(Math.min(elapsed,10),ship.state.energyJ,true);
  if(step.usedJ>0){
   vehicleStore.update('ship',{...ship.state,energyJ:Math.max(0,ship.state.energyJ-step.usedJ)});
   factorySaveSeconds8F+=Math.min(elapsed,10);
  }
  if(step.completed){
   const output=factory8f.commit({materials:materials8a.snapshot(),
    transformer:StarfallTransformation8E.create(transformation8e.snapshot()),machine});
   const check=StarfallMaterials8A.create(output.materials);
   materials8a=check;transformation8e=StarfallTransformation8E.create(output.transformations);
   factory8f.apply(output.factory);
   saveFlight();factorySaveSeconds8F=0;
   showToast('8F · '+output.receipt.partMassKg.toFixed(2)+' kg '+output.receipt.recipeId+' fabricated');
  }else if(factorySaveSeconds8F>=2){saveFlight();factorySaveSeconds8F=0;}
 }catch(error){console.warn('8F machine paused:',error);}
}
function miningContext8D(){
 const onWorld=landed&&!!nearest?.landable&&!!truckBody&&truckBody===nearest&&!!truckLocal&&cargo8b.mode==='ground';
 const truck=onWorld?truckWorldState():null,ship=shipBody===nearest?shipWorldState():null;
 const distanceToShip=truck&&ship?V.len(V.sub(truck.position,ship.position)):Infinity;
 const distanceToOperator=truck?V.len(V.sub(pos,truck.position)):Infinity;
 return {bodyId:nearest?.id||null,landed,truckPresent:!!truck,truckBodyId:truckBody?.id||null,
  shipBodyId:shipBody?.id||null,operatorNear:truckOccupied||(eva&&!interiorState&&!shipWalking8e&&distanceToOperator<=22),
  truckNearShip:distanceToShip<=65,truckIdle:!(truckOccupied&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('ArrowUp')||keys.has('ArrowDown'))),
  energyJ:truckBatteryJ,truckOccupied,truckLocal:truckLocal?[...truckLocal]:null,
  truckHopper:materials8a.used(StarfallMining8D.TRUCK),shipWarehouse:materials8a.used(StarfallMining8D.SHIP),
  active:mining8d.active,drillCondition:mining8d.toolCondition};
}
function miningDeposit8D(){
 const ctx=miningContext8D();return ctx.truckPresent?StarfallResources8C.site(nearest,truckLocal,GALAXY_SEED):null;
}
function miningStart8D(){
 const ctx=miningContext8D(),deposit=miningDeposit8D();
 if(!ctx.truckPresent||!deposit)throw Error('Park the drill truck on a mineral-bearing solid terrain sector');
 const surveyed=resources8c.observations().some(r=>r.siteId===deposit.id&&r.bodyId===ctx.bodyId);
 const result=mining8d.startDrill({deposit,surveyed,bodyId:ctx.bodyId,truckBodyId:ctx.truckBodyId,
  truckPresent:ctx.truckPresent,operatorNear:ctx.operatorNear,energyJ:truckBatteryJ,truckIdle:ctx.truckIdle});
 // Validate container capacity and geology before drawing any watt-hours.
 const next=StarfallMining8D.prepareContainers(StarfallMaterials8A.create(materials8a.snapshot()));
 const use=next.used(StarfallMining8D.TRUCK),max=StarfallMining8D.LIMITS;
 if(use.massKg+truckCargo+result.massKg>max.truckMassKg||use.volumeM3+result.massKg*result.volumeM3PerKg>max.truckVolumeM3||
   resources8c.remaining(deposit)<result.massKg){mining8d.cancel();throw Error('Deposit or truck hopper capacity too low for drilling batch');}
 saveFlight();return result;
}
function miningLoad8D(lotId,massKg=50){
 const ctx=miningContext8D(),lot=materials8a.inventory(StarfallMining8D.TRUCK).find(x=>x.id===lotId);
 if(!lot)throw Error('Choose an actual ore lot loaded in this truck hopper');
 if(massKg>lot.massKg+1e-6)throw Error('Requested mass exceeds the truck ore lot');
 const dst=materials8a.used(StarfallMining8D.SHIP);
 if(dst.massKg+massKg>StarfallMining8D.LIMITS.shipMassKg||dst.volumeM3+massKg*lot.volumeM3/lot.massKg>StarfallMining8D.LIMITS.shipVolumeM3)
 throw Error('Ship material cargo store is full');
 const result=mining8d.startLoad({lotId,massKg,bodyId:ctx.bodyId,truckBodyId:ctx.truckBodyId,
  shipBodyId:ctx.shipBodyId,truckNearShip:ctx.truckNearShip,operatorNear:ctx.operatorNear,
  truckIdle:ctx.truckIdle,energyJ:truckBatteryJ});
 saveFlight();return result;
}
function miningCancel8D(){if(!mining8d.cancel())return false;saveFlight();return true;}
function miningAdvance8D(dt){
 if(!mining8d.active)return;
 const ctx=miningContext8D(),active=mining8d.active;
 const canRun=ctx.truckPresent&&ctx.operatorNear&&ctx.truckIdle&&ctx.truckBodyId===active.bodyId&&
  (active.type==='DRILL'?miningDeposit8D()?.id===active.siteId:ctx.truckNearShip&&ctx.shipBodyId===active.bodyId);
 try{
  const result=mining8d.advance(Math.min(dt,.04),truckBatteryJ,{enabled:canRun});
  truckBatteryJ=Math.max(0,truckBatteryJ-result.usedJ);
  if(result.completed){
   // Both authoritative resources are validated on independent clones and
   // swapped only after the transaction succeeds; one SF.save persists all.
   const committed=mining8d.commit(materials8a,resources8c);
   materials8a=committed.materials;resources8c=committed.resources;
   // Preserve separately saved legacy truck payload; extracted ore is in 8A lots.
   saveFlight();showToast('8D · '+committed.operation.type+' completed · '+committed.operation.massKg+' kg stock conserved');
  }
 }catch(error){console.error('8D operation paused:',error);}
}
function truckSystems(){const truck=truckWorldState(),robot=roverWorldState(),body=nearest;
 if(!truck||!body)return{available:false};
 // When secured inside the spacecraft the truck has a ship-local cargo
 // pose but NO planet-fixed local radial direction. Do not use surface
 // terrain functions until the same persistent truck is unloaded.
 if(!truckLocal||!truckBody||truckBody!==body)
  return{available:false,stored:cargo8b.mode==='secured'||cargo8b.mode==='ramp',
   cargoMode:cargo8b.mode,assetId:START_TRUCK};
 const dist=robot&&roverBody===body?V.len(V.sub(truck.position,robot.position)):Infinity;
 const at=truckLocal,frontLocal=tangentOffsetLocal(body,at,truck.forward,25,0),elevation=groundHeight(frontLocal,body)-groundHeight(at,body);
 return{available:true,bodyId:body.id,batteryJ:truckBatteryJ,lights:truckLights,cargoKg:truckCargo+materials8a.used(StarfallMining8D.TRUCK).massKg,minedCargoKg:materials8a.used(StarfallMining8D.TRUCK).massKg,scienceRoverDistance:dist,winch:winch7d?{...winch7d}:null,service:StarfallFieldServiceT12.diagnosis({service:localServiceT12,health:vehicleStore.get('rover').state.health}),forwardSlopeDeg:Math.atan2(elevation,25)*180/Math.PI,terrain:StarfallBiomes.classify(body,at,groundHeight(at,body),Starfall3D.field(at,body.seed)).name};}
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
window.StarfallRuntime={galaxy,vehicleStore,truckDestination8B,plotTruckDestination8B,get physical8a(){return physical8a;},get materials8a(){return materials8a;},get resources8c(){return resources8c;},get atmosphere8g(){return atmosphere8g;},modularShip8e,mining8d,refinery8e,factory8f,industrialJob8e,industrialConstruction8E,industrialInstall8E,industrialCandidates8E,assemblyContext8G,assemblyQuote8G,assemblyStage8G,structureAssemblyContext8G,structureQuote8G,structureStage8G,airFractionationContext8G,airFractionationQuote8G,airFractionationCollect8G,habitatHoseContext8G,habitatHoseQuote8G,habitatHoseTransfer8G,habitatChargeContext8G,habitatChargeQuote8G,habitatCharge8G,fieldRepairContext8G,fieldRepair8G,activateManufactured8G,manufacturedWorld8G,enterManufactured8G,exitManufactured8G,get manufacturedOccupied8G(){return manufacturedOccupied8G;},gasVesselCargoContext8G,gasVesselCargoTransfer8G,frameCargoContext8G,frameCargoTransfer8G,industrialQuote8E,industrialStart8E,industrialCancel8E,machineKitQuotes8F,machineInstall8F,factoryContext8F,factoryQuote8F,factoryStart8F,factoryCancel8F,refineryContext8E,refineryQuote8E,refineryStart8E,refineryCancel8E,shipCargoMass8A,miningContext8D,miningDeposit8D,miningStart8D,miningLoad8D,miningCancel8D,get lifeSupport8e(){return StarfallLifeSupport8E.diagnostics(lifeSupport8e,
    vehicleStore.get('ship').state.powerEnabled?!!engineeringSystemReport.ship?.draws?.lifeSupport:true,
    modularShip8e.describe('life').level);},get shipWalking8e(){return shipWalking8e;},get shipWalkAt8e(){return {...shipWalkAt8e};},get cargo8b(){return{...cargo8b,pose:{...cargo8b.pose}};},captureScienceImage({body,eye,forward,up,size=512,caption='',wide=false}){
 if(!body||!Array.isArray(eye)||!Array.isArray(forward)||!Array.isArray(up))throw Error('Imaging requires a valid loaded camera position');
 return renderer.captureScience({eye,forward,up},body,{size,caption,wide});},assetPickView(){return{camera:lastPickingCamera?{...lastPickingCamera,fov:renderer.fov}:null,candidates:assetPickCandidates()};},engineeringAssetPoses(){return{
 shipPose:shipBody&&shipLocal?{bodyId:shipBody.id,systemId:shipBody.systemId,local:shipLocal}:null,
 roverPose:roverBody&&roverLocal?{bodyId:roverBody.id,systemId:roverBody.systemId,local:roverLocal}:null,
 truckPose:truckBody&&truckLocal?{bodyId:truckBody.id,local:truckLocal,batteryJ:truckBatteryJ}:null
};},enterInterior,enterCave,leaveInterior,get interiorState(){return interiorState?{...interiorState,at:{...interiorState.at}}:null;},outpostContext,outpostOffset,engineeringSystemReport:()=>engineeringSystemReport,renderStats:()=>({spaceWeather:window.StarfallSpaceWeatherLW06?.nearest(galaxy,pos,simTime,GALAXY_SEED)||null,debrisNearby:renderer.debrisRendered||0,debrisRisk:latestDebrisWarning,pixelRatio:renderer.pixelRatio,patchRebuilds:renderer.patchDraws,terrain:renderer.terrainDiagnostics(),meshCache:renderer.meshCache.size,ringCache:renderer.ringCache.size,infrastructureMeshes:renderer.infrastructure.size,renderedBodies:renderer.renderedBodies,culledBodies:renderer.culledBodies,visibleStars:renderer.starPoints,drawCalls:renderer.lastDrawCalls??null,galaxyCacheLoaded:galaxy.skyCatalog.filter(s=>!s.dormant).length}),configureVehicle,safeToReconfigure,equipmentSnapshotT15,restoreVehicleT15,persistVehicles,plotSurfaceWaypoint(bodyId,direction,name='Geothermal source'){
 const body=galaxy.byId.get(bodyId);
 if(!body?.landable||!Array.isArray(direction)||direction.length!==3||!direction.every(Number.isFinite))throw Error('Invalid geological surface waypoint');
 const directionUnit=V.norm(direction);if(V.len(directionUnit)<.99)throw Error('Invalid waypoint direction');
 siteWaypoint={planet:body,name:String(name).slice(0,80),dir:directionUnit};target=body;
 updateSurveyUI();showToast('Waypoint plotted: '+siteWaypoint.name+' — approach manually.');
 return{bodyId,direction:directionUnit};
},get target(){return target;},get nearest(){return nearest;},get time(){return simTime;},get engineering(){return engEnabled;},get attitude(){return engAttitude;},setAttitude(v){engAttitude=['Manual','Hold','Prograde','Retrograde'].includes(v)?v:'Manual';SF.save({scienceSettings:{schema:1,flightMode:engEnabled?'Engineering':'Assisted',sas:engAttitude}});},setFlightPhysicsMode,engineeringInfo,get ship(){return engState;},get scenePosition(){return pos;},get landed(){return landed;},get eva(){return eva;},get swimming(){return swimming;},get swimDepthM(){return swimming?swimDepthScene*1000:0;},get truckOccupied(){return truckOccupied;},scienceContext,acquireFieldReading,roverAutonomyPosition,roverDestination,driveRoverToward,science4SetPhysics,get science4Settings(){return{...science4Settings};},get roverPhysicsReport(){return roverPhysicsReport;},truckSystems,truckWinch,truckWinchCancel,truckRecharge,roverRechargeLocal,fieldServiceStatus,fieldRepair,shipServiceSnapshotT13,shipServiceTargetsT13,shipDockConnectT13,shipDockUndockT13,shipDockChargeT13,shipDockReceiveT13,shipThermalObserveT13,get truck(){return{occupied:truckOccupied,local:truckLocal,bodyId:truckBody?.id,batteryJ:truckBatteryJ,lights:truckLights,cargo:truckCargo};}};
Object.defineProperty(window,'STARFALL_DEBUG',{value:{galaxy,get state(){return{interior:interiorState?{siteId:interiorState.site.id,at:{...interiorState.at}}:null,position:[...pos],altitude,landed,eva,truckOccupied,roverOccupied:false,hatchCooldown,roverEntryCooldown,portraitLoaded:!!renderer.avatarParts?.body,avatarLoaded:!!renderer.avatarParts?.body,avatarDrawCalls:renderer.avatarDrawCalls,avatarAnimation:renderer.avatarAnimation,rampState:rampTransition?.kind||null,shipAhead:shipBody?V.dot(V.sub(pos,shipWorldState().position),shipWorldState().forward):null,shipSide:shipBody?V.dot(V.sub(pos,shipWorldState().position),V.norm(V.cross(shipWorldState().forward,shipWorldState().up))):null,walkedSinceExit,roverRange:roverBody&&roverWorldState()?V.len(V.sub(pos,roverWorldState().position)):null,warp,target:target.id,body:nearest.id,mode:nearPhase,fps,systems:galaxy.systems.length,worlds:galaxy.allWorlds.length,renderedBodies:renderer.renderedBodies,culledBodies:renderer.culledBodies,visibleStars:renderer.starPoints,catalogStars:galaxy.skyCatalog.length,loadedCatalogSystems:galaxy.skyCatalog.filter(s=>!s.dormant).length,effectPoints:renderer.effectsRendered,heat,spinAngle:nearest.spinAngle,cameraZoom:camDistance,cameraOrbit:[orbitYaw,orbitPitch],cameraLookElevationDeg:lastPickingCamera&&nearest?Math.asin(V.clamp(V.dot(lastPickingCamera.forward,V.norm(V.sub(pos,nearest.position))),-1,1))*180/Math.PI:null,timeScale,headlights,groundLocal:groundLocal&&[...groundLocal],cameraClearance:nearest?.landable?surfaceData(nearest,camEye||pos).distance-nearest.radius-surfaceData(nearest,camEye||pos).height:null,daylight:renderer.daylightLabel,sunElevation:nearest&&galaxy.byId.get(nearest.systemId)?V.dot(V.norm(V.sub(pos,nearest.position)),V.norm(V.sub(galaxy.byId.get(nearest.systemId).position,nearest.position))):null,patchRebuilds:renderer.patchDraws,terrain:renderer.terrainDiagnostics()};},placeEvaNearGasVessel8G(id){
 if(!landed||!eva||truckOccupied||manufacturedOccupied8G||!nearest?.landable)
  throw Error('Require landed EVA for test vessel proximity');
 const a=physical8a.get(id);
 if(!a||a.type!=='industrial_vessel'||a.location?.kind!=='surface'||a.location.bodyId!==nearest.id)
  throw Error('Require actual local gas-vessel asset');
 const b=nearest,local=tangentOffsetLocal(b,a.location.local,forward,0,-5),
  rad=V.norm(V.rot(local,b.spinAxis||[0,1,0],b.spinAngle||0));
 evaLocal=local;pos=V.add(b.position,V.mul(rad,b.radius+groundHeight(local,b)+EVA_HEIGHT));
 up=rad;roverEntryCooldown=0;roverExitMove=null;rampTransition=null;camEye=null;
},placeEvaNearRepairAsset8G(id){
 if(!landed||!eva||truckOccupied||manufacturedOccupied8G||!nearest?.landable)
  throw Error('Require unoccupied landed EVA for repair scenario');
 const a=physical8a.get(id);
 if(!a||!StarfallFieldRepair8G.REPAIRS[a.type]||
  a.location?.kind!=='surface'||a.location.bodyId!==nearest.id)
  throw Error('Missing same-world real damaged structure');
 const b=nearest,local=tangentOffsetLocal(b,a.location.local,forward,0,-5),
  rad=V.norm(V.rot(local,b.spinAxis||[0,1,0],b.spinAngle||0));
 evaLocal=local;pos=V.add(b.position,V.mul(rad,b.radius+groundHeight(local,b)+EVA_HEIGHT));
 up=rad;roverEntryCooldown=0;roverExitMove=null;rampTransition=null;camEye=null;
},placeEvaNearManufactured8G(id){
 if(!landed||!eva||truckOccupied||manufacturedOccupied8G||!nearest?.landable)
  throw Error('Require landed EVA and no occupied vehicle');
 const a=physical8a.get(id),w=manufacturedWorld8G(a);
 if(!a||!a.state?.operational||!w||w.body!==nearest)
  throw Error('Require an operational manufactured frame on this world');
 const local=tangentOffsetLocal(w.body,a.location.local,w.forward,0,-5),
  rad=V.norm(V.rot(local,w.body.spinAxis||[0,1,0],w.body.spinAngle||0));
 evaLocal=local;pos=V.add(w.body.position,V.mul(rad,w.body.radius+groundHeight(local,w.body)+EVA_HEIGHT));
 up=rad;evaForward=[...w.forward];roverEntryCooldown=0;roverExitMove=null;rampTransition=null;camEye=null;
},placeEvaNearTruck(){if(!landed||!eva||!truckBody||!truckLocal||truckBody!==nearest)throw Error('Require EVA and a surface truck');
 const local=tangentOffsetLocal(truckBody,truckLocal,truckForwardVec,0,-11),radial=V.rot(local,truckBody.spinAxis||[0,1,0],truckBody.spinAngle||0);
 evaLocal=local;pos=V.add(truckBody.position,V.mul(radial,truckBody.radius+groundHeight(local,truckBody)+EVA_HEIGHT));up=radial;evaForward=[...truckForwardVec];roverEntryCooldown=0;roverExitMove=null;rampTransition=null;camEye=null;},resetToOrbit(){pos=V.add(target.position,[0,300,-(target.radius+3550)]);vel=[0,0,0];forward=V.norm(V.sub(target.position,pos));up=[0,1,0];landed=false;groundLocal=null;camEye=null;},setTarget(id){const body=galaxy.byId.get(id);if(!body||!body.radius||!body.kind)throw Error('Unknown celestial target');target=body;},setPosition(next){if(!Array.isArray(next)||next.length!==3||!next.every(Number.isFinite))throw Error('Invalid position');pos=[...next];landed=false;groundLocal=null;camEye=null;},align(){pointTowardWaypoint();},setInteriorPosition(x,z){if(!interiorState||!(interiorState.kind==='cave'?window.StarfallGeologyLW02.canStand:StarfallInteriors.canStand)(interiorState.layout,x,z))throw Error('Not a valid interior floor coordinate');interiorState.at={x,z};const q=interiorWorld(interiorState.at);evaLocal=q.local;pos=q.position;up=q.up;camEye=null;},setCameraZoom(n){camDistance=V.clamp(Number(n),25,400);},setSimulationTime(t){if(!Number.isFinite(t)||t<0||t>=1e13)throw Error('Invalid simulation time');simTime=physicsClock.set(t);galaxy.update(simTime);},setTimeScale(t){if(![1,10,100].includes(t))throw Error('Expected 1,10,100');timeScale=t;},setHeadlights(on){headlights=!!on;}}});
})();
