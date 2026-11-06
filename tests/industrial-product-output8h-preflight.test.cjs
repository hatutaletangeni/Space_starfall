/* 8H product output: fail-closed preflight regressions.
 * This is NOT proof of native T02 packet delivery or a played expedition.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const output=require('../src/physics/industrial-product-output8h.js');
const base=()=>({
 operationId:'8h-product:preflight',lotId:'solid-lot',massKg:1,
 stationId:'paid-plant',depotId:'paid-depot',bodyId:'planet-742',
 materials8a:{schema:1,containers:[]},
 physical8a:{schema:1,assets:[],transfers:[]},
 transportReceipt:{operationId:'8h-product:preflight',lotId:'solid-lot',
 sourceId:'paid-plant',destinationId:'paid-depot',bodyId:'planet-742',
 massKg:1,status:'DELIVERED',nativeT02Paid:true,usedJ:250,
 powerReceiptId:'claimed-power'}
});
test('rejects missing original 8A material owner',()=>{
 const x=base();delete x.materials8a;
 assert.throws(()=>output.commit(x),/custody owners missing/);
});
test('rejects missing original 8A physical owner',()=>{
 const x=base();delete x.physical8a;
 assert.throws(()=>output.commit(x),/custody owners missing/);
});
test('rejects zero, negative, NaN and infinite quantities',()=>{
 for(const massKg of [0,-1,NaN,Infinity,-Infinity]){
  const x=base();x.massKg=massKg;
  assert.throws(()=>output.commit(x),/Invalid original 8H product/);
 }
});
test('rejects uninstalled station and depot even with claimed paid delivery',()=>{
 assert.throws(()=>output.commit(base()),/Paid same-world original station/);
});
test('rejects malformed or non-namespaced operation identifiers',()=>{
 for(const operationId of ['output:free','',null,'8h-product:'.padEnd(200,'x')]){
  const x=base();x.operationId=operationId;
  assert.throws(()=>output.commit(x),/Invalid original 8H product/);
 }
});
test('rejects identical source and destination IDs before ledger access',()=>{
 const x=base();x.depotId=x.stationId;
 assert.throws(()=>output.commit(x),/Paid same-world original station/);
});


const installed=()=>{
 const x=base(),loc={kind:'surface',bodyId:x.bodyId,local:[1,0,0]};
 x.physical8a.assets=[
  {id:x.stationId,type:'industrial_plant',massKg:100,condition:1,location:loc,state:{enabled:true,station:'catalytic_reactor'}},
  {id:x.depotId,type:'industrial_plant',massKg:100,condition:1,location:loc,state:{enabled:true,station:'cargo_depot',containerId:'depot-dry'}}
 ];
 x.physical8a.transfers=x.physical8a.assets.map(a=>({action:'INSTALL',status:'COMMITTED',assetId:a.id,sourceLotId:'original-kit-'+a.id,massKg:a.massKg}));
 x.materials8a.containers=[
  {id:'station-output',ownerId:x.stationId,kind:'dry solid output'},
  {id:'depot-dry',ownerId:x.depotId,kind:'dry-solid cargo dock'}
 ];
 x.transportReceipt.sourceContainerId='station-output';
 return x;
};
test('rejects forged unpaid or incomplete transport receipt even with installed physical owners',()=>{
 for(const change of [
  r=>{r.nativeT02Paid=false;},
  r=>{r.status='PENDING';},
  r=>{r.usedJ=0;},
  r=>{r.powerReceiptId='';},
  r=>{r.sourceId='another-plant';},
  r=>{r.destinationId='another-depot';},
  r=>{r.bodyId='another-world';},
  r=>{r.massKg=2;},
  r=>{r.operationId='8h-product:another';},
  r=>{r.lotId='different-lot';}
 ]){
  const x=installed();change(x.transportReceipt);
  assert.throws(()=>output.commit(x),/Actual completed original T02 transport receipt/);
 }
});
test('rejects absent or owner-mismatched source output bin',()=>{
 const x=installed();x.materials8a.containers[0].ownerId='unrelated-station';
 assert.throws(()=>output.commit(x),/Physical source output and receiving 8A depot bins/);
});
test('rejects receiving depot bin owned by unrelated hardware',()=>{
 const x=installed();x.materials8a.containers[1].ownerId='unrelated-depot';
 assert.throws(()=>output.commit(x),/Physical source output and receiving 8A depot bins/);
});
test('rejects station disabled or on a different body',()=>{
 for(const mutate of [x=>{x.physical8a.assets[0].state.enabled=false;},x=>{x.physical8a.assets[0].location.bodyId='different-world';}]){
  const x=installed();mutate(x);
  assert.throws(()=>output.commit(x),/Paid same-world original station/);
 }
});
