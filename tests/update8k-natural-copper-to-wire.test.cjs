/* 8K source-module integration acceptance: true CW01/CW03-generated
 * 8C copper deposit -> surveyed, depleted 8D bore -> truck-to-ship loader ->
 * 8E ore sorter/mineral identification -> stoichiometric Cu2S roasting +
 * CuO reduction -> 8F copper wire. Never import raw copper, concentrates,
 * chemical intermediates, refined copper, or manufactured wire.
 *
 * Scope: this is a deterministic source-module integration test with an
 * explicitly modeled predeparture finite oxygen/carbon supply and preinstalled
 * certified processing fixtures. It does NOT prove real player locomotion,
 * station kit manufacturing, source-owned runtime ship/vehicle battery debits,
 * gas pipe flow, T09, 8J, or a two-world browser playthrough.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/celestial-composition-cw01.js');
require('../src/terrain/geology-cw03.js');
const Resources=require('../src/physics/planetary-resources8c.js');
const Materials=require('../src/physics/material-ledger8a.js');
const Mining=require('../src/physics/mining-hauling8d.js');
const Refinery=require('../src/physics/refinery8e.js');
const Transform=require('../src/physics/transformation8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js');
const Plant=require('../src/physics/industrial-plant8e.js');
require('../src/physics/manufacturing8f.js');
const Factory=require('../src/physics/factory8f.js');
const BODY='natural-copper-world',SEED=742,HOLD=Mining.SHIP;
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,a+' != '+b);
const mass=s=>s.lots.reduce((v,l)=>v+l.massKg,0);
const total=(s,kind)=>s.lots.filter(l=>l.materialId===kind).reduce((v,l)=>v+l.massKg,0);
function naturalCopper(){
  // Search only the original authoritative deterministic CW01+CW03 sites,
  // not a handmade ore/deposit fixture. Body configurations are test inputs.
  for(let n=0;n<80;n++){
    const body={id:'natural-copper-world-'+n,kind:'planet',landable:true,type:'Rocky',seed:33+n};
    for(const d of Resources.neighbors(body,[1,0,0],SEED,8))
      if(d.type==='copper_ore'&&d.grade>=.045&&d.accessibleMassKg>=400)
        return {body,deposit:d};
  }
  throw Error('No sufficiently enriched original CW01/CW03 copper occurrence in deterministic fixture worlds');
}
test('natural 8C copper -> 8D truck haul -> 8E real copper -> 8F wire; mass, depletion, energy and replay',()=>{
  const {body,deposit}=naturalCopper();let resources=Resources.create();
  const survey=resources.survey(deposit,50,'EVA field spectrometer');
  assert.equal(survey.siteId,deposit.id);
  assert.equal(Resources.site(body,deposit.local,SEED).id,deposit.id);
  let materials=Mining.prepareContainers(Materials.create()),mining=Mining.create(null,Materials,Resources);
  // Only separately accounted supporting reagents, never copper metal/ore:
  // these are explicitly finite certified predeparture supplies, not mining.
  for(const type of ['oxygen','sulfur_dioxide','carbon_dioxide']){
    materials.registerContainer({id:type+'-vessel',ownerId:'installed-certified-'+type+'-tank',
      kind:'gas pressure vessel',maxMassKg:100,maxVolumeM3:1});
  }
  materials.importLot({id:'finite-expedition-carbon',materialId:'carbon',containerId:HOLD,
    massKg:10,volumeM3:.012,grade:1,provenance:'predeparture:finite-certified-reagent'});
  materials.importLot({id:'finite-expedition-oxygen',materialId:'oxygen',containerId:'oxygen-vessel',
    massKg:6,volumeM3:.007,grade:1,provenance:'predeparture:finite-electrolysis-oxygen'});
  const beginning=mass(materials.snapshot()),initialOre=resources.remaining(deposit);
  let batteryJ=150000000,energySpent=0,seconds=0;
  function pay(j){assert.ok(j>0&&batteryJ+1e-6>=j,'Finite battery lacks real modeled energy');
    batteryJ-=j;energySpent+=j;}
  // 20 genuine independent ore drill transactions, no direct source-lot imports.
  for(let i=0;i<20;i++){
    const op=mining.startDrill({deposit,surveyed:resources.observations().some(x=>x.siteId===deposit.id),
      bodyId:body.id,truckBodyId:body.id,truckPresent:true,operatorNear:true,
      truckIdle:true,energyJ:batteryJ});
    let used=0;
    for(let tick=0;tick<12;tick++){const s=mining.advance(2,batteryJ,true);pay(s.usedJ);used+=s.usedJ;}
    close(used,Mining.DRILL.minimumEnergyJ);seconds+=op.durationS;
    const done=mining.commit(materials,resources);
    materials=done.materials;resources=done.resources;assert.equal(done.operation.status,'COMMITTED');
    assert.equal(materials.inventory(Mining.TRUCK).at(-1).provenance,deposit.id);
    // Importantly this drill owner is persisted through its original snapshot;
    // a new action uses the same saved serial and receipts, not reset IDs.
    mining=Mining.create(mining.snapshot(),Materials,Resources);
  }
  close(initialOre-resources.remaining(deposit),400);
  close(materials.used(Mining.TRUCK).massKg,400);
  const oreIds=materials.inventory(Mining.TRUCK).map(x=>x.id);
  // Physically authorized loader consumes its own finite time/power and moves
  // only original bore lots from truck hopper into original ship hold.
  for(const oreId of oreIds){
    const op=mining.startLoad({lotId:oreId,massKg:20,bodyId:body.id,
      truckBodyId:body.id,shipBodyId:body.id,truckNearShip:true,
      operatorNear:true,truckIdle:true,energyJ:batteryJ});
    for(let tick=0;tick<8;tick++){const s=mining.advance(2,batteryJ,{enabled:true});pay(s.usedJ);}
    seconds+=op.durationS;
    const moved=mining.commit(materials,resources);materials=moved.materials;resources=moved.resources;
    mining=Mining.create(mining.snapshot(),Materials,Resources);
  }
  assert.equal(materials.used(Mining.TRUCK).massKg,0);
  close(total(materials.snapshot(),'copper_ore'),400);
  const carried=materials.inventory(HOLD).filter(l=>l.materialId==='copper_ore');
  assert.equal(carried.length,20);
  assert.ok(carried.every(l=>l.provenance===deposit.id));
  let transformations=Transform.create().snapshot();
  const refinery=Refinery.create();
  function refine(mode){
    const started=refinery.start({mode,materials:materials.snapshot(),
      sourceContainerId:HOLD,outputContainerId:HOLD,workshopInstalled:true,
      shipLanded:true,shipBodyId:body.id,powerEnabled:true,batteryJ});
    for(let tick=0;tick<Math.ceil(started.seconds/10);tick++){
      const step=refinery.step(10,batteryJ,true);pay(step.usedJ);
    }
    seconds+=started.seconds;
    const result=refinery.commit(materials.snapshot(),Transform.create(transformations));
    materials=Materials.create(result.materials);transformations=result.transformations;
    assert.equal(result.receipt.status,'COMMITTED');
  }
  for(let i=0;i<20;i++)refine('copper_sort');
  const concentrate=total(materials.snapshot(),'copper_concentrate');
  assert.ok(concentrate>=40,'Source copper grade must yield 20 physical 2kg concentrate batches');
  for(let i=0;i<20;i++)refine('copper_sulfide_identification');
  const sulfideMass=total(materials.snapshot(),'copper_sulfide');
  assert.ok(sulfideMass>2.5,'Real mined Cu2S has enough copper for 2kg wire input');
  const loc={kind:'surface',bodyId:body.id,local:[0,1,0]};
  const assets={schema:1,assets:[
    {id:'certified-roaster',type:'industrial_plant',location:loc,condition:1},
    ...['oxygen','sulfur_dioxide','carbon_dioxide'].map(type=>({
      id:type+'-tank',type:'industrial_vessel',location:loc,condition:1,
      state:{materialId:type,containerId:type+'-vessel',ratedPressurePa:8e6}}))
  ]};
  const station={id:'certified-roaster',kind:'reduction_furnace',installed:true,
    enabled:true,condition:1,bodyId:body.id,sourceContainerId:HOLD,
    physicalAssetId:'certified-roaster',
    tools:['reduction_furnace','gas_capture','sulfide_roaster'],
    vesselAssetIds:{sulfur_dioxide:'sulfur_dioxide-tank',carbon_dioxide:'carbon_dioxide-tank'},
    reactantAssetIds:{oxygen:'oxygen-tank'}};
  let plant=Plant.create();
  function react(recipeId,scaleMol,destinations,reactantSources={}){
    const b=Chem.batch(recipeId,scaleMol),id='8k-natural:'+recipeId;
    pay(b.energyJ);seconds+=b.seconds;
    const done=plant.process({id,reactionId:recipeId,scaleMol,materials:materials.snapshot(),
      sourceContainerId:HOLD,reactantSources,destinations,assetState:assets,
      station,bodyId:body.id,
      energyReceipt:{operationId:id,sourceId:'finite-expedition-battery',usedJ:b.energyJ}});
    assert.equal(done.receipt.status,'COMMITTED');
    assert.equal(Plant.create(done.operations).process({id,materials:done.materials}).duplicate,true);
    materials=Materials.create(done.materials);plant=Plant.create(done.operations);
  }
  // Each 1-mol roasting batch consumes 159.152g Cu2S and finite oxygen.
  // Choose a physically available bounded scale; subsequent reduction
  // consumes only the CuO made from THIS mined Cu2S.
  const roastMol=Math.floor((sulfideMass/(Chem.molarMass('copper_sulfide')/1000))*.9);
  assert.ok(roastMol>=16);
  react('copper_sulfide_roasting',roastMol,
    {copper_oxide:HOLD,sulfur_dioxide:'sulfur_dioxide-vessel'},
    {oxygen:'oxygen-vessel'});
  assert.ok(total(materials.snapshot(),'copper_oxide')>2);
  // CuO reduction has coefficient 2, same scale gives required CuO input.
  react('copper_oxide_reduction',roastMol,
    {copper:HOLD,carbon_dioxide:'carbon_dioxide-vessel'});
  assert.ok(total(materials.snapshot(),'copper')>=2);
  const die={id:'ship-main:fabrication:wire-die',station:'wire',installed:true,
    tools:['wire-die'],condition:1};
  const factory=Factory.create();
  const job=factory.start({recipeId:'copper_wire',materials:materials.snapshot(),
    sourceContainerId:HOLD,outputContainerId:HOLD,machine:die,
    shipLanded:true,bodyId:body.id,powerEnabled:true,batteryJ});
  const work=Factory.billOfMaterials('copper_wire');
  for(let tick=0;tick<Math.ceil(work.seconds/10);tick++){
    const step=factory.step(10,batteryJ,true);pay(step.usedJ);
  }
  seconds+=work.seconds;
  const manufactured=factory.commit({materials:materials.snapshot(),
    transformer:Transform.create(transformations),machine:die});
  factory.apply(manufactured.factory);transformations=manufactured.transformations;
  materials=Materials.create(manufactured.materials);
  const wire=materials.inventory(HOLD).filter(l=>l.materialId==='bare_wire');
  assert.equal(wire.length,1);close(wire[0].massKg,1.96);
  assert.ok(wire[0].provenance.startsWith('process:'));
  assert.ok(factory.receipts.some(r=>r.recipeId==='copper_wire'&&r.status==='COMMITTED'));
  close(mass(materials.snapshot()),beginning+400,1e-5);
  close(batteryJ+energySpent,150000000,1e-4);
  assert.ok(seconds>0&&energySpent>0);
  assert.ok(materials.inventory('sulfur_dioxide-vessel').length>0);
  assert.ok(materials.inventory('carbon_dioxide-vessel').length>0);
  const reloadedMaterials=Materials.create(JSON.parse(JSON.stringify(materials.snapshot())));
  const reloadedResources=Resources.create(JSON.parse(JSON.stringify(resources.serialize())));
  const reloadedMining=Mining.create(JSON.parse(JSON.stringify(mining.snapshot())),Materials,Resources);
  close(reloadedResources.remaining(deposit),initialOre-400);
  close(total(reloadedMaterials.snapshot(),'bare_wire'),1.96);
  assert.ok(reloadedMining.receipt('8d:drill:1'));
  assert.equal(Resources.site(body,deposit.local,SEED).id,deposit.id);
  console.log('PASS ORIGINAL natural copper ore -> true powered 8D truck loader -> 8E Cu2S/CuO -> 8F wire',JSON.stringify({
    depositId:deposit.id,oreMinedKg:400,concentrateKg:concentrate,copperSulfideKg:sulfideMass,
    copperWireKg:1.96,energySpentJ:energySpent,simulatedSeconds:seconds,
    supportingReagents:'finite-predeparture-only',fixtures:'preinstalled-process-plant'}));
});