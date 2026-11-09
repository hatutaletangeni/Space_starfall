/* STARFALL 8I — finite 8F-to-original-T02 solar/48 V battery installation.
 * The ship's REAL 8A lot and factory8f + transformation8e receipts own every
 * input. This is a PURE transaction; flight commits inventory, outpost and
 * ship energy in one SF.save after the prescribed simulated assembly time.
 * Native T02 must use the physically installed per-device power rating.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const genuine=x=>id(x)&&!/TEST_FIXTURE|CREATIVE|DEBUG|CHEAT/i.test(x);
const norm=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*r;
const SPECS=Object.freeze({
 solar:Object.freeze({part:'solar_module',kg:8.8,workJ:250000,seconds:300,radius:5,
  nameplateW:400,areaM2:2.3,efficiency:.24}),
 battery:Object.freeze({part:'battery_cell',kg:15.6,workJ:450000,seconds:600,radius:3.5,
  capacityJ:9600000,chargeW:1000,dischargeW:1800})
});
function prepare(a){
 if(!a||!id(a.operationId)||!a.operationId.startsWith('t02paid8i:')||
  !id(a.bodyId)||!id(a.containerId)||!SPECS[a.kind]||
  !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
  !Array.isArray(a.materials.operations)||!Array.isArray(a.materials.containers)||
  !a.factory||a.factory.schema!==1||!Array.isArray(a.factory.receipts)||
  !a.transformations||a.transformations.schema!==1||!Array.isArray(a.transformations.operations)||
  !a.outpost||a.outpost.schema!==1||!Array.isArray(a.outpost.items)||
  !norm(a.local)||!norm(a.shipLocal)||!norm(a.evaLocal)||
  !valid(a.bodyRadius)||a.bodyRadius<=0||
  !Array.isArray(a.lotIds)||!a.lotIds.length||
  a.lotIds.length>100||new Set(a.lotIds).size!==a.lotIds.length)
  throw Error('8I T02 installation needs original 8A ship stock, factory8f and same-world site');
 const spec=SPECS[a.kind],deviceId='t02paid:'+a.operationId;
 if(a.outpost.items.length>=320)throw Error('Original outpost T02 equipment limit');
 if(a.outpost.items.some(x=>x.id===deviceId||x.installOperationId===a.operationId))
  throw Error('T02 physical installation already committed; never duplicate a device');
 if(a.materials.operations.some(x=>x.id===a.operationId))
  throw Error('T02 energy/stock receipt ID already used');
 if(!a.materials.containers.some(x=>x.id===a.containerId&&x.ownerId==='ship-main'))
  throw Error('8I requires actual ship-owned material container, not an imaginary source');
 if(arc(a.local,a.shipLocal,a.bodyRadius)>85||
    arc(a.local,a.evaLocal,a.bodyRadius)>24)
  throw Error('8I requires original ship and EVA physically beside the installation');
 const radii={hab:6,solar:5,battery:3.5,foundation:4,connector:1.9,lab:5,storage:4,antenna:3};
 if(a.outpost.items.some(x=>x.bodyId===a.bodyId&&norm(x.local)&&
  arc(a.local,x.local,a.bodyRadius)<spec.radius+(radii[x.kind]||4)+1.1))
  throw Error('8I original T02 installation overlaps another physical structure');
 const reservations=new Map();
 for(const op of a.materials.operations)if(op.status==='RESERVED'&&id(op.lotId)&&valid(op.massKg))
  reservations.set(op.lotId,(reservations.get(op.lotId)||0)+op.massKg);
 const consumed=[],seenOrigin=new Set();
 let remaining=spec.kg;
 for(const lotId of a.lotIds){
  const lot=a.materials.lots.find(x=>x.id===lotId&&x.containerId===a.containerId&&
   x.materialId===spec.part&&valid(x.grade)&&x.grade>=.98&&
   genuine(x.provenance)&&valid(x.massKg)&&lotId!=='');
  if(!lot)throw Error('8I T02 requires source-owned high-grade '+spec.part+' in the actual ship hold');
  const origin=lot.provenance;
  if(!origin.startsWith('process:manufacture8f:'))
   throw Error('8I part provenance must point to a genuine completed 8F factory job');
  const jobId=origin.slice('process:'.length);
  const matches=a.factory.receipts.filter(x=>x.id===jobId&&x.recipeId===spec.part&&
    x.status==='COMMITTED'&&genuine(x.id)&&id(x.bodyId)&&valid(x.energyJ)&&x.energyJ>0);
  const t=a.transformations.operations.filter(x=>x.id===jobId&&x.recipeId===spec.part&&
    x.status==='COMMITTED'&&x.outputs?.[spec.part]>0&&x.energyJ>0);
  if(matches.length!==1||t.length!==1)
   throw Error('8I requires two matching original 8F and 8E production receipts for each part lot');
  // An authentic output lot or a legitimately shipped 8A transfer lot can
  // share original process provenance. Never count more than job output.
  if(!seenOrigin.has(jobId)){
   const produced=a.materials.lots.filter(x=>x.materialId===spec.part&&
      x.provenance===origin).reduce((s,x)=>s+x.massKg,0);
   if(produced>t[0].outputs[spec.part]+EPS)
    throw Error('8I cannot install overproduced or forged 8F part mass');
   seenOrigin.add(jobId);
  }
  const free=Math.max(0,lot.massKg-(reservations.get(lotId)||0));
  const take=Math.min(remaining,free);
  if(take>EPS){consumed.push({lotId,massKg:take,sourceJobId:jobId});remaining-=take;}
  if(remaining<=EPS)break;
 }
 if(remaining>EPS)throw Error('8I requires '+spec.kg+' kg finished '+spec.part+
  ' from genuine source-paid 8F jobs; short '+remaining.toFixed(3)+' kg');
 return{spec,deviceId,consumed};
}
function quote(a){
 const p=prepare(a);
 return{ready:true,kind:a.kind,massKg:p.spec.kg,part:p.spec.part,
  requiredJ:p.spec.workJ,seconds:p.spec.seconds,deviceId:p.deviceId,
  sourceJobs:[...new Set(p.consumed.map(x=>x.sourceJobId))],
  sourceLots:p.consumed.map(x=>x.lotId),
  ratedSolarW:p.spec.nameplateW||0,capacityJ:p.spec.capacityJ||0};
}
function install(a){
 const p=prepare(a),spec=p.spec;
 if(!valid(a.startedAtS)||!valid(a.nowS)||a.nowS+EPS<a.startedAtS+spec.seconds)
  throw Error('8I T02 installation requires real elapsed simulated construction time');
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered)
  throw Error('8I original powered landed ship and EVA required for final commissioning');
 if(!valid(a.shipEnergyJ)||a.shipEnergyJ+EPS<spec.workJ)
  throw Error('8I original ship battery insufficient for physical T02 installation');
 const energy=a.energyReceipt;
 if(!energy||energy.operationId!==a.operationId||
  energy.sourceId!=='ship-main:engineering-battery'||energy.status!=='COMMITTED'||
  energy.usedJ!==spec.workJ)
  throw Error('8I requires exactly one source-owned committed ship battery debit');
 const materials=cp(a.materials),outpost=cp(a.outpost);
 for(const d of p.consumed){
  const lot=materials.lots.find(x=>x.id===d.lotId),before=lot.massKg;
  lot.massKg=Math.max(0,before-d.massKg);
  lot.volumeM3=Math.max(0,lot.volumeM3*lot.massKg/before);
 }
 materials.lots=materials.lots.filter(x=>x.massKg>EPS);
 const item={id:p.deviceId,kind:a.kind,bodyId:a.bodyId,
  installOperationId:a.operationId,installedMassKg:spec.kg,
  local:cp(a.local),facing:[0,0,1],height:0,energyJ:0,
  temperatureK:290,condition:1,enabled:true,
  ...(a.kind==='solar'?{ratedSolarW:spec.nameplateW,areaM2:spec.areaM2,efficiency:spec.efficiency}:
   {ratedCapacityJ:spec.capacityJ,ratedChargeW:spec.chargeW,ratedDischargeW:spec.dischargeW}),
  samples:[]};
 outpost.items.push(item);
 const receipt={id:a.operationId,kind:'T02_PAID_INSTALL_8I',status:'COMMITTED',
  deviceId:item.id,bodyId:a.bodyId,sourceContainerId:a.containerId,
  sourceLots:cp(p.consumed),installedMassKg:spec.kg,
  workJ:spec.workJ,energySourceId:'ship-main:engineering-battery',
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-spec.workJ,
  startedAtS:a.startedAtS,completedAtS:a.nowS,
  initialChargeJ:0};
 materials.operations.push(receipt);
 return{duplicate:false,materials,outpost,item,receipt,
  shipEnergyJ:a.shipEnergyJ-spec.workJ};
}
const API=Object.freeze({SPECS,quote,install});
root.StarfallT02PaidInstall8I=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);