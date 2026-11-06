'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const A=require('../src/physics/material-ledger8a.js');
const P=require('../src/physics/physical-inventory8a.js');
const S=require('../src/physics/industrial-site8e.js');
const C=require('../src/physics/industrial-chemistry8e.js');
const E=require('../src/physics/industrial-plant8e.js');
const D=require('../src/physics/industrial-dry-feed8h.js');
const local=a=>[Math.sin(a),Math.cos(a),0],R=1000,bodyId='star-0-p0';
const total=m=>m.lots.reduce((s,x)=>s+x.massKg,0);
function build(){
 const ship='8d:ship-main:materials',ledger=A.create();
 ledger.registerContainer({id:ship,ownerId:'ship-main',
  kind:'ship materials',maxMassKg:9000,maxVolumeM3:15});
 for(const [i,id] of ['plant_kit_glass_furnace','plant_kit_cargo_depot'].entries()){
  const k=S.KITS[id];ledger.importLot({id:'real8f:kit:'+i,
   materialId:id,containerId:ship,massKg:k.massKg,volumeM3:k.volumeM3,
   grade:1,provenance:'actual-original-8F-machine-part-assembly'});
 }
 ledger.importLot({id:'original:assayed:silica',materialId:'silicon_dioxide',
  containerId:ship,massKg:15,volumeM3:.02,grade:1,
  provenance:'original-8C-8D-8E-physical-ore-purification'});
 let materials=ledger.snapshot(),physical=P.create().serialize();
 function install(i,asset,loc){
  const kit=materials.lots.find(x=>x.id==='real8f:kit:'+i);
  const jobId='plant8e:real:'+i,k=S.KITS[kit.materialId];
  const q=S.install({jobId,assetId:asset,materials,physical,
   shipContainerId:ship,kitLotId:kit.id,bodyId,bodyRadius:R,
   local:local(loc),shipLocal:local(0),operatorLocal:local(.060),
   energyReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
    usedJ:k.workJ,status:'COMMITTED'}});
  assert.equal(q.duplicate,false);
  materials=q.materials;physical=q.physical;return q.machine;
 }
 const station=install(0,'facility8e:physical-glass-furnace',.050);
 const depot=install(1,'facility8e:physically-installed-receiving-dock',.069);
 assert.equal(station.state.dryFeedContainerId,'plantfeed8h:'+station.id);
 assert.equal(materials.containers.find(x=>x.id===station.state.dryFeedContainerId).maxMassKg,120);
 assert.equal(materials.lots.filter(x=>x.containerId===station.state.dryFeedContainerId).length,0);
 // A credible ledger receipt is not a material grant: reserve and commit
 // actual original ship material to the REAL depot before creating the
 // physical packet-done fixture. A separate live browser test must still
 // prove actual powered original 250W T02 belt movement.
 const next=A.create(materials);
 next.reserve('8h-belt:actual-1:1','original:assayed:silica',depot.state.containerId,12);
 const received=next.commit('8h-belt:actual-1:1');
 materials=next.snapshot();
 const packet={id:'8h-packet:actual-1',status:'DELIVERED',bodyId,
  sourceId:'facility8e:origin-dock',targetId:depot.id,
  currentLotId:received.outputLotId,materialId:'silicon_dioxide',
  massKg:12};
 return{materials8a:materials,physical8a:physical,
  conveyorPackets8h:{schema:1,jobs:[packet]},station,depot,
  sourceLotId:received.outputLotId,operatorLocal:local(.060),bodyId,
  bodyRadius:R,operatorEVA:true,landed:true,ship};
}
function args(f,patch={}){
 return{...f,id:'8h-dry-feed:1',
  sourceLotId:f.sourceLotId,sourceDepotId:f.depot.id,
  stationId:f.station.id,massKg:2,...patch};
}
test('genuine paid original 8E station kit produces EMPTY bounded original 8A real surface dry hopper, source physically delivered to dock',()=>{
 const f=build(),before=structuredClone(f.materials8a);
 const got=D.transfer(args(f));
 assert.equal(got.duplicate,false);
 assert.equal(got.receipt.mode,'EVA_MANUAL_LAST_METRE');
 assert.equal(got.receipt.status,'COMMITTED');
 assert.equal(got.receipt.outputLotId,'transfer:8h-dry-feed:1');
 assert.equal(got.energyGrantedJ,0);
 assert.equal(got.gasCreatedKg,0);
 assert.equal(got.targetContainerId,f.station.state.dryFeedContainerId);
 assert.deepEqual(f.materials8a,before,'pure proof cannot mutate original material owner');
 assert.equal(got.materials8a.operations.filter(x=>x.status==='COMMITTED').length,2);
 assert.ok(got.materials8a.lots.some(x=>x.id===got.receipt.outputLotId&&
  x.containerId===f.station.state.dryFeedContainerId));
 assert.equal(total(before),total(got.materials8a),'original 8A mass must be conserved');
 const replay=D.transfer(args(f,{materials8a:got.materials8a}));
 assert.equal(replay.duplicate,true);
 assert.deepEqual(replay.materials8a,got.materials8a);
 const plant=E.create().process({id:'chemical:glass:1',
  reactionId:'glass_fusing',scaleMol:10,
  materials:got.materials8a,sourceContainerId:got.targetContainerId,
  destinations:{glass:f.ship},assetState:f.physical8a,
  station:{id:f.station.id,kind:'glass_furnace',
   tools:f.station.state.tools,physicalAssetId:f.station.id,
   installed:true,enabled:true,condition:1,bodyId,
   sourceContainerId:got.targetContainerId},
  energyReceipt:{operationId:'chemical:glass:1',
   sourceId:'ship-main:engineering-battery',
   usedJ:C.batch('glass_fusing',10).energyJ},bodyId});
 assert.ok(plant.materials.lots.some(l=>l.materialId==='glass'));
 assert.equal(plant.receipt.status,'COMMITTED');
 assert.equal(plant.receipt.inputs.silicon_dioxide,C.batch('glass_fusing',10).inputs.silicon_dioxide);
 assert.equal(total(plant.materials),total(got.materials8a),
  'paid original industrial transformation conserves real solid mass');
});
function reject(title,patch,expr){test('reject '+title,()=>{
 const f=build(),a=args(f);patch(a,f);
 assert.throws(()=>D.transfer(a),expr);
 assert.equal(f.materials8a.lots.filter(x=>x.containerId===f.station.state.dryFeedContainerId).length,0);
});}
reject('no original verified 250W T02 conveyor delivery archive',(a,f)=>{a.conveyorPackets8h.jobs=[]},/DELIVERED|conveyor/i);
reject('forged packet without ORIGINAL 8A committed conveyor arrival receipt',(a,f)=>{a.materials8a.operations=a.materials8a.operations.filter(o=>!o.id.startsWith('8h-belt:'))},/both|arrival|receipt/i);
reject('UNPAID kit installation missing',(a,f)=>{a.physical8a.transfers=f.physical8a.transfers.filter(x=>x.assetId!==f.station.id)},/paid/i);
reject('wrong body teleport',(a)=>{a.bodyId='star-0-p2'},/same-world/i);
reject('operator NOT on physical EVA',(a)=>{a.operatorEVA=false},/EVA|operator/i);
reject('operator too far from paid plant',(a)=>{a.operatorLocal=local(.12)},/carry|reach/i);
reject('gas cannot be delivered as dry ore',(a,f)=>{a.materials8a.lots.find(x=>x.id===f.sourceLotId).materialId='oxygen'},/gas|liquid/i);
reject('without actual source lot',(a)=>{a.sourceLotId='fictional-gift'},/DELIVERED|conveyor/i);
reject('more than 20kg manually carried',(a)=>{a.massKg=21},/20kg/i);
reject('too much real depot original 8A source',(a)=>{a.massKg=13},/source|absent/i);
reject('damaged original physical station',(a,f)=>{a.physical8a.assets.find(x=>x.id===f.station.id).condition=.3},/paid|chemical/i);
reject('fake built-in hopper',(a,f)=>{a.materials8a.containers=a.materials8a.containers.filter(x=>x.id!==f.station.state.dryFeedContainerId)},/hopper/i);
test('runtime ships actual separate feed source into source-owned 8E quote/start/commit, legacy 8E ship mode still default',()=>{
 const flight=fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8'),
  ui=fs.readFileSync(path.join(__dirname,'../src/physics/industrial-site-ui8e.js'),'utf8'),
  html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(flight,/function industrialQuote8E\(reactionId,stationId,scaleMol=100,sourceMode='ship'\)/);
 assert.match(flight,/function industrialStart8E\(reactionId,stationId,scaleMol=100,sourceMode='ship'\)/);
 assert.match(flight,/industrialEquipment8E\(a.reactionId,a.stationId,a.sourceMode\|\|'ship'\)/);
 assert.match(flight,/function industrialDryFeedTransfer8H\(/);
 assert.match(flight,/conveyorPackets8h:conveyorPackets8h.snapshot\(\)/);
 assert.match(ui,/ACTUAL 8A SURFACE PLANT FEED HOPPER/);
 assert.match(ui,/sourceMode.value/);
 assert.ok(html.indexOf('src/physics/industrial-dry-feed8h.js')>=0);
 assert.ok(html.indexOf('src/physics/industrial-dry-feed8h.js')<html.indexOf('src/flight.js'));
 assert.ok(html.indexOf('src/physics/industrial-dry-feed-ui8h.js')>html.indexOf('src/flight.js'));
});
