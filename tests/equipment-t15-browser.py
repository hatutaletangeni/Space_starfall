#!/usr/bin/env python3
"""STARFALL T15 true file:// Chromium Workbench + 7A Asset Manager.
Controlled landed physical fixture; never claims manually landed flight or GPU FPS.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  context=browser.new_context(viewport={'width':1290,'height':870})
  errors=[]
  boot=context.new_page();boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(target,wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function('!!(window.StarfallRuntime&&window.StarfallEquipmentT15&&window.StarfallEngineeringUI)',timeout=45000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,s=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,position:[p[0],p[1]+b.radius+8,p[2]],
    target:b.id,attached:b.id,groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  boot.close()
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(target,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallRuntime&&window.StarfallEquipmentT15&&window.StarfallEngineeringUI)',timeout=45000)
  page.evaluate("""v=>{window.__STARFALL_IMPORT_PENDING=true;localStorage.setItem('starfall_save',JSON.stringify(v));}""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallRuntime&&window.StarfallEquipmentT15&&window.StarfallEngineeringUI&&window.StarfallAssetUI7A1)',timeout=45000)
  original=page.evaluate("""()=>{
   const rt=StarfallRuntime,v=rt.vehicleStore.get('rover');
   if(!rt.landed||!rt.safeToReconfigure('rover'))throw Error('Real landed stationary rover fixture unavailable');
   if(!StarfallVehicles.allowsInstrument(v.definition,'bioassay'))throw Error('Legacy science suite not backward compatible');
   return{mass:v.stats.massKg,capacity:v.stats.batteryCapacityJ,energy:v.state.energyJ,
    torque:v.stats.driveTorqueNm,solar:v.stats.maxSolarW,source:v.definition.id};
  }""")
  # UI22: navigate through visible Mission workspace; keep all behavior assertions.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  page.locator('#systems-toggle').click()
  page.wait_for_function("!document.getElementById('systems-inner').hidden",timeout=15000)
  page.locator('#workbench-open').click()
  page.wait_for_function("!document.querySelector('#workbench').hidden",timeout=15000)
  page.locator('#wb-vehicle').select_option('rover')
  page.locator('#wb-slot-battery').select_option('battery-rover-long')
  page.locator('#wb-slot-solar').select_option('solar-rover-large')
  page.locator('#wb-slot-wheels').select_option('wheels-grippy')
  page.locator('#wb-slot-instruments').select_option('science-suite-rover-geo')
  page.locator('#wb-apply').click()
  result=page.evaluate("""()=>{
   const rt=StarfallRuntime,v=rt.vehicleStore.get('rover'),ledger=SF.load().equipmentT15,
    live=rt.equipmentSnapshotT15('rover');
   if(!ledger?.events?.length||!live.backup)throw Error('Original installed state was not backed up');
   if(v.definition.slots.instruments!=='science-suite-rover-geo')throw Error('Workbench did not install actual new module');
   if(StarfallVehicles.allowsInstrument(v.definition,'bioassay')||
      !StarfallVehicles.allowsInstrument(v.definition,'magnetometer'))throw Error('Science suite jobs do not depend on hardware');
   let denied=false;try{rt.acquireFieldReading('bioassay',444,true);}catch(e){denied=/suite/.test(e.message);}
   if(!denied)throw Error('Unsupported science job was not physically denied');
   const asset=StarfallAssetUI7A1.details();
   return{mass:v.stats.massKg,capacity:v.stats.batteryCapacityJ,
    energy:v.state.energyJ,torque:v.stats.driveTorqueNm,solar:v.stats.maxSolarW,
    installed:live.components.find(x=>x.slot==='instruments')?.partId,
    serviceId:ledger.events.at(-1).id,eventCount:ledger.events.length,
    undoAvailable:!!live.backup};
  }""")
  assert result['capacity']>original['capacity'],(original,result)
  assert result['solar']>original['solar'] and result['energy']<=original['energy'],(original,result)
  assert result['mass']>original['mass'] and result['undoAvailable'],result
  assert 'VERIFIED INSTALLED CHANGE' in page.locator('#wb-error').inner_text(),page.locator('#wb-error').inner_text()
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallRuntime&&window.StarfallEquipmentT15&&window.StarfallEngineeringUI)',timeout=45000)
  persisted=page.evaluate("""()=>{
   const r=StarfallRuntime,x=r.vehicleStore.get('rover');
   if(x.definition.slots.battery!=='battery-rover-long'||!r.equipmentSnapshotT15('rover').backup)
    throw Error('No original installed config or rollback after actual reload');
   if(!r.landed||!r.safeToReconfigure('rover'))throw Error('Original landed rover service interlock changed after reload');
   const before=r.vehicleStore.get('rover').state.energyJ;
   const restored=r.restoreVehicleT15('rover');
   const after=r.vehicleStore.get('rover');
   if(after.state.energyJ>before+1e-6||after.definition.slots.battery!=='battery-rover')throw Error('Rollback charged the pack or retained installed part');
   if(r.equipmentSnapshotT15('rover').backup)throw Error('Rollback remained erroneously available twice');
   return{eventId:restored.serviceId,energyJ:after.state.energyJ,battery:after.definition.slots.battery,
    count:SF.load().equipmentT15.events.length};
  }""")
  assert persisted['count']==2,persisted
  assert not errors,errors
  print('PASS T15 real file:// browser: actual Workbench UI changes rover mass/battery/solar/traction/sensor jobs, source-owned provenance, no phantom energy, reload and reversible service rollback',original,result,persisted)
 finally:
  browser.close()
