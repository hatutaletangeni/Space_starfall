'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
const Site=require('../src/physics/industrial-site8e.js'),
 Port=require('../src/physics/conveyor-power-port8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const body={id:'star-0-p0',systemId:'star-0',kind:'moon',landable:true,
 radius:1000,spinAxis:[0,1,0],spinAngle:0,position:[0,0,0]};
const u=t=>[Math.cos(t),Math.sin(t),0];
function paid(){
 const kitId='plant_kit_conveyor_drive',assetId='facility8e:paid-electric-drive';
 const materials={schema:1,containers:[{id:'8d:ship-main:materials',ownerId:'ship-main',
  kind:'ship real 8A hold',maxMassKg:5000,maxVolumeM3:12}],
  lots:[{id:'8f:genuine-metal-assembled-motor',materialId:kitId,
   containerId:'8d:ship-main:materials',massKg:Site.KITS[kitId].massKg,
   volumeM3:Site.KITS[kitId].volumeM3,grade:1,
   provenance:'real finished certified 8F motor and structural parts'}],
  operations:[]};
 const physical={schema:1,assets:[],transfers:[]},local=u(.05),shipLocal=u(0);
 const quote=Site.quote({materials,physical,shipContainerId:'8d:ship-main:materials',
  kitLotId:materials.lots[0].id,bodyId:body.id,local,bodyRadius:body.radius,
  shipLocal,operatorLocal:local});
 const q=Site.install({jobId:'plant8e:paid-electric-drive',
  assetId,materials,physical,kitLotId:materials.lots[0].id,
  shipContainerId:'8d:ship-main:materials',bodyId:body.id,bodyRadius:body.radius,
  local,shipLocal,operatorLocal:local,
  energyReceipt:{operationId:'plant8e:paid-electric-drive',
   sourceId:'ship-main:engineering-battery',usedJ:quote.workJ}});
 assert.equal(q.materials.lots.length,0,'all original motor kit mass is consumed');
 assert.equal(q.physical.assets[0].massKg,180);
 const native={schema:1,seed:742,serial:1,lastTick:0,items:[{
  id:'real-t02-battery',kind:'battery',bodyId:body.id,local:u(.012),
  facing:u(0),height:3,temperatureK:290,condition:1,enabled:true,
  energyJ:1000000}],wires:[],relays:[],receipts:[],pending:[{id:'original-nonconveyor-queue'}],
  lastPoweredAt:{[body.id]:0},radioEnforced:true};
 return {...q,outpost:native,assetId,local};
}
test('real consumed 8F→paid 8E 180kg drive can install a ZERO-mass and ZERO-charge 250W T02 port',()=>{
 const f=paid(),sourceMass=f.physical.assets.reduce((s,a)=>s+a.massKg,0);
 const a=Port.attach({physical8a:f.physical,outpost5:f.outpost,
  driveId:f.assetId,operatorLocal:f.local,bodyId:body.id,
  bodyRadius:body.radius,timeS:0});
 assert.equal(a.receipt.watts,250);
 assert.equal(a.receipt.energyProducedJ,0);
 assert.equal(a.receipt.materialMovedKg,0);
 assert.equal(a.physical8a.assets[0].massKg,180);
 assert.equal(a.physical8a.assets.reduce((s,x)=>s+x.massKg,0),sourceMass);
 assert.equal(a.outpost5.items.at(-1).energyJ,0);
 assert.equal(a.outpost5.wires.length,0,'original grid remains UNWIRED');
 assert.equal(f.physical.assets[0].state.t02LoadId,undefined,'source immutable');
 assert.equal(f.outpost.items.length,1,'source original T02 owner immutable');
 assert.throws(()=>Port.attach({physical8a:a.physical8a,outpost5:a.outpost5,
  driveId:f.assetId,operatorLocal:f.local,bodyId:body.id,
  bodyRadius:body.radius,timeS:1}),/already installed/);
 const persisted={...f.outpost,...a.outpost5};
 assert.equal(persisted.pending[0].id,'original-nonconveyor-queue');
 assert.equal(persisted.radioEnforced,true);
 assert.equal(persisted.lastPoweredAt[body.id],0);
 const original=new O.Store(742,f.outpost);
 original.restore(a.outpost5);
 assert.equal(original.items.length,2);
 assert.equal(original.items[1].kind,'conveyor_drive');
 const reportBefore=T.grid(original,body,[-1e6,0,0],1e18,0,0);
 assert.equal(reportBefore.byId[a.receipt.portId].power,false,
  'paid mechanical drive cannot move material without original copper wiring');
 assert.equal(original.link('real-t02-battery',a.receipt.portId,body),true);
 const oldJ=original.items[0].energyJ;
 const reportAfter=T.grid(original,body,[-1e6,0,0],1e18,3,3);
 assert.equal(reportAfter.byId[a.receipt.portId].power,true);
 assert.equal(reportAfter.byId[a.receipt.portId].servedW,250);
 assert.ok(original.items[0].energyJ<oldJ,'original native T02 battery is charged exactly once');
});
test('unmanufactured drive, distant EVA, fake receipt and duplicate port cannot mint original energy',()=>{
 const f=paid(),args={physical8a:f.physical,outpost5:f.outpost,
  driveId:f.assetId,operatorLocal:f.local,bodyId:body.id,
  bodyRadius:body.radius,timeS:0};
 assert.throws(()=>Port.attach({...args,driveId:'imaginary-machine'}),/certified physical/);
 assert.throws(()=>Port.attach({...args,operatorLocal:u(.10)}),/EVA operator/);
 const forged=structuredClone(f.physical);forged.transfers=[];
 assert.throws(()=>Port.attach({...args,physical8a:forged}),/consumed-kit/);
 assert.deepEqual(f.outpost.items.map(x=>x.id),['real-t02-battery']);
});
test('source flight and Engineer controls use atomic original save and do not bypass source-owned native grid',()=>{
 const html=read('index.html'),js=read('src/flight.js'),
  ui=read('src/physics/logistics-conveyor-live-ui8h.js');
 assert.ok(html.includes('src/physics/conveyor-power-port8h.js'));
 assert.ok(html.indexOf('conveyor-power-port8h.js')<html.indexOf('src/flight.js'));
 const begin=js.indexOf('function logisticsConveyorInstallPort8H('),
  end=js.indexOf('function logisticsConveyorStart8H(');
 assert.ok(begin>0&&end>begin);
 const body=js.slice(begin,end);
 for(const claim of ['ctx.onFoot','ctx.unwiredDrives','StarfallConveyorPowerPort8H.attach',
  'SF.save(patch)','SF.storageStatus().durable',
  'physical8a=StarfallPhysical8A.create','os.store.restore',
  'os.advancePowerTo(simTime)'])assert.ok(body.includes(claim),claim);
 assert.ok(body.indexOf('SF.save(patch)')<body.indexOf('os.store.restore(result.outpost5);'),
  'never mutate native outpost before verified source-owner durable transaction');
 assert.ok(body.indexOf('SF.load()')<body.indexOf('os.store.restore(result.outpost5);'));
 assert.ok(body.indexOf('physical8a=StarfallPhysical8A.create')>
           body.indexOf('SF.save(patch)'));
 assert.doesNotMatch(body,/T02\.grid\(|\.importLot\(|\.spawn\(|\.setShipPosition\(/);
 for(const id of ['conveyor8h-install-port','conveyor8h-port-drive',
  'conveyor8h-open-wiring','logisticsConveyorInstallPort8H'])
  assert.ok(ui.includes(id),id);
});
