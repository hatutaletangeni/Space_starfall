/* STARFALL 8I — same-authority manufactured habitat ECLSS.
 * Operates the REAL charged 8G physical asset and original T09 ideal-gas
 * model. Power Joules must be debited by the caller from the original ship.
 * No invented oxygen, nitrogen, water, spare tank stock, or free crew.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x)),EPS=1e-6,BASE_W=680,COMMISSION_J=250000;
const M={oxygen:.031998,inert:.028014,carbon:.04401};
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function t09(){if(!root.StarfallHabitatT09)throw Error('Original T09 source-owned habitat solver unavailable');return root.StarfallHabitatT09;}
function checked(asset,operational=false){
 if(!asset||asset.type!=='habitat_envelope'||!asset.id||
  asset.location?.kind!=='surface'||asset.provenance!=='structural-8g:'+asset.id||
  !valid(asset.massKg)||asset.condition<.8||
  !asset.state?.habitatCharge8g?.jobId||!asset.state?.habT09||
  asset.state.habT09.volumeM3!==25||asset.state.habT09.schema!==1||
  !asset.components?.some(c=>c.blueprintId==='habitat_shell'&&
   c.parts?.habitat_life_support_rack>=80&&c.parts?.habitat_power_distribution>=16))
  throw Error('8I requires one genuinely manufactured, charged and equipped 8G habitat shell');
 const h=asset.state.habT09;
 for(const key of ['oxygenMol','inertMol','carbonMol','filteredAirMol','waterL','tempK','lastS'])
  if(!valid(h[key]))throw Error('8I invalid source habitat physical reserve: '+key);
 if(h.occupants!==0)throw Error('8I crew simulation requires food, wastewater and metabolic source custody; zero occupancy only');
 if(operational&&(!asset.state.eclss8i||asset.state.eclss8i.schema!==1))
  throw Error('8I life support is not commissioned');
 return h;
}
function wetKg(h){
 return h.oxygenMol*M.oxygen+h.inertMol*M.inert+
  (h.carbonMol+h.filteredAirMol)*M.carbon+h.waterL;
}
function pressure(h){
 return (h.oxygenMol+h.inertMol+h.carbonMol)*8.314462618*h.tempK/(25*1000);
}
function status(asset,powered=false){
 const h=checked(asset),on=asset.state?.eclss8i?.schema===1;
 let current=null;
 try{
  const item={kind:'hab',enabled:on,condition:asset.condition,habT09:cp(h)};
  current=t09().inspect(item,null,powered&&on);
 }catch(e){current={alarms:['MODEL_ERROR: '+e.message],pressureKPa:pressure(h),oxygenKPa:0,carbonKPa:0};}
 return{assetId:asset.id,bodyId:asset.location.bodyId,commissioned:on,
  powered:powered&&on,pressureKPa:current.pressureKPa,
  oxygenKPa:current.oxygenKPa,carbonKPa:current.carbonKPa,
  temperatureK:h.tempK,waterKg:h.waterL,oxygenKg:h.oxygenMol*M.oxygen,
  nitrogenKg:h.inertMol*M.inert,filteredCo2Kg:h.filteredAirMol*M.carbon,
  scrubberRemainingMol:h.scrubberCapacityMol||0,airlock:h.airlock,
  energyConsumedJ:asset.state.eclss8i?.energyJ||0,
  ventedKg:asset.state.eclss8i?.ventedKg||0,
  waterCirculatedKg:asset.state.eclss8i?.waterCirculatedKg||0,
  safe:!!current.safe&&powered&&on,alarms:current.alarms||[],
  limits:'Ship electrical umbilical; sealed zero-crew first-order model. No wastewater recovery or food production.'};
}
function receiptCheck(e,id,minimum){
 if(!e||e.operationId!==id||e.status!=='COMMITTED'||
  e.sourceId!=='ship-main:engineering-battery'||!valid(e.usedJ)||
  Math.abs(e.usedJ-minimum)>EPS)
  throw Error('8I requires an authentic exact original-ship Joule debit');
}
function commission(asset,{timeS,jobId,powerReceipt}){
 const h=checked(asset);
 if(asset.state.eclss8i){if(asset.state.eclss8i.receiptId===jobId)return{duplicate:true,asset:cp(asset),status:status(asset,false)};
  throw Error('8I commissioning already done on this uniquely identified habitat');}
 if(!valid(timeS)||timeS<h.lastS||typeof jobId!=='string'||jobId!=='eclss8i:'+asset.id)
  throw Error('8I non-monotonic physical commissioning event');
 receiptCheck(powerReceipt,jobId,COMMISSION_J);
 if((h.oxygenTankMol||0)!==0||(h.inertTankMol||0)!==0||(h.scrubberCapacityMol||0)!==0)
  throw Error('8I manufacturing starter air cannot inherit legacy T09 free tank stock');
 if(pressure(h)<70||pressure(h)>120)
  throw Error('8I manufactured shell must be filled with physically delivered safe-pressure gas first');
 const next=cp(asset),c=next.state.habT09;
 const originalDry=asset.massKg-wetKg(h);
 if(originalDry<0||!valid(originalDry))throw Error('8I charged shell mass/contents mismatch');
 // Existing 80 kg physically manufactured rack includes a finite 60 mol
 // CO2 adsorption capacity. This is CAPACITY, not a new gas or material lot.
 c.scrubberCapacityMol=60;c.enabled=true;c.awaitingReview=false;
 c.lastS=timeS;c.mode='STANDBY';c.occupants=0;c.airlock='CLOSED';
 next.state.eclss8i={schema:1,receiptId:jobId,commissionedAtS:timeS,
  lastS:timeS,dryMassKg:originalDry,energyJ:COMMISSION_J,
  ventedKg:0,waterCirculatedKg:0,sourceId:powerReceipt.sourceId};
 next.state.lifeSupportOnline=false;next.state.airlockSealed=true;
 next.state.habitable=false;next.state.assemblyStatus='POWERED_ECLSS_COMMISSIONED';
 return{duplicate:false,asset:next,status:status(next,false)};
}
function advance(asset,{toS,powered,powerReceipt,body=null}){
 const h=checked(asset,true),s=asset.state.eclss8i;
 if(!valid(toS)||toS+EPS<s.lastS)throw Error('8I simulation clock reversal');
 const dt=toS-s.lastS;
 if(dt<EPS)return{unchanged:true,asset:cp(asset),usedJ:0,status:status(asset,!!powered)};
 const need=powered?BASE_W*dt:0;
 if(powered)receiptCheck(powerReceipt,'eclss8i:cycle:'+asset.id+':'+s.lastS.toFixed(3)+':'+toS.toFixed(3),need);
 const beforeWet=wetKg(h),next=cp(asset),item={kind:'hab',enabled:true,
  condition:next.condition,habT09:next.state.habT09};
 const slices=Math.ceil(dt/3600),MAX_SLICES=96;
 if(slices<=MAX_SLICES){
  // Same original T09 model at 1×/10×/100×, with each paid power/thermal
  // integration step bounded to <=3600 simulated seconds.
  for(let i=1;i<=slices;i++){
   const endpoint=i===slices?toS:s.lastS+dt*i/slices;
   t09().step(item,body,endpoint,!!powered);
  }
 }else{
  // A long unattended blackout must not softlock the owned habitat or bill
  // impossible electrical work. Analytical leak+cooling is conservative;
  // flag manual review instead of silently claiming full ECLSS operation.
  if(powered)throw Error('8I paid >4-day live service requires bounded operations scheduler; switch to safe offline review');
  const a=item.habT09,C=t09().CONFIG,rate=C.normalLeakS+
   (1-a.seal)**2*C.maxLeakS+(a.airlock==='OPEN_OUT'?.0009:0);
  const retained=Math.exp(-rate*dt);
  a.oxygenMol*=retained;a.inertMol*=retained;a.carbonMol*=retained;
  const ambient=t09().external(body).temperatureK,alpha=Math.exp(-C.thermalLeakWPerK*dt/C.thermalCapacityJK);
  a.tempK=Math.max(C.absoluteMinK,Math.min(C.absoluteMaxK,ambient+(a.tempK-ambient)*alpha));
  a.lastS=toS;a.powerW=0;a.integratedSupplyW=0;a.lastPower=false;
  a.awaitingReview=true;a.enabled=false;a.airlock='CLOSED';a.airlockUntilS=null;
  item.enabled=false;
 }
 const after=item.habT09;
 if(after.occupants!==0)throw Error('8I unsupported metabolic mass without food ledger');
 const afterWet=wetKg(after),vent=Math.max(0,beforeWet-afterWet);
 if(afterWet>beforeWet+EPS)throw Error('8I atmosphere created matter without a physical intake');
 next.state.habT09=after;
 next.massKg-=vent;
 next.state.oxygenKg=after.oxygenMol*M.oxygen;
 next.state.inertKg=after.inertMol*M.inert;
 next.state.carbonKg=after.carbonMol*M.carbon;
 next.state.pressurePa=pressure(after)*1000;
 next.state.eclss8i.lastS=toS;
 next.state.eclss8i.energyJ+=need;
 next.state.eclss8i.ventedKg+=vent;
 // This measures circulation of existing clean water through the installed
 // loop. It is NOT greywater conversion or new water production.
 next.state.eclss8i.waterCirculatedKg+=powered?Math.min(after.waterL,.002*dt):0;
 next.state.lifeSupportOnline=!!powered;
 next.state.habitable=false; // Zero-crew ECLSS is not human-rated occupancy.
 next.state.airlockSealed=after.airlock==='CLOSED';
 const balance=next.state.eclss8i.dryMassKg+wetKg(after);
 if(Math.abs(next.massKg-balance)>2e-5)
  throw Error('8I physical gas + captured CO2 + water mass closure failed');
 return{unchanged:false,asset:next,usedJ:need,ventedKg:vent,
  status:status(next,!!powered)};
}
const API=Object.freeze({status,commission,advance,COMMISSION_J,BASE_W});
root.StarfallManufacturedECLSS8I=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
