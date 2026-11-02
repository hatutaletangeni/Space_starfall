/* STARFALL T10 — physical sample custody and finite lab analysis.
 * Existing outpost5.items own storage and lab records; ScienceUI owns numeric
 * journal, Imaging7F owns image binary, T03 owns remote packet ACKs.
 */
(function(root){'use strict';
const SCHEMA=1,STORAGE_COUNT=60,STORAGE_MASS_KG=160,LAB_RECORDS=120;
const V={dot:(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),len:a=>Math.hypot(...a)};
const finite=Number.isFinite,clone=x=>JSON.parse(JSON.stringify(x));
function cleanSample(x){
 if(!x||typeof x.id!=='string'||x.id.length>160||!/^[-_\w:.]+$/.test(x.id)||
 !['rock','regolith','ice','biological','soil','unknown'].includes(x.type)||!finite(x.massKg)||x.massKg<=0||x.massKg>80||
 typeof x.bodyId!=='string'||!Array.isArray(x.location)||x.location.length!==3||!x.location.every(finite)||
 !finite(x.extractedAtS)||x.extractedAtS<0||typeof x.sourceId!=='string')throw Error('T10 physical sample metadata invalid');
 const d=V.len(x.location);if(d<.99||d>1.01)throw Error('Sample coordinates must be real body-fixed unit direction');
 return{id:x.id,type:x.type,massKg:x.massKg,volumeL:finite(x.volumeL)&&x.volumeL>=0?x.volumeL:0,
  bodyId:x.bodyId,location:x.location.slice(),extractedAtS:x.extractedAtS,sourceId:x.sourceId,
  instrument:String(x.instrument||'sampler').slice(0,70),contaminated:!!x.contaminated,
  requiredStorageK:finite(x.requiredStorageK)?Math.max(100,Math.min(400,x.requiredStorageK)):null,
  custody:Array.isArray(x.custody)?x.custody.filter(y=>y?.atS>=0&&y?.from&&y?.to).slice(0,50):[],
  observationId:String(x.observationId||'').slice(0,160)};
}
function inventory(item){
 if(!item||item.kind!=='storage')throw Error('Select an existing physical sample-storage module');
 if(!item.t10||item.t10.schema!==SCHEMA)item.t10={schema:SCHEMA,samples:[],receipts:[]};
 const o=item.t10;
 if(!Array.isArray(o.samples))o.samples=[];
 if(!Array.isArray(o.receipts))o.receipts=[];
 return o;
}
function capacity(item){
 const rows=inventory(item).samples,massKg=rows.reduce((n,x)=>n+x.massKg,0);
 return{count:rows.length,maxCount:STORAGE_COUNT,massKg,maxMassKg:STORAGE_MASS_KG,
  slotsRemaining:STORAGE_COUNT-rows.length,massRemainingKg:STORAGE_MASS_KG-massKg};
}
function authorized(item,source,body,context,powered){
 if(item?.kind!=='storage'||source?.bodyId!==item.bodyId||item.bodyId!==body?.id)
  throw Error('No physical sample teleportation: source, storage and player must be on one world');
 if(!context?.landed||context.bodyId!==item.bodyId||!context.eva||!Array.isArray(context.local))
  throw Error('Sample transfer requires an EVA operator standing at the physical storage module');
 if(!powered)throw Error('Storage refrigerator/data port offline; connect existing T02 48V bus');
 const angle=Math.acos(Math.max(-1,Math.min(1,V.dot(context.local,item.local))));
 if(angle*body.radius>18)throw Error('Physical sample transfer outside 18 scene-unit handling range');
 if(source.local){const srcArc=Math.acos(Math.max(-1,Math.min(1,V.dot(source.local,item.local))))*body.radius;
  if(srcArc>18)throw Error('Sample source is not docked within 18 scene units of the storage port');}
 return true;
}
function transfer(store,item,sample,source,body,context,powered,at){
 const s=cleanSample(sample);
 if(!finite(at)||at<s.extractedAtS)throw Error('Sample transfer time precedes extraction');
 authorized(item,source,body,context,powered);
 if(s.bodyId!==item.bodyId||s.sourceId!==source.id)throw Error('Source ID/body mismatch: physical samples cannot be teleported between rovers');
 const inv=inventory(item);
 const duplicate=store.items.some(i=>i.kind==='storage'&&inventory(i).samples.some(x=>x.id===s.id));
 if(duplicate)throw Error('Sample ID already physically stored in another slot; duplication blocked');
 const c=capacity(item);
 if(c.count>=c.maxCount||c.massKg+s.massKg>c.maxMassKg)
  throw Error('Physical sample storage full: export manifest, physically retrieve specimens, or build another powered storage module');
 if(!Array.isArray(source.sampleInventory)||!source.sampleInventory.some(x=>x.id===s.id))
  throw Error('Physical source inventory does not contain this unique specimen');
 // Mutate exactly one authoritative source and destination in one JS tick.
 const index=source.sampleInventory.findIndex(x=>x.id===s.id);
 source.sampleInventory.splice(index,1);
 s.custody.push({atS:at,from:source.id,to:item.id,method:'EVA physical handoff',operator:'player'});
 inv.samples.push(s);
 inv.receipts.push({id:'custody-'+s.id+'-'+item.id,from:source.id,to:item.id,atS:at});
 return clone(s);
}
function analyze(store,lab,observation,at,powered){
 if(lab?.kind!=='lab'||!store.items.some(x=>x.id===lab.id)||!observation?.id||!observation.instrument)
  throw Error('Real laboratory, existing journal observation and source ID are required');
 if(!powered)throw Error('Laboratory 950 W electric circuit OFFLINE: work PAUSED');
 if(!finite(at)||at<observation.receivedAtS)throw Error('Observation must first be received and acknowledged');
 // Numeric data legitimately ACKed by T03 are information, not physical
 // specimens: a lab on world A may analyze received world B readings.
 // Physical sample transfer is separately constrained by authorized().
 if(!lab.t10||lab.t10.schema!==SCHEMA)lab.t10={schema:SCHEMA,analysis:[],jobs:[],mode:'STANDBY'};
 const state=lab.t10;state.analysis=Array.isArray(state.analysis)?state.analysis:[];
 if(state.analysis.some(x=>x.observationId===observation.id))return clone(state.analysis.find(x=>x.observationId===observation.id));
 if(state.analysis.length>=LAB_RECORDS)throw Error('Lab processing archive full; export and explicitly archive before new analysis');
 const record={id:'analysis-'+lab.id+'-'+observation.id,labId:lab.id,observationId:observation.id,
  instrument:observation.instrument,sourceBodyId:observation.bodyId,sourceId:observation.sourceId||observation.probeId||observation.satelliteId||'journal',
  startedAtS:at,readyAtS:at+20,status:'RUNNING',uncertainty:observation.uncertainty??null,
  result:'Pending modeled assay; this is NOT certified mineralogy or independent ground truth'};
 state.analysis.push(record);state.mode='RUNNING';return clone(record);
}
function advanceLab(lab,now,powered){
 const s=lab?.t10;if(!s||!Array.isArray(s.analysis))return null;
 let work=0;
 for(const x of s.analysis){
  if(x.status!=='RUNNING'&&x.status!=='PAUSED')continue;
  if(!powered){x.status='PAUSED';x.reason='NO_POWER';continue;}
  if(x.status==='PAUSED'){x.status='RUNNING';x.readyAtS=now+20;}
  if(now>=x.readyAtS){
   x.status='COMPLETE';x.completedAtS=now;x.result='Model-derived evidence interpretation. Retain original sensor value, uncertainty, location, calibration and provenance; no independent composition claim.';
   work++;
  }
 }
 s.mode=powered?(s.analysis.some(x=>x.status==='RUNNING')?'RUNNING':'STANDBY'):'PAUSED';
 return{mode:s.mode,completed:work};
}
const API={SCHEMA,STORAGE_COUNT,STORAGE_MASS_KG,LAB_RECORDS,cleanSample,inventory,capacity,authorized,transfer,analyze,advanceLab};
root.StarfallScienceCustodyT10=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
