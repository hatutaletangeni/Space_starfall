/* STARFALL 8G — metered, non-habitable first charge from two actual 8E
 * pressure vessels and finite ship-held water. This is a synchronous,
 * accountable field operation, not a certified pressure/life-support service.
 * Gas lots NEVER teleport to a ship hold; their mass is removed directly
 * from their original rated 8A vessel containers and enters the same
 * manufactured habitat physical asset as T09 pressure state.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const WORK_J=1500000,MIN_SOURCE_RATING_PA=5e6;
const MAX_SHIP_RANGE=100,MAX_EVA_RANGE=24,MAX_HOSE_RANGE=95;
const MOLE_KG=Object.freeze({oxygen:.031998,nitrogen:.028014});
const needs=()=>root.StarfallHabitatCharge8G.requirements();
const radiusOk=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
  Math.abs(Math.hypot(...x)-1)<1e-4;
const arc=(x,y,r)=>Math.acos(Math.max(-1,Math.min(1,
 x.reduce((s,v,i)=>s+v*y[i],0))))*r;
function check(a,withPower){
 if(!a||!id(a.jobId)||!a.jobId.startsWith('habhose8g:')||
 !id(a.habitatId)||!id(a.oxygenVesselId)||!id(a.nitrogenVesselId)||
 a.oxygenVesselId===a.nitrogenVesselId||!id(a.bodyId)||!id(a.shipContainerId)||
 !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
 !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
 !Array.isArray(a.materials.containers)||!Array.isArray(a.materials.operations)||
 !a.assembly||a.assembly.schema!==1||!Array.isArray(a.assembly.receipts))
  throw Error('Real unique physical 8A habitat, vessels and construction receipts required');
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered||
 !good(a.bodyRadius)||a.bodyRadius<=0||!radiusOk(a.shipLocal)||!radiusOk(a.evaLocal))
  throw Error('Physically landed powered spacecraft and EVA operator required');
 const target=a.physical.assets.find(x=>x.id===a.habitatId);
 if(!target||target.type!=='habitat_envelope'||target.provenance!=='structural-8g:'+target.id||
 target.location?.kind!=='surface'||target.location.bodyId!==a.bodyId||
 !radiusOk(target.location.local)||!good(target.condition)||target.condition<.95)
  throw Error('An intact manufactured same-world pressure envelope is required');
 if(target.state?.habitatCharge8g||target.state?.meteredCharge8g||
   target.state?.pressurePa>0||target.state?.habitable===true||
   target.state?.oxygenKg>EPS||target.state?.inertKg>EPS||
   target.state?.waterKg>EPS)
  throw Error('Habitat has already received a charge; prevent duplicate gases');
 if(!a.assembly.receipts.some(x=>x.assetId===a.habitatId&&
 x.blueprintId==='habitat_shell'&&x.bodyId===a.bodyId&&
 x.status==='ASSEMBLED_NOT_OPERATIONAL'))
  throw Error('Original consumed 8G manufacturing receipt required');
 if(arc(target.location.local,a.shipLocal,a.bodyRadius)>MAX_SHIP_RANGE||
    arc(target.location.local,a.evaLocal,a.bodyRadius)>MAX_EVA_RANGE)
  throw Error('Habitat outside 100-unit ship hose and 24-unit EVA supervision');
 const waterContainer=a.materials.containers.find(x=>x.id===a.shipContainerId);
 if(!waterContainer||waterContainer.ownerId!=='ship-main')
  throw Error('Initial habitat water must come from the real ship-owned 8A hold');
 const vessels={};const sources=[];
 for(const [materialId,vesselId] of [['oxygen',a.oxygenVesselId],['nitrogen',a.nitrogenVesselId]]){
  const v=a.physical.assets.find(x=>x.id===vesselId);
  if(!v||v.type!=='industrial_vessel'||v.state?.materialId!==materialId||
   !good(v.condition)||v.condition<.8||v.state?.enabled!==true||
   !good(v.state?.ratedPressurePa)||v.state.ratedPressurePa<MIN_SOURCE_RATING_PA)
   throw Error('Requires an intact, enabled 5 MPa+ rated '+materialId+' vessel');
  let surface;
  if(v.location?.kind==='surface'&&v.location.bodyId===a.bodyId&&radiusOk(v.location.local))
   surface=v.location.local;
  else if(v.location?.kind==='ship'&&v.location.parentId==='ship-main'&&
    v.location.slot==='engineering-gas-cradle')surface=a.shipLocal;
  else throw Error('Gas vessel must be physically on this world or secured aboard this landed ship');
  if(arc(surface,target.location.local,a.bodyRadius)>MAX_HOSE_RANGE||
     arc(surface,a.evaLocal,a.bodyRadius)>MAX_HOSE_RANGE)
   throw Error('Gas vessel is beyond the sealed rated hose reach');
  const container=a.materials.containers.find(c=>c.id===v.state.containerId);
  if(!container||container.ownerId!==v.id||!String(container.kind).includes('gas')||
    !good(container.maxMassKg)||!good(container.maxVolumeM3))
   throw Error('Pressure vessel lacks its own rated gas container');
  const lots=a.materials.lots.filter(l=>l.containerId===container.id);
  if(lots.some(l=>l.materialId!==materialId||!good(l.massKg)||!good(l.volumeM3)))
   throw Error('Mixed/invalid gas contamination in the rated vessel');
  const totalGasKg=lots.reduce((s,l)=>s+l.massKg,0),
    compressedGasM3=lots.reduce((s,l)=>s+l.volumeM3,0);
  if(totalGasKg>container.maxMassKg+EPS||compressedGasM3>container.maxVolumeM3+EPS)
   throw Error('Overloaded rated gas source vessel');
  if(totalGasKg>EPS){
   if(compressedGasM3<=EPS)throw Error('Compressed source gas has no finite volume');
   // 8E industrial production and 8G N2 fractionation both record the
   // ideal-gas equivalent volume at 293.15 K and their compression pressure.
   const modeledSourcePa=(totalGasKg/MOLE_KG[materialId])*8.314462618*293.15/compressedGasM3;
   if(!good(modeledSourcePa)||modeledSourcePa>v.state.ratedPressurePa+100||
      modeledSourcePa<100000)
    throw Error('Compressed gas pressure violates rated source vessel limits');
  }
  vessels[materialId]={v,container,lots};
 }
 const request=needs(),holds=new Map(),debits=[],shortages=[];
 for(const o of a.materials.operations)if(o.status==='RESERVED'){
  if(!id(o.lotId)||!good(o.massKg))throw Error('Invalid active gas/water reservation');
  holds.set(o.lotId,(holds.get(o.lotId)||0)+o.massKg);
 }
 for(const materialId of ['oxygen','nitrogen','water']){
  const source=materialId==='water'?a.materials.lots.filter(l=>l.containerId===a.shipContainerId):
   vessels[materialId].lots;
  let deficit=request[materialId];
  for(const lot of source){
   if(lot.materialId!==materialId||!id(lot.id)||!id(lot.provenance)||
     !good(lot.massKg)||!good(lot.volumeM3)||!good(lot.grade)||lot.grade<.98)continue;
   const use=Math.min(deficit,Math.max(0,lot.massKg-(holds.get(lot.id)||0)));
   if(use>EPS){debits.push({lotId:lot.id,materialId,massKg:use});deficit-=use;}
   if(deficit<EPS)break;
  }
  if(deficit>EPS)shortages.push({materialId,missingKg:deficit});
 }
 if(withPower){
  const e=a.powerReceipt;
  if(!e||e.operationId!==a.jobId||e.status!=='COMMITTED'||
    e.sourceId!=='ship-main:engineering-battery'||!good(e.usedJ)||
    e.usedJ+EPS<WORK_J)
   throw Error('1.5 MJ committed ship regulator/compressor energy debit required');
 }
 return{target,vessels,request,debits,shortages};
}
function preview(a){
 const p=check(a,false),t=root.StarfallHabitatT09;
 if(!t?.defaults||!t?.inspect)throw Error('T09 physical gas-law simulation required');
 const r=p.request;
 const h={kind:'hab',id:a.habitatId,bodyId:a.bodyId,enabled:false,condition:p.target.condition,
  habT09:{...t.defaults(0),volumeM3:25,tempK:293.15,
   oxygenMol:r.oxygen/MOLE_KG.oxygen,inertMol:r.nitrogen/MOLE_KG.nitrogen,
   carbonMol:0,oxygenTankMol:0,inertTankMol:0,scrubberCapacityMol:0,
   filteredAirMol:0,waterL:r.water,occupants:0,enabled:false,
   seal:.85,awaitingReview:true,backupJ:0,serviceReady:false}};
 const report=t.inspect(h,null,false);
 if(!good(report.pressureKPa)||!good(report.oxygenKPa)||
  report.pressureKPa<90||report.pressureKPa>110||
  report.oxygenKPa<19||report.oxygenKPa>23)
  throw Error('T09 rejects proposed initial habitat partial pressures');
 return{ready:p.shortages.length===0,shortages:cp(p.shortages),
  requirements:cp(r),workJ:WORK_J,pressureKPa:report.pressureKPa,
  oxygenPartialKPa:report.oxygenKPa,totalMassKg:Object.values(r).reduce((s,x)=>s+x,0),
  serviceReady:false,habitable:false};
}
function transfer(a){
 const p=check(a,true),q=preview(a);
 if(!q.ready)throw Error('Missing physically owned sealed gas or ship water: '+
  p.shortages.map(x=>x.materialId).join(', '));
 const materials=cp(a.materials),physical=cp(a.physical);
 const massBefore=materials.lots.reduce((s,l)=>s+l.massKg,0)+
   physical.assets.reduce((s,x)=>s+x.massKg,0);
 const seen=new Set();
 for(const item of p.debits){
  if(seen.has(item.lotId))throw Error('Duplicate gas source lot');
  seen.add(item.lotId);
  const l=materials.lots.find(x=>x.id===item.lotId);
  if(!l||l.massKg+EPS<item.massKg)throw Error('Gas source changed before transfer');
  const before=l.massKg;l.massKg=Math.max(0,before-item.massKg);
  l.volumeM3=before>0?l.volumeM3*(l.massKg/before):0;
 }
 materials.lots=materials.lots.filter(l=>l.massKg>EPS);
 const t=root.StarfallHabitatT09;
 const target=physical.assets.find(x=>x.id===a.habitatId);
 const r=q.requirements;
 const gasState={...t.defaults(0),volumeM3:25,tempK:293.15,
  oxygenMol:r.oxygen/MOLE_KG.oxygen,inertMol:r.nitrogen/MOLE_KG.nitrogen,
  carbonMol:0,oxygenTankMol:0,inertTankMol:0,filteredAirMol:0,
  scrubberCapacityMol:0,waterL:r.water,occupants:0,
  enabled:false,seal:.85,awaitingReview:true,backupJ:0,serviceReady:false};
 const diagnostics=t.inspect({kind:'hab',id:target.id,bodyId:a.bodyId,
  enabled:false,condition:target.condition,habT09:gasState},null,false);
 if(Math.abs(diagnostics.pressureKPa-q.pressureKPa)>EPS||
   Math.abs(diagnostics.oxygenKPa-q.oxygenPartialKPa)>EPS)
  throw Error('T09 pressure changed before physical charging commit');
 target.massKg+=q.totalMassKg;
 const receipt={jobId:a.jobId,assetId:target.id,
  nitrogenVesselId:a.nitrogenVesselId,oxygenVesselId:a.oxygenVesselId,
  shipWaterContainerId:a.shipContainerId,consumedLots:cp(p.debits),
  addedMassKg:q.totalMassKg,workJ:WORK_J,
  initialPressureKPa:diagnostics.pressureKPa,
  initialOxygenKPa:diagnostics.oxygenKPa,status:'COMMITTED'};
 target.state={...target.state,pressurePa:diagnostics.pressureKPa*1000,
  oxygenKg:r.oxygen,inertKg:r.nitrogen,waterKg:r.water,
  airlockSealed:false,habitable:false,lifeSupportOnline:false,
  operational:false,commissioned:false,assemblyStatus:'METERED_CHARGE_UNQUALIFIED',
  habT09:gasState,habitatCharge8g:{...receipt,method:'RATED_VESSEL_HOSE'},
  meteredCharge8g:cp(receipt)};
 const massAfter=materials.lots.reduce((s,l)=>s+l.massKg,0)+
  physical.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(massBefore-massAfter)>EPS)
  throw Error('Metered habitat charging violated total physical mass balance');
 if(!root.StarfallMaterials8A||!root.StarfallPhysical8A)
  throw Error('8A inventory validators missing');
 root.StarfallMaterials8A.create(materials);
 root.StarfallPhysical8A.create(physical);
 return{receipt,physical,materials,diagnostics};
}
root.StarfallHabitatHose8G=Object.freeze({preview,transfer,WORK_J});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallHabitatHose8G;
})(typeof globalThis!=='undefined'?globalThis:this);
