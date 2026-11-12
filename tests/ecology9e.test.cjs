'use strict';
const assert=require('node:assert/strict');
const M=require('../src/ecology/locomotion9d.js');
const roles=['grazer','predator','detritivore','filterer','aquatic_predator'];
for(const [n,role] of roles.entries()){
 const a={id:'9e-'+role,role,energy:.57,lastEvent:'hungry',massKg:1.4,sizeM:1.2};
 const start=M.start(a,0);
 let state=start,dist=0;
 for(let i=0;i<240;i++){
  const prev=state.p;
  state=M.step(state,a,[{id:'9e-foreign-prey',role:role==='predator'?'grazer':'predator',p:[8,9]}],
   {plantKg:15,detritusKg:4,light:.45,traversable:(x,z)=>Math.hypot(x,z)<M.MAX_RANGE},M.DT);
  dist+=Math.hypot(state.p[0]-prev[0],state.p[1]-prev[1]);
  assert([...state.p,...state.v,state.gait,state.pulse].every(Number.isFinite));
  assert(Math.hypot(...state.p)<M.MAX_RANGE+.00001,'escaped habitat bounds');
 }
 assert(dist>1,'animal class must travel when habitat is traversable: '+role);
 assert.deepEqual(start,M.start(a,0),'stable reproducible spawn for '+role);
}
const animal={id:'9e-cliff-edge',role:'grazer',energy:.6,lastEvent:'forage'};
const initial=M.start(animal,0);
// A half-plane blocks the preferred forward direction, but accessible
// lateral corridors exist. The old two-probe algorithm could deadlock.
const base=initial.p;
const preferred=Math.atan2(initial.v[1],initial.v[0]);
let obstacleHits=0;
const env={plantKg:15,detritusKg:5,light:.6,traversable:(x,z)=>{
 obstacleHits++;
 const vx=x-base[0],vz=z-base[1];
 return Math.hypot(x,z)<M.MAX_RANGE && vx*Math.cos(preferred)+vz*Math.sin(preferred)<=.001;
}};
const moved=M.step(initial,animal,[],env,M.DT);
assert.notDeepEqual(moved.p,initial.p,'terrain fan should choose a legal alternative to the blocked direction');
assert.equal(moved.behavior,'navigating terrain');
assert(Math.hypot(...moved.v)>.01,'a navigable creature must retain actual velocity');
assert(obstacleHits>=2,'terrain fan was not used');
// Totally enclosed agents cannot teleport; instead remain on safe terrain.
const enclosed=M.step(initial,animal,[],{traversable:()=>false},M.DT);
assert.deepEqual(enclosed.p,initial.p,'fully enclosed agent must not clip through terrain');
assert.equal(enclosed.behavior,'blocked by impassable terrain');
assert(enclosed.stuck>0,'blocked state is reported instead of pretending movement');
// A player near a grazer must trigger a physical escape response.
const chased=M.step(initial,animal,[],{player:initial.p.slice(),traversable:()=>true},M.DT);
assert.equal(chased.behavior,'avoiding explorer');
assert(Math.hypot(...chased.v)>.01,'living creatures respond physically to explorer');
// Under a large time jump, no unbounded simulation or corrupted state.
const warp=M.advance(initial,animal,250000,[],{traversable:()=>true});
assert(Number.isFinite(warp.t)&&Math.hypot(...warp.p)<=M.MAX_RANGE,'safe high timewarp');
console.log('PASS 9E: moving animal roles, multi-direction obstacle escape, honest enclosure, explorer response, deterministic saves');
