/* T01 independent engineering clock: repeatability, save/reload, bounded job backlog.
 * Model test; actual browser integration is exercised by the existing WebGL smoke. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../src/physics/mission-operations.js');
require('../src/physics/science-field.js');
require('../src/physics/rover-dynamics.js');
require('../src/physics/ground-operations7d.js');
require('../src/physics/rocket-flight7b.js');
require('../src/physics/launch-systems.js');
require('../src/physics/satellites7c.js');
const G=globalThis.StarfallGroundOps7D,S=globalThis.StarfallSatelliteOps7C,
 F=globalThis.StarfallFieldScience,L=globalThis.StarfallLaunch;
const seed=742, body={id:'star-4-p0',systemId:'star-4',seed:11,type:'Rocky',kind:'planet',landable:true,
 radius:2150,gravity:1.0,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0,spinPeriod:1000,atmosphere:'Trace atmosphere'};
const sat={id:'sat-remote',kind:'observatory',systemId:body.systemId,bodyId:body.id,
 altitudeM:90000,epochS:0,phase:0,axis:[0,1,0],mu:body.gravity*9.80665*(body.radius*1000)**2,
 powerJ:5e6};
const rover={id:'rover-remote',systemId:body.systemId,bodyId:body.id,bodySnapshot:body,local:[0,1,0],batteryJ:2.2e7,
 status:'parked',heading:0,lastS:0,records:[],index:0,commands:[]};
const start=()=>({sat:structuredClone(sat),rover:structuredClone(rover)});
function model(saved,startS=0){
 const owner=saved?.owner?structuredClone(saved.owner):start(),clock=new M.Clock(seed,startS,saved?.clock);
 const r=owner.rover, s=owner.sat;
 if(!r.commands.length){
  r.commands=L.validateScript('DRIVE 8\nWAIT 10\nSAMPLE thermometer\nSTOP');
  r.status='running';r.index=0;r.remaining=0;
 }
 clock.setHandler((_from,to)=>{
  // Onboard program continues with no ground link and no player anywhere nearby.
  G.tick(r,to,{body,height:()=>0,science:F,seed,link:{connected:false,reason:'No powered ground receiver'},
   unitScale:1000,onReceive:()=>{throw Error('Blackout cannot deliver a reading');}});
  S.step(s,body,[-1e8,0,0],to,1000,L.orbit);
 });
 return {owner,clock};
}
function runUntil(m,time){let n=0;while(m.clock.lastSimulatedS<time-1e-8){
 const before=m.clock.lastSimulatedS,report=m.clock.advanceTo(time);
 assert.notEqual(report.status,'FAULT',m.clock.fault?.reason);
 assert.notEqual(report.status,'AWAITING_REVIEW');
 assert(m.clock.lastSimulatedS>before,'Scheduler stalled');
 if(++n>120)throw Error('Cannot finish bounded replay');
}return m;}
function observable(m){return {
 local:m.owner.rover.local.map(x=>+x.toFixed(12)),batteryJ:m.owner.rover.batteryJ,
 status:m.owner.rover.status, index:m.owner.rover.index, records:m.owner.rover.records.map(x=>x.id),
 satelliteEnergyJ:m.owner.sat.ops7c.energyJ,
 satelliteShadow:m.owner.sat.ops7c.lastEclipse,satelliteTemperatureK:m.owner.sat.ops7c.temperatureK,
 time:m.clock.lastSimulatedS
};}
const fine=model();for(let t=1;t<=1000;t++)fine.clock.advanceTo(t);
const warp=runUntil(model(),1000);
assert.deepEqual(observable(fine),observable(warp),'Small-step and 100× catch-up states diverged');
assert(warp.owner.rover.batteryJ>=0,'Battery must remain nonnegative');
assert(warp.owner.sat.ops7c.energyJ>=0&&warp.owner.sat.ops7c.energyJ<=S.CONFIG.capacityJ);
const first=model();runUntil(first,500);const persisted={owner:first.owner,clock:first.clock.serialize()};
const reloaded=runUntil(model(persisted,1000),1000);
assert.deepEqual(observable(reloaded),observable(fine),'Reload halfway replay differs');
const visit=runUntil(model(),400);
const visitSave={owner:visit.owner,clock:visit.clock.serialize()};
const revisit=runUntil(model(visitSave,1000),1000);
assert.deepEqual(observable(revisit),observable(fine),'Away/revisit remote simulation diverged');
const events=runUntil(model(),25).clock;
assert.equal(events.record('ASSET_EVENT','asset:accepted',25,{assetId:rover.id}),true);
assert.equal(events.record('ASSET_EVENT','asset:accepted',25,{assetId:rover.id}),false,'Duplicate event prevented');
const job=events.queue({id:'job:photo-1',kind:'CAMERA_REQUEST',assetId:rover.id,createdAtS:25,eligibleAtS:25,
 expiresAtS:50,workUnits:10000,priority:4});
assert.equal(job.status,'QUEUED');
runUntil({clock:events},35);
assert.equal(events.jobs[0].status,'WAITING','No fake camera completion');
assert.equal(new M.Clock(seed,35,events.serialize()).jobs[0].id,job.id);
assert.equal(new M.Clock(seed+1,35,events.serialize()).jobs.length,0,'Mismatched seed isolation');
const before=events.serialize().lastSimulatedS;
assert.equal(events.advanceTo(before+M.MAX_BACKLOG_S+5).status,'AWAITING_REVIEW');
assert.equal(events.lastSimulatedS,before,'Unsafe long skip must not fabricate physics');
assert.equal(events.getAssetStatus(rover.id).jobs.length,1);
console.log('PASS T01: source model replay 1000 small steps = 100x bounded catch-up = interrupted/revisited, blackout rover, orbital battery/thermal, no false photos, saved jobs, seed isolation and 24h review guard');
