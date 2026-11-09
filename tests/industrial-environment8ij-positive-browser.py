#!/usr/bin/env python3
"""Genuine offline WebGL2 player-visible 8I/8J positive integration.
ONLY the prebuilt shell and gas source are TEST_FIXTURE_ONLY. Runtime work,
UI actions, physical/mass authority, battery debits and reload are REAL.
This is not an ore→habitat industrial no-cheat expedition.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1366,'height':920})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallTerraformOperations8J&&window.StarfallManufacturedECLSS8I)",timeout=60000)
  target=page.evaluate("""()=>{
   const rt=StarfallRuntime,P=StarfallPhysics;
   const b=rt.galaxy.systems.flatMap(s=>s.planets)
    .find(w=>{
      if(!w.landable||w.life||['Rocky','Shattered'].includes(w.type))return false;
      const x=P.scienceProfile(rt.galaxy,w),climate=StarfallMeteorologyLW03.base(w,rt.galaxy.seed);
      const v=climate.temperatureK;
      return !climate.vacuum && climate.pressurePa>100 && climate.pressurePa<2e6 &&
       x.surfaceGravityMS2>=.5 && x.surfaceGravityMS2<30 && v>160&&v<350 &&
       Object.keys(x.composition?.atmosphereMoleFractions||{}).length>0;
    });
   if(!b)throw Error('No suitable actual seeded protected-life-free atmospheric test world in first 64 systems');
   const saved=SF.load(),q=b.position;
   SF.save({flightGalaxy:{...saved.flightGalaxy,seed:rt.galaxy.seed,time:0,
     position:[q[0],q[1]+b.radius+8,q[2]],target:b.id,attached:b.id,
     groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return {id:b.id,name:b.name};
  }""")
  page.evaluate("""()=>{window.__STARFALL_IMPORT_PENDING=true;}""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("StarfallRuntime.landed&&StarfallRuntime.eva&&!!StarfallRuntime.outpostContext()?.bodyId",timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,c=rt.outpostContext(),T=StarfallHabitatT09,
    p=rt.physical8a.serialize(),m=rt.materials8a.snapshot(),temp=293.15;
   const o=T.gasMoles(21,temp,25),n=T.gasMoles(78,temp,25),water=20;
   const h={...T.defaults(0),volumeM3:25,tempK:temp,oxygenMol:o,inertMol:n,
      carbonMol:0,waterL:water,oxygenTankMol:0,inertTankMol:0,
      scrubberCapacityMol:0,filteredAirMol:0,occupants:0,enabled:false,
      seal:.85,awaitingReview:true,lastS:0};
   const habId='structure8g:fixture-hab',vesselId='vessel8e:fixture-co2';
   const habLocal=rt.outpostOffset(15,0),
     vesselLocal=rt.outpostOffset(16,3);
   p.assets.push({id:habId,type:'habitat_envelope',
      massKg:985.4+o*.031998+n*.028014+water,
      volumeM3:25,condition:1,
      provenance:'structural-8g:'+habId,
      location:{kind:'surface',bodyId:c.bodyId,local:habLocal},
      components:[{blueprintId:'habitat_shell',parts:{
        habitat_life_support_rack:80,habitat_power_distribution:16}}],
      state:{habitatCharge8g:{jobId:'habcharge8g:TEST_FIXTURE_ONLY',
         addedMassKg:o*.031998+n*.028014+water},
         habT09:h,oxygenKg:o*.031998,inertKg:n*.028014,waterKg:water,
         lifeSupportOnline:false,habitable:false,airlockSealed:false}});
   p.assets.push({id:vesselId,type:'industrial_vessel',massKg:195,
      volumeM3:4,condition:1,provenance:'TEST_FIXTURE_ONLY_CERTIFIED_GAS_VESSEL',
      location:{kind:'surface',bodyId:c.bodyId,local:vesselLocal},
      state:{materialId:'carbon_dioxide',containerId:'gas:fixture-co2',enabled:true}});
   m.containers.push({id:'gas:fixture-co2',ownerId:vesselId,
       kind:'gas pressure vessel',maxMassKg:100,maxVolumeM3:4});
   m.lots.push({id:'test:captured-co2',materialId:'carbon_dioxide',
       containerId:'gas:fixture-co2',massKg:.75,volumeM3:.01,grade:.999,
       provenance:'TEST_FIXTURE_ONLY_8A_LOT'});
   rt.vehicleStore.setPower('ship',true);rt.persistVehicles();
   if(!SF.save({physical8a:p,materials8a:m}))throw Error('Fixture not persisted');
   return {habId,vesselId,bodyId:c.bodyId,co2:.75};
  }""")
  page.evaluate("""()=>{window.__STARFALL_IMPORT_PENDING=true;}""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("StarfallRuntime.landed&&StarfallRuntime.eva&&!!StarfallEnvironmentUI8IJ",timeout=60000)
  # Real EVA proximity: use existing bounded test-only walking convenience.
  page.evaluate("""id=> STARFALL_DEBUG.placeEvaNearRepairAsset8G(id)""",fixture['habId'])
  before=page.evaluate("""()=>({
    energy:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
    material:StarfallRuntime.materials8a.inventory('gas:fixture-co2')[0].massKg
  })""")
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  page.locator('#hab-8i-select').select_option(fixture['habId'])
  page.locator('#hab-8i-commission').click()
  assert 'COMPLETE:' in page.locator('#hab-8i-status').inner_text(),page.locator('#hab-8i-status').inner_text()
  page.evaluate("() => STARFALL_DEBUG.setSimulationTime(120)")
  page.locator('#hab-8i-run').click()
  assert 'COMPLETE:' in page.locator('#hab-8i-status').inner_text(),page.locator('#hab-8i-status').inner_text()
  page.locator('#terra-8j-vessel').select_option(fixture['vesselId'])
  page.locator('#terra-8j-lot').select_option('test:captured-co2')
  page.locator('#terra-8j-mass').fill('0.1')
  page.locator('#terra-8j-vent').click()
  assert 'COMPLETE:' in page.locator('#terra-8j-status').inner_text(),page.locator('#terra-8j-status').inner_text()
  outcome=page.evaluate("""({habId,bodyId})=>{
    const rt=StarfallRuntime,state=SF.load(),h=rt.physical8a.get(habId);
    const gas=rt.materials8a.inventory('gas:fixture-co2')[0];
    const rec=state.terraformOperations8j.worlds[bodyId].receipts;
    return {energy:rt.vehicleStore.get('ship').state.energyJ,gasKg:gas.massKg,
      eclss:h.state.eclss8i?.schema,cycles:h.state.eclss8i?.energyJ,
      waterKg:h.state.habT09.waterL,occupied:h.state.habT09.occupants,
      leakKg:h.state.eclss8i.ventedKg,receipts:rec.length,
      worldCO2:state.terraformOperations8j.worlds[bodyId].injectedCO2Kg};
  }""",fixture)
  assert outcome['eclss']==1 and outcome['occupied']==0,outcome
  assert outcome['receipts']==1 and abs(outcome['gasKg']-.65)<1e-6,outcome
  assert outcome['energy']<before['energy']-250000-5000,outcome
  assert outcome['worldCO2']>0 and outcome['worldCO2']<=.1,outcome
  assert outcome['waterKg']==20,outcome
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallEnvironmentUI8IJ)",timeout=60000)
  after=page.evaluate("""({habId,bodyId})=>{
    const rt=StarfallRuntime,s=SF.load();
    return {eclss:rt.physical8a.get(habId).state.eclss8i?.schema,
     gasKg:rt.materials8a.inventory('gas:fixture-co2')[0].massKg,
     receipts:s.terraformOperations8j.worlds[bodyId].receipts.length};
  }""",fixture)
  assert after['eclss']==1 and after['receipts']==1 and abs(after['gasKg']-.65)<1e-6,after
  assert not errors,errors
  print('PASS 8I/8J positive file:// Chromium real UI, paid original battery, finite gas, qualified manufactured shell, water+CO2 mass, unique pressure pulse, browser reload; explicit initial equipment TEST FIXTURES',target,outcome)
 finally:
  browser.close()
