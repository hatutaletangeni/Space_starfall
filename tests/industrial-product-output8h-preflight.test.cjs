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
