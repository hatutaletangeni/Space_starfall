'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../src/physics/material-ledger8a.js'),R=require('../src/physics/planetary-resources8c.js');
const D=require('../src/physics/mining-hauling8d.js'),S=require('../src/physics/starter-manifest8k.js');
const A=require('../src/physics/expedition-audit8k.js');
const cp=x=>JSON.parse(JSON.stringify(x)),mass=m=>m.snapshot().lots.reduce((n,l)=>n+l.massKg,0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
function scenario(){
 const start=S.prepare(D.prepareContainers(M.create()).snapshot(),{schema:1,seed:742,startedAt:1},null,D.SHIP);
 return{materials:M.create(start.materials),resources:R.create(),mining:D.create({schema:1,sequence:0,
  active:null,history:[],toolCondition:.05},M,R)};
}
const context=(s,extra={})=>({bodyId:'world',truckBodyId:'world',shipBodyId:'world',truckPresent:true,
 truckNearShip:true,operatorNear:true,truckIdle:true,energyJ:200000,materials:s.materials,
 lotId:'8k:manifest:drill_head',...extra});
function advance(s,energy=200000){let used=0;while(s.mining.active.elapsedS<60){used+=s.mining.advance(2,energy-used).usedJ;}return used;}
test('worn drill recovers using one finite shipped head, paid time/energy and real worn scrap; reload/replay',()=>{
 let s=scenario();const before=mass(s.materials),oldGeo=s.resources.serialize();
 const job=s.mining.startService(context(s));
 assert.equal(job.massKg,2);assert.equal(s.mining.toolCondition,.05);
 close(advance(s),120000);
 s.mining=D.create(cp(s.mining.snapshot()),M,R);
 const done=s.mining.commit(s.materials,s.resources);s.materials=done.materials;
 close(mass(s.materials),before);close(s.mining.toolCondition,1);
 close(s.materials.inventory(D.SHIP).find(l=>l.materialId==='drill_head').massKg,2);
 const scrap=s.materials.inventory(D.SHIP).find(l=>l.provenance==='retired-drill-head:'+job.id);
 assert.equal(scrap.massKg,2);assert.equal(scrap.materialId,'manufacturing_scrap');
 assert.equal(s.materials.operations().filter(o=>o.kind==='DRILL_SERVICE_8D').length,1);
 assert.deepEqual(done.resources.serialize(),oldGeo);
 assert.throws(()=>s.mining.commit(s.materials,s.resources),/incomplete/);
 assert.throws(()=>s.mining.startService(context(s)),/full condition/);
 const restored=D.create(cp(s.mining.snapshot()),M,R);close(restored.toolCondition,1);
 assert.equal(restored.receipt(job.id).energyJ,120000);
});
test('service cannot run remotely, while moving, unpowered, concurrently, or from reserved/missing material',()=>{
 const s=scenario();
 for(const invalid of [{truckPresent:false},{truckNearShip:false},{shipBodyId:'other'},
  {truckBodyId:'other'},{operatorNear:false},{truckIdle:false},{energyJ:119999},{lotId:'missing'}])
  assert.throws(()=>s.mining.startService(context(s,invalid)));
 s.materials.reserve('another-order','8k:manifest:drill_head',D.TRUCK,4);
 assert.throws(()=>s.mining.startService(context(s)),/unreserved/);
 s.materials.cancel('another-order');
 s.mining.startService(context(s));
 assert.throws(()=>s.mining.startService(context(s)),/current operation/);
 const before=cp(s.mining.snapshot());
 assert.equal(s.mining.advance(2,200000,{enabled:false}).usedJ,0);
 assert.deepEqual(s.mining.snapshot(),before);
 assert.throws(()=>s.mining.commit(s.materials,s.resources),/incomplete/);
 s.mining.advance(2,200000);s.mining.cancel();
 close(s.mining.toolCondition,.05);assert.equal(s.materials.operations().filter(o=>o.kind==='DRILL_SERVICE_8D').length,0);
});
test('failed capacity validation does not repair condition or consume a source head',()=>{
 const s=scenario(),snapshot=s.materials.snapshot();
 snapshot.containers.find(c=>c.id===D.SHIP).maxVolumeM3=s.materials.used(D.SHIP).volumeM3;
 s.materials=M.create(snapshot);s.mining.startService(context(s));advance(s);
 const before=cp(s.materials.snapshot());
 assert.throws(()=>s.mining.commit(s.materials,s.resources),/capacity/);
 assert.deepEqual(s.materials.snapshot(),before);close(s.mining.toolCondition,.05);
 assert.equal(s.mining.active.type,'SERVICE');
});
test('original runtime consumes full 1x/10x/100x mining intervals, pauses and rolls back failed durable service',()=>{
 // Execute the actual Flight.js functions, including native-clock call site.
 // No mirrored runtime algorithm can hide a .04/2 s clipping regression.
 const flight=fs.readFileSync('src/flight.js','utf8');
 assert.match(flight,/miningAdvance8D\(elapsed\)/);
 const begin=flight.indexOf('function miningService8D(');
 const tickEnd=flight.indexOf('\nfunction ',flight.indexOf('function miningAdvance8D(',begin)+10);
 const code=flight.slice(begin,tickEnd);
 for(const scale of [1,10,100]){
  const s=scenario();s.mining.startService(context(s));
  const world={mining8d:s.mining,materials8a:s.materials,resources8c:s.resources,
   truckBatteryJ:200000,saves:0,saveFlight:()=>true,showToast(){},console,
   miningContext8D:()=>context(s),miningDeposit8D:()=>null};
  vm.createContext(world);vm.runInContext(code,world);
  for(let i=0;i<Math.ceil(60/(.04*scale));i++)vm.runInContext('miningAdvance8D('+(.04*scale)+')',world);
  assert.equal(s.mining.active,null,'completed at scale '+scale);close(s.mining.toolCondition,1);
  close(world.truckBatteryJ,80000);
 }
 const s=scenario(),world={mining8d:s.mining,materials8a:s.materials,resources8c:s.resources,
  truckBatteryJ:200000,saveFlight:()=>false,showToast(){},console:{error(){}},
  miningContext8D:()=>context(s),miningDeposit8D:()=>null};
 vm.createContext(world);vm.runInContext(code,world);
 assert.throws(()=>vm.runInContext("miningService8D('8k:manifest:drill_head')",world),/could not be saved/);
 assert.equal(s.mining.active,null);
 s.mining.startService(context(s));advance(s);
 const before=cp(s.materials.snapshot());vm.runInContext('miningAdvance8D(2)',world);
 assert.deepEqual(world.materials8a.snapshot(),before);close(s.mining.toolCondition,.05);
 assert.equal(s.mining.active.type,'SERVICE');
});
test('8K mining audit recognizes actual 8C receipts only with matching 8D paid extraction/depletion',()=>{
 require('../src/physics/celestial-composition-cw01.js');require('../src/terrain/geology-cw03.js');
 const galaxy=require('../src/galaxy.js').generateGalaxy(742,64);
 const body=galaxy.systems[0].bodies.find(b=>b.landable&&R.neighbors(b,[1,0,0],742,1).length);
 const deposit=R.neighbors(body,[1,0,0],742,1)[0],s=scenario();
 s.mining=D.create(null,M,R);s.resources.survey(deposit,0);
 s.mining.startDrill({deposit,surveyed:true,bodyId:body.id,truckBodyId:body.id,
  truckPresent:true,operatorNear:true,energyJ:100000});
 for(let i=0;i<12;i++)s.mining.advance(2,100000);
 const done=s.mining.commit(s.materials,s.resources),saved={resources8c:done.resources.serialize(),mining8d:s.mining.snapshot()};
 assert.equal(saved.resources8c.transactions[0].status,undefined,'original 8C contract has no status');
 const stage=()=>A.evaluate(saved).stages.find(x=>x.id==='mining').status;
 assert.equal(stage(),'EVIDENCE');saved.mining8d.history[0].source='other-site';assert.equal(stage(),'NOT_PROVEN');
 saved.mining8d.history[0].source=deposit.id;saved.mining8d.history[0].energyJ=0;assert.equal(stage(),'NOT_PROVEN');
});
