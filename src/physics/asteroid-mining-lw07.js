/* STARFALL LW07 — finite EVA asteroid extraction into a carried sample pouch.
 * Uses the existing 8A material ledger and 8C deposit depletion authority.
 * No free ore, remote teleportation, or infinite inventory.
 */
(function(root){'use strict';
const POUCH='8d:eva-sample-pouch',SHIP=root.StarfallMining8D?.SHIP||'8d:ship-main:materials';
const LIMITS=Object.freeze({pouchMassKg:20,pouchVolumeM3:.012});
const BATCH=Object.freeze({massKg:2,durationS:12,powerW:800,energyJ:9600,volumeM3PerKg:.00058});
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=180;
function prepareContainers(materials){
 const ids=new Set(materials.snapshot().containers.map(x=>x.id));
 if(!ids.has(POUCH))materials.registerContainer({id:POUCH,ownerId:'eva-explorer-001',
  kind:'sealed EVA geological sample pouch',maxMassKg:LIMITS.pouchMassKg,maxVolumeM3:LIMITS.pouchVolumeM3});
 return materials;
}
function normalize(saved){
 if(saved==null)return{schema:1,sequence:0,active:null,history:[]};
 if(saved.schema!==1||!Number.isSafeInteger(saved.sequence)||saved.sequence<0||
  !Array.isArray(saved.history)||saved.history.length>500||
  !saved.history.every(x=>validId(x.id)&&typeof x.status==='string')||
  (saved.active!==null&&saved.active!==undefined&&(!validId(saved.active.id)||
   saved.active.type!=='EVA_ASTEROID'||!validId(saved.active.bodyId)||!validId(saved.active.siteId)||
   !finite(saved.active.elapsedS)||!finite(saved.active.energyJ)||!finite(saved.active.durationS)||
   !saved.active.deposit||!validId(saved.active.deposit.id))))
  throw Error('Corrupt LW07 asteroid-mining save — do not reset the sample inventory');
 return{schema:1,sequence:saved.sequence,active:saved.active?clone(saved.active):null,history:clone(saved.history)};
}
function create(saved,Materials,Resources){
 let state=normalize(saved);
 function snapshot(){return clone(state);}
 function start({deposit,surveyed,bodyId,bodyKind,landed,eva,operatorNear,chargeJ}){
  if(state.active)throw Error('Finish or cancel the current EVA extraction first');
  if(bodyKind!=='asteroid'||!landed||!eva||!operatorNear||!deposit||
   !validId(bodyId)||deposit.bodyId!==bodyId||!validId(deposit.id)||!finite(deposit.accessibleMassKg))
   throw Error('Stand beside a landable asteroid and select a valid surface deposit');
  if(!surveyed)throw Error('Use the EVA spectrometer to prospect this deposit first');
  if(deposit.accessibleMassKg<BATCH.massKg)throw Error('This deposit has less than 2 kg of accessible material');
  if(!finite(chargeJ)||chargeJ<BATCH.energyJ)throw Error('EVA multitool needs at least 9.6 kJ for a 2 kg extraction');
  state.sequence++;
  state.active={id:'lw07:eva-extract:'+state.sequence,type:'EVA_ASTEROID',bodyId,siteId:deposit.id,
   deposit:clone(deposit),massKg:BATCH.massKg,elapsedS:0,durationS:BATCH.durationS,
   powerW:BATCH.powerW,energyJ:0,volumeM3PerKg:BATCH.volumeM3PerKg};
  return clone(state.active);
 }
 function advance(dt,availableEnergyJ,{enabled=true}={}){
  const a=state.active;if(!a)return{active:false,usedJ:0,completed:false};
  if(!finite(dt)||dt>2||!finite(availableEnergyJ))throw Error('Invalid LW07 extraction time step');
  if(!enabled)return{active:true,usedJ:0,completed:false,paused:true,progress:a.elapsedS/a.durationS};
  const seconds=Math.min(dt,Math.max(0,a.durationS-a.elapsedS),availableEnergyJ/a.powerW);
  const usedJ=seconds*a.powerW;a.elapsedS+=seconds;a.energyJ+=usedJ;
  return{active:true,usedJ,completed:a.elapsedS+1e-8>=a.durationS,progress:a.elapsedS/a.durationS};
 }
 function cancel(){
  if(!state.active)return false;
  state.history.push({id:state.active.id,type:state.active.type,status:'CANCELLED',
   bodyId:state.active.bodyId,siteId:state.active.siteId,energyJ:state.active.energyJ});
  if(state.history.length>500)state.history.shift();state.active=null;return true;
 }
 function commit(materials,resources){
  const a=state.active;if(!a||a.elapsedS+1e-6<a.durationS)throw Error('EVA extraction cycle incomplete');
  const nextMaterials=prepareContainers(Materials.create(materials.snapshot()));
  const nextResources=Resources.create(resources.serialize());
  const pouch=nextMaterials.used(POUCH);
  if(pouch.massKg+BATCH.massKg>LIMITS.pouchMassKg+1e-8||
   pouch.volumeM3+BATCH.massKg*BATCH.volumeM3PerKg>LIMITS.pouchVolumeM3+1e-8)
   throw Error('EVA sample pouch is full; return to the ship and transfer samples');
  if(nextResources.remaining(a.deposit)<a.massKg)throw Error('Asteroid deposit depleted before extraction could commit');
  const lot={id:'lw07:lot:'+a.id,containerId:POUCH,materialId:a.deposit.type,
   massKg:a.massKg,volumeM3:a.massKg*a.volumeM3PerKg,grade:a.deposit.grade,provenance:a.deposit.id};
  nextMaterials.importLot(lot);
  nextResources.extract(a.deposit,a.massKg,{id:a.id,depositId:a.deposit.id,
   destinationContainerId:POUCH,status:'COMMITTED',provenance:'LW07 EVA asteroid extraction'});
  const receipt={id:a.id,type:a.type,status:'COMMITTED',bodyId:a.bodyId,siteId:a.siteId,
   massKg:a.massKg,source:a.siteId,destination:POUCH,energyJ:a.energyJ};
  state.history.push(receipt);if(state.history.length>500)state.history.shift();state.active=null;
  return{materials:nextMaterials,resources:nextResources,operation:clone(receipt)};
 }
 function transfer(materials,lotId,massKg,transferId){
  if(state.active)throw Error('Wait for EVA extraction to finish before transferring samples');
  if(!validId(lotId)||!validId(transferId)||!finite(massKg)||massKg<=0)
   throw Error('Select an actual sample lot and positive transfer mass');
  const next=prepareContainers(Materials.create(materials.snapshot()));
  const lot=next.inventory(POUCH).find(x=>x.id===lotId);
  if(!lot||massKg>lot.massKg+1e-8)throw Error('Selected sample lot is not in the EVA pouch');
  next.reserve(transferId,lotId,SHIP,massKg);next.commit(transferId);
  return{materials:next,transfer:{id:transferId,lotId,massKg,source:POUCH,destination:SHIP,status:'COMMITTED'}};
 }
 return Object.freeze({start,advance,cancel,commit,transfer,snapshot,
  apply:saved=>{state=normalize(saved);},get active(){return state.active?clone(state.active):null;},
  get history(){return state.history.map(clone);}});
}
root.StarfallAsteroidMiningLW07=Object.freeze({POUCH,SHIP,LIMITS,BATCH,prepareContainers,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallAsteroidMiningLW07;
})(globalThis);
