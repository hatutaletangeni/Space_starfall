'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/outposts.js');
require('../src/physics/power-ledger-t02.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/material-ledger8a.js');
const Kits=require('../src/physics/kit-recipes8f.js');
const Site=require('../src/physics/industrial-site8e.js');
const Port=require('../src/physics/pressure-pipe-power-port8h.js');
const O=globalThis.StarfallOutposts,T=globalThis.StarfallPowerLedgerT02;
const unit=t=>[Math.cos(t),Math.sin(t),0];
const body={id:'star-0-p0',systemId:'star-0',landable:true,
 kind:'moon',radius:1000,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0};
const assetId='facility8e:certified-pressure-pipe',kitLotId='8f:real-certified-pipe-kit';
function original(){
 const recipe=Kits.recipe('plant_kit_pressure_pipeline');
 const materials={schema:1,containers:[{id:'8d:ship-main:materials',
   kind:'original ship cargo',ownerId:'ship-main',maxMassKg:4000,maxVolumeM3:20}],
  lots:[{id:kitLotId,containerId:'8d:ship-main:materials',
   materialId:'plant_kit_pressure_pipeline',massKg:recipe.outputs.plant_kit_pressure_pipeline,
   volumeM3:recipe.outputVolumesM3.plant_kit_pressure_pipeline,grade:1,
   provenance:'8F consumed actual refined steel/copper/motor manufactured components'}],
  operations:[]};
 const physical={schema:1,assets:[],transfers:[]},local=unit(.05),shipLocal=unit(0);
 const quote=Site.quote({materials,physical,shipContainerId:'8d:ship-main:materials',
  kitLotId,bodyId:body.id,local,shipLocal,operatorLocal:local,bodyRadius:body.radius});
 const installed=Site.install({jobId:'plant8e:paid-pipe',assetId,
  materials,physical,shipContainerId:'8d:ship-main:materials',kitLotId,
  bodyId:body.id,local,shipLocal,operatorLocal:local,bodyRadius:body.radius,
  energyReceipt:{operationId:'plant8e:paid-pipe',
   sourceId:'ship-main:engineering-battery',usedJ:quote.workJ}});
 const outpost5={schema:1,seed:742,serial:1,lastTick:0,items:[{
  id:'real-paid-battery',bodyId:body.id,kind:'battery',local:unit(.025),
  facing:unit(0),height:3,temperatureK:290,condition:1,enabled:true,
  energyJ:2e6}],wires:[],relays:[],receipts:[],pending:[{
  obs:'real-original-science',labId:'science',deliverAt:50}],
  lastPoweredAt:{[body.id]:0},radioEnforced:true};
 return{recipe,materials,physical,installed,outpost5,local,quote};
}
test('8F made physical pressure pipeline from real mass-conserving components, 8E install consumes kit and ship energy',()=>{
 const f=original(),pump=f.installed.physical.assets[0];
 assert.equal(f.recipe.outputs.plant_kit_pressure_pipeline,320);
 assert.ok(f.recipe.inputs.steel>0&&f.recipe.inputs.electric_motor>0);
 assert.ok(Math.abs(Object.values(f.recipe.inputs).reduce((s,v)=>s+v,0)-320)<1e-8,
  'all finished physical components conserve exact 320kg within floating precision');
 assert.equal(f.quote.workJ,720000);
 assert.equal(f.installed.materials.lots.length,0);
 assert.equal(pump.massKg,320);
 assert.equal(pump.state.kitMaterialId,'plant_kit_pressure_pipeline');
 assert.equal(pump.state.station,'pressure_pipeline');
 assert.equal(pump.state.ratedPressurePa,8000000);
 const hold=f.installed.materials.containers.find(x=>x.id===pump.state.containerId);
 assert.ok(hold&&hold.ownerId===pump.id);
 assert.equal(hold.maxMassKg,25);
 assert.equal(hold.maxVolumeM3,.08);
 assert.match(hold.kind,/gas pipe/);
 assert.equal(f.installed.materials.lots.filter(x=>x.containerId===hold.id).length,0,
  'manufacturing installs an EMPTY original source-owned pipe; no gas appears');
 assert.ok(f.installed.physical.transfers.some(x=>x.assetId===assetId&&x.action==='INSTALL'&&x.status==='COMMITTED'));
});
test('certified 320kg 8 MPa pump can attach only a massless 420W T02 load, never a powered free building',()=>{
 const f=original();
 assert.throws(()=>new O.Store(742,f.outpost5).add('pressure_pipeline_pump',body,unit(.04),unit(0),()=>0),/paid manufactured/);
 const port=Port.attach({physical8a:f.installed.physical,materials8a:f.installed.materials,
  outpost5:f.outpost5,pipelineId:assetId,operatorLocal:f.local,
  bodyId:body.id,bodyRadius:body.radius,timeS:0});
 assert.equal(port.receipt.powerW,420);
 assert.equal(port.receipt.gasCreatedKg,0);
 assert.equal(port.receipt.energyProducedJ,0);
 assert.equal(port.receipt.gasTransferredKg,0);
 assert.equal(port.receipt.wireCreated,false);
 assert.equal(port.physical8a.assets[0].massKg,320);
 assert.equal(port.materials8a.lots.length,0);
 assert.equal(f.installed.physical.assets[0].state.t02LoadId,undefined);
 assert.deepEqual(f.outpost5.wires,[]);
 const grid=new O.Store(742,port.outpost5),power=port.receipt.portId;
 const before=T.grid(grid,body,[-1e6,0,0],1e18,0,0);
 assert.equal(before.byId[power].power,false,'port cannot work without REAL original electrical wire');
 assert.ok(grid.link('real-paid-battery',power,body));
 const previous=grid.items[0].energyJ,report=T.grid(grid,body,[-1e6,0,0],1e18,3,3);
 assert.equal(report.byId[power].power,true);
 assert.equal(report.byId[power].servedW,420);
 assert.ok(grid.items[0].energyJ<previous,'only original native T02 grid charges battery Joules');
 const outpost={...f.outpost5,...port.outpost5};
 assert.equal(outpost.pending.length,1);
 assert.equal(outpost.radioEnforced,true);
 assert.equal(outpost.lastPoweredAt[body.id],0);
 assert.throws(()=>Port.attach({physical8a:port.physical8a,materials8a:port.materials8a,
  outpost5:port.outpost5,pipelineId:assetId,operatorLocal:f.local,
  bodyId:body.id,bodyRadius:body.radius,timeS:3}),/already commissioned/);
});
test('fake mass, no consumed-kit receipt, off-world EVA and damaged pump fail with no source mutation',()=>{
 const f=original(),args={physical8a:f.installed.physical,materials8a:f.installed.materials,
 outpost5:f.outpost5,pipelineId:assetId,operatorLocal:f.local,
 bodyId:body.id,bodyRadius:body.radius,timeS:0};
 const original8A=structuredClone(f.installed.materials),native=structuredClone(f.outpost5);
 assert.throws(()=>Port.attach({...args,pipelineId:'free-gas'}),/certified 8 MPa/);
 assert.throws(()=>Port.attach({...args,operatorLocal:unit(.1)}),/EVA operator/);
 const fake=structuredClone(f.installed.physical);fake.transfers=[];
 assert.throws(()=>Port.attach({...args,physical8a:fake}),/installation kit receipt/);
 const damaged=structuredClone(f.installed.physical);damaged.assets[0].condition=.4;
 assert.throws(()=>Port.attach({...args,physical8a:damaged}),/certified 8 MPa/);
 assert.deepEqual(f.outpost5,native);
 assert.deepEqual(f.installed.materials,original8A);
});
