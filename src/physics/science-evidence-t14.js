/* STARFALL T14 — trusted sensor evidence and shared survey geography.
 * Pure adapter, NOT a second science archive. Root owners: robotics4 Journal,
 * Launch7 rover, 7C satellite, Imaging7F photos, Survey6G coverage, Ruins/Ecology.
 * Seeded simulation is never presented as real laboratory truth.
 */
(function(root){'use strict';
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const unit=(a)=>{if(!Array.isArray(a)||a.length!==3||!a.every(finite))throw Error('T14 invalid body-fixed location');const n=Math.hypot(...a);if(Math.abs(n-1)>.025)throw Error('T14 invalid body-fixed unit direction');return a.map(x=>x/n);};
const safeId=s=>typeof s==='string'&&s.length>0&&s.length<=170&&/^[\w.:\-]+$/.test(s);
const SENSORS=Object.freeze({
 spectrometer:{family:'geology',requires:'science-suite',envelope:'Solid surface; calibrated reflected-spectrum estimate'},
 thermometer:{family:'environment',requires:'thermometer',envelope:'Solid surface or low-altitude atmosphere'},
 barometer:{family:'environment',requires:'barometer',envelope:'Atmospheric pressure; airless vacuum correctly yields zero'},
 magnetometer:{family:'geophysics',requires:'magnetometer',envelope:'Planetary magnetic field, local interferers may reduce quality'},
 radar:{family:'geophysics',requires:'radar',envelope:'Terrain-ground-ranging and depth approximation, ground proximity'},
 seismometer:{family:'geophysics',requires:'seismometer',envelope:'Surface-contact sensor; airborne use is prohibited'},
 sampler:{family:'sample',requires:'contact-sampler',envelope:'Ground contact and local regolith extraction'},
 bioassay:{family:'ecology',requires:'bioassay',envelope:'Model biosignature index only; NEVER proof of life'}
});
function sensorSpecs(instruments){const s={};for(const [k,v] of Object.entries(instruments||{}))if(SENSORS[k]){
 if(!finite(v.powerW)||v.powerW<0||!finite(v.seconds)||v.seconds<=0||!finite(v.uncertainty)||v.uncertainty<=0||
 !finite(v.resolution)||v.resolution<=0||!finite(v.maxAltitudeM)||v.maxAltitudeM<0)throw Error('T14 invalid rated instrument '+k);
 s[k]={...SENSORS[k],name:v.name,parameter:v.quantity,unit:v.unit,
   powerW:v.powerW,acquisitionS:v.seconds,energyJ:v.powerW*v.seconds,
   resolution:v.resolution,uncertainty:v.uncertainty,maxAltitudeM:v.maxAltitudeM};
 }return s;}
function quality({calibrated=true,temperatureK=290,weather=0,health=1}={}){
 if(!finite(temperatureK)||!finite(weather)||!finite(health))throw Error('T14 invalid sensor health/temperature/weather');
 let penalty=calibrated?1:2.5,flags=[];
 if(!calibrated)flags.push('UNCALIBRATED');
 if(health<.75){penalty*=1+clamp((.75-health)*3,0,2.5);flags.push('DEGRADED_HARDWARE');}
 if(temperatureK>325||temperatureK<210){penalty*=1+clamp(Math.abs(temperatureK-290)/80,0,2.5);flags.push('THERMAL_DRIFT');}
 if(weather>.6){penalty*=1+clamp(weather,0,1);flags.push('WEATHER_SCATTER');}
 return{uncertaintyMultiplier:penalty,confidenceModel:clamp(1/penalty,0,1),flags,
  explanation:'relative modeled instrument quality, not probability of scientific truth'};
}
function annotateObservation(ob,{spec,sourceAssetId,calibrated=ob?.calibrated!==false,temperatureK=290,weather=0,health=1,dataBytes=256}={}){
 if(!ob||!safeId(ob.id)||!safeId(ob.bodyId)||!finite(ob.value)||!finite(ob.timeS)||ob.timeS<0)throw Error('T14 invalid source observation');
 const local=unit(ob.location);
 if(!spec||!finite(spec.uncertainty)||spec.uncertainty<=0||!finite(spec.powerW))throw Error('T14 instrument spec missing');
 const q=quality({calibrated,temperatureK,weather,health});
 const base=finite(ob.uncertainty)&&ob.uncertainty>=0?ob.uncertainty:spec.uncertainty;
 return{...ob,location:local,sourceAssetId:safeId(sourceAssetId)?sourceAssetId:(safeId(ob.sourceAssetId)?ob.sourceAssetId:null),
  t14:{schema:1,source:'seeded simulation',model:ob.model||'procedural estimate',instrument:ob.instrument,
   acquisitionS:spec.acquisitionS??spec.seconds,powerW:spec.powerW,energyJ:spec.energyJ??spec.powerW*spec.seconds,
   dataBytes:clamp(Math.floor(dataBytes),64,65536),resolution:spec.resolution,
   effectiveUncertainty:base*q.uncertaintyMultiplier,
   confidenceModel:q.confidenceModel,qualityFlags:q.flags,
   calibration:calibrated?'LEGACY_BASELINE':'UNCALIBRATED',
   qualityNote:q.explanation}};
}
function validateEvidence(ob){
 if(!ob||!safeId(ob.id)||!safeId(ob.bodyId)||!finite(ob.timeS)||ob.timeS<0||
 !finite(ob.value)||!finite(ob.uncertainty)||ob.uncertainty<0)return false;
 try{unit(ob.location);}catch(_){return false;}
 if(ob.t14&&(ob.t14.schema!==1||!finite(ob.t14.effectiveUncertainty)||ob.t14.effectiveUncertainty<0))return false;
 return true;
}
function latLon(local){const p=unit(local);return{lat:Math.asin(clamp(p[1],-1,1))*180/Math.PI,
 lon:Math.atan2(p[0],p[2])*180/Math.PI};}
function marker(o,type,label,extra={}){return{id:o.id,bodyId:o.bodyId,local:unit(o.location||o.local),type,label,...extra};}
function evidenceLayers({bodyId,journal=[],photos=[],ruins=[],ecology=[],satellites=[],outposts=[],pending=[]}={}){
 if(!safeId(bodyId))return[];
 const seen=new Set(),res=[];
 const push=m=>{if(!m||m.bodyId!==bodyId||!safeId(m.id)||seen.has(m.id))return;
  try{m.local=unit(m.local);}catch(_){return;}
  seen.add(m.id);res.push(m);};
 for(const o of journal)if(o?.bodyId===bodyId&&validateEvidence(o)&&
  (o.kind!=='orbital-observation'||finite(o.receivedAtS))){
   const type=o.kind==='orbital-observation'?'orbital':'measurement';
   push(marker(o,type,(o.instrument||'Instrument')+' / '+o.id.slice(-12),
    {evidenceId:o.id,sourceId:o.probeId||o.satelliteId||o.sourceAssetId||'legacy-on-foot',
     value:o.value,unit:o.unit||'',quality:o.t14?.qualityFlags?.join(', ')||o.quality||'MODEL',timeS:o.timeS}));
 }
 for(const p of photos)if(p?.bodyId===bodyId&&p.status==='downlinked'&&finite(p.receivedAtS)&&safeId(p.id)){
  // Actual camera optics were rendered and bytes downlinked. No inferred photo from numeric 7C camera.
  // Camera position is WORLD position, so without source's body-fixed direction use photo.local only.
  const dir=p.local||p.bodyFixedLocal||p.captureLocal;
  if(dir)push(marker({id:p.id,bodyId,location:dir},'photo','Received image '+p.id.slice(-13),{
    photoId:p.id,sourceId:p.sourceAssetId,targetRuinId:p.targetRuinId||null,timeS:p.timeS,quality:'ACTUAL WEBGL IMAGE DOWNLINKED'}));
 }
 for(const r of ruins)if(r?.bodyId===bodyId&&r.level>=1&&r.siteSnapshot?.local)
  push(marker({id:r.id,bodyId,local:r.siteSnapshot.local},'ruin',r.level>=2?'Examined ruin':'Surveyed ruin',{evidenceId:r.id,quality:'PROCEDURAL ARCHAEOLOGY'}));
 for(const e of ecology)if(e?.bodyId===bodyId&&(e.level>=1||e.stage>=1||e.observedAtS!==undefined)&&e.local)
  push(marker({id:e.id,bodyId,local:e.local},'ecology','Observed ecosystem candidate',{evidenceId:e.id,quality:'SEEDED MODEL EVIDENCE'}));
 for(const x of outposts)if(x?.bodyId===bodyId&&x?.local&&x.kind==='antenna')
  push(marker(x,'relay','Outpost receiver '+x.id.slice(-10),{sourceId:x.id}));
 for(const x of pending)if(x?.bodyId===bodyId&&x.local&&x.requestedAtS!==undefined)
  push(marker(x,'pending','Pending camera job · position currently known; not yet evidence',{sourceId:x.assetId}));
 return res;
}
function filterMarkers(markers,filter='all'){const accepted=['all','measurement','orbital','photo','ruin','ecology','outpost','relay','pending','mission','rover'];if(!accepted.includes(filter))throw Error('T14 invalid map filter');
 if(filter==='all')return markers.slice();
 if(filter==='mission')return markers.filter(x=>['ship','rover','explorer','waypoint'].includes(x.type));
 if(filter==='rover')return markers.filter(x=>x.type==='rover'||x.type==='measurement'&&x.sourceId?.includes('rover')||x.type==='measurement'&&x.sourceId?.startsWith('probe-'));
 return markers.filter(x=>x.type===filter);
}
const API={sensorSpecs,SENSORS,quality,annotateObservation,validateEvidence,latLon,evidenceLayers,filterMarkers,unit};
root.StarfallScienceT14=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
