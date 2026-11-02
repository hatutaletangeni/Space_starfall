'use strict';
const assert=require('node:assert/strict'),A=require('../src/physics/rf-analyzer-t19.js'),
 O=require('../src/physics/outposts.js'),T=require('../src/physics/antenna-hardware-t04.js');
const body={id:'star-0-p0',systemId:'star-0',kind:'planet',position:[1000,0,0],radius:2100,
 spinAxis:[0,1,0],spinAngle:0,gravity:1.2,landable:true};
const items=[
 {id:'outpost-742-1',kind:'antenna',bodyId:body.id,local:[0,1,0],
  condition:1,enabled:true,temperatureK:290,height:0,radioT04:T.repair(null)},
 {id:'outpost-742-2',kind:'antenna',bodyId:body.id,
  local:O.V.norm([.002,1,0]),condition:1,enabled:true,temperatureK:290,
  height:0,radioT04:T.repair(null)}
];
const report={byId:Object.fromEntries(items.map(x=>[x.id,{
 power:true,servedW:165,voltageV:48,busId:'bus1'}]))};
const nodes=items.map(x=>T.station(x,body,report,O.rotate));
assert(nodes.every(x=>x.powered));
const physical=T.link(nodes[0],nodes[1],body,O.radioLink,O.rotate,1000);
assert(physical.connected,'Original real terrain LOS and two actual radio stations must connect: '+JSON.stringify(physical));
const packet={state:'CREATED',sourceId:items[0].id,destId:items[1].id,id:'packet-x',ackAtS:100};
const s=A.snapshot({sourceId:items[0].id,targetId:items[1].id,bodyId:body.id,timeS:120,
 station:nodes[0],report:report.byId[items[0].id],
 route:{connected:true,quality:physical.quality,bandwidthBps:physical.bandwidthBps,
  delayS:physical.delayS,hops:[items[0].id,items[1].id]},packet});
assert(s.connected&&s.quality>0&&s.bitrate>0);
assert.equal(s.ackId,null,'An unACKED packet is not a confirmed radio receipt');
assert.equal(s.watts,165,'Original DC served watts must be preserved');
const energyBefore=items[0].energyJ??null,originalJson=JSON.stringify(items[1]);
const first=A.record(items[0],s);
assert.equal(A.restore(items[0].radioT04.budgetT19).samples.length,1);
assert.equal(items[0].energyJ??null,energyBefore,'Passive diagnostics may not debit invented Joules');
assert.equal(JSON.stringify(items[1]),originalJson,'No other antenna modified');
T.configure(items[0],{mode:'tracking',targetId:items[1].id});
assert.equal(A.restore(items[0].radioT04.budgetT19).samples[0].id,first.id,
 'Existing original T04 mode edit must retain trace evidence');
let offline=A.snapshot({sourceId:items[0].id,targetId:items[1].id,bodyId:body.id,timeS:121,
 station:{powered:false},report:{power:false,servedW:0,voltageV:0},
 route:{connected:true,quality:1,delayS:1,bandwidthBps:10000}});
assert(!offline.connected&&!offline.ackId&&offline.quality===null);
assert(/OFFLINE/.test(offline.reason));
A.record(items[0],offline);
assert.deepEqual(A.restore(items[0].radioT04.budgetT19).samples.map(x=>x.connected),[true,false]);
assert.equal(A.qualityMarginDb(.08),0);
assert(A.qualityMarginDb(.8)>0);
assert.equal(A.qualityMarginDb(null),null);
assert(A.estimateThermalNoiseDbm(100000)>-135&&A.estimateThermalNoiseDbm(100000)<-100);
assert.equal(A.estimateThermalNoiseDbm(0),null);
assert.throws(()=>A.record(items[1],s),/mismatched/);
assert.throws(()=>A.snapshot({sourceId:'x',targetId:'x',bodyId:body.id,timeS:30}),/distinct/);
assert.throws(()=>A.record(items[0],{...s,timeS:119}),/nonmonotonic/);
const corrupt={schema:19,samples:[
 {...first,id:'record-1'},{...first,id:'record-1'}, {...first,id:'record-bad',timeS:-1}
]};
assert.equal(A.restore(corrupt).samples.length,1,'Old invalid entries not made canonical');
for(let i=2;i<A.MAX_SAMPLES;i++)A.record(items[0],{...s,timeS:122+i});
assert.equal(A.restore(items[0].radioT04.budgetT19).samples.length,A.MAX_SAMPLES);
assert.throws(()=>A.record(items[0],{...s,timeS:999}),/full/);
assert.equal(A.restore(items[0].radioT04.budgetT19).samples[0].id,first.id,
 'No old evidence may be silently evicted at capacity');
const saved=JSON.parse(JSON.stringify(items[0].radioT04));
items[0].radioT04=T.repair(saved);
assert.equal(A.restore(items[0].radioT04.budgetT19).samples.length,A.MAX_SAMPLES,'Original T04 restore preserves T19 optional diagnostics');
assert.equal(A.clear(items[0]),A.MAX_SAMPLES);
assert.equal(A.restore(items[0].radioT04.budgetT19).samples.length,0);
assert(items[0].radioT04.mode==='tracking'&&items[0].radioT04.targetId===items[1].id,'Clearing only optional diagnostics must preserve original active antenna configuration');
console.log('PASS T19A: actual original T04/T02 antenna LOS/bus, non-ACK truth, 48 bounded source trace rows, all original T04 mode/config/energy intact, explicit cap and clear, modeled margin is NOT calibrated SNR');
