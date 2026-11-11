/* A dry 8G structure must never unlock the older zero-input launcher. */
'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
require('../src/physics/rocket-flight7b.js');require('../src/physics/launch-systems.js');const X=globalThis.StarfallLaunch;
const body={id:'star-0-p0',systemId:'star-0',landable:true,gravity:1.24,radius:2150,position:[0,0,0]},
 foundation={id:'pad',kind:'foundation',bodyId:body.id,local:[0,1,0]},
 design={engine:'atlas',tanks:6,stages:3,boosters:2,payload:'relay'};
test('Industrial ignition refuses free legacy fuel and payload before mutating any launch owner',()=>{
 const previous=globalThis.SF,save={freshExpedition:{schema:1},materials8a:{lots:[]},
  physical8a:{assets:[{id:'dry-stage',type:'rocket_stage',state:{operational:false}}]}},
  before=structuredClone(save),store=new X.Store(742),original=store.serialize();
 globalThis.SF={load:()=>structuredClone(save)};
 try{
  for(const payload of ['relay','observatory','rover']){
   assert.throws(()=>store.launch({body,foundation,design:{...design,payload},time:1}),/source-owned propellant/);
   assert.deepEqual(store.serialize(),original);assert.deepEqual(save,before);
  }
 }finally{if(previous===undefined)delete globalThis.SF;else globalThis.SF=previous;}
});
test('a genuine legacy save retains the original force-integrated launch behavior',()=>{
 const previous=globalThis.SF;globalThis.SF={load:()=>({})};
 try{const store=new X.Store(742),mission=store.launch({body,foundation,design,time:1});
  assert.equal(mission.phase,'ascent');assert.equal(mission.flight.phase,'powered');
  assert.equal(store.launches.length,1);assert.equal(store.satellites.length,0);
 }finally{if(previous===undefined)delete globalThis.SF;else globalThis.SF=previous;}
});
