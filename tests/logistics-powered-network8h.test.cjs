'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
const N=require('../src/physics/logistics-powered-network8h.js');
const bodyId='star-0-p0',radius=1000;
const local=t=>[Math.cos(t),Math.sin(t),0];
const asset=(id,station,angle,containerId=null,loadId=null)=>({
 id,type:'industrial_plant',massKg:480,volumeM3:1.8,
 location:{kind:'surface',bodyId,local:local(angle)},condition:1,
 provenance:'8E paid manufactured kit',state:{station,enabled:true,
 containerId,t02LoadId:loadId}});
function world(){
 const assets=[
  asset('depot-a','cargo_depot',0,'stock-a'),
  asset('drive-a','conveyor_drive',.006,null,'conveyor-load-a'),
  asset('drive-b','conveyor_drive',.012,null,'conveyor-load-b'),
  asset('depot-b','cargo_depot',.018,'stock-b')];
 return{bodyId,bodyRadius:radius,sourceId:'depot-a',targetId:'depot-b',
  driveIds:['drive-a','drive-b'],timeS:100,
  physical8a:{schema:1,assets,transfers:assets.map(a=>({
   id:'plant8e:'+a.id,action:'INSTALL',assetId:a.id,status:'COMMITTED',
   sourceLotId:'certified-kit:'+a.id,massKg:a.massKg}))},
  materials8a:{schema:1,containers:[
   {id:'stock-a',ownerId:'depot-a',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6},
   {id:'stock-b',ownerId:'depot-b',kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6}],
   lots:[{id:'real-ore',containerId:'stock-a',materialId:'iron_ore',
     massKg:30,volumeM3:.5,provenance:'8D mined deposit'}],operations:[]},
  outpost5:{items:[
   {id:'solar-1',kind:'solar',bodyId,enabled:true,condition:1},
   {id:'conveyor-load-a',kind:'conveyor_drive',bodyId,enabled:true,condition:1},
   {id:'conveyor-load-b',kind:'conveyor_drive',bodyId,enabled:true,condition:1}],
   wires:[{a:'solar-1',b:'conveyor-load-a'},
    {a:'conveyor-load-a',b:'conveyor-load-b'}]},
  powerReport:{schema:1,bodyId,simulatedAtS:100,byId:{
   'conveyor-load-a':{bodyId,busId:'bus-1',power:true,servedW:250,sourceIds:['solar-1']},
   'conveyor-load-b':{bodyId,busId:'bus-1',power:true,servedW:250,sourceIds:['solar-1']}}}
 };
}
test('original installed depots, physically continuous drives and wired powered bus are required',()=>{
 const q=world(),before=structuredClone(q);
 const x=N.inspect(q);
 assert.equal(x.eligible,true);
 assert.equal(x.fault,'TRANSFER_ENGINE_NOT_INSTALLED');
 assert.equal(x.throughputKgS,0,'never expose cargo throughput before physical packets exist');
 assert.equal(x.powerW,500);
 assert.equal(x.totalSegments,3);
 assert.ok(x.lengthM>17.9&&x.lengthM<18.1);
 assert.deepEqual(q,before,'inspection cannot mutate original matter, assets or power');
 assert.equal(q.materials8a.lots[0].massKg,30);
});
test('no installed drive, free source, phantom material port, or remote/long segment',()=>{
 for(const mutate of [
  x=>x.physical8a.transfers=x.physical8a.transfers.filter(t=>t.assetId!=='drive-a'),
  x=>x.physical8a.assets[0].condition=0,
  x=>x.physical8a.assets[2].location.bodyId='star-0-p1',
  x=>x.materials8a.containers[0].ownerId='phantom',
  x=>x.physical8a.assets[2].location.local=local(.22)
 ]){
  const x=world();mutate(x);
  const out=N.inspect(x);
  assert.equal(out.eligible,false,out);
  assert.equal(out.throughputKgS,0);
 }
});
test('wiring disconnect, unpowered night, load shedding and stale reports fail closed',()=>{
 for(const mutate of [
  x=>x.outpost5.wires=[],
  x=>x.outpost5.items[2].enabled=false,
  x=>x.powerReport.byId['conveyor-load-a'].power=false,
  x=>x.powerReport.byId['conveyor-load-b'].servedW=50,
  x=>x.powerReport.simulatedAtS=50,
  x=>x.powerReport.byId['conveyor-load-a'].sourceIds=['ghost-solar'],
  x=>x.outpost5.items[1].kind='lab',
  x=>x.powerReport.byId['conveyor-load-b'].busId='isolated'
 ]){
  const x=world();mutate(x);
  assert.equal(N.inspect(x).eligible,false);
 }
});
test('gas lots are never moved or decompressed into dry depots by planning',()=>{
 const x=world(),before=structuredClone(x);
 x.materials8a.lots[0].materialId='oxygen';
 const result=N.inspect(x);
 assert.equal(result.throughputKgS,0);
 assert.equal(x.materials8a.lots[0].massKg,30);
 assert.equal(before.materials8a.lots[0].massKg,30);
});
