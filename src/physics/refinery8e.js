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
 iron_mineralogy:{label:'Identify and recover hematite from iron concentrate',material:'iron_concentrate',
  product:'hematite',residue:'iron_mineralogy_tailings',targetGrade:1,recovery:.80,
  targetElementFraction:(2*55.845)/(2*55.845+3*15.999),
  massKg:2,powerW:3200,seconds:240,capability:'mechanical_separator',
  minSourceGrade:.60,requiresProcessProvenance:true},
 carbon_recovery:{label:'Recover carbon from carbon-bearing rock',material:'carbon_feed',
  product:'carbon',residue:'carbon_ash_tailings',targetGrade:1,recovery:.80,
  targetElementFraction:1,massKg:10,powerW:2600,seconds:230,
  capability:'mechanical_separator'},
  aluminum_sort:{label:'Aluminum ore beneficiation',material:'aluminum_ore',
  product:'aluminosilicate_concentrate',residue:'aluminum_tailings',
  targetGrade:.65,recovery:.80,massKg:20,powerW:2100,seconds:160,capability:'mechanical_separator'},
 aluminosilicate_identification:{label:'Identify hydrated aluminosilicate mineral',
  material:'aluminosilicate_concentrate',product:'hydrated_aluminosilicate',
  residue:'aluminosilicate_mineralogy_tailings',targetGrade:1,recovery:.80,
  massKg:2,powerW:3300,seconds:240,capability:'mechanical_separator',
  minSourceGrade:.65,requiresProcessProvenance:true},
 copper_sort:{label:'Copper ore concentration',material:'copper_ore',product:'copper_concentrate',residue:'copper_tailings',targetGrade:.25,recovery:.70,massKg:20,powerW:2200,seconds:160,capability:'mechanical_separator'},
 copper_sulfide_identification:{label:'Identify copper(I) sulfide from copper concentrate',
  material:'copper_concentrate',product:'copper_sulfide',residue:'sulfide_mineralogy_tailings',
  targetGrade:1,targetElementFraction:(2*63.546)/(2*63.546+32.06),
  recovery:.78,massKg:2,powerW:3400,seconds:220,capability:'mechanical_separator',
  minSourceGrade:.25,requiresProcessProvenance:true},
 silica_sort:{label:'Silica beneficiation',material:'silica',product:'silica_concentrate',residue:'silicate_tailings',targetGrade:.95,recovery:.82,massKg:20,powerW:1500,seconds:130,capability:'mechanical_separator'},
 silica_polish:{label:'Quartz concentrate polishing',material:'silica_concentrate',
  product:'silicon_dioxide',residue:'silica_polishing_tailings',targetGrade:.99,recovery:.82,
  massKg:4,powerW:4200,seconds:160,capability:'mechanical_separator',minSourceGrade:.95,
  requiresProcessProvenance:true},
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
 const lot=materials.lots.find(x=>{
  if(x.materialId!==spec.material||x.containerId!==sourceContainerId)return false;
  if(spec.minSourceGrade!==undefined&&(!finite(x.grade)||x.grade+EPS<spec.minSourceGrade))return false;
  if(spec.requiresProcessProvenance&&!String(x.provenance||'').startsWith('process:refine8e:'))return false;
  const reserved=(materials.operations||[]).filter(o=>o.lotId===x.id&&o.status==='RESERVED').reduce((n,o)=>n+o.massKg,0);
  return x.massKg-reserved>=spec.massKg-EPS;
 });
 if(!lot&&spec.requiresProcessProvenance)throw Error('Need '+spec.massKg+' kg of 8E-process-provenanced '+spec.material+
  ' with source grade >= '+spec.minSourceGrade+' in the physical ship hold');
 if(!lot)throw Error('Missing '+spec.massKg+' kg of actual '+spec.material+' in ship hold');
 if(!finite(lot.grade)||lot.grade>1)throw Error('Uncalibrated ore grade — prospect and sample first');
 const contained=spec.massKg*lot.grade;
 if(contained<=EPS)throw Error('Ore assay contains no recoverable target material');
 const recovered=contained*spec.recovery;
 // For a chemically identified product, grade is a *purity*, whereas the
 // input's assay records recoverable ELEMENT mass. Hematite is only ~69.94%
 // Fe by mass; this bound conversion accounts for the oxygen already present
 // in the assayed iron-bearing rock rather than conjuring extra iron.
 const productElementFraction=spec.targetElementFraction??spec.targetGrade;
 const concentrated=productElementFraction>0?recovered/productElementFraction:0;
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
  targetElementFraction:productElementFraction,
  productGrade:spec.targetGrade,residue:spec.residue,residueKg,energyJ:spec.powerW*spec.seconds,
  seconds:spec.seconds,powerW:spec.powerW,assumptions:mode==='aluminosilicate_identification'?
  'Idealized separation of a kaolinite-equivalent mineral, Al2Si2O9H4. Synthetic 8C grade is treated as a mineral-richness fraction, not a measured aluminum-element assay. Thermal processing and downstream alumina separation are educational simplifications.' :
  mode==='copper_sulfide_identification'?
  'Copper assay converted to an idealized chalcocite (Cu2S) phase using its elemental Cu fraction. Assumes sulfide mineralogy; sulfur must be contained in the source rock, not created.' :
  mode==='iron_mineralogy'?
  'Idealized hematite identification from Fe-assayed concentrated rock. Assumes Fe2O3-bearing lithology; requires real upstream concentrate. Fe element conserved, oxygen comes from the original rock. Not proof of mineral identity by spectroscopy.' :
  mode==='carbon_recovery'?
  'Concentrates finite naturally present carbon mass; does not manufacture coke, graphite or chemicals. Residues retain unrecovered carbon.' :
  mode==='silica_polish'?
  'Idealized mechanical quartz upgrading; source must be 8E concentrate. Grade 99% is chemical mass fraction, NOT electronic silicon purity. No silicon metal is produced.' :
  'assay-based simplified separation; non-target constituents retained in residue'};
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
   outputContainerId:a.outputContainerId,lotId:a.lotId,outputGrades:{[a.product]:a.productGrade,[a.residue]:Math.max(0,Math.min(1,(a.inputKg*a.inputGrade-a.productKg*(a.targetElementFraction??a.productGrade))/Math.max(a.residueKg,EPS)))},
   energyReceipt:{operationId:a.id,sourceId:'ship-main:engineering-battery',usedJ:a.energyJ},
   station:{id:EQUIPMENT.id,kind:'ship_fabrication',containerId:a.sourceContainerId,condition:1,enabled:true}});
  const receipt={id:a.id,mode:a.mode,status:'COMMITTED',inputKg:a.inputKg,productKg:a.productKg,
    residueKg:a.residueKg,product:a.product,energyJ:a.energyJ,bodyId:a.bodyId,lotId:a.lotId};
  // Validate the complete 8A inventory BEFORE retiring a working machine job.
  if(root.StarfallMaterials8A?.create)root.StarfallMaterials8A.create(result.materials);
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
