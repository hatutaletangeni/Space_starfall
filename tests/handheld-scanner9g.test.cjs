'use strict';
const assert=require('node:assert/strict');
const Tool=require('../src/physics/handheld-scanner9g.js');
const S=require('../src/physics/science-field.js');
assert.equal(Tool.MODES.length,5,'five physical 4A sensor modes');
assert(Tool.MODES.every(x=>S.INSTRUMENTS[x.instrument]),'all modes map to existing 4A sensors');
const original=Tool.sanitize(null);
assert.equal(original.batteryJ,Tool.CAPACITY_J,'new EVA suit ships with finite full scanner battery');
assert.equal(original.history.length,0);
assert.equal(Tool.sanitize({...original,batteryJ:-10}).batteryJ,0,'cannot load corrupt negative cell');
assert.equal(Tool.sanitize({...original,batteryJ:1e30}).batteryJ,Tool.CAPACITY_J,'cannot load overcharged cell');
assert.equal(Tool.sanitize({...original,mode:'infinite laser'}).mode,'geology');
let mode=original.mode;for(let i=0;i<5;i++)mode=Tool.nextMode(mode).key;
assert.equal(mode,original.mode,'five mode selector wraps');
const sampleCtx={landed:true,eva:true,truckOccupied:false,manufacturedOccupied:false,
 body:{id:'terrain-scanner9g',type:'Lush',kind:'planet',life:true,landable:true,seed:23,spinPeriod:500},
 local:[0,1,0]};
const spectro=S.INSTRUMENTS.spectrometer,job=Tool.begin(original,sampleCtx,spectro);
assert.equal(job.instrument,'spectrometer');assert.equal(job.powerJ,560);
assert.equal(job.seconds,4);assert.deepEqual(job.local,[0,1,0]);
assert.throws(()=>Tool.begin({...original,batteryJ:100},sampleCtx,spectro),/battery insufficient/);
assert.throws(()=>Tool.begin(original,{...sampleCtx,eva:false},spectro),/EVA/);
assert.throws(()=>Tool.begin(original,{...sampleCtx,truckOccupied:true},spectro),/EVA/);
const inProgress=Tool.advance(job,1.8,sampleCtx,1500);
assert.equal(inProgress.status,'sampling');
assert(inProgress.progress>0&&inProgress.progress<.05,'fixed 0.1 second maximum step');
let next=job;for(let i=0;i<40;i++)next=Tool.advance(next,.1,sampleCtx,1500).job;
assert.equal(Tool.advance(next,0,sampleCtx,1500).status,'ready','sample duration completed');
assert.equal(Tool.advance(job,.01,{...sampleCtx,local:[0,.999, .0447]},1500).status,'cancelled','moving away cancels acquisition');
assert.equal(Tool.advance(job,.01,{...sampleCtx,body:{...sampleCtx.body,id:'elsewhere'}},1500).status,'cancelled');
const journal=S.journal(null);
const obs=S.sample({body:sampleCtx.body,seed:742,local:sampleCtx.local,altitudeM:.6,
 instrument:'spectrometer',simTime:21,nonce:3});
assert(journal.add(obs),'canonical 4A journal accepts the same observation');
const initialHistory=Tool.record(original,obs,job,{id:'wild-first',kind:'crawler'});
assert.equal(initialHistory.completed,1);
assert.equal(initialHistory.batteryJ,Tool.CAPACITY_J-obs.powerJ);
assert.equal(initialHistory.history[0].id,obs.id);
assert.equal(initialHistory.history[0].target,'wild-first');
assert.equal(initialHistory.history[0].model,'procedural estimate');
assert.deepEqual(journal.list()[0],obs,'4A observation is never fabricated by multitool');
assert.throws(()=>Tool.record(original,{...obs,bodyId:'another'},job),/mismatched/);
assert.equal(Tool.applyCharge(initialHistory,300).batteryJ,initialHistory.batteryJ+300);
assert.equal(Tool.applyCharge(original,800).batteryJ,Tool.CAPACITY_J,'battery cannot exceed cap');
assert.throws(()=>Tool.applyCharge(original,-1),/Invalid/);
const pos=[0,0,0],f=[0,0,-1],items=[
 {id:'behind',kind:'stalker',alive:true,position:[0,0,4]},
 {id:'ahead',kind:'aurora',alive:true,position:[0,0,-20],behavior:'cruise',encounterOnly:true},
 {id:'far',kind:'jelly',alive:true,position:[0,0,-120]},
 {id:'fossil',kind:'fossil',alive:false,position:[0,0,-2]}
];
const target=Tool.selectTarget(items,pos,f);
assert.equal(target.id,'ahead','only correctly aimed biological organisms can be targeted');
assert.equal(target.candidateOnly,true);
assert.equal(Tool.selectTarget(items,pos,[0,0,1]).id,'behind','rotating avatar selects opposite target');
assert.equal(Tool.selectTarget([],pos,f),null);
console.log('PASS 9G suit scanner: real 4A modes, finite energy, charge, timed scan, range/cancel, provenance and aim');
