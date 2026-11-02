/* STARFALL 7F: authenticated, bounded image telemetry metadata.
   Actual image bytes live in IndexedDB; SF only stores tiny versioned metadata.
   No fake images, no offscreen render in a per-frame loop. */
(function(root){'use strict';
const SCHEMA=1,MAX_ROVER=20,MAX_SATELLITE=40,MAX_TOTAL=120,MAX_BYTES=24*1024*1024,MAX_JOB=16;
const finite=v=>typeof v==='number'&&Number.isFinite(v),clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),copy=x=>JSON.parse(JSON.stringify(x));
const idOK=x=>typeof x==='string'&&/^[\w:.-]{1,130}$/.test(x);
function validateCapture(meta){
 if(!meta||!['rover','satellite'].includes(meta.sourceType))throw Error('Camera source must be rover or satellite');
 if(!idOK(meta.sourceAssetId)||!idOK(meta.bodyId)||!idOK(meta.systemId))throw Error('Invalid camera source coordinates');
 if(!['forward','left','right','panorama','target','nadir','oblique','wide'].includes(meta.mode))throw Error('Camera mode unavailable');
 if(![256,512,1024].includes(meta.resolution))throw Error('Unsupported resolution');
 if(!(finite(meta.timeS)&&meta.timeS>=0))throw Error('Invalid capture time');
 if(!Array.isArray(meta.position)||meta.position.length!==3||!meta.position.every(finite))throw Error('Camera location must have three finite coordinates');
 if(!finite(meta.bytes)||meta.bytes<200||meta.bytes>2_500_000)throw Error('Invalid photo size');
 return true;
}
function restore(raw){
 const out={schema:SCHEMA,serial:0,photos:[],jobs:[]};
 if(!raw||raw.schema!==SCHEMA)return out;
 out.serial=finite(raw.serial)?clamp(Math.floor(raw.serial),0,1e9):0;
 const used=new Set();for(const p of (Array.isArray(raw.photos)?raw.photos:[]).slice(-MAX_TOTAL)){
  if(!p||!idOK(p.id)||used.has(p.id))continue;
  try{validateCapture(p);}catch(_){continue;}
  if(!['stored-local','queued','transmitting','in-transit','downlinked','failed'].includes(p.status))continue;
  used.add(p.id);out.photos.push(copy({...p,sourceName:String(p.sourceName||p.sourceAssetId).slice(0,100),caption:String(p.caption||'').slice(0,120)}));
 }
 out.jobs=(Array.isArray(raw.jobs)?raw.jobs:[]).filter(x=>x&&idOK(x.id)&&idOK(x.assetId)&&['rover','satellite'].includes(x.sourceType)&&finite(x.createdS)&&x.createdS>=0&&!used.has(x.id)).slice(-MAX_JOB).map(copy);
 return out;
}
class Store{
 constructor(saved){this.state=restore(saved);}
 next(p){this.state.serial++;return p+'-'+this.state.serial.toString(36);}
 get photos(){return copy(this.state.photos);}
 get jobs(){return copy(this.state.jobs);}
 get(id){const x=this.state.photos.find(x=>x.id===id);return x?copy(x):null;}
 countFor(type,id){return this.state.photos.filter(x=>x.sourceType===type&&x.sourceAssetId===id).length;}
 usedBytes(){return this.state.photos.reduce((a,x)=>a+x.bytes,0);}
 request(sourceType,assetId,mode,resolution,timeS){
  if(!['rover','satellite'].includes(sourceType)||!idOK(assetId))throw Error('Invalid camera request');
  if(!['forward','left','right','panorama','target','nadir','oblique','wide'].includes(mode)||![256,512,1024].includes(resolution))throw Error('Unsupported camera mode or resolution');
  if(!(finite(timeS)&&timeS>=0))throw Error('Invalid mission time');
  if(this.state.jobs.length>=MAX_JOB)throw Error('Imaging command queue full');
  const job={id:this.next('photo-job'),assetId,sourceType,mode,resolution,createdS:timeS,deliveredS:null};
  this.state.jobs.push(job);return copy(job);
 }
 markDelivered(id,time){const j=this.state.jobs.find(x=>x.id===id);if(!j)throw Error('Capture command missing');j.deliveredS=time;return copy(j);}
 renderPending(id,reason,timeS){
  const j=this.state.jobs.find(x=>x.id===id);if(!j)throw Error('Camera job not found');
  j.renderState='AWAITING_RENDER';j.renderReason=String(reason||'Renderer unavailable').slice(0,220);
  j.lastRenderAttemptS=Number.isFinite(timeS)?timeS:j.createdS;return copy(j);
 }
 markRendering(id){
  const j=this.state.jobs.find(x=>x.id===id);if(!j)throw Error('Camera job not found');
  j.renderState='RENDERING';j.renderReason='';return copy(j);
 }
 finishJob(id){this.state.jobs=this.state.jobs.filter(x=>x.id!==id);}
 put(meta){
  validateCapture(meta);const limit=meta.sourceType==='rover'?MAX_ROVER:MAX_SATELLITE;
  if(this.state.photos.length>=MAX_TOTAL||this.countFor(meta.sourceType,meta.sourceAssetId)>=limit)throw Error('Camera storage count full; archive and delete old images');
  if(this.usedBytes()+meta.bytes>MAX_BYTES)throw Error('Camera storage full (24 MiB global cap); archive images');
  const p={id:this.next('photo'),schema:SCHEMA,status:'stored-local',progressBytes:0,receivedAtS:null,
   lastError:'',...copy(meta),observationRefs:Array.isArray(meta.observationRefs)?meta.observationRefs.filter(idOK).slice(0,12):[],
   sourceName:String(meta.sourceName||meta.sourceAssetId).slice(0,100),caption:String(meta.caption||'').slice(0,120)};
  this.state.photos.push(p);return copy(p);
 }
 queueDownlink(id){const p=this.state.photos.find(x=>x.id===id);if(!p)throw Error('Photo not found');
  if(p.status==='downlinked')return copy(p);
  if(!['stored-local','failed','queued','transmitting'].includes(p.status))throw Error('Photo is already in transit');
  p.status='queued';p.lastError='';return copy(p);
 }
 tick(timeS,dt,links,draw){
  if(!finite(timeS)||!finite(dt)||dt<=0)return[];
  const changes=[],step=clamp(dt,0,15);
  for(const p of this.state.photos){
   if(p.status==='in-transit'){if(timeS>=(p.deliveryAtS||0)){p.status='downlinked';p.receivedAtS=timeS;changes.push({id:p.id,type:'received'});}continue;}
   if(!['queued','transmitting'].includes(p.status))continue;
   const link=links(p);if(!link?.connected||!(link.quality>0)){p.status='queued';continue;}
   const bits=p.sourceType==='satellite'?160000:48000,bandwidth=clamp(bits/8*link.quality,500,25000);
   const affordable=draw(p,step,bandwidth);if(!(affordable>=0)){p.status='queued';p.lastError='Transmitter battery low';continue;}
   const sent=Math.min(p.bytes-p.progressBytes,Math.floor(bandwidth*step),Math.floor(affordable));
   if(sent<=0)continue;
   p.progressBytes+=sent;
   if(p.progressBytes>=p.bytes){p.progressBytes=p.bytes;p.status='in-transit';p.deliveryAtS=timeS+Math.max(.001,Number(link.delayS)||.001);}
   else p.status='transmitting';
   changes.push({id:p.id,type:'progress',sent});
  }
  return changes;
 }
 applyTransportProgress(id,sentBytes,totalBytes,receivedAtS=null){
  const p=this.state.photos.find(x=>x.id===id);if(!p)throw Error('Photo owner has no matching image');
  if(!['queued','transmitting','in-transit','downlinked'].includes(p.status))throw Error('Photo not queued for radio downlink');
  const n=Math.max(0,Math.min(p.bytes,Math.floor(Number(sentBytes)||0)));
  p.progressBytes=Math.max(p.progressBytes,n);
  // Receipt requires durable ACK in T03. In-flight packets are never gallery-visible.
  if(receivedAtS!==null&&Number.isFinite(receivedAtS)){p.status='downlinked';p.progressBytes=p.bytes;p.receivedAtS=receivedAtS;}
  else p.status=p.progressBytes>=p.bytes?'in-transit':p.progressBytes>0?'transmitting':'queued';
  return copy(p);
 }
 annotate(id,note){const p=this.state.photos.find(x=>x.id===id);if(!p)throw Error('Photo not found');p.note=String(note||'').slice(0,400);return copy(p);}
 importPhoto(meta){
  validateCapture(meta);
  if(!idOK(meta.id)||meta.schema!==SCHEMA||!['stored-local','queued','transmitting','in-transit','downlinked','failed'].includes(meta.status))
   throw Error('Invalid imported camera record');
  if(this.state.photos.some(x=>x.id===meta.id))return false;
  if(this.state.photos.length>=MAX_TOTAL||this.countFor(meta.sourceType,meta.sourceAssetId)>=(meta.sourceType==='rover'?MAX_ROVER:MAX_SATELLITE))
   throw Error('Camera archive record limit reached');
  if(this.usedBytes()+meta.bytes>MAX_BYTES)throw Error('Camera archive full: export and remove existing media first');
  const safe=copy(meta);safe.restoredArchive=true;safe.caption=String(safe.caption||'').slice(0,120);
  safe.sourceName=String(safe.sourceName||safe.sourceAssetId).slice(0,100);
  safe.observationRefs=Array.isArray(safe.observationRefs)?safe.observationRefs.filter(idOK).slice(0,12):[];
  this.state.photos.push(safe);
  const suffix=/^photo-([0-9a-z]+)$/.exec(safe.id);
  if(suffix)this.state.serial=Math.max(this.state.serial,parseInt(suffix[1],36));
  return true;
 }
 remove(id){const idx=this.state.photos.findIndex(x=>x.id===id);if(idx<0)throw Error('Photo not found');const [p]=this.state.photos.splice(idx,1);return copy(p);}
 serialize(){return copy(this.state);}
}
const API={SCHEMA,MAX_ROVER,MAX_SATELLITE,MAX_TOTAL,MAX_BYTES,MAX_JOB,restore,validateCapture,Store};
root.StarfallImaging7F=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);