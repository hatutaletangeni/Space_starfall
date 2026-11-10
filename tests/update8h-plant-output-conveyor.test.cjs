/* 8H output custody: paid 8E glass furnace can retain actual produced
 * dry solids in its original empty 120kg machine hopper, then one original
 * 250W native T02-powered 180kg drive transports the finished 8A lot
 * through the real guarded 40kg tray into a separately paid depot.
 * Explicit test supply: finite certified installed kits, genuine source
 * silica, paid original battery; the silica's upstream history is fixture
 * evidence, NOT independently mined during this focused reverse-route test.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/logistics-powered-network8h.js');
const M=require('../src/physics/material-ledger8a.js');
const P=require('../src/physics/physical-inventory8a.js');
const Site=require('../src/physics/industrial-site8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
const Port=require('../src/physics/conveyor-power-port8h.js');
const Conveyor=require('../src/physics/conveyor-packets8h.js');
const Out=require('../src/physics/outposts.js');
const Grid=require('../src/physics/power-ledger-t02.js');
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,a+' != '+b);
const radius=1000,bodyId='star-0-p0',local=t=>[Math.cos(t),Math.sin(t),0];
const world={id:bodyId,systemId:'star-0',kind:'moon',radius,
 position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const starPos=[-1000000,0,0],luminosity=1e18,hold='8d:ship-main:materials';
function setup(){
 const m=M.create();m.registerContainer({id:hold,ownerId:'ship-main',kind:'original ship hold',
  maxMassKg:9000,maxVolumeM3:16});
 const kinds=['plant_kit_glass_furnace','plant_kit_conveyor_drive','plant_kit_cargo_depot'];
 for(let i=0;i<kinds.length;i++){const k=Site.KITS[kinds[i]];
  m.importLot({id:'certified8f-kit-'+i,materialId:kinds[i],containerId:hold,
   massKg:k.massKg,volumeM3:k.volumeM3,grade:1,provenance:'finite-predeparture-certified-manufactured-kit'});}
 m.importLot({id:'processed-real-silica',materialId:'silicon_dioxide',
  containerId:hold,massKg:4,volumeM3:.006,grade:1,provenance:'process:refine8e:silica_polish'});
 let materials=m.snapshot(),physical=P.create().serialize();
 const positions=[.050,.061,.0726],ids=['facility8e:glass','facility8e:drive','facility8e:receiving'];
 for(let i=0;i<kinds.length;i++){
  const spec=Site.KITS[kinds[i]],jobId='plant8e:paid-'+i;
  const built=Site.install({jobId,assetId:ids[i],materials,physical,
   shipContainerId:hold,kitLotId:'certified8f-kit-'+i,bodyId,bodyRadius:radius,
   local:local(positions[i]),shipLocal:local(0),operatorLocal:local(positions[i]),
   energyReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}});
  materials=built.materials;physical=built.physical;
 }
 const plant=physical.assets.find(x=>x.id===ids[0]),drive=physical.assets.find(x=>x.id===ids[1]),
 depot=physical.assets.find(x=>x.id===ids[2]);
 const l=M.create(materials);
 l.reserve('fixture:actual-plant-input','processed-real-silica',plant.state.dryFeedContainerId,4);
 l.commit('fixture:actual-plant-input');materials=l.snapshot();
 const inputMass=materials.lots.reduce((s,x)=>s+x.massKg,0);
 const energy=Chem.batch('glass_fusing',10);
 const result=Plant.create().process({id:'8e:real-surface-glass',reactionId:'glass_fusing',
  scaleMol:10,materials,sourceContainerId:plant.state.dryFeedContainerId,
  destinations:{glass:plant.state.dryFeedContainerId},assetState:physical,
  station:{id:plant.id,kind:'glass_furnace',installed:true,enabled:true,
   condition:1,bodyId,sourceContainerId:plant.state.dryFeedContainerId,
   tools:plant.state.tools,physicalAssetId:plant.id},
  energyReceipt:{operationId:'8e:real-surface-glass',
   sourceId:'ship-main:engineering-battery',usedJ:energy.energyJ},bodyId});
 materials=result.materials;
 close(materials.lots.reduce((s,x)=>s+x.massKg,0),inputMass);
 const glass=materials.lots.find(x=>x.materialId==='glass'&&x.containerId===plant.state.dryFeedContainerId);
 assert.ok(glass&&glass.provenance==='chemical:8e:real-surface-glass',
  'Original 8E chemistry itself must create OUTPUT in original paid 120kg hopper');
 const initialOut={schema:1,seed:742,serial:0,lastTick:0,items:[{
  id:'paid-real-power-bank',kind:'battery',bodyId,local:local(.061),
  facing:[0,1,0],condition:1,enabled:true,energyJ:3000000,
  temperatureK:290}],wires:[],receipts:[],relays:[]};
 const attached=Port.attach({physical8a:physical,outpost5:initialOut,
  driveId:drive.id,operatorLocal:drive.location.local,
  bodyId,bodyRadius:radius,timeS:0});
 physical=attached.physical8a;
 attached.outpost5.wires.push({a:'paid-real-power-bank',b:attached.receipt.portId});
 const store=new Out.Store(742,attached.outpost5),report=Grid.grid(store,world,starPos,luminosity,0,0);
 store.lastTick=0;
 assert.equal(report.byId[attached.receipt.portId].power,true);
 return{materials,physical,plant,drive,depot,glass,store,report};
}
test('real 8E solid output → own bounded hopper → original native 250W physical conveyor → real depot',()=>{
 const f=setup(),beforeMass=f.materials.lots.reduce((s,l)=>s+l.massKg,0),
  beforePower=f.store.items.find(x=>x.id==='paid-real-power-bank').energyJ;
 const packet=Conveyor.create(),q=packet.start({id:'8h-packet:glass-out',
  sourceLotId:f.glass.id,sourceId:f.plant.id,targetId:f.depot.id,
  driveIds:[f.drive.id],massKg:f.glass.massKg,bodyId,bodyRadius:radius,
  timeS:0,physical8a:f.physical,materials8a:f.materials,
  outpost5:f.store.serialize(),powerReport:f.report});
 let owner=q.materials8a,power=f.store.serialize(),packets=Conveyor.create(q.packets),result;
 for(let t=4;t<=24;t+=4){
  result=packets.advance({id:'8h-packet:glass-out',timeS:t,dtS:4,
   physical8a:f.physical,materials8a:owner,outpost5:power,
   body:world,starPos,luminosityW:luminosity});
  owner=result.materials8a;power=result.outpost5;packets=Conveyor.create(result.packets);
  close(owner.lots.reduce((s,x)=>s+x.massKg,0),beforeMass);
  if(result.completed)break;
 }
 assert.ok(result.completed,JSON.stringify(packets.snapshot()));
 assert.equal(packets.list()[0].status,'DELIVERED');
 assert.equal(owner.lots.find(x=>x.id===packets.list()[0].currentLotId).containerId,
  f.depot.state.containerId);
 assert.equal(owner.lots.find(x=>x.id===packets.list()[0].currentLotId).materialId,'glass');
 assert.equal(owner.lots.find(x=>x.id===packets.list()[0].currentLotId).provenance,f.glass.provenance);
 assert.ok(power.items.find(x=>x.id==='paid-real-power-bank').energyJ<beforePower);
 assert.equal(owner.operations.filter(x=>x.id.startsWith('8h-belt:')&&x.status==='COMMITTED').length,2);
 assert.equal(Conveyor.create(packets.snapshot()).list()[0].status,'DELIVERED');
 assert.throws(()=>Conveyor.create(packets.snapshot()).start({id:'8h-packet:glass-out',
  sourceLotId:f.glass.id,sourceId:f.plant.id,targetId:f.depot.id,
  driveIds:[f.drive.id],massKg:f.glass.massKg,bodyId,bodyRadius:radius,timeS:0,
  physical8a:f.physical,materials8a:owner,outpost5:power,powerReport:f.report}),/replay/);
 console.log('PASS real manufactured glass in same paid 8E machine hopper -> original 250W T02 native belt and 40kg tray -> paid receiving depot; no duplicate mass or power');
});
test('reverse powered route refuses a plant-to-plant imaginary endpoint and unpowered drive',()=>{
 const f=setup();
 const base={id:'8h-packet:deny',sourceLotId:f.glass.id,
  sourceId:f.plant.id,targetId:f.depot.id,driveIds:[f.drive.id],
  massKg:f.glass.massKg,bodyId,bodyRadius:radius,timeS:0,
  physical8a:f.physical,materials8a:f.materials,
  outpost5:f.store.serialize(),powerReport:f.report};
 assert.throws(()=>Conveyor.create().start({...base,targetId:f.plant.id}),/powered|endpoint|invalid|physical/i);
 const unplugged=structuredClone(base);unplugged.outpost5.wires=[];
 assert.throws(()=>Conveyor.create().start(unplugged),/powered|electrical|DISCONNECTED/);
});
