/* STARFALL T15: Asset engineering identity, fault contracts, measured before/after.
 * Read-only inspection of original vehicle state and original 7E experiment.
 * T15 ledger contains only service provenance, NOT a new vehicle/battery store.
 */
(function(root){'use strict';
const M=root.StarfallVehicles,clone=x=>JSON.parse(JSON.stringify(x)),finite=Number.isFinite;
function restore(raw){
 const src=raw&&typeof raw==='object'?raw:{},items=Array.isArray(src.events)?src.events.filter(e=>e&&typeof e.id==='string'&&
 typeof e.assetId==='string'&&finite(e.timeS)&&e.timeS>=0&&['CONFIG_APPLIED','CONFIG_RESTORED','FIELD_REPAIR'].includes(e.action)):[];
 const backup=src.backup&&typeof src.backup==='object'?src.backup:{};
 const state={schema:15,serial:finite(src.serial)?Math.max(0,Math.floor(src.serial)):0,events:items,
  backup:{ship:null,rover:null}};
 for(const kind of ['ship','rover'])if(backup[kind]?.definition?.kind===kind&&M.validate(backup[kind].definition).length===0)
  state.backup[kind]={definition:clone(backup[kind].definition),eventId:String(backup[kind].eventId||'').slice(0,130)};
 return state;
}
function fingerprint(def){return JSON.stringify({id:def?.id,kind:def?.kind,slots:def?.slots,mountPointsM:def?.mountPointsM});}
function validateChange(kind,current,definition,ready,meta=null){
 if(!['ship','rover'].includes(kind)||current?.definition?.kind!==kind||definition?.kind!==kind)
  throw Error('T15 source asset and proposed assembly must be the same vehicle family');
 if(!ready)throw Error('T15 service interlock: land and park the correct vehicle; stop rover automation and disconnect service cable');
 const errors=M.validate(definition);if(errors.length)throw Error('T15 invalid real installed assembly: '+errors.join('; '));
 if(definition.id!==current.definition.id)throw Error('T15 cannot replace another asset identity by applying a blueprint');
 if(fingerprint(current.definition)===fingerprint(definition))throw Error('T15 no installed part has changed; not recording a false successful replacement');
 if(meta){
  if(meta.kind!=='7E' ||meta.imported||meta.benchOnly||!meta.runId||!meta.blueprintId||
     meta.sourceAssetId!==current.definition.id||meta.sourceDefinitionFingerprint!==fingerprint(definition)||
     !Array.isArray(meta.observationRefs)||!Array.isArray(meta.photoRefs))
    throw Error('T15 blueprint lacks locally validated run, unchanged source identity or installed definition provenance');
 }
 return{before:M.evaluate(current.definition,current.state.fuelKg),
  after:M.evaluate(definition,current.state.fuelKg),
  beforePartIds:clone(current.definition.slots),
  afterPartIds:clone(definition.slots)};
}
function append(state,action,{assetId,kind,timeS,before,after,source=null,partBefore=null,partAfter=null}){
 const s=restore(state);
 if(!finite(timeS)||timeS<0||typeof assetId!=='string'||!assetId)throw Error('T15 invalid service event clock/asset');
 if(s.events.length>=500)throw Error('T15 service event archive is full (500); export records before further modifications');
 const id='service-t15-'+(++s.serial);
 const event={schema:15,id,action,timeS,assetId,kind,
   before:before?{massKg:before.massKg,batteryCapacityJ:before.batteryCapacityJ,solarW:before.maxSolarW,
    torqueNm:before.driveTorqueNm,traction:before.traction,engineThrustN:before.thrustN,energyJ:before.energyJ}:null,
   after:after?{massKg:after.massKg,batteryCapacityJ:after.batteryCapacityJ,solarW:after.maxSolarW,
    torqueNm:after.driveTorqueNm,traction:after.traction,engineThrustN:after.thrustN,energyJ:after.energyJ}:null,
   partBefore:partBefore?clone(partBefore):null,partAfter:partAfter?clone(partAfter):null,
   source:source?clone(source):{type:'WORKBENCH',model:'Original installed parts'}};
 s.events.push(event);return{state:s,event};
}
function changedLive(before,after){
 if(!before||!after)return false;
 return fingerprint(before.definition)!==fingerprint(after.definition)&&
  (Object.keys(before.definition.slots).some(k=>before.definition.slots[k]!==after.definition.slots[k])||
  JSON.stringify(before.definition.mountPointsM)!==JSON.stringify(after.definition.mountPointsM));
}
function faults(vehicle,report){
 const v=vehicle||{},st=v.state||{},stats=v.stats||{},ret=[];
 const add=(id,severity,cause,remedy)=>ret.push({id,severity,rootCause:cause,service:remedy,source:'ACTUAL VEHICLE STATE'});
 if(finite(st.health)&&st.health<=.25)add('hull','CRITICAL','Actual persisted health '+st.health,'Use existing T12 field repair for rover; ship requires compatible service hardware and parked Workbench, no free auto-heal');
 if(finite(st.temperatureK)&&st.temperatureK>=390)add('thermal','WARNING','Actual modeled system temperature '+st.temperatureK+' K','Stop motors; check power, radiator load and cooling');
 if(finite(st.energyJ)&&finite(stats.batteryCapacityJ)&&st.energyJ<=stats.batteryCapacityJ*.05)
  add('battery','WARNING','Original battery remaining '+st.energyJ+' J','Use original solar/bus generation or physically connected T13/12 charging');
 if(st.powerEnabled&&report?.shed?.length)add('power-bus','WARNING','Real power solver shed '+report.shed.join(', '),'Reduce enabled loads; inspect solar, generator and battery');
 return ret;
}
function statusFor(vehicle,slot,report){
 const comp=M.components[vehicle?.definition?.slots?.[slot]],st=vehicle?.state||{};
 if(!comp)return{state:'OUT OF SERVICE',reason:'No valid installed component'};
 if(st.health<=.05)return{state:'OUT OF SERVICE',reason:'Owner vehicle hull health below 5%'};
 const l={avionics:'avionics',instruments:'instruments',radiator:'radiator',motor:'drive'};
 const key=l[slot];
 if(key&&st.loads?.[key]===false)return{state:'OUT OF SERVICE',reason:'Real electrical load switch OFF'};
 if(st.powerEnabled&&key&&report?.shed?.includes(key))return{state:'OUT OF SERVICE',reason:'Actual power bus load shed'};
 if(st.powerEnabled&&key&&(!report||report.draws?.[key]===0))
  return{state:'MODELLED',reason:'Bus service has not been sampled or source insufficient'};
 if(!st.powerEnabled&&['avionics','instruments','motor'].includes(slot))return{state:'MODELLED',reason:'Legacy simplified vehicle power; not a measured live voltage'};
 return{state:'OPERATIONAL',reason:'Installed and not disabled by known live system interlocks'};
}
function inspect(vehicle,report,state,kind){
 if(!vehicle?.definition||!['ship','rover'].includes(kind))return[];
 const s=restore(state),id=vehicle.definition.id;
 return Object.entries(vehicle.definition.slots).map(([slot,partId])=>{
  const part=M.components[partId],status=statusFor(vehicle,slot,report);
  return{ownerId:id,ownerKind:kind,slot,partId,partType:part?.type||'missing',
   rated:part?clone(part):null,status:status.state,reason:status.reason,
   massKg:part?.massKg||0,powerW:part?.powerW??part?.maxPowerW??null,
   bus:slot==='motor'?'drive':slot==='instruments'?'instruments':slot==='avionics'?'avionics':slot==='radiator'?'radiator':'installed passive/system',
   faults:faults(vehicle,report).filter(f=>f.id===slot||f.id==='hull'||f.id==='battery'&&slot==='battery'),
   provenance:s.events.filter(e=>e.assetId===id&&(e.partBefore?.[slot]!==e.partAfter?.[slot])).slice(-3).map(e=>({id:e.id,action:e.action,timeS:e.timeS,source:e.source}))};
 });
}
const API={restore,fingerprint,validateChange,append,changedLive,inspect,statusFor,faults};
root.StarfallEquipmentT15=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
