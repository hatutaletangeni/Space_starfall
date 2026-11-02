/* STARFALL T01 runtime adapter: no world rendering, no second asset database.
 * Uses launch7 rover/satellite records and outpost5 as their authoritative owners.
 */
(function(root){'use strict';
const M=root.StarfallMissionOperations,RT=root.StarfallRuntime,F=root.StarfallFieldScience,
 G=root.StarfallGroundOps7D,S=root.StarfallSatelliteOps7C,L=root.StarfallLaunch, P=root.StarfallPhysics;
if(!M||!RT||!G||!S||!L||!root.StarfallLaunchUI)return;
const launch=root.StarfallLaunchUI.store,seed=RT.galaxy.seed,existing=root.SF.load().missionOps;
const clock=new M.Clock(seed,RT.time,existing);
const snapshots=new Map(),lastKnownEnergy=new Map(),faultIds=new Set();
const names=['id','systemId','parentId','kind','type','name','seed','radius','gravity','landable','atmosphere','life','water','spinPeriod','spinPhase','spinAxis','orbitRadius','orbitPeriod','phase','tilt','position','spinAngle'];
const finite=Number.isFinite,copy=x=>JSON.parse(JSON.stringify(x));
function snapshot(body){if(!body?.id)return null;const v={};for(const k of names)if(body[k]!==undefined)v[k]=copy(body[k]);
 if(body.parentId){const p=RT.galaxy.byId.get(body.parentId)||snapshots.get(body.parentId);if(p)v.parentOrbit=snapshotShallow(p);}
 return v;}
function snapshotShallow(body){const x={};for(const k of names)if(body[k]!==undefined)x[k]=copy(body[k]);return x;}
function cache(body){if(!body?.id)return;const saved=snapshot(body);snapshots.set(body.id,saved);}
function orbitOffset(radius,angle,tilt){return [Math.cos(angle)*radius,Math.sin(angle)*radius*Math.sin(tilt),Math.sin(angle)*radius*Math.cos(tilt)];}
function resolveBody(asset,time){
 const id=typeof asset==='string'?asset:(asset?.bodyId||asset?.id);
 if(!id)return null;
 const live=RT.galaxy.byId.get(id);if(live&&live.kind!=='star'){cache(live);}
 const raw=live||asset?.bodySnapshot||(asset?.orbitRadius?asset:null)||snapshots.get(id);
 if(!raw)return null;
 const body=copy(raw),sys=RT.galaxy.byId.get(body.systemId);
 if(!sys?.position||!finite(body.orbitRadius)||!finite(body.orbitPeriod)||body.orbitPeriod<=0||!finite(body.phase))return null;
 let centre=sys.position;
 if(body.parentId){
  const parent=RT.galaxy.byId.get(body.parentId)||body.parentOrbit||snapshots.get(body.parentId);
  if(!parent||!finite(parent.orbitRadius)||!finite(parent.orbitPeriod)||parent.orbitPeriod<=0||!finite(parent.phase))return null;
  const offset=orbitOffset(parent.orbitRadius,parent.phase+time*2*Math.PI/parent.orbitPeriod,parent.tilt||0);
  centre=sys.position.map((n,i)=>n+offset[i]);
 }
 const p=orbitOffset(body.orbitRadius,body.phase+time*2*Math.PI/body.orbitPeriod,body.tilt||0);
 body.position=centre.map((n,i)=>n+p[i]);body.spinAngle=(body.spinPhase||0)+time*2*Math.PI/Math.max(1,body.spinPeriod||1);
 return body;
}
function eventOnce(type,id,atS,assetId,details={}){clock.record(type,id,atS,{assetId,...details});}
function failure(assetId,issue,atS){const id='t01-fault:'+assetId+':'+issue.replace(/[^\w-]/g,'-').slice(0,45);
 if(!faultIds.has(id)){faultIds.add(id);eventOnce('FAULT',id,atS,assetId,{issue});}}
function scienceReceipt(obs,r){if(!obs?.id)return;root.StarfallScienceUI?.ingestRover?.(obs);
 eventOnce('OBSERVATION_RECEIVED','t01-rover-observation:'+obs.id,clock.lastSimulatedS,r.id,{observationId:obs.id});}
function orbitalReceipt(obs,s){if(!obs?.id)return;
 if(root.StarfallScienceUI?.ingestOrbital?.(obs))root.StarfallSurveyUI?.recordOrbitalFootprint?.(obs);
 eventOnce('OBSERVATION_RECEIVED','t01-satellite-observation:'+obs.id,clock.lastSimulatedS,s.id,{observationId:obs.id});}
function stepSource(start,end,seconds){
 const ops=root.StarfallOutpostUI;
 // Source records are the only writable physics state. On a per-asset model
 // exception preserve that asset's previous state, report a fault, and keep
 // all other assets independent. No remote job is magically completed.
 for(const r of launch.rovers){
  if(finite(r.lastS)&&r.lastS>end+1e-8||r.t01Fault)continue;
  const body=resolveBody(r,end);if(!body){failure(r.id,'Destination body snapshot or ephemeris unavailable; probe frozen',end);continue;}
  if(!r.bodySnapshot||r.bodySnapshot.parentId&&!r.bodySnapshot.parentOrbit&&RT.galaxy.byId.get(r.bodySnapshot.parentId))r.bodySnapshot=snapshot(body);
  const before=copy(r),arrived=[];
  try{
   G.tick(r,end,{body,seed,science:F,unitScale:P.SCENE_METERS_PER_UNIT,
    height:(local,b)=>root.Starfall3D.groundHeight(local,b),
    link:root.StarfallLaunchUI.remoteLink(r,end),
    onReceive:obs=>arrived.push(obs)});
   if(before.status!==r.status)eventOnce('ASSET_EVENT','t01-rover:'+r.id+':'+Math.round(end*100),end,r.id,{from:before.status,to:r.status});
   if((r.ground7d?.pending?.length||0)<(before.ground7d?.pending?.length||0))
    eventOnce('COMMAND_DELIVERED','t01-command:'+r.id+':'+Math.round(end*100),end,r.id);
   for(const obs of arrived)scienceReceipt(obs,r);
   if(finite(before.batteryJ)&&finite(r.batteryJ)&&before.batteryJ!==r.batteryJ)lastKnownEnergy.set(r.id,r.batteryJ);
  }catch(error){
   for(const k of Object.keys(r))delete r[k];Object.assign(r,before);
   r.t01Fault=String(error.message||error).slice(0,130);failure(r.id,r.t01Fault,end);
  }
 }
 for(const s of launch.satellites){
  const state=S.ensure(s);if(state.lastS!==null&&state.lastS>end+1e-8||s.t01Fault)continue;
  const body=resolveBody(s,end);if(!body){failure(s.id,'Orbital body snapshot or ephemeris unavailable; satellite frozen',end);continue;}
  if(!s.bodySnapshot||s.bodySnapshot.parentId&&!s.bodySnapshot.parentOrbit&&RT.galaxy.byId.get(s.bodySnapshot.parentId))s.bodySnapshot=snapshot(body);
  const sys=RT.galaxy.byId.get(s.systemId),star=sys?.star?.position||sys?.position;
  if(!star){failure(s.id,'Host star ephemeris unavailable; satellite frozen',end);continue;}
  const before=copy(s);
  try{
   S.step(s,body,star,end,P.SCENE_METERS_PER_UNIT,L.orbit);
   // This is a truthful saved numeric downlink, never a fabricated Camera 7F
   // image. If journal owner is unavailable, hold in-transit data in 7C.
   if(root.StarfallScienceUI?.ingestOrbital)for(const obs of S.receive(s,end))orbitalReceipt(obs,s);
   if(before.ops7c?.enabled!==s.ops7c?.enabled)
    eventOnce('POWER_STATE_CHANGED','t01-power:'+s.id+':'+Math.round(end*100),end,s.id,{enabled:s.ops7c?.enabled});
   if(s.ops7c.energyJ!==before.ops7c?.energyJ)lastKnownEnergy.set(s.id,s.ops7c.energyJ);
  }catch(error){
   for(const k of Object.keys(s))delete s[k];Object.assign(s,before);
   s.t01Fault=String(error.message||error).slice(0,130);failure(s.id,s.t01Fault,end);
  }
 }
 if(ops?.advancePowerTo){try{ops.advancePowerTo(end,(asset,t)=>resolveBody(asset,t));}catch(e){failure('outpost-grid',String(e.message||e),end);}}
}
// Register owner function only: the scheduler never invents received images, radio
// routes or physical science results. T03/T05 will add truthful job handlers.
clock.setHandler(stepSource);
let lastPersistReal=0,lastFlushedS=clock.lastSimulatedS;
function persist(){root.SF.save({missionOps:clock.serialize(),launch7:launch.serialize()});root.StarfallOutpostUI?.persist?.();lastFlushedS=clock.lastSimulatedS;}
function advanceTo(simSeconds){
 const report=clock.advanceTo(simSeconds);
 if((clock.lastSimulatedS!==lastFlushedS&&performance.now()-lastPersistReal>4500)||report.status==='FAULT'){
  lastPersistReal=performance.now();persist();
 }
 return report;
}
function getAssetStatus(id){
 const asset=launch.rovers.find(r=>r.id===id)||launch.satellites.find(s=>s.id===id)||root.StarfallOutpostUI?.store?.items.find(x=>x.id===id);
 return clock.getAssetStatus(id,()=>asset?{kind:asset.kind||'remote-rover',bodyId:asset.bodyId,status:asset.status|| (asset.ops7c?.enabled===false?'offline':'available'),energyJ:asset.batteryJ??asset.ops7c?.energyJ??asset.energyJ??null,lastSimulatedS:asset.ground7d?.lastTickS??asset.ops7c?.lastS??clock.lastSimulatedS}:null);
}
root.StarfallMissionOperations.advanceTo=advanceTo;
root.StarfallMissionOperations.getAssetStatus=getAssetStatus;
root.StarfallMissionOperationsUI={clock,advanceTo,getAssetStatus,resolveBody,persist};
addEventListener('pagehide',persist);
})(window);
