/* Industrial T09 regression: native owner API must never mint free consumables.
 * This is a guard test, NOT evidence of a completed 8G commissioning expedition.
 */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function load(relative,industrial){
  const sandbox={module:{exports:{}},SF:{load:()=>industrial?{freshExpedition:{schema:1}}:{}},console};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),sandbox,{filename:relative});
  return {api:sandbox.module.exports,root:sandbox};
}
test('fresh Industrial T09 shell starts with no free consumables',()=>{
  const {api}=load('src/physics/habitat-t09.js',true);
  const item={kind:'hab'};
  const h=api.ensure(item,0);
  for(const key of ['oxygenMol','inertMol','carbonMol','oxygenTankMol','inertTankMol','scrubberCapacityMol','waterL'])
    assert.equal(h[key],0,key+' must be source supplied');
  assert.equal(h.enabled,false);
  assert.equal(h.totalKPa,0);
});
test('native outpost Store.add refuses free Industrial habitat',()=>{
  const {api}=load('src/physics/outposts.js',true);
  const store=new api.Store(742);
  assert.throws(()=>store.add('hab',null,null,null,null),/Industrial habitat requires atomic source-paid/);
  assert.equal(store.items.length,0);
  assert.equal(store.serial,0);
});
test('legacy habitat creation retains original supplies',()=>{
  const {api}=load('src/physics/habitat-t09.js',false);
  const h=api.ensure({kind:'hab'},0);
  assert.ok(h.oxygenMol>0);
  assert.ok(h.waterL>0);
  assert.ok(h.scrubberCapacityMol>0);
});
test('existing Industrial serialized T09 consumables are preserved, not erased',()=>{
  const {api}=load('src/physics/habitat-t09.js',true);
  const saved={...api.defaults(0),oxygenMol:42,waterL:17,scrubberCapacityMol:3};
  const item={kind:'hab',habT09:saved};
  const h=api.ensure(item,0);
  assert.equal(h.oxygenMol,42);
  assert.equal(h.waterL,17);
  assert.equal(h.scrubberCapacityMol,3);
});
