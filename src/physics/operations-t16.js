/* STARFALL T16 — read-only operational truth adapter.
 * The T03 packet, T07 satellite, T06 rover, 7F camera and T02/Outpost
 * electrical stores remain authoritative. This adapter creates no new jobs,
 * fake successful commands, mission timestamps, coordinates or charge.
 */
(function(root){'use strict';
const finite=Number.isFinite,number=n=>finite(n)?n:null;
const clean=s=>String(s??'').slice(0,240);
const time=t=>finite(t)&&t>=0?'T+'+t.toFixed(1)+' s':'NOT RECORDED';
const stage=Object.freeze({READY:'READY',IN_PROGRESS:'COMMAND SENT / IN PROGRESS',COMPLETE:'ACTUAL COMPLETION / RESULT',FAILED:'RECOVERABLE FAILURE'});
const SUCCESS=new Set(['ACKED','DONE','COMPLETE','completed','complete','downlinked','landed']);
const FAILED=new Set(['FAILED','EXPIRED','FAULT','CRASHED','crashed','failed']);
function packetState(p){
 if(!p)return{stage:'READY',label:'NO COMMAND RECEIPT',reason:'A command has not been transmitted or acknowledged.',recovery:'Select a real device and use its original controls.'};
 const st=clean(p.state);
 const good=st==='ACKED',failed=FAILED.has(st);
 return{stage:good?'COMPLETE':failed?'FAILED':'IN_PROGRESS',
  label:st+(good?' · RECEIVER ACK':p.ack==='PENDING'?' · ACK PENDING':''),
  reason:p.reason||(!p.lastLink?'No measured route/quality yet':'Sender has not received durable ACK'),
  recovery:failed?'Review original packet reason, receiver power/storage and reissue only if safe':
   st==='WAITING_FOR_ROUTE'||st==='OFFLINE'?'Check source/receiver power, line of sight, station configuration and next physical contact':
   good?'Observation/command has a real T03 receipt.':'Wait for finite transmission and ACK; avoid retransmitting an unconfirmed action',
  route:Array.isArray(p.route)&&p.route.length?p.route.join(' → '):null,
  delayS:number(p.lastLink?.delayS),bandwidthBps:number(p.lastLink?.bandwidthBps),
  quality:number(p.lastLink?.quality),sentBytes:number(p.sendBytes),totalBytes:number(p.encodedBytes),
  createdS:number(p.createdS),receivedS:good?number(p.ackAtS):null,
  expectedArrivalS:good?null:number(p.arrivalS),retryEligibleS:good?null:number(p.eligibleS),id:p.id};
}
function photoState(p,job=null){
 if(!p&&!job)return{stage:'READY',label:'NO IMAGE REQUEST',reason:'No original camera job or photo selected.',recovery:'Select an installed imager and submit the original camera request.'};
 if(job&&!p)return{stage:'IN_PROGRESS',label:job.renderState||'CAMERA COMMAND QUEUED',
  reason:job.renderReason||(!finite(job.deliveredS)?'Command not yet delivered by radio':'Waiting for an actual capture in renderer'),
  recovery:'Keep source powered and wait for radio/renderer availability; a queued job is not a received image',
  createdS:number(job.createdS),receivedS:null,sourceId:job.assetId};
 const ok=p.status==='downlinked'&&finite(p.receivedAtS),failed=p.status==='failed';
 return{stage:ok?'COMPLETE':failed?'FAILED':'IN_PROGRESS',label:ok?'PHOTO RECEIVED / DOWNLOADABLE':p.status?.toUpperCase()||'UNKNOWN',
  reason:ok?'Original image metadata ACKed; bytes still require browser IndexedDB':p.lastError||
  (p.status==='stored-local'?'Real image stored onboard; queue physical downlink':
   p.status==='in-transit'?'Image data sent; receiver receipt/ACK not yet durable':
   'No receiver ACK. Battery, LOS, bandwidth, or onboard storage may block delivery'),
  recovery:ok?'Open original 7F gallery and verify image bytes; metadata alone is not a photo':
   failed?'Inspect actual renderer/source error before resubmitting': 'Open Mission Photos; check source power, route, queue and image storage',
  createdS:number(p.timeS),receivedS:number(p.receivedAtS),sentBytes:number(p.progressBytes),
  totalBytes:number(p.bytes),sourceId:p.sourceAssetId,photoId:p.id};
}
function status({id,kind,bodyId,systemId,parentId=null,energyJ=null,capacityJ=null,powered=null,health=null,temperatureK=null,
 supplyW=null,loadW=null,storageUsed=null,storageMax=null,pendingFiles=0,packet=null,photo=null,job=null,
 localTimeS=null,remoteTimeS=null,mode=null,limits=null,signal=null,fault=null,sourceModel=''}) {
 if(typeof id!=='string'||!id||!kind)throw Error('T16 refuses unknown asset identity');
 const r=packetState(packet),cam=photoState(photo,job);
 const e=number(energyJ),cap=number(capacityJ);
 const warnings=[],recommendations=[];
 if(fault){warnings.push(clean(fault));recommendations.push('Inspect the real equipment fault and original repair/stop controls.');}
 if(powered===false){warnings.push('Power bus offline / standby');recommendations.push('Check real solar/battery source, cable, enabled loads and eclipse.');}
 if(e!==null&&cap!==null&&cap>0&&e/cap<.05){warnings.push('Battery below 5%');recommendations.push('Use real solar generation or a physically compatible wired charge source.');}
 if(finite(temperatureK)&&temperatureK>=390){warnings.push('Modeled equipment temperature ≥390 K');recommendations.push('Stop high loads and allow the real thermal model to cool.');}
 if(storageUsed!==null&&storageMax!==null&&storageUsed>=storageMax){warnings.push('Device data storage full');recommendations.push('Wait for ACKed downlink, then export/archive through the original app.');}
 if(packet&&!['ACKED','RECEIVED'].includes(packet.state)&&!packet.lastLink){warnings.push('No confirmed packet route/ACK');recommendations.push(r.recovery);}
 if(photo&&cam.stage!=='COMPLETE')recommendations.push(cam.recovery);
 // A newly queued camera action must never look completed merely because an
 // older, unrelated packet was ACKed. Use acquisition/request time recorded
 // by each authoritative owner; never mint a synthetic event timestamp.
 const operations=[];
 if(packet)operations.push({at:finite(packet.createdS)?packet.createdS:0,stage:r.stage});
 if(photo||job)operations.push({at:Math.max(finite(photo?.timeS)?photo.timeS:0,
   finite(job?.createdS)?job.createdS:0),stage:cam.stage});
 operations.sort((a,b)=>b.at-a.at);
 const phase=FAILED.has(mode)||fault?'FAILED':operations[0]?.stage||(
  mode&&SUCCESS.has(mode)?'COMPLETE':'READY');
 const statusText=phase==='FAILED'?'FAULT':powered===false?'STANDBY':powered===true?'POWERED':'POWER UNCONFIRMED';
 return{schema:16,id,kind,bodyId:bodyId||null,systemId:systemId||null,parentId:parentId||null,stage:phase,
  statusText,energyJ:e,capacityJ:cap,powered,supplyW:number(supplyW),loadW:number(loadW),health:number(health),
  temperatureK:number(temperatureK),storageUsed:number(storageUsed),storageMax:number(storageMax),
  pendingFiles:finite(pendingFiles)?Math.max(0,pendingFiles):0,localTimeS:number(localTimeS),remoteTimeS:number(remoteTimeS),
  remoteLagS:finite(localTimeS)&&finite(remoteTimeS)?Math.max(0,localTimeS-remoteTimeS):null,
  mode:mode||null,signal:signal||null,packet:r,photo:cam,
  warnings:[...new Set(warnings)],recommendations:[...new Set(recommendations)].slice(0,5),
  limits:limits||'',sourceModel:sourceModel||'Original owner store; modeled fidelity'};
}
function packetFor(id,packets=[]){
 return (Array.isArray(packets)?packets:[]).filter(p=>p&&(p.sourceId===id||p.destId===id||p.route?.includes(id)))
  .sort((a,b)=>(b.createdS||0)-(a.createdS||0)).at(0)||null;
}
function events({packets=[],photos=[],jobs=[],services=[],missions=[],labReceipts=[],limit=80}={}){
 const list=[],push=(x)=>{if(x?.assetId&&finite(x.timeS))list.push(x);};
 for(const p of packets)if(p?.id)push({id:'packet:'+p.id,assetId:p.destId||p.sourceId,missionId:p.ref?.missionId||null,
  severity:FAILED.has(p.state)?'error':p.state==='WAITING_FOR_ROUTE'||p.state==='OFFLINE'?'warning':'info',
  stage:packetState(p).stage,timeS:p.lastS??p.createdS,description:p.type+' '+p.state,
  detail:p.reason||'No recorded reason',source:'T03',refId:p.id});
 for(const p of photos)if(p?.id)push({id:'photo:'+p.id,assetId:p.sourceAssetId,
  missionId:p.missionId||null,severity:p.status==='failed'?'error':p.status==='downlinked'?'info':'warning',
  stage:photoState(p).stage,timeS:p.receivedAtS??p.timeS,
  description:'7F PHOTO '+p.status,detail:p.lastError||'Original image owner metadata',
  source:'7F',refId:p.id});
 for(const j of jobs)if(j?.id)push({id:'camera-job:'+j.id,assetId:j.assetId,
  severity:j.renderState==='AWAITING_RENDER'?'warning':'info',stage:'IN_PROGRESS',
  timeS:j.lastRenderAttemptS??j.createdS,description:'CAMERA '+(j.renderState||'QUEUED'),
  detail:j.renderReason||'Awaiting original camera implementation',source:'7F',refId:j.id});
 for(const s of services)if(s?.id)push({id:s.id,assetId:s.assetId,severity:'info',stage:'COMPLETE',
  timeS:s.timeS,description:s.action,detail:s.source?.type||'Installed hardware event',source:'T15',refId:s.id});
 for(const m of missions)if(m?.id)push({id:'mission:'+m.id,assetId:m.detail?.assetId||m.assetId,
  missionId:m.id,severity:m.status==='FAULT'?'error':'info',stage:m.status==='FAULT'?'FAILED':'IN_PROGRESS',
  timeS:m.timeS??m.atS,description:'MISSION '+(m.type||m.kind||'EVENT'),
  detail:m.status||'Recorded by original mission clock',source:'T01',refId:m.id});
 for(const a of labReceipts)if(a?.id)push({id:'lab:'+a.id,assetId:a.labId||a.assetId,
  severity:'info',stage:'COMPLETE',timeS:a.receivedAtS??a.timeS,
  description:'LAB RECEIPT',detail:a.observationId||a.photoId||'Original lab custody',source:'T10',refId:a.id});
 return list.sort((a,b)=>b.timeS-a.timeS||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(300,limit)));
}
function filterEvents(list,{assetId='all',severity='all',missionId='all'}={}){
 return list.filter(x=>(assetId==='all'||x.assetId===assetId)&&(severity==='all'||x.severity===severity)&&
  (missionId==='all'||x.missionId===missionId));
}
const API={stage,packetState,photoState,status,packetFor,events,filterEvents,time};
root.StarfallOperationsT16=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);