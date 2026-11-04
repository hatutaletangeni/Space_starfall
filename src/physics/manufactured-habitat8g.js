/* STARFALL 8G — conservative manufactured-habitat passive atmosphere ledger.
 * First vertical slice of #82. The SAME charged 8A physical habitat asset is
 * the sole owner of its 25 m3 T09 gas state. No T09 defaults(), refill,
 * electrical power, crew, scrubbers, airlock qualification or extra store.
 * Pure operations: caller commits the returned physical asset exactly once.
 */
(function(root){'use strict';
const R=8.314462618,EPS=1e-6;
const M=Object.freeze({oxygen:.031998,nitrogen:.028014,carbon:.04401});
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function checked(asset){
 if(!asset||asset.type!=='habitat_envelope'||!asset.id||
  asset.state?.habitatCharge8g?.status!=='COMMITTED'||
  asset.state?.habitatCharge8g?.assetId!==asset.id||
  !asset.state?.habT09||asset.state.habT09.volumeM3!==25||
  !finite(asset.massKg)||!finite(asset.condition))
  throw Error('8G passive monitor requires the SAME charged manufactured 25 m3 physical asset');
 const h=asset.state.habT09;
 for(const k of ['oxygenMol','inertMol','carbonMol','waterL','tempK','seal','lastS'])
  if(!finite(h[k]))throw Error('8G invalid physical habitat '+k);
 if(h.tempK<150||h.tempK>390||h.seal>1||h.occupants!==0||
  h.enabled!==false||asset.state.lifeSupportOnline!==false||
  asset.state.habitable!==false||asset.state.airlockSealed!==false)
  throw Error('8G unqualified shell cannot have crew, powered service or certified airlock');
 if(h.oxygenTankMol!==0||h.inertTankMol!==0||h.scrubberCapacityMol!==0)
  throw Error('8G manufactured shell must not inherit free T09 consumables');
 const gasKg=h.oxygenMol*M.oxygen+h.inertMol*M.nitrogen+h.carbonMol*M.carbon;
 if(Math.abs(gasKg-asset.state.oxygenKg-asset.state.inertKg-
  (asset.state.carbonKg||0))>EPS||
  Math.abs(asset.state.waterKg-h.waterL)>EPS)
  throw Error('8G gas/water kilograms disagree with authoritative T09 moles');
 const receipt=asset.state.habitatCharge8g;
 const baselineDryKg=asset.state.passiveLedger8g?.dryMassKg??
  asset.massKg-(gasKg+h.waterL);
 if(!finite(baselineDryKg))throw Error('8G structural shell mass invalid');
 const ventedKg=asset.state.passiveLedger8g?.ventedKg??0;
 if(!finite(ventedKg)||Math.abs(asset.massKg-(baselineDryKg+gasKg+h.waterL))>EPS)
  throw Error('8G physical asset mass does not balance atmospheric stores');
 if(!finite(receipt.addedMassKg)||receipt.addedMassKg+EPS<gasKg+h.waterL)
  throw Error('8G initial metered charge receipt does not support the stored mass');
 return{h,gasKg,baselineDryKg,ventedKg};
}
function inspect(asset){
 const {h,gasKg,baselineDryKg,ventedKg}=checked(asset);
 const p=R*h.tempK/(h.volumeM3*1000);
 const kPa=(h.oxygenMol+h.inertMol+h.carbonMol)*p,o2=h.oxygenMol*p,co2=h.carbonMol*p;
 return Object.freeze({assetId:asset.id,volumeM3:25,oxygenKPa:o2,carbonKPa:co2,
  pressureKPa:kPa,temperatureK:h.tempK,oxygenKg:asset.state.oxygenKg,
  nitrogenKg:asset.state.inertKg,carbonKg:asset.state.carbonKg||0,
  waterKg:asset.state.waterKg,gasKg,dryMassKg:baselineDryKg,
  vesselChargeId:asset.state.habitatCharge8g.jobId,ventedKg,
  powered:false,servedW:0,lifeSupportOnline:false,habitable:false,
  airlockQualified:false,awaitingReview:true,
  alarms:[...(h.seal<.75?['LEAK']:[]),...(kPa<70||kPa>120?['PRESSURE_UNSAFE']:[]),
   ...(o2<16||o2>27?['OXYGEN_UNSAFE']:[]),
   ...(co2>.8?['CO2_HIGH']:[]),
   ...(h.tempK<280||h.tempK>307?['TEMPERATURE_UNSAFE']:[]),
   'NO_INSTALLED_LIFE_SUPPORT','AWAITING_REVIEW']});
}
/* A passive seal leak is an exhaust to the world, not magically scrubbed gas.
 * Exponential integrated loss is frame-step independent at fixed seal/temp.
 * No new gas or water; exactly deducted dry+wet asset mass is accounted vented.
 */
function advancePassive(asset,toS){
 const before=checked(asset),h=before.h;
 if(!finite(toS)||toS+EPS<h.lastS||toS-h.lastS>86400)
  throw Error('8G invalid/reversed/oversized passive simulation clock step');
 const dt=Math.max(0,toS-h.lastS),out=clone(asset),s=out.state,t=s.habT09;
 const rate=8e-7+(1-h.seal)**2*.012,retained=Math.exp(-rate*dt);
 const escapedO2Kg=h.oxygenMol*(1-retained)*M.oxygen,
  escapedN2Kg=h.inertMol*(1-retained)*M.nitrogen,
  escapedCO2Kg=h.carbonMol*(1-retained)*M.carbon;
 const lostKg=escapedO2Kg+escapedN2Kg+escapedCO2Kg;
 t.oxygenMol=h.oxygenMol*retained;t.inertMol=h.inertMol*retained;
 t.carbonMol=h.carbonMol*retained;t.lastS=toS;
 s.oxygenKg=t.oxygenMol*M.oxygen;s.inertKg=t.inertMol*M.nitrogen;
 s.carbonKg=t.carbonMol*M.carbon;
 out.massKg=asset.massKg-lostKg;
 s.pressurePa=(t.oxygenMol+t.inertMol+t.carbonMol)*R*t.tempK/25;
 s.passiveLedger8g={schema:1,dryMassKg:before.baselineDryKg,
  ventedKg:before.ventedKg+lostKg,
  lastS:toS,oxygenVentedKg:(s.passiveLedger8g?.oxygenVentedKg||0)+escapedO2Kg,
  nitrogenVentedKg:(s.passiveLedger8g?.nitrogenVentedKg||0)+escapedN2Kg,
  carbonVentedKg:(s.passiveLedger8g?.carbonVentedKg||0)+escapedCO2Kg};
 // This shell cannot become habitable through passive passage of time.
 t.enabled=false;t.occupants=0;t.awaitingReview=true;t.serviceReady=false;
 s.lifeSupportOnline=false;s.habitable=false;s.airlockSealed=false;
 checked(out);
 if(Math.abs(asset.massKg-(out.massKg+lostKg))>EPS)
  throw Error('8G leaking gas violated mass conservation');
 return{physicalAsset:out,ventReceipt:Object.freeze({assetId:asset.id,
  fromS:h.lastS,toS,oxygenKg:escapedO2Kg,nitrogenKg:escapedN2Kg,
  carbonKg:escapedCO2Kg,totalKg:lostKg}),status:inspect(out)};
}
const API=Object.freeze({inspect,advancePassive,MOLAR_KG:M});
root.StarfallManufacturedHabitat8G=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
