'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Mat=require('../src/physics/material-ledger8a.js');
const Chem=require('../src/physics/transformation8e.js');
const Ref=require('../src/physics/refinery8e.js');
const EPS=1e-7,close=(a,b)=>assert.ok(Math.abs(a-b)<EPS,`${a} ≠ ${b}`);
const hold='8d:ship-main:materials';
const settings={sourceContainerId:hold,outputContainerId:hold,shipLanded:true,
 shipBodyId:'star-0-p0',workshopInstalled:true,powerEnabled:true,batteryJ:100e6};
function initialOre(materialId,grade){
 const ledger=Mat.create();
 ledger.registerContainer({id:hold,ownerId:'ship-main',kind:'raw-material cargo hold',
  maxMassKg:9000,maxVolumeM3:16});
 ledger.importLot({id:'mine:8d:drill:1',materialId,containerId:hold,
  massKg:20,volumeM3:.0116,provenance:'8c:real-finite-mined-deposit',grade});
 return ledger.snapshot();
}
function total(stock){return Mat.create(stock).inventory().reduce((n,l)=>n+l.massKg,0);}
function complete(engine,snapshot,prior=Chem.create(),bigTicks=false){
 let spent=engine.active?.energyJ||0,steps=0; // include original paid Joules before a durable mid-cycle reload
 while(engine.active?.elapsedS+1e-7<engine.active.seconds){
  const a=engine.active,rest=a.seconds-a.elapsedS;
  // Even at 100× game time, original 8E machine solver is never fed one
  // unsafe 100× integration step; we consume bounded <=10 s slices.
  const dt=Math.min(10,rest),x=engine.step(dt,1e9,true);
  spent+=x.usedJ;steps++;
  assert.ok(steps<1000,'bounded serial recycling advancement');
 }
 const result=engine.commit(snapshot,prior);
 close(spent,result.receipt.energyJ);
 return result;
}
for(const [origin,reclaim,originalGrade,sourceResidue,usedGrade] of [
 ['iron_sort','iron_tailings_reclaim',.5,'iron_tailings',.6],
 ['copper_sort','copper_tailings_reclaim',.22,'copper_tailings',.25]
]){
 test('actual original 8C/8D '+origin+' residue can be recycled once into '+reclaim+
  ' with conserved 8A mass, paid time/energy and ORIGINAL 8E proof',()=>{
  const feed=initialOre(Ref.MODES[origin].material,originalGrade),start=structuredClone(feed);
  const factory=Ref.create(),started=factory.start({...settings,
   mode:origin,materials:feed});
  const primary=complete(factory,feed);
  assert.equal(primary.receipt.mode,origin);
  close(total(feed),total(primary.materials));
  const originalTailings=Mat.create(primary.materials).inventory(hold)
   .find(x=>x.materialId===sourceResidue);
  assert.ok(originalTailings,'8E MUST return original physical residue lot');
  assert.match(originalTailings.provenance,/^process:refine8e:/);
  assert.ok(originalTailings.grade>0&&originalTailings.grade<originalGrade);
  assert.ok(originalTailings.massKg>=Ref.MODES[reclaim].massKg);
  const claim=Ref.quote(reclaim,primary.materials,hold,hold,primary.refinery.receipts);
  assert.ok(claim.productKg>0&&claim.productKg<claim.inputKg);
  assert.ok(claim.residueKg>0);
  assert.ok(claim.productGrade===usedGrade);
  close(claim.productKg+claim.residueKg,claim.inputKg);
  assert.ok(claim.energyJ>0&&claim.seconds>0);
  // "process:..." is not evidence if the actual original committed 8E
  // source receipt is deleted/replaced, even when somebody knows a lot ID.
  assert.throws(()=>Ref.quote(reclaim,primary.materials,hold,hold,[]),
   /matching durable original/);
  const forged=structuredClone(primary.refinery.receipts);
  forged[0].mode='ice_recovery';
  assert.throws(()=>Ref.quote(reclaim,primary.materials,hold,hold,forged),
   /matching durable original/);
  const recycle=Ref.create(primary.refinery);
  recycle.start({...settings,mode:reclaim,materials:primary.materials});
  let first=recycle.step(10,100e6,true);
  assert.ok(first.usedJ>0);
  let paused=recycle.step(10,100e6,false);
  assert.equal(paused.usedJ,0);
  assert.equal(paused.paused,true);
  // Simulate real serialized save/reload mid-cycle. No input is consumed
  // before completed paid machine time, so pause has no phantom stock.
  const snap=recycle.snapshot();
  assert.ok(snap.active.elapsedS<claim.seconds);
  assert.deepEqual(primary.materials,Mat.create(primary.materials).snapshot());
  const restored=Ref.create(JSON.parse(JSON.stringify(snap)));
  const secondary=complete(restored,primary.materials,Chem.create(primary.transformations));
  const result=Mat.create(secondary.materials);
  close(total(secondary.materials),total(start));
  assert.deepEqual(feed,start,'original feed state must not mutate on machine commit');
  assert.equal(secondary.receipt.status,'COMMITTED');
  assert.equal(secondary.receipt.sourceResidue,sourceResidue);
  assert.equal(secondary.receipt.recycler,'original-8E-mki-mechanical-separator');
  assert.equal(secondary.receipt.recoveredElementFraction,Ref.MODES[reclaim].recovery);
  assert.equal(secondary.receipt.unrecoveredMassKg,claim.residueKg);
  assert.ok(secondary.receipt.energyJ>0);
  const recovered=result.inventory(hold).find(x=>x.id==='process:'+secondary.receipt.id+':1');
  const spent=result.inventory(hold).find(x=>x.id==='process:'+secondary.receipt.id+':2');
  assert.equal(recovered.materialId,Ref.MODES[reclaim].product);
  assert.equal(spent.materialId,Ref.MODES[reclaim].residue);
  close(recovered.massKg,claim.productKg);
  close(spent.massKg,claim.residueKg);
  assert.ok(spent.grade<originalTailings.grade,
   'recycling must deplete the actual metal assay in spent tailings');
  assert.ok(!Ref.MODES[spent.materialId],
   'no silent 100% recycling of already spent sludge');
  assert.equal(Ref.create(secondary.refinery).receipts.length,2);
  // Same original conversion receipt may NOT credit recovered stock twice.
  const replay=Chem.create(secondary.transformations).convert({
   operationId:secondary.receipt.id,containerId:hold,outputContainerId:hold,
   materials:secondary.materials});
  assert.equal(replay.duplicate,true);
  close(total(replay.materials),20);
 });
}
test('100× compressed sim-time still uses bounded original 8E power steps and returns exact same physical products',()=>{
 const feed=initialOre('iron_ore',.5);
 const origin=complete((()=>{const e=Ref.create();
  e.start({...settings,mode:'iron_sort',materials:feed});return e;})(),feed);
 function run(scale){
  const e=Ref.create(origin.refinery);
  e.start({...settings,mode:'iron_tailings_reclaim',materials:origin.materials});
  let battery=100e6,actualEnergy=0;
  while(e.active.elapsedS+EPS<e.active.seconds){
   // Compensate time warp with multiple <=10s existing physical steps;
   // the original accumulator and exact Joule debit remain the owners.
   for(let i=0;i<scale&&e.active&&e.active.elapsedS+EPS<e.active.seconds;i++){
    let dt=Math.min(10,e.active.seconds-e.active.elapsedS);
    let q=e.step(dt,battery,true);
    battery-=q.usedJ;actualEnergy+=q.usedJ;
   }
  }
  const done=e.commit(origin.materials,Chem.create(origin.transformations));
  return{materials:done.materials,energy:actualEnergy,receipt:done.receipt};
 }
 const one=run(1),ten=run(10),hundred=run(100);
 assert.deepEqual(one.materials,ten.materials);
 assert.deepEqual(one.materials,hundred.materials);
 close(one.energy,ten.energy);
 close(ten.energy,hundred.energy);
 assert.ok(one.energy>0);
});
test('cancelled physical waste recovery cannot refund spent battery or create material lots',()=>{
 const ore=initialOre('iron_ore',.5),first=Ref.create();
 first.start({...settings,mode:'iron_sort',materials:ore});
 const primary=complete(first,ore);
 const second=Ref.create(primary.refinery);
 second.start({...settings,mode:'iron_tailings_reclaim',materials:primary.materials});
 const charged=second.step(10,1e7,true).usedJ;
 assert.ok(charged>0);
 const before=structuredClone(primary.materials);
 assert.equal(second.cancel(),true);
 assert.deepEqual(primary.materials,before);
 assert.equal(Ref.create(second.snapshot()).active,null);
 assert.equal(second.receipts.at(-1).energyJ,charged);
 assert.equal(second.receipts.at(-1).status,'CANCELLED');
 assert.throws(()=>Ref.quote('iron_tailings_reclaim',initialOre('iron_tailings',.3),
  hold,hold,[]),/8E-process-provenanced|matching durable original/);
});
