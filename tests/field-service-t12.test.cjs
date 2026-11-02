'use strict';
const assert=require('node:assert/strict');
globalThis.StarfallPhysics={SCENE_METERS_PER_UNIT:1000};
globalThis.Starfall3D={groundHeight:()=>0};
const V=require('../src/physics/vehicles.js');
const T06=require('../src/physics/rover-lifecycle-t06.js');
const O=require('../src/physics/outposts.js');
const Ledger=require('../src/physics/power-ledger-t02.js');
const S=require('../src/physics/field-service-t12.js');
assert.equal(S.MAX_CABLE_SCENE,55);
assert.equal(S.FAULT_SLOTS.length,5);
const body={id:'planet-A',kind:'planet',radius:2000,gravity:1,landable:true,position:[0,0,0],spinAngle:0,spinAxis:[0,1,0]};
const local=(sceneX)=>[Math.sin(sceneX/body.radius),0,Math.cos(sceneX/body.radius)];
const flat=()=>0;
const recover=S.start({body,truckLocal:local(0),roverLocal:local(30),destination:local(13),
 radiusScene:body.radius,height:flat,energyJ:44e6,unit:1000,atS:500});
assert(recover.initialCableScene>29&&recover.originalWorkJ>0&&recover.originalWorkJ<44e6);
assert.equal(recover.bodyId,body.id);
const initialEnergy=44e6;
let state=recover,roverLocal=local(30),energyJ=initialEnergy;
let first=S.advance({state,body,truckLocal:local(0),roverLocal,radiusScene:body.radius,height:flat,truckEnergyJ:energyJ,dt:1});
assert(first.spentJ>0&&first.energyJ<initialEnergy,'work drains energy only with finite movement');
assert(S.distance(first.roverLocal,roverLocal,body.radius)>.01);
state=first.state;roverLocal=first.roverLocal;energyJ=first.energyJ;
const snapshot=JSON.parse(JSON.stringify(state)),savedEnergy=energyJ;
state=S.restore(snapshot,body.id);
assert.equal(state.consumedWorkJ,snapshot.consumedWorkJ,'save/load keeps consumed work');
assert.equal(S.restore(snapshot,'different-body'),null,'winch cannot resume on a remote body');
let done=false,receipt;
for(let i=0;i<100;i++){
 const q=S.advance({state,body,truckLocal:local(0),roverLocal,radiusScene:body.radius,height:flat,truckEnergyJ:energyJ,dt:1});
 assert(q.energyJ<=energyJ+1e-9);
 state=q.state;roverLocal=q.roverLocal;energyJ=q.energyJ;
 if(q.done){done=true;receipt=q.receipt;break;}
}
assert(done,'winch recovery should reach destination');
assert(S.distance(roverLocal,local(13),body.radius)<.2);
assert(energyJ<savedEnergy&&energyJ>=30000);
assert(receipt?.consumedWorkJ>0,'final receipt shows actual work consumed');
const paused=S.advance({state:recover,body,truckLocal:local(4),roverLocal:local(30),radiusScene:body.radius,
 height:flat,truckEnergyJ:44e6,dt:1});
assert.equal(paused.spentJ,0);assert.equal(paused.state.status,'BLOCKED','anchor movement must interrupt winch');
const low=S.advance({state:recover,body,truckLocal:local(0),roverLocal:local(30),radiusScene:body.radius,
 height:flat,truckEnergyJ:30000,dt:1});
assert.equal(low.spentJ,0);assert.equal(low.state.status,'LOW POWER');
assert.throws(()=>S.start({body,truckLocal:local(0),roverLocal:local(80),destination:local(13),
 radiusScene:body.radius,height:flat,energyJ:44e6}),/reach/);
const ridge=(d)=>{const x=Math.atan2(d[0],d[2])*body.radius;return x>12&&x<18?5:0;};
assert.throws(()=>S.start({body,truckLocal:local(0),roverLocal:local(30),destination:local(13),
 radiusScene:body.radius,height:ridge,energyJ:44e6}),/ridge|grade/);
const chargedSource={id:'outpost-battery-A',kind:'battery',bodyId:body.id,enabled:true,condition:1,local:local(0),energyJ:2e7};
const opts={source:chargedSource,sourceBodyId:body.id,targetId:'starfall-rover',targetBodyId:body.id,sourceLocal:local(0),
 targetLocal:local(5),radiusScene:body.radius,sourcePowered:true,grid:Ledger,installed:true,
 targetEnergyJ:200000,targetCapacityJ:18e6,atS:100,readyAtS:0,portTemperatureK:290};
const charge=S.transfer(opts);
assert(charge.deliveredJ>0&&charge.drawnJ>charge.deliveredJ&&charge.lossJ>0);
assert.equal(charge.fromEnergyJ+charge.drawnJ,chargedSource.energyJ,'battery debit is exact');
assert.equal(charge.toEnergyJ-opts.targetEnergyJ,charge.deliveredJ,'recipient credit is exact');
assert(Math.abs(charge.drawnJ-charge.deliveredJ-charge.lossJ)<1e-7,'no joules created');
assert.throws(()=>S.transfer({...opts,targetBodyId:'planet-B'}),/share one world/);
assert.throws(()=>S.transfer({...opts,sourcePowered:false}),/live enabled/);
assert.throws(()=>S.transfer({...opts,targetLocal:local(500)}),/physical range/);
assert.throws(()=>S.transfer({...opts,readyAtS:200}),/cooling down/);
assert.throws(()=>S.transfer({...opts,portTemperatureK:400}),/overheated/);
assert.throws(()=>S.transfer({...opts,installed:false}),/installed port/);
const installed=V.presets.rover.slots.motor;
const rover={id:'probe-A',bodyId:body.id,local:local(5),status:'safe-stop',batteryJ:200000,
 roverT06:{state:'SAFE_STOP',health:.35,fault:'Drive motor fault',landing:{safe:true}}};
const old=S.createService({conditions:{motor:.35}});
const diagnosis=S.diagnosis({service:old,rover,health:.35});
assert.equal(diagnosis.parts.motor,.35);
const fix=S.maintain({service:old,slot:'motor',atS:300,truckEnergyJ:2e6,installedId:installed,rover,health:.35});
assert(fix.batteryJ<2e6&&fix.record.installedId===installed);
assert.equal(fix.record.removedId,installed,'old installed part recorded without inventing items');
assert.equal(rover.fieldT12.records.length,1);
assert.equal(rover.status,'parked');
assert.equal(T06.hardware(rover).state,'READY');
assert.equal(S.createService(JSON.parse(JSON.stringify(rover.fieldT12))).records.length,1);
assert.throws(()=>S.maintain({service:fix.service,slot:'motor',atS:301,truckEnergyJ:2e6,installedId:installed,rover,health:1}),/has not finished/);
assert.throws(()=>S.maintain({service:old,slot:'motor',atS:300,truckEnergyJ:100000,installedId:installed}),/battery/);
assert.throws(()=>S.maintain({service:old,slot:'motor',atS:300,truckEnergyJ:2e6,installedId:V.presets.rover.slots.battery}),/family/);
const wreck={...rover,id:'wreck',roverT06:{state:'FAULT',fault:'motor fault',landing:{safe:false}}};
assert.throws(()=>S.maintain({service:old,slot:'motor',atS:400,truckEnergyJ:2e6,installedId:installed,rover:wreck}),/destroyed/);
assert.equal(S.createService().conditions.wheels,1,'old saves migrate to healthy, not phantom faults');
console.log('PASS T12 bounded recover/cancel/persist/terrain/energy; powered port loss and range, component repair and health migration');
