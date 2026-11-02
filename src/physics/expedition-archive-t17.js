/* STARFALL T17 — deterministic, bounded, offline expedition archive.
 * Does NOT mutate stores or import media. UI performs transactions and rollback.
 * Checksum protects against accidental corruption (FNV-1a, NOT authentication).
 */
(function(root){'use strict';
const FORMAT='STARFALL_EXPEDITION_BACKUP',SCHEMA=17,MAX_JSON_BYTES=32*1048576,MAX_MEDIA_BYTES=128*1048576;
const valid=x=>Number.isFinite(x)&&x>=0,object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_.:/-]{1,180}$/.test(x);
const dir=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)&&Math.abs(Math.hypot(...a)-1)<.04;
const path=(name,condition)=>{if(!condition)throw Error('T17 invalid archive: '+name);};
function hash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return(h>>>0).toString(16).padStart(8,'0');}
function uniqueRows(rows,field,label,cap=100000){
 if(rows===undefined)return;
 path(label+' must be an array',Array.isArray(rows)&&rows.length<=cap);
 const seen=new Set();
 for(const row of rows){path(label+' entry identity',object(row)&&id(row[field])&&!seen.has(row[field]));seen.add(row[field]);}
}
function validateState(s,seed){
 path('state must be an object',object(s));
 path('unsupported original save version',s.version===undefined||s.version===1||s.version===2);
 if(s.credits!==undefined)path('negative/nonfinite credits',valid(s.credits));
 for(const k of ['launch7','outpost5','missionOps','commsT03','engineering7A']){
  const v=s[k];if(!v)continue;
  path(k+' must use known original schema',object(v)&&v.schema===1);
  path(k+' wrong galaxy seed',v.seed===seed);
 }
 const kinds=[
  ['outpost5','items'],['outpost5','relays'],['launch7','launches'],['launch7','satellites'],['launch7','rovers'],
  ['imaging7f','photos'],['imaging7f','jobs'],['research7e','plans'],['research7e','runs'],['research7e','blueprints'],
  ['missionOps','jobs'],['missionOps','events'],['commsT03','packets']];
 for(const [key,field] of kinds){
  const value=s[key];if(!value)continue;
  path(key+' schema',object(value)&&value.schema===1);
  uniqueRows(value[field],'id',key+'.'+field);
 }
 const outpost=s.outpost5;
 if(outpost){
  const all=new Set((outpost.items||[]).map(x=>x.id));
  for(const item of outpost.items||[]){path('outpost world and coordinate',id(item.bodyId)&&dir(item.local));
   path('outpost charge (J) is finite',item.energyJ===undefined||valid(item.energyJ));
  }
  path('outpost wire list',outpost.wires===undefined||Array.isArray(outpost.wires)&&outpost.wires.length<=100000);
  for(const w of outpost.wires||[])path('dangling or self-loop electrical wire',
   object(w)&&all.has(w.a)&&all.has(w.b)&&w.a!==w.b);
  for(const r of outpost.receipts||[])path('laboratory receipt identity',id(r.labId)&&id(r.observationId));
 }
 const launch=s.launch7;
 if(launch)for(const r of launch.rovers||[]){
  path('rover body-fixed position',id(r.bodyId)&&dir(r.local));
  path('rover battery (J)',r.batteryJ===undefined||valid(r.batteryJ));
  uniqueRows(r.records,'id','rover '+r.id+' source observations');
 }
 if(s.research7e){
  const res=s.research7e;
  path('7E research schema',res.schema===1);
  const plans=new Set((res.plans||[]).map(x=>x.id)),runs=new Set((res.runs||[]).map(x=>x.id));
  for(const r of res.runs||[])path('7E original run source plan',plans.has(r.planId));
  for(const b of res.blueprints||[]){
   if(b.imported===true)continue; // Legacy imported blueprint may legitimately refer to an unavailable external run.
   path('7E blueprint original run',runs.has(b.sourceRunId));
  }
 }
 const media=s.imaging7f;
 if(media){
  path('7F metadata schema',media.schema===1);
  for(const p of media.photos||[]){
   path('camera asset/body ID',id(p.sourceAssetId)&&id(p.bodyId));
   path('camera recorded bytes and geometry',valid(p.bytes)&&p.bytes>=200&&p.bytes<=2500000&&
     Number.isSafeInteger(p.width)&&p.width>0&&Number.isSafeInteger(p.height)&&p.height>0);
   path('camera source timestamp',valid(p.timeS));
   if(p.captureLocal!==undefined&&p.captureLocal!==null)path('camera body-fixed coordinate',dir(p.captureLocal));
  }
 }
 const ops=s.missionOps;if(ops){
  path('operation clock finite',valid(ops.lastSimulatedS));
  for(const x of ops.jobs||[])path('operation timestamp',id(x.assetId)&&valid(x.createdAtS)&&valid(x.eligibleAtS));
 }
 const comms=s.commsT03;if(comms){
  path('radio cursor finite',valid(comms.cursorS));
  uniqueRows(comms.packets,'id','packet IDs');
  for(const p of comms.packets||[]){
   path('T03 packet time/byte custody',id(p.sourceId)&&id(p.destId)&&id(p.bodyId)&&
    valid(p.createdS)&&valid(p.sendBytes)&&valid(p.recvBytes)&&valid(p.encodedBytes)&&
    p.sendBytes<=p.encodedBytes&&p.recvBytes<=p.encodedBytes);
  }
 }
 if(s.equipmentT15){path('T15 service schema',s.equipmentT15.schema===15);
  uniqueRows(s.equipmentT15.events,'id','service event IDs');
 }
 if(s.flightGalaxy?.seed!==undefined)path('flight snapshot wrong galaxy seed',s.flightGalaxy.seed===seed);
 return {launches:launch?.launches?.length||0,rovers:launch?.rovers?.length||0,satellites:launch?.satellites?.length||0,
  outposts:outpost?.items?.length||0,photos:media?.photos?.length||0,blueprints:s.research7e?.blueprints?.length||0,
  packets:comms?.packets?.length||0,receipts:comms?.receipts?.length||0};
}
function checkMediaEntry(entry,meta){
 path('photo metadata must exist',object(entry)&&object(meta)&&entry.id===meta.id);
 path('media payload format',typeof entry.image==='string'&&typeof entry.thumbnail==='string'&&
 /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(entry.image)&&
 /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(entry.thumbnail));
 path('media mime type',entry.image.startsWith('data:'+meta.mime+';'));
 path('media bytes',entry.image.length<3400000&&entry.thumbnail.length<500000);
 path('camera binary length',Math.abs(Math.floor(entry.image.split(',')[1].length*3/4)-meta.bytes)<=6);
 path('media image checksum',entry.imageHash===hash(entry.image)&&entry.thumbnailHash===hash(entry.thumbnail));
}
function create({state,galaxySeed,media=[],includeMedia=false}){
 path('galaxy seed required',Number.isSafeInteger(galaxySeed)&&galaxySeed>=0);
 const summary=validateState(state,galaxySeed),refs=state.imaging7f?.photos||[];
 if(includeMedia){
  path('full archive must contain all original photo files',Array.isArray(media)&&media.length===refs.length);
  const indexed=new Map(media.map(x=>[x.id,x]));
  path('duplicate photo media identity',indexed.size===refs.length);
  for(const ref of refs)checkMediaEntry(indexed.get(ref.id),ref);
 }
 const payload={format:FORMAT,schema:SCHEMA,galaxySeed,scope:includeMedia?'FULL_MEDIA':'STATE_ONLY',
  state,media:includeMedia?media:[],summary};
 const json=JSON.stringify(payload);
 path('archive too large',json.length<MAX_JSON_BYTES+(includeMedia?MAX_MEDIA_BYTES:0));
 return {...payload,integrity:{algorithm:'fnv1a32-utf16-v1',bytes:json.length,checksum:hash(json)}};
}
function validate(archive,expectedSeed){
 path('archive format/schema',object(archive)&&archive.format===FORMAT&&archive.schema===SCHEMA);
 path('wrong galaxy seed',archive.galaxySeed===expectedSeed);
 path('unsupported backup scope',archive.scope==='FULL_MEDIA'||archive.scope==='STATE_ONLY');
 path('backup integrity footer',object(archive.integrity)&&archive.integrity.algorithm==='fnv1a32-utf16-v1');
 const {integrity,...payload}=archive,json=JSON.stringify(payload);
 path('archive size exceeded',json.length<=MAX_JSON_BYTES+(archive.scope==='FULL_MEDIA'?MAX_MEDIA_BYTES:0));
 path('backup checksum mismatch',integrity.bytes===json.length&&integrity.checksum===hash(json));
 const summary=validateState(archive.state,expectedSeed);
 path('archive summary mismatch',JSON.stringify(archive.summary)===JSON.stringify(summary));
 if(archive.scope==='FULL_MEDIA'){
  path('media collection',Array.isArray(archive.media)&&archive.media.length===(archive.state.imaging7f?.photos||[]).length);
  const refs=new Map((archive.state.imaging7f?.photos||[]).map(p=>[p.id,p])),seen=new Set();
  for(const row of archive.media){path('media reference uniqueness',id(row?.id)&&!seen.has(row.id));seen.add(row.id);checkMediaEntry(row,refs.get(row.id));}
 }else path('state-only archive cannot declare photo payloads',Array.isArray(archive.media)&&!archive.media.length);
 return summary;
}
const API={FORMAT,SCHEMA,MAX_JSON_BYTES,MAX_MEDIA_BYTES,hash,validateState,checkMediaEntry,create,validate};
root.StarfallArchiveT17=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);