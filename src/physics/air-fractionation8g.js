/* STARFALL Update 8G — finite modeled atmospheric nitrogen separation.
 * CW01 is an uncertain seeded composition PRIOR, never a measurement. Each
 * 8C landable planet-fixed cell has a deliberately BOUNDED accessible air
 * parcel, and every capture permanently debits that parcel in the saved ledger.
 * No gaseous ship-hold output: nitrogen must enter its actual installed,
 * pressure-rated 8E nitrogen vessel. No free electricity, matter or nitrogen.
 */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-7;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const AIR_KG_PER_CELL=2400,BATCH_AIR_KG=20,SEPARATION_EFFICIENCY=.80,
 WORK_J=810000,STORE_PA=5000000,TEMP_K=293.15,R=8.314462618;
const MOLE_KG=Object.freeze({N2:.028014,O2:.031998,Ar:.039948,
 CO2:.0440095,SO2:.064066,CH4:.016043,H2O:.018015,H2:.002016,He:.0040026,NH3:.017031});
const REQUIRED_TOOLS=Object.freeze(['air_intake','dust_filter','gas_separator','compressor','nitrogen_storage_interface']);
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,
 a.reduce((s,x,i)=>s+x*b[i],0))))*r;}
function radial(x){return Array.isArray(x)&&x.length===3&&x.every(Number.isFinite)&&
 Math.abs(Math.hypot(...x)-1)<1e-4;}
