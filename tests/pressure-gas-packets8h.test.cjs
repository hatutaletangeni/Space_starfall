'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/kit-recipes8f.js');
const Site=require('../src/physics/industrial-site8e.js'),
 Port=require('../src/physics/pressure-pipe-power-port8h.js'),
 Gas=require('../src/physics/pressure-gas-packets8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const unit=t=>[Math.cos(t),Math.sin(t),0];
const body={id:'star-0-p0',systemId:'star-0',kind:'moon',landable:true,
 radius:1000,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const star=[-1000000,0,0],L=1e18,R=8.314462618,tk=293.15;
const ids=['facility8e:source-o2','facility8e:pipe-o2','facility8e:target-o2'];
function fixture(){
 const kinds=['vessel_kit_oxygen','plant_kit_pressure_pipeline','vessel_kit_oxygen'],
  angles=[-.0105,0,.0105],originalLotIds=kinds.map((_,i)=>'paid-factory-kit:'+i);
 let materials8a={schema:1,containers:[{id:'8d:ship-main:materials',
  ownerId:'ship-main',kind:'real ship cargo',maxMassKg:4000,maxVolumeM3:15}],
  lots:kinds.map((x,i)=>({id:originalLotIds[i],containerId:'8d:ship-main:materials',
   materialId:x,massKg:Site.KITS[x].massKg,volumeM3:Site.KITS[x].volumeM3,
   grade:1,provenance:'8F actual manufactured certified finished parts'})),
  operations:[]},
 physical8a={schema:1,assets:[],transfers:[]};
 const shipLocal=unit(-.055);
 for(let i=0;i<3;i++){
  const jobId='plant8e:real-pipe:'+i,local=unit(angles[i]);
  const params={materials:materials8a,physical:physical8a,
   shipContainerId:'8d:ship-main:materials',kitLotId:originalLotIds[i],
   bodyId:body.id,bodyRadius:body.radius,local,shipLocal,operatorLocal:local};
  const quote=Site.quote(params);
  const installed=Site.install({jobId,assetId:ids[i],...params,
   energyReceipt:{operationId:jobId,sourceId:'ship-main:engineering-battery',
    usedJ:quote.workJ}});
  materials8a=installed.materials;physical8a=installed.physical;
 }
 assert.equal(materials8a.lots.length,0);
 assert.equal(physical8a.assets.reduce((s,x)=>s+x.massKg,0),710);
 const ledger=globalThis.StarfallMaterials8A.create(materials8a);
 const actualOxygenSource='chemical:real-offline-electrolysis:oxygen';
 const volumeM3=(3/Gas.MOL.oxygen)*R*tk/5e6;
 ledger.importLot({id:actualOxygenSource,containerId:'vessel8e:'+ids[0],
  materialId:'oxygen',massKg:3,volumeM3,grade:1,
  provenance:'chemical:real-offline-electrolysis'});
 materials8a=ledger.snapshot();
 const outpost5={schema:1,seed:742,serial:1,lastTick:0,items:[{
  id:'real-battery',bodyId:body.id,kind:'battery',local:unit(.005),
  facing:unit(0),height:3,temperatureK:290,condition:1,
  enabled:true,energyJ:5e6}],wires:[],relays:[],receipts:[]};
 const added=Port.attach({physical8a,materials8a,outpost5,pipelineId:ids[1],
  operatorLocal:unit(0),bodyId:body.id,bodyRadius:body.radius,timeS:0});
 physical8a=added.physical8a;
 const native=new O.Store(742,added.outpost5);
 assert.ok(native.link('real-battery',added.receipt.portId,body));
 const initial=T.grid(native,body,star,L,0,0);
 assert.equal(initial.byId[added.receipt.portId].power,true);
 const packets=Gas.create();
 return {physical8a,materials8a,native,packets:packets.snapshot(),
  sourceLotId:actualOxygenSource,portId:added.receipt.portId,initial};
}
function start(f,id='real-gas-1'){
 const api=Gas.create(f.packets),outpost5=f.native.serialize();
 const q=api.start({id,sourceLotId:f.sourceLotId,
  sourceId:ids[0],pipeId:ids[1],targetId:ids[2],
  massKg:3,bodyId:body.id,bodyRadius:body.radius,timeS:0,
  physical8a:f.physical8a,materials8a:f.materials8a,
  outpost5,powerReport:f.initial,operatorLocal:unit(0)});
 f.packets=q.packets;f.materials8a=q.materials8a;
 assert.equal(q.receipt.status,'RESERVED');
 assert.equal(q.receipt.gasCreatedKg,0);
 assert.equal(f.materials8a.lots.length,1,'source remains actual physical vessel before powered movement');
 return q;
}
function tick(f,t){
 const power=T.grid(f.native,body,star,L,t,3),outpost5=f.native.serialize(),
  before=outpost5.items[0].energyJ,model=Gas.create(f.packets),
  q=model.observe({packets:f.packets,materials8a:f.materials8a,
   physical8a:f.physical8a,outpost5,powerReport:power,
   bodyId:body.id,bodyRadius:body.radius,timeS:t});
 assert.equal(q.additionalElectricalDebitJ,0,'8H gas observer must never charge 420W a second time');
 assert.equal(f.native.items[0].energyJ,before);
 assert.equal(q.gasCreatedKg,0);
 const old=f.materials8a.lots.reduce((s,x)=>s+x.massKg,0),
  moved=q.materials8a.lots.reduce((s,x)=>s+x.massKg,0);
 assert.ok(Math.abs(moved-old)<1e-7,'original 8A gas mass exact custody');
 f.packets=q.packets;f.materials8a=q.materials8a;
 return {q,power};
}
test('real paid source vessel→rated 80L physical pipe→different paid rated vessel, never free gas or second battery debit',()=>{
 const f=fixture(),original=structuredClone(f.materials8a),
  energy=f.native.items[0].energyJ;
 start(f);
 assert.equal(f.materials8a.operations.find(x=>x.id==='8h-gas:real-gas-1:0').status,'RESERVED');
 assert.equal(f.materials8a.lots[0].containerId,'vessel8e:'+ids[0]);
 let steps=[],pipeS=null;
 assert.ok(f.packets.jobs[0].requiredCompressionJ>1e6,
  'this 420W pump must physically pay >1 MJ to compress 3kg O2 from underfilled vessel');
 assert.ok(f.packets.jobs[0].remainingS>2000,
  'a source that actually holds 3kg O2 in 4m³ cannot fill an 80L pipe in 16 seconds on 420W');
 for(let t=3;t<=6000;t+=3){
  const {q,power}=tick(f,t);
  assert.equal(power.byId[f.portId].servedW,420);
  steps.push(q.stage);
  if(q.stage===1&&!pipeS)pipeS=t;
  if(f.packets.jobs[0].status==='DELIVERED')break;
 }
 assert.ok(pipeS>2000,
  'original 420W T02 must pay realistic isothermal compression work before source→pipe');
 assert.ok(f.packets.jobs[0].totalPaidJ>=f.packets.jobs[0].requiredCompressionJ-1e-4,
  'native T02 must actually have consumed enough energy for original ideal-gas compression');
 assert.ok(steps.includes(0)&&steps.includes(1)&&steps.includes(2));
 assert.equal(f.packets.jobs[0].status,'DELIVERED');
 assert.equal(f.materials8a.lots.length,1);
 assert.equal(f.materials8a.lots[0].containerId,'vessel8e:'+ids[2]);
 assert.equal(f.materials8a.lots[0].materialId,'oxygen');
 assert.equal(f.materials8a.lots[0].massKg,3);
 assert.ok(f.native.items[0].energyJ<energy,'original T02 battery genuinely paid');
 assert.equal(original.lots[0].containerId,'vessel8e:'+ids[0],'source fixture unchanged');
 assert.equal(f.materials8a.operations.filter(x=>x.status==='COMMITTED').length,2);
});
test('real unplugged native 48V pump stops shipment INSIDE finite rated pipe and replay is inert',()=>{
 const f=fixture();start(f);
 let firstHopAt=null;
 for(let t=3;t<=6000;t+=3){
  tick(f,t);
  if(f.packets.jobs[0].stage===1){firstHopAt=t;break;}
 }
 assert.ok(firstHopAt>2000,'original pump must truly pay thermodynamic pressure work');
 assert.equal(f.packets.jobs[0].stage,1);
 assert.equal(f.materials8a.lots[0].containerId,'pressurepipe8h:'+ids[1]);
 const lockedMass=f.materials8a.lots[0].massKg;
 f.native.wires=[];
 const {q,power}=tick(f,firstHopAt+3);
 assert.equal(power.byId[f.portId].power,false);
 assert.match(q.status,/PAUSED_/);
 assert.equal(f.materials8a.lots[0].massKg,lockedMass);
 assert.equal(f.materials8a.lots[0].containerId,'pressurepipe8h:'+ids[1]);
 assert.ok(q.pipePressurePa>0&&q.pipePressurePa<8e6);
 const replay=Gas.create(f.packets).observe({packets:f.packets,
  materials8a:f.materials8a,physical8a:f.physical8a,
  outpost5:f.native.serialize(),powerReport:power,
  bodyId:body.id,bodyRadius:body.radius,timeS:firstHopAt+3});
 assert.equal(replay.changed,false);
 assert.equal(replay.reason,'DUPLICATE_OR_OLD_T02_TICK');
});
test('pressure law fails closed for excessive H2 and no original T02 wiring, without inventing mass or energy',()=>{
 const f=fixture();
 const zero=structuredClone(f.materials8a),energy=f.native.items[0].energyJ;
 f.native.wires=[];
 assert.throws(()=>start(f),/native T02 420W wiring/);
 assert.deepEqual(f.materials8a,zero);
 assert.equal(f.native.items[0].energyJ,energy);
 const o2=Gas.pressure([],.08,{materialId:'oxygen',massKg:3});
 const h2=Gas.pressure([],.08,{materialId:'hydrogen',massKg:3});
 assert.ok(o2>1e6&&o2<8e6);
 assert.ok(h2>8e6,'same real compressed mass of H2 exceeds 8MPa safe rated line');
});
test('100x/unloaded clock skips cannot teleport gas and genuine later paid step resumes',()=>{
 const f=fixture();start(f);
 const report=T.grid(f.native,body,star,L,30,30);
 const gap=Gas.create(f.packets).observe({packets:f.packets,
  materials8a:f.materials8a,physical8a:f.physical8a,
  outpost5:f.native.serialize(),powerReport:report,
  bodyId:body.id,bodyRadius:body.radius,timeS:30});
 assert.equal(gap.changed,true);
 assert.equal(gap.reason,'PAUSED_UNOBSERVED_CLOCK');
 assert.equal(gap.materials8a.lots[0].containerId,'vessel8e:'+ids[0]);
 const resumePower=T.grid(f.native,body,star,L,33,3);
 const resume=Gas.create(gap.packets).observe({packets:gap.packets,
  materials8a:gap.materials8a,physical8a:f.physical8a,
  outpost5:f.native.serialize(),powerReport:resumePower,
  bodyId:body.id,bodyRadius:body.radius,timeS:33});
 assert.equal(resume.changed,true);
 assert.equal(resume.stage,0);
 assert.ok(resume.remainingS<gap.packets.jobs[0].remainingS);
 assert.equal(resume.materials8a.lots[0].containerId,'vessel8e:'+ids[0]);
});
