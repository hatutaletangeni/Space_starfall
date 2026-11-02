/* STARFALL T12: physically bounded support truck winch, DC port and rover field repair.
 * Original owners remain authoritative: flight truck charge/pose, T02 outpost charge,
 * vehicleStore local rover, launch7 distant rover. No independent joules/inventory.
 */
(function(root){'use strict';
const finite=Number.isFinite,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const norm=x=>{const n=Math.hypot(...x);if(!(n>0))throw Error('T12 zero surface direction');return x.map(v=>v/n);};
const angle=(a,b)=>Math.acos(clamp(a.reduce((s,v,i)=>s+v*b[i],0),-1,1));
const distance=(a,b,r)=>angle(norm(a),norm(b))*r;
const lerp=(a,b,t)=>norm(a.map((v,i)=>v*(1-t)+b[i]*t));
const FAULT_SLOTS=['wheels','motor','instruments','avionics','battery'];
const loadKg=1200,pullMS=1.8,maxCable=55,efficiency=.82,reserveJ=30000,repairDurationS=30,repairCostJ=90000;
function line({from,to,body,height,radiusScene,limitScene=maxCable}){
 if(!body||!Array.isArray(from)||!Array.isArray(to)||!finite(radiusScene)||!(radiusScene>0)||typeof height!=='function')throw Error('T12 requires original body and height samples');
 const d=distance(from,to,radiusScene);
 if(!(d>0)||d>limitScene)throw Error('T12 cable endpoint outside '+limitScene+' scene-unit reach: '+d.toFixed(2));
 const h0=height(norm(from),body),h1=height(norm(to),body);
 if(!finite(h0)||!finite(h1))throw Error('T12 terrain is unavailable');
 const n=Math.max(5,Math.ceil(d/2.5));
 for(let i=1;i<n;i++){
  const t=i/n,p=lerp(from,to,t),h=height(p,body),lineH=h0*(1-t)+h1*t;
  if(!finite(h)||h>lineH+1.5)throw Error('T12 cable obstructed by terrain ridge');
 }
 const slopeDeg=Math.atan2(Math.abs(h1-h0),d)*180/Math.PI;
 if(slopeDeg>16)throw Error('T12 dangerous pull grade '+slopeDeg.toFixed(1)+'° exceeds 16°');
 return{lengthScene:d,slopeDeg,clear:true};
}
function start({body,truckLocal,roverLocal,destination,radiusScene,height,energyJ,unit=1000,atS=0}){
 const cable=line({from:truckLocal,to:roverLocal,body,height,radiusScene});
 if(cable.lengthScene<3)throw Error('T12 rover already within winch clearance');
 if(!Array.isArray(destination))throw Error('T12 recovery anchor missing');
 const path=line({from:roverLocal,to:destination,body,height,radiusScene,limitScene:maxCable});
 const end=line({from:truckLocal,to:destination,body,height,radiusScene,limitScene:maxCable});
 if(end.lengthScene<4||end.lengthScene>20)throw Error('T12 recovery anchor must be 4–20 scene units from truck');
 const totalM=path.lengthScene*unit;
 const gravity=clamp((body.gravity||1)*9.80665,.1,30);
 const resistanceN=loadKg*gravity*(.11+Math.sin(path.slopeDeg*Math.PI/180));
 const workJ=Math.max(50000,totalM*resistanceN/efficiency);
 if(!finite(workJ)||energyJ<workJ+reserveJ)throw Error('T12 insufficient truck battery for predicted '+Math.ceil(workJ/1000)+' kJ pull plus reserve');
 return{schema:12,bodyId:body.id,status:'RECOVERING',destination:norm(destination),anchor:norm(truckLocal),
  initialDistance:path.lengthScene,lastDistance:path.lengthScene,initialCableScene:cable.lengthScene,cableLengthScene:cable.lengthScene,
  originalWorkJ:workJ,remainingWorkJ:workJ,consumedWorkJ:0,loadN:resistanceN,
  energyEfficiency:efficiency,workRateJScene:workJ/path.lengthScene,
  startedAtS:atS,reason:'',slopeDeg:path.slopeDeg};
}
function restore(raw,bodyId){
 if(!raw||raw.bodyId!==bodyId||!Array.isArray(raw.destination)||!raw.destination.every(finite)||!(raw.remainingWorkJ>=0))return null;
 const out={...raw,destination:norm(raw.destination)};
 if(out.anchor&&Array.isArray(out.anchor)&&out.anchor.every(finite))out.anchor=norm(out.anchor);
 if(!finite(out.consumedWorkJ))out.consumedWorkJ=Math.max(0,(out.originalWorkJ||0)-out.remainingWorkJ);
 if(!finite(out.cableLengthScene))out.cableLengthScene=out.initialCableScene||0;
 if(!['RECOVERING','BLOCKED','LOW POWER','PAUSED'].includes(out.status))out.status='PAUSED';
 return out;
}
function advance({state,body,truckLocal,roverLocal,radiusScene,height,truckEnergyJ,dt}){
 if(!state||!(dt>=0&&finite(dt)))throw Error('T12 invalid winch step');
 if(!body||state.bodyId!==body.id)return{state:{...state,status:'PAUSED',reason:'Rover/truck no longer share destination world'},roverLocal,energyJ:truckEnergyJ,spentJ:0,done:false};
 if(distance(state.anchor||truckLocal,truckLocal,radiusScene)>.25)return{state:{...state,status:'BLOCKED',reason:'Truck anchor moved; cancel and reconnect'},roverLocal,energyJ:truckEnergyJ,spentJ:0,done:false};
 let remaining=distance(roverLocal,state.destination,radiusScene);
 if(remaining<.15)return{state:null,roverLocal:norm(state.destination),energyJ:truckEnergyJ,spentJ:0,done:true};
 const moving=Math.min(remaining,dt*pullMS,.8);
 if(!(moving>0))return{state,roverLocal,energyJ:truckEnergyJ,spentJ:0,done:false};
 const next=lerp(roverLocal,state.destination,moving/remaining);
 try{
  line({from:truckLocal,to:next,body,height,radiusScene});
  line({from:roverLocal,to:next,body,height,radiusScene,limitScene:maxCable});
 }catch(e){return{state:{...state,status:'BLOCKED',reason:e.message},roverLocal,energyJ:truckEnergyJ,spentJ:0,done:false};}
 const cost=Math.min(state.remainingWorkJ,(state.workRateJScene||state.originalWorkJ/Math.max(.1,state.initialDistance))*moving);
 if(!finite(cost)||truckEnergyJ<cost+reserveJ)return{state:{...state,status:'LOW POWER',reason:'Insufficient winch energy and truck reserve'},roverLocal,energyJ:truckEnergyJ,spentJ:0,done:false};
 const current={...state,status:'RECOVERING',reason:'',remainingWorkJ:Math.max(0,state.remainingWorkJ-cost),
  consumedWorkJ:(state.consumedWorkJ||0)+cost,lastDistance:Math.max(0,remaining-moving),
  cableLengthScene:distance(truckLocal,next,radiusScene)};
 if(current.lastDistance<.15)return{state:null,roverLocal:norm(state.destination),energyJ:truckEnergyJ-cost,spentJ:cost,done:true,receipt:current};
 return{state:current,roverLocal:next,energyJ:truckEnergyJ-cost,spentJ:cost,done:false};
}
function createService(raw){
 const r=raw&&typeof raw==='object'?raw:{};
 const conditions={};for(const k of FAULT_SLOTS)conditions[k]=finite(r.conditions?.[k])?clamp(r.conditions[k],0,1):1;
 return{schema:12,conditions,readyAtS:finite(r.readyAtS)?Math.max(0,r.readyAtS):0,
  records:Array.isArray(r.records)?r.records.filter(x=>x&&x.id&&x.slot&&finite(x.atS)).slice(0,200):[],
  portTemperatureK:finite(r.portTemperatureK)?clamp(r.portTemperatureK,150,500):290};
}
function diagnosis({service,rover=null,health=1}){
 const s=createService(service),fault=rover?.roverT06?.fault||'',desc=fault.toLowerCase(),parts={...s.conditions};
 if(/wheel|traction|suspension/.test(desc))parts.wheels=Math.min(parts.wheels,.5);
 if(/motor|drive/.test(desc))parts.motor=Math.min(parts.motor,.5);
 if(/camera|capture|image/.test(desc))parts.instruments=Math.min(parts.instruments,.5);
 if(/radio|antenna|packet|receiver/.test(desc))parts.avionics=Math.min(parts.avionics,.5);
 if(/battery|power|charge|reserve/.test(desc))parts.battery=Math.min(parts.battery,.5);
 if(finite(health)&&health<.9)parts.motor=Math.min(parts.motor,health);
 return{parts,fault:fault||'None reported',readyAtS:s.readyAtS,records:s.records.length,temperatureK:s.portTemperatureK};
}
function maintain({service,slot,atS,truckEnergyJ,installedId,rover=null,health=1}){
 if(!FAULT_SLOTS.includes(slot))throw Error('T12 service slot unsupported');
 if(!installedId||!root.StarfallVehicles?.components?.[installedId])throw Error('T12 replacement requires a real installed Workbench part');
 const part=root.StarfallVehicles.components[installedId];
 const expected={wheels:'wheels',motor:'drive',instruments:'instrument',avionics:'avionics',battery:'battery'}[slot];
 if(part.type!==expected)throw Error('T12 incorrect service part family for '+slot);
 const state=createService(service);
 if(!finite(atS)||atS<state.readyAtS)throw Error('T12 field service cycle has not finished');
 if(state.records.length>=200)throw Error('T12 service ledger full; export records before more repairs');
 if(!(truckEnergyJ>=repairCostJ+reserveJ))throw Error('T12 truck battery needs '+repairCostJ+' J plus reserve for tools');
 if(rover?.roverT06?.landing?.safe===false)throw Error('T12 cannot recommission a rover destroyed in failed landing');
 const d=diagnosis({service:state,rover,health}),before=d.parts[slot];
 const nextHealth=Math.min(1,before+.35);
 if(before>=.999&&!rover?.roverT06?.fault)throw Error('T12 '+slot+' is healthy; no replacement necessary');
 const record={id:'t12-'+(rover?.id||'starfall-rover')+'-'+slot+'-'+atS,
  assetId:rover?.id||'starfall-rover',slot,installedId,removedId:installedId,
  atS,durationS:repairDurationS,energyJ:repairCostJ,conditionBefore:before,conditionAfter:nextHealth,
  procedure:'reseat existing compatible Workbench part; field repair',status:'COMMISSIONED'};
 if(state.records.some(x=>x.id===record.id))throw Error('T12 repeated maintenance transaction');
 state.conditions={...d.parts,[slot]:nextHealth};state.readyAtS=atS+repairDurationS;state.portTemperatureK=clamp(state.portTemperatureK+7,150,500);state.records.push(record);
 if(rover){const hw=root.StarfallRoverT06?.hardware?.(rover);if(hw&&nextHealth>.6){hw.fault='';if(['SAFE_STOP','FAULT','RECOVERY'].includes(hw.state)){hw.state='READY';rover.status='parked';}hw.health=Math.max(hw.health||0,nextHealth);}rover.fieldT12=state;}
 return{service:state,record,batteryJ:truckEnergyJ-repairCostJ};
}
function transfer({source,sourceBodyId,targetId,targetBodyId,sourceLocal,targetLocal,radiusScene,sourcePowered,grid,installed,
  targetEnergyJ,targetCapacityJ,atS,readyAtS=0,portTemperatureK=290,maxScene=36,desiredJ=180000}){
 if(sourceBodyId!==targetBodyId||!source||source.bodyId!==targetBodyId||!sourceLocal||!targetLocal)throw Error('T12 both charging endpoints must share one world');
 if(source.kind!=='battery'||source.enabled===false||source.condition<=.1||!sourcePowered)throw Error('T12 live enabled 48 V battery socket required');
 if(!grid?.transfer||!installed)throw Error('T12 compatible installed port and T02 transfer service required');
 if(distance(sourceLocal,targetLocal,radiusScene)>maxScene)throw Error('T12 cable connector out of physical range '+maxScene+' scene units');
 if(!finite(atS)||atS<readyAtS)throw Error('T12 port charge cycle cooling down');
 if(portTemperatureK>355)throw Error('T12 overheated charging connector');
 const o=root.StarfallOutposts;if(!o?.SPECS?.battery?.capacityJ)throw Error('T12 original battery rating unavailable');
 const report=grid.transfer({id:source.id,energyJ:source.energyJ,capacityJ:o.SPECS.battery.capacityJ},
  {id:targetId,energyJ:targetEnergyJ,capacityJ:targetCapacityJ},desiredJ,{efficiency:.88,maxPowerW:6000,seconds:40,maxSourceJ:220000});
 if(!(report.deliveredJ>0))throw Error('T12 battery depleted or destination full');
 return{...report,readyAtS:atS+40,portTemperatureK:clamp(portTemperatureK+report.drawnJ/30000,150,500),
  cableLengthScene:distance(sourceLocal,targetLocal,radiusScene)};
}
const API={MAX_CABLE_SCENE:maxCable,FAULT_SLOTS,start,line,restore,advance,createService,diagnosis,maintain,transfer,distance};
root.StarfallFieldServiceT12=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
