/* STARFALL 6D — deterministic, evidence-based sandbox expeditions.
 * Pure data/logic: no DOM, WebGL or side effects. Science context ≠ proof of alien origins.
 */
(function(root){'use strict';
const A=root.StarfallArchaeology||(typeof require==='function'?require('../archaeology/ruins.js'):null);
const T=root.StarfallStableTerrain||(typeof require==='function'?require('../terrain/stable-surface.js'):null);
const S=root.StarfallFieldScience||(typeof require==='function'?require('../physics/science-field.js'):null);
const MODELS=Object.freeze({magnetic:{name:'Magnetic gradient',instrument:'magnetometer',quantity:'magneticFieldNT'},thermal:{name:'Thermal irregularity',instrument:'thermometer',quantity:'temperatureK'},seismic:{name:'Seismic structure',instrument:'seismometer',quantity:'seismicLevelMMs'},spectral:{name:'Mineral spectral feature',instrument:'spectrometer',quantity:'silicateFraction'},volatile:{name:'Subsurface ice contrast',instrument:'radar',quantity:'iceDepthM'}});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function anomalyForTile(body,tile,sample,seed=742){if(!body?.landable||!tile||typeof sample!=='function')return null;
 const k=body.seed+':'+tile.key+':discovery6d';if(A.random(k+':occurrence')>=.24)return null;
 const local=T.faceDirection(tile.face,tile.u0+tile.step*(.2+.6*A.random(k+':u')),tile.v0+tile.step*(.2+.6*A.random(k+':v')));
 const terrain=sample(body,local);if(!terrain||!Number.isFinite(terrain.height)||terrain.material==='water')return null;
 // Classify a candidate from a pre-existing seeded scientific profile, never from a
 // visual-only random label. This remains a simplified terrain-geology anomaly model.
 const localTruth=S.localTruth(body,seed,local,0),baseTruth=S.profile(body,seed);
 const contrast={magnetic:Math.abs(localTruth.magneticFieldNT-baseTruth.magneticFieldNT)/100,
  thermal:Math.abs(localTruth.temperatureK-baseTruth.temperatureK)/8,
  seismic:Math.abs(localTruth.seismicLevelMMs-baseTruth.seismicLevelMMs)/Math.max(.005,baseTruth.seismicLevelMMs),
  spectral:Math.abs(localTruth.silicateFraction-baseTruth.silicateFraction)/.04,
  volatile:Math.abs(localTruth.iceDepthM-baseTruth.iceDepthM)/Math.max(1,baseTruth.iceDepthM)};
 // Local contrasts yield classifications; add a small deterministic tie breaker.
 const kind=Object.keys(MODELS).sort((a,b)=>(contrast[b]+.03*A.random(k+':'+b))-(contrast[a]+.03*A.random(k+':'+a)))[0];
 return Object.freeze({id:'geo-'+A.hash(k).toString(36),bodyId:body.id,kind,category:'geological',local:Object.freeze([...local]),height:terrain.height,biome:terrain.biome||'unclassified',model:'seeded local-truth geological contrast / requires measurement',tileKey:tile.key});
}
function candidates(body,local,sample,ruins=[],radius=3,seed=742){if(!body?.landable)return[];
 const fromGeology=T.visibleTiles(body,local,clamp(Math.floor(radius),0,4)).map(tile=>anomalyForTile(body,tile,sample,seed)).filter(Boolean);
 const fromRuins=ruins.filter(s=>s?.bodyId===body.id&&Array.isArray(s.local)).map(s=>({id:s.id,bodyId:s.bodyId,category:'archaeological',kind:'structural',local:s.local,height:s.height,biome:s.biome,model:'procedural ancient-culture hypothesis',tileKey:s.tileKey}));
 return [...fromGeology,...fromRuins].sort((a,b)=>A.arc(a.local,local,body.radius)-A.arc(b.local,local,body.radius)||a.id.localeCompare(b.id));
}
function validateRecords(records){const seen=new Map();if(!Array.isArray(records))return[];
 for(const raw of records){
  if(!raw||typeof raw.id!=='string'||! /^(geo|ruin)-[a-z0-9]+$/.test(raw.id)||typeof raw.bodyId!=='string'||raw.bodyId.length>150||!['geological','archaeological'].includes(raw.category)||![1,2,3,4].includes(raw.stage)||!Array.isArray(raw.local)||raw.local.length!==3||!raw.local.every(Number.isFinite)||Math.abs(Math.hypot(...raw.local)-1)>.015||!Number.isFinite(raw.timeS)||raw.timeS<0||raw.timeS>1e14)continue;
  const ids=Array.isArray(raw.evidenceIds)?[...new Set(raw.evidenceIds.filter(s=>typeof s==='string'&&/^obs-[0-9a-z]+$/.test(s)))].slice(0,20):[];
  const receipts=Array.isArray(raw.labReceiptIds)?[...new Set(raw.labReceiptIds.filter(s=>typeof s==='string'&&s.length<160))].slice(0,20):[];
  const stage=Math.min(raw.stage,ids.length?4:2,receipts.length?4:3);
  seen.set(raw.id,{id:raw.id,bodyId:raw.bodyId,category:raw.category,kind:String(raw.kind||'unknown').slice(0,35),local:A.norm(raw.local),biome:String(raw.biome||'unknown').slice(0,60),stage:stage===4&&!receipts.length?3:stage,timeS:raw.timeS,evidenceIds:ids,labReceiptIds:receipts,notes:String(raw.notes||'').slice(0,500)});
 }return[...seen.values()];
}
function evidenceNear(site,observations,bodyRadius,maxDistance=65){return(Array.isArray(observations)?observations:[]).filter(o=>o&&o.bodyId===site.bodyId&&typeof o.id==='string'&&Array.isArray(o.location)&&o.location.length===3&&o.location.every(Number.isFinite)&&Number.isFinite(o.value)&&Number.isFinite(o.uncertainty)&&o.uncertainty>=0&&A.arc(o.location,site.local,bodyRadius)<=maxDistance).sort((a,b)=>a.id.localeCompare(b.id));}
function labEvidence(record,receipts){if(!record)return[];const ids=new Set(record.evidenceIds);return(Array.isArray(receipts)?receipts:[]).filter(r=>r&&ids.has(r.observationId)&&r.bodyId===record.bodyId&&typeof r.labId==='string'&&Number.isFinite(r.receivedAtS));}
function confidence(record,evidence=[]){if(!record)return{value:0,label:'Unsurveyed'};
 // This is confidence in the *survey classification*, not biological intelligence.
 const unique=new Set(evidence.map(e=>e.instrument)),n=unique.size;
 const value=record.stage===1?.18:record.stage===2?.42:record.stage===3?Math.min(.75,.50+.08*n):Math.min(.88,.63+.08*n);
 return{value,label:value<.3?'Candidate':value<.5?'Preliminary':value<.8?'Supported':'Archived evidence'};
}
function hypotheses(site,record,observations,receipts){const evidence=(observations||[]).filter(e=>record?.evidenceIds?.includes(e.id));const c=confidence(record,evidence),lab=labEvidence(record,receipts),kind=site?.category||record?.category;
 const compatible=kind==='geological'?(MODELS[site?.kind||record?.kind]?.instrument||null):null;
 const matches=compatible?evidence.filter(o=>o.instrument===compatible).length:0;
 return{confidence:c,measurements:evidence.length,distinctInstruments:new Set(evidence.map(e=>e.instrument)).size,labReceipts:lab.length,targetInstrument:compatible,compatibleMeasurements:matches,interpretation:kind==='archaeological'?'Structural anomaly consistent with a seeded fictional archaeology model; nearby geology readings do not prove extraterrestrial origin.':matches?'Locally measured context supports further study of this seeded geological candidate; no independent geological inversion has been performed.':'Candidate signature is unverified; use the recommended field instrument nearby.',limitation:'Confidence is a gameplay evidence-quality score, not a calibrated probability or ground truth.'};
}
function transition(record,site,operation,{distance=Infinity,landed=false,eva=false,timeS=0,observations=[],receipts=[],bodyRadius=1}={}){
 if(!site?.id||!Number.isFinite(timeS)||timeS<0)throw Error('Invalid survey target/time');
 const current=record?{...record,evidenceIds:[...record.evidenceIds],labReceiptIds:[...record.labReceiptIds]}:{id:site.id,bodyId:site.bodyId,category:site.category,kind:site.kind,local:[...site.local],biome:site.biome||'unknown',stage:0,timeS:0,evidenceIds:[],labReceiptIds:[],notes:''};
 if(current.id!==site.id||current.bodyId!==site.bodyId)throw Error('Survey identity mismatch');
 if(operation==='survey'){if(distance>300)throw Error('Signal outside 300 scene-unit survey range');current.stage=Math.max(current.stage,1);}
 else if(operation==='field'){if(!landed||!eva||distance>55)throw Error('Field inspection requires EVA within 55 scene units');if(current.stage<1)throw Error('Survey this signal first');current.stage=Math.max(current.stage,2);}
 else if(operation==='evidence'){if(current.stage<2)throw Error('Inspect the site before correlating instruments');const data=evidenceNear(site,observations,bodyRadius);const required=site.category==='geological'?MODELS[site.kind]?.instrument:null;const valid=data.filter(o=>(!required||o.instrument===required)&&o.id&&!current.evidenceIds.includes(o.id));if(!valid.length)throw Error('No new compatible local instrument observations; collect the recommended reading within 65 scene units');current.evidenceIds=[...current.evidenceIds,...valid.map(x=>x.id)].slice(-20);current.stage=Math.max(current.stage,3);}
 else if(operation==='lab'){if(current.stage<3)throw Error('Link field measurements before laboratory validation');const received=labEvidence(current,receipts);if(!received.length)throw Error('No powered laboratory has received any linked measurement yet');current.labReceiptIds=[...new Set([...current.labReceiptIds,...received.map(r=>r.labId+':'+r.observationId)])].slice(-20);current.stage=4;}
 else throw Error('Unknown survey action');
 current.timeS=timeS;return current;
}
function compare(records,observations,receipts){const groups=new Map();for(const r of records||[]){const o=(observations||[]).filter(x=>r.evidenceIds.includes(x.id)),h=hypotheses(null,r,o,receipts),g=groups.get(r.bodyId)||{bodyId:r.bodyId,sites:0,geological:0,archaeological:0,surveyed:0,examined:0,corroborated:0,laboratory:0,observations:new Set(),instruments:new Set()};g.sites++;g[r.category]++;if(r.stage>=1)g.surveyed++;if(r.stage>=2)g.examined++;if(r.stage>=3)g.corroborated++;if(r.stage>=4)g.laboratory++;for(const e of o){g.observations.add(e.id);g.instruments.add(e.instrument);}groups.set(r.bodyId,g);}return[...groups.values()].map(g=>({...g,observations:g.observations.size,instruments:g.instruments.size})).sort((a,b)=>a.bodyId.localeCompare(b.bodyId));}
function csv(records){const fields=['id','bodyId','category','kind','biome','stage','timeS','evidenceIds','labReceiptIds','local'];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return fields.join(',')+'\n'+records.map(r=>fields.map(k=>esc(Array.isArray(r[k])?r[k].join(' / '):r[k])).join(',')).join('\n')+'\n';}
const api=Object.freeze({MODELS,anomalyForTile,candidates,validateRecords,evidenceNear,labEvidence,confidence,hypotheses,transition,compare,csv});root.StarfallDiscovery=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
