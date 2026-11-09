'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/physics/material-ledger8a.js');
const S=require('../src/physics/starter-manifest8k.js');
const make=()=>M.create({schema:1,containers:[{id:'ship',ownerId:'ship-main',
 kind:'raw-material cargo hold',maxMassKg:9000,maxVolumeM3:16}],
 lots:[],operations:[]}).snapshot();
const exp=()=>({schema:1,seed:742,startedAt:1762510000000});
test('8K finite fixed prelaunch manifest is capacity audited and source-owned',()=>{
 const m=make(),old=structuredClone(m),r=S.prepare(m,exp(),null,'ship');
 assert.equal(r.applied,true);
 assert.equal(r.materials.lots.length,S.SUM.uniqueLots);
 assert.equal(r.materials.lots.reduce((x,l)=>x+l.massKg,0),S.SUM.massKg);
 assert.equal(r.materials.lots.reduce((x,l)=>x+l.volumeM3,0),S.SUM.volumeM3);
 assert.ok(S.SUM.massKg<9000&&S.SUM.volumeM3<16);
 assert.ok(r.materials.lots.every(x=>x.containerId==='ship'&&x.provenance.startsWith('preexisting_ship_manifest8k:')));
 assert.equal(M.create(r.materials).inventory('ship').length,S.SUM.uniqueLots);
 assert.deepEqual(m,old,'source not mutated until durable owner commit');
});
test('8K exact one starter delivery per new expedition, never reloaded twice',()=>{
 const r=S.prepare(make(),exp(),null,'ship');
 const retry=S.prepare(r.materials,exp(),r.receipt,'ship');
 assert.equal(retry.applied,false);
 assert.deepEqual(retry.materials,r.materials);
 assert.equal(retry.reason,'ALREADY_DELIVERED');
 assert.throws(()=>S.prepare(r.materials,exp(),null,'ship'),/refuses/);
});
test('8K old saves never gain material and cannot be overwritten by fresh manifest',()=>{
 const m=make();m.lots.push({id:'legacy:ore',materialId:'iron_ore',containerId:'ship',
 massKg:20,volumeM3:.01,provenance:'legacy_import:preexisting_cargo'});
 const r=S.prepare(m,null,null,'ship');
 assert.equal(r.applied,false);
 assert.deepEqual(r.materials,m);
 assert.throws(()=>S.prepare(m,exp(),null,'ship'),/refuses/);
});
test('8K reject ship hold too small or wrong owner, and conflicting receipt',()=>{
 const m=make();m.containers[0].maxMassKg=1;
 assert.throws(()=>S.prepare(m,exp(),null,'ship'),/cannot contain/);
 const n=make();n.containers[0].ownerId='alien';
 assert.throws(()=>S.prepare(n,exp(),null,'ship'),/cannot contain/);
 const r=S.prepare(make(),exp(),null,'ship');
 assert.throws(()=>S.prepare(r.materials,exp(),{...r.receipt,seed:999},'ship'),/conflicts/);
});
