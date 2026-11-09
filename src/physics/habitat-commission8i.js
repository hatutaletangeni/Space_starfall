/* Update 8I — atomic transition from one paid, charged 8G pressure envelope
 * into the ORIGINAL T09 outpost owner. The pressure-shell asset retains ONLY
 * dry structural mass; its real sealed gases and water move to exactly one
 * linked T09 volume. The outpost supplies no construction or starter stock.
 * Pure transaction: caller validates all new stores and saves atomically.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),R=8.314462618,EPS=1e-6;
const MOL=Object.freeze({oxygen:.031998,nitrogen:.028014,carbon:.04401});
const WORK_J=500000;
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const id=s=>typeof s==='string'&&s.length>0&&s.length<=128;
const actual=s=>id(s)&&!/TEST_FIXTURE|CREATIVE|DEBUG|CHEAT/i.test(s);
const unit=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)&&
 Math.abs(Math.hypot(...v)-1)<1e-4;
function arc(a,b,r){return Math.acos(Math.max(-1,Math.min(1,
 a.reduce((s,v,i)=>s+v*b[i],0))))*r;}
function commission(a){
 if(!a||!id(a.operationId)||!a.operationId.startsWith('habcommission8i:')||
  !id(a.assetId)||!id(a.bodyId)||!good(a.timeS)||!good(a.bodyRadius)||
  a.bodyRadius<=0||!good(a.shipEnergyJ)||!unit(a.shipLocal)||!unit(a.evaLocal)||
  !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
  !a.materials||a.materials.schema!==1||!Array.isArray(a.materials.lots)||
  !Array.isArray(a.materials.operations)||!Array.isArray(a.materials.containers)||
  !a.assembly||a.assembly.schema!==1||!Array.isArray(a.assembly.receipts)||
  !a.outpost||a.outpost.schema!==1||!Number.isInteger(a.outpost.seed)||
  !Array.isArray(a.outpost.items))
  throw Error('8I requires valid original 8G, 8A and T09 source-owned snapshots');
 const asset=a.physical.assets.find(x=>x.id===a.assetId),habitatId='hab8i:'+a.assetId;
 if(!asset||asset.type!=='habitat_envelope'||
  asset.provenance!=='structural-8g:'+a.assetId||
  asset.location?.kind!=='surface'||asset.location.bodyId!==a.bodyId||
  !unit(asset.location.local)||!good(asset.condition)||asset.condition<.95)
  throw Error('8I commissioning needs intact same-world, genuine manufactured pressure shell');
 if(!a.shipLanded||!a.operatorEVA||!a.shipPowered||
  arc(asset.location.local,a.shipLocal,a.bodyRadius)>100||
  arc(asset.location.local,a.evaLocal,a.bodyRadius)>24)
  throw Error('8I commissioning requires powered landed ship and EVA beside physical shell');
 if(a.shipEnergyJ+EPS<WORK_J)
  throw Error('8I original ship battery lacks 500 kJ pressure-proof and calibration work');
 const receipts=a.assembly.receipts.filter(r=>r.id===asset.id||r.assetId===asset.id);
 if(receipts.length!==1)throw Error('8I needs one unique real 8G manufacturing receipt');
 const structural=receipts[0];
 if(structural.id!==asset.id||structural.assetId!==asset.id||
  structural.blueprintId!=='habitat_shell'||
  structural.status!=='ASSEMBLED_NOT_OPERATIONAL'||
  structural.bodyId!==a.bodyId||!id(structural.facilityId)||
  !good(structural.massKg)||structural.massKg<=0||
  !good(structural.energyJ)||structural.energyJ<4000000||
  !Array.isArray(structural.consumedLots)||!structural.consumedLots.length||
  structural.consumedLots.some(x=>!id(x.lotId)||!good(x.massKg)||x.massKg<=0))
  throw Error('8I habitat must come from paid 8G pressure shell and life-support-rack BOM');
 const charge=asset.state?.habitatCharge8g,h=asset.state?.habT09;
 if(!charge||!id(charge.jobId)||
  !/^hab(?:charge|hose)8g:/.test(charge.jobId)||
  !good(charge.workJ)||charge.workJ<1200000||
  !good(charge.addedMassKg)||charge.addedMassKg<=0||
  !Array.isArray(charge.consumedLots)||!charge.consumedLots.length||
  charge.consumedLots.some(x=>!id(x.lotId||x.id)||!good(x.massKg)||x.massKg<=0)||
  asset.state?.habitatCommission8i||h?.schema!==1||h.volumeM3!==25||
  !good(h.oxygenMol)||!good(h.inertMol)||!good(h.carbonMol)||
  !good(h.waterL)||!good(h.tempK)||!good(h.seal)||
  h.seal<.75||h.seal>1||h.occupants!==0||h.enabled!==false||
  h.oxygenTankMol!==0||h.inertTankMol!==0||h.scrubberCapacityMol!==0||
  h.waterL<=0||h.oxygenMol<=0||h.inertMol<=0)
  throw Error('8I needs finite physically charged, unoccupied 8G volume with no free life-support supplies');
 const oxygenKg=h.oxygenMol*MOL.oxygen,
  inertKg=h.inertMol*MOL.nitrogen,
  carbonKg=h.carbonMol*MOL.carbon,
  waterKg=h.waterL,transferredKg=oxygenKg+inertKg+carbonKg+waterKg;
 if(Math.abs(asset.state.oxygenKg-oxygenKg)>.01||
  Math.abs(asset.state.inertKg-inertKg)>.01||
  Math.abs((asset.state.carbonKg||0)-carbonKg)>.01||
  Math.abs(asset.state.waterKg-waterKg)>.01||
  Math.abs(asset.massKg-structural.massKg-transferredKg)>.01||
  charge.addedMassKg+EPS<transferredKg)
  throw Error('8I real contained water/gas mass must agree with dry structural asset');
 const kPa=R*h.tempK/(25*1000),
  pressureKPa=(h.oxygenMol+h.inertMol+h.carbonMol)*kPa,
  oxygenKPa=h.oxygenMol*kPa,co2KPa=h.carbonMol*kPa;
 if(pressureKPa<70||pressureKPa>120||oxygenKPa<16||oxygenKPa>27||
   co2KPa>.8||h.tempK<280||h.tempK>307)
  throw Error('8I shell failed real T09 gas-law commissioning safety window');
 if(!actual(asset.provenance)||
  charge.consumedLots.some(x=>x.provenance&&!actual(x.provenance)))
  throw Error('8I creative or test-only source cannot certify Industrial habitat');
 if(a.outpost.items.length>=320||
  a.outpost.items.some(x=>x.id===habitatId||x.physicalAssetId===a.assetId)||
  a.materials.operations.some(x=>x.id===a.operationId||x.kind==='HABITAT_COMMISSION_8I'&&x.assetId===a.assetId))
  throw Error('8I physical shell already linked or habitat operation already committed');
 const materials=cp(a.materials),physical=cp(a.physical),outpost=cp(a.outpost);
 const next=physical.assets.find(x=>x.id===a.assetId);
 const startedMass=physical.assets.reduce((s,x)=>s+x.massKg,0);
 const gasState={...cp(h),schema:1,enabled:false,awaitingReview:false,
  serviceReady:false,airlock:'CLOSED',airlockUntilS:null,
  lastS:a.timeS,oxygenTankMol:0,inertTankMol:0,scrubberCapacityMol:0,
  filteredAirMol:0,backupJ:0,occupants:0};
 const habitat={id:habitatId,kind:'hab',bodyId:a.bodyId,
  physicalAssetId:a.assetId,local:cp(asset.location.local),facing:[0,0,1],
  height:0,energyJ:0,temperatureK:h.tempK,condition:asset.condition,
  enabled:true,samples:[],habT09:gasState};
 next.massKg=structural.massKg;
 next.state={...next.state,habT09:null,oxygenKg:0,inertKg:0,carbonKg:0,
  waterKg:0,pressurePa:0,airlockSealed:true,commissioned:true,
  operational:false,habitable:false,lifeSupportOnline:false,
  assemblyStatus:'T09_LINKED_GRID_POWER_REQUIRED',
  habitatCommission8i:{operationId:a.operationId,habitatId,status:'COMMITTED'}};
 outpost.items.push(habitat);
 const receipt={id:a.operationId,kind:'HABITAT_COMMISSION_8I',status:'COMMITTED',
  assetId:a.assetId,habitatId,bodyId:a.bodyId,
  structuralReceiptId:structural.id,chargeReceiptId:charge.jobId,
  oxygenKg,inertKg,carbonKg,waterKg,transferredKg,
  source:'physical8a:'+a.assetId,receiver:'outpost5:'+habitatId,
  workJ:WORK_J,energySourceId:'ship-main:engineering-battery',
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-WORK_J,
  timeS:a.timeS,pressureKPa,oxygenKPa};
 materials.operations.push(receipt);
 const finalMass=physical.assets.reduce((s,x)=>s+x.massKg,0);
 if(Math.abs(startedMass-finalMass-transferredKg)>.01||
  Math.abs(habitat.habT09.oxygenMol*MOL.oxygen+
   habitat.habT09.inertMol*MOL.nitrogen+
   habitat.habT09.carbonMol*MOL.carbon+habitat.habT09.waterL-transferredKg)>EPS)
  throw Error('8I mass conservation failed: shell debit must equal T09 credit');
 return{physical,materials,outpost,habitat,receipt,shipEnergyJ:a.shipEnergyJ-WORK_J};
}
const API=Object.freeze({commission,WORK_J,MOLAR_KG:MOL});
root.StarfallHabitatCommission8I=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
