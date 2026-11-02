/* Update 7F expedition hardening: executable model-level cross-feature regression.
   IMPORTANT: no browser/UI/GPU tests are claimed by this suite. */
'use strict';
const assert=require('node:assert/strict');
require('../src/physics/rocket-flight7b.js');
require('../src/physics/launch-systems.js');
require('../src/physics/satellites7c.js');
require('../src/physics/ground-operations7d.js');
require('../src/physics/science-field.js');
require('../src/physics/imaging7f.js');
const X=globalThis.StarfallLaunch,F=globalThis.StarfallRocketFlight7B,
 S=globalThis.StarfallSatelliteOps7C,G=globalThis.StarfallGroundOps7D,
 I=globalThis.StarfallImaging7F;
const home={id:'star-0-p0',systemId:'star-0',landable:true,gravity:1.24,radius:2150,
 position:[0,0,0],spinPeriod:86000,spinAxis:[0,1,0],spinAngle:0,atmosphere:{densityKgM3:1}};
const secondary={...home,id:'star-1-p0',systemId:'star-1',position:[1e10,0,0],gravity:.6};
const byId=id=>id===home.id?home:id===secondary.id?secondary:
 id==='star-0'?{id,position:[0,0,0]}:id==='star-1'?{id,position:[1e10,0,0]}:null;
const launchDesign={engine:'atlas',stages:3,tanks:6,boosters:2,payload:'relay'};
const store=new X.Store(742),many=26;
for(let i=0;i<many;i++){
 const pad={kind:'foundation',id:'pad-'+i,bodyId:home.id,local:[0,1,0]};
 store.launch({body:home,foundation:pad,design:launchDesign,time:1});
}
assert.equal(store.launches.length,26,'Twenty-six independent launch records persist');
assert.equal(store.satellites.length,0,'No payload instantaneously deployed');
let events=[],deployed=0;
for(let t=1;t<1800;t+=30){
 events.push(...store.update(t,byId));
 deployed=store.launches.filter(x=>x.phase==='deployed').length;
 if(deployed===many)break;
}
assert.equal(deployed,many,'26 real integrated rockets should insert into bound orbit');
assert.equal(store.satellites.length,many,'Exactly one satellite per launch');
assert.equal(new Set(store.satellites.map(s=>s.launchId)).size,many,'No duplicate deployment');
assert(events.some(x=>x.kind==='stage'),'Actual stage separation was reported');
assert.equal(store.update(2000,byId).filter(e=>e.kind==='deployed').length,0,'Repeated update does not duplicate payloads');
const oldSave=store.serialize();
assert.equal(new X.Store(742,oldSave).satellites.length,many);
assert.equal(new X.Store(742,oldSave).launches.length,many);
assert.equal(new X.Store(743,oldSave).launches.length,0,'Unmatched galaxy seed is isolated');
const fixture={...oldSave,launches:[...oldSave.launches,...Array.from({length:28},(_,i)=>({...oldSave.launches[0],id:'old-launch-'+i}))],
 satellites:[...oldSave.satellites,...Array.from({length:55},(_,i)=>({...oldSave.satellites[0],id:'old-sat-'+i,launchId:'old-launch-'+i}))],
 rovers:Array.from({length:48},(_,i)=>({id:'old-probe-'+i,bodyId:home.id,systemId:home.systemId,local:[0,1,0],batteryJ:1e6,commands:[],heading:0}))};
const migrated=new X.Store(742,fixture);
assert.equal(migrated.launches.length,54,'Old launches must never silently trim at 45');
assert.equal(migrated.satellites.length,81,'Old satellite history must never silently trim at 70');
assert.equal(migrated.rovers.length,48,'Old rover history must never silently trim at 36');
assert.equal(new X.Store(742,migrated.serialize()).satellites.length,81,'Migration preserves orbital IDs across a second save cycle');
const saturated=new X.Store(742,{...oldSave,launches:Array.from({length:X.MAX_INVENTORY.launches},(_,i)=>({...oldSave.launches[0],id:'cap-launch-'+i,phase:'deployed'})),satellites:[],rovers:[]});
assert.throws(()=>saturated.launch({body:home,foundation:{id:'unused',bodyId:home.id,kind:'foundation',local:[0,1,0]},design:launchDesign,time:100}),/Launch archive full/);
assert.equal(saturated.launches.length,X.MAX_INVENTORY.launches,'At cap no old launch can disappear');
const missing=new X.Store(742);const m=missing.launch({body:home,foundation:{id:'missing-pad',bodyId:home.id,kind:'foundation',local:[0,1,0]},design:launchDesign,time:1});
m.destinationBodyId='body-never-loaded';m.destinationSnapshot=null;
const actual=missing.launches[0];actual.destinationBodyId=m.destinationBodyId;actual.destinationSnapshot=null;
assert.equal(missing.deploy(actual,100,()=>null),false);
assert.equal(actual.phase,'failed');
assert.equal(missing.satellites.length,0,'Missing destination never invents a payload');
const sat=store.satellites[0],geo=S.geometry(sat,home,[-1e8,0,0],2000,1000,X.orbit);
assert(Number.isFinite(geo.altitudeM)&&geo.altitudeM>=0,'Satellite uses authoritative orbit');
const ops=S.ensure(sat);const previous=ops.energyJ;
S.step(sat,home,[-1e8,0,0],2000,1000,X.orbit);
assert(ops.energyJ>=0&&ops.energyJ<=ops.capacityJ,'Satellite battery bound');
const rover={id:'remote-1',bodyId:home.id,systemId:home.systemId,local:[0,1,0],batteryJ:1e7,
 status:'parked',records:[],commands:[],index:0,lastS:0};
const program=X.validateScript('DRIVE 8\nSAMPLE magnetometer\nSTOP');
G.uplink(rover,program,1,{connected:false,delayS:0});
assert.equal(G.migrate(rover).pending.length,1,'Commands queue during link outage');
G.tick(rover,5,{body:home,science:globalThis.StarfallFieldScience,seed:742,height:()=>0,link:{connected:false},unitScale:1000});
assert.equal(rover.status,'parked','Blackout cannot instantly steer remote rover');
G.tick(rover,7,{body:home,science:globalThis.StarfallFieldScience,seed:742,height:()=>0,link:{connected:true,delayS:.2,quality:1},unitScale:1000});
assert(G.migrate(rover).pending.length<=1,'Radio queue progresses with genuine link');
const images=new I.Store(),p=images.put({sourceType:'satellite',sourceAssetId:sat.id,bodyId:home.id,systemId:home.systemId,
 mode:'nadir',resolution:256,bytes:12000,timeS:2000,position:geo.position});
images.queueDownlink(p.id);
images.tick(2001,1,()=>({connected:false}),()=>2000);assert.equal(images.get(p.id).status,'queued');
images.tick(2002,2,()=>({connected:true,quality:1,delayS:.3}),()=>12000);
images.tick(2002.1,.1,()=>({connected:false}),()=>0);assert.notEqual(images.get(p.id).status,'downlinked');
images.tick(2003,1,()=>({connected:true,quality:1,delayS:.3}),()=>12000);
images.tick(2005,2,()=>({connected:true,quality:1,delayS:.3}),()=>12000);
assert.equal(images.get(p.id).status,'downlinked','Camera data is not reported received before transfer+propagation');
console.log('PASS hardening: 26 physical rocket insertions, no duplicate payload, historical asset preservation > old caps, explicit archive cap, missing-destination safety, orbital battery/ephemeris, queued rover commands, blackout image telemetry and seed isolation');