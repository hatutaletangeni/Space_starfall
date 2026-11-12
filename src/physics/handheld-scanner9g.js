/* STARFALL 9G — suit-handheld sensor model.
 * The scanner reuses original 4A/T14 readings and 4A science journal. The
 * battery is finite; only RT's real ship power transfer can refill it.
 * This state machine never creates natural resources or fictional evidence.
 */
(function(root){'use strict';
const CAPACITY_J=18000,MAX_LOG=36;
const MODES=Object.freeze([
 Object.freeze({key:'geology',instrument:'spectrometer',label:'GEO',purpose:'Local silicate content'}),
 Object.freeze({key:'life',instrument:'bioassay',label:'LIFE',purpose:'Local biosignature index'}),
 Object.freeze({key:'temperature',instrument:'thermometer',label:'TEMP',purpose:'Local temperature'}),
 Object.freeze({key:'atmosphere',instrument:'barometer',label:'AIR',purpose:'Local surface pressure'}),
 Object.freeze({key:'magnetic',instrument:'magnetometer',label:'MAG',purpose:'Local magnetic field'})
]);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function sanitize(saved){
 const s=saved&&typeof saved==='object'?saved:{};
 const valid=MODES.some(x=>x.key===s.mode)?s.mode:'geology';
 const history=Array.isArray(s.history)?s.history.filter(x=>x&&typeof x.id==='string'&&x.id.length<100&&
  typeof x.bodyId==='string'&&x.bodyId.length<180&&
  typeof x.instrument==='string'&&finite(x.value)&&finite(x.timeS)&&x.timeS>=0&&
  (x.target===null||x.target===undefined||typeof x.target==='string')).slice(-MAX_LOG):[];
 return{schema:1,batteryJ:finite(s.batteryJ)?clamp(s.batteryJ,0,CAPACITY_J):CAPACITY_J,
  mode:valid,history,completed:Math.max(0,Math.min(999999,Number.isInteger(s.completed)?s.completed:0))};
}
function nextMode(mode){const i=MODES.findIndex(x=>x.key===mode);return MODES[(i+1+MODES.length)%MODES.length];}
function mode(mode){return MODES.find(x=>x.key===mode)||MODES[0];}
function selectTarget(objects,position,forward,{maxRange=82,cosHalfAngle=.70}={}){
 if(!Array.isArray(objects)||!Array.isArray(position)||!Array.isArray(forward)||
   position.length!==3||forward.length!==3||!position.every(finite)||!forward.every(finite))return null;
 const fmag=Math.hypot(...forward);if(fmag<.5)return null;
 const candidates=[];
 for(const obj of objects.slice(0,36)){
  if(!obj?.alive||!Array.isArray(obj.position)||!obj.position.every(finite)||!obj.id||!obj.kind)continue;
  const delta=obj.position.map((x,i)=>x-position[i]),distance=Math.hypot(...delta);
  if(distance>maxRange||distance<1.3)continue;
  const alignment=delta.reduce((sum,v,i)=>sum+v*forward[i],0)/(distance*fmag);
  if(alignment<cosHalfAngle)continue;
  candidates.push({id:String(obj.id).slice(0,100),kind:String(obj.kind).slice(0,36),
   behavior:String(obj.behavior||'unobserved').slice(0,90),rangeScene:distance,
   candidateOnly:!!obj.encounterOnly,alignment,score:alignment*3-distance/maxRange});
 }
 candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return candidates[0]||null;
}
function begin(s,ctx,spec){
 if(!ctx?.landed||!ctx.eva||ctx.truckOccupied||ctx.manufacturedOccupied||
   !ctx.body?.landable||!Array.isArray(ctx.local)||ctx.local.length!==3||
   !ctx.local.every(finite))throw Error('Exit onto a landable planetary surface in EVA to scan');
 if(!spec||!finite(spec.seconds)||spec.seconds<=0||!finite(spec.powerW)||spec.powerW<=0)
  throw Error('Unsupported scanner instrument');
 const cost=spec.seconds*spec.powerW;
 if(s.batteryJ+1e-9<cost)throw Error('Multitool battery insufficient; recharge at a powered landed ship');
 return{instrument:mode(s.mode).instrument,bodyId:ctx.body.id,local:ctx.local.slice(),
  elapsed:0,seconds:spec.seconds,powerJ:cost,
  // Finite-progress visual state. Completion is only after a real 4A receipt.
  target:null};
}
function advance(job,dt,ctx,radius){
 if(!job)return{status:'inactive',job:null};
 if(!ctx?.landed||!ctx.eva||ctx.truckOccupied||ctx.manufacturedOccupied||
  ctx.body?.id!==job.bodyId||!Array.isArray(ctx.local))
  return{status:'cancelled',reason:'Scanner stopped: EVA or body changed',job:null};
 const dot=ctx.local.reduce((a,x,i)=>a+x*job.local[i],0),d=Math.acos(clamp(dot,-1,1))*radius;
 if(d>12)return{status:'cancelled',reason:'Scanner stopped: moved over 12 scene units from the sample site',job:null};
 const elapsed=clamp(job.elapsed+clamp(dt,0,.10),0,job.seconds);
 return{status:elapsed>=job.seconds?'ready':'sampling',job:{...job,elapsed},progress:elapsed/job.seconds};
}
function record(s,observation,job,target){
 if(!observation?.id||observation.instrument!==job.instrument||observation.bodyId!==job.bodyId||
   !finite(observation.value)||!finite(observation.timeS))
  throw Error('Cannot record an unverified or mismatched instrument receipt');
 if(s.batteryJ+1e-9<job.powerJ)throw Error('Multitool battery exhausted');
 const entry={id:observation.id,bodyId:observation.bodyId,instrument:job.instrument,
  value:observation.value,unit:observation.unit,uncertainty:observation.uncertainty,
  timeS:observation.timeS,quality:observation.quality,
  target:target?.id||null,targetKind:target?.kind||null,
  model:observation.model||'procedural estimate'};
 return{...s,batteryJ:Math.max(0,s.batteryJ-job.powerJ),completed:s.completed+1,
   history:[...s.history,entry].slice(-MAX_LOG)};
}
function applyCharge(s,receivedJ){
 if(!finite(receivedJ)||receivedJ<0||receivedJ>CAPACITY_J+1)throw Error('Invalid ship-paid scanner charge');
 return{...s,batteryJ:clamp(s.batteryJ+receivedJ,0,CAPACITY_J)};
}
const API=Object.freeze({CAPACITY_J,MAX_LOG,MODES,sanitize,mode,nextMode,selectTarget,begin,advance,record,applyCharge});
root.StarfallHandheldScanner9G=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
