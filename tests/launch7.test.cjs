/* STARFALL legacy Update 7 regression adjusted for 7B force-based ascent.
   Do not assume a scripted ascent automatically creates a satellite or probe. */
'use strict';
const assert=require('node:assert/strict');
const F=require('../src/physics/rocket-flight7b.js');
const X=require('../src/physics/launch-systems.js');
const seed=742;
const home={id:'star-0-p0',systemId:'star-0',landable:true,gravity:1.24,radius:2150,position:[0,0,0]};
const pad={id:'pad',kind:'foundation',bodyId:home.id,local:[0,1,0]};
const profile={surfaceGravityMS2:home.gravity*X.G0,radiusM:home.radius*1000,mu:home.gravity*X.G0*(home.radius*1000)**2};
const design={engine:'atlas',tanks:6,stages:3,boosters:2,payload:'relay'};
const fit=X.build(design,profile);
assert(fit.valid,fit.problem);assert(fit.launchTWR>1.08);
assert(fit.deltaVMS>fit.requiredDeltaVMS);assert.equal(fit.stageParts.length,3);
assert.equal(X.build({engine:'aether',tanks:1,stages:1,payload:'relay'},profile).valid,false);
assert.throws(()=>X.build({engine:'fusion',tanks:6},profile));
for(const bad of ['DRIVE -1','SAMPLE supernova','REBOOT 12','WAIT 300','TURN 999','DRIVE 999','A'.repeat(300)])
 assert.throws(()=>X.validateScript(bad),bad);
assert.deepEqual(X.validateScript('DRIVE 20\nTURN -90\nSAMPLE magnetometer\nSTOP').map(x=>x.op),['DRIVE','TURN','SAMPLE','STOP']);
const lookup=id=>({'star-0-p0':home,'star-0':{id:'star-0',position:[0,0,0]},
 'star-1':{id:'star-1',position:[1e10,0,0]},'star-1-p0':{id:'star-1-p0',systemId:'star-1',landable:true,gravity:.4,radius:1400,position:[1e10,1e5,0]}}[id]);
const store=new X.Store(seed),clock=1;
assert.throws(()=>store.launch({body:home,foundation:null,design,time:clock}));
const launch=store.launch({body:home,foundation:pad,design,time:clock});
assert.equal(launch.phase,'ascent');
assert.equal(launch.flight.phase,'powered');
assert.equal(store.satellites.length,0,'No free satellite at rocket creation');
let deployed=false,events=[];
for(let t=clock;t<=clock+1500;t+=30){
 const ev=store.update(t,lookup);events.push(...ev);
 const active=store.launches[0];
 assert([active.trajectoryAltitudeM,active.velocityMS,active.flight.x,active.flight.y].every(Number.isFinite),'Finite physical trajectory');
 assert(active.flight.stageFuelKg.every(x=>x>=0),'Fuel must remain nonnegative');
 assert(active.flight.stageIndex<fit.stageParts.length,'Stage index within rocket');
 if(active.phase==='deployed'){deployed=true;break;}
 if(active.phase==='failed')break;
}
assert(events.some(x=>x.kind==='stage'),'Stage separation must be observable');
assert(deployed,'Example assisted rocket should reach stable orbit through force integration');
assert.equal(store.satellites.length,1);
const satellite=store.satellites[0];
const s1=X.orbit(satellite,home,10,1000),s2=X.orbit(satellite,home,10+s1.periodS,1000);
assert(Number.isFinite(s1.periodS)&&s1.periodS>0);
assert(Math.hypot(...s1.position.map((v,i)=>v-s2.position[i]))<1e-4,'Satellite state must be periodic');
assert.equal(store.launches[0].phase,'deployed');
const dest=lookup('star-1-p0'),unsafe=new X.Store(seed);
const remote=unsafe.launch({body:home,foundation:pad,design:{engine:'cluster',tanks:8,stages:3,boosters:2,payload:'rover'},
 time:clock,destinationBody:dest,destinationSystem:lookup('star-1')});
assert.equal(unsafe.rovers.length,0,'No instant rover delivery before physical launch');
unsafe.update(clock+30,lookup);
assert.equal(unsafe.rovers.length,0,'No scripted early delivery');
assert(['ascent','coast','transfer','deployed','failed'].includes(unsafe.launches[0].phase));
const robot={id:'probe-fixture',launchId:'legacy',bodyId:dest.id,systemId:dest.systemId,local:[0,1,0],
 bodySnapshot:dest,heading:0,batteryJ:2.2e7,commands:[],index:0,remaining:0,records:[],status:'parked',lastS:10000};
store.rovers.push(robot);
store.command(robot.id,'DRIVE 10\nTURN 30\nWAIT 2\nDRIVE 4\nSTOP');
const before=robot.local.slice();
for(let i=0;i<18;i++)store.tickRovers(10000+i*4,lookup);
assert.notDeepEqual(robot.local,before,'Direct legacy rover script retained');
assert.equal(robot.status,'parked');assert(robot.batteryJ<2.2e7);
const saved=store.serialize(),loaded=new X.Store(seed,saved);
assert.equal(loaded.rovers[0].id,robot.id);
assert.equal(new X.Store(seed+1,saved).rovers.length,0);
assert.equal(F.elements(store.launches[0].flight,fit.mu,fit.radiusM).stable,true);
console.log('PASS 7 compatibility: mass/stages, 7B force-integrated orbit, honest deployment, orbital repeatability, remote preflight safety, legacy rover scripts and save seed isolation');