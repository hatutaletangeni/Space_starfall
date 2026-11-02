/* STARFALL T13 — ship engineering dock, shore connector and custody adapter.
 * StarfallVehicles owns all real vehicle joules; T02 owns DC transfer arithmetic;
 * ScienceUI owns observations; flightGalaxy owns the docking latch/receipt IDs.
 * No second ship store, fuel simulation, avatar translation or radio bypass.
 */
(function(root){'use strict';
const valid=Number.isFinite,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const bodyDistance=(a,b,r)=>Math.acos(clamp(a.reduce((s,x,i)=>s+x*b[i],0),-1,1))*r;
const STATES=Object.freeze(['UNDOCKED','LATCHED','CHARGING','FAULT']);
const SHIP_RESERVE_J=2000000,MAX_RANGE_SCENE=38,TRANSFER_W=6000,TRANSFER_SECONDS=40,DATA_ENERGY_J=400;
function repair(raw){
 const s=raw&&typeof raw==='object'?raw:{};
 const history=Array.isArray(s.history)?s.history.filter(x=>x&&x.id&&valid(x.timeS)):[];
 const receipts=Array.isArray(s.receipts)?s.receipts.filter(x=>x&&x.id&&x.observationId&&x.sourceId):[];
 const good=STATES.includes(s.state),locked=good&&['LATCHED','CHARGING','FAULT'].includes(s.state);
 return{schema:13,state:locked?'LATCHED':'UNDOCKED',targetId:locked&&typeof s.targetId==='string'?s.targetId:null,
  kind:locked&&['local-rover','deployed-rover','grid-battery'].includes(s.kind)?s.kind:null,
  bodyId:locked&&typeof s.bodyId==='string'?s.bodyId:null,
  connectedAtS:valid(s.connectedAtS)?s.connectedAtS:0,
  readyAtS:valid(s.readyAtS)?s.readyAtS:0,
  connectorK:valid(s.connectorK)?clamp(s.connectorK,160,450):290,
  observationSerial:valid(s.observationSerial)?Math.max(0,Math.floor(s.observationSerial)):0,
  history,receipts};
}
function installed(v,slot){const id=v?.definition?.slots?.[slot];return id&&root.StarfallVehicles?.components?.[id]?.type===(slot==='docking'?'docking':slot==='avionics'?'avionics':'instrument');}
function radio({ship,report}={}){
 const v=ship,st=v?.state,stats=v?.stats;
 if(!installed(v,'avionics')||!st||st.health<=.05||st.loads?.avionics===false)return{ready:false,reason:'SHIP_RADIO: damaged/missing/disabled avionics'};
 if(st.energyJ<500000)return{ready:false,reason:'SHIP_RADIO: battery below emergency reserve'};
 // Older saves default powerEnabled=false. Their installed emergency bus remains
 // directly battery supplied and each T03 packet still pays real stored joules.
 // Once T02 realistic power is enabled, an actually served avionics load is required.
 if(st.powerEnabled&&(!report||report.shed?.includes('avionics')||
    (report.draws?.avionics||0)<(stats?.avionicsW||Infinity)-1e-8))
  return{ready:false,reason:'SHIP_RADIO: realistic electrical bus avionics shed / not yet updated'};
 return{ready:true,mode:st.powerEnabled?'T02 SERVED AVIONICS':'LEGACY EMERGENCY DC (BATTERY-DEBITED)',
  rangeScene:45,bandwidthBps:128000,reason:'Physical 45-scene-unit radio with finite power and LOS'};
}
function diagnostic({ship,report,state,landed,bodyId,scienceCount=0}){
 const s=repair(state),st=ship?.state||{},t=ship?.stats||{},r=radio({ship,report});
 return{state:s.state,connectedTarget:s.targetId||'none',targetKind:s.kind||'none',
  lockBodyId:s.bodyId,radio:r,landed:!!landed,bodyId,energyJ:st.energyJ,
  batteryCapacityJ:t.batteryCapacityJ,fuelKg:st.fuelKg,temperatureK:st.temperatureK,
  health:st.health,installed:{avionics:ship?.definition?.slots?.avionics,
   instruments:ship?.definition?.slots?.instruments,docking:ship?.definition?.slots?.docking,
   radiator:ship?.definition?.slots?.radiator,solar:ship?.definition?.slots?.solar,generator:ship?.definition?.slots?.generator},
  generationW:(report?.generated?.totalW||0),draws:report?.draws||{},shed:report?.shed||[],
  nextChargeAtS:s.readyAtS,connectorTemperatureK:s.connectorK,
  receiptCount:s.receipts.length,scienceJournalRecords:scienceCount,
  generatorModel:t.generatorW>0?'FICTIONAL AUXILIARY GENERATOR, finite rated watts; no fuel budget':'NONE',
  thermalRadiatedW:report?.radiatedW||0,history:s.history.slice(-6),receipts:s.receipts.slice(-6)};
}
function targetReady(target){
 if(!target?.id||!['local-rover','deployed-rover','grid-battery'].includes(target.kind)||!Array.isArray(target.local)||target.local.length!==3||
 !target.local.every(valid))throw Error('T13 no real compatible physical destination connector');
 if(target.kind!=='grid-battery'&&!target.installed)throw Error('T13 destination rover docking hardware not installed');
 if(target.kind==='grid-battery'&&(!target.powered||!target.connectedSolar))throw Error('T13 shore cable needs live wired battery and enabled solar array');
 if(target.busy)throw Error('T13 target vehicle moving, deploying or in fault recovery; stop first');
}
function latch({state,ship,landed,shipLocal,body,relativeSpeedMS=0,target,timeS}){
 const s=repair(state);
 if(s.state!=='UNDOCKED')throw Error('T13 undock the existing connector before using another target');
 if(!landed||!body?.id||!shipLocal)throw Error('T13 ship must be physically landed and stationary');
 if(!installed(ship,'docking'))throw Error('T13 physical ship docking component missing');
 if(ship.state.health<=.1)throw Error('T13 hull/service connector unsafe');
 if(!ship.state.powerEnabled)throw Error('T13 enable engineering power for the docking actuator (legacy emergency radio alone cannot dock)');
 if(!valid(relativeSpeedMS)||Math.abs(relativeSpeedMS)>.4)throw Error('T13 relative velocity exceeds 0.4 m/s docking interlock');
 if(!valid(timeS)||timeS<0)throw Error('T13 invalid simulated docking time');
 targetReady(target);
 if(target.bodyId!==body.id)throw Error('T13 cannot dock a vehicle/structure on another world');
 const d=bodyDistance(shipLocal,target.local,body.radius);
 if(d>MAX_RANGE_SCENE)throw Error('T13 port range exceeded: '+d.toFixed(1)+' > 38 scene units');
 if(s.history.length>=300)throw Error('T13 docking operations ledger full; export and archive before further operations');
 const action={id:'dock-'+timeS+'-'+target.id,timeS,kind:'LATCH',bodyId:body.id,assetId:target.id,
  distanceScene:d,relativeSpeedMS};
 return{...s,state:'LATCHED',targetId:target.id,kind:target.kind,bodyId:body.id,connectedAtS:timeS,
  history:[...s.history,action]};
}
function verifyLatch({state,body,shipLocal,target,ship}){
 const s=repair(state);if(s.state!=='LATCHED')throw Error('T13 docking port not latched');
 if(!body?.id||s.bodyId!==body.id||s.targetId!==target?.id||s.kind!==target.kind||!shipLocal||!installed(ship,'docking'))
  throw Error('T13 disconnected endpoint, changed ship assembly or wrong world');
 targetReady(target);
 const d=bodyDistance(shipLocal,target.local,body.radius);
 if(d>MAX_RANGE_SCENE)throw Error('T13 umbilical cable is overstretched: undock before departure');
 return s;
}
function cycle({state,ship,shipLocal,body,target,timeS,report,rover,source=null}){
 const s=verifyLatch({state,body,shipLocal,target,ship});
 if(!ship.state.powerEnabled||ship.state.loads?.avionics===false||!radio({ship,report}).ready)
  throw Error('T13 ship service bus must have powered unshed avionics');
 if(ship.state.temperatureK>390||s.connectorK>355)throw Error('T13 ship or umbilical port overheated');
 if(!valid(timeS)||timeS<s.readyAtS)throw Error('T13 socket charge cycle still cooling down');
 const t=root.StarfallPowerLedgerT02;if(!t?.transfer)throw Error('T13 original T02 power ledger missing');
 let x;
 if(target.kind==='grid-battery'){
  if(!source||source.id!==target.id||source.energyJ<100)throw Error('T13 physical shore source depleted');
  x=t.transfer({id:source.id,energyJ:source.energyJ,capacityJ:root.StarfallOutposts.SPECS.battery.capacityJ},
   {id:'starfall-ship',energyJ:ship.state.energyJ,capacityJ:ship.stats.batteryCapacityJ},
   200000,{efficiency:.90,maxPowerW:TRANSFER_W,seconds:TRANSFER_SECONDS,maxSourceJ:225000});
 }else{
  if(!rover||rover.id!==target.id)throw Error('T13 target rover battery unavailable');
  if(ship.state.energyJ<SHIP_RESERVE_J+10000)throw Error('T13 preserve 2 MJ ship battery safety reserve');
  x=t.transfer({id:'starfall-ship',energyJ:ship.state.energyJ,capacityJ:ship.stats.batteryCapacityJ},
   {id:rover.id,energyJ:rover.energyJ,capacityJ:rover.capacityJ},
   180000,{efficiency:.90,maxPowerW:TRANSFER_W,seconds:TRANSFER_SECONDS,
    maxSourceJ:Math.max(0,ship.state.energyJ-SHIP_RESERVE_J)});
 }
 if(!(x.deliveredJ>0))throw Error('T13 cable source depleted or destination full');
 if(s.history.length>=300)throw Error('T13 docking operations ledger full; export before further work');
 const a={id:'dc-'+timeS+'-'+target.id,timeS,kind:'DC_TRANSFER',assetId:target.id,
  sourceId:x.sourceId,destinationId:x.destinationId,drawnJ:x.drawnJ,deliveredJ:x.deliveredJ,lossJ:x.lossJ};
 const next={...s,readyAtS:timeS+TRANSFER_SECONDS,
  connectorK:clamp(s.connectorK+x.drawnJ/23000,160,450),history:[...s.history,a]};
 return{state:next,transfer:x};
}
function undock({state,timeS}){
 const s=repair(state);if(s.state!=='LATCHED')throw Error('T13 no existing dock to release');
 if(!valid(timeS)||timeS<0)throw Error('T13 invalid time');
 if(s.history.length>=300)throw Error('T13 docket full; export/clear records');
 return{...s,state:'UNDOCKED',targetId:null,kind:null,bodyId:null,
 history:[...s.history,{id:'undock-'+timeS+'-'+s.targetId,timeS,kind:'UNLATCH',assetId:s.targetId}]};
}
function receiveRecord({state,ship,shipLocal,body,target,observation,atS,report,fromJournal=false}){
 const s=verifyLatch({state,ship,shipLocal,body,target});
 if(target.kind==='grid-battery')throw Error('T13 a grid battery is not a rover data source');
 if(!radio({ship,report}).ready||ship.state.energyJ<SHIP_RESERVE_J+DATA_ENERGY_J)
  throw Error('T13 ship data port requires operational avionics and battery reserve');
 if(!ship.state.loads?.instruments||!installed(ship,'instruments'))throw Error('T13 ship instrument/data interface offline');
 if(!observation?.id||!observation.bodyId||observation.bodyId!==body.id||!Array.isArray(observation.location)||
 !observation.location.every(valid)||!valid(observation.value)||!valid(observation.timeS)||observation.timeS>atS)
  throw Error('T13 source observation needs measured data, valid location and past acquisition time');
 if(observation.sourceAssetId!==target.id&&observation.probeId!==target.id)
  throw Error('T13 observation has no verified rover source asset ID');
 if(s.receipts.some(x=>x.observationId===observation.id))return{state:s,duplicate:true,receipt:s.receipts.find(x=>x.observationId===observation.id),energyJ:ship.state.energyJ};
 if(s.receipts.length>=500)throw Error('T13 ship science receipt ledger full; export and archive first');
 const id='ship-receipt-'+observation.id;
 const receipt={id,observationId:observation.id,sourceId:target.id,bodyId:body.id,
  timeS:observation.timeS,receivedAtS:atS,method:'physical docked digital data port',
  source:'seeded simulation',fromJournal:!!fromJournal};
 return{state:{...s,receipts:[...s.receipts,receipt]},duplicate:false,receipt,energyJ:ship.state.energyJ-DATA_ENERGY_J};
}
root.StarfallShipT13={repair,diagnostic,radio,latch,verifyLatch,cycle,undock,receiveRecord,bodyDistance,SHIP_RESERVE_J,MAX_RANGE_SCENE};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallShipT13;
})(typeof window!=='undefined'?window:globalThis);
