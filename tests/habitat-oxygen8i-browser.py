#!/usr/bin/env python3
"""STARFALL 8I: actual offline Mission oxygen refill from a rated physical vessel.
Only an isolated browser fixture adds test-only oxygen and equipment.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':860})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime?.galaxy",timeout=60000)
  page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,old=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
    groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true}});
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.landed&&window.StarfallRuntime?.eva&&
   window.StarfallHabitatOxygenUI8I&&window.StarfallOutpostUI)""",timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,c=rt.outpostContext(),b=c.body,
    H=StarfallHabitatT09,m=rt.materials8a.snapshot(),p=rt.physical8a.serialize();
   if(!c.local||!c.shipLocal||!b)throw Error('Original EVA and ship missing');
   const created=U.store.add('hab',b,c.local,[1,0,0],()=>0).item;
   const h=U.store.items.find(x=>x.id===created.id);
   if(!h)throw Error('Cannot construct original T09 habitat fixture');
   H.ensure(h,rt.time);h.habT09.oxygenTankMol=500;
   const vesselId='oxygen-8i-test-vessel',sourceId='oxygen-8i-test-lot',
    holderId='oxygen-8i-test-vessel:gas';
   p.assets.push({id:vesselId,type:'industrial_vessel',condition:1,massKg:190,
    volumeM3:3,provenance:'TEST_FIXTURE_ONLY_NOT_PRODUCTION',
    location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'},
    state:{materialId:'oxygen',enabled:true,ratedPressurePa:5000000,containerId:holderId}});
   m.containers.push({id:holderId,ownerId:vesselId,kind:'rated-gas',maxMassKg:100,maxVolumeM3:1});
   m.lots.push({id:sourceId,containerId:holderId,materialId:'oxygen',
    massKg:2,volumeM3:.04,grade:1,provenance:'TEST_FIXTURE_ONLY_electrolyzed_oxygen'});
   // Explicitly power the ORIGINAL ship in the isolated fixture; game UI
   // must refuse physical gas transfer when ship power is switched off.
   rt.vehicleStore.setPower('ship',true);rt.persistVehicles();
   U.persist();SF.save({physical8a:p,materials8a:m});
   window.__STARFALL_IMPORT_PENDING=true;
   return{habitatId:h.id,vesselId,sourceId,holderId};
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime?.habitatSupplyOxygen8I&&window.StarfallHabitatOxygenUI8I)",timeout=60000)
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#habitat-oxygen8i')
  panel.locator('select[aria-label="T09 habitat oxygen destination"]').select_option(fixture['habitatId'])
  panel.locator('select[aria-label="Rated oxygen source vessel"]').select_option(fixture['vesselId'])
  panel.locator('select[aria-label="Actual oxygen gas lot"]').select_option(fixture['sourceId'])
  quantity=panel.locator('input[aria-label="Oxygen transfer mass kg"]')
  quantity.fill('1');quantity.dispatch_event('change')
  button=panel.get_by_role('button',name='PUMP METERED O₂ INTO T09 CYLINDER')
  assert button.is_enabled(),panel.inner_text()
  button.click()
  page.wait_for_function("""()=>document.querySelector('#habitat-oxygen8i [role=status]')
    ?.textContent.includes('COMMITTED')""",timeout=10000)
  result=page.evaluate("""fixture=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,s=SF.load(),
    h=U.store.items.find(x=>x.id===fixture.habitatId),
    r=rt.materials8a.operations().find(x=>x.kind==='HABITAT_OXYGEN_8I'),
    source=rt.materials8a.inventory(fixture.holderId).find(x=>x.id===fixture.sourceId);
   return{mol:h?.habT09?.oxygenTankMol,kg:source?.massKg,receipt:r,
    savedMol:s.outpost5?.items?.find(x=>x.id===fixture.habitatId)?.habT09?.oxygenTankMol,
    savedKg:s.materials8a?.lots?.find(x=>x.id===fixture.sourceId)?.massKg};
  }""",fixture)
  expected=500+1/.031998
  assert abs(result['mol']-expected)<1e-7,result
  assert abs(result['savedMol']-expected)<1e-7,result
  assert result['kg']==1 and result['savedKg']==1,result
  assert result['receipt']['status']=='COMMITTED' and result['receipt']['massKg']==1,result
  assert result['receipt']['workJ']==60000,result
  assert result['receipt']['sourceBatteryJBefore']-result['receipt']['sourceBatteryJAfter']==60000,result
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime?.materials8a&&window.StarfallOutpostUI)",timeout=60000)
  final=page.evaluate("""fixture=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI;
   return{mol:U.store.items.find(x=>x.id===fixture.habitatId)?.habT09?.oxygenTankMol,
    kg:rt.materials8a.inventory(fixture.holderId).find(x=>x.id===fixture.sourceId)?.massKg,
    count:rt.materials8a.operations().filter(x=>x.kind==='HABITAT_OXYGEN_8I').length};
  }""",fixture)
  assert abs(final['mol']-expected)<1e-7 and final['kg']==1 and final['count']==1,final
  assert not errors,errors
  print('PASS 8I original file:// Chromium: actual rated O2 vessel -1 kg, T09 +31.252 mol, -60 kJ ship source receipt, one durable transaction after reload')
 finally:
  browser.close()
