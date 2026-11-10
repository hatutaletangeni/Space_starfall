/* 8K stronger two-world source-model chain. The actual seed-742 galaxy
 * supplies BOTH world IDs/coordinates. Original CW01/CW03/8C geology
 * supplies real ore, original 8D drills and loads it, original 8E installs
 * a kit-paid destination depot, and 8H reserves, sails (state validations)
 * and source-paid delivers original ship stock. No ore fixture import.
 *
 * Explicit limitation: flight positions/time in this deterministic model
 * test are externally advanced scenario states, not continuously integrated
 * actual piloted Flight.js physics. Destination depot kit is a finite
 * predeparture certified fixture. This is NOT final no-debug player proof.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Galaxy=require('../src/galaxy.js');
require('../src/physics/celestial-composition-cw01.js');
require('../src/terrain/geology-cw03.js');
const Resources=require('../src/physics/planetary-resources8c.js');
const Materials=require('../src/physics/material-ledger8a.js');
const Physical=require('../src/physics/physical-inventory8a.js');
const Mining=require('../src/physics/mining-hauling8d.js');
const Site=require('../src/physics/industrial-site8e.js');
require('../src/physics/vehicles.js');
require('../src/physics/logistics-energy8h.js');
require('../src/physics/logistics-battery-bridge8h.js');
const Offworld=require('../src/physics/logistics-offworld-manifest8h.js');
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,a+' != '+b);
const mass=m=>m.lots.reduce((s,l)=>s+l.massKg,0);
const total=(m,p)=>mass(m)+p.assets.reduce((s,a)=>s+a.massKg,0);
const cp=x=>JSON.parse(JSON.stringify(x));
function worlds(){
 const galaxy=Galaxy.generateGalaxy(742,64);
 const choices=galaxy.systems[0].bodies.filter(b=>b.landable&&['planet','moon'].includes(b.kind));
 for(const origin of choices){
  // Search true original 8C planet-fixed sites, never manufacture a deposit.
  const deposits=Resources.neighbors(origin,[1,0,0],742,7);
  const site=deposits.find(d=>d.type==='iron_ore'&&d.accessibleMassKg>=20);
  const dest=choices.find(b=>b.id!==origin.id&&b.systemId===origin.systemId);
  if(site&&dest)return {origin,dest,site};
 }
 throw Error('No original seed-742 iron world and distinct landable destination');
}
const flight=(body,time,landed)=>({seed:742,time,landed,attached:body.id,
 position:[body.position[0],body.position[1]+body.radius+(landed?8:200),body.position[2]],
 groundDirection:[0,1,0]});
test('seed-742 natural ore -> original drill and loader -> prebuilt kit-paid depot -> distinct-world durable ship delivery',()=>{
 const {origin,dest,site}=worlds(),siteAngle=53/dest.radius,siteLocal=[
  Math.sin(siteAngle),Math.cos(siteAngle),0];
 let materials=Mining.prepareContainers(Materials.create()),physical=Physical.create().serialize(),
 resources=Resources.create(),mining=Mining.create(null,Materials,Resources);
 const spec=Site.KITS.plant_kit_cargo_depot;
 materials.importLot({id:'finite-depot-kit',materialId:'plant_kit_cargo_depot',
  containerId:Mining.SHIP,massKg:spec.massKg,volumeM3:spec.volumeM3,grade:1,
  provenance:'predeparture:source-certified-8f-industrial-kit'});
 const initial=total(materials.snapshot(),physical),shipEnergyCost=spec.workJ;
 // Preposition and genuinely INSTALL the destination depot while ship is
 // first at destination, before the later mining/delivery voyage.
 const built=Site.install({jobId:'plant8e:destination-depot',
  assetId:'facility8e:destination-depot',materials:materials.snapshot(),physical,
  shipContainerId:Mining.SHIP,kitLotId:'finite-depot-kit',bodyId:dest.id,
  local:siteLocal,shipLocal:[0,1,0],operatorLocal:siteLocal,
  bodyRadius:dest.radius,energyReceipt:{operationId:'plant8e:destination-depot',
   sourceId:'ship-main:engineering-battery',usedJ:shipEnergyCost}});
 materials=Materials.create(built.materials);physical=built.physical;
 close(total(materials.snapshot(),physical),initial);
 assert.ok(physical.transfers.some(x=>x.assetId==='facility8e:destination-depot'&&x.status==='COMMITTED'));
 // Return to origin (flight state is checked at each 8H API entry).
 const survey=resources.survey(site,10,'EVA field spectrometer');
 assert.equal(survey.siteId,site.id);
 const start=resources.remaining(site);
 const bore=mining.startDrill({deposit:site,surveyed:true,bodyId:origin.id,
  truckBodyId:origin.id,truckPresent:true,operatorNear:true,truckIdle:true,
  energyJ:200000});
 let truckPowerJ=0;
 for(let i=0;i<12;i++)truckPowerJ+=mining.advance(2,100000,{enabled:true}).usedJ;
 const mined=mining.commit(materials,resources);
 materials=mined.materials;resources=mined.resources;
 close(resources.remaining(site),start-20);
 assert.equal(materials.inventory(Mining.TRUCK)[0].provenance,site.id);
 const ore=materials.inventory(Mining.TRUCK)[0];
 const load=mining.startLoad({lotId:ore.id,massKg:20,bodyId:origin.id,
  truckBodyId:origin.id,shipBodyId:origin.id,operatorNear:true,
  truckNearShip:true,truckIdle:true,energyJ:100000});
 for(let i=0;i<8;i++)truckPowerJ+=mining.advance(2,100000,{enabled:true}).usedJ;
 const loaded=mining.commit(materials,resources);
 materials=loaded.materials;resources=loaded.resources;
 close(truckPowerJ,Mining.DRILL.minimumEnergyJ+Mining.LOADER.powerW*Mining.LOADER.durationS);
 assert.equal(materials.inventory(Mining.TRUCK).length,0);
 const shipLot=materials.inventory(Mining.SHIP).find(l=>l.materialId==='iron_ore');
 assert.ok(shipLot&&shipLot.provenance===site.id);
 close(total(materials.snapshot(),physical),initial+20);
 const manifest=Offworld.create(),manifestId='natural-ore-two-world-8k';
 const reserved=manifest.register({id:manifestId,lotId:shipLot.id,
  massKg:20,depotId:'facility8e:destination-depot',
  originWorld:origin,destinationWorld:dest,physical8a:physical,
  materials8a:materials.snapshot(),flightGalaxy:flight(origin,180,true),timeS:180});
 assert.equal(reserved.manifest.status,'RESERVED');
 assert.equal(reserved.receipt.movedKg,0);
 materials=Materials.create(reserved.materials8a);
 const depart=manifest.depart({id:manifestId,flightGalaxy:flight(origin,400,false),
  originWorld:origin,materials8a:materials.snapshot(),timeS:400});
 assert.equal(depart.manifest.status,'IN_TRANSIT');
 assert.equal(materials.inventory(Mining.SHIP).length,1,'Departure must not teleport ore');
 const arrival=manifest.arrive({id:manifestId,flightGalaxy:flight(dest,3000,true),
  destinationWorld:dest,materials8a:materials.snapshot(),timeS:3000});
 assert.equal(arrival.manifest.status,'ARRIVED');
 assert.equal(materials.inventory(Mining.SHIP).length,1);
 const vehicleStore=globalThis.StarfallVehicles.createStore().serialize(),beforeJ=vehicleStore.states.ship.energyJ;
 const received=manifest.deliver({id:manifestId,flightGalaxy:flight(dest,3000,true),
  destinationWorld:dest,operatorLocal:siteLocal,onFoot:true,
  physical8a:physical,materials8a:materials.snapshot(),
  engineeringVehicles:vehicleStore,energyReceipts:[],timeS:3001});
 assert.equal(received.manifest.status,'DELIVERED');
 assert.equal(received.receipt.status,'COMMITTED');
 close(received.movedKg,20);
 assert.equal(received.materials8a.lots.filter(l=>l.containerId===Mining.SHIP&&l.materialId==='iron_ore').length,0);
 const destinationOre=received.materials8a.lots.find(l=>l.materialId==='iron_ore');
 assert.ok(destinationOre&&destinationOre.containerId===built.machine.state.containerId);
 assert.equal(destinationOre.provenance,site.id);
 close(total(received.materials8a,physical),initial+20);
 close(beforeJ-received.engineeringVehicles.states.ship.energyJ,1200);
 assert.equal(received.energyReceipt.sourceId,'starfall-ship');
 const replay=Offworld.create(cp(manifest.snapshot()));
 assert.equal(replay.list()[0].status,'DELIVERED');
 const reload=Materials.create(cp(received.materials8a));
 close(reload.inventory(destinationOre.containerId)[0].massKg,20);
 assert.equal(Resources.create(cp(resources.serialize())).remaining(site),start-20);
 assert.throws(()=>replay.deliver({id:manifestId,flightGalaxy:flight(dest,3001,true),
  destinationWorld:dest,operatorLocal:siteLocal,onFoot:true,physical8a:physical,
  materials8a:received.materials8a,engineeringVehicles:received.engineeringVehicles,
  energyReceipts:received.energyReceipts,timeS:3001}),/requires original landed ship/);
 console.log('PASS natural seed-742 8C deposit '+site.id+' -> 8D actual haul -> original ship -> 8H paid same-system '+origin.id+' to '+dest.id+' receipt, 20kg conserved');
});