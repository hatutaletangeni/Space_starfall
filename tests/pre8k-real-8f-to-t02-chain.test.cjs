/* PRE-8K: unassisted (NO fabricated production receipts/stock) original
 * fresh manifest -> kit installation -> REAL 8F timed factory -> genuine
 * 8E process receipts -> original 8A lots -> 8I source-paid T02 modules.
 * This is a model-level proof, not a full physical human browser voyage.
 */
'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const cp=x=>JSON.parse(JSON.stringify(x));
const M=require('../src/physics/material-ledger8a.js');
const P=require('../src/physics/physical-inventory8a.js');
const S=require('../src/physics/starter-manifest8k.js');
const MI=require('../src/physics/machine-install8f.js');
require('../src/physics/kit-recipes8f.js');
require('../src/physics/stock-parts8f.js');
const F=require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const E=require('../src/physics/transformation8e.js');
const I=require('../src/physics/t02-paid-install8i.js');
const O=require('../src/physics/outposts.js');
const Power=require('../src/physics/power-ledger-t02.js');
const SHIP='8d:ship-main:materials',BODY='star-0-p0';
const RAD=1000,unit=d=>[Math.sin(d/RAD),Math.cos(d/RAD),0];
function init(){
 const container={id:SHIP,ownerId:'ship-main',kind:'ship materials',
   maxMassKg:9000,maxVolumeM3:16};
 const empty={schema:1,containers:[container],lots:[],operations:[]};
 const seed={schema:1,seed:742,startedAt:1762510000000};
 const fresh=S.prepare(empty,seed,null,SHIP);
 assert.equal(fresh.applied,true,'genuine one-time original 8A ship manifest');
 return {seed,starter:fresh.receipt,materials:fresh.materials,
  physical:P.create().serialize(),trans:E.create().snapshot(),
  factory:Factory.create().snapshot(),shipJ:90e6,simS:0,
  outpost:{schema:1,seed:742,items:[],wires:[],relays:[],receipts:[],serial:0}};
}
function installMachine(s,kind){
 const lot=s.materials.lots.find(x=>x.materialId===kind&&x.containerId===SHIP);
 assert.ok(lot,'Starter must contain one sealed '+kind);
 const q=MI.quote({lotId:lot.id,materials:s.materials,physical:s.physical,containerId:SHIP});
 assert.ok(s.shipJ>q.workJ);
 const result=MI.install({lotId:lot.id,materials:s.materials,physical:s.physical,
  containerId:SHIP,assetId:'machine8f:'+kind,operationId:'install8f:'+kind,
  energyReceipt:{operationId:'install8f:'+kind,usedJ:q.workJ,sourceId:'ship-main:engineering-battery'},
  shipLanded:true,operatorNear:true,workshopInstalled:true,
  shipPowerEnabled:true,bodyId:BODY});
 s.shipJ-=q.workJ;s.simS+=q.seconds;
 s.materials=result.materials;s.physical=result.physical;
 assert.equal(result.machine.massKg,q.massKg);
 assert.ok(!s.materials.lots.some(x=>x.id===lot.id));
 assert.ok(s.physical.assets.some(x=>x.id==='machine8f:'+kind));
 return result;
}
function machineFor(s,recipeId){
 const r=F.RECIPES[recipeId];assert.ok(r,recipeId);
 const builtins={
  bench:{'hand-shear':'ship-main:low-tech-bench',
   'bending-brake':'ship-main:low-tech-bench',
   'glass-cutter':'ship-main:low-tech-bench'},
  wire:{'wire-die':'ship-main:wire-die'},
  assembly:{'kit-fixture':'ship-main:kit-fixture'}
 };
 const id=builtins[r.station]?.[r.tool];
 if(id)return{id,station:r.station,tools:[r.tool],installed:true,condition:1};
 const owned=s.physical.assets.find(x=>x.type==='industrial_machine'&&
  x.location?.kind==='ship'&&x.location.slot==='workshop'&&
  x.state?.station===r.station&&x.state?.tools?.includes(r.tool));
 assert.ok(owned,'Must install the physical '+r.station+' / '+r.tool+' kit first');
 return{id:owned.id,station:r.station,tools:owned.state.tools,installed:true,condition:owned.condition};
}
function fabricate(s,id){
 const machine=machineFor(s,id),factory=Factory.create(s.factory);
 const quote=Factory.quote({recipeId:id,materials:s.materials,
  sourceContainerId:SHIP,outputContainerId:SHIP,machine});
 assert.ok(quote.energyJ>0);
 assert.ok(s.shipJ>=quote.energyJ,'original ship battery exhausted during '+id);
 const job=factory.start({recipeId:id,materials:s.materials,
  sourceContainerId:SHIP,outputContainerId:SHIP,machine,
  shipLanded:true,bodyId:BODY,powerEnabled:true,batteryJ:s.shipJ});
 assert.equal(job.recipeId,id);
 const before=s.shipJ;
 while(factory.active){
  const q=factory.active;
  const step=factory.step(Math.min(10,q.seconds-q.elapsedS),s.shipJ,true);
  assert.ok(step.usedJ>=0);
  s.shipJ-=step.usedJ;
  s.simS+=Math.min(10,q.seconds-q.elapsedS);
  if(step.completed)break;
 }
 const result=factory.commit({materials:s.materials,
  transformer:E.create(s.trans),machine});
 assert.equal(result.receipt.status,'COMMITTED');
 assert.equal(result.receipt.recipeId,id);
 assert.ok(Math.abs(before-s.shipJ-quote.energyJ)<1e-4,
  '8F machine work must be physically debited from original ship battery');
 const source=E.create(result.transformations).snapshot();
 assert.ok(source.operations.some(x=>x.id===job.id&&x.status==='COMMITTED'),
  '8E immutable conversion receipt not issued');
 s.materials=M.create(result.materials).snapshot();
 s.trans=source;
 s.factory=result.factory;
 assert.ok(s.materials.lots.some(x=>x.materialId===id&&x.provenance==='process:'+job.id),
  'Actual finished 8F lot must have source-owned manufacturing provenance');
 return result.receipt;
}
function installDevice(s,kind,distance,seq){
 const spec=I.SPECS[kind];
 const lots=s.materials.lots.filter(x=>x.materialId===spec.part&&x.containerId===SHIP);
 const ids=lots.map(x=>x.id);
 const key='t02paid8i:'+seq,local=unit(distance),shipLocal=unit(0),evaLocal=unit(68);
 const a={operationId:key,kind,bodyId:BODY,containerId:SHIP,
  local,shipLocal,evaLocal,bodyRadius:RAD,lotIds:ids,
  materials:s.materials,factory:s.factory,transformations:s.trans,outpost:s.outpost,
  startedAtS:s.simS,nowS:s.simS+spec.seconds,
  shipLanded:true,operatorEVA:true,shipPowered:true,
  shipEnergyJ:s.shipJ,energyReceipt:{operationId:key,status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}};
 const q=I.quote(a);assert.equal(q.ready,true);
 assert.equal(q.sourceJobs.length,kind==='solar'?1:8);
 assert.equal(q.massKg,spec.kg);
 const originalKg=s.materials.lots.reduce((sum,x)=>sum+x.massKg,0);
 const r=I.install(a),left=r.materials.lots.reduce((sum,x)=>sum+x.massKg,0);
 assert.ok(Math.abs(originalKg-left-spec.kg)<1e-6,
  'Installed hardware must be exactly one original 8A stock mass debit');
 assert.equal(r.receipt.sourceBatteryJBefore-r.receipt.sourceBatteryJAfter,spec.workJ);
 assert.equal(r.item.energyJ,0,'no solar generation storage or free battery charge');
 assert.equal(r.item.paidCertified8I,true);
 s.shipJ=r.shipEnergyJ;s.simS+=spec.seconds;
 s.materials=M.create(r.materials).snapshot();
 s.outpost=r.outpost;
 return r;
}
test('REAL fresh manifest -> 3 installed 8F machine kits -> 2 actual solar panels + 8 actual cells -> 48V T02 power, no fake receipts',()=>{
 const s=init(),starterMass=s.materials.lots.reduce((a,x)=>a+x.massKg,0),
  starterPhysicalMass=s.physical.assets.reduce((a,x)=>a+x.massKg,0);
 assert.equal(S.prepare(s.materials,s.seed,s.starter,SHIP).applied,false);
 for(const kit of ['machine_kit_extruder','machine_kit_laminator','machine_kit_battery'])
  installMachine(s,kit);
 assert.equal(s.physical.assets.filter(x=>x.type==='industrial_machine').length,3);
 for(let i=0;i<2;i++)fabricate(s,'aluminum_frame');
 fabricate(s,'copper_wire');
 fabricate(s,'insulated_wire');
 for(let i=0;i<8;i++)fabricate(s,'cell_casing');
 for(let i=0;i<2;i++)fabricate(s,'solar_module');
 for(let i=0;i<8;i++)fabricate(s,'battery_cell');
 const produced=s.factory.receipts.filter(x=>x.status==='COMMITTED');
 assert.equal(produced.length,2+1+1+8+2+8);
 assert.ok(produced.every(x=>s.trans.operations.some(y=>y.id===x.id&&y.status==='COMMITTED')));
 const pv1=installDevice(s,'solar',55,1),pv2=installDevice(s,'solar',68,2),
   pack=installDevice(s,'battery',81,3);
 assert.equal(s.outpost.items.length,3);
 assert.equal(pack.item.ratedCapacityJ,9600000);
 assert.equal(pack.item.energyJ,0);
 assert.equal(pv1.item.ratedSolarW,400);
 const totalKg=s.materials.lots.reduce((a,x)=>a+x.massKg,0)+
  s.physical.assets.reduce((a,x)=>a+x.massKg,0)+
  s.outpost.items.reduce((a,x)=>a+x.installedMassKg,0);
 const initialKg=starterMass+starterPhysicalMass;
 assert.ok(Math.abs(totalKg-initialKg)<1e-5,
  'All shipped input mass remains either 8A stock, installed machinery, actual T02 equipment or physical factory scrap');
 // The original T02 bus must actually receive the paid nodes from the
 // installed physical outpost record, not an invented 72MJ or 4kW legacy node.
 const persisted=cp(s.outpost);
 const receiptOnly={freshExpedition:s.seed,materials8a:s.materials};
 const prev=globalThis.SF;
 try{
  globalThis.SF={load:()=>receiptOnly};
  const owner=new O.Store(742,persisted);
  assert.equal(owner.items.length,3);
  assert.ok(owner.items.every(x=>x.paidCertified8I===true));
  assert.equal(O.ratedSpec(owner.items[0]).solarW,400);
  assert.equal(O.ratedSpec(owner.items[2]).capacityJ,9600000);
 }finally{if(prev===undefined)delete globalThis.SF;else globalThis.SF=prev;}
 const once=cp(s.materials);
 assert.ok(once.operations.filter(x=>x.kind==='T02_PAID_INSTALL_8I').length===3);
 assert.ok(s.shipJ<90e6&&s.simS>5000,'real 8F production and installation time and battery work were consumed');
 assert.throws(()=>I.install({...{
  operationId:'t02paid8i:4',kind:'battery',bodyId:BODY,containerId:SHIP,
  local:unit(90),shipLocal:unit(0),evaLocal:unit(68),bodyRadius:RAD,
  materials:s.materials,factory:s.factory,transformations:s.trans,outpost:s.outpost,
  lotIds:s.materials.lots.filter(x=>x.materialId==='battery_cell').map(x=>x.id),
  startedAtS:s.simS,nowS:s.simS+600,shipLanded:true,operatorEVA:true,shipPowered:true,
  shipEnergyJ:s.shipJ,
  energyReceipt:{operationId:'t02paid8i:4',status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:450000}
 }}),/needs|requires|part|lot/i,'no free second battery without real electrode inputs');
});
