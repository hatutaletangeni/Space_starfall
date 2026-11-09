/* Pre-8K ORIGINAL source-owned 8A/8F/8E -> T02 chain.
 * NO fake manufactured-part lots, synthetic COMMITTED 8F receipts, freely
 * spawned industrial machines, restored charged battery or natural-ore claim.
 * Specialist inputs explicitly come from finite predeparture goods.
 */
'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const M=require('../src/physics/material-ledger8a.js'),P=require('../src/physics/physical-inventory8a.js');
const S=require('../src/physics/starter-manifest8k.js'),K=require('../src/physics/machine-install8f.js');
const T=require('../src/physics/transformation8e.js');
require('../src/physics/kit-recipes8f.js');
require('../src/physics/stock-parts8f.js');
const R=require('../src/physics/manufacturing8f.js'),F=require('../src/physics/factory8f.js');
const I=require('../src/physics/t02-paid-install8i.js');
const O=require('../src/physics/outposts.js'),DC=require('../src/physics/power-ledger-t02.js');
const HOLD='8d:ship-main:materials',BODY='star-0-p0',ENERGY=150000000;
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<=t,String(a)+' != '+String(b));
function expedition(){
 const blank={schema:1,containers:[{id:HOLD,ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16}],lots:[],operations:[]};
 const manifest=S.prepare(blank,{schema:1,seed:742,startedAt:1762510000000},null,HOLD);
 assert.equal(manifest.applied,true);
 let m=M.create(manifest.materials),p=P.create(),f=F.create(),t=T.create(),
   joules=ENERGY,billed=0,time=100,serial=0;
 const beforeMass=manifest.materials.lots.reduce((a,x)=>a+x.massKg,0);
 const originalTruck=p.get('truck-expedition-001'),originalRover=p.get('rover-science-001');
 function debit(j){
  assert.ok(j>0&&joules>=j,'Actual original ship battery missing construction energy');
  joules-=j;billed+=j;
 }
 function installKit(kind){
  const lot=m.inventory(HOLD).find(x=>x.materialId===kind);
  assert.ok(lot,'original machine kit missing: '+kind);
  const q=K.quote({lotId:lot.id,materials:m.snapshot(),physical:p.serialize(),containerId:HOLD});
  const id='machine8f:'+(++serial),op='install8f:'+serial;
  const installed=K.install({lotId:lot.id,materials:m.snapshot(),physical:p.serialize(),
   containerId:HOLD,assetId:id,operationId:op,
   energyReceipt:{operationId:op,usedJ:q.workJ,sourceId:'ship-main:engineering-battery'},
   shipLanded:true,operatorNear:true,workshopInstalled:true,shipPowerEnabled:true,bodyId:BODY});
  debit(q.workJ);time+=q.seconds;m=M.create(installed.materials);p=P.create(installed.physical);
  assert.equal(p.get(id).type,'industrial_machine');
 }
 for(const kit of ['machine_kit_extruder','machine_kit_laminator','machine_kit_battery'])installKit(kit);
 function machine(recipeId){
  const recipe=R.RECIPES[recipeId];
  assert.ok(recipe,'Unknown certified recipe '+recipeId);
  if(recipe.station==='bench')return{id:'ship-main:fabrication:low-tech-bench',station:'bench',
    installed:true,condition:1,tools:['hand-shear','bending-brake','glass-cutter']};
  if(recipe.station==='wire')return{id:'ship-main:fabrication:wire-die',station:'wire',
    installed:true,condition:1,tools:['wire-die']};
  const asset=p.list().find(x=>x.type==='industrial_machine'&&x.state.station===recipe.station&&
   x.state.tools.includes(recipe.tool));
  assert.ok(asset,'Paid tool absent for '+recipeId);
  return{id:asset.id,station:recipe.station,tools:asset.state.tools,installed:true,condition:asset.condition};
 }
 function make(recipeId){
  const station=machine(recipeId),bom=F.billOfMaterials(recipeId);
  const opts={recipeId,sourceContainerId:HOLD,outputContainerId:HOLD,machine:station};
  F.quote({...opts,materials:m.snapshot()});
  const job=f.start({...opts,materials:m.snapshot(),shipLanded:true,bodyId:BODY,
   powerEnabled:true,batteryJ:joules});
  let used=0,done=false,ticks=0;
  while(!done){
   assert.ok(++ticks<300,'Manufacturing work did not complete');
   const step=f.step(10,joules,true);
   debit(step.usedJ);used+=step.usedJ;done=step.completed;
  }
  time+=bom.seconds;close(used,bom.energyJ);
  const result=f.commit({materials:m.snapshot(),transformer:T.create(t.snapshot()),machine:station});
  assert.equal(result.receipt.id,job.id);
  assert.equal(result.receipt.status,'COMMITTED');
  assert.ok(result.transformations.operations.some(x=>x.id===job.id&&x.status==='COMMITTED'));
  m=M.create(result.materials);t=T.create(result.transformations);f.apply(result.factory);
 }
 for(let j=0;j<2;j++)make('aluminum_frame');
 for(let j=0;j<8;j++)make('cell_casing');
 make('copper_wire');make('insulated_wire');
 for(let j=0;j<2;j++)make('solar_module');
 for(let j=0;j<8;j++)make('battery_cell');
 assert.equal(f.receipts.length,22);
 const lots=kind=>m.inventory(HOLD).filter(x=>x.materialId===kind);
 close(lots('solar_module').reduce((a,x)=>a+x.massKg,0),17.6);
 close(lots('battery_cell').reduce((a,x)=>a+x.massKg,0),15.6);
 const sites=[.018,.027,.036],kinds=['solar','solar','battery'];
 let out=new O.Store(742),ids=[];
 globalThis.SF={load:()=>({materials8a:m.snapshot(),freshExpedition:{schema:1}})};
 try{
  for(let j=0;j<3;j++){
   const theta=sites[j],local=[Math.sin(theta),Math.cos(theta),0],kind=kinds[j],
    spec=I.SPECS[kind],op='t02paid8i:'+(j+1);
   const input={operationId:op,kind,bodyId:BODY,local,shipLocal:[0,1,0],evaLocal:local,
    bodyRadius:2150,containerId:HOLD,lotIds:lots(spec.part).map(x=>x.id),
    materials:m.snapshot(),factory:f.snapshot(),transformations:t.snapshot(),
    outpost:out.serialize(),startedAtS:time,nowS:time+spec.seconds,
    shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:joules,
    energyReceipt:{operationId:op,status:'COMMITTED',sourceId:'ship-main:engineering-battery',
      usedJ:spec.workJ}};
   assert.equal(I.quote(input).requiredJ,spec.workJ);
   const committed=I.install(input);
   assert.equal(committed.receipt.status,'COMMITTED');
   debit(spec.workJ);close(joules,committed.shipEnergyJ);
   m=M.create(committed.materials);out=new O.Store(742,committed.outpost);
   time+=spec.seconds;ids.push(committed.item.id);
   assert.equal(out.items.filter(x=>x.paidCertified8I).length,j+1);
   assert.ok(out.items.every(x=>x.energyJ===0),'No charged battery or free initial solar');
  }
  assert.equal(m.operations().filter(x=>x.kind==='T02_PAID_INSTALL_8I').length,3);
  const body={id:BODY,radius:2150,kind:'moon',position:[0,0,0],spinAngle:0,spinAxis:[0,1,0]};
  assert.equal(out.link(ids[0],ids[2],body),true);
  assert.equal(out.link(ids[1],ids[2],body),true);
  const sunlight=[0,10000,0],ratedFlux=4*Math.PI*7850*7850*2000;
  const day=DC.grid(out,body,sunlight,ratedFlux,time,50,1,[],()=>1);
  close(day.generationW,800);
  assert.ok(day.chargedJ>0,'Real original T02 solar must charge empty battery');
  const stored=out.items.find(x=>x.kind==='battery').energyJ;
  assert.ok(stored>0&&stored<9600000);
  const dark=DC.grid(out,body,[0,-10000,0],ratedFlux,time+50,1,1,[],()=>1);
  assert.equal(dark.generationW,0);
  assert.ok(out.items.find(x=>x.kind==='battery').energyJ<stored);
  const physicalMachines=p.list().filter(x=>x.type==='industrial_machine');
  const afterMass=m.snapshot().lots.reduce((a,x)=>a+x.massKg,0)+
   physicalMachines.reduce((a,x)=>a+x.massKg,0)+
   out.items.reduce((a,x)=>a+(x.installedMassKg||0),0);
  close(beforeMass,afterMass);
  close(ENERGY,joules+billed);
  assert.deepEqual(p.get('truck-expedition-001'),originalTruck);
  assert.deepEqual(p.get('rover-science-001'),originalRover);
  const reload=new O.Store(742,out.serialize());
  assert.equal(reload.items.filter(x=>x.paidCertified8I).length,3);
  assert.ok(reload.items.find(x=>x.kind==='battery').energyJ>0);
  return{jobs:f.receipts.length,machines:physicalMachines.length,devices:out.items.length,
    solarW:day.generationW,shipEnergyPaidJ:billed,storeBatteryJ:stored,
    note:'ONE-TIME PRELAUNCH CERTIFIED SPECIALIST INPUTS, NOT MINED ORE'};
 }finally{delete globalThis.SF;}
}
test('EXPLICIT new 8A manifest -> 3 genuinely PAID machines -> 22 original 8F jobs -> 3 original PAID 48 V devices with finite solar charging',()=>{
 const receipt=expedition();
 assert.equal(receipt.jobs,22);assert.equal(receipt.machines,3);
 assert.equal(receipt.devices,3);assert.equal(receipt.solarW,800);
 assert.ok(receipt.shipEnergyPaidJ>1e7 && receipt.storeBatteryJ>0);
 console.log('PASS real 8A/8F/8E/T02 one-time manufactured electrical chain '+JSON.stringify(receipt));
});
