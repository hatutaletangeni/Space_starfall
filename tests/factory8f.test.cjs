'use strict';
const assert=require('node:assert/strict');
const Inventory=require('../src/physics/material-ledger8a.js'),Transformer=require('../src/physics/transformation8e.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-7,x+' expected '+y);
function stock(grade=1){
 const a=Inventory.create();a.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:1000,maxVolumeM3:2});
 a.importLot({id:'cu-1',materialId:'copper',massKg:2,containerId:'ship',volumeM3:.002,grade,provenance:'certified-ore-processor'});
 return a;
}
const machine={id:'ship-main:wire-die',station:'wire',tools:['wire-die'],installed:true,condition:1};
const opts={recipeId:'copper_wire',sourceContainerId:'ship',outputContainerId:'ship',machine,
 shipLanded:true,bodyId:'world1',powerEnabled:true,batteryJ:1e6};
const model=Factory.create(),ledger=stock();
const job=model.start({...opts,materials:ledger.snapshot()});
assert.throws(()=>model.start({...opts,materials:ledger.snapshot()}),/previous/);
let spent=0;for(let i=0;i<13;i++)spent+=model.step(10,1e9,true).usedJ;
close(spent,104000);
const output=model.commit({materials:ledger.snapshot(),transformer:Transformer.create(),machine});
const saved=Inventory.create(output.materials);
close(saved.inventory('ship').reduce((n,l)=>n+l.massKg,0),2);
close(saved.inventory('ship').find(l=>l.materialId==='bare_wire').massKg,1.96);
close(saved.inventory('ship').find(l=>l.materialId==='manufacturing_scrap').massKg,.04);
assert.equal(output.factory.receipts[0].id,job.id);
assert.equal(Factory.create(output.factory).active,null);
assert.throws(()=>Factory.quote({...opts,materials:stock(.5).snapshot()}),/refined/);
assert.throws(()=>Factory.quote({...opts,materials:stock().snapshot(),machine:{...machine,installed:false}}),/tool/);
const other=Factory.create(),begin=other.start({...opts,materials:stock().snapshot()});
const q=other.step(10,1000,true);close(q.usedJ,1000);
assert.equal(other.step(10,1e5,false).usedJ,0);
assert.equal(Factory.create(other.snapshot()).active.id,begin.id);
assert.equal(other.cancel(),true);assert.equal(other.cancel(),false);
console.log('PASS 8F source copper -> 1.96 kg wire + 0.04 kg scrap, energy/timing, tool grade, save/reload, cancellation');
