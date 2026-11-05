'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/kit-recipes8f.js');
const Site=require('../src/physics/industrial-site8e.js');
const Port=require('../src/physics/conveyor-power-port8h.js');
require('../src/physics/logistics-powered-network8h.js');
const Packets=require('../src/physics/conveyor-packets8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const angle=t=>[Math.cos(t),Math.sin(t),0];
const body={id:'star-0-p0',systemId:'star-0',kind:'moon',landable:true,
 radius:1000,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const ship=angle(-.052),origin='8d:ship-main:materials';
function build(){
 const kinds=['plant_kit_cargo_depot','plant_kit_conveyor_drive','plant_kit_cargo_depot'];
 const angles=[0,.01125,.0225];
 const materials0={schema:1,containers:[{id:origin,ownerId:'ship-main',
  maxMassKg:9000,maxVolumeM3:16}],lots:kinds.map((k,i)=>({
   id:'real-built-kit:'+i,containerId:origin,materialId:k,
   massKg:Site.KITS[k].massKg,volumeM3:Site.KITS[k].volumeM3,
   provenance:'8F paid real certified manufacturing',grade:.99})),operations:[]};
 let materials=materials0,physical={schema:1,assets:[],transfers:[]};
 const ids=['facility8e:real-source','facility8e:real-drive','facility8e:real-target'];
 let usedJ=0;
 for(let i=0;i<kinds.length;i++){
  const jobId='plant8e:real:'+i,kitLotId='real-built-kit:'+i;
  const actor=angle(angles[i]),quote=Site.quote({
   materials,physical,shipContainerId:origin,kitLotId,bodyId:body.id,
   local:actor,bodyRadius:body.radius,shipLocal:ship,operatorLocal:actor});
  assert.equal(quote.massKg,Site.KITS[kinds[i]].massKg);
  const paid=Site.install({jobId,assetId:ids[i],
   materials,physical,shipContainerId:origin,kitLotId,bodyId:body.id,
   local:actor,bodyRadius:body.radius,shipLocal:ship,operatorLocal:actor,
   energyReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
    usedJ:quote.workJ}});
  materials=paid.materials;physical=paid.physical;usedJ+=quote.workJ;
 }
 return{physical,materials,ids,usedJ,materials0};
}
test('physically paid 8E kits fit genuine 11.25m adjacency window with no overlap or free metal',()=>{
 const x=build();
 assert.equal(x.usedJ,2*950000+410000);
 assert.equal(x.physical.assets.length,3);
 assert.equal(x.materials.lots.length,0,'hardware consumed all three manufactured 8F kit lots');
 assert.equal(x.materials.containers.length,4,'one original ship hold plus three EMPTY owner-bound dry stores');
 assert.equal(x.physical.transfers.length,3,'each real industrial machine has its consumed-kit receipt');
 assert.equal(x.physical.assets.reduce((s,a)=>s+a.massKg,0),1140);
 assert.equal(x.materials0.lots.reduce((s,a)=>s+a.massKg,0),1140);
 const d=(a,b)=>O.arc(angle(a),angle(b),body.radius);
 assert.ok(d(0,.01125)>11&&d(0,.01125)<12);
 assert.ok(d(.01125,.0225)>11&&d(.01125,.0225)<12);
 assert.throws(()=>Site.quote({materials:x.materials,physical:x.physical,
  shipContainerId:origin,kitLotId:'nonexistent',bodyId:body.id,
  local:angle(.01125),bodyRadius:body.radius,
  shipLocal:ship,operatorLocal:angle(.01125)}),/not onboard/);
});
test('genuine manufactured conveyor port wires to ORIGINAL native T02 source, then 8A packet reserves REAL stock',()=>{
 const x=build(),source=x.ids[0],drive=x.ids[1],target=x.ids[2];
 const outpost={schema:1,seed:742,serial:0,lastTick:0,items:[{
  id:'t02:real-source',bodyId:body.id,kind:'battery',local:angle(.005),
  facing:angle(0),height:3,energyJ:1000000,temperatureK:290,condition:1,enabled:true}],
  wires:[],relays:[],receipts:[]};
 const connected=Port.attach({physical8a:x.physical,outpost5:outpost,
  driveId:drive,operatorLocal:angle(.01125),bodyId:body.id,
  bodyRadius:body.radius,timeS:0});
 assert.equal(connected.receipt.energyProducedJ,0);
 assert.equal(connected.receipt.materialMovedKg,0);
 const store=new O.Store(742,connected.outpost5);
 assert.equal(store.link('t02:real-source','8h-port:'+drive,body),true);
 const rep=T.grid(store,body,[-1000000,0,0],1e18,0,0);
 assert.equal(rep.byId['8h-port:'+drive].power,true);
 const ledger=globalThis.StarfallMaterials8A.create(x.materials);
 ledger.importLot({id:'genuine-ore-from-original-truck',materialId:'iron_ore',
  containerId:'depot8h:'+source,massKg:12,volumeM3:.012,
  provenance:'8D actual mined ore hauled and physically delivered',grade:.8});
 const engine=Packets.create(),q=engine.start({
  id:'real-placement-packet',sourceLotId:'genuine-ore-from-original-truck',
  sourceId:source,targetId:target,driveIds:[drive],massKg:12,
  physical8a:connected.physical8a,materials8a:ledger.snapshot(),
  outpost5:store.serialize(),powerReport:rep,
  bodyId:body.id,bodyRadius:body.radius,timeS:0});
 assert.equal(q.receipt.status,'RESERVED');
 assert.equal(q.receipt.energyGrantedJ,0);
 assert.equal(q.materials8a.lots[0].containerId,'depot8h:'+source,
   'reservation cannot teleport actual source ore');
 assert.equal(q.packets.jobs[0].remainingS>11,true);
});
