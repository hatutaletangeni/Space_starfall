/* 8K integrated original 8I/T09/T02 acceptance.
 * Source modules: 8G charged shell -> 8I commissioning -> finite 8A
 * water/oxygen/sorbent transactions -> native paid T02 wiring -> T09
 * environment under daylight, finite battery and darkness.
 *
 * Test-only starting evidence: certified structural, charged-shell and
 * 8F-manufactured solar/battery and sorbent receipts are modeled fixtures,
 * NOT built by this test. Oxygen, water and media are finite source lots,
 * not free T09 defaults. This cannot certify full no-debug gameplay.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/physics/material-ledger8a.js');
const C=require('../src/physics/habitat-commission8i.js');
const W=require('../src/physics/habitat-supply8i.js');
const O2=require('../src/physics/habitat-oxygen8i.js');
const S=require('../src/physics/habitat-scrubber8i.js');
const Out=require('../src/physics/outposts.js');
const Grid=require('../src/physics/power-ledger-t02.js');
const H=require('../src/physics/habitat-t09.js');
const cp=x=>JSON.parse(JSON.stringify(x));
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,a+' !== '+b);
const R=H.R,BODY='planet',ASSET='structure8g:paid-habitat-1';
function chargedShell(){
 const temp=293.15,o2=21*1000*25/(R*temp),inert=78*1000*25/(R*temp);
 const oxygenKg=o2*.031998,inertKg=inert*.028014,water=20,dry=985.4;
 const h={schema:1,volumeM3:25,tempK:temp,oxygenMol:o2,inertMol:inert,
   carbonMol:0,waterL:water,seal:.98,lastS:0,occupants:0,
   enabled:false,awaitingReview:true,oxygenTankMol:0,inertTankMol:0,
   scrubberCapacityMol:0,airlock:'CLOSED'};
 const gasAndWater=oxygenKg+inertKg+water;
 return{assetId:ASSET,bodyId:BODY,timeS:100,bodyRadius:1000,
   shipLanded:true,operatorEVA:true,shipPowered:true,
   shipLocal:[1,0,0],evaLocal:[1,0,0],shipEnergyJ:30000000,
   operationId:'habcommission8i:'+ASSET+':1',
   materials:{schema:1,containers:[
     {id:'8d:ship-main:materials',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16,kind:'ship cargo'},
     {id:'o2-vessel:gas',ownerId:'o2-vessel',maxMassKg:10,maxVolumeM3:1,kind:'pressurized-gas'}],
    lots:[
     {id:'water-physical-lot',containerId:'8d:ship-main:materials',materialId:'water',
      massKg:10,volumeM3:.01,grade:1,provenance:'8e:water-refining-receipt'},
     {id:'sorbent-physical-lot',containerId:'8d:ship-main:materials',materialId:'scrubber_media',
      massKg:2,volumeM3:.004,grade:1,provenance:'process:8f:paid-sorbent'},
     {id:'oxygen-physical-lot',containerId:'o2-vessel:gas',materialId:'oxygen',
      massKg:2,volumeM3:.04,grade:1,provenance:'8e:paid-water-electrolysis'}],operations:[]},
   physical:{schema:1,assets:[
    {id:ASSET,type:'habitat_envelope',massKg:dry+gasAndWater,
     provenance:'structural-8g:'+ASSET,condition:1,
     location:{kind:'surface',bodyId:BODY,local:[1,0,0]},
     state:{oxygenKg,inertKg,waterKg:water,carbonKg:0,habT09:h,
       habitatCharge8g:{jobId:'habcharge8g:'+ASSET+':1',workJ:1200000,
         addedMassKg:gasAndWater,consumedLots:[
           {lotId:'charged-o2',massKg:oxygenKg},{lotId:'charged-n2',massKg:inertKg},
           {lotId:'charged-water',massKg:water}]}}},
    {id:'o2-vessel',type:'industrial_vessel',condition:1,
     location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'},
     state:{materialId:'oxygen',enabled:true,ratedPressurePa:5e6,containerId:'o2-vessel:gas'}}
   ]},
   assembly:{schema:1,receipts:[{id:ASSET,assetId:ASSET,blueprintId:'habitat_shell',
     bodyId:BODY,facilityId:'paid-factory-habitat-pad',status:'ASSEMBLED_NOT_OPERATIONAL',
     massKg:dry,energyJ:4000000,consumedLots:[{lotId:'certified-envelope-stock',massKg:dry}]}]},
   outpost:{schema:1,seed:742,serial:0,items:[],wires:[]}};
}
function paidSolarReceipt(id,kind,kg,workJ){return{id,kind:'T02_PAID_INSTALL_8I',
 status:'COMMITTED',deviceId:'t02paid:'+id,bodyId:BODY,
 sourceContainerId:'8d:ship-main:materials',installedMassKg:kg,
 workJ,sourceBatteryJBefore:2000000,sourceBatteryJAfter:2000000-workJ};}
test('paid 8I habitat sources run on original 48 V solar/battery and survive blackout/reload',()=>{
 const input=chargedShell(),before=cp(input);
 const commissioned=C.commission(input);
 assert.deepEqual(input,before);
 assert.equal(commissioned.receipt.status,'COMMITTED');
 assert.equal(commissioned.habitat.habT09.scrubberCapacityMol,0);
 assert.equal(commissioned.habitat.habT09.oxygenTankMol,0);
 assert.equal(commissioned.habitat.habT09.inertTankMol,0);
 let mats=commissioned.materials,hab=commissioned.habitat,shipJ=commissioned.shipEnergyJ;
 const energyStart=input.shipEnergyJ;
 const common={bodyId:BODY,bodyRadius:1000,shipLocal:[1,0,0],evaLocal:[1,0,0],
   shipLanded:true,operatorEVA:true,shipPowered:true};
 const water=W.transfer({...common,operationId:'habsupply8i:hab-paid:1',
   materials:mats,habitat:hab,sourceLotId:'water-physical-lot',
   shipContainerId:'8d:ship-main:materials',shipEnergyJ:shipJ,kg:5});
 mats=water.materials;hab=water.habitat;shipJ=water.shipEnergyJ;
 const oxygen=O2.transfer({...common,operationId:'haboxygen8i:hab-paid:1',
   materials:mats,physical:commissioned.physical,habitat:hab,
   habitatId:hab.id,vesselId:'o2-vessel',sourceLotId:'oxygen-physical-lot',
   shipEnergyJ:shipJ,kg:1});
 mats=oxygen.materials;hab=oxygen.habitat;shipJ=oxygen.shipEnergyJ;
 const media=S.refill({...common,operationId:'habscrub8i:hab-paid:1',
   materials:mats,habitat:hab,habitatId:hab.id,sourceLotId:'sorbent-physical-lot',
   shipContainerId:'8d:ship-main:materials',shipEnergyJ:shipJ,kg:1});
 mats=media.materials;hab=media.habitat;shipJ=media.shipEnergyJ;
 close(energyStart-shipJ,C.WORK_J+W.WORK_J_PER_KG*5+O2.WORK_J_PER_KG+S.WORK_J_KG);
 close(mats.lots.find(x=>x.id==='water-physical-lot').massKg,5);
 close(mats.lots.find(x=>x.id==='oxygen-physical-lot').massKg,1);
 close(mats.lots.find(x=>x.id==='sorbent-physical-lot').massKg,1);
 close(hab.habT09.waterL,25);
 close(hab.habT09.oxygenTankMol,1/O2.OXYGEN_KG_PER_MOL);
 close(hab.habT09.scrubberCapacityMol,S.RATIO);
 assert.equal(mats.operations.length,4);
 assert.equal(W.transfer({...common,operationId:water.receipt.id,
   materials:mats,habitat:hab,sourceLotId:'water-physical-lot',
   shipContainerId:'8d:ship-main:materials',shipEnergyJ:shipJ,kg:5}).duplicate,true);
 assert.equal(O2.transfer({...common,operationId:oxygen.receipt.id,
   materials:mats,physical:commissioned.physical,habitat:hab,habitatId:hab.id,
   vesselId:'o2-vessel',sourceLotId:'oxygen-physical-lot',
   shipEnergyJ:shipJ,kg:1}).duplicate,true);
 assert.equal(S.refill({...common,operationId:media.receipt.id,
   materials:mats,habitat:hab,habitatId:hab.id,
   sourceLotId:'sorbent-physical-lot',shipContainerId:'8d:ship-main:materials',
   shipEnergyJ:shipJ,kg:1}).duplicate,true);
 assert.equal(M.create(mats).inventory().length,3);
 const ids=['t02paid8i:solar1','t02paid8i:solar2','t02paid8i:battery1'];
 const receipts=[paidSolarReceipt(ids[0],'solar',8.8,250000),
   paidSolarReceipt(ids[1],'solar',8.8,250000),
   paidSolarReceipt(ids[2],'battery',15.6,450000)];
 mats.operations.push(...receipts);
 const devices=ids.map((id,i)=>({
   id:'t02paid:'+id,kind:i===2?'battery':'solar',bodyId:BODY,
   local:[1,0,0],facing:[0,0,1],condition:1,enabled:true,
   installedMassKg:i===2?15.6:8.8,installOperationId:id,
   paidCertified8I:true,energyJ:0,temperatureK:290,
   ...(i===2?{ratedCapacityJ:9600000,ratedChargeW:1000,ratedDischargeW:1800}:
              {ratedSolarW:400,areaM2:2.3,efficiency:.24})
 }));
 const saved={freshExpedition:{schema:1},physical8a:commissioned.physical,
   materials8a:mats,vehicleAssembly8g:input.assembly,
   outpost5:null};
 const previousSF=globalThis.SF;globalThis.SF={load:()=>saved};
 try{
  const originalOut={...commissioned.outpost,items:[...devices,hab],
   wires:[{a:devices[0].id,b:devices[2].id},
          {a:devices[1].id,b:devices[2].id},
          {a:devices[2].id,b:hab.id}]};
  saved.outpost5=originalOut;
  const store=new Out.Store(742,originalOut);
  const live=store.items.find(x=>x.id===hab.id);
  assert.ok(live,'Original source-owned habitat must survive outpost restore');
  H.command(live,'ENABLE',{near:true,powered:true,now:100});
  H.command(live,'OCCUPANCY',{near:true,occupants:1,now:100});
  const body={id:BODY,kind:'moon',position:[0,0,0],radius:100,
    spinAxis:[0,1,0],spinAngle:0,surfaceTemperatureK:293.15,surfacePressureKPa:0};
  const sunlight=[10000,0,0],darkness=[-10000,0,0],lum=4*Math.PI*9900**2*2000;
  const day=Grid.grid(store,body,sunlight,lum,130,30,1,[],()=>1);
  assert.ok(day.generationW>790);
  assert.equal(day.byId[hab.id].power,true,'Two paid 400 W solar devices serve the 680 W T09');
  assert.ok(store.items.find(x=>x.id===devices[2].id).energyJ>0);
  H.step(live,body,130,day.byId[hab.id].power);
  const powered=H.inspect(live,body,true);
  assert.equal(powered.state,'PRESSURIZED');
  assert.ok(powered.oxygenTankMol<1/O2.OXYGEN_KG_PER_MOL);
  assert.ok(powered.scrubberCapacityMol<S.RATIO);
  assert.ok(powered.waterL<25);
  const savedStock=cp(mats),batteryBefore=store.items.find(x=>x.id===devices[2].id).energyJ;
  const night=Grid.grid(store,body,darkness,lum,131,1,1,[],()=>1);
  assert.equal(night.generationW,0);
  assert.equal(night.byId[hab.id].power,true);
  assert.ok(store.items.find(x=>x.id===devices[2].id).energyJ<batteryBefore);
  H.step(live,body,131,night.byId[hab.id].power);
  const off=Grid.grid(store,body,darkness,lum,132,200,1,[],()=>1);
  assert.equal(off.byId[hab.id].power,false);
  const pre=cp(live.habT09);
  H.step(live,body,332,off.byId[hab.id].power);
  const blackout=H.inspect(live,body,false);
  assert.equal(blackout.state,'UNPOWERED');
  close(live.habT09.oxygenTankMol,pre.oxygenTankMol);
  close(live.habT09.scrubberCapacityMol,pre.scrubberCapacityMol);
  assert.ok(live.habT09.waterL<pre.waterL);
  saved.outpost5=store.serialize();
  const reload=new Out.Store(742,cp(saved.outpost5));
  const persisted=reload.items.find(x=>x.id===hab.id);
  assert.equal(persisted.habT09.lastS,332);
  assert.equal(persisted.habT09.oxygenTankMol,live.habT09.oxygenTankMol);
  assert.equal(persisted.habT09.scrubberCapacityMol,live.habT09.scrubberCapacityMol);
  assert.deepEqual(M.create(cp(savedStock)).snapshot(),savedStock);
  H.step(persisted,body,332,false);
  close(persisted.habT09.oxygenTankMol,live.habT09.oxygenTankMol);
  console.log('PASS source-backed 8I/T09/T02 daylight, charged battery night, blackout, conservation, receipts and save/reload');
 }finally{if(previousSF===undefined)delete globalThis.SF;else globalThis.SF=previousSF;}
});