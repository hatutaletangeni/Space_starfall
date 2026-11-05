'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
const R=require('../src/physics/logistics-routes8h.js');
const local=t=>[Math.cos(t),Math.sin(t),0];
const bodyId='star-0-p0',bodyRadius=1000;
function world(){
 const depot=(id,a)=>({id,type:'industrial_plant',massKg:480,
  volumeM3:1.8,condition:1,location:{kind:'surface',bodyId,local:local(a)},
  provenance:'original-finite-kit',state:{station:'cargo_depot',enabled:true,
   containerId:'8h:dry:'+id}});
 const truck={id:R.TRUCK,type:'truck',massKg:1600,volumeM3:13,condition:1,
  provenance:'original-manifest',location:{kind:'surface',bodyId,local:local(0)},
  state:{batteryJ:3500000}};
 return{physical8a:{schema:1,assets:[truck,depot('depot-a',.08),
  depot('depot-b',.18)],transfers:[]},
  materials8a:{schema:1,containers:[
   {id:R.HOPPER,ownerId:R.TRUCK,kind:'ore hopper',maxMassKg:800,maxVolumeM3:1.2},
   ...['depot-a','depot-b'].map(id=>({id:'8h:dry:'+id,ownerId:id,
    kind:'sealed dry-solid cargo dock',maxMassKg:1200,maxVolumeM3:1.6}))],
   lots:[],operations:[]},
  truckPose:{bodyId,local:local(0),batteryJ:3500000}};
}
function args(w){return{...w,bodyId,bodyRadius};}
test('finite original truck plans real two-stop dry-depot route without moving assets/stock/energy',()=>{
 const original=world(),before=structuredClone(original);
 const n=R.create(),q=n.plan({...args(original),id:'route-1',depotIds:['depot-a','depot-b'],timeS:1});
 assert.deepEqual(original,before);
 assert.equal(q.route.stops.length,2);
 assert.ok(Math.abs(q.route.stops[0].legM-80)<1e-6);
 assert.ok(Math.abs(q.route.stops[1].legM-100)<1e-6);
 assert.equal(q.route.nextIndex,0);
 assert.equal(q.route.status,'ACTIVE');
 assert.equal(n.snapshot().routes.length,1);
 assert.throws(()=>n.plan({...args(original),id:'route-2',depotIds:['depot-a','depot-b'],timeS:2}),/active route/);
});
test('real original truck physically arrives in route order, then save/reload remains replay-safe',()=>{
 const w=world(),n=R.create();
 n.plan({...args(w),id:'route-1',depotIds:['depot-a','depot-b'],timeS:1});
 assert.throws(()=>n.observe({...args(w),id:'route-1',timeS:10}),/not physically arrived/);
 const moved=structuredClone(w);
 moved.physical8a.assets[0].location.local=local(.08);
 moved.truckPose.local=local(.08);
 const a=n.observe({...args(moved),id:'route-1',timeS:100});
 assert.equal(a.route.nextIndex,1);assert.equal(a.receipt.depotId,'depot-a');
 assert.throws(()=>n.observe({...args(moved),id:'route-1',timeS:101}),/not physically arrived/);
 const reloaded=R.create(JSON.parse(JSON.stringify(n.snapshot())));
 const delivered=structuredClone(moved);
 delivered.physical8a.assets[0].location.local=local(.18);
 delivered.truckPose.local=local(.18);
 const b=reloaded.observe({...args(delivered),id:'route-1',timeS:225});
 assert.equal(b.route.status,'COMPLETED');assert.equal(b.route.nextIndex,2);
 assert.equal(b.route.stops[0].arrivedS,100);assert.equal(b.route.stops[1].arrivedS,225);
 assert.throws(()=>reloaded.observe({...args(delivered),id:'route-1',timeS:230}),/already ended/);
 assert.equal(delivered.truckPose.batteryJ,3500000,'route does not grant movement or free power');
 assert.equal(delivered.materials8a.lots.length,0);
});
test('disallow offworld depots, noninstalled sites, stolen stock and stale battery or truck pose',()=>{
 for(const mutate of [
  w=>w.physical8a.assets[1].location.bodyId='star-0-p1',
  w=>w.physical8a.assets[1].state.enabled=false,
  w=>w.physical8a.assets[1].condition=.1,
  w=>w.materials8a.containers[1].ownerId='phantom',
  w=>w.physical8a.assets[0].state.batteryJ+=10,
  w=>w.truckPose.local=local(.5)
 ]){
  const w=world();mutate(w);
  assert.throws(()=>R.create().plan({...args(w),id:'r1',depotIds:['depot-a','depot-b'],timeS:1}));
 }
 const w=world();
 assert.throws(()=>R.create().plan({...args(w),id:'r1',depotIds:['depot-a','depot-a'],timeS:1}),/distinct/);
 const n=R.create();
 n.plan({...args(w),id:'r1',depotIds:['depot-a','depot-b'],timeS:1});
 assert.throws(()=>n.observe({...args(w),id:'r1',timeS:3,bodyId:'star-0-p9'}),/clock\/world/);
 assert.throws(()=>n.observe({...args(w),id:'r1',timeS:0}),/clock\/world/);
 const displaced=structuredClone(w);
 displaced.physical8a.assets[1].location.local=local(.12);
 displaced.physical8a.assets[0].location.local=local(.12);
 displaced.truckPose.local=local(.12);
 assert.throws(()=>n.observe({...args(displaced),id:'r1',timeS:70}),/depot moved/);
});
test('cancellation is terminal; corrupt visits and duplicate route IDs are rejected',()=>{
 const w=world(),n=R.create();
 n.plan({...args(w),id:'r1',depotIds:['depot-a','depot-b'],timeS:1});
 assert.equal(n.cancel({id:'r1',timeS:3}).route.status,'CANCELLED');
 assert.throws(()=>n.cancel({id:'r1',timeS:4}),/only active/);
 assert.throws(()=>n.observe({...args(w),id:'r1',timeS:5}),/already ended/);
 assert.throws(()=>n.plan({...args(w),id:'r1',depotIds:['depot-a','depot-b'],timeS:5}),/unique ID/);
 const bad=structuredClone(n.snapshot());
 bad.routes[0].stops[1].status='VISITED';
 assert.throws(()=>R.create(bad),/not consecutive/);
});
