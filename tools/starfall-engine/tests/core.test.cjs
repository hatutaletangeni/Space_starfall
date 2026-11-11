'use strict';
const assert=require('node:assert/strict');
const {Scene,sampleScene,validate}=require('../src/core.js');
let n=0;function check(name,fn){fn();console.log('PASS',name);n++;}
check('sample schema',()=>assert.equal(sampleScene().nodes.length,8));
check('deterministic position',()=>{const s=new Scene();assert.deepEqual([...s.worldPositions(1000)],[...s.worldPositions(1000)])});
check('full-period orbit',()=>{const s=new Scene();const a=s.worldPositions(0).get('world-01'),b=s.worldPositions(2200).get('world-01');assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-6))});
check('unique ID',()=>{const s=new Scene();assert.notEqual(s.add('ship'),s.add('ship'))});
check('subtree deletion',()=>{const s=new Scene();s.remove('world-01');assert.equal(s.getNode('moon-01'),null)});
check('save/reload',()=>{const s=new Scene();s.update('ship-01',{name:'Custom'});assert.deepEqual(new Scene(JSON.parse(JSON.stringify(s.snapshot()))).snapshot(),s.snapshot())});
check('duplicate IDs rejected',()=>{const x=sampleScene();x.nodes.push(x.nodes[0]);assert.throws(()=>validate(x),/Duplicate/)});
check('missing parent rejected',()=>{const x=sampleScene();x.nodes[0].parentId='not-a-node';assert.throws(()=>validate(x),/Unknown parent/)});
check('cycle rejected',()=>{const s=new Scene();assert.throws(()=>s.update('star-home',{parentId:'moon-01'}),/cycle/)});
check('invalid radius rejected',()=>{const s=new Scene();assert.throws(()=>s.update('world-01',{radiusKm:-1}),/radius/)});
check('authoring export marked non-gameplay',()=>{const s=new Scene();assert.match(s.exportStarfallPlacementManifest().warning,/does not automatically/)});
console.log(n+' tests passed');
