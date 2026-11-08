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

test('Industrial T09 activation rejects forged envelope and never initializes free state',()=>{
  const {api,root}=load('src/physics/habitat-t09.js',true);
  const item={id:'hab-1',kind:'hab',bodyId:'world-A',physicalAssetId:'fake-envelope'};
  const before=JSON.stringify(item);
  assert.throws(()=>api.command(item,'ENABLE',{now:10,near:true,powered:true}),/unique same-world 8G/);
  assert.equal(JSON.stringify(item),before,'failed authorization must not mutate the habitat');
});
test('Industrial T09 activation rejects cross-world receipts and duplicate shell claims',()=>{
  const {api,root}=load('src/physics/habitat-t09.js',true);
  const asset={id:'envelope-1',type:'habitat_envelope',provenance:'structural-8g:paid',location:{kind:'surface',bodyId:'world-B'}};
  const receipt={assetId:'envelope-1',blueprintId:'habitat_shell',status:'COMMITTED'};
  const saved={freshExpedition:{schema:1},physical8a:{assets:[asset]},vehicleAssembly8g:{receipts:[receipt]},outpost5:{items:[]}};
  root.SF.load=()=>saved;
  const item={id:'hab-1',kind:'hab',bodyId:'world-A',physicalAssetId:'envelope-1'};
  assert.throws(()=>api.command(item,'ENABLE',{now:10,near:true,powered:true}),/unique same-world 8G/);
  assert.equal(item.habT09,undefined);
  asset.location.bodyId='world-A';
  saved.outpost5.items=[{id:'hab-2',kind:'hab',physicalAssetId:'envelope-1'}];
  assert.throws(()=>api.command(item,'ENABLE',{now:10,near:true,powered:true}),/unique same-world 8G/);
  assert.equal(item.habT09,undefined);
});
