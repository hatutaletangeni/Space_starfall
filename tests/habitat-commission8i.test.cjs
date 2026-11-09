/* Update 8I model acceptance: one paid 8G gas owner -> one T09 owner.
 * Isolated, explicit fixture. Does not claim an unassisted 8K expedition.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 vm=require('node:vm'),path=require('node:path');
const box={module:{exports:{}},console};box.globalThis=box;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/physics/habitat-commission8i.js'),'utf8'),box);
const C=box.module.exports,R=8.314462618,cp=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const assetId='structure8g:1',bodyId='star-0-p0',dry=985.4,T=293.15,
   o2=21*1000*25/(R*T),n2=78*1000*25/(R*T),water=20,
   oxygenKg=o2*.031998,inertKg=n2*.028014,total=oxygenKg+inertKg+water;
 const h={schema:1,volumeM3:25,tempK:T,oxygenMol:o2,inertMol:n2,
   carbonMol:0,waterL:water,seal:.85,lastS:0,occupants:0,
   enabled:false,awaitingReview:true,oxygenTankMol:0,inertTankMol:0,
   scrubberCapacityMol:0,airlock:'CLOSED'};
 const charged={jobId:'habcharge8g:'+assetId+':1',workJ:1200000,
   addedMassKg:total,consumedLots:[{id:'finite-oxygen',materialId:'oxygen',massKg:oxygenKg},
   {id:'finite-nitrogen',materialId:'nitrogen',massKg:inertKg},
   {id:'finite-water',materialId:'water',massKg:water}]};
 return{operationId:'habcommission8i:'+assetId+':1',assetId,bodyId,
  physical:{schema:1,assets:[{id:assetId,type:'habitat_envelope',massKg:dry+total,
   provenance:'structural-8g:'+assetId,condition:1,
   location:{kind:'surface',bodyId,local:[0,1,0]},
   state:{oxygenKg,inertKg,waterKg:water,carbonKg:0,habT09:h,habitatCharge8g:charged}}]},
  materials:{schema:1,lots:[],containers:[],operations:[]},
  assembly:{schema:1,receipts:[{id:assetId,assetId,blueprintId:'habitat_shell',
   bodyId,facilityId:'habitat-pad-paid',status:'ASSEMBLED_NOT_OPERATIONAL',
   massKg:dry,energyJ:4000000,consumedLots:[{lotId:'paid-part-1',massKg:100}]}]},
  outpost:{schema:1,seed:742,serial:0,items:[],wires:[]},
  shipEnergyJ:1500000,bodyRadius:1000,
  shipLocal:[0,1,0],evaLocal:[0,1,0],shipLanded:true,
  operatorEVA:true,shipPowered:true,timeS:100};
}
test('one actual charged 8G shell becomes one T09 record without minting gas, water, electricity or media',()=>{
 const a=fixture(),before=cp(a),r=C.commission(a);
 assert.equal(JSON.stringify(a),JSON.stringify(before),'pure source snapshots remain unchanged');
 assert.equal(r.physical.assets.length,1);
 assert.equal(r.physical.assets[0].massKg,a.assembly.receipts[0].massKg);
 assert.equal(r.physical.assets[0].state.oxygenKg,0);
 assert.equal(r.physical.assets[0].state.waterKg,0);
 assert.equal(r.outpost.items.length,1);
 assert.equal(r.habitat.physicalAssetId,a.assetId);
 assert.equal(r.habitat.habT09.oxygenMol,a.physical.assets[0].state.habT09.oxygenMol);
 assert.equal(r.habitat.habT09.waterL,20);
 assert.equal(r.habitat.habT09.oxygenTankMol,0);
 assert.equal(r.habitat.habT09.scrubberCapacityMol,0);
 assert.equal(r.habitat.habT09.enabled,false);
 assert.equal(r.habitat.habT09.awaitingReview,false);
 assert.equal(r.shipEnergyJ,a.shipEnergyJ-C.WORK_J);
 assert.equal(r.materials.operations.length,1);
 assert.equal(r.receipt.kind,'HABITAT_COMMISSION_8I');
 const original=a.physical.assets[0].massKg,final=r.physical.assets[0].massKg,
  h=r.habitat.habT09;
 const inT09=h.oxygenMol*.031998+h.inertMol*.028014+h.carbonMol*.04401+h.waterL;
 assert.ok(Math.abs(original-final-inT09)<1e-6,'no double count or free material');
 assert.ok(r.receipt.pressureKPa>90&&r.receipt.pressureKPa<110);
});
test('second click / reload cannot commission or charge a second habitat',()=>{
 const a=fixture(),r=C.commission(a);
 const repeated={...a,physical:r.physical,materials:r.materials,outpost:r.outpost};
 assert.throws(()=>C.commission(repeated),/already linked|already committed|finite physically charged/);
});
test('reject free/unpaid shell, fictitious gas and bogus structural identity',()=>{
 const a=fixture();
 a.assembly.receipts=[];
 assert.throws(()=>C.commission(a),/manufacturing receipt/);
 const b=fixture();b.assembly.receipts[0].id='other';
 assert.throws(()=>C.commission(b),/manufacturing receipt|paid 8G/);
 const c=fixture();c.physical.assets[0].state.waterKg+=20;
 assert.throws(()=>C.commission(c),/contained water/);
 const d=fixture();delete d.physical.assets[0].state.habitatCharge8g;
 assert.throws(()=>C.commission(d),/physically charged/);
});
test('reject cross-world EVA, inadequate battery and weak cabin pressure',()=>{
 const a=fixture();a.bodyId='other-world';
 assert.throws(()=>C.commission(a),/same-world/);
 const b=fixture();b.shipEnergyJ=1000;
 assert.throws(()=>C.commission(b),/battery/);
 const c=fixture();c.evaLocal=[0,-1,0];
 assert.throws(()=>C.commission(c),/EVA/);
 const d=fixture();d.physical.assets[0].state.habT09.seal=.6;
 assert.throws(()=>C.commission(d),/physically charged/);
});
test('source-paid 8G hose with COMMITTED metered gas receipt also qualifies',()=>{
 const a=fixture(),charge=a.physical.assets[0].state.habitatCharge8g;
 charge.jobId='habhose8g:'+a.assetId+':1';
 charge.workJ=1500000;
 charge.status='COMMITTED';
 charge.consumedLots=charge.consumedLots.map(x=>({lotId:x.id,materialId:x.materialId,massKg:x.massKg}));
 const r=C.commission(a);
 assert.equal(r.receipt.chargeReceiptId,charge.jobId);
});
