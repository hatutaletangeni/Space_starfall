'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('../src/physics/expedition-archive-t17.js'),Cam=require('../src/physics/imaging7f.js'),
 R=require('../src/physics/research7e.js'),Out=require('../src/physics/outposts.js'),
 T=require('../src/physics/mission-transport-t03.js'),Sat=require('../src/physics/satellites7c.js'),
 Clock=require('../src/physics/mission-operations.js'),G=require('../src/physics/ground-operations7d.js');
const seed=742,world='star-0-p0',dir=[0,1,0],uid=x=>'outpost-742-'+x;
const item=i=>({id:uid(i),bodyId:world,kind:i===0?'battery':'solar',local:dir,facing:[0,0,1],
 energyJ:i===0?1e6:0,temperatureK:290,condition:1,enabled:true,samples:[]});
const items=Array.from({length:321},(_,i)=>item(i));
const wires=Array.from({length:601},(_,i)=>({a:uid(i%320),b:uid((i+1)%320)}));
const relays=Array.from({length:41},(_,i)=>({id:'relay-'+i,bodyId:world,phase:.1,altitude:1500,axis:dir}));
const oldOut={schema:1,seed,items,wires,relays,receipts:[],serial:500};
const owner=new Out.Store(seed,oldOut);
assert.equal(owner.items.length,321,'all historical items retained without 320 cap');
assert.equal(owner.wires.length,601,'all historical physical wires retained');
assert.equal(owner.relays.length,41,'all historical orbital relays retained');
assert.throws(()=>owner.add('solar',{id:world,landable:true,radius:3000},dir,dir,()=>0),/limit/i,'new placements fail instead of evicting existing structures');
const cameraMeta=i=>({id:'photo-'+i.toString(36),sourceType:'rover',sourceAssetId:'probe-1',
 bodyId:world,systemId:'star-0',mode:'forward',resolution:256,timeS:i,position:[0,0,0],
 bytes:1100,progressBytes:0,width:256,height:256,mime:'image/webp',status:'stored-local',receivedAtS:null});
const imgs=Array.from({length:121},(_,i)=>cameraMeta(i+1));
const jobs=Array.from({length:17},(_,i)=>({id:'photo-job-'+i,assetId:'probe-1',sourceType:'rover',mode:'forward',resolution:256,createdS:i}));
const restored=new Cam.Store({schema:1,serial:121,photos:imgs,jobs});
assert.equal(restored.photos.length,121,'never truncate older camera metadata');
assert.equal(restored.jobs.length,17,'never truncate older camera jobs');
assert.throws(()=>restored.put(cameraMeta(999)),/full/);
const legacyResearch={schema:1,serial:300,plans:Array.from({length:51},(_,i)=>({id:'exp-'+i})),
 runs:Array.from({length:161},(_,i)=>({id:'run-'+i,planId:'exp-0'})),
 blueprints:Array.from({length:46},(_,i)=>({id:'bp-'+i,sourceRunId:'run-0'}))};
const oldResearch=R.restore(legacyResearch);
assert.deepEqual([oldResearch.plans.length,oldResearch.runs.length,oldResearch.blueprints.length],[51,161,46]);
assert.throws(()=>new R.Store(oldResearch).plan({type:'rover'}),/full/);
const obs=i=>({id:'orb-test-'+i,bodyId:world,timeS:i,value:0.3,location:dir,receivedAtS:30,instrument:'orbital-camera'});
const sat={id:'sat-test',kind:'observatory',ops7c:{schema:1,energyJ:2e6,storage:Array.from({length:25},(_,i)=>obs(i)),
 received:Array.from({length:181},(_,i)=>obs(i+40)),inTransit:[]}};
assert.equal(Sat.ensure(sat).storage.length,25,'old orbital source queue is not silently shortened');
assert.equal(Sat.ensure(sat).received.length,181,'old received orbital science is retained');
const packets=Array.from({length:241},(_,i)=>T.create({id:'pk-'+i,type:'ROVER_COMMAND',sourceId:'ship',destId:'probe-1',
 bodyId:world,systemId:'star-0',bytes:128,createdS:i}));
const t=new T.Transport(seed,0,{schema:1,seed,cursorS:0,packets,
 receipts:Array.from({length:4001},(_,i)=>'receipt-'+i)});
assert.equal(t.packets.length,241);
assert.equal(t.receipts.length,4001);
assert.throws(()=>t.queue({id:'new-id',type:'ROVER_COMMAND',sourceId:'ship',destId:'probe-1',
 bodyId:world,systemId:'star-0',bytes:128,createdS:4001}),/full/);