function parcel(body,galaxy,local){
 if(!body||body.kind!=='planet'||!body.landable||!id(body.id)||!radial(local))
  throw Error('A landable, non-vacuum planetary surface is required');
 if(!galaxy||!Number.isSafeInteger(galaxy.seed))throw Error('Galaxy seed required to identify the actual atmosphere model');
 const cw=root.StarfallCompositionCW01,resources=root.StarfallResources8C;
 if(!cw?.bodyFor||!resources?.tiles)throw Error('CW01 atmosphere and 8C geospatial sources unavailable');
 const c=cw.bodyFor(body,galaxy.seed),fractions=c.atmosphereMoleFractions||{};
 if(c.atmosphereMode!=='seeded atmosphere prior'||!(fractions.N2>=.03))
  throw Error('No usable modeled molecular nitrogen in this world atmosphere');
 let total=0;for(const [species,fraction] of Object.entries(fractions)){
  if(!valid(fraction)||!MOLE_KG[species])throw Error('Unsupported atmospheric species '+species);
  total+=fraction*MOLE_KG[species];
 }
 if(total<=0)throw Error('Invalid modeled atmosphere mixture');
 const nitrogenMassFraction=fractions.N2*MOLE_KG.N2/total;
 const cell=resources.tiles(local),cellKey='air8g:'+galaxy.seed+':'+body.id+':'+cell.lat+':'+cell.lon;
 if(cellKey.length>128)throw Error('Air cell key too long');
 return {cellKey,bodyId:body.id,nitrogenMoleFraction:fractions.N2,
 nitrogenMassFraction,airCapacityKg:AIR_KG_PER_CELL,
 provenance:'CW01 seeded atmospheric prior; unmeasured; finite local 8G accessible model'};
}
function create(saved){
 const state=saved==null?{schema:1,harvests:[]}:clone(saved);
 if(state.schema!==1||!Array.isArray(state.harvests)||state.harvests.length>100000)
  throw Error('Invalid 8G atmosphere extraction save');
 const seen=new Set(),spent=new Map();
 for(const h of state.harvests){
  if(!id(h.id)||seen.has(h.id)||!id(h.cellKey)||!id(h.bodyId)||
   !valid(h.airKg)||!valid(h.nitrogenKg)||!valid(h.ventKg)||
   Math.abs(h.airKg-h.nitrogenKg-h.ventKg)>EPS||
   !id(h.vesselAssetId)||!id(h.outputLotId))throw Error('Corrupt atmospheric harvest history');
  seen.add(h.id);spent.set(h.cellKey,(spent.get(h.cellKey)||0)+h.airKg);
  if(spent.get(h.cellKey)>AIR_KG_PER_CELL+EPS)throw Error('Corrupt atmospheric depletion exceeds the finite parcel');
 }
 function remaining(p){return Math.max(0,AIR_KG_PER_CELL-(spent.get(p.cellKey)||0));}
 function check(a,needsReceipt=false){
  if(!a||!id(a.jobId)||!a.jobId.startsWith('air8g:')||!id(a.plantId)||!id(a.vesselId)||
   !id(a.outputContainerId)||!id(a.bodyId)||!a.body||a.body.id!==a.bodyId||
   !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
   !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.containers)||
   !Array.isArray(a.materials.lots)||!Array.isArray(a.materials.operations))
   throw Error('Physical plant, vessel and 8A inventory authority required');
  if(!a.shipLanded||!a.operatorEVA||!a.shipPowered||!radial(a.shipLocal)||
   !radial(a.evaLocal)||!valid(a.bodyRadius)||a.bodyRadius<=0)
   throw Error('Landed powered ship and EVA operator required for atmospheric separation');
  const plant=a.physical.assets.find(x=>x.id===a.plantId);
  if(!plant||plant.type!=='industrial_plant'||plant.condition<.5||
   plant.location?.kind!=='surface'||plant.location.bodyId!==a.bodyId||
   plant.state?.station!=='air_fractionation'||plant.state?.enabled!==true||
   !REQUIRED_TOOLS.every(t=>plant.state?.tools?.includes(t)))
   throw Error('Installed, fully equipped air fractionation plant required');
  const vessel=a.physical.assets.find(x=>x.id===a.vesselId);
  if(!vessel||vessel.type!=='industrial_vessel'||vessel.condition<.5||
   vessel.location?.kind!=='surface'||vessel.location.bodyId!==a.bodyId||
   vessel.state?.materialId!=='nitrogen'||vessel.state?.containerId!==a.outputContainerId||
   vessel.state?.ratedPressurePa<STORE_PA)
   throw Error('A matching same-world pressure-rated nitrogen vessel is required');
  const storage=a.materials.containers.find(c=>c.id===a.outputContainerId);
  if(!storage||storage.ownerId!==vessel.id||!String(storage.kind).includes('gas'))
   throw Error('Nitrogen destination must be a physically owned gas-vessel 8A container');
  if(arc(plant.location.local,a.shipLocal,a.bodyRadius)>75||
    arc(plant.location.local,a.evaLocal,a.bodyRadius)>38||
    arc(plant.location.local,vessel.location.local,a.bodyRadius)>65)
   throw Error('Ship, EVA and nitrogen storage vessel out of compressor-hose range');
  const p=parcel(a.body,a.galaxy,plant.location.local);
  const available=remaining(p),nitrogenKg=BATCH_AIR_KG*p.nitrogenMassFraction*SEPARATION_EFFICIENCY,
   ventKg=BATCH_AIR_KG-nitrogenKg,
   outputVolumeM3=(nitrogenKg/MOLE_KG.N2)*R*TEMP_K/STORE_PA;
  if(!(nitrogenKg>0&&ventKg>0))throw Error('Invalid nitrogen separation yield');
  const stored=a.materials.lots.filter(x=>x.containerId===a.outputContainerId);
  if(stored.some(x=>x.materialId!=='nitrogen'))throw Error('Pressure vessel contaminated with incompatible stock');
  if(stored.some(x=>!valid(x.massKg)||!valid(x.volumeM3)))throw Error('Invalid vessel stored lot');
  const kg=stored.reduce((s,x)=>s+x.massKg,0),m3=stored.reduce((s,x)=>s+x.volumeM3,0);
  const canStore=kg+nitrogenKg<=storage.maxMassKg+EPS&&
   m3+outputVolumeM3<=storage.maxVolumeM3+EPS;
  if(needsReceipt){
   const e=a.energyReceipt;
   if(!e||e.operationId!==a.jobId||e.sourceId!=='ship-main:engineering-battery'||
     e.status!=='COMMITTED'||!valid(e.usedJ)||e.usedJ+EPS<WORK_J)
    throw Error('Committed 810 kJ nitrogen-compressor work receipt required');
  }
  return {plant,vessel,p,available,nitrogenKg,ventKg,outputVolumeM3,canStore};
 }
 function quote(a){
  const prior=state.harvests.find(h=>h.id===a?.jobId);
  if(prior)return{duplicate:true,receipt:clone(prior)};
  const q=check(a);
  return {ready:q.available+EPS>=BATCH_AIR_KG&&q.canStore,
   airBatchKg:BATCH_AIR_KG,availableAirKg:q.available,
   nitrogenKg:q.nitrogenKg,ventToAtmosphereKg:q.ventKg,
   outputVolumeM3:q.outputVolumeM3,energyJ:WORK_J,
   nitrogenMoleFraction:q.p.nitrogenMoleFraction,
   nitrogenMassFraction:q.p.nitrogenMassFraction,
   destinationAssetId:q.vessel.id,cellKey:q.p.cellKey,provenance:q.p.provenance,
   blockedReason:q.available+EPS<BATCH_AIR_KG?'Finite parcel depleted':
      !q.canStore?'Rated nitrogen vessel at capacity':null};
 }
 function capture(a){
  const prior=state.harvests.find(h=>h.id===a?.jobId);
  if(prior){
   if(prior.plantAssetId!==a.plantId||prior.vesselAssetId!==a.vesselId||
      !a.materials?.lots?.some(l=>l.id===prior.outputLotId))
    throw Error('Replayed air harvest lacks original authoritative custody');
   return {duplicate:true,receipt:clone(prior),materials:clone(a.materials),atmosphere:clone(state)};
  }
  const q=check(a,true);
  if(q.available+EPS<BATCH_AIR_KG)throw Error('Modeled planetary air parcel depleted');
  if(!q.canStore)throw Error('Rated nitrogen vessel lacks remaining gas capacity');
  const next=clone(a.materials),lotId='nitrogen:'+a.jobId;
  if(next.lots.some(l=>l.id===lotId))throw Error('Duplicate nitrogen extraction output ID');
  next.lots.push({id:lotId,materialId:'nitrogen',containerId:a.outputContainerId,
   massKg:q.nitrogenKg,volumeM3:q.outputVolumeM3,
   grade:.999,provenance:'atmosphere-8g:'+q.p.cellKey});
  if(!root.StarfallMaterials8A)throw Error('8A inventory validation unavailable');
  root.StarfallMaterials8A.create(next);
  const receipt={id:a.jobId,bodyId:a.bodyId,cellKey:q.p.cellKey,
   plantAssetId:a.plantId,vesselAssetId:a.vesselId,outputLotId:lotId,
   airKg:BATCH_AIR_KG,nitrogenKg:q.nitrogenKg,ventKg:q.ventKg,
   energyJ:WORK_J,status:'COMMITTED',source:'CW01 modeled finite air'};
  if(Math.abs(receipt.airKg-receipt.nitrogenKg-receipt.ventKg)>EPS)
   throw Error('Atmospheric intake/vent/output mass balance violated');
  const updated=clone(state);updated.harvests.push(receipt);
  return {duplicate:false,receipt,materials:next,atmosphere:updated};
 }
 return Object.freeze({quote,capture,remaining,snapshot:()=>clone(state)});
}
root.StarfallAirFractionation8G=Object.freeze({create,parcel,
 AIR_KG_PER_CELL,BATCH_AIR_KG,WORK_J,STORE_PA,REQUIRED_TOOLS});
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallAirFractionation8G;
})(typeof globalThis!=='undefined'?globalThis:this);
