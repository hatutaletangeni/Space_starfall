/* STARFALL 8G — finite initial habitat atmosphere and water charging.
 * Real 8A ship lots are converted to one physical habitat's contained mass.
 * T09 is the authoritative gas-law evaluator; this does NOT turn on life
 * support, produce air, or certify a pressure vessel.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const ID=x=>typeof x==='string'&&x.length>0&&x.length<=128,EPS=1e-6;
const T=()=>{if(!root.StarfallHabitatT09)throw Error('T09 atmosphere physics not installed');return root.StarfallHabitatT09;};
const CABIN_VOLUME_M3=25,TEMP_K=293.15,WORK_J=1200000;
const supplies=()=>{const t=T();
 return Object.freeze({
   oxygen:t.gasMoles(21,TEMP_K,CABIN_VOLUME_M3)*.031998,
   nitrogen:t.gasMoles(78,TEMP_K,CABIN_VOLUME_M3)*.028014,
   water:20
 });};
function evaluate(a,requireReceipt){
 if(!a||!ID(a.assetId)||!ID(a.bodyId)||!ID(a.containerId)||
   !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
   !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
   !Array.isArray(a.materials.operations)||!Array.isArray(a.materials.containers))
  throw Error('Actual 8A habitat and physical material custody required');
 const asset=a.physical.assets.find(x=>x.id===a.assetId);
 if(!asset||asset.type!=='habitat_envelope'||asset.location?.kind!=='surface'||
    asset.location.bodyId!==a.bodyId||asset.provenance!=='structural-8g:'+asset.id)
   throw Error('An actually manufactured same-world habitat envelope is required');
 if(!finite(asset.condition)||asset.condition<.9||asset.state?.habitatCharge8g)
   throw Error('Initial charge requires one intact empty uncharged habitat');
 if(!a.assembly||a.assembly.schema!==1||!Array.isArray(a.assembly.receipts)||
   !a.assembly.receipts.some(r=>r.assetId===asset.id&&r.blueprintId==='habitat_shell'&&
     r.status==='ASSEMBLED_NOT_OPERATIONAL'&&r.bodyId===a.bodyId))
  throw Error('Original finite habitat construction receipt not found');
 if(!a.materials.containers.some(c=>c.id===a.containerId&&c.ownerId==='ship-main'))
  throw Error('All atmosphere and water supplies must originate in ship-owned cargo');
 const rad=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
  Math.abs(Math.hypot(...x)-1)<1e-4;
 if(!rad(a.shipLocal)||!rad(a.evaLocal)||!rad(asset.location.local)||
   !finite(a.bodyRadius)||a.bodyRadius<=0||a.shipLanded!==true||a.operatorEVA!==true||a.shipPowered!==true)
  throw Error('Powered landed ship and physically positioned EVA operator required');
 const arc=(x,y)=>Math.acos(Math.max(-1,Math.min(1,x.reduce((s,n,i)=>s+n*y[i],0))))*a.bodyRadius;
 if(arc(asset.location.local,a.shipLocal)>85||arc(asset.location.local,a.evaLocal)>20)
  throw Error('Habitat must be within 85 scene units of ship and 20 units of EVA operator');
 const requirements=supplies(),taken=[],shortages=[];
 const reserve=new Map();
 for(const op of a.materials.operations){
  if(op.status!=='RESERVED')continue;
  if(!ID(op.lotId)||!finite(op.massKg))throw Error('Invalid 8A reservation');
  reserve.set(op.lotId,(reserve.get(op.lotId)||0)+op.massKg);
 }
 for(const [type,amount] of Object.entries(requirements)){
  let left=amount;
  for(const lot of a.materials.lots){
   if(lot.materialId!==type||lot.containerId!==a.containerId||
     !ID(lot.id)||!ID(lot.provenance)||!finite(lot.massKg)||!finite(lot.volumeM3)||
     !finite(lot.grade)||lot.grade<.98)continue;
   const available=lot.massKg-(reserve.get(lot.id)||0);
   if(available<=0)continue;
   const used=Math.min(available,left);
   if(used>EPS){taken.push({id:lot.id,materialId:type,massKg:used});left-=used;}
   if(left<EPS)break;
  }
  if(left>EPS)shortages.push({materialId:type,missingKg:left});
 }
 if(requireReceipt){
  if(!ID(a.jobId)||!a.jobId.startsWith('habcharge8g:'))throw Error('Missing stable gas charge ID');
  const e=a.powerReceipt;
  if(!e||e.operationId!==a.jobId||e.sourceId!=='ship-main:engineering-battery'||
    e.status!=='COMMITTED'||!finite(e.usedJ)||e.usedJ+EPS<WORK_J)
   throw Error('Committed 1.2 MJ physical compressor-energy debit required');
 }
 return {asset,requirements,taken,shortages};
}
function quote(a){
 const p=evaluate(a,false);
 const t=T(),totalKg=Object.values(p.requirements).reduce((s,n)=>s+n,0);
 const preview={kind:'hab',id:a.assetId,bodyId:a.bodyId,
   habT09:{...t.defaults(0),volumeM3:CABIN_VOLUME_M3,oxygenMol:p.requirements.oxygen/.031998,
    inertMol:p.requirements.nitrogen/.028014,carbonMol:0,oxygenTankMol:0,
    inertTankMol:0,scrubberCapacityMol:0,waterL:p.requirements.water,
    filteredAirMol:0,occupants:0,enabled:false}};
 const report=t.inspect(preview,null,false);
 return {ready:p.shortages.length===0,shortages:clone(p.shortages),
   requirements:clone(p.requirements),totalKg,workJ:WORK_J,
   estimatedPressureKPa:report.pressureKPa,oxygenPartialKPa:report.oxygenKPa,
   commissioningRequired:true,habitable:false};
}
function charge(a){
 const p=evaluate(a,true);
 if(p.shortages.length)throw Error('Missing finite physical atmosphere/water: '+
   p.shortages.map(x=>x.materialId).join(', '));
 const before=a.materials.lots.reduce((s,x)=>s+x.massKg,0)+
   a.physical.assets.reduce((s,x)=>s+x.massKg,0);
 const materials=clone(a.materials),physical=clone(a.physical);
 for(const used of p.taken){
  const lot=materials.lots.find(x=>x.id===used.id),old=lot.massKg;
  lot.massKg=Math.max(0,old-used.massKg);
  lot.volumeM3=old>0?lot.volumeM3*(lot.massKg/old):0;
 }
 materials.lots=materials.lots.filter(l=>l.massKg>EPS);
 const t=T(),c=physical.assets.find(x=>x.id===a.assetId),r=p.requirements;
 const habitat={kind:'hab',id:c.id,bodyId:a.bodyId,enabled:false,condition:c.condition,
  habT09:{...t.defaults(0),volumeM3:CABIN_VOLUME_M3,tempK:TEMP_K,
   oxygenMol:r.oxygen/.031998,inertMol:r.nitrogen/.028014,carbonMol:0,
   oxygenTankMol:0,inertTankMol:0,scrubberCapacityMol:0,filteredAirMol:0,
   waterL:r.water,occupants:0,enabled:false,seal:.85,awaitingReview:true}};
 const pressure=t.inspect(habitat,null,false);
 if(pressure.pressureKPa<70||pressure.pressureKPa>120||pressure.oxygenKPa<16||pressure.oxygenKPa>27)
  throw Error('Finite gas mass failed T09 pressure/oxygen simulation');
 const addedMass=Object.values(r).reduce((s,n)=>s+n,0);
 c.massKg+=addedMass;
 c.state={...c.state,pressurePa:pressure.pressureKPa*1000,
   oxygenKg:r.oxygen,inertKg:r.nitrogen,waterKg:r.water,
   airlockSealed:true,habitable:false,lifeSupportOnline:false,
   assemblyStatus:'CHARGED_NOT_POWERED_OR_QUALIFIED',
   habitatCharge8g:{jobId:a.jobId,sourceContainerId:a.containerId,
     workJ:WORK_J,consumedLots:clone(p.taken),addedMassKg:addedMass,
     initialPressureKPa:pressure.pressureKPa,initialOxygenKPa:pressure.oxygenKPa},
   habT09:clone(habitat.habT09)};
 const after=materials.lots.reduce((s,x)=>s+x.massKg,0)+
   physical.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(before-after)>EPS)throw Error('Habitat charging created or destroyed physical mass');
 if(!root.StarfallPhysical8A||!root.StarfallMaterials8A)
  throw Error('8A validators not installed');
 root.StarfallPhysical8A.create(physical);root.StarfallMaterials8A.create(materials);
 return {physical,materials,asset:clone(c),
  receipt:clone(c.state.habitatCharge8g),diagnostics:pressure};
}
root.StarfallHabitatCharge8G=Object.freeze({quote,charge,requirements:supplies,WORK_J,CABIN_VOLUME_M3});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallHabitatCharge8G;
})(typeof globalThis!=='undefined'?globalThis:this);
