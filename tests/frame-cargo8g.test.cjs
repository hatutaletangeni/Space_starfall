'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysical8A=require('../src/physics/physical-inventory8a.js');
const C=require('../src/physics/frame-cargo8g.js');
const fixed=(p,meters,r=1000)=>[Math.sin(meters/r),Math.cos(meters/r),0];
const truck={id:'truck-expedition-001',type:'truck',massKg:1600,volumeM3:13,
 condition:1,location:{kind:'ship',parentId:'ship-main',slot:'starboard-hangar'}};
const frame={id:'vehicle8g:1',type:'vehicle_frame',massKg:300,volumeM3:1.5,
 condition:1,state:{operational:false,commissioned:false},location:{kind:'surface',bodyId:'world',local:fixed(20)}};
const p=()=>({schema:1,assets:[{id:'ship-main',type:'ship',massKg:0,volumeM3:0,location:{kind:'ship',slot:'self'}},truck,frame],transfers:[]});
const e={operationId:'cargo8g:1',status:'COMMITTED',sourceId:'ship-main:engineering-battery',usedJ:30000};
const a={jobId:'cargo8g:1',assetId:frame.id,action:'load',physical:p(),bodyId:'world',
 shipLocal:fixed(0),evaLocal:fixed(20),bodyRadius:1000,shipLanded:true,operatorEVA:true,powerReceipt:e};
const start=JSON.stringify(a.physical);
const load=C.transfer(a);
assert.equal(JSON.stringify(a.physical),start,'Original snapshot mutated');
assert.equal(load.physical.assets.filter(x=>x.id==='truck-expedition-001').length,1,'Original truck lost');
assert.equal(load.physical.assets.find(x=>x.id===frame.id).location.slot,C.LIMIT.slot);
assert.equal(load.physical.transfers.find(x=>x.id===a.jobId).energyJ,30000);
assert.equal(C.transfer({...a,physical:load.physical}).duplicate,true);
assert.throws(()=>C.transfer({...a,physical:load.physical,action:'unload'}),/collision/);
assert.throws(()=>C.transfer({...a,shipLanded:false}),/Surface EVA/);
assert.throws(()=>C.transfer({...a,powerReceipt:{...e,usedJ:0}}),/electrical/);
assert.throws(()=>C.transfer({...a,physical:{...p(),assets:[...p().assets,{id:'other',type:'cargo',massKg:2000,volumeM3:3,location:{kind:'ship',slot:'hold'}]}}),/capacity/);
const unloadArgs={...a,physical:load.physical,jobId:'cargo8g:2',action:'unload',powerReceipt:{...e,operationId:'cargo8g:2'},
 unloadLocal:fixed(37),evaLocal:fixed(37)};
const unload=C.transfer(unloadArgs);
assert.equal(unload.physical.assets.find(x=>x.id===frame.id).location.kind,'surface');
assert.deepEqual(C.transfer({...unloadArgs,physical:unload.physical}).duplicate,true);
assert.equal(unload.physical.assets.find(x=>x.id==='truck-expedition-001').location.slot,'starboard-hangar');
assert.equal(unload.physical.assets.length,p().assets.length);
assert.throws(()=>C.transfer({...unloadArgs,unloadLocal:fixed(100)}),/gantry/);
const obstructed={...load.physical,assets:[...load.physical.assets,
 {id:'obstruction',type:'industrial_plant',massKg:100,volumeM3:1,
  location:{kind:'surface',bodyId:'world',local:fixed(37)}}]};
assert.throws(()=>C.transfer({...unloadArgs,physical:obstructed}),/obstructed/);
const remote=JSON.parse(JSON.stringify(a));remote.physical.assets.find(x=>x.id===frame.id).location.local=fixed(100);
assert.throws(()=>C.transfer(remote),/gantry/);
assert.throws(()=>C.transfer({...a,physical:{...p(),assets:p().assets.map(x=>x.id===frame.id?{...x,state:{commissioned:true}}:x)}}),/incomplete/);
console.log('PASS 8G frame cargo: real finite 8A custody, ship capacity, EVA range, energy receipt, unload clearance, idempotence, original truck protected');
