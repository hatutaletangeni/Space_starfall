/* STARFALL optional T19A RF diagnostics.
 * Original T02 owns all energy, T03 owns all packet ACKs, T04 owns the
 * physical antenna. A recorder is NOT an RF transmission or an SNR meter.
 * No invented packets, receiver availability or remotely commanded device.
 */
(function(root){'use strict';
const SCHEMA=19,MAX_SAMPLES=48,MIN_QUALITY=.08;
const finite=Number.isFinite,copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const validId=x=>typeof x==='string'&&x.length>0&&x.length<=160&&/^[\w:./-]+$/.test(x);
const safe=x=>String(x??'').slice(0,180);
function restore(raw){
 const history=raw&&raw.schema===SCHEMA&&Array.isArray(raw.samples)?raw.samples:[];
 // Reject unsupported or corrupt entries without silently modifying canonical
 // power/radio/planet ownership. Only optional diagnostic history is affected.
 const seen=new Set(),samples=[];
 for(const s of history){
  if(!s||!validId(s.sourceId)||!validId(s.targetId)||!finite(s.timeS)||s.timeS<0||
   typeof s.connected!=='boolean'||typeof s.id!=='string'||!validId(s.id)||seen.has(s.id))continue;
  seen.add(s.id);
  samples.push({id:s.id,sourceId:s.sourceId,targetId:s.targetId,timeS:s.timeS,
   connected:s.connected,reason:safe(s.reason),bodyId:validId(s.bodyId)?s.bodyId:null,
   watts:finite(s.watts)&&s.watts>=0?s.watts:null,
   supplyV:finite(s.supplyV)&&s.supplyV>=0?s.supplyV:null,
   quality:finite(s.quality)?clamp(s.quality,0,1):null,
   bitrate:finite(s.bitrate)&&s.bitrate>=0?s.bitrate:null,
   delayS:finite(s.delayS)&&s.delayS>=0?s.delayS:null,
   hops:Array.isArray(s.hops)?s.hops.filter(validId).slice(0,6):[],
   ackId:validId(s.ackId)?s.ackId:null,
   ackAtS:finite(s.ackAtS)&&s.ackAtS>=0?s.ackAtS:null});
 }
 return{schema:SCHEMA,samples};
}
function snapshot({sourceId,targetId,bodyId,timeS,station,report,route,packet}={}){
 if(!validId(sourceId)||!validId(targetId)||sourceId===targetId||
  !validId(bodyId)||!finite(timeS)||timeS<0)throw Error('T19 actual source, distinct receiver, planet and simulation time required');
 const powered=station?.powered===true&&report?.power===true;
 const connected=powered&&route?.connected===true;
 const reason=!powered?'SOURCE_DC_BUS_OFFLINE / CHECK SOLAR, BATTERY, CABLE AND RADIO MODE':
  !route?.connected?safe(route?.reason||'NO_PHYSICAL_ROUTE / CHECK POWER, LOS, TARGET AND T08 COMMISSIONING'):
  'SOURCE-OWNED ROUTE AVAILABLE; NO TEST PACKET TRANSMITTED';
 return{sourceId,targetId,bodyId,timeS,connected,reason,
  watts:finite(report?.servedW)?Math.max(0,report.servedW):null,
  supplyV:finite(report?.voltageV)?Math.max(0,report.voltageV):null,
  quality:connected&&finite(route?.quality)?clamp(route.quality,0,1):null,
  bitrate:connected&&finite(route?.bandwidthBps)?Math.max(0,route.bandwidthBps):null,
  delayS:connected&&finite(route?.delayS)?Math.max(0,route.delayS):null,
  hops:connected&&Array.isArray(route.hops)?route.hops.filter(validId).slice(0,6):[],
  ackId:packet?.state==='ACKED'&&packet?.destId===targetId&&packet?.sourceId===sourceId&&validId(packet.id)?packet.id:null,
  ackAtS:packet?.state==='ACKED'&&packet?.destId===targetId&&packet?.sourceId===sourceId&&finite(packet.ackAtS)?packet.ackAtS:null};
}
function record(item,data){
 if(item?.kind!=='antenna')throw Error('T19 hardware owner must be an installed Outpost antenna');
 if(item.id!==data?.sourceId||item.bodyId!==data?.bodyId)throw Error('T19 refuses mismatched antenna and planet');
 const config=item.radioT04;
 if(!config||config.schema!==1)throw Error('T19 original T04 radio config is missing');
 const old=restore(config.budgetT19);
 if(old.samples.length>=MAX_SAMPLES)throw Error('T19 trace full (48 samples): EXPORT first, then CLEAR with explicit confirmation');
 const previous=old.samples.at(-1),time=data.timeS;
 if(!finite(time)||time<0||(previous&&time<previous.timeS))
  throw Error('T19 nonmonotonic mission time; no trace written');
 const packetId=data.ackId;
 const sample={...data,id:'rf-t19-'+item.id+'-'+String(previous?old.samples.length+1:1)+'-'+Math.round(time*1000)};
 if(!validId(sample.id)){
  sample.id='rf-t19-'+old.samples.length+'-'+Math.floor(time).toString(36);
 }
 if(!validId(sample.id)||old.samples.some(x=>x.id===sample.id))throw Error('T19 sample ID collision; no trace written');
 const next={schema:SCHEMA,samples:[...old.samples,copy(sample)]};
 // One source owner / no second energy or radio ledger.
 item.radioT04={...config,budgetT19:next};
 return copy(sample);
}
function clear(item){
 if(item?.kind!=='antenna'||item.radioT04?.schema!==1)throw Error('T19 original antenna unavailable');
 const previous=restore(item.radioT04.budgetT19);
 item.radioT04={...item.radioT04,budgetT19:{schema:SCHEMA,samples:[]}};
 return previous.samples.length;
}
function qualityMarginDb(q){
 return finite(q)&&q>0?20*Math.log10(q/MIN_QUALITY):null;
}
function estimateThermalNoiseDbm(bandwidthHz,tempK=290,noiseFigureDb=6){
 if(!finite(bandwidthHz)||bandwidthHz<=0||!finite(tempK)||tempK<=0||!finite(noiseFigureDb))
  return null;
 return -173.83+10*Math.log10(bandwidthHz)+10*Math.log10(tempK/290)+noiseFigureDb;
}
const API={SCHEMA,MAX_SAMPLES,MIN_QUALITY,restore,snapshot,record,clear,qualityMarginDb,estimateThermalNoiseDbm};
root.StarfallRFAnalyzerT19=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);