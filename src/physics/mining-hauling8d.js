/* STARFALL 8D — finite physical extraction and hauling transactions.
 * Does not fabricate starting ore, overwrite terrain, or create independent truck cargo.
 * 8A inventory and 8C depletion are atomically simulated on clones before both
 * authoritative owners are swapped in one SF.save transaction.
 */
(function(root){'use strict';
const TRUCK='8d:truck-expedition-001:hopper',SHIP='8d:ship-main:materials';
const LIMITS=Object.freeze({truckMassKg:800,truckVolumeM3:1.2,shipMassKg:9000,shipVolumeM3:16});
const DRILL=Object.freeze({kitId:'drill-truck-001',kgPerBatch:20,durationS:24,powerW:2400,minimumEnergyJ:57600,volumeM3PerKg:.00058});
const LOADER=Object.freeze({kgPerBatch:50,durationS:16,powerW:1400,volumeM3PerKg:.00058});
const SERVICE=Object.freeze({headMassKg:2,durationS:60,powerW:2000,minimumEnergyJ:120000});
const clone=v=>JSON.parse(JSON.stringify(v));
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const idok=n=>typeof n==='string'&&n.length>0&&n.length<=128;
function prepareContainers(materials){
 const snapshot=materials.snapshot(),ids=new Set(snapshot.containers.map(c=>c.id));
 if(!ids.has(TRUCK))materials.registerContainer({id:TRUCK,ownerId:'truck-expedition-001',kind:'sealed ore hopper',maxMassKg:LIMITS.truckMassKg,maxVolumeM3:LIMITS.truckVolumeM3});
 if(!ids.has(SHIP))materials.registerContainer({id:SHIP,ownerId:'ship-main',kind:'raw-material cargo hold',maxMassKg:LIMITS.shipMassKg,maxVolumeM3:LIMITS.shipVolumeM3});
 return materials;
}
function normalize(saved){
 if(saved==null)return{schema:1,sequence:0,toolCondition:1,active:null,history:[]};
 if(saved.schema!==1||!Number.isSafeInteger(saved.sequence)||saved.sequence<0||!Array.isArray(saved.history)||saved.history.length>500||!saved.history.every(h=>idok(h.id)&&idok(h.type))||(saved.toolCondition!==undefined&&(!finite(saved.toolCondition)||saved.toolCondition>1))||
  (saved.active!==null&&saved.active!==undefined&&(!idok(saved.active.id)||!['DRILL','LOAD','SERVICE'].includes(saved.active.type)||!finite(saved.active.elapsedS)||!finite(saved.active.energyJ)||!finite(saved.active.durationS))))throw Error('Corrupt 8D mining save — do not reset stock');
 return {schema:1,sequence:saved.sequence,toolCondition:saved.toolCondition===undefined?1:saved.toolCondition,active:saved.active?clone(saved.active):null,history:clone(saved.history)};
}
function create(saved,Materials,Resources){
 let state=normalize(saved);
 const inventoryFactory=Materials,resourceFactory=Resources;
 function snapshot(){return clone(state);}
 function serviceHead(materials,lotId){
  const s=materials.snapshot(),lot=s.lots.find(l=>l.id===lotId&&l.containerId===SHIP&&l.materialId==='drill_head');
  const held=s.operations.filter(o=>o.status==='RESERVED'&&o.lotId===lotId).reduce((n,o)=>n+o.massKg,0);
  if(!lot||!finite(lot.grade)||lot.grade<.98||lot.massKg-held+1e-8<SERVICE.headMassKg)
   throw Error('One unreserved certified 2 kg drill head must be physically aboard ship');
  return lot;
 }
 function startService({lotId,materials,bodyId,truckBodyId,shipBodyId,truckPresent,
  truckNearShip,operatorNear,truckIdle=true,energyJ}){
  if(state.active)throw Error('Finish or cancel the current operation');
  if(!idok(bodyId)||truckBodyId!==bodyId||shipBodyId!==bodyId||!truckPresent||
   !truckNearShip||!operatorNear||!truckIdle)
   throw Error('Park the original truck near landed ship and remain beside it for drill service');
  if(state.toolCondition>=1-1e-8)throw Error('Drill head is already in full condition');
  if(!finite(energyJ)||energyJ<SERVICE.minimumEnergyJ)throw Error('Truck battery too low for drill service');
  serviceHead(materials,lotId);
  state.sequence++;
  state.active={id:'8d:service:'+state.sequence,type:'SERVICE',bodyId,lotId,
   massKg:SERVICE.headMassKg,durationS:SERVICE.durationS,powerW:SERVICE.powerW,elapsedS:0,energyJ:0};
  return clone(state.active);
 }
 function startDrill({deposit,surveyed,bodyId,truckBodyId,truckPresent,operatorNear,energyJ,truckIdle=true}){
  if(state.active)throw Error('Finish or cancel the current operation');
  if(state.toolCondition<.1)throw Error('Drill head worn below safe operating condition; service required');
  if(!deposit||!idok(deposit.id)||deposit.bodyId!==bodyId||truckBodyId!==bodyId||!truckPresent||!operatorNear||!truckIdle)throw Error('Park truck with operator in surveyed solid-body sector');
  if(!surveyed)throw Error('Spectrometer survey required before drilling');
  if(!finite(energyJ)||energyJ<DRILL.minimumEnergyJ)throw Error('Truck battery too low for a drilling batch');
  state.sequence++;
  const task={id:'8d:drill:'+state.sequence,type:'DRILL',bodyId,siteId:deposit.id,materialId:deposit.type,
   deposit:clone(deposit),massKg:DRILL.kgPerBatch,durationS:DRILL.durationS,elapsedS:0,energyJ:0,
   powerW:DRILL.powerW,volumeM3PerKg:DRILL.volumeM3PerKg};
  state.active=task;return clone(task);
 }
 function startLoad({lotId,massKg,bodyId,truckBodyId,shipBodyId,truckNearShip,operatorNear,truckIdle=true,energyJ}){
  if(state.active)throw Error('Finish or cancel the current operation');
  if(!idok(lotId)||!finite(massKg)||massKg<=0||massKg>LOADER.kgPerBatch||!idok(bodyId)||
    truckBodyId!==bodyId||shipBodyId!==bodyId||!truckNearShip||!operatorNear||!truckIdle)throw Error('Park truck near landed ship, exit and attach loader');
  if(!finite(energyJ)||energyJ<LOADER.powerW*LOADER.durationS)throw Error('Truck battery too low to operate loader');
  state.sequence++;
  state.active={id:'8d:haul:'+state.sequence,type:'LOAD',bodyId,lotId,massKg,durationS:LOADER.durationS,elapsedS:0,energyJ:0,powerW:LOADER.powerW};
  return clone(state.active);
 }
 function advance(dt,availableEnergyJ,{enabled=true}={}){
  const a=state.active;
  if(!a)return {active:false,usedJ:0,completed:false};
  if(!finite(dt)||dt>2||!finite(availableEnergyJ))throw Error('Invalid 8D machine time step');
  if(!enabled)return{active:true,usedJ:0,completed:false,paused:true};
  const remaining=Math.max(0,a.durationS-a.elapsedS),seconds=Math.min(dt,remaining,availableEnergyJ/a.powerW);
  a.elapsedS+=seconds;const usedJ=seconds*a.powerW;a.energyJ+=usedJ;
  if(a.type==='DRILL')state.toolCondition=Math.max(0,state.toolCondition-seconds*.0002);
  return{active:true,usedJ,completed:a.elapsedS+1e-8>=a.durationS,progress:a.elapsedS/a.durationS};
 }
 function cancel(){if(!state.active)return false;state.history.push({id:state.active.id,type:state.active.type,status:'CANCELLED',energyJ:state.active.energyJ});if(state.history.length>500)state.history.shift();state.active=null;return true;}
 function commit(materials,resources){
  const a=state.active;
  if(!a||a.elapsedS+1e-6<a.durationS)throw Error('8D machine cycle incomplete');
  let nextMaterials=prepareContainers(inventoryFactory.create(materials.snapshot()));
  const nextResources=resourceFactory.create(resources.serialize());
  if(a.type==='DRILL'){
   const d=a.deposit;if(d.id!==a.siteId||d.bodyId!==a.bodyId||d.type!==a.materialId)throw Error('Drill target identity mismatch');
   if(nextResources.remaining(d)<a.massKg)throw Error('Insufficient unmined deposit mass');
   const lot={id:'mine:'+a.id,containerId:TRUCK,materialId:d.type,massKg:a.massKg,
    volumeM3:a.massKg*a.volumeM3PerKg,grade:d.grade,provenance:d.id};
   // Import first on clones. Only after verified capacity may deposit be depleted.
   nextMaterials.importLot(lot);
   nextResources.extract(d,a.massKg,{id:a.id,depositId:d.id,destinationContainerId:TRUCK,status:'COMMITTED'});
  }else if(a.type==='LOAD'){
   const lot=nextMaterials.inventory(TRUCK).find(l=>l.id===a.lotId);
   if(!lot)throw Error('Specified truck material lot missing');
   if(a.massKg>lot.massKg+1e-8)throw Error('Truck material was consumed before loading');
   nextMaterials.reserve(a.id,a.lotId,SHIP,a.massKg);
   nextMaterials.commit(a.id);
  }else if(a.type==='SERVICE'){
   if(a.energyJ+1e-6<SERVICE.minimumEnergyJ)throw Error('Drill service energy not paid');
   serviceHead(nextMaterials,a.lotId);
   const s=nextMaterials.snapshot(),head=s.lots.find(l=>l.id===a.lotId),oldKg=head.massKg;
   head.massKg-=SERVICE.headMassKg;head.volumeM3*=head.massKg/oldKg;
   s.lots=s.lots.filter(l=>l.massKg>1e-8);
   // The paid original truck includes its worn 2 kg head. Swap equal masses;
   // retired tooling is real scrap, not a refund of a new usable head.
   s.lots.push({id:'service:'+a.id+':worn-head',materialId:'manufacturing_scrap',
    containerId:SHIP,massKg:SERVICE.headMassKg,volumeM3:.002,
    grade:0,provenance:'retired-drill-head:'+a.id});
   s.operations.push({id:a.id,kind:'DRILL_SERVICE_8D',status:'COMMITTED',
    sourceLotId:a.lotId,massKg:SERVICE.headMassKg,energyJ:a.energyJ,bodyId:a.bodyId});
   nextMaterials=inventoryFactory.create(s); // Capacity/identity before changing condition.
   state.toolCondition=1;
  }else throw Error('Unknown 8D operation');
  state.history.push({id:a.id,type:a.type,status:'COMMITTED',massKg:a.massKg,
   source:a.type==='DRILL'?a.siteId:a.lotId,destination:a.type==='DRILL'?TRUCK:SHIP,energyJ:a.energyJ});
  if(state.history.length>500)state.history.shift();
  state.active=null;
  return {materials:nextMaterials,resources:nextResources,operation:clone(state.history[state.history.length-1])};
 }
 function receipt(id){return state.history.find(h=>h.id===id)?clone(state.history.find(h=>h.id===id)):null;}
 return Object.freeze({startDrill,startLoad,startService,advance,commit,cancel,snapshot,receipt,
  apply:saved=>{state=normalize(saved);},
  get toolCondition(){return state.toolCondition;},get active(){return state.active?clone(state.active):null;}});
}
root.StarfallMining8D=Object.freeze({TRUCK,SHIP,LIMITS,DRILL,LOADER,SERVICE,create,prepareContainers});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallMining8D;
})(typeof globalThis!=='undefined'?globalThis:this);
