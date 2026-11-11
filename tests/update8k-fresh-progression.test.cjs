/* Fresh 8K source integration: actual revised finite starting manifest ->
 * paid ORIGINAL installs -> seed-742 natural iron -> real refinery/chemistry ->
 * manufactured hand winder, motor and renewable drill head. No test lots,
 * certified station fixtures, pure iron grants or synthetic battery budgets.
 * Does not certify flight, native gas-pump ticks or GPU/player acceptance.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Galaxy=require('../src/galaxy.js');
require('../src/physics/celestial-composition-cw01.js');require('../src/terrain/geology-cw03.js');
const M=require('../src/physics/material-ledger8a.js'),P=require('../src/physics/physical-inventory8a.js');
const D=require('../src/physics/mining-hauling8d.js'),R=require('../src/physics/planetary-resources8c.js');
const S=require('../src/physics/starter-manifest8k.js'),Site=require('../src/physics/industrial-site8e.js');
const Install=require('../src/physics/machine-install8f.js'),V=require('../src/physics/vehicles.js');
const Ref=require('../src/physics/refinery8e.js'),Transform=require('../src/physics/transformation8e.js');
const Chem=require('../src/physics/industrial-chemistry8e.js'),Plant=require('../src/physics/industrial-plant8e.js');
require('../src/physics/stock-parts8f.js');require('../src/physics/kit-recipes8f.js');
require('../src/physics/manufacturing8f.js');const F=require('../src/physics/factory8f.js');
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
const total=(m,p)=>m.snapshot().lots.reduce((n,l)=>n+l.massKg,0)+p.assets.reduce((n,a)=>n+a.massKg,0);
test('a new finite expedition can make its first mined iron, hand-wound motor and replacement drill head',()=>{
 const galaxy=Galaxy.generateGalaxy(742,64);let body,deposit;
 for(const b of galaxy.systems[0].bodies.filter(x=>x.landable)){
  const found=R.neighbors(b,[1,0,0],742,8).find(d=>d.type==='iron_ore'&&d.grade>=.3);
  if(found){body=b;deposit=found;break;}
 }
 assert.ok(deposit,'original seed-742 enriched iron occurrence required');
 let m=D.prepareContainers(M.create()),p=P.create().serialize(),resources=R.create(),mining=D.create(null,M,R);
 const seeded=S.prepare(m.snapshot(),{schema:1,seed:742,startedAt:1},null,D.SHIP);
 m=M.create(seeded.materials);assert.equal(seeded.receipt.manifestVersion,3);
 const initialMass=total(m,p),vehicles=V.createStore(),initialJ=vehicles.get('ship').state.energyJ;
 let usedJ=0,truckJ=p.assets.find(a=>a.id==='truck-expedition-001').state.batteryJ,truckUsedJ=0;
 function pay(j){const ship=vehicles.get('ship');assert.ok(j>0&&ship.state.energyJ>=j);
  vehicles.update('ship',{...ship.state,energyJ:ship.state.energyJ-j});usedJ+=j;}
 const local=(x,z)=>{const a=x/body.radius,b=z/body.radius;
  return [Math.sin(a)*Math.cos(b),Math.cos(a)*Math.cos(b),Math.sin(b)];};
 const shipLocal=[0,1,0],operatorLocal=local(50,15);
 function installSite(id,x,z){
  const kit=m.inventory(D.SHIP).find(l=>l.materialId===id),job='plant8e:'+id;
  assert.ok(kit,'first facility must come from actual manifest: '+id);
  const spec=Site.KITS[id];pay(spec.workJ);
  const out=Site.install({jobId:job,assetId:'facility8e:'+id,materials:m.snapshot(),physical:p,
   shipContainerId:D.SHIP,kitLotId:kit.id,bodyId:body.id,local:local(x,z),
   bodyRadius:body.radius,shipLocal,operatorLocal,
   energyReceipt:{operationId:job,sourceId:'ship-main:engineering-battery',usedJ:spec.workJ}});
  m=M.create(out.materials);p=out.physical;return out.machine;
 }
 const furnace=installSite('plant_kit_reduction_furnace',50,0),
  vessel=installSite('vessel_kit_carbon_monoxide',50,30),
  pipeline=installSite('plant_kit_pressure_pipeline',65,15);
 assert.equal(pipeline.state.station,'pressure_pipeline');
 function installMachine(id){
  const kit=m.inventory(D.SHIP).find(l=>l.materialId===id),q=Install.quote({lotId:kit.id,
   materials:m.snapshot(),physical:p,containerId:D.SHIP}),job='install8f:'+id;
  pay(q.workJ);
  const r=Install.install({lotId:kit.id,materials:m.snapshot(),physical:p,containerId:D.SHIP,
   assetId:'machine8f:'+id,operationId:job,shipLanded:true,operatorNear:true,
   workshopInstalled:true,shipPowerEnabled:true,bodyId:body.id,
   energyReceipt:{operationId:job,sourceId:'ship-main:engineering-battery',usedJ:q.workJ}});
  m=M.create(r.materials);p=r.physical;return{id:r.machine.id,station:r.machine.state.station,
   tools:r.machine.state.tools,installed:true,condition:1};
 }
 const cnc=installMachine('machine_kit_cnc'),etcher=installMachine('machine_kit_etcher'),
  solder=installMachine('machine_kit_solder_station');
 close(total(m,p),initialMass);
 resources.survey(deposit,0);
 for(let i=0;i<5;i++){
  mining.startDrill({deposit,surveyed:true,bodyId:body.id,truckBodyId:body.id,
   truckPresent:true,operatorNear:true,energyJ:truckJ});
  for(let n=0;n<12;n++){const j=mining.advance(2,truckJ).usedJ;truckJ-=j;truckUsedJ+=j;}
  let out=mining.commit(m,resources);m=out.materials;resources=out.resources;
  const lot=m.inventory(D.TRUCK).at(-1);
  mining.startLoad({lotId:lot.id,massKg:20,bodyId:body.id,truckBodyId:body.id,
   shipBodyId:body.id,truckNearShip:true,operatorNear:true,energyJ:truckJ});
  for(let n=0;n<8;n++){const j=mining.advance(2,truckJ).usedJ;truckJ-=j;truckUsedJ+=j;}
  out=mining.commit(m,resources);m=out.materials;resources=out.resources;
 }
 let trans=Transform.create().snapshot();const ref=Ref.create();
 function refine(mode){
  const job=ref.start({mode,materials:m.snapshot(),sourceContainerId:D.SHIP,outputContainerId:D.SHIP,
   workshopInstalled:true,shipLanded:true,shipBodyId:body.id,powerEnabled:true,batteryJ:vehicles.get('ship').state.energyJ});
  while(ref.active.elapsedS<job.seconds-1e-8)pay(ref.step(10,vehicles.get('ship').state.energyJ,true).usedJ);
  const out=ref.commit(m.snapshot(),Transform.create(trans));m=M.create(out.materials);trans=out.transformations;
 }
 for(let i=0;i<5;i++)refine('iron_sort');for(let i=0;i<9;i++)refine('iron_mineralogy');
 let plant=Plant.create();
 function react(reactionId,scaleMol){
  const batch=Chem.batch(reactionId,scaleMol),id='fresh:'+reactionId;pay(batch.energyJ);
  const out=plant.process({id,reactionId,scaleMol,materials:m.snapshot(),sourceContainerId:D.SHIP,
   destinations:{iron:D.SHIP,steel:D.SHIP,carbon_monoxide:vessel.state.containerId},assetState:p,
   station:{id:furnace.id,physicalAssetId:furnace.id,kind:furnace.state.station,condition:1,
    bodyId:body.id,sourceContainerId:D.SHIP,enabled:true,installed:true,tools:furnace.state.tools,
    vesselAssetIds:{carbon_monoxide:vessel.id}},bodyId:body.id,
   energyReceipt:{operationId:id,sourceId:'ship-main:engineering-battery',usedJ:batch.energyJ}});
  m=M.create(out.materials);plant=Plant.create(out.operations);
 }
 react('hematite_reduction',70);react('steel_alloying',.8);
 const factory=F.create(),bench={id:'ship-main:fabrication:low-tech-bench',station:'bench',
  tools:['hand-shear','bending-brake','glass-cutter'],installed:true,condition:1},
  assembly={id:'ship-main:fabrication:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1};
 function make(recipeId,machine){
  const job=factory.start({recipeId,machine,materials:m.snapshot(),sourceContainerId:D.SHIP,
   outputContainerId:D.SHIP,shipLanded:true,bodyId:body.id,powerEnabled:true,batteryJ:vehicles.get('ship').state.energyJ});
  while(factory.active.elapsedS<job.seconds-1e-8)pay(factory.step(10,vehicles.get('ship').state.energyJ,true).usedJ);
  const out=factory.commit({materials:m.snapshot(),transformer:Transform.create(trans),machine});
  m=M.create(out.materials);trans=out.transformations;factory.apply(out.factory);
 }
 make('pcb',etcher);make('populated_board',solder);
 assert.ok(m.inventory(D.SHIP).some(l=>l.materialId==='control_board'&&l.provenance.startsWith('process:')));
 for(let i=0;i<5;i++)make('iron_bracket',bench);for(let i=0;i<4;i++)make('steel_bracket',bench);
 make('machine_kit_hand_winder',assembly);const hand=installMachine('machine_kit_hand_winder');
 make('motor_field_coil',hand);make('brushed_dc_motor',hand);make('drill_head',cnc);
 const head=m.inventory(D.SHIP).find(l=>l.materialId==='drill_head'&&l.provenance.startsWith('process:'));
 assert.ok(head,'manufactured renewable replacement, not shipped spare');
 mining.startService({lotId:head.id,materials:m,bodyId:body.id,truckBodyId:body.id,shipBodyId:body.id,
  truckPresent:true,truckNearShip:true,operatorNear:true,truckIdle:true,energyJ:truckJ});
 for(let n=0;n<30;n++){const j=mining.advance(2,truckJ).usedJ;truckJ-=j;truckUsedJ+=j;}
 const serviced=mining.commit(m,resources);m=serviced.materials;
 assert.equal(mining.toolCondition,1);
 assert.equal(m.inventory(D.SHIP).filter(l=>l.materialId==='drill_head').reduce((n,l)=>n+l.massKg,0),4,'both original spares remain');
 assert.ok(m.inventory(D.SHIP).some(l=>l.materialId==='electric_motor'&&l.provenance.startsWith('process:')));
 close(total(m,p),initialMass+100);close(initialJ-vehicles.get('ship').state.energyJ,usedJ);
 close(44e6-truckJ,truckUsedJ);
 assert.equal(p.assets.filter(a=>a.type==='truck').length,1);
 const old=JSON.parse(JSON.stringify(seeded.receipt));delete old.manifestVersion;
 assert.deepEqual(S.prepare(m.snapshot(),{schema:1,seed:742,startedAt:1},old,D.SHIP).materials,m.snapshot(),
  'previous manifest version must never cause replenishment');
 console.log('PASS finite source-owned fresh boot -> natural iron -> motor -> CNC replacement -> drill service',
  JSON.stringify({manifestKg:S.SUM.massKg,manifestM3:S.SUM.volumeM3,minedKg:100,usedShipJ:usedJ,usedTruckJ:truckUsedJ}));
});
