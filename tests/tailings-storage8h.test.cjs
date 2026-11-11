'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../src/physics/material-ledger8a.js'),P=require('../src/physics/physical-inventory8a.js'),D=require('../src/physics/mining-hauling8d.js');
const Galaxy=require('../src/galaxy.js');require('../src/physics/celestial-composition-cw01.js');require('../src/terrain/geology-cw03.js');
const R=require('../src/physics/planetary-resources8c.js'),S=require('../src/physics/starter-manifest8k.js'),Site=require('../src/physics/industrial-site8e.js');
require('../src/physics/stock-parts8f.js');require('../src/physics/kit-recipes8f.js');require('../src/physics/manufacturing8f.js');
const F=require('../src/physics/factory8f.js'),T=require('../src/physics/transformation8e.js'),Ref=require('../src/physics/refinery8e.js'),Waste=require('../src/physics/tailings-storage8h.js');
function actual(){
 const body=Galaxy.generateGalaxy(742,64).byId.get('star-0-p0'),deposit=R.neighbors(body,[1,0,0],742,8).find(x=>x.type==='iron_ore');
 let m=D.prepareContainers(M.create()),physical=P.create().serialize(),resources=R.create(),mining=D.create(null,M,R),energyJ=10e6,truckJ=44e6;
 m=M.create(S.prepare(m.snapshot(),{schema:1,seed:742,startedAt:1},null,D.SHIP).materials);
 // Actual shipped steel/polymer -> native 8F kit work -> native physical erection.
 const f=F.create(),machine={id:'original-ship-kit-fixture',station:'assembly',tools:['kit-fixture'],installed:true,condition:1};
 const job=f.start({recipeId:'plant_kit_tailings_stockpile',materials:m.snapshot(),sourceContainerId:D.SHIP,
  outputContainerId:D.SHIP,machine,shipLanded:true,bodyId:body.id,powerEnabled:true,batteryJ:energyJ});
 while(f.active.elapsedS<job.seconds-1e-8)energyJ-=f.step(10,energyJ,true).usedJ;
 const made=f.commit({materials:m.snapshot(),transformer:T.create(),machine});m=M.create(made.materials);
 const kit=m.inventory(D.SHIP).find(l=>l.materialId==='plant_kit_tailings_stockpile'),local=[Math.sin(50/body.radius),Math.cos(50/body.radius),0];
 const installed=Site.install({jobId:'plant8e:tailings',assetId:'facility8e:tailings',materials:m.snapshot(),physical,
  shipContainerId:D.SHIP,kitLotId:kit.id,bodyId:body.id,local,bodyRadius:body.radius,shipLocal:[0,1,0],operatorLocal:local,
  energyReceipt:{operationId:'plant8e:tailings',sourceId:'ship-main:engineering-battery',usedJ:120000}});
 energyJ-=120000;m=M.create(installed.materials);physical=installed.physical;
 resources.survey(deposit,0);mining.startDrill({deposit,surveyed:true,bodyId:body.id,truckBodyId:body.id,
  truckPresent:true,operatorNear:true,energyJ:truckJ});
 while(mining.active.elapsedS<24-1e-8)truckJ-=mining.advance(2,truckJ).usedJ;
 let out=mining.commit(m,resources);m=out.materials;resources=out.resources;
 const ore=m.inventory(D.TRUCK)[0];mining.startLoad({lotId:ore.id,massKg:20,bodyId:body.id,truckBodyId:body.id,
  shipBodyId:body.id,truckNearShip:true,operatorNear:true,energyJ:truckJ});
 while(mining.active.elapsedS<16-1e-8)truckJ-=mining.advance(2,truckJ).usedJ;
 out=mining.commit(m,resources);m=out.materials;
 const refinery=Ref.create(),j=refinery.start({mode:'iron_sort',materials:m.snapshot(),sourceContainerId:D.SHIP,
  outputContainerId:D.SHIP,workshopInstalled:true,shipLanded:true,shipBodyId:body.id,powerEnabled:true,batteryJ:energyJ});
 while(refinery.active.elapsedS<j.seconds-1e-8)energyJ-=refinery.step(10,energyJ,true).usedJ;
 const done=refinery.commit(m.snapshot(),T.create(made.transformations));m=M.create(done.materials);
 const lot=m.inventory(D.SHIP).find(l=>l.materialId==='iron_tailings');assert.ok(lot);
 return{jobId:'8h-tailings:1',materials:m.snapshot(),physical,refinery:refinery.snapshot(),stockpileId:installed.machine.id,
  lotId:lot.id,massKg:lot.massKg,bodyId:body.id,bodyRadius:body.radius,shipLocal:[0,1,0],evaLocal:local,
  shipLanded:true,operatorEVA:true,shipPowered:true,shipEnergyJ:energyJ};
}
test('genuine shipped inputs -> fabricated/installed bounded pile -> natural mined/refined residue custody, energy and replay',()=>{
 const a=actual(),before=structuredClone(a),q=Waste.transfer(a),cid=a.physical.assets.find(x=>x.id===a.stockpileId).state.containerId;
 assert.deepEqual(a,before);assert.equal(q.usedJ,5000+a.massKg*500);
 assert.ok(Math.abs(a.shipEnergyJ-q.shipEnergyJ-q.usedJ)<1e-7);assert.equal(q.receipt.energySourceId,'ship-main:engineering-battery');
 assert.equal(M.create(q.materials).inventory(cid).length,1);
 assert.ok(M.create(q.materials).used(D.SHIP).massKg<M.create(a.materials).used(D.SHIP).massKg);
 assert.equal(q.materials.lots.reduce((n,l)=>n+l.massKg,0),a.materials.lots.reduce((n,l)=>n+l.massKg,0));
 const again=Waste.transfer({...a,materials:JSON.parse(JSON.stringify(q.materials)),shipEnergyJ:q.shipEnergyJ});
 assert.equal(again.duplicate,true);assert.equal(again.shipEnergyJ,q.shipEnergyJ);assert.equal(again.usedJ,0);
 assert.throws(()=>Waste.transfer({...a,materials:q.materials,massKg:a.massKg/2}),/replay conflicts/);
});
test('pile rejects unmanufactured containers, remote/unpowered work, reservation conflicts and non-residue cargo',()=>{
 const a=actual(),before=JSON.stringify(a);
 for(const patch of [{shipPowered:false},{shipLanded:false},{operatorEVA:false},{bodyId:'other-world'},
  {shipEnergyJ:0},{massKg:501},{evaLocal:[0,-1,0]},
  {physical:{...a.physical,transfers:[]}},
  {refinery:{schema:1,receipts:[]}},
  {lotId:a.materials.lots.find(l=>l.materialId==='water').id}])assert.throws(()=>Waste.transfer({...a,...patch}));
 const full=structuredClone(a);full.materials.containers.find(c=>c.id.startsWith('tailings8h:')).maxMassKg=1;
 assert.throws(()=>Waste.transfer(full),/paid same-world/);
 const m=M.create(a.materials);m.reserve('another-owner',a.lotId,D.TRUCK,a.massKg);
 assert.throws(()=>Waste.transfer({...a,materials:m.snapshot()}),/unreserved stock/);
 assert.equal(JSON.stringify(a),before);
});
test('actual runtime batches tailings durably, with no in-memory debit on failed persistence',()=>{
 const a=actual(),source=fs.readFileSync(require.resolve('../src/flight.js'),'utf8'),start=source.indexOf('function tailingsContext8H(){'),end=source.indexOf('function miningContext8D(){',start);
 let store=M.create(a.materials),saved={},fail=false,ship={state:{energyJ:a.shipEnergyJ,powerEnabled:true,loads:{avionics:true}}};
 const scope={StarfallTailingsStorage8H:Waste,StarfallMaterials8A:M,StarfallMining8D:D,
  materials8a:store,physical8a:P.create(a.physical),refinery8e:{snapshot:()=>a.refinery},
  vehicleStore:{get:()=>structuredClone(ship),serialize:()=>({schema:1,states:{ship:structuredClone(ship.state)}}),update:(id,state)=>{ship={state};}},
  nearest:{id:a.bodyId,name:'World A',radius:a.bodyRadius},shipBody:null,landed:true,eva:true,truckOccupied:false,
  manufacturedOccupied8G:null,shipWalking8e:false,interiorState:null,shipLocal:a.shipLocal,evaLocal:a.evaLocal,
  saveFlight:()=>true,showToast:()=>{},SF:{storageStatus:()=>({durable:true}),save:p=>{if(fail)return false;saved=structuredClone(p);return true;},load:()=>saved}};
 scope.shipBody=scope.nearest;vm.createContext(scope);vm.runInContext(source.slice(start,end),scope);
 fail=true;assert.throws(()=>scope.tailingsTransfer8H(a.stockpileId),/not durably saved/);
 assert.deepEqual(scope.materials8a.snapshot(),a.materials);assert.equal(ship.state.energyJ,a.shipEnergyJ);
 fail=false;const q=scope.tailingsTransfer8H(a.stockpileId);
 assert.equal(q.massKg,a.massKg);assert.equal(ship.state.energyJ,a.shipEnergyJ-q.usedJ);
 assert.equal(saved.materials8a.operations.at(-1).kind,'8H_TAILINGS_STORAGE');
 assert.throws(()=>scope.tailingsTransfer8H(a.stockpileId),/No original refinery tailings/);
});
