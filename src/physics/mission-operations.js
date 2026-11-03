/* STARFALL T01 — bounded, persistent, deterministic operational event clock.
 * Source stores own all physical state; this clock only owns cursors, event receipts
 * and future operational jobs. No camera pixels, fake satellites or extra power.
 */
(function(root){'use strict';
const SCHEMA=1,STEP_S=5,MAX_STEPS=12,MAX_BACKLOG_S=86400,MAX_JOBS=96,MAX_EVENTS=160,MAX_RECEIPTS=4000;
const TYPES=Object.freeze(['ASSET_EVENT','POWER_STATE_CHANGED','DATA_JOB_PROGRESSED','COMMAND_DELIVERED','OBSERVATION_RECEIVED','PHOTO_RECEIVED','FAULT']);
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const cleanId=x=>typeof x==='string'&&/^[A-Za-z0-9_:.-]{1,130}$/.test(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const bounded=(v,max)=>Array.isArray(v)?v.slice(-max):[];
function compare(a,b){return a.atS-b.atS||a.priority-b.priority||a.id.localeCompare(b.id);}
class Clock{
 constructor(seed,startS,saved=null){
  if(!Number.isSafeInteger(seed)||seed<0||!valid(startS))throw Error('T01 invalid seed or start time');
  this.seed=seed;this.lastSimulatedS=startS;this.jobs=[];this.events=[];this.receipts=[];this.fault=null;
  this.handler=null;this.stepsExecuted=0;
  if(saved&&saved.schema===SCHEMA&&saved.seed===seed&&valid(saved.lastSimulatedS)&&saved.lastSimulatedS<=startS+1e-7){
   if(valid(saved.lastSimulatedS)&&saved.lastSimulatedS<=startS){this.lastSimulatedS=saved.lastSimulatedS;}
   this.events=(Array.isArray(saved.events)?saved.events:[]).filter(e=>cleanId(e?.id)&&TYPES.includes(e.type)&&valid(e.atS));
   this.receipts=(Array.isArray(saved.receipts)?saved.receipts:[]).filter(cleanId);
   const used=new Set();this.jobs=(Array.isArray(saved.jobs)?saved.jobs:[]).filter(j=>{
    if(!cleanId(j?.id)||used.has(j.id)||!cleanId(j.assetId)||!cleanId(j.kind)||!valid(j.createdAtS)||!valid(j.eligibleAtS)||!valid(j.lastIntegratedS))return false;
    used.add(j.id);return ['QUEUED','WAITING','PAUSED','AWAITING_REVIEW','DONE','FAULT'].includes(j.status);
   }).map(clone);
   this.fault=saved.fault&&cleanId(saved.fault.id)?clone(saved.fault):null;
  }
 }
 setHandler(fn){if(typeof fn!=='function')throw Error('Operations handler must be a function');this.handler=fn;}
 record(type,id,atS,detail={}){
  if(!TYPES.includes(type)||!cleanId(id)||!valid(atS))throw Error('Invalid T01 event');
  if(this.receipts.includes(id))return false;
  // No silent eviction: an explicit archive/export must free older receipts.
  if(this.events.length>=MAX_EVENTS||this.receipts.length>=MAX_RECEIPTS)throw Error('Mission receipt ledger full: export and explicitly archive completed events');
  this.receipts.push(id);this.events.push({id,type,atS,detail:clone(detail)});
  return true;
 }
 queue({id,assetId,kind,createdAtS,eligibleAtS=createdAtS,expiresAtS=null,priority=5,workUnits=0}){
  if(!cleanId(id)||!cleanId(assetId)||!cleanId(kind)||!valid(createdAtS)||!valid(eligibleAtS)||eligibleAtS<createdAtS||!(expiresAtS===null||valid(expiresAtS)&&expiresAtS>=eligibleAtS)||!Number.isInteger(priority)||priority<0||priority>9||!valid(workUnits))throw Error('Invalid durable mission job');
  if(this.jobs.some(j=>j.id===id))return this.jobs.find(j=>j.id===id);
  if(this.jobs.length>=MAX_JOBS)throw Error('Mission operation job ledger full; export/archive completed jobs');
  const job={id,assetId,kind,createdAtS,eligibleAtS,expiresAtS,priority,workUnits,remainingUnits:workUnits,lastIntegratedS:createdAtS,retries:0,nextAttemptS:eligibleAtS,status:'QUEUED',reason:''};
  this.jobs.push(job);return clone(job);
 }
 advanceTo(targetS){
  if(!valid(targetS))throw Error('Invalid operational simulation timestamp');
  if(targetS<this.lastSimulatedS-1e-7)return{status:'CLOCK_REWOUND',lastSimulatedS:this.lastSimulatedS,remainingS:0,steps:0};
  if(targetS-this.lastSimulatedS>MAX_BACKLOG_S){
   if(!this.fault||this.fault.targetS!==targetS)this.fault={id:'backlog-'+this.seed,reason:'Simulation jump exceeds validated 24h operational integration horizon; no assets advanced',targetS};
   return{status:'AWAITING_REVIEW',lastSimulatedS:this.lastSimulatedS,remainingS:targetS-this.lastSimulatedS,steps:0};
  }
  if(this.fault&&this.fault.reason.startsWith('Simulation jump'))this.fault=null;
  let steps=0;
  // Fixed absolute boundaries ensure small-step, time-warp and restart replay use
  // identical time intervals regardless of the cadence of animation frames.
  while(steps<MAX_STEPS){
   const next=(Math.floor((this.lastSimulatedS+1e-7)/STEP_S)+1)*STEP_S;
   if(next>targetS+1e-8)break;
   const start=this.lastSimulatedS;const seconds=next-start;
   // Never write a new cursor if an authoritative model failed to advance.
   const previousEvents=this.events.slice(),previousReceipts=this.receipts.slice();
   try{if(this.handler)this.handler(start,next,seconds);}catch(e){
    this.events=previousEvents;this.receipts=previousReceipts;
    this.fault={id:'fault-'+this.seed+'-'+Math.floor(next/STEP_S),reason:String(e.message||e).slice(0,180),targetS:next};
    try{this.record('FAULT',this.fault.id,start,{reason:this.fault.reason});}catch(_){/* Fault remains visible when receipt archive is full. */}
    return{status:'FAULT',lastSimulatedS:this.lastSimulatedS,remainingS:targetS-this.lastSimulatedS,steps};
   }
   this.lastSimulatedS=next;steps++;this.stepsExecuted++;
   const due=this.jobs.filter(j=>['QUEUED','WAITING','PAUSED'].includes(j.status)&&j.eligibleAtS<=next&&j.nextAttemptS<=next).sort((a,b)=>compare({atS:a.eligibleAtS,...a},{atS:b.eligibleAtS,...b}));
   for(const j of due){
    if(j.expiresAtS!==null&&next>j.expiresAtS){j.status='FAULT';j.reason='Expired before capable handler was available';continue;}
    // T01 cannot manufacture completion of photos or packets. A later T03/T05
    // registered owner must consume real units and commit actual source records.
    j.lastIntegratedS=next;j.status='WAITING';j.reason='Awaiting registered physical operation handler';
   }
  }
  return{status:targetS-this.lastSimulatedS>=STEP_S?'CATCHING_UP':'CURRENT',lastSimulatedS:this.lastSimulatedS,remainingS:Math.max(0,targetS-this.lastSimulatedS),steps};
 }
 acknowledgeBacklog(){if(!this.fault) return false;this.fault=null;return true;}
 archiveEvents(){const archive=clone({schema:SCHEMA,seed:this.seed,throughS:this.lastSimulatedS,events:this.events,receipts:this.receipts});this.events=[];this.receipts=[];return archive;}
 archiveCompletedJobs(){const done=this.jobs.filter(j=>['DONE','FAULT'].includes(j.status));this.jobs=this.jobs.filter(j=>!['DONE','FAULT'].includes(j.status));return clone(done);}
 getAssetStatus(id,owner=null){
  if(!cleanId(id))return null;
  const jobs=this.jobs.filter(j=>j.assetId===id).map(clone);
  const data=owner&&typeof owner==='function'?owner(id):null;
  return clone({id,clockS:this.lastSimulatedS,clockFault:this.fault,owner:data||null,jobs,lastEvent:this.events.filter(e=>e.detail?.assetId===id).slice(-1)[0]||null});
 }
 serialize(){return clone({schema:SCHEMA,seed:this.seed,lastSimulatedS:this.lastSimulatedS,jobs:this.jobs,events:this.events,receipts:this.receipts,fault:this.fault});}
}
const API={SCHEMA,STEP_S,MAX_STEPS,MAX_BACKLOG_S,MAX_RECEIPTS,TYPES,Clock};
root.StarfallMissionOperations=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
