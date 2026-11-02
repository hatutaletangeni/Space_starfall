/* STARFALL T02 — One physical energy accounting contract, many original stores.
 * Outpost Store.items owns structure charge. VehicleStore owns ship/rover charge.
 * 7C owns satellite charge. Flight owns truck charge. Never mirror mutable joules.
 * Off-world T01 calls the same outpost solver at deterministic simulation times.
 */
(function(root){'use strict';
const VOLTS=48,MAX_A=500,WIRE_LOSS=.015,ETA_CHARGE=.92,ETA_DISCHARGE=.93;
const O=()=>root.StarfallOutposts;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const valid=x=>Number.isFinite(x)&&x>=0;
const copy=x=>JSON.parse(JSON.stringify(x));
function check(n,label){if(!valid(n))throw Error('T02 invalid '+label);}
function transfer(from,to,deliveredJ,{efficiency=.90,maxSourceJ=Infinity,maxPowerW=9000,seconds=60}={}){
 for(const [k,v] of Object.entries({sourceEnergyJ:from?.energyJ,sourceCapacityJ:from?.capacityJ,destEnergyJ:to?.energyJ,destCapacityJ:to?.capacityJ,deliveredJ,maxPowerW,seconds}))check(v,k);
 if(!from?.id||!to?.id||from.id===to.id)throw Error('T02 charge sockets require two distinct equipment IDs');
 if(from.energyJ>from.capacityJ||to.energyJ>to.capacityJ||!(efficiency>0&&efficiency<=1)||!(maxSourceJ>=0))throw Error('T02 charge state/rating invalid');
 const sourceDraw=Math.min(from.energyJ,maxSourceJ,maxPowerW*seconds,deliveredJ/efficiency,(to.capacityJ-to.energyJ)/efficiency);
 const credited=sourceDraw*efficiency,lossJ=sourceDraw-credited;
 return{fromEnergyJ:from.energyJ-sourceDraw,toEnergyJ:to.energyJ+credited,drawnJ:sourceDraw,deliveredJ:credited,lossJ,efficiency,limitW:maxPowerW,durationS:seconds,sourceId:from.id,destinationId:to.id};
}
function grid(store,body,starPos,luminosityW,simS,dt,metresPerUnit=1,occluders=[],sky=()=>1){
 if(!body?.id||!Array.isArray(body.position)||!Array.isArray(starPos)||!valid(dt)||!valid(simS)||!valid(luminosityW)||!(metresPerUnit>0))throw Error('T02 grid requires valid world, source and time');
 const V=O().V,SPECS=O().SPECS,rotate=O().rotate,C=O().C;
 const report={schema:1,bodyId:body.id,simulatedAtS:simS,dtS:dt,groups:0,generationW:0,servedW:0,
  shed:[],chargedJ:0,dischargedJ:0,lossJ:0,wireLossW:0,busVoltageV:VOLTS,currentA:0,
  byId:{},buses:[],faults:[],model:'48 V group bus; max 500 A; 1.5% lumped wired loss; battery charge 92%, discharge 93%'};
 const groups=store.connectedGroups(body.id),axis=body.spinAxis||[0,1,0];
 const sun=(item,spec)=>{
  if(!spec.solarW)return 0;
  const worldUp=rotate(item.local,axis,body.spinAngle||0),worldPoint=V.add(body.position,V.mul(worldUp,body.radius+item.height));
  const vector=V.sub(starPos,worldPoint),dist=V.len(vector),day=Math.max(0,V.dot(worldUp,V.norm(vector)));
  if(day<=0)return 0;
  // occluder geometry matches legacy 5A for deterministic source compatibility.
  for(const occ of occluders){if(occ.radius>0&&occluded(worldPoint,starPos,occ.position,occ.radius,V))return 0;}
  const atmo=body.kind==='moon'?1:/dense|thick|storm|turbid/i.test(body.atmosphere||'')?.70:.92;
  const weather=clamp(Number(sky(item.local,simS))||0,0,1);
  const flux=luminosityW/(4*Math.PI*Math.max(1,dist*metresPerUnit)**2);
  return clamp(Math.min(spec.solarW,(spec.areaM2||0)*(spec.efficiency||0)*Math.min(flux,5e5)*day*atmo*weather)*clamp(item.condition,0,1),0,spec.solarW);
 };
 for(const group of groups){
  const busId=group.map(x=>x.id).sort()[0],nodes=group.filter(x=>x.enabled!==false&&x.condition>.02),live=new Set(nodes.map(x=>x.id));
  const wires=store.wires.filter(w=>live.has(w.a)&&live.has(w.b)),factor=wires.length?1+WIRE_LOSS:1;
  const specs=nodes.map(item=>({item,spec:SPECS[item.kind],generatedW:sun(item,SPECS[item.kind])}));
  const solar=specs.filter(x=>x.generatedW>0),batteries=specs.filter(x=>x.spec.capacityJ>0&&x.item.energyJ>0);
  const generatedW=solar.reduce((s,x)=>s+x.generatedW,0),dischargeMax=batteries.reduce((s,x)=>s+Math.min(x.spec.maxDischargeW*ETA_DISCHARGE,dt>0?x.item.energyJ*ETA_DISCHARGE/dt:x.spec.maxDischargeW*ETA_DISCHARGE),0);
  const availableW=Math.min(VOLTS*MAX_A,generatedW+dischargeMax),priority=[...specs].sort((a,b)=>a.spec.priority-b.spec.priority||a.item.id.localeCompare(b.item.id));
  const bus={id:busId,bodyId:body.id,voltageV:availableW>0?VOLTS:0,currentA:0,limitA:MAX_A,
   generationW:generatedW,servedW:0,wireLossW:0,chargedJ:0,dischargedJ:0,lossJ:0,sourceIds:[],loadIds:[],shedIds:[],wireIds:wires.map(w=>w.a+'↔'+w.b)};
  let servedW=0;
  for(const item of group){
   const spec=SPECS[item.kind],available=live.has(item.id);
   report.byId[item.id]={id:item.id,bodyId:body.id,kind:item.kind,enabled:item.enabled!==false,busId,
    nameplateW:spec.solarW||spec.watts||0,loadNameplateW:spec.watts||0,generatedW:0,loadW:0,
    shedW:0,sourceIds:[],batteryJ:item.energyJ||0,capacityJ:spec.capacityJ||0,
    chargeLimitW:spec.maxChargeW||0,dischargeLimitW:spec.maxDischargeW||0,
    efficiencyCharge:spec.capacityJ?ETA_CHARGE:null,efficiencyDischarge:spec.capacityJ?ETA_DISCHARGE:null,
    voltageV:0,currentA:0,temperatureK:item.temperatureK,condition:item.condition,
    fault:available?'':'Equipment disabled or failed',power:false,servedW:0,sourceWatts:{}};
  }
  for(const x of priority){
   const need=Math.max(0,x.spec.watts||0),r=report.byId[x.item.id];r.generatedW=x.generatedW;
   if((servedW+need)*factor>availableW+1e-7){
    r.shedW=need;r.fault=availableW<1?'NO_SUPPLY: no illuminated source or charged battery':'BROWNOUT: available power / 48V 500A bus limit';
    report.shed.push(x.item.id);bus.shedIds.push(x.item.id);
   }else{
    servedW+=need;r.power=true;r.servedW=need;r.loadW=need;r.fault='';bus.loadIds.push(x.item.id);
   }
  }
  const grossW=servedW*factor,wireLossW=grossW-servedW,genUsedW=Math.min(grossW,generatedW),batteryOutW=Math.max(0,grossW-genUsedW);
  let toDrawJ=dt>0?batteryOutW*dt/ETA_DISCHARGE:0,dischargedJ=0;
  for(const b of batteries){
   const maxJ=Math.min(b.item.energyJ,b.spec.maxDischargeW*dt,toDrawJ);
   if(maxJ<=0)continue;
   b.item.energyJ=clamp(b.item.energyJ-maxJ,0,b.spec.capacityJ);dischargedJ+=maxJ;toDrawJ-=maxJ;
   bus.sourceIds.push(b.item.id);report.byId[b.item.id].dischargeJ=maxJ;
  }
  // No self-charging from the same battery, no double-counting existing charge.
  let remainingInputJ=Math.max(0,generatedW-grossW)*dt,chargedJ=0;
  for(const b of specs.filter(x=>x.spec.capacityJ>0)){
   const cap=b.spec.capacityJ,rawInputJ=Math.min(remainingInputJ,b.spec.maxChargeW*dt,(cap-b.item.energyJ)/ETA_CHARGE);
   if(rawInputJ<=0)continue;
   const stored=rawInputJ*ETA_CHARGE;b.item.energyJ=clamp(b.item.energyJ+stored,0,cap);remainingInputJ-=rawInputJ;chargedJ+=stored;
   report.byId[b.item.id].chargeJ=stored;
  }
  bus.sourceIds.push(...solar.map(x=>x.item.id));bus.sourceIds=[...new Set(bus.sourceIds)].sort();
  bus.servedW=servedW;bus.currentA=grossW/VOLTS;bus.wireLossW=wireLossW;bus.chargedJ=chargedJ;bus.dischargedJ=dischargedJ;
  bus.lossJ=wireLossW*dt+dischargedJ*(1-ETA_DISCHARGE)+chargedJ*(1/ETA_CHARGE-1);
  if(bus.shedIds.length)report.faults.push({busId,reason:availableW<1?'NO_SUPPLY':'BROWNOUT_OR_OVERLOAD',items:[...bus.shedIds]});
  for(const item of group){
   const r=report.byId[item.id],spec=SPECS[item.kind];
   r.sourceIds=r.power?[...bus.sourceIds]:[];r.voltageV=r.power?bus.voltageV:0;r.currentA=r.loadW/VOLTS;r.batteryJ=item.energyJ||0;
   if(r.power&&r.sourceIds.length){const denom=r.sourceIds.length;for(const id of r.sourceIds)r.sourceWatts[id]=+(r.loadW/denom).toFixed(4);}
   if(live.has(item.id)){
    const ambient=160,heat=r.power?(spec.watts||0)*.08:0,k=.00005;
    const steady=ambient+heat/Math.max(1,k*50000);
    item.temperatureK=clamp(steady+(item.temperatureK-steady)*Math.exp(-k*dt),2,1500);
   }
   r.temperatureK=item.temperatureK;
  }
  report.groups++;report.generationW+=generatedW;report.servedW+=servedW;report.wireLossW+=wireLossW;report.currentA+=bus.currentA;
  report.chargedJ+=chargedJ;report.dischargedJ+=dischargedJ;report.lossJ+=bus.lossJ;report.buses.push(bus);
 }
 return report;
}
function occluded(start,end,centre,radius,V){
 const d=V.sub(end,start),f=V.sub(centre,start),den=V.dot(d,d);if(!(den>0))return false;
 const t=clamp(V.dot(f,d)/den,0,1);
 return V.len(V.sub(V.add(start,V.mul(d,t)),centre))<radius;
}
function inspect({id,rt,ui,launch}){
 if(!id||typeof id!=='string')return null;
 const outpost=ui?.store?.items.find(x=>x.id===id);
 if(outpost){const report=ui.powerReports?.get(outpost.bodyId)?.byId[id];const spec=O().SPECS[outpost.kind];
  return copy(report||{id,kind:outpost.kind,bodyId:outpost.bodyId,enabled:outpost.enabled,capacityJ:spec.capacityJ,batteryJ:outpost.energyJ,temperatureK:outpost.temperatureK,power:false,fault:'Awaiting first grid evaluation'});
 }
 if(id==='starfall-truck'&&rt){const t=rt.truck;return{...t,id,kind:'truck',capacityJ:44e6,batteryJ:t.batteryJ,sourceIds:[],fault:'Dedicated 44 MJ truck battery; wired charge only through physical outpost port'};}
 for(const kind of ['ship','rover'])if(id==='starfall-'+kind&&rt){
  const v=rt.vehicleStore.get(kind),r=rt.engineeringSystemReport()?.[kind];return{id,kind,batteryJ:v.state.energyJ,capacityJ:v.stats.batteryCapacityJ,
   temperatureK:v.state.temperatureK,enabled:v.state.powerEnabled,generatedW:(r?.generated?.solarW||0)+(r?.generated?.generatorW||0),
   loadW:r?.totalLoadW||0,sourceIds:r?[(r.generated.solarW>0?'starfall-'+kind+':solar':null),(r.generated.generatorW>0?'starfall-'+kind+':fictional-generator':null)].filter(Boolean):[],
   generatorLabel:'Fictional compact generator: finite nameplate watts and heat, no consumable model yet',
   fault:r?.shed?.length?'Load shedding: '+r.shed.join(', '):null};
 }
 const satellite=launch?.store?.satellites.find(x=>x.id===id);if(satellite){
  const s=satellite.ops7c;return{id,kind:'satellite',bodyId:satellite.bodyId,batteryJ:s?.energyJ??null,
   capacityJ:root.StarfallSatelliteOps7C?.CONFIG?.capacityJ??null,enabled:!!s?.enabled,
   sourceIds:[],fault:s?.enabled?'Satellite 7C solar/eclipses are source-owned; no wired outpost bus':'Satellite bus disabled'};
 }
 const rover=launch?.store?.rovers.find(x=>x.id===id);if(rover)return{id,kind:'remote-rover',bodyId:rover.bodyId,batteryJ:rover.batteryJ,
  capacityJ:rover.capacityJ??null,sourceIds:[],fault:'Source-owned rover charge; no remote outpost docking port implemented'};
 return null;
}
const API=Object.freeze({VOLTS,MAX_A,WIRE_LOSS,ETA_CHARGE,ETA_DISCHARGE,transfer,grid,inspect});
root.StarfallPowerLedgerT02=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
