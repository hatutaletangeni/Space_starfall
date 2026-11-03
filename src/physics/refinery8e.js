/* STARFALL 8E — real 8A-lot processing jobs attached to the already installed ship
 * fabrication workshop. Introductory separation / ice recovery only. This is a
 * conservative reduced-order materials model, NOT verified metallurgical chemistry.
 * No autonomous station spawns and no free reagents or electric power.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const MODES=Object.freeze({
 iron_sort:{label:'Iron ore concentration',material:'iron_ore',product:'iron_concentrate',residue:'iron_tailings',targetGrade:.60,recovery:.80,massKg:20,powerW:1800,seconds:100,capability:'mechanical_separator'},
 copper_sort:{label:'Copper ore concentration',material:'copper_ore',product:'copper_concentrate',residue:'copper_tailings',targetGrade:.25,recovery:.70,massKg:20,powerW:2200,seconds:160,capability:'mechanical_separator'},
 silica_sort:{label:'Silica beneficiation',material:'silica',product:'silica_concentrate',residue:'silicate_tailings',targetGrade:.95,recovery:.82,massKg:20,powerW:1500,seconds:130,capability:'mechanical_separator'},
 ice_recovery:{label:'Heated water extraction',material:'water_ice',product:'water',residue:'hydrated_residue',targetGrade:1,recovery:.80,massKg:10,powerW:3500,seconds:240,capability:'ice_recovery'}
});
const EQUIPMENT=Object.freeze({id:'ship-main:fab8e:mki',module:'fabrication',tools:['mechanical_separator','ice_recovery'],location:'ship-main',condition:1});
function normalize(saved){if(saved==null)return{schema:1,serial:0,active:null,receipts:[]};
 if(!saved||saved.schema!==1||!Number.isSafeInteger(saved.serial)||saved.serial<0||!Array.isArray(saved.receipts)||
 (saved.active!==null&&saved.active!==undefined&&(!Number.isSafeInteger(saved.active.serial)||!MODES[saved.active.mode]||!finite(saved.active.elapsedS)||!finite(saved.active.energyJ))))throw Error('Corrupt refinery save — restore old save rather than clear stocks');
 if(new Set(saved.receipts.map(x=>x.id)).size!==saved.receipts.length)throw Error('Duplicate refinery receipts');
 return clone(saved);}
function quote(mode,materials,sourceContainerId,outputContainerId){
 const spec=MODES[mode];if(!spec)throw Error('Unknown refining process');
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.containers))throw Error('8A material inventory required');
 const lot=materials.lots.find(x=>x.materialId===spec.material&&x.containerId===sourceContainerId&&x.massKg>=spec.massKg-EPS);
 if(!lot)throw Error('Missing '+spec.massKg+' kg of actual '+spec.material+' in ship hold');
 if(!finite(lot.grade)||lot.grade>1)throw Error('Uncalibrated ore grade — prospect and sample first');
 const contained=spec.massKg*lot.grade;
 const recovered=contained*spec.recovery;
 const concentrated=spec.targetGrade>0?recovered/spec.targetGrade:0;
 // The concentrate cannot contain more valuable material than the ore.
 if(!finite(concentrated)||concentrated>spec.massKg+EPS)throw Error('Input grade cannot be concentrated with this equipment');
 const outputKg=Math.min(spec.massKg,concentrated),residueKg=spec.massKg-outputKg;
 const dest=materials.containers.find(x=>x.id===outputContainerId);if(!dest)throw Error('Missing real output bin');
 const stored=materials.lots.filter(x=>x.containerId===outputContainerId).reduce((a,l)=>({mass:a.mass+l.massKg,volume:a.volume+l.volumeM3}),{mass:0,volume:0});
 const debitSame=sourceContainerId===outputContainerId?spec.massKg:0;
 // Inputs and products share the hold: capacity is checked after the exact debit.
 if(stored.mass-debitSame+spec.massKg>dest.maxMassKg+EPS)throw Error('Output store full');
 const sourceVolume=lot.volumeM3/lot.massKg*spec.massKg;
 const afterVolume=stored.volume-(sourceContainerId===outputContainerId?sourceVolume:0)+sourceVolume;
 if(afterVolume>dest.maxVolumeM3+EPS)throw Error('Output volume limit reached');
 return {mode,lotId:lot.id,sourceContainerId,outputContainerId,material:spec.material,
  inputKg:spec.massKg,inputGrade:lot.grade,product:spec.product,productKg:outputKg,
  productGrade:spec.targetGrade,residue:spec.residue,residueKg,energyJ:spec.powerW*spec.seconds,
  seconds:spec.seconds,powerW:spec.powerW,assumptions:'assay-based simplified separation; non-target constituents retained in residue'};
}
function create(saved){let state=normalize(saved);
 function start({mode,materials,sourceContainerId,outputContainerId,workshopInstalled,shipLanded,shipBodyId,powerEnabled,batteryJ}){
  if(state.active)throw Error('One refinery cycle at a time');
  if(!workshopInstalled)throw Error('Ship fabrication module not installed or commissioned');
  if(!shipLanded||!shipBodyId)throw Error('Ship processor requires a landed, stable spacecraft');
  if(!powerEnabled||!finite(batteryJ)||batteryJ<=0)throw Error('Ship electrical bus has no available energy');
  const q=quote(mode,materials,sourceContainerId,outputContainerId);
  state.serial++;state.active={...q,id:'refine8e:'+state.serial,serial:state.serial,bodyId:shipBodyId,elapsedS:0,energyJ:0};
  return clone(state.active);
 }
 function step(dt,availableEnergyJ,enabled=true){const a=state.active;
  if(!a)return {active:false,usedJ:0,completed:false};
  if(!finite(dt)||dt>10||!finite(availableEnergyJ))throw Error('Invalid refining timestep or energy');
  if(!enabled)return {active:true,usedJ:0,paused:true};
  const remain=Math.max(0,a.seconds-a.elapsedS),elapsed=Math.min(dt,remain,availableEnergyJ/a.powerW);
  const usedJ=elapsed*a.powerW;a.elapsedS+=elapsed;a.energyJ+=usedJ;
  return{active:true,usedJ,completed:a.elapsedS+EPS>=a.seconds,progress:a.elapsedS/a.seconds};
 }
 function commit(materials,transformation){const a=state.active;if(!a||a.elapsedS+EPS<a.seconds)throw Error('Incomplete refining cycle');
  const spec=MODES[a.mode];if(!spec)throw Error('Unknown process');
  const q=quote(a.mode,materials,a.sourceContainerId,a.outputContainerId);
  // Grade and lot pinned at start; fail closed if stocks changed while processing.
  if(q.lotId!==a.lotId||Math.abs(q.inputGrade-a.inputGrade)>EPS)throw Error('Original feedstock changed during refinery work');
  const recipe={station:'ship_fabrication',inputs:{[a.material]:a.inputKg},
   outputs:{[a.product]:a.productKg,[a.residue]:a.residueKg},powerW:a.powerW,seconds:a.seconds};
  const result=transformation.convert({operationId:a.id,recipeId:a.mode,recipe,materials,containerId:a.sourceContainerId,
   outputContainerId:a.outputContainerId,outputGrades:{[a.product]:a.productGrade,[a.residue]:Math.max(0,Math.min(1,(a.inputKg*a.inputGrade-a.productKg*a.productGrade)/Math.max(a.residueKg,EPS)))},
   energyReceipt:{operationId:a.id,sourceId:'ship-main:engineering-battery',usedJ:a.energyJ},
   station:{id:EQUIPMENT.id,kind:'ship_fabrication',containerId:a.sourceContainerId,condition:1,enabled:true}});
  const receipt={id:a.id,mode:a.mode,status:'COMMITTED',inputKg:a.inputKg,productKg:a.productKg,
    residueKg:a.residueKg,product:a.product,energyJ:a.energyJ,bodyId:a.bodyId,lotId:a.lotId};
  state.receipts.push(receipt);state.active=null;
  return {materials:result.materials,transformations:result.operations,refinery:stateSnapshot(),receipt:clone(receipt)};
 }
 function cancel(){if(!state.active)return false;state.receipts.push({id:state.active.id,mode:state.active.mode,status:'CANCELLED',
  energyJ:state.active.energyJ,bodyId:state.active.bodyId});state.active=null;return true;}
 function stateSnapshot(){return clone(state);}
 return Object.freeze({start,step,commit,cancel,snapshot:stateSnapshot,get active(){return state.active?clone(state.active):null},get receipts(){return clone(state.receipts)}});
}
root.StarfallRefinery8E=Object.freeze({MODES,EQUIPMENT,quote,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallRefinery8E;
})(typeof globalThis!=='undefined'?globalThis:this);
