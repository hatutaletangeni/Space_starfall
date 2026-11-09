'use strict';
const assert=require('node:assert/strict');
const outposts=require('../src/physics/outposts.js');
const body={id:'world-a',systemId:'system-a',landable:true,radius:1000,gravity:9.8};
const prior=globalThis.SF;
try {
  const terrain=()=>0, local=[0,1,0], facing=[1,0,0];
  globalThis.SF={load:()=>({freshExpedition:{schema:1}})};
  const industrial=new outposts.Store(742);
  assert.throws(()=>industrial.add('solar',body,local,facing,terrain),
    /Industrial solar array requires source-paid manufactured 8F/);
  assert.equal(industrial.items.length,0,'No free solar device can be created');
  assert.throws(()=>industrial.add('battery',body,local,facing,terrain),
    /Industrial battery requires source-paid manufactured 8F/);
  assert.equal(industrial.items.length,0,'No unpaid battery shell can be created');
  assert.equal(industrial.serial,0,'Rejected construction cannot consume serials');
  globalThis.SF={load:()=>({})};
  const creative=new outposts.Store(743);
  const built=creative.add('solar',body,local,facing,terrain).item;
  assert.equal(built.kind,'solar','Legacy and creative construction remains supported');
  const battery=creative.add('battery',body,[0,-1,0],facing,terrain).item;
  assert.equal(battery.kind,'battery','Legacy battery construction remains supported');
  globalThis.SF={load:()=>({freshExpedition:{schema:1}})};
  const restored=new outposts.Store(743,creative.serialize());
  assert.equal(restored.items[0].kind,'solar','Existing solar assets survive save restore');
  assert.equal(restored.items[1].kind,'battery','Existing legacy batteries survive save restore');
  console.log('Industrial solar/battery no-free-construction and legacy restore: PASS');
} finally {
  if(prior===undefined)delete globalThis.SF;
  else globalThis.SF=prior;
}