const clock=new Clock.Clock(seed,0,{schema:1,seed,lastSimulatedS:0,
 events:Array.from({length:161},(_,i)=>({id:'evt-'+i,type:'ASSET_EVENT',atS:i})),
 receipts:Array.from({length:4001},(_,i)=>'receipt-'+i),
 jobs:Array.from({length:97},(_,i)=>({id:'job-'+i,assetId:'probe-1',kind:'ROVER',status:'WAITING',createdAtS:0,eligibleAtS:1,lastIntegratedS:0}))});
assert.equal(clock.events.length,161);assert.equal(clock.receipts.length,4001);assert.equal(clock.jobs.length,97);
assert.throws(()=>clock.queue({id:'extra',assetId:'probe-1',kind:'ROVER',createdAtS:1}),/full/);
const rover={id:'rover-1',local:dir,batteryJ:5e6,status:'parked',commands:[],records:[],
 ground7d:{schema:1,acceptedPackets:Array.from({length:501},(_,i)=>'id-'+i),receivedIds:Array.from({length:180},(_,i)=>'r-'+i),
 pending:[],queuedObservations:[]}};
G.migrate(rover);
assert.equal(rover.ground7d.acceptedPackets.length,501,'old packet identities persist');
const state={version:2,credits:200,launch7:{schema:1,seed,serial:1,
 launches:[],satellites:[],rovers:[]},outpost5:{schema:1,seed,serial:1,
 items:[item(0),item(1)],wires:[{a:uid(0),b:uid(1)}],relays:[],receipts:[]},
 research7e:{schema:1,serial:0,plans:[],runs:[],blueprints:[]},
 imaging7f:{schema:1,photos:[],jobs:[],serial:0},
 commsT03:{schema:1,seed,cursorS:0,packets:[],receipts:[]}};
const original=JSON.stringify(state);
const archive=A.create({state,galaxySeed:seed});
assert.equal(A.validate(archive,seed).outposts,2);
assert.equal(A.validate(archive,seed).photos,0);
assert.equal(JSON.stringify(state),original,'creating backup never mutates original');
assert.throws(()=>A.validate(archive,741),/seed/);
assert.throws(()=>A.validate({...archive,integrity:{...archive.integrity,checksum:'abcd'}},seed),/checksum/);
const wrong={...state,launch7:{...state.launch7,seed:333}};
assert.throws(()=>A.create({state:wrong,galaxySeed:seed}),/seed/);
const dangling={...state,outpost5:{...state.outpost5,wires:[{a:'ghost',b:uid(0)}]}};
assert.throws(()=>A.create({state:dangling,galaxySeed:seed}),/dangling/);
const coords={...state,launch7:{...state.launch7,rovers:[{id:'probe-1',bodyId:world,local:[NaN,0,1],batteryJ:5e5}]}};
assert.throws(()=>A.create({state:coords,galaxySeed:seed}),/body-fixed position/);
assert.throws(()=>A.create({state:{...state,credits:-1},galaxySeed:seed}),/credits/);
const p=cameraMeta(1),mediaState={...state,imaging7f:{schema:1,photos:[p],jobs:[],serial:1}};
const binary='data:image/webp;base64,'+'A'.repeat(1468); // synthetic structural fixture ONLY, not an authentic WebGL photo
const record={id:p.id,image:binary,thumbnail:binary,imageHash:A.hash(binary),thumbnailHash:A.hash(binary)};
const full=A.create({state:mediaState,galaxySeed:seed,includeMedia:true,media:[record]});
assert.equal(A.validate(full,seed).photos,1);
assert.throws(()=>A.validate({...full,media:[{...record,image:record.image+'A'}]},seed),/checksum/);
assert.throws(()=>A.create({state:mediaState,galaxySeed:seed,includeMedia:true,media:[]}),/all original/);
const context={globalThis:null,localStorage:{getItem:()=>null,setItem:()=>{throw Error('QuotaDenied')},removeItem:()=>{}},Date,Math,Number,Object,JSON};
context.globalThis=context;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/starfall-core.js'),'utf8'),context);
assert.equal(context.SF.save({test:'transient'}),false,'SF.save must not falsely claim durable save when denied');
assert.equal(context.SF.storageStatus().durable,false);
assert.equal(context.SF.load().test,'transient','read-only session can still run in RAM and warn users');
console.log('PASS T17: preserve older capped Outposts/7E/7F/T07/T03/T01 IDs, fail closed on new records, strict portable checksum/seed/cross-reference validation, truthful denied storage; all fixtures SYNTHETIC not authentic legacy customer saves');