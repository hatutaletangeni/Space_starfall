/* STARFALL 8J: a conservative, finite, source-owned first planetary intervention.
 * The original 8A pressure vessel OWNS the CO2. No generated gas or terrain edits.
 * This is a tiny modeled atmospheric perturbation, NOT planet terraforming.
 */
(function(root){'use strict';
const R=8.314462618,EPS=1e-7,MAX_KG=0.5,WORK_J=5000;
const cp=x=>JSON.parse(JSON.stringify(x));
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const nonnegative=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&Math.abs(Math.hypot(...v)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;
function create(saved){
 const state=saved?cp(saved):{schema:1,worlds:{}};
 if(state.schema!==1||!state.worlds||typeof state.worlds!=='object'||Array.isArray(state.worlds))
  throw Error('8J incompatible world intervention save: preserve original backup');
 for(const [id,w] of Object.entries(state.worlds)){
  if(id!==w.bodyId||w.schema!==1||!positive(w.radiusM)||!positive(w.gravityMS2)||
   !nonnegative(w.baselinePressurePa)||!nonnegative(w.baselineAtmosphereKg)||
   !nonnegative(w.injectedCO2Kg)||!nonnegative(w.escapedCO2Kg)||!Array.isArray(w.receipts)||
   !nonnegative(w.lastS)||!nonnegative(w.pressurePa)||
   new Set(w.receipts.map(x=>x.id)).size!==w.receipts.length)
   throw Error('8J corrupt persisted world reservoir '+id);
 }
 function profile(body){
  if(!body||typeof body.id!=='string'||body.landable!==true||body.kind==='star'||
   !positive(body.radiusM)||!positive(body.gravityMS2)||!positive(body.pressurePa))
   throw Error('8J candidate must be a real landable atmospheric body with a valid science profile');
  if(body.gravityMS2<0.5||body.gravityMS2>30||body.pressurePa<100||body.pressurePa>2e6||
    (positive(body.temperatureK)&&(body.temperatureK<160||body.temperatureK>350)))
   throw Error('8J environmental feasibility gate: use a sealed habitat on this unsuitable world');
  return body;
 }
 function baseline(body,now){
  const area=4*Math.PI*body.radiusM*body.radiusM;
  const mass=body.pressurePa*area/body.gravityMS2;
  return {schema:1,bodyId:body.id,radiusM:body.radiusM,gravityMS2:body.gravityMS2,
   baselinePressurePa:body.pressurePa,baselineAtmosphereKg:mass,
   pressurePa:body.pressurePa,injectedCO2Kg:0,escapedCO2Kg:0,lastS:now,receipts:[],
   deltaTemperatureK:0,model:'uniform thin-atmosphere column; seeded prior'};
 }
 function coast(w,toS){
  if(!nonnegative(toS)||toS<w.lastS-EPS)throw Error('8J non-monotonic simulation time');
  const n=cp(w),dt=Math.max(0,toS-n.lastS);
  // Conservative tracer escape: 1e8 s e-folding, a declared coarse assumption.
  const escaped=n.injectedCO2Kg*(-Math.expm1(-dt/1e8));
  n.injectedCO2Kg=Math.max(0,n.injectedCO2Kg-escaped);
  n.escapedCO2Kg+=escaped;n.lastS=toS;
  n.pressurePa=n.baselinePressurePa+n.injectedCO2Kg*n.gravityMS2/
   (4*Math.PI*n.radiusM*n.radiusM);
  // No observable global temperature response from sub-kilogram releases.
  n.deltaTemperatureK=0;
  return n;
 }
 function read(body,toS){
  profile(body);const w=state.worlds[body.id];
  if(w&&(Math.abs(w.radiusM-body.radiusM)>1||Math.abs(w.gravityMS2-body.gravityMS2)>0.01))
   throw Error('8J world identity or science-profile version mismatch');
  return coast(w||baseline(body,toS),toS);
 }
 function inspect(body,toS){
  const w=read(body,toS),deltaPa=w.pressurePa-w.baselinePressurePa;
  return {bodyId:body.id,pressurePa:w.pressurePa,baselinePressurePa:w.baselinePressurePa,
   modeledDeltaPa:deltaPa,pressureUncertaintyPa:0.5,
   pressureChangeResolved:Math.abs(deltaPa)>=0.5,
   modeledDeltaTemperatureK:w.deltaTemperatureK,temperatureUncertaintyK:0.5,
   injectedCO2Kg:w.injectedCO2Kg,escapedCO2Kg:w.escapedCO2Kg,
   eventCount:w.receipts.length,measured:false,quality:'procedural model / instrument below resolution',
   model:w.model};
 }
 function release(a){
  const p=profile(a.body),id=a.jobId;
  if(typeof id!=='string'||!id.startsWith('terraform8j:')||id.length>128)
   throw Error('8J unique source transaction ID required');
  const prev=state.worlds[p.id];
  if(prev?.receipts.some(x=>x.id===id))return {duplicate:true,worlds:cp(state),receipt:cp(prev.receipts.find(x=>x.id===id))};
  if(!nonnegative(a.timeS)||!positive(a.massKg)||a.massKg>MAX_KG)
   throw Error('8J intervention limit: strictly positive and at most 0.5 kg per metered pulse');
  if(!a.shipLanded||!a.operatorEVA||!a.shipPowered||!vector(a.shipLocal)||!vector(a.operatorLocal)||
    !positive(a.bodyRadiusScene))
   throw Error('8J physical landed ship and on-foot operator required');
  if(!a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
    !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets))
   throw Error('8J original 8A material and physical custody missing');
  const vessel=a.physical.assets.find(x=>x.id===a.vesselId);
  if(!vessel||vessel.type!=='industrial_vessel'||vessel.state?.materialId!=='carbon_dioxide'||
    vessel.location?.kind!=='surface'||vessel.location.bodyId!==p.id||
    !vector(vessel.location.local)||!nonnegative(vessel.condition)||vessel.condition<.8)
   throw Error('8J needs an installed and sound CO2-rated physical pressure vessel on this world');
  if(arc(vessel.location.local,a.operatorLocal,a.bodyRadiusScene)>20||
    arc(vessel.location.local,a.shipLocal,a.bodyRadiusScene)>85)
   throw Error('8J must vent at the physical valve with nearby powered ship');
  const holder=a.materials.containers?.find(x=>x.id===vessel.state.containerId&&x.ownerId===vessel.id);
  if(!holder)throw Error('8J vessel has no owner-matched original 8A rated gas container');
  const lot=a.materials.lots.find(x=>x.id===a.lotId&&x.containerId===holder.id&&
    x.materialId==='carbon_dioxide'&&x.grade>=.98&&typeof x.provenance==='string'&&x.provenance);
  if(!lot||!nonnegative(lot.massKg)||lot.massKg+EPS<a.massKg)
   throw Error('8J missing source-owned measured CO2 gas; cannot create atmosphere');
  if(a.materials.operations?.some(x=>x.status==='RESERVED'&&x.lotId===lot.id))
   throw Error('8J pressurized source gas is reserved for another operation');
  const e=a.powerReceipt;
  if(!e||e.operationId!==id||e.status!=='COMMITTED'||
    e.sourceId!=='ship-main:engineering-battery'||!nonnegative(e.usedJ)||e.usedJ<WORK_J)
   throw Error('8J requires actual 5000 J electrical valve debit from ship source');
  const w=read(p,a.timeS),next=cp(state),materials=cp(a.materials);
  const source=materials.lots.find(x=>x.id===lot.id),beforeKg=source.massKg;
  source.massKg=Math.max(0,beforeKg-a.massKg);
  source.volumeM3=beforeKg?source.volumeM3*source.massKg/beforeKg:0;
  materials.lots=materials.lots.filter(x=>x.massKg>EPS);
  w.injectedCO2Kg+=a.massKg;
  w.pressurePa=w.baselinePressurePa+w.injectedCO2Kg*w.gravityMS2/
   (4*Math.PI*w.radiusM*w.radiusM);
  const receipt={id,bodyId:p.id,sourceVesselId:vessel.id,sourceLotId:lot.id,
   sourceProvenance:lot.provenance,kg:a.massKg,timeS:a.timeS,paidJ:e.usedJ,
   modeledDeltaPa:a.massKg*w.gravityMS2/(4*Math.PI*w.radiusM*w.radiusM)};
  w.receipts.push(receipt);next.worlds[p.id]=w;
  const lost=beforeKg-source.massKg;
  if(Math.abs(lost-a.massKg)>EPS)throw Error('8J atmospheric mass failed original stock conservation');
  return {duplicate:false,materials,worlds:next,receipt,observation:{
   ...inspectFrom(w),receiptId:id,source:'modeled reservoir / not direct gas measurement'}};
 }
 function inspectFrom(w){
  const deltaPa=w.injectedCO2Kg*w.gravityMS2/(4*Math.PI*w.radiusM*w.radiusM);
  return {bodyId:w.bodyId,pressurePa:w.pressurePa,modeledDeltaPa:deltaPa,
   pressureUncertaintyPa:.5,resolved:Math.abs(deltaPa)>=.5,
   injectedCO2Kg:w.injectedCO2Kg,escapedCO2Kg:w.escapedCO2Kg,
   modeledDeltaTemperatureK:0,temperatureUncertaintyK:.5};
 }
 function snapshot(){return cp(state);}
 return Object.freeze({inspect,release,snapshot,read});
}
const API=Object.freeze({create,MAX_KG,WORK_J});
root.StarfallTerraformOperations8J=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
