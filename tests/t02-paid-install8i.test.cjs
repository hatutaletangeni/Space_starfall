/* 8I genuine-factory-format paid T02 installation model acceptance.
 * TEST_FIXTURE inputs use actual 8F factory receipts, 8E transformation
 * receipt and 8A process:<jobId>:<n> lot schema. Not a natural expedition.
 */
'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const {quote,install,SPECS}=require('../src/physics/t02-paid-install8i.js');
const cp=x=>JSON.parse(JSON.stringify(x));
function fixture(kind='solar'){
 const spec=SPECS[kind],count=kind==='solar'?1:8,per=kind==='solar'?8.8:1.95;
 const a={operationId:'t02paid8i:1',bodyId:'star-0-p0',kind,
  local:[0,1,0],shipLocal:[0,1,0],evaLocal:[0,1,0],
  bodyRadius:1000,containerId:'8d:ship-main:materials',
  outpost:{schema:1,seed:742,serial:0,items:[],wires:[]},
  materials:{schema:1,containers:[{id:'8d:ship-main:materials',ownerId:'ship-main',
   maxMassKg:9000,maxVolumeM3:16}],lots:[],operations:[]},
  factory:{schema:1,serial:count,active:null,receipts:[]},
  transformations:{schema:1,operations:[]},lotIds:[],
  shipLanded:true,operatorEVA:true,shipPowered:true,
  startedAtS:100,nowS:100+spec.seconds,
  energyReceipt:{operationId:'t02paid8i:1',status:'COMMITTED',
   sourceId:'ship-main:engineering-battery',usedJ:spec.workJ},
  shipEnergyJ:10000000};
 for(let i=1;i<=count;i++){
  const jobId='manufacture8f:'+i,lotId='process:'+jobId+':1';
  a.lotIds.push(lotId);
  a.materials.lots.push({id:lotId,materialId:spec.part,
   containerId:a.containerId,massKg:per,volumeM3:per*.001,
   provenance:'process:'+jobId,grade:1});
  a.factory.receipts.push({id:jobId,recipeId:spec.part,bodyId:'star-0-p0',
   status:'COMMITTED',energyJ:1000000,partMassKg:per});
  a.transformations.operations.push({id:jobId,recipeId:spec.part,
   outputs:{[spec.part]:per,manufacturing_scrap:.1},energyJ:1000000,status:'COMMITTED'});
 }
 return a;
}
test('one real-format 8F solar module becomes original T02 400 W node without free energy',()=>{
 const a=fixture(),snapshot=cp(a),q=quote(a),r=install(a);
 assert.equal(q.massKg,8.8);
 assert.equal(q.ratedSolarW,400);
 assert.deepEqual(a,snapshot,'quote and commit do not mutate original owners');
 assert.equal(r.item.kind,'solar');
 assert.equal(r.item.installedMassKg,8.8);
 assert.equal(r.item.ratedSolarW,400);
 assert.equal(r.item.energyJ,0);
 assert.equal(r.outpost.items.length,1);
 assert.equal(r.materials.lots.length,0);
 assert.equal(r.materials.operations.length,1);
 assert.equal(r.receipt.status,'COMMITTED');
 assert.equal(r.receipt.sourceBatteryJBefore-r.receipt.sourceBatteryJAfter,250000);
 assert.equal(r.shipEnergyJ,a.shipEnergyJ-250000);
 assert.throws(()=>install({...a,outpost:r.outpost,materials:r.materials}),/already|receipt/i);
});
test('eight real-format 8F cells assemble 48V T02 battery with only 9.6MJ EMPTY capacity',()=>{
 const a=fixture('battery'),r=install(a);
 assert.equal(r.receipt.installedMassKg,15.6);
 assert.equal(r.item.ratedCapacityJ,9600000);
 assert.equal(r.item.ratedChargeW,1000);
 assert.equal(r.item.ratedDischargeW,1800);
 assert.equal(r.item.energyJ,0);
 assert.equal(r.materials.lots.length,0);
 assert.equal(r.receipt.initialChargeJ,0);
 assert.equal(r.shipEnergyJ,9550000);
});
test('reject raw, made-up or untraceable batteries; never accept phantom body-tagged lots',()=>{
 for(const mutate of [
  a=>{a.factory.receipts=[]},
  a=>{a.transformations.operations=[]},
  a=>{a.materials.lots[0].provenance='TEST_FIXTURE_ONLY'},
  a=>{a.materials.lots[0].provenance='invented'},
  a=>{a.materials.lots[0].grade=.7},
  a=>{a.materials.lots[0].materialId='copper'},
  a=>{a.materials.containers[0].ownerId='someone-else'},
  a=>{a.factory.receipts[0].recipeId='copper_wire'},
  a=>{a.transformations.operations[0].outputs.solar_module=.2},
  a=>{a.materials.lots[0].massKg=3},
  a=>{a.lotIds=[]},
 ]){const a=fixture();mutate(a);assert.throws(()=>install(a));}
});
test('reject early clocks, fake debit, insufficient battery and out-of-reach/overlapping construction',()=>{
 for(const mutate of [
  a=>{a.nowS=a.startedAtS+100},
  a=>{a.shipEnergyJ=0},
  a=>{a.energyReceipt.usedJ=0},
  a=>{a.energyReceipt.sourceId='creative'},
  a=>{a.operatorEVA=false},
  a=>{a.evaLocal=[0,-1,0]},
  a=>{a.outpost.items=[{id:'other',kind:'hab',bodyId:a.bodyId,local:[0,1,0]}]},
  a=>{a.materials.operations=[{id:'res:1',lotId:a.lotIds[0],massKg:8.8,status:'RESERVED'}]},
 ]){const a=fixture();mutate(a);assert.throws(()=>install(a));}
});
test('exact partial mass debit remains in ship hold; no material is created or destroyed',()=>{
 const a=fixture();a.materials.lots[0].massKg=10;
 a.materials.lots[0].volumeM3=.01;
 a.factory.receipts[0].partMassKg=10;
 a.transformations.operations[0].outputs.solar_module=10;
 const r=install(a);
 assert.equal(r.materials.lots.length,1);
 assert.ok(Math.abs(r.materials.lots[0].massKg-1.2)<1e-8);
 assert.ok(Math.abs(r.materials.lots[0].volumeM3-.0012)<1e-8);
 assert.ok(Math.abs(r.materials.lots[0].massKg+r.item.installedMassKg-10)<1e-8);
});
test('reject multiple fake lots claiming more than a real 8F batch output',()=>{
 const a=fixture(),clone=cp(a.materials.lots[0]);
 clone.id='transfer:invented';clone.massKg=8.8;
 a.materials.lots.push(clone);
 assert.throws(()=>install(a),/overproduced|forged/);
});
