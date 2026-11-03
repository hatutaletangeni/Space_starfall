/* STARFALL 6I — Deterministic simulated planetary events.
 * Pure model: same seed/body/site/time -> identical event. No terrain edits.
 * Weather is an authored scientific approximation, not an N-body or CFD solver.
 */
(function(root){'use strict';
const FS=root.StarfallFieldScience,ST=root.StarfallStableTerrain;
if(!FS||!ST)throw Error('Events require field science and stable terrain');
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const norm=ST.normalize;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const ARC=(a,b,r)=>Math.acos(clamp(dot(norm(a),norm(b)),-1,1))*r;
const TYPES=Object.freeze({
 dust:{name:'Dust storm',instrument:'barometer',tint:[.62,.40,.24],visibility:.77,solar:.72,scope:'global',desc:'Airborne particulate load may reduce visibility and sunlight.'},
 snow:{name:'Ice crystal squall',instrument:'thermometer',tint:[.65,.79,.91],visibility:.58,solar:.58,scope:'global',desc:'Wind-driven icy particulate simulation.'},
 aurora:{name:'Polar aurora',instrument:'magnetometer',tint:[.16,.60,.47],visibility:.04,solar:0,scope:'polar',desc:'Upper-atmosphere emission estimated from magnetic conditions.'},
 meteor:{name:'Meteor shower',instrument:'spectrometer',tint:[.88,.62,.40],visibility:.07,solar:.03,scope:'global',desc:'Atmospheric trails or surface impact flashes; no terrain destruction.'},
 seismic:{name:'Seismic tremor',instrument:'seismometer',tint:[.55,.44,.36],visibility:.09,solar:0,scope:'regional',desc:'Small ground motion signal; no structural damage.'},
 volcanic:{name:'Volcanic ash plume',instrument:'seismometer',tint:[.48,.23,.17],visibility:.64,solar:.65,scope:'regional',desc:'Ash and hot-gas column estimated for volcanic terrain.'},
 cryo:{name:'Cryovolcanic plume',instrument:'radar',tint:[.54,.71,.79],visibility:.48,solar:.44,scope:'regional',desc:'Estimated volatile-ice plume. No permanent surface modification.'},
 hydrothermal:{name:'Hydrothermal discharge',instrument:'thermometer',tint:[.68,.80,.84],visibility:.22,solar:.08,scope:'regional',desc:'Geothermal water or steam vent active from an identified reservoir.'},
 electrical:{name:'Atmospheric electrical activity',instrument:'barometer',tint:[.30,.35,.59],visibility:.25,solar:.19,scope:'global',desc:'Transient atmospheric discharge signature; no electric damage.'}
});
const SLOT=720;
function candidates(body,seed=742){if(!body||!body.landable)return[];
 const p=FS.profile(body,seed),t=String(body.type||'').toLowerCase(),air=p.pressurePa>2500,ice=/ice|frozen|glaci/.test(t),volcanic=/volcan|lava/.test(t),desert=/desert|rocky/.test(t),humid=/temper|ocean|lush/.test(t);
 const out=['meteor','seismic'];
 if(air&&(desert||volcanic))out.push('dust');
 if(air&&ice)out.push('snow');
 if(volcanic)out.push('volcanic');
 if(ice)out.push('cryo');
 if(air&&Math.abs(p.magneticFieldNT)>3200)out.push('aurora');
 if(air&&(humid||volcanic))out.push('electrical');
 return out;
}
function timeline(body,seed=742,window=0){const valid=candidates(body,seed);if(!valid.length||!Number.isSafeInteger(window)||window<0)return null;
 const key=String(seed)+':'+body.id+':6i:'+window;
 if(FS.rand(key+':chance')>.82)return null;
 const kind=valid[Math.floor(FS.rand(key+':kind')*valid.length)],spec=TYPES[kind],duration=240+Math.floor(FS.rand(key+':length')*260),start=window*SLOT+75+Math.floor(FS.rand(key+':offset')*100),end=start+duration;
 const lat=(FS.rand(key+':lat')-.5)*1.7,lon=(FS.rand(key+':lon')*2-1)*Math.PI,cl=Math.cos(lat),anchor=[cl*Math.cos(lon),Math.sin(lat),cl*Math.sin(lon)];
 return Object.freeze({id:'event-'+FS.hash(key).toString(36),bodyId:body.id,kind,startS:start,endS:end,anchor,extentScene:240+FS.rand(key+':extent')*620,seed,window});
}
function geothermalEvent(body,local,time,seed=742){
 const Geo=root.StarfallGeothermalLW01;if(!Geo||!body?.landable||!Array.isArray(local)||!Number.isFinite(time)||time<0)return null;
 const p=FS.profile(body,seed),near=Geo.local(body,local,time,seed,p.pressurePa,Math.max(.25,(body.gravity||1)*9.80665));
 if(!near?.state?.active||near.thermalExposure<.01)return null;
 const {site,state,rangeScene}=near,sourceType=site.kind;
 const type=sourceType==='cryovolcano'?'cryo':sourceType.includes('volcano')||sourceType.includes('eruption')||sourceType==='cinder-cone'?'volcanic':'hydrothermal';
 const spec=TYPES[type],n=Math.floor((time+site.epochOffsetS)/site.cycleS),start=n*site.cycleS-site.epochOffsetS;
 const intensity=near.thermalExposure;
 return Object.freeze({id:'lw01-'+FS.hash(site.id+':cycle:'+n).toString(36),bodyId:body.id,kind:type,
  sourceId:site.id,sourceProcess:sourceType,startS:start,endS:start+site.durationS,anchor:site.direction,
  extentScene:rangeScene,seed,window:Math.floor(time/SLOT),name:spec.name+' ('+sourceType+')',
  description:'Vent pressure '+Math.round(state.pressurePa)+' Pa; mass discharge '+state.massFlowKgS.toFixed(1)+' kg/s (model)',
  instrument:spec.instrument,intensity,spatial:Math.max(0,1-near.distanceScene/rangeScene),scope:'regional',
  visibility:clamp(1-spec.visibility*intensity,.12,1),solarFactor:clamp(1-spec.solar*intensity,.12,1),
  tint:spec.tint,phase:clamp((time-start)/site.durationS)});
}
function evaluate(body,local,time,seed=742){if(!body?.landable||!Array.isArray(local)||local.length!==3||!local.every(Number.isFinite)||!Number.isFinite(time)||time<0)return null;
 const geothermal=geothermalEvent(body,local,time,seed);if(geothermal)return geothermal;
 const window=Math.floor(time/SLOT);let best=null;
 for(let i=Math.max(0,window-1);i<=window;i++){
  const e=timeline(body,seed,i);if(!e||time<e.startS||time>e.endS)continue;
  const spec=TYPES[e.kind];let spatial=1;
  if(spec.scope==='regional'){const d=ARC(local,e.anchor,body.radius);spatial=1-clamp((d-e.extentScene*.20)/(e.extentScene*.8));}
  else if(spec.scope==='polar')spatial=clamp((Math.abs(norm(local)[1])-.38)/.34);
  if(spatial<=0)continue;
  const phase=clamp((time-e.startS)/(e.endS-e.startS)),intensity=spatial*Math.sin(phase*Math.PI)**2;
  if(intensity<.003)continue;
  if(!best||intensity>best.intensity)best={...e,name:spec.name,description:spec.desc,instrument:spec.instrument,intensity,spatial,phase,scope:spec.scope,visibility:clamp(1-spec.visibility*intensity,.12,1),solarFactor:clamp(1-spec.solar*intensity,.12,1),tint:spec.tint};
 }
 return best;
}
function skyTransmission(body,local,time,seed=742){
 const weather=evaluate(body,local,time,seed)?.solarFactor??1;
 const geothermal=root.StarfallGeothermalLW01;
 if(!geothermal||!body?.landable)return weather;
 const p=FS.profile(body,seed),e=geothermal.local(body,local,time,seed,p.pressurePa,Math.max(.25,(body.gravity||1)*9.80665));
 const ash=e?.state?.ashMassFlowKgS||0;
 const attenuation=ash>0?Math.max(.35,1-.48*e.thermalExposure):1;
 return Math.max(.12,Math.min(1,weather*attenuation));
}
function sanitize(records){if(!Array.isArray(records))return[];const ids=new Set(),out=[];
 for(const rec of records.slice(-600)){if(!rec||typeof rec!=='object'||typeof rec.id!=='string'||rec.id.length>90||ids.has(rec.id)||typeof rec.bodyId!=='string'||rec.bodyId.length>150||!TYPES[rec.kind]||!Number.isFinite(rec.timeS)||rec.timeS<0||rec.timeS>=1e13||!Array.isArray(rec.local)||rec.local.length!==3||!rec.local.every(Number.isFinite)||!Number.isFinite(rec.intensity)||rec.intensity<0||rec.intensity>1)continue;
  ids.add(rec.id);out.push({id:rec.id,bodyId:rec.bodyId,kind:rec.kind,timeS:rec.timeS,local:norm(rec.local),intensity:rec.intensity,measurementIds:Array.isArray(rec.measurementIds)?rec.measurementIds.filter(x=>typeof x==='string'&&x.length<160).slice(0,8):[],note:typeof rec.note==='string'?rec.note.slice(0,1000):''});if(out.length>=250)out.shift();}
 return out;
}
root.StarfallEvents={TYPES,SLOT,candidates,timeline,geothermalEvent,evaluate,skyTransmission,sanitize,arc:ARC};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallEvents;
})(globalThis);
