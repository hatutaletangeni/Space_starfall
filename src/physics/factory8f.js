/* STARFALL 8F — physical ship fabrication workflow, versioned BOM and
 * metered incremental jobs; no free starting chips, magnets, machine tools or metals.
 * Only the already installed ship fabrication module's wire die is bootstrapped.
 * Advanced recipes require separately owned physical certified stations.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const ident=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const model=()=>root.StarfallManufacturing8F;
function billOfMaterials(recipeId){
 const r=model()?.RECIPES?.[recipeId];if(!r)throw Error('Unknown industrial part definition');
 const input=Object.values(r.inputs).reduce((a,b)=>a+b,0),output=Object.values(r.outputs).reduce((a,b)=>a+b,0);
 return {schema:1,version:1,id:recipeId,category:r.category,requiredStation:r.station,tool:r.tool,
   inputs:clone(r.inputs),outputs:clone(r.outputs),outputVolumesM3:clone(r.outputVolumesM3||{}),scrapKg:input-output,
   powerW:r.powerW,seconds:r.seconds,energyJ:r.powerW*r.seconds,toleranceMm:r.toleranceMm,
   qualityRisk:'Simplified yield only. Precision certification and service performance must be validated on installation.'};
}
function quote({recipeId,materials,sourceContainerId,outputContainerId,machine}){
 const r=model()?.RECIPES?.[recipeId];if(!r)throw Error('Missing part recipe');
 const bom=billOfMaterials(recipeId);
 if(!machine||machine.id==null||machine.station!==r.station||!machine.tools?.includes(r.tool)||
  !machine.installed||machine.condition<.5)throw Error('Missing installed '+r.station+' / '+r.tool+' workshop tool');
 if(!materials||materials.schema!==1||!Array.isArray(materials.lots)||!Array.isArray(materials.containers))throw Error('Missing 8A inventory');
 for(const [id,kg] of Object.entries(r.inputs)){
  const available=materials.lots.filter(l=>l.containerId===sourceContainerId&&l.materialId===id&&
   (typeof l.grade==='number'&&l.grade>=.98)).reduce((a,l)=>{
    const reserved=(materials.operations||[]).filter(o=>o.status==='RESERVED'&&o.lotId===l.id).reduce((s,o)=>s+o.massKg,0);
    return a+Math.max(0,l.massKg-reserved);
   },0);
  if(available+EPS<kg)throw Error('Missing refined '+id+': '+kg+' kg required');
 }
 // Kit outputs must fit their ACTUAL packaged volume, not the feedstock's
 // denser aggregate volume. Preflight before any battery energy is spent.
 if(r.outputVolumesM3){
  let removedVol=0;
  if(sourceContainerId===outputContainerId){
   for(const [materialId,need] of Object.entries(r.inputs)){
    let remaining=need;
    for(const lot of materials.lots){
     if(lot.containerId!==sourceContainerId||lot.materialId!==materialId||
       !finite(lot.grade)||lot.grade<.98)continue;
     const held=(materials.operations||[]).filter(x=>x.status==='RESERVED'&&x.lotId===lot.id).reduce((a,x)=>a+x.massKg,0);
     const take=Math.min(remaining,Math.max(0,lot.massKg-held));
     removedVol+=take*lot.volumeM3/lot.massKg;remaining-=take;
     if(remaining<=EPS)break;
    }
   }
  }
  const container=materials.containers.find(x=>x.id===outputContainerId);
  if(!container)throw Error('Missing actual output container');
  const existing=materials.lots.filter(x=>x.containerId===outputContainerId)
    .reduce((a,x)=>a+x.volumeM3,0);
  const needed=Object.values(r.outputVolumesM3).reduce((a,x)=>a+x,0);
  if(existing-removedVol+needed>container.maxVolumeM3+EPS)
   throw Error('Insufficient volume for assembled physical machine kit');
 }
 const c=materials.containers.find(x=>x.id===outputContainerId);
 if(!c)throw Error('Output container missing');
 if(sourceContainerId!==outputContainerId){
  const mass=materials.lots.filter(l=>l.containerId===outputContainerId).reduce((a,l)=>a+l.massKg,0);
  if(mass+Object.values(r.inputs).reduce((a,b)=>a+b,0)>c.maxMassKg+EPS)throw Error('Insufficient output space');
 }
 return bom;
}
function create(saved){
 const state=saved==null?{schema:1,serial:0,active:null,receipts:[]}:clone(saved);
 if(state.schema!==1||!Number.isSafeInteger(state.serial)||state.serial<0||!Array.isArray(state.receipts)||
 (state.active!=null&&(!ident(state.active.id)||!ident(state.active.recipeId)||!finite(state.active.elapsedS)||!finite(state.active.energyJ)))||
 new Set(state.receipts.map(x=>x.id)).size!==state.receipts.length)throw Error('Corrupt 8F factory save');
 function start({recipeId,materials,sourceContainerId,outputContainerId,machine,shipLanded,bodyId,powerEnabled,batteryJ}){
  if(state.active)throw Error('Finish or cancel previous machining job');
  if(!shipLanded||!ident(bodyId)||!powerEnabled||!finite(batteryJ)||batteryJ<=0)throw Error('Station requires landed powered ship');
  const bom=quote({recipeId,materials,sourceContainerId,outputContainerId,machine});
  state.serial++;state.active={id:'manufacture8f:'+state.serial,serial:state.serial,
   recipeId,machineId:machine.id,bodyId,sourceContainerId,outputContainerId,
   inputs:clone(bom.inputs),elapsedS:0,seconds:bom.seconds,powerW:bom.powerW,energyJ:0};
  return clone(state.active);
 }
 function step(dt,energyJ,enabled=true){const a=state.active;
  if(!a)return {active:false,usedJ:0,completed:false};
  if(!finite(dt)||dt>10||!finite(energyJ))throw Error('Invalid machine time or energy');
  if(!enabled)return{active:true,paused:true,usedJ:0};
  const elapsed=Math.min(dt,Math.max(0,a.seconds-a.elapsedS),energyJ/a.powerW);
  a.elapsedS+=elapsed;a.energyJ+=elapsed*a.powerW;
  return{active:true,completed:a.elapsedS+EPS>=a.seconds,usedJ:elapsed*a.powerW,progress:a.elapsedS/a.seconds};
 }
 function commit({materials,transformer,machine}){
  const a=state.active;if(!a||a.elapsedS+EPS<a.seconds)throw Error('8F machine cycle not complete');
  if(machine?.id!==a.machineId)throw Error('Machine identity changed');
  const bom=quote({recipeId:a.recipeId,materials,sourceContainerId:a.sourceContainerId,outputContainerId:a.outputContainerId,machine});
  const r=model().RECIPES[a.recipeId],scrap=bom.scrapKg;
  if(a.energyJ+EPS<bom.energyJ)throw Error('Manufacturing energy not paid');
  const recipe={station:r.station,inputs:r.inputs,outputs:{...r.outputs,...(scrap>EPS?{manufacturing_scrap:scrap}:{})},
   powerW:r.powerW,seconds:r.seconds};
  const result=transformer.convert({operationId:a.id,recipeId:a.recipeId,recipe,materials,
   containerId:a.sourceContainerId,outputContainerId:a.outputContainerId,
   outputVolumesM3:r.outputVolumesM3||{},minInputGrade:.98,outputGrades:Object.fromEntries(Object.keys(r.outputs).map(id=>[id,1])),
   energyReceipt:{operationId:a.id,sourceId:'ship-main:engineering-battery',usedJ:a.energyJ},
   station:{id:machine.id,kind:r.station,containerId:a.sourceContainerId,condition:machine.condition,enabled:true}});
  // The pure transformer handles balance and storage. Nothing is committed until it succeeds.
  const receipt={id:a.id,recipeId:a.recipeId,machineId:a.machineId,bodyId:a.bodyId,
    status:'COMMITTED',energyJ:a.energyJ,partMassKg:Object.values(r.outputs).reduce((s,n)=>s+n,0),
    scrapKg:scrap,bomVersion:1};
  const next=clone(state);next.receipts.push(receipt);next.active=null;
  return{receipt,materials:result.materials,transformations:result.operations,factory:next};
 }
 function apply(next){const validated=create(next);Object.assign(state,validated.snapshot());}
 function cancel(){if(!state.active)return false;state.receipts.push({id:state.active.id,
  status:'CANCELLED',recipeId:state.active.recipeId,energyJ:state.active.energyJ});state.active=null;return true;}
 function snapshot(){return clone(state)}
 return Object.freeze({start,step,commit,apply,cancel,snapshot,get active(){return state.active?clone(state.active):null},
  get receipts(){return clone(state.receipts)}});
}
root.StarfallFactory8F=Object.freeze({billOfMaterials,quote,create});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallFactory8F;
})(typeof globalThis!=='undefined'?globalThis:this);
