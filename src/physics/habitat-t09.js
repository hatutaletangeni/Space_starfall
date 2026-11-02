/* STARFALL T09 — source-owned habitat thermodynamics and finite consumables.
 * Parent structure: outpost5.items[kind=hab]; electricity: existing 680W T02 bus.
 * No player health, EVA, vehicle or scene ownership.
 * Simplifications: well mixed 80m³ gas, ideal gas law, lumped thermal mass,
 * estimated vacuum exterior when body surface pressure unavailable.
 */
(function(root){'use strict';
const R=8.314462618,BASE_W=680,SCHEMA=1;
const C=Object.freeze({schema:SCHEMA,volumeM3:80,referenceK:293.15,pressureKPa:101.325,
 oxygenTargetKPa:21,oxygenMinKPa:16,oxygenMaxKPa:27,carbonAlarmKPa:.8,
 totalMinKPa:70,totalMaxKPa:120,tempMinK:280,tempMaxK:307,
 absoluteMinK:150,absoluteMaxK:390,thermalCapacityJK:750000,
 thermalLeakWPerK:35,heatW:380,coolW:280,lifeSupportW:BASE_W,
 normalLeakS:8e-7,maxLeakS:.012,crewO2MolS:.0003,crewCO2MolS:.00026,
 crewWaterLS:.00004,maxOxygenMolS:.0035,maxInertMolS:.0035,
 maxScrubMolS:.003,airlockCycleS:15,
 roverServiceMaxW:2500,roverServiceDistanceScene:24,
 maxChunkS:86400,backupMaximumJ:0,alertHistory:20});
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),deep=x=>JSON.parse(JSON.stringify(x));
function pressure(mol,K,V=C.volumeM3){return Math.max(0,mol)*R*K/(Math.max(1,V)*1000);}
function gasMoles(kPa,K,V=C.volumeM3){return kPa*1000*V/(R*K);}
function defaults(now=0){
 const n=gasMoles(C.pressureKPa,C.referenceK),o2=gasMoles(C.oxygenTargetKPa,C.referenceK);
 return{schema:SCHEMA,enabled:false,mode:'STANDBY',lastS:now,seal:1,volumeM3:C.volumeM3,
  oxygenMol:o2,inertMol:n-o2,carbonMol:0.0003*n,oxygenTankMol:900,
  inertTankMol:700,scrubberCapacityMol:350,filteredAirMol:0,waterL:200,
  tempK:C.referenceK,occupants:0,airlock:'CLOSED',airlockUntilS:null,
  airlockRequested:'',backupJ:0,heatLossW:0,thermalLoadW:0,
  powerW:0,integratedSupplyW:0,leakRateS:C.normalLeakS,
  totalKPa:C.pressureKPa,o2KPa:C.oxygenTargetKPa,co2KPa:0,
  lastPower:false,alarmHistory:[],alarms:[],fault:'',serviceReady:false,
  chargeReadyAtS:0,awaitingReview:false};
}
function ensure(item,now=0){
 if(item?.kind!=='hab')throw Error('T09 requires an existing habitat structure');
 const old=item.habT09,was=old?.schema===SCHEMA,initial=defaults(now);
 if(was){
  for(const key of Object.keys(initial))if(old[key]!==undefined)initial[key]=old[key];
  const bounded={
   seal:[0,1],volumeM3:[20,500],oxygenMol:[0,1e6],inertMol:[0,1e6],carbonMol:[0,1e6],
   oxygenTankMol:[0,25000],inertTankMol:[0,25000],scrubberCapacityMol:[0,25000],
   filteredAirMol:[0,25000],waterL:[0,2000],tempK:[C.absoluteMinK,C.absoluteMaxK],
   occupants:[0,4],backupJ:[0,C.backupMaximumJ],chargeReadyAtS:[0,1e12],lastS:[0,1e12]};
  for(const [key,[lo,hi]]of Object.entries(bounded))
   initial[key]=finite(Number(initial[key]))?clamp(Number(initial[key]),lo,hi):defaults(now)[key];
  initial.occupants=Math.floor(initial.occupants);
  initial.enabled=old.enabled===true;
  initial.airlock=['CLOSED','CYCLING_OUT','OPEN_OUT','CYCLING_IN'].includes(old.airlock)?old.airlock:'CLOSED';
  initial.alarms=Array.isArray(old.alarms)?old.alarms.filter(x=>typeof x==='string').slice(-12):[];
  initial.alarmHistory=Array.isArray(old.alarmHistory)?old.alarmHistory.filter(x=>x&&typeof x.code==='string').slice(-C.alertHistory):[];
 }
 item.habT09=initial;derive(item,initial,false,now);return initial;
}
function external(body){
 // Use a known physically modeled numerical surface pressure if supplied;
 // otherwise treat a world as vacuum for conservative airlock pressure safety.
 const kPa=[body?.surfacePressureKPa,body?.pressureKPa].find(x=>finite(x)&&x>=0);
 const temperature=[body?.surfaceTemperatureK,body?.temperatureK].find(x=>finite(x)&&x>=C.absoluteMinK&&x<=C.absoluteMaxK);
 return{pressureKPa:kPa??0,temperatureK:temperature??230,
  pressureAssumption:kPa===undefined?'VACUUM_ASSUMED_NO_WORLD_PRESSURE_SOURCE':'BODY_NUMERIC_PRESSURE'};
}
function derive(item,h,powered,now=0,body=null){
 const {pressureKPa:ambient}=external(body),p=pressure(h.oxygenMol+h.inertMol+h.carbonMol,h.tempK,h.volumeM3),
  o=pressure(h.oxygenMol,h.tempK,h.volumeM3),co=pressure(h.carbonMol,h.tempK,h.volumeM3);
 h.totalKPa=p;h.o2KPa=o;h.co2KPa=co;h.lastPower=powered;
 const warnings=[];
 if(h.seal<.75)warnings.push('LEAK');
 if(p<C.totalMinKPa||p>C.totalMaxKPa)warnings.push('PRESSURE_UNSAFE');
 if(o<C.oxygenMinKPa||o>C.oxygenMaxKPa)warnings.push('OXYGEN_UNSAFE');
 if(co>C.carbonAlarmKPa)warnings.push('CO2_HIGH');
 if(h.tempK<C.tempMinK||h.tempK>C.tempMaxK)warnings.push('TEMPERATURE_UNSAFE');
 if(h.waterL<=0&&h.occupants>0)warnings.push('NO_WATER');
 if(h.scrubberCapacityMol<=.01&&h.occupants>0)warnings.push('SCRUBBER_EXHAUSTED');
 if(h.enabled&&!powered)warnings.push('UNPOWERED');
 if(h.awaitingReview)warnings.push('AWAITING_REVIEW');
 h.alarms=warnings;
 const safe=!warnings.some(x=>['LEAK','PRESSURE_UNSAFE','OXYGEN_UNSAFE','CO2_HIGH','TEMPERATURE_UNSAFE','NO_WATER','AWAITING_REVIEW'].includes(x));
 if(!h.enabled)h.mode='STANDBY';
 else if(h.airlock==='OPEN_OUT')h.mode='VENTING';
 else if(h.seal<.75)h.mode='LEAK';
 else if(!powered)h.mode='UNPOWERED';
 else if(!safe)h.mode='HABITAT_UNSAFE';
 else h.mode='PRESSURIZED';
 h.serviceReady=h.enabled&&powered&&safe&&h.airlock==='CLOSED'&&h.seal>=.75;
 if(h.enabled&&!powered)h.fault='DC_BUS_UNPOWERED';
 else if(!safe)h.fault=warnings.join(' | ')||'';
 else h.fault='';
 for(const code of warnings)if(!h.alarmHistory.some(a=>a.code===code&&Math.abs(a.timeS-now)<1e-7)){
  const prev=h.alarmHistory.at(-1);
  if(prev?.code!==code)h.alarmHistory.push({code,timeS:now});
 }
 h.alarmHistory=h.alarmHistory.slice(-C.alertHistory);
 return{safe,p,o,co,ambient};
}
function step(item,body,simS,actualPowered){
 const h=ensure(item,simS),from=h.lastS;
 if(!finite(simS)||simS<0)throw Error('T09 invalid mission clock');
 if(from>simS+1e-8)return inspect(item,body,actualPowered);
 const delta=simS-from;
 if(delta>C.maxChunkS+1e-6){h.awaitingReview=true;derive(item,h,false,simS,body);return inspect(item,body,false);}
 const {pressureKPa:ambient,temperatureK:outK}=external(body);
 const powered=!!actualPowered&&item.enabled!==false&&item.condition>.02;
 h.powerW=powered?BASE_W:0;h.integratedSupplyW=powered?BASE_W:0;
 const dt=Math.max(0,delta),lostSeal=clamp(h.seal,0,1);
 const f=C.normalLeakS+(1-lostSeal)**2*C.maxLeakS+
  (h.airlock==='OPEN_OUT'?0.0009:0);
 // Retain sensible interior gas; atmospheric ingress is not fabricated,
 // because ambient-world species compositions may be unknown.
 const leakFactor=Math.exp(-f*dt);
 h.oxygenMol*=leakFactor;h.inertMol*=leakFactor;h.carbonMol*=leakFactor;
 h.leakRateS=f;
 const occupants=h.occupants;
 const neededO2=occupants*C.crewO2MolS*dt,
  breath=Math.min(h.oxygenMol,neededO2);
 h.oxygenMol-=breath;
 h.carbonMol+=breath*clamp(C.crewCO2MolS/C.crewO2MolS,0,1);
 h.waterL=Math.max(0,h.waterL-occupants*C.crewWaterLS*dt);
 const running=powered&&h.enabled&&h.airlock!=='OPEN_OUT'&&!h.awaitingReview;
 if(running){
  const targetO2=gasMoles(C.oxygenTargetKPa,h.tempK,h.volumeM3);
  const injectO2=Math.min(Math.max(0,targetO2-h.oxygenMol),h.oxygenTankMol,C.maxOxygenMolS*dt);
  h.oxygenMol+=injectO2;h.oxygenTankMol-=injectO2;
  // Nitrogen-like inert top-up is also finite; a habitat cannot magically
  // replenish total pressure from oxygen-only cylinders.
  const targetTotal=gasMoles(C.pressureKPa,h.tempK,h.volumeM3);
  const injectInert=Math.min(Math.max(0,targetTotal-h.oxygenMol-h.inertMol-h.carbonMol),
   h.inertTankMol,C.maxInertMolS*dt);
  h.inertMol+=injectInert;h.inertTankMol-=injectInert;
  const removal=Math.min(h.carbonMol,h.scrubberCapacityMol,C.maxScrubMolS*dt);
  h.carbonMol-=removal;h.scrubberCapacityMol-=removal;h.filteredAirMol+=removal;
 }
 // Lumped heat capacity. HVAC heating/cooling only exists with actual served
 // 680 W T02, and is a component of—not extra energy added to—that load.
 const dT=outK-h.tempK,hLoss=C.thermalLeakWPerK*dT,control=running?
  (h.tempK<C.referenceK-1?C.heatW:h.tempK>C.referenceK+1?-C.coolW:0):0;
 const k=C.thermalLeakWPerK,eq=outK+control/k;
 h.tempK=clamp(eq+(h.tempK-eq)*Math.exp(-k*dt/C.thermalCapacityJK),C.absoluteMinK,C.absoluteMaxK);
 h.thermalLoadW=control;h.heatLossW=-hLoss;h.lastS=simS;
 if(h.airlock==='CYCLING_OUT'&&simS>=h.airlockUntilS){
  h.airlock='OPEN_OUT';h.airlockUntilS=null;
 }else if(h.airlock==='CYCLING_IN'&&simS>=h.airlockUntilS){
  h.airlock='CLOSED';h.airlockUntilS=null;
 }
 derive(item,h,powered,simS,body);
 return inspect(item,body,powered);
}
function command(item,action,{now=0,near=false,powered=false,body=null,occupants=null}={}){
 const h=ensure(item,now);
 if(!finite(now)||now<0)throw Error('Invalid habitat event time');
 if(!near)throw Error('Habitat systems controls require approaching the actual structure while on foot');
 if(action==='ENABLE'){h.enabled=true;}
 else if(action==='DISABLE'){h.enabled=false;}
 else if(action==='REPAIR'){
  if(h.airlock!=='CLOSED')throw Error('Seal repair requires a closed airlock');
  h.seal=1;h.awaitingReview=false;
 }else if(action==='DAMAGE'){
  throw Error('Damage is a deterministic event/simulation input, not a free user control');
 }else if(action==='OCCUPANCY'){
  if(!Number.isInteger(occupants)||occupants<0||occupants>4)throw Error('Valid habitat occupancy is 0–4');
  h.occupants=occupants;
 }else if(action==='CYCLE_OUT'){
  if(!powered||!h.enabled)throw Error('Powered, enabled habitat airlock actuators required');
  if(h.airlock!=='CLOSED')throw Error('Close the outer airlock first');
  derive(item,h,powered,now,body);
  if(h.alarms.some(x=>['LEAK','PRESSURE_UNSAFE','OXYGEN_UNSAFE','CO2_HIGH','TEMPERATURE_UNSAFE'].includes(x)))
   throw Error('HABITAT_UNSAFE: pressure/atmosphere unsafe; airlock cannot claim safe cycle');
  h.airlock='CYCLING_OUT';h.airlockUntilS=now+C.airlockCycleS;
 }else if(action==='CYCLE_IN'){
  if(!powered||!h.enabled)throw Error('Powered airlock actuators required to close/equalize');
  if(h.airlock!=='OPEN_OUT')throw Error('Outer airlock must be OPEN_OUT first');
  h.airlock='CYCLING_IN';h.airlockUntilS=now+C.airlockCycleS;
 }else throw Error('Unknown habitat control action');
 derive(item,h,powered,now,body);return inspect(item,body,powered);
}
function inspect(item,body,actualPowered=false){
 const h=ensure(item,0),{safe}=derive(item,h,actualPowered,h.lastS,body),ext=external(body);
 return{id:item.id,bodyId:item.bodyId,schema:SCHEMA,state:h.mode,enabled:h.enabled,
  powered:!!actualPowered,watts:actualPowered?BASE_W:0,
  seal:h.seal,volumeM3:h.volumeM3,pressureKPa:h.totalKPa,
  oxygenKPa:h.o2KPa,carbonKPa:h.co2KPa,temperatureK:h.tempK,
  ambientPressureKPa:ext.pressureKPa,ambientTempK:ext.temperatureK,
  exteriorAssumption:ext.pressureAssumption,oxygenTankMol:h.oxygenTankMol,
  inertTankMol:h.inertTankMol,scrubberCapacityMol:h.scrubberCapacityMol,
  filteredAirMol:h.filteredAirMol,waterL:h.waterL,heatLossW:h.heatLossW,
  thermalLoadW:h.thermalLoadW,airlock:h.airlock,airlockUntilS:h.airlockUntilS,
  occupants:h.occupants,backupReserveJ:h.backupJ,
  backupPresent:h.backupJ>0,serviceReady:h.serviceReady,
  alarms:[...h.alarms],fault:h.fault,lastS:h.lastS,healthy:safe};
}
function serviceRover(hab,rover,store,body,at,seconds=30,powered=false){
 const t=root.StarfallPowerLedgerT02,h=ensure(hab,at);
 const s=inspect(hab,body,powered);
 if(!t||!store||!rover||!body||!s.serviceReady||hab.bodyId!==rover.bodyId)
  throw Error('Powered safe actual habitat and deployed same-world rover required');
 if(!Array.isArray(hab.local)||!Array.isArray(rover.local)||
   root.StarfallOutposts.arc(hab.local,rover.local,body.radius)>C.roverServiceDistanceScene)
  throw Error('Physical habitat service port is out of range');
 if(at<h.chargeReadyAtS)throw Error('Habitat charge connector cooling down');
 const group=store.connectedGroups(body.id).find(g=>g.some(x=>x.id===hab.id))||[];
 const battery=group.find(x=>x.kind==='battery'&&x.enabled!==false&&x.condition>.02&&x.energyJ>0);
 if(!battery)throw Error('No connected, charged original T02 battery powers servicing');
 const source={id:battery.id,energyJ:battery.energyJ,capacityJ:root.StarfallOutposts.SPECS.battery.capacityJ};
 const sink={id:rover.id,energyJ:rover.batteryJ,capacityJ:rover.capacityJ??14.4e6};
 const result=t.transfer(source,sink,Math.max(0,C.roverServiceMaxW*seconds*.9),
  {efficiency:.9,maxPowerW:C.roverServiceMaxW,seconds});
 if(result.deliveredJ>0){battery.energyJ=result.fromEnergyJ;rover.batteryJ=result.toEnergyJ;h.chargeReadyAtS=at+seconds;}
 return{...result,sourceId:battery.id,targetId:rover.id,fromBodyId:body.id};
}
const API={CONFIG:C,R,pressure,gasMoles,defaults,ensure,external,step,command,inspect,serviceRover};
root.StarfallHabitatT09=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
