/* STARFALL — single-scene, procedural multi-system navigation and physical landing.
 * All celestial positions are updated deterministically, and neither warp nor
 * surface contact changes HTML pages, cameras or rendering engines. */
(function(){'use strict';
const $=id=>document.getElementById(id),{Renderer,V,groundHeight}=Starfall3D;
const P=StarfallPhysics, FP=StarfallFlightPhysics;
const SEED_QUERY=new URLSearchParams(location.search).get('seed'),GALAXY_SEED=SEED_QUERY!==null?(Number(SEED_QUERY)>>>0):742,galaxy=StarfallGalaxy.generateGalaxy(GALAXY_SEED,64);
const first=galaxy.systems[0].planets[0];
let target=first,nearest=first,renderer;
try{renderer=new Renderer($('universe'),galaxy);}catch(error){console.error('STARFALL initialization:',error);$('fatal').hidden=false;$('boot').hidden=true;return;}
let simTime=0,pos=V.add(first.position,[0,300,-(first.radius+3550)]),vel=[0,0,0],forward=V.norm(V.sub(first.position,pos)),up=[0,1,0];
let landed=false,warp=false,camMode=0,camEye=null,camDistance=70,orbitYaw=0,orbitPitch=0,heat=0,solarWarning=false,timeScale=1,altitude=3500,vertical=0,fps=60,lastPlanetId='',nearPhase='DEEP SPACE',hudClock=0,frames=0,frameClock=0,lastTime=performance.now(),lastSave=0,toastTimer=0,landingTimer=0;
let siteWaypoint=null,scan=null,landingCapture=null,groundLocal=null,headlights=true;
let eva=false,evaLocal=null,evaForward=[...forward],shipLocal=null,shipForwardVec=[...forward],shipUpVec=[...up],shipBody=null;
let roverLocal=null,roverForwardVec=[...forward],roverBody=null,roverOccupied=false;
let hatchCooldown=0,walkedSinceExit=0,shipExitProgress=0,roverEntryCooldown=0,roverExitMove=null,shipIdleElapsed=0,rampTransition=null,rampLift=0;
let engEnabled=false,engState=null,engBody=null,engAttitude='Manual',engLast={dragN:0,heatingW:0,temperatureK:290},engSteps=0;
const physicsClock=new P.SimulationClock(0);
galaxy.physicsOrbits=StarfallOrbitBridge.attach(galaxy);
const SHIP_CLEARANCE=7.5,EVA_HEIGHT=2.6,EVA_BOARD_DISTANCE=32,ROVER_CLEARANCE=2.1,ROVER_BOARD_DISTANCE=13;
const scans=['Hydrology','Biosignatures','Geology'],keys=new Set();
const session=SF.load(),saved=session.flightGalaxy;
engEnabled=session.scienceSettings?.flightMode==='Engineering';
engAttitude=['Manual','Hold','Prograde','Retrograde'].includes(session.scienceSettings?.sas)?session.scienceSettings.sas:'Manual';
if(saved&&saved.seed===GALAXY_SEED&&Array.isArray(saved.position)&&saved.position.length===3&&saved.position.every(Number.isFinite)){
 try{simTime=Number(saved.time)||0;galaxy.update(simTime);if(saved.target?.startsWith('catalog-')){const sid=saved.target.replace(/-p\d+(?:-m\d+)?$|\-sun$/,'');const ss=galaxy.byId.get(sid);if(ss)galaxy.activate(ss);}target=galaxy.byId.get(saved.target)||first;galaxy.pinnedSystemId=target.systemId;nearest=galaxy.byId.get(saved.attached)||first;
  pos=saved.position.slice();forward=V.norm(saved.forward||forward);up=V.norm(saved.up||up);landed=!!saved.landed&&nearest.landable;
  if(engEnabled&&saved.engineering?.bodyId===nearest.id&&saved.engineering.rM?.length===3&&saved.engineering.vMS?.length===3){engState={rM:[...saved.engineering.rM],vMS:[...saved.engineering.vMS],craft:FP.shipState(saved.engineering.craft||{})};engBody=nearest.id;}
  if(landed&&Array.isArray(saved.groundDirection)){const dir=V.norm(saved.groundDirection);
   groundLocal=V.rot(dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(dir,nearest.radius+groundHeight(groundLocal,nearest)+SHIP_CLEARANCE));up=dir;
   shipBody=nearest;shipLocal=groundLocal?[...groundLocal]:null;shipForwardVec=[...forward];shipUpVec=[...up];}
 }catch(e){console.warn('Saved flight could not be restored:',e);}}
physicsClock.set(simTime);

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
 up=evacDir;vel=[0,0,0];eva=true;roverOccupied=false;camMode=0;camDistance=Math.min(camDistance,18);camEye=null;
 hatchCooldown=2;walkedSinceExit=0;roverEntryCooldown=2;shipIdleElapsed=0;
 showToast('EVA active · walk forward onto the rear cargo ramp to board · approach rover to drive');
}
function boardShip(){
 if(!eva||!shipBody||!shipLocal)return;
 const ship=shipWorldState();
 if(V.len(V.sub(pos,ship.position))>EVA_BOARD_DISTANCE){showToast('Move closer to the ship to board.');return;}
 eva=false;roverOccupied=false;rampTransition=null;rampLift=0;landed=true;nearest=shipBody;groundLocal=[...shipLocal];pos=[...ship.position];forward=V.norm(ship.forward);up=V.norm(ship.up);vel=[0,0,0];camEye=null;
 hatchCooldown=1.0;walkedSinceExit=0;shipIdleElapsed=0;showToast('Inside the ship · SPACE launch · hold S to walk back down the ramp');
}
function enterRover(){
 if(!eva||roverOccupied||!(roverBody&&roverLocal))return;
 const rover=roverWorldState();
 if(!rover||V.len(V.sub(pos,rover.position))>ROVER_BOARD_DISTANCE){showToast('Move closer to the rover.');return;}
 roverOccupied=true;pos=[...rover.position];evaForward=[...rover.forward];up=[...rover.up];camEye=null;camDistance=Math.max(camDistance,21);
 roverEntryCooldown=1.0;showToast('Rover engaged · WASD drive · click the ground beside it to walk away');
}
function exitRover(){
 if(!roverOccupied||!(roverBody&&roverLocal))return;
 const rover=roverWorldState(),axis=roverBody.spinAxis||[0,1,0];
 roverOccupied=false;
 const dismount=tangentOffsetLocal(roverBody,roverLocal,roverForwardVec,0,-5.0),dir=V.norm(V.rot(dismount,axis,roverBody.spinAngle||0));
 evaLocal=dismount;evaForward=[...(roverForwardVec||evaForward)];pos=V.add(roverBody.position,V.mul(dir,roverBody.radius+groundHeight(evaLocal,roverBody)+EVA_HEIGHT));up=dir;camEye=null;
 roverEntryCooldown=2.0;roverExitMove={from:roverLocal.slice(),to:evaLocal.slice(),progress:0};
 // First frame starts at the rover; the next frames visibly walk away to the ground.
 evaLocal=[...roverLocal];pos=[...rover.position];showToast('Walking away from rover');
}
function projectToScreen(point,camera){
 const rel=V.sub(point,camera.eye),view=M.look([0,0,0],V.sub(camera.target,camera.eye),camera.up),proj=M.perspective(renderer.fov,renderer.aspect,.35,2e8),vp=M.mul(proj,view),x=rel[0],y=rel[1],z=rel[2];
 const clipX=vp[0]*x+vp[4]*y+vp[8]*z+vp[12],clipY=vp[1]*x+vp[5]*y+vp[9]*z+vp[13],clipW=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
 if(clipW<=0)return null;const ndcX=clipX/clipW,ndcY=clipY/clipW;
 return{visible:Math.abs(ndcX)<=1.2&&Math.abs(ndcY)<=1.2,x:(ndcX*.5+.5)*renderer.canvas.clientWidth,y:(1-(ndcY*.5+.5))*renderer.canvas.clientHeight,distance:V.len(rel)};
}
function updateAstronautSprite(camera){/* Removed: real 3D avatar renders directly with other WebGL geometry. */}

function setFlightPhysicsMode(mode){
 engEnabled=mode==='Engineering';engState=null;engBody=null;
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
 const craft=engState?.craft||FP.shipState(),m=craft.dryMassKg+craft.fuelKg;
 const dv=craft.fuelKg>0?craft.ispS*P.G0*Math.log(m/craft.dryMassKg):0;
 const omega=2*Math.PI/Math.max(1,b.spinPeriod),groundWind=P.vec.cross(P.vec.mul(b.spinAxis||[0,1,0],omega),r);
 return{body:b,physical,elements,craft,deltaVMS:dv,inertialVelocityMS:P.vec.len(v),groundVelocityMS:P.vec.len(P.vec.sub(v,groundWind)),rM:r,vMS:v,dragN:engLast.dragN||0,heatingW:engLast.heatingW||0,temperatureK:craft.temperatureK,steps:engSteps};
}
function engineeringTouchdown(ns){
 groundLocal=V.rot(ns.dir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
 pos=V.add(nearest.position,V.mul(ns.dir,nearest.radius+ns.height+SHIP_CLEARANCE));
 landed=true;vel=[0,0,0];warp=false;engState=null;engBody=null;up=ns.dir;
 let tangent=V.sub(forward,V.mul(up,V.dot(forward,up)));if(V.len(tangent)<.05)tangent=V.cross([0,1,0],up);forward=V.norm(tangent);
 shipBody=nearest;shipLocal=[...groundLocal];shipForwardVec=[...forward];shipUpVec=[...up];eva=false;evaLocal=null;roverOccupied=false;placeRoverNearShip();
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
  engState={rM:P.vec.mul(P.vec.sub(pos,body.position),P.SCENE_METERS_PER_UNIT),vMS:P.vec.mul(vel,P.SCENE_METERS_PER_UNIT),craft:FP.shipState()};
 }
 const thr=keys.has('KeyW')?1:keys.has('KeyS')?.42:0,back=keys.has('KeyS')&&!keys.has('KeyW');
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
   const d=FP.integrateFixed(engState,{...physical,kind:body.kind,landable:body.landable,type:body.type,axis:body.spinAxis},step,{throttle:thr,forward:controlDirection,rotationRateRadS:rotationRate,groundHeightM:body.landable?Math.max(0,groundHeight(V.rot(V.norm(engState.rM),body.spinAxis||[0,1,0],-(body.spinAngle||0)),body)*P.SCENE_METERS_PER_UNIT):0});
   engState={rM:d.rM,vMS:d.vMS,craft:d.craft};engLast=d;steps++;
   if(d.impact&&body.landable){pos=V.add(body.position,P.vec.mul(d.rM,1/P.SCENE_METERS_PER_UNIT));const ns=surfaceData(body,pos);engineeringTouchdown(ns);return;}
  }
 }
 if(total>activeDt&&deepVacuum&&!thr){try{const d=FP.coast(engState.rM,engState.vMS,physical.mu,total-activeDt);engState.rM=d.rM;engState.vMS=d.vMS;}catch(e){/* If coast is ill-conditioned, bounded integration is safer than corrupting the ship. */}}
 engSteps=steps;
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
function openChart(){drawChart();$('chart').hidden=false;keys.clear();$('chart-search')?.focus();}
function closeChart(){$('chart').hidden=true;}
$('new-galaxy').onclick=()=>{const seed=((Date.now()^Math.floor(Math.random()*2**32))>>>0);const url=new URL(location.href);url.searchParams.set('seed',String(seed));location.href=url.href;};
$('chart-open').onclick=openChart;$('chart-close').onclick=closeChart;$('chart-search').oninput=drawChart;$('chart').addEventListener('click',e=>{if(e.target===$('chart'))closeChart();});
$('panel-toggle').onclick=()=>{const c=$('panel').classList.toggle('collapsed');$('panel-toggle').textContent=c?'+':'−';$('panel-toggle').setAttribute('aria-expanded',String(!c));};
document.querySelectorAll('.scan').forEach(b=>b.onclick=()=>startScan(Number(b.dataset.scan)));
function rotate(yaw,pitch,roll){const right=V.norm(V.cross(forward,up));if(yaw)forward=V.rot(forward,up,yaw);if(pitch){forward=V.rot(forward,right,pitch);up=V.rot(up,right,pitch);}if(roll)up=V.rot(up,forward,roll);forward=V.norm(forward);up=V.norm(V.sub(up,V.mul(forward,V.dot(forward,up))));}
function pointTowardWaypoint(){const b=siteWaypoint?.planet||target,way=siteWaypoint?V.add(b.position,V.mul(V.rot(siteWaypoint.dir,b.spinAxis||[0,1,0],b.spinAngle||0),b.radius+180)):b.position,delta=V.sub(way,pos);if(V.len(delta)<30)return;
 let d=V.norm(delta);if(landed){const radial=V.norm(V.sub(pos,nearest.position));d=V.norm(V.sub(d,V.mul(radial,V.dot(d,radial))));if(V.len(d)<.1)return;up=radial;}else{let right=V.norm(V.cross(forward,up));if(V.len(V.cross(right,d))<.01)right=[1,0,0];up=V.norm(V.cross(right,d));}forward=d;showToast('Heading aligned · thrust with W.');}
