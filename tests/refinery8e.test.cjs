'use strict';
/* 8E model contract: pure model tests, not GPU gameplay proof. */
const assert=require('node:assert/strict');
const Mat=require('../src/physics/material-ledger8a.js');
const Chem=require('../src/physics/transformation8e.js');
const Ref=require('../src/physics/refinery8e.js');
function fixtures(material='iron_ore',grade=.35,kg=20,provenance='8c:seed:site'){
 const ledger=Mat.create();
 ledger.registerContainer({id:'hold',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
 ledger.importLot({id:'deposit-ore',materialId:material,containerId:'hold',massKg:kg,volumeM3:kg*.0006,
  provenance,grade});
 return ledger;
}
const settings={sourceContainerId:'hold',outputContainerId:'hold',shipLanded:true,shipBodyId:'body_1',
 workshopInstalled:true,powerEnabled:true,batteryJ:5e6};
const almost=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,a+' ≠ '+b);
for(const mode of Object.keys(Ref.MODES)){
 const spec=Ref.MODES[mode],grade=spec.material==='silica_concentrate'?.95:spec.material==='water_ice'?.45:.35;
 const ledger=fixtures(spec.material,grade,40,spec.material==='silica_concentrate'?'process:refine8e:fixture':'8c:seed:site'),refiner=Ref.create(),chemical=Chem.create();
 const q=Ref.quote(mode,ledger.snapshot(),'hold','hold');
 assert.equal(q.inputKg,q.productKg+q.residueKg);
 const started=refiner.start({...settings,mode,materials:ledger.snapshot()});
 assert.equal(started.lotId,'deposit-ore');
 assert.throws(()=>refiner.start({...settings,mode,materials:ledger.snapshot()}),/One refinery/);
 let paid=0;for(let i=0;i<100;i++){
  const part=refiner.step(Math.min(10,spec.seconds/10),1e12,true);paid+=part.usedJ;
  if(part.completed)break;
 }
 // If the ten cycles were not enough (250-second ice, etc), finish remaining in bounded slices.
 for(let i=0;i<100&&refiner.active.elapsedS+1e-7<spec.seconds;i++)paid+=refiner.step(10,1e12,true).usedJ;
 almost(paid,spec.seconds*spec.powerW);
 const output=refiner.commit(ledger.snapshot(),chemical);
 assert.equal(output.receipt.status,'COMMITTED');
 const restored=Mat.create(output.materials);
 almost(restored.inventory('hold').reduce((sum,l)=>sum+l.massKg,0),40);
 const product=restored.inventory('hold').find(l=>l.materialId===spec.product);
 assert.ok(product);almost(product.massKg,q.productKg);almost(product.grade,q.productGrade);
 assert.equal(Ref.create(output.refinery).active,null);
 assert.equal(Ref.create(output.refinery).receipts.length,1);
 const again=Chem.create(output.transformations).convert({operationId:started.id,containerId:'hold',outputContainerId:'hold',materials:output.materials});
 assert.equal(again.duplicate,true);
}
{
 const ledger=fixtures(),m=Ref.create();m.start({...settings,mode:'iron_sort',materials:ledger.snapshot()});
 const progress=m.step(10,1000,true);
 almost(progress.usedJ,1000);assert.ok(m.active.elapsedS<10);
 const pause=m.step(10,1e6,false);assert.equal(pause.usedJ,0);assert.equal(pause.paused,true);
 const before=m.snapshot();const resumed=Ref.create(before);
 assert.equal(resumed.active.elapsedS,m.active.elapsedS);assert.equal(resumed.active.energyJ,m.active.energyJ);
 const earlierMass=ledger.used('hold').massKg;assert.equal(resumed.cancel(),true);
 assert.equal(ledger.used('hold').massKg,earlierMass);
 assert.equal(resumed.cancel(),false);
}
{
 const ledger=fixtures('iron_ore',.35,20);
 ledger.registerContainer({id:'other-hold',ownerId:'other',maxMassKg:100,maxVolumeM3:10});
 ledger.reserve('reservation','deposit-ore','other-hold',2);
 assert.throws(()=>Ref.quote('iron_sort',ledger.snapshot(),'hold','hold'),/Missing/);
}
console.log('PASS refinery8e: mass, assay, five recipes, stable receipts, cancellations and finite power');
