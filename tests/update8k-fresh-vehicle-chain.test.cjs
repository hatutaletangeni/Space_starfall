/* Continuous source integration from the real finite manifest and seed-742
 * geology to a fully fabricated, activated, driven and cargo-loaded rover.
 * No imported test materials, finished-part fixtures or arbitrary battery
 * credits. Native rated ship generation supplies every extra joule.
 * Scope: movement/placement prerequisites are contract inputs; native Flight.js
 * locomotion and gas-pipeline ticks are covered separately. This is not an
 * unassisted player expedition certificate.
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
require('../src/physics/power.js');require('../src/physics/foundation.js');
const Atmos=require('../src/physics/atmosphere-emission8j.js'),Waste=require('../src/physics/tailings-storage8h.js');
const Assembly=require('../src/physics/assembly8g.js'),Contract=require('../src/physics/vehicle-assembly-contract8g.js');
require('../src/physics/vehicle-drive8g.js');const Activate=require('../src/physics/vehicle-activation8g.js'),Cargo=require('../src/physics/frame-cargo8g.js');
test('finite fresh geology -> paid plant and all rover parts -> unique active replacement -> original truck abandoned and rover loaded',()=>{
 const galaxy=Galaxy.generateGalaxy(742,64),body=galaxy.byId.get('star-0-p1');
 assert.equal(body.type,'Ice');assert.equal(body.life,false);
 const profile=StarfallPhysics.bodyProfile(body,StarfallPhysics.starProfile(galaxy.systems[0].star));
 const sites=R.neighbors(body,[1,0,0],742,12);
 const find=type=>sites.filter(x=>x.type===type&&x.accessibleMassKg>=1000).sort((a,b)=>b.grade-a.grade)[0];
 const deposits={iron_ore:find('iron_ore'),carbon_feed:find('carbon_feed')};
 assert.ok(deposits.iron_ore&&deposits.carbon_feed,'original galaxy needs both natural sources');
 let m=D.prepareContainers(M.create()),p=P.create().serialize(),resources=R.create(),mining=D.create(null,M,R),trans=Transform.create().snapshot();
 const seeded=S.prepare(m.snapshot(),{schema:1,seed:742,startedAt:1},null,D.SHIP);m=M.create(seeded.materials);
 const initialMass=total(m,p),vehicles=V.createStore(),initialShipJ=vehicles.get('ship').state.energyJ;
 let usedJ=0,generatedJ=0,chargingSeconds=0,truckJ=44e6,truckUsedJ=0,minedKg=0,serial=0,world=null,emittedKg=0,pile;
 const physical=P.create(p);physical.move('truck-expedition-001',{kind:'surface',bodyId:body.id,local:[0,1,0]},'8k-source-unload');p=physical.serialize();
 function pay(j){assert.ok(j>0&&Number.isFinite(j));let ship=vehicles.get('ship');
  assert.ok(j<=ship.stats.batteryCapacityJ,'single process must fit original battery');
  while(ship.state.energyJ+1e-7<j){const next=StarfallPower.step(ship.stats,ship.state,100,{occluded:true,ambientK:290},{});
   assert.ok(next.netEnergyJ>0);generatedJ+=next.netEnergyJ;chargingSeconds+=100;
   vehicles.update('ship',next.state);ship=vehicles.get('ship');}
  vehicles.update('ship',{...ship.state,energyJ:ship.state.energyJ-j});usedJ+=j;
 }
 function receipt(id,j){pay(j);return{operationId:id,sourceId:'ship-main:engineering-battery',status:'COMMITTED',usedJ:j};}
 const amount=id=>m.inventory(D.SHIP).filter(l=>l.materialId===id).reduce((s,l)=>s+l.massKg,0);
 const machines=[{id:'ship-main:bench',station:'bench',tools:['hand-shear','bending-brake','glass-cutter'],installed:true,condition:1},
  {id:'ship-main:kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1},
  {id:'ship-main:wire-die',station:'wire',tools:['wire-die'],installed:true,condition:1}];
 const toolKits={'hand-winder':'machine_kit_hand_winder',cnc:'machine_kit_cnc',lathe:'machine_kit_cnc',
  grinder:'machine_kit_grinder',caster:'machine_kit_caster','manual-press':'machine_kit_manual_press',
  extruder:'machine_kit_extruder',etching:'machine_kit_etcher','solder-station':'machine_kit_solder_station',
  'cell-assembly':'machine_kit_battery','module-laminator':'machine_kit_laminator'};
 const surface=[],vessels=[];let furnace,plant=Plant.create(),factory=F.create(),ref=Ref.create(),makingVessel=false;
 const local=(r,a)=>[Math.sin(r/body.radius)*Math.cos(a),Math.cos(r/body.radius),Math.sin(r/body.radius)*Math.sin(a)];
 function installSite(id){ensure(id,Site.KITS[id].massKg);const kit=m.inventory(D.SHIP).find(l=>l.materialId===id),spec=Site.KITS[id],job='plant8e:chain-'+(++serial);
  let at;for(let i=0;i<40;i++){const candidate=local(54,i*2*Math.PI/40);
   try{Site.quote({materials:m.snapshot(),physical:p,kitLotId:kit.id,shipContainerId:D.SHIP,bodyId:body.id,
    local:candidate,bodyRadius:body.radius,shipLocal:[0,1,0],operatorLocal:candidate});at=candidate;break;}catch(e){if(!/footprint overlaps/.test(e.message))throw e;}}
  assert.ok(at,'finite construction ring full');
  const out=Site.install({jobId:job,assetId:'facility8e:chain-'+serial,materials:m.snapshot(),physical:p,
   kitLotId:kit.id,shipContainerId:D.SHIP,bodyId:body.id,local:at,bodyRadius:body.radius,
   shipLocal:[0,1,0],operatorLocal:at,energyReceipt:receipt(job,spec.workJ)});
  m=M.create(out.materials);p=out.physical;surface.push(out.machine);return out.machine;
 }
 function installMachine(id){ensure(id,Install.CAPS[id].massKg);const kit=m.inventory(D.SHIP).find(l=>l.materialId===id),job='install8f:chain-'+(++serial);
  const q=Install.quote({materials:m.snapshot(),physical:p,lotId:kit.id,containerId:D.SHIP});
  const out=Install.install({materials:m.snapshot(),physical:p,lotId:kit.id,containerId:D.SHIP,
   assetId:'machine8f:chain-'+serial,operationId:job,bodyId:body.id,shipLanded:true,operatorNear:true,
   workshopInstalled:true,shipPowerEnabled:true,energyReceipt:receipt(job,q.workJ)});
  m=M.create(out.materials);p=out.physical;machines.push({id:out.machine.id,station:out.machine.state.station,
   tools:out.machine.state.tools,installed:true,condition:1});
 }
 function mine(type){
  if(m.used(D.SHIP).massKg>8000&&pile){let moved=0;
   for(const lot of m.inventory(D.SHIP).filter(l=>Waste.eligible(l,ref.snapshot()))){if(moved>500)break;
    const kg=Math.min(lot.massKg,500-moved);if(kg<=0)break;const id='8h-tailings:chain-'+(++serial);
    chargeFor(5000+kg*500);const before=vehicles.get('ship').state.energyJ;
    const q=Waste.transfer({jobId:id,materials:m.snapshot(),physical:p,refinery:ref.snapshot(),stockpileId:pile.id,
     lotId:lot.id,massKg:kg,bodyId:body.id,bodyRadius:body.radius,shipLocal:[0,1,0],evaLocal:pile.location.local,
     shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:before});
    m=M.create(q.materials);pay(before-q.shipEnergyJ);moved+=kg;
   }
  }
  const deposit=deposits[type];assert.ok(deposit,'natural '+type+' unavailable');
  if(mining.toolCondition<.12){ensure('drill_head',2);const head=m.inventory(D.SHIP).find(l=>l.materialId==='drill_head');
   mining.startService({lotId:head.id,materials:m,bodyId:body.id,truckBodyId:body.id,shipBodyId:body.id,
    truckPresent:true,truckNearShip:true,operatorNear:true,truckIdle:true,energyJ:truckJ});advance();}
  if(!resources.observations().some(x=>x.siteId===deposit.id))resources.survey(deposit,0);
  mining.startDrill({deposit,surveyed:true,bodyId:body.id,truckBodyId:body.id,truckPresent:true,
   operatorNear:true,truckIdle:true,energyJ:truckJ});advance();minedKg+=20;
  const lot=m.inventory(D.TRUCK).at(-1);mining.startLoad({lotId:lot.id,massKg:20,bodyId:body.id,
   truckBodyId:body.id,shipBodyId:body.id,truckNearShip:true,operatorNear:true,truckIdle:true,energyJ:truckJ});advance();
 }
 function advance(){while(mining.active.elapsedS<mining.active.durationS-1e-8){const out=mining.advance(2,truckJ);truckJ-=out.usedJ;truckUsedJ+=out.usedJ;}
  const out=mining.commit(m,resources);m=out.materials;resources=out.resources;
 }
 function refine(mode){const spec=Ref.MODES[mode];while(!m.inventory(D.SHIP).some(l=>l.materialId===spec.material&&l.massKg+1e-7>=spec.massKg)){
   if(mode==='iron_sort')mine('iron_ore');else if(mode==='carbon_recovery')mine('carbon_feed');else if(mode==='iron_mineralogy')refine('iron_sort');else throw Error('unsupported natural recipe '+mode);}
  const job=ref.start({mode,materials:m.snapshot(),sourceContainerId:D.SHIP,outputContainerId:D.SHIP,
   workshopInstalled:true,shipLanded:true,shipBodyId:body.id,powerEnabled:true,batteryJ:vehicles.get('ship').state.energyJ});
  while(ref.active.elapsedS<job.seconds-1e-8){if(vehicles.get('ship').state.energyJ<job.powerW*10)chargeFor(job.powerW*10);
   pay(ref.step(10,vehicles.get('ship').state.energyJ,true).usedJ);}
  const out=ref.commit(m.snapshot(),Transform.create(trans));m=M.create(out.materials);trans=out.transformations;
 }
 function chargeFor(j){const ship=vehicles.get('ship');if(ship.state.energyJ>=j)return;
  // Charge using the original rated source, retaining ordinary native loads.
  const next=StarfallPower.step(ship.stats,ship.state,100,{occluded:true,ambientK:290},{});
  generatedJ+=next.netEnergyJ;chargingSeconds+=100;vehicles.update('ship',next.state);chargeFor(j);
 }
 function react(id,scale){const batch=Chem.batch(id,scale);
  for(const [key,kg]of Object.entries(batch.inputs))ensure(key,kg);
  let tank;if(batch.outputs.carbon_monoxide){
   const density=(Chem.molarMass('carbon_monoxide')/1000)*5e6/(8.314462618*293.15);
   tank=vessels.find(v=>m.used(v.state.containerId).volumeM3+batch.outputs.carbon_monoxide/density<=4+1e-7);
   if(!tank){assert.ok(!makingVessel,'new CO storage must be constructed before exhausting the previous vessel');makingVessel=true;
    vessels.push(installSite('vessel_kit_carbon_monoxide'));makingVessel=false;tank=vessels.at(-1);}
  }
  const op='8k-chain-chemical-'+(++serial),out=plant.process({id:op,reactionId:id,scaleMol:scale,
   materials:m.snapshot(),sourceContainerId:D.SHIP,destinations:{iron:D.SHIP,steel:D.SHIP,carbon_monoxide:tank?.state.containerId},
   assetState:p,station:{id:furnace.id,physicalAssetId:furnace.id,kind:'reduction_furnace',condition:1,
    bodyId:body.id,sourceContainerId:D.SHIP,enabled:true,installed:true,tools:furnace.state.tools,
    vesselAssetIds:{carbon_monoxide:tank?.id}},bodyId:body.id,energyReceipt:receipt(op,batch.energyJ)});
  m=M.create(out.materials);plant=Plant.create(out.operations);
  // Use the existing explicit source-paid 8J outlet on this genuinely
  // sterile world. No spontaneous CO deletion and no fabricated new vessels.
  while(vessels.reduce((s,v)=>s+4-m.used(v.state.containerId).volumeM3,0)<2.2){
   const v=vessels[0],l=m.inventory(v.state.containerId).find(l=>l.materialId==='carbon_monoxide');
   assert.ok(l);const kg=Math.min(10,l.massKg);chargeFor(kg*Atmos.WORK_J_KG);
   const before=vehicles.get('ship').state.energyJ,q=Atmos.emit({receiptId:'atm8j:chain-'+(++serial),
    bodyId:body.id,profile,savedWorld:world,materials:m.snapshot(),physical:p,vesselId:v.id,
    sourceLotId:l.id,kg,timeS:serial,shipLanded:true,operatorEVA:true,shipPowered:true,
    operatorNear:true,vesselNear:true,landable:true,protectedWorld:false,nativeLife:body.life,
    shipEnergyJ:before});
   m=M.create(q.materials);world=q.world;emittedKg+=kg;pay(before-q.shipEnergyJ);
  }
 }
 function make(id){const r=StarfallManufacturing8F.RECIPES[id];assert.ok(r,'original recipe '+id);
  let machine=machines.find(x=>x.station===r.station&&x.tools.includes(r.tool));
  if(!machine){assert.ok(toolKits[r.tool],'original tool for '+r.tool);installMachine(toolKits[r.tool]);machine=machines.find(x=>x.station===r.station&&x.tools.includes(r.tool));}
  let rounds=0;do{assert.ok(++rounds<15,'bounded complete input plan '+id);
   for(const [key,kg]of Object.entries(r.inputs))ensure(key,kg);
  }while(Object.entries(r.inputs).some(([key,kg])=>amount(key)+1e-7<kg));
  chargeFor(r.powerW*10);const job=factory.start({recipeId:id,machine,materials:m.snapshot(),
   sourceContainerId:D.SHIP,outputContainerId:D.SHIP,shipLanded:true,bodyId:body.id,powerEnabled:true,batteryJ:vehicles.get('ship').state.energyJ});
  while(factory.active.elapsedS<job.seconds-1e-8){chargeFor(job.powerW*10);pay(factory.step(10,vehicles.get('ship').state.energyJ,true).usedJ);}
  const out=factory.commit({materials:m.snapshot(),transformer:Transform.create(trans),machine});
  m=M.create(out.materials);trans=out.transformations;factory.apply(out.factory);
 }
 function ensure(id,kg){let limit=0;while(amount(id)+1e-7<kg){assert.ok(++limit<2000,'bounded production '+id);
   if(id==='carbon')refine('carbon_recovery');else if(id==='hematite')refine('iron_mineralogy');
   else if(id==='iron')react('hematite_reduction',100);else if(id==='steel')react('steel_alloying',1);
   else {const recipe=id==='electric_motor'?'brushed_dc_motor':Object.keys(StarfallManufacturing8F.RECIPES).find(k=>StarfallManufacturing8F.RECIPES[k].outputs[id]);
    assert.ok(recipe,'finite starting supply exhausted: '+JSON.stringify({id,vessels:vessels.length,minedKg,steel:amount('steel'),aluminum:amount('aluminum'),copper:amount('copper'),batches:factory.snapshot().receipts.length}));make(recipe);}
  }}
 furnace=installSite('plant_kit_reduction_furnace');vessels.push(installSite('vessel_kit_carbon_monoxide'));
 pile=installSite('plant_kit_tailings_stockpile');
 const pad=installSite('plant_kit_vehicle_assembly_pad');
 let rounds=0;do{assert.ok(++rounds<10,'bounded full rover bill');
  for(const [id,kg]of Object.entries(Assembly.DEFINITIONS.science_rover.parts))ensure(id,kg);
 }while(Object.entries(Assembly.DEFINITIONS.science_rover.parts).some(([id,kg])=>amount(id)+1e-7<kg));
 const id='vehicle8g:fresh-rover',op=Contract.create().stage({jobId:id,blueprintId:'science_rover',facilityId:pad.id,
  containerId:D.SHIP,bodyId:body.id,local:pad.location.local,materials:m.snapshot(),physical:p,powerReceipt:receipt(id,200000)});
 m=M.create(op.materials);p=op.physical;
 const activation=Activate.activate({assetId:id,physical:p,assembly:op.assembly,bodyId:body.id,facilityId:pad.id,powerReceipt:receipt('activate:'+id,Activate.WORK_J)});p=activation.physical;
 const rover=p.assets.find(a=>a.id===id),drive=StarfallVehicleDrive8G.create(rover.state.hardware,rover.state.drive);
 assert.ok(drive.step({throttle:1},{gravityMS2:9.81,slopeRad:0,frictionCoefficient:.7},.05).speedMS>0);
 // Original is deliberately left on A. The real gantry loads only the NEW ID.
 const loaded=Cargo.transfer({jobId:'fresh-frame-load',assetId:id,action:'load',physical:p,materials:m.snapshot(),bodyId:body.id,
  shipLocal:[0,1,0],evaLocal:pad.location.local,bodyRadius:body.radius,shipLanded:true,operatorEVA:true,powerReceipt:receipt('fresh-frame-load',Cargo.LIMIT.workJ)});p=loaded.physical;
 assert.equal(p.assets.find(a=>a.id==='truck-expedition-001').location.bodyId,body.id);
 assert.equal(p.assets.find(a=>a.id===id).location.kind,'ship');assert.equal(p.assets.filter(a=>a.type==='truck').length,1);
 assert.ok(rover.state.operational&&rover.state.commissioned);assert.ok(minedKg>1000);assert.ok(generatedJ>0);
 close(total(m,p)+emittedKg,initialMass+minedKg,1e-5);close(initialShipJ+generatedJ-usedJ,vehicles.get('ship').state.energyJ,1e-4);
 close(44e6-truckJ,truckUsedJ,1e-5);assert.ok(truckJ>0);
 const snapshot=JSON.parse(JSON.stringify({materials8a:m.snapshot(),physical8a:p,mining8d:mining.snapshot(),resources8c:resources.serialize(),vehicleAssembly8g:op.assembly,engineeringVehicles:vehicles.serialize(),industrialPlant8e:plant.snapshot(),factory8f:factory.snapshot()}));
 assert.equal(P.create(snapshot.physical8a).get(id).state.operational,true);M.create(snapshot.materials8a);
 const fs=require('node:fs');fs.mkdirSync('artifacts/8k-fresh-vehicle',{recursive:true});
 fs.writeFileSync('artifacts/8k-fresh-vehicle/source-owned-final-state.json',JSON.stringify({scope:'SOURCE CONTRACT INTEGRATION; movement and gas-pump tick prerequisites are exercised separately',initialManifest:seeded.receipt,world8j:world,saved:snapshot},null,2));
 console.log('PASS actual finite manifest -> original natural mining -> all real machine/part recipes -> commissioned rover -> cargo',JSON.stringify({
  minedKg,roverKg:rover.massKg,usedShipJ:usedJ,sourceGeneratedJ:generatedJ,chargingSeconds,usedTruckJ:truckUsedJ,
  manufacturedBatches:factory.snapshot().receipts.length,COvessels:vessels.length,sourcePaidCOEmittedKg:emittedKg,pressureDeltaPa:world?.pressureDeltaPa,originalTruckWorld:body.id}));
});