const busy=()=>!$('chart').hidden;
addEventListener('keydown',ev=>{if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','KeyC','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(ev.code))ev.preventDefault();if(busy()){if(ev.code==='Escape')closeChart();return;}
 keys.add(ev.code);if(ev.repeat)return;if(['Digit1','Digit2','Digit3'].includes(ev.code))startScan(Number(ev.code.slice(-1))-1);
 if(ev.code==='KeyV'&&!eva){camMode=(camMode+1)%2;camEye=null;showToast(camMode?'Cockpit camera':'Chase camera');}if(ev.code==='KeyF'){orbitYaw=0;orbitPitch=0;showToast(roverOccupied?'Camera centred behind rover.':eva?'Camera centred behind astronaut.':'Camera centred behind spacecraft.');}if(ev.code==='KeyG'&&!eva)pointTowardWaypoint();if(ev.code==='KeyM')openChart();if(ev.code==='KeyT'){timeScale=timeScale===1?10:timeScale===10?100:1;showToast('Orbital simulation speed '+timeScale+'×');}
 if(ev.code==='KeyL'){headlights=!headlights;showToast((eva?'Suit / ship lights ':'Landing floodlights ')+(headlights?'ON':'OFF'));}if(ev.code==='KeyR'&&ev.shiftKey&&!eva){pos=V.add(target.position,[0,320,-(target.radius+3550)]);forward=V.norm(V.sub(target.position,pos));up=[0,1,0];vel=[0,0,0];landed=false;groundLocal=null;warp=false;camEye=null;showToast('Reset to target orbital approach.');}
});
addEventListener('keyup',ev=>keys.delete(ev.code));addEventListener('blur',()=>keys.clear());
let dragging=false,dragButton=0,lastX=0,lastY=0,dragTravel=0,lastPickingCamera=null;const canvas=$('universe');
canvas.addEventListener('contextmenu',ev=>ev.preventDefault());

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
canvas.addEventListener('pointerdown',ev=>{if(busy())return;dragging=true;dragButton=ev.button;lastX=ev.clientX;lastY=ev.clientY;dragTravel=0;canvas.setPointerCapture(ev.pointerId);});
canvas.addEventListener('pointermove',ev=>{if(!dragging||busy())return;const dx=V.clamp(ev.clientX-lastX,-100,100),dy=V.clamp(ev.clientY-lastY,-100,100);dragTravel+=Math.abs(dx)+Math.abs(dy);lastX=ev.clientX;lastY=ev.clientY;
 if(dragButton===2){orbitYaw=V.clamp(orbitYaw-dx*.003,-Math.PI,Math.PI);orbitPitch=V.clamp(orbitPitch-dy*.003,-1.15,1.15);return;}
 if(eva){orbitYaw=V.clamp(orbitYaw-dx*.004,-Math.PI,Math.PI);orbitPitch=V.clamp(orbitPitch-dy*.003,-.7,.7);}else if(landed){const radial=V.norm(V.sub(pos,nearest.position));forward=V.norm(V.rot(forward,radial,-dx*.0025));up=radial;}else rotate(-dx*.0024,-dy*.0021,0);
});
canvas.addEventListener('pointerup',ev=>{if(roverOccupied&&dragButton===0&&dragTravel<12&&roverEntryCooldown<=0)exitRover();else if(!eva&&!landed&&dragButton===0&&dragTravel<7)pickActualStar(ev.clientX,ev.clientY);dragging=false;});canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',ev=>{ev.preventDefault();camDistance=V.clamp(camDistance*Math.exp(ev.deltaY*.0013),25,400);},{passive:false});
document.querySelectorAll('[data-control]').forEach(btn=>{const code=btn.dataset.control;btn.addEventListener('pointerdown',ev=>{ev.preventDefault();keys.add(code);btn.setPointerCapture(ev.pointerId);});for(const kind of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(kind,()=>keys.delete(code));});
function surfaceData(body,point){const direction=V.norm(V.sub(point,body.position));const surfaceDirection=V.rot(direction,body.spinAxis||[0,1,0],-(body.spinAngle||0));return{dir:direction,height:body.landable?groundHeight(surfaceDirection,body):0,distance:V.len(V.sub(point,body.position))};}
function stage(alt,body){if(roverOccupied)return 'SURFACE ROVER';if(eva)return 'SURFACE EVA';if(landed)return 'TOUCHDOWN';if(warp)return 'INTERSTELLAR WARP';if(!body)return 'INTERSTELLAR SPACE';if(!body.landable&&alt<750)return 'CLOUD DECK';if(alt<30)return 'FINAL DESCENT';if(alt<200)return 'LOW ATMOSPHERE';if(alt<680&&body.kind==='planet')return 'ATMOSPHERIC ENTRY';if(alt<2400)return 'ORBITAL APPROACH';return 'DEEP SPACE';}
function saveFlight(){const ship=shipWorldState(),body=ship.body||nearest,radial=body?V.norm(V.sub(ship.position,body.position)):[0,1,0];SF.save({flightGalaxy:{seed:GALAXY_SEED,time:simTime,position:(eva?ship.position:pos).map(v=>+v.toFixed(3)),forward:eva?ship.forward:forward,up:eva?ship.up:up,target:target.id,attached:body?.id||null,groundDirection:landed?radial:null,landed,engineering:engEnabled&&engState?{bodyId:engBody,rM:engState.rM,vMS:engState.vMS,craft:engState.craft}:null}});}
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
    if(roverOccupied){
     if(!roverLocal)roverLocal=V.rot(V.norm(V.sub(pos,previousCenter)),axis,-oldSpin);
     up=V.rot(up,axis,turn);
     const radial=V.norm(V.rot(roverLocal,axis,attached.spinAngle||0));
     pos=V.add(attached.position,V.mul(radial,attached.radius+groundHeight(roverLocal,attached)+ROVER_CLEARANCE));
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
 const yaw=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
 const pitch=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0),roll=(keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0);
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
  if(roverOccupied){
   if(yaw)roverForwardVec=V.norm(V.rot(roverForwardVec,radial,yaw*dt*1.55));
   roverForwardVec=V.norm(V.sub(roverForwardVec,V.mul(radial,V.dot(radial,roverForwardVec))));if(V.len(roverForwardVec)<.05)roverForwardVec=V.norm(V.cross(Math.abs(radial[1])>.92?[0,0,1]:[0,1,0],radial));
   const drive=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
   if(drive){const right=V.norm(V.cross(roverForwardVec,radial)),step=drive*dt*((keys.has('ShiftLeft')||keys.has('ShiftRight'))?17.5:9.5),angle=step/Math.max(nearest.radius+groundHeight(roverLocal||V.rot(radial,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),nearest)+ROVER_CLEARANCE,1);
    const nextDir=V.norm(V.rot(radial,right,-angle));roverForwardVec=V.norm(V.rot(roverForwardVec,right,-angle));roverLocal=V.rot(nextDir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
    pos=V.add(nearest.position,V.mul(nextDir,nearest.radius+groundHeight(roverLocal,nearest)+ROVER_CLEARANCE));up=nextDir;
   }
   evaForward=[...roverForwardVec];vertical=0;vel=[0,0,0];return;
  }
  if(yaw)evaForward=V.norm(V.rot(evaForward,radial,yaw*dt*1.95));
  evaForward=V.norm(V.sub(evaForward,V.mul(radial,V.dot(radial,evaForward))));if(V.len(evaForward)<.05)evaForward=V.norm(V.cross(Math.abs(radial[1])>.92?[0,0,1]:[0,1,0],radial));
  const walk=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0);
  if(walk){const right=V.norm(V.cross(evaForward,radial)),step=walk*dt*((keys.has('ShiftLeft')||keys.has('ShiftRight'))?7.1:3.7),angle=step/Math.max(nearest.radius+groundHeight(evaLocal||V.rot(radial,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),nearest)+EVA_HEIGHT,1);
   const nextDir=V.norm(V.rot(radial,right,-angle));evaForward=V.norm(V.rot(evaForward,right,-angle));evaLocal=V.rot(nextDir,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0));
   pos=V.add(nearest.position,V.mul(nextDir,nearest.radius+groundHeight(evaLocal,nearest)+EVA_HEIGHT));up=nextDir;
   walkedSinceExit+=Math.abs(step);
  }
  // Spatial transitions only. The astronaut physically walks into the rear ramp or rover seat.
  if(hatchCooldown<=0 && walkedSinceExit>3 && walk>0 && shipBody===nearest){
   const ship=shipWorldState(),delta=V.sub(pos,ship.position),ahead=V.dot(delta,ship.forward);
   const right=V.norm(V.cross(ship.forward,ship.up)),side=V.dot(delta,right);
   if(ahead> -29 && ahead < -17 && Math.abs(side)<4.8){
    const hatchLocal=tangentOffsetLocal(shipBody,shipLocal,shipForwardVec,-10,0);
    rampTransition={kind:'in',elapsed:0,duration:1.15,from:[...evaLocal],to:hatchLocal};
    showToast('Walking up the cargo ramp · boarding ship');vertical=0;vel=[0,0,0];return;
   }
  }
  if(roverEntryCooldown<=0&&roverBody===nearest&&walk!==0){
   const rover=roverWorldState();if(rover){
    const delta=V.sub(pos,rover.position),rSide=V.norm(V.cross(rover.forward,rover.up));
    if(Math.abs(V.dot(delta,rSide))<7.0 && V.len(delta)<9.5){enterRover();vertical=0;vel=[0,0,0];return;}
   }
  }
  vertical=0;vel=[0,0,0];return;}
  shipIdleElapsed=keys.has('KeyS')?shipIdleElapsed+dt:0;
  if(shipIdleElapsed>.52&&hatchCooldown<=0){exitShip();vertical=0;vel=[0,0,0];return;}
  if(keys.has('Space')){landingCapture=null;landed=false;groundLocal=null;eva=false;evaLocal=null;shipBody=null;roverOccupied=false;roverLocal=null;roverBody=null;vel=V.add(V.mul(radial,38),V.mul(forward,14));pos=V.add(pos,V.mul(radial,5));showToast('Liftoff · atmospheric ascent');}else{
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
  shipBody=nearest;shipLocal=[...groundLocal];shipForwardVec=[...forward];shipUpVec=[...up];eva=false;evaLocal=null;roverOccupied=false;placeRoverNearShip();
 $('landed-label').textContent='Welcome to '+nearest.name;$('landing-banner').classList.add('show');clearTimeout(landingTimer);landingTimer=setTimeout(()=>$('landing-banner').classList.remove('show'),6500);
 SF.recordDiscovery({id:'seamless-land:'+nearest.id,type:'landing',name:'Landed on '+nearest.name,detail:'Continuous physical landing',planet:nearest.name,system:nearest.system});showToast('TOUCHDOWN CONFIRMED · disembarking onto surface');saveFlight();exitShip();}
}
function cameraState(dt){
 const radial=nearest?V.norm(V.sub(pos,nearest.position)):[0,1,0],groundMix=V.clamp((300-altitude)/260,0,1);
 if(roverOccupied){
  const tangent=V.norm(V.sub(roverForwardVec,V.mul(radial,V.dot(roverForwardVec,radial))));
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
 if(eva){
  const tangent=V.norm(V.sub(evaForward,V.mul(radial,V.dot(evaForward,radial))));
  const rightEva=V.norm(V.cross(tangent,radial));
  const orbitDirection=V.rot(V.rot(tangent,radial,orbitYaw),rightEva,orbitPitch*.45);
  let desired=V.add(pos,V.add(V.mul(orbitDirection,-12),V.mul(radial,4.5)));
  if(nearest?.landable){const sample=surfaceData(nearest,desired),safeRadius=nearest.radius+sample.height+2.8;if(sample.distance<safeRadius)desired=V.add(nearest.position,V.mul(sample.dir,safeRadius));}
  const aim=V.add(pos,V.add(V.mul(tangent,5),V.mul(radial,1.6)));
  if(!camEye||V.len(V.sub(camEye,desired))>1200)camEye=[...desired];else camEye=V.mix(camEye,desired,1-Math.exp(-dt*13));
  if(nearest?.landable){const ground=surfaceData(nearest,camEye),clearance=nearest.radius+ground.height+2.8;if(ground.distance<clearance)camEye=V.add(nearest.position,V.mul(ground.dir,clearance));}
  const viewForward=V.norm(V.sub(aim,camEye)),right=V.norm(V.cross(viewForward,radial)),viewUp=V.norm(V.cross(right,viewForward));
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
function refreshHUD(dt){hudClock+=dt;if(hudClock<.16)return;hudClock=0;const body=nearest||target,phase=solarWarning?'STELLAR CORONA':stage(altitude,body);$('phase-top').textContent='EXPEDITION / '+phase;$('flight-state').textContent=phase;$('mode-text').textContent=roverOccupied?'ROVER':eva?'EVA':solarWarning?'CORONA':warp?'WARP':landed?'SURFACE':altitude<650?'ATMOSPHERE':altitude<2500?'ORBIT':'FREE FLIGHT';
 $('speed-text').textContent=warp?'FTL CRUISE':V.len(vel).toFixed(0)+' u/s';$('alt-text').textContent=formatDistance(Math.max(0,altitude));$('vertical-text').textContent=vertical.toFixed(0)+' u/s';$('star-count').textContent=renderer.starPoints.toLocaleString();$('body-count').textContent=renderer.renderedBodies+' / '+galaxy.allWorlds.length;$('system-count').textContent=String(galaxy.systems.length);$('coordinates').textContent=pos.map(n=>Math.round(n/1e6)).join(' / ')+' Mu';$('fps-text').textContent=Math.round(fps);$('effects-count').textContent=(renderer.effectsRendered||0).toLocaleString();$('time-scale').textContent=timeScale+'×';$('lighting-state').textContent=renderer.daylightLabel||'—';$('floodlights-state').textContent=headlights?'ON':'OFF';
 const nearSys=galaxy.nearestSystem(pos);const types=[];if(nearSys?.belts.length)types.push(nearSys.belts.length+' ASTEROID BELT'+(nearSys.belts.length>1?'S':''));if(nearSys?.nebulae.length)types.push('NEBULA');if(nearSys?.comets.length)types.push('COMET');if(nearSys?.phenomenon)types.push(nearSys.phenomenon.toUpperCase());const eventVisible=nearSys&&V.len(V.sub(pos,nearSys.position))<nearSys.maxOrbit*2.5;$('space-event').hidden=!eventVisible;$('space-event').textContent=eventVisible?'SECTOR PHENOMENA / '+(types.join('  ·  ')||'QUIET SYSTEM'):'';
 $('solar-alert').hidden=!solarWarning;$('heat-fill').style.width=heat.toFixed(1)+'%';$('heat-number').textContent=Math.round(heat)+'%';$('corona-star').textContent=galaxy.nearestStar(pos).system?.name||'—';
 $('walk-context').textContent=roverOccupied?'CLICK THE GROUND TO STEP OFF THE ROVER':eva?rampTransition?(rampTransition.kind==='out'?'WALKING DOWN REAR RAMP':'WALKING UP REAR RAMP'):roverExitMove?'WALKING AWAY FROM ROVER':(roverBody===nearest&&roverWorldState()&&V.len(V.sub(pos,roverWorldState().position))<24?'WALK CLOSER TO THE ROVER TO DRIVE':'EXPLORE ON FOOT · WALK TO SHIP REAR RAMP TO BOARD'):landed?'HOLD S TO WALK DOWN THE RAMP · SPACE TO LAUNCH':'';
 $('status-text').textContent=solarWarning?'CORONAL WARNING · THERMAL LOAD '+Math.round(heat)+'% · PHOTOSPHERE IS SOLID':roverOccupied?'ROVER ACTIVE · W/S DRIVE · A/D STEER · CLICK GROUND TO WALK AWAY':eva?'EVA ACTIVE · WALK INTO REAR CARGO RAMP / ROVER SEAT TO BOARD':landed?'SHIP LANDED · SPACE TO TAKE OFF · HOLD S TO WALK DOWN RAMP':warp?'WARP CRUISE · RELEASE SHIFT TO EXIT · G ALIGNS':'LEFT DRAG STEER · RIGHT DRAG LOOK · SCROLL ZOOM · F CENTRE CAMERA';
 if(phase!==nearPhase){nearPhase=phase;if(phase==='ATMOSPHERIC ENTRY')showToast('Atmospheric entry · deceleration engaged');if(phase==='LOW ATMOSPHERE')showToast('Surface acquired · descend to land');if(phase==='STELLAR CORONA')showToast('CORONAL WARNING · stellar radiation increasing');}
 const goal=siteWaypoint?V.add(siteWaypoint.planet.position,V.mul(V.rot(siteWaypoint.dir,siteWaypoint.planet.spinAxis||[0,1,0],siteWaypoint.planet.spinAngle||0),siteWaypoint.planet.radius+8)):target.position,delta=V.sub(goal,pos),dist=V.len(delta),bearing=V.dot(V.norm(delta),forward);
 $('waypoint-label').textContent=roverOccupied?'ROVER / '+body.name+' · CLICK GROUND TO WALK AWAY':eva?'EVA / '+body.name+' · WALK INTO REAR RAMP TO BOARD':landed?'SURFACE / '+body.name:siteWaypoint?'◆ '+siteWaypoint.name.toUpperCase()+' · '+formatDistance(dist):'✦ '+target.name.toUpperCase()+' · '+formatDistance(dist)+(bearing<.75?' · G TO ALIGN':'');
 $('entry-flash').style.opacity=String(altitude<650&&altitude>65?V.clamp((V.len(vel)-135)/600,0,.44)*Math.sin(performance.now()*.005)**2:0);
 if(lastPlanetId!==body.id){lastPlanetId=body.id;updateBodyUI();}
}
function loop(now){const dt=Math.min(Math.max((now-lastTime)/1000,0),.04);lastTime=now;
 try{if(!busy()){updatePhysics(dt);if(scan){scan.progress=Math.min(1,scan.progress+dt/2.2);$('scan-fill').style.width=(scan.progress*100).toFixed(1)+'%';if(scan.progress>=1)finishScan();}}
  const camera=cameraState(dt),ship=shipWorldState(),rover=roverWorldState();lastPickingCamera=camera;
  const rad=nearest?V.norm(V.sub(pos,nearest.position)):[0,1,0];
  const portraitBase=eva&&nearest&&nearest.landable?V.add(nearest.position,V.mul(rad,nearest.radius+groundHeight(evaLocal||V.rot(rad,nearest.spinAxis||[0,1,0],-(nearest.spinAngle||0)),nearest)+(roverOccupied?3.4:0.25)+rampLift+(eva&&!roverOccupied&&!rampTransition&&(keys.has('KeyW')||keys.has('KeyS'))?.10*Math.abs(Math.sin(performance.now()*.013)):0))):null;
  renderer.render({camera,position:pos,viewerPosition:pos,shipPosition:ship.position,lightPosition:eva?pos:ship.position,shipForward:eva?ship.forward:forward,shipUp:eva?ship.up:up,roverPosition:rover&&(!roverOccupied||eva)?rover.position:null,roverForward:rover&&(!roverOccupied||eva)?rover.forward:null,roverUp:rover&&(!roverOccupied||eva)?rover.up:null,avatarBase:eva&&!roverOccupied?portraitBase:null,avatarUp:rad,avatarForward:evaForward,avatarWalking:!!(rampTransition||roverExitMove||keys.has('KeyW')||keys.has('KeyS')||keys.has('ArrowUp')||keys.has('ArrowDown')),avatarSpeed:keys.has('ShiftLeft')||keys.has('ShiftRight')?1.7:1,avatarDelta:dt,nearest,altitude,headlights});frames++;frameClock+=dt;
  if(frameClock>2.4){fps=frames/frameClock;frames=0;frameClock=0;if(fps<38&&renderer.pixelRatio>.7){renderer.pixelRatio=Math.max(.7,renderer.pixelRatio-.12);renderer.resize();}else if(fps>56&&renderer.pixelRatio<renderer.dprTarget){renderer.pixelRatio=Math.min(renderer.dprTarget,renderer.pixelRatio+.1);renderer.resize();}}
  refreshHUD(dt);if(now-lastSave>4000){lastSave=now;saveFlight();}
 }catch(e){console.error('Starfall frame failed:',e);$('status-text').textContent='GRAPHICS / FLIGHT ERROR: '+String(e.message).slice(0,85);}requestAnimationFrame(loop);}
addEventListener('resize',()=>renderer.resize());addEventListener('pagehide',saveFlight);
nearest=galaxy.nearestBody(pos).planet||first;let initial=surfaceData(nearest,pos);altitude=initial.distance-nearest.radius-initial.height;
if(landed){if(!shipBody){shipBody=nearest;shipLocal=groundLocal?[...groundLocal]:null;shipForwardVec=[...forward];shipUpVec=[...up];}placeRoverNearShip();exitShip();}
updateBodyUI();setTimeout(()=>$('boot').classList.add('ready'),170);requestAnimationFrame(loop);
window.StarfallRuntime={galaxy,get target(){return target;},get nearest(){return nearest;},get time(){return simTime;},get engineering(){return engEnabled;},get attitude(){return engAttitude;},setAttitude(v){engAttitude=['Manual','Hold','Prograde','Retrograde'].includes(v)?v:'Manual';SF.save({scienceSettings:{schema:1,flightMode:engEnabled?'Engineering':'Assisted',sas:engAttitude}});},setFlightPhysicsMode,engineeringInfo,get ship(){return engState;},get scenePosition(){return pos;},get landed(){return landed;},get eva(){return eva;}};
Object.defineProperty(window,'STARFALL_DEBUG',{value:{galaxy,get state(){return{position:[...pos],altitude,landed,eva,roverOccupied,hatchCooldown,roverEntryCooldown,portraitLoaded:!!renderer.avatarParts?.body,avatarLoaded:!!renderer.avatarParts?.body,avatarDrawCalls:renderer.avatarDrawCalls,avatarAnimation:renderer.avatarAnimation,rampState:rampTransition?.kind||null,shipAhead:shipBody?V.dot(V.sub(pos,shipWorldState().position),shipWorldState().forward):null,shipSide:shipBody?V.dot(V.sub(pos,shipWorldState().position),V.norm(V.cross(shipWorldState().forward,shipWorldState().up))):null,walkedSinceExit,roverRange:roverBody&&roverWorldState()?V.len(V.sub(pos,roverWorldState().position)):null,warp,target:target.id,body:nearest.id,mode:nearPhase,fps,systems:galaxy.systems.length,worlds:galaxy.allWorlds.length,renderedBodies:renderer.renderedBodies,culledBodies:renderer.culledBodies,visibleStars:renderer.starPoints,catalogStars:galaxy.skyCatalog.length,loadedCatalogSystems:galaxy.skyCatalog.filter(s=>!s.dormant).length,effectPoints:renderer.effectsRendered,heat,spinAngle:nearest.spinAngle,cameraZoom:camDistance,cameraOrbit:[orbitYaw,orbitPitch],timeScale,headlights,groundLocal:groundLocal&&[...groundLocal],cameraClearance:nearest?.landable?surfaceData(nearest,camEye||pos).distance-nearest.radius-surfaceData(nearest,camEye||pos).height:null,daylight:renderer.daylightLabel,sunElevation:nearest&&galaxy.byId.get(nearest.systemId)?V.dot(V.norm(V.sub(pos,nearest.position)),V.norm(V.sub(galaxy.byId.get(nearest.systemId).position,nearest.position))):null,patchRebuilds:renderer.patchDraws};},resetToOrbit(){pos=V.add(target.position,[0,300,-(target.radius+3550)]);vel=[0,0,0];forward=V.norm(V.sub(target.position,pos));up=[0,1,0];landed=false;groundLocal=null;camEye=null;},setTarget(id){const body=galaxy.byId.get(id);if(!body||!body.radius||!body.kind)throw Error('Unknown celestial target');target=body;},setPosition(next){if(!Array.isArray(next)||next.length!==3||!next.every(Number.isFinite))throw Error('Invalid position');pos=[...next];landed=false;groundLocal=null;camEye=null;},align(){pointTowardWaypoint();},setCameraZoom(n){camDistance=V.clamp(Number(n),25,400);},setSimulationTime(t){simTime=t;galaxy.update(t);},setTimeScale(t){if(![1,10,100].includes(t))throw Error('Expected 1,10,100');timeScale=t;},setHeadlights(on){headlights=!!on;}}});
})();
