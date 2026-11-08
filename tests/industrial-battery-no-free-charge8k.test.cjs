'use strict';
const assert = require('node:assert/strict');
const outposts = require('../src/physics/outposts.js');
const body = {id:'world-a',systemId:'system-a',landable:true,radius:1000,gravity:9.8};
const local = [0,1,0], facing = [1,0,0], terrain = () => 0;
const previousSF = globalThis.SF;
try {
  globalThis.SF = {load: () => ({freshExpedition:{schema:1}})};
  const industrial = new outposts.Store(742);
  const built = industrial.add('battery',body,local,facing,terrain).item;
  assert.equal(built.energyJ,0,'Industrial battery cannot arrive with unearned 36MJ');
  assert.equal(industrial.items[0].energyJ,0);
  const restored = new outposts.Store(742,industrial.serialize());
  assert.equal(restored.items[0].energyJ,0,'Industrial zero-charge state survives save');
  globalThis.SF = {load: () => ({})};
  const creative = new outposts.Store(743);
  assert.equal(creative.add('battery',body,local,facing,terrain).item.energyJ,36e6,
    'Legacy and creative battery initialization remains compatible');
  const legacy = new outposts.Store(743,creative.serialize());
  assert.equal(legacy.items[0].energyJ,36e6,'Existing battery energy survives save restoration');
  globalThis.SF = {load: () => ({freshExpedition:{schema:1}})};
  const imported = new outposts.Store(743,creative.serialize());
  assert.equal(imported.items[0].energyJ,36e6,
    'Restoration must not silently erase pre-existing legacy energy');
  console.log('Industrial battery no-free-energy and legacy persistence: PASS');
} finally {
  if (previousSF === undefined) delete globalThis.SF;
  else globalThis.SF = previousSF;
}
