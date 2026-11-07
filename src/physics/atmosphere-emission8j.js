/* STARFALL 8J — source-owned, physically metered tiny atmospheric gas discharge.
 * Global mean ΔP is computed from canonical planet R/g; an actual 8A rated
 * gas vessel is debited. No zero-time climate or terrain transformation.
 */
(function(root){'use strict';
const cp=x=>JSON.parse(JSON.stringify(x));
const gas={oxygen:.031998,nitrogen:.028014,carbon_dioxide:.04401,hydrogen:.002016,methane:.016043};
const EPS=1e-8,WORK_J_KG=100000,MAX_BATCH_KG=10;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const knownGas=x=>Object.prototype.hasOwnProperty.call(gas,x);
const genuineOrigin=x=>id(x)&&!/TEST_FIXTURE|CREATIVE|DEBUG|CHEAT/i.test(x);
function normalize(saved,profile){
 if(!profile||!id(profile.id)||!finite(profile.radiusM)||profile.radiusM<=0||
    !finite(profile.surfaceGravityMS2)||profile.surfaceGravityMS2<=0||
    !finite(profile.atmospherePressurePa)||!finite(profile.mu)||profile.mu<=0)
  throw Error('8J requires real canonical planetary SI profile');
 const baseMass=profile.atmospherePressurePa*4*Math.PI*profile.radiusM**2/profile.surfaceGravityMS2;
 if(saved==null)return{schema:1,bodyId:profile.id,radiusM:profile.radiusM,
  gravityMS2:profile.surfaceGravityMS2,baselineAtmosphereKg:baseMass,
  atmosphereKg:baseMass,pressurePa:profile.atmospherePressurePa,
  netAddedKg:0,pressureDeltaPa:0,emittedSpeciesKg:{},receipts:[],lastTimeS:0};
 const s=cp(saved);
 if(s.schema!==1||s.bodyId!==profile.id||!finite(s.atmosphereKg)||
   !finite(s.baselineAtmosphereKg)||!finite(s.pressurePa)||
   !finite(s.netAddedKg)||!finite(s.pressureDeltaPa)||
   !Array.isArray(s.receipts)||s.receipts.length>2000||
   !s.emittedSpeciesKg||typeof s.emittedSpeciesKg!=='object'||
   !finite(s.radiusM)||!finite(s.gravityMS2)||
   !Number.isFinite(baseMass)||baseMass<0||
   Math.abs(s.radiusM-profile.radiusM)>1e-6||
   Math.abs(s.gravityMS2-profile.surfaceGravityMS2)>1e-6||
   new Set(s.receipts.map(r=>r.id)).size!==s.receipts.length)
  throw Error('8J persisted planetary intervention incompatible/corrupt');
 const expectedDelta=s.netAddedKg*profile.surfaceGravityMS2/(4*Math.PI*profile.radiusM**2);
 if(Math.abs(s.pressureDeltaPa-expectedDelta)>Math.max(1e-18,Math.abs(expectedDelta)*1e-9)||
    Math.abs(s.pressurePa-(profile.atmospherePressurePa+s.pressureDeltaPa))>1e-7)
  throw Error('8J atmospheric pressure delta not conserved by saved mass');
 return s;
}
function emit(input){
 const a=input||{},p=a.profile;
 if(!id(a.receiptId)||!a.receiptId.startsWith('atm8j:')||
  !id(a.vesselId)||!id(a.sourceLotId)||!id(a.bodyId)||
  !finite(a.kg)||a.kg<=0||a.kg>MAX_BATCH_KG||
  !finite(a.shipEnergyJ)||!finite(a.timeS)||!a.materials||
  a.materials.schema!==1||!Array.isArray(a.materials.lots)||
  !Array.isArray(a.materials.containers)||!Array.isArray(a.materials.operations)||
  !a.physical||a.physical.schema!==1||!Array.isArray(a.physical.assets)||
  !p||p.id!==a.bodyId)throw Error('8J invalid measured physical atmospheric injection request');
 const state=normalize(a.savedWorld,p);
 const old=state.receipts.find(x=>x.id===a.receiptId);
 if(old){
  if(old.vesselId!==a.vesselId||old.lotId!==a.sourceLotId||old.massKg!==a.kg)
   throw Error('Conflicting 8J atmospheric gas receipt');
  return{duplicate:true,world:state,materials:cp(a.materials),
   shipEnergyJ:a.shipEnergyJ,receipt:cp(old)};
 }
 if(a.timeS<state.lastTimeS)throw Error('8J cannot regress planetary operations time');
 if(a.protectedWorld||a.nativeLife||a.archaeologicalProtection)
  throw Error('8J planetary protection lock: native life or archaeological site');
 if(!a.landable||!a.shipLanded||!a.operatorEVA||!a.shipPowered||
   !a.operatorNear)throw Error('8J requires powered landed ship and near-surface EVA');
 const vessel=a.physical.assets.find(x=>x.id===a.vesselId);
 if(!vessel||vessel.type!=='industrial_vessel'||vessel.state?.enabled!==true||
  !finite(vessel.condition)||vessel.condition<.8||
  !finite(vessel.state?.ratedPressurePa)||vessel.state.ratedPressurePa<5e6||
  !knownGas(vessel.state.materialId))throw Error('8J requires a safe, enabled, rated original gas vessel');
 const materialId=vessel.state.materialId;
 if(vessel.location?.kind==='ship'){
  if(vessel.location.parentId!=='ship-main'||vessel.location.slot!=='engineering-gas-cradle')
   throw Error('8J vessel must be secured in actual ship gas cradle');
 }else if(vessel.location?.kind==='surface'){
  if(vessel.location.bodyId!==a.bodyId||!a.vesselNear)
   throw Error('8J surface vessel must be near operator on the same world');
 }else throw Error('8J vessel must be physically aboard or on the surface');
 const c=a.materials.containers.find(x=>x.id===vessel.state.containerId&&x.ownerId===vessel.id);
 if(!c||!String(c.kind).includes('gas'))throw Error('8J source gas is not in its rated 8A vessel container');
 const lots=a.materials.lots.filter(x=>x.containerId===c.id);
 if(lots.some(l=>l.materialId!==materialId))throw Error('8J refuses mixed gas vessel');
 const l=lots.find(x=>x.id===a.sourceLotId&&x.materialId===materialId&&
  finite(x.massKg)&&x.massKg>=a.kg-EPS&&finite(x.volumeM3)&&x.volumeM3>0&&
  finite(x.grade)&&x.grade>=.98&&genuineOrigin(x.provenance));
 if(!l)throw Error('8J no adequate source-owned pure gas lot');
 if(lots.some(x=>!finite(x.massKg)||!finite(x.volumeM3)||!genuineOrigin(x.provenance)))
  throw Error('8J invalid or creative gas lot in source vessel');
 const total=lots.reduce((x,v)=>x+v.massKg,0),vol=lots.reduce((x,v)=>x+v.volumeM3,0);
 if(!Number.isFinite(total)||!Number.isFinite(vol)||!finite(c.maxMassKg)||
    !finite(c.maxVolumeM3)||!vol||total>c.maxMassKg+EPS||vol>c.maxVolumeM3+EPS)
  throw Error('8J gas vessel overfilled');
 const pressure=total/gas[materialId]*8.314462618*293.15/vol;
 if(!Number.isFinite(pressure)||pressure>vessel.state.ratedPressurePa+100||pressure<1e5)
  throw Error('8J gas pressure exceeds source vessel rating');
 const held=a.materials.operations.filter(x=>x.status==='RESERVED'&&x.lotId===l.id)
  .reduce((s,x)=>s+x.massKg,0);
 if(l.massKg-held<a.kg-EPS)throw Error('8J source gas already reserved');
 const workJ=a.kg*WORK_J_KG;
 if(a.shipEnergyJ+EPS<workJ)throw Error('8J requires physical ship regulator energy');
 const next=cp(a.materials),src=next.lots.find(x=>x.id===l.id);
 const volumeDebit=a.kg*src.volumeM3/src.massKg;
 if(src.massKg-a.kg<=EPS)next.lots.splice(next.lots.indexOf(src),1);
 else{src.massKg-=a.kg;src.volumeM3=Math.max(0,src.volumeM3-volumeDebit);}
 const w=cp(state);w.netAddedKg+=a.kg;
 w.atmosphereKg=w.baselineAtmosphereKg+w.netAddedKg;
 w.emittedSpeciesKg[materialId]=(w.emittedSpeciesKg[materialId]||0)+a.kg;
 w.pressureDeltaPa=w.netAddedKg*w.gravityMS2/(4*Math.PI*w.radiusM**2);
 w.pressurePa=p.atmospherePressurePa+w.pressureDeltaPa;
 w.lastTimeS=a.timeS;
 const receipt={id:a.receiptId,status:'COMMITTED',kind:'PLANET_ATMOSPHERE_EMISSION_8J',
  vesselId:vessel.id,lotId:l.id,gas:materialId,massKg:a.kg,
  fromBodyId:a.bodyId,toReservoir:'planet:'+a.bodyId+':atmosphere',
  pressureDeltaPa:a.kg*w.gravityMS2/(4*Math.PI*w.radiusM**2),workJ,
  sourceBatteryJBefore:a.shipEnergyJ,sourceBatteryJAfter:a.shipEnergyJ-workJ,
  energySourceId:'ship-main:engineering-battery',sourceProvenance:l.provenance,timeS:a.timeS};
 w.receipts.push(receipt);next.operations.push({...receipt});
 root.StarfallMaterials8A?.create(next);
 return{duplicate:false,materials:next,world:w,shipEnergyJ:a.shipEnergyJ-workJ,receipt};
}
const API=Object.freeze({normalize,emit,WORK_J_KG,MAX_BATCH_KG});
root.StarfallAtmosphereEmission8J=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
