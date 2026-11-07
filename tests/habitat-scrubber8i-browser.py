#!/usr/bin/env python3
"""STARFALL 8I: native offline T09 manufactured carbon sorbent replacement.
The fixture alone imports a tagged 8F-manufactured sample; production never
receives it for free. The runtime processes a genuine Mission Build click.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':860})
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!StarfallRuntime?.galaxy',timeout=60000)
  page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
    old=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
    groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true}});
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(StarfallRuntime?.landed&&StarfallRuntime?.eva&&
    window.StarfallScrubberUI8I&&window.StarfallOutpostUI)""",timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,H=StarfallHabitatT09,
    c=rt.outpostContext(),b=c.body,lotId='8i-test-manufactured-sorbent',
    ship=StarfallMining8D.SHIP,container=rt.materials8a.containers().find(x=>x.id===ship);
   if(!container)throw Error('Original ship material container missing');
   const obj=U.store.add('hab',b,c.local,[1,0,0],()=>0).item;
   const hab=U.store.items.find(x=>x.id===obj.id);
   H.ensure(hab,rt.time);hab.habT09.scrubberCapacityMol=0;hab.habT09.scrubberMediaInstalledKg=0;
   rt.materials8a.importLot({id:lotId,containerId:ship,materialId:'scrubber_media',
    massKg:2,volumeM3:.004,grade:1,provenance:'TEST_FIXTURE_ONLY_8F_press_manufacture'});
   rt.vehicleStore.setPower('ship',true);rt.persistVehicles();U.persist();
   return{habitatId:hab.id,lotId,containerId:ship};
  }""")
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#habitat-scrubber8i')
  panel.locator('select[aria-label="Existing T09 scrubber habitat"]').select_option(fixture['habitatId'])
  panel.locator('select[aria-label="Real fabricated scrubber media lot"]').select_option(fixture['lotId'])
  kg=panel.locator('input[aria-label="Scrubber media mass kg"]');kg.fill('1');kg.dispatch_event('change')
  btn=panel.get_by_role('button',name='INSTALL FINITE MANUFACTURED CO₂ SORBENT')
  assert btn.is_enabled(),panel.inner_text()
  btn.click()
  page.wait_for_function("""()=>document.querySelector('#habitat-scrubber8i [role=status]')
     ?.textContent.includes('COMMITTED')""",timeout=15000)
  result=page.evaluate("""f=>{
   const r=StarfallRuntime,U=StarfallOutpostUI,s=SF.load(),hab=U.store.items.find(x=>x.id===f.habitatId),
    lot=r.materials8a.inventory(f.containerId).find(x=>x.id===f.lotId),
    receipt=r.materials8a.operations().find(x=>x.kind==='HABITAT_SCRUBBER_8I');
   return{mol:hab?.habT09?.scrubberCapacityMol,
    installed:hab?.habT09?.scrubberMediaInstalledKg,sourceKg:lot?.massKg,
    savedMol:s.outpost5?.items?.find(x=>x.id===f.habitatId)?.habT09?.scrubberCapacityMol,
    savedKg:s.materials8a?.lots.find(x=>x.id===f.lotId)?.massKg,receipt};
  }""",fixture)
  expected=.08/.04401
  assert abs(result['mol']-expected)<1e-8,result
  assert result['installed']==1 and result['sourceKg']==1 and result['savedKg']==1,result
  assert abs(result['savedMol']-expected)<1e-8,result
  assert result['receipt']['workJ']==50000 and result['receipt']['massKg']==1,result
  assert result['receipt']['sourceBatteryJBefore']-result['receipt']['sourceBatteryJAfter']==50000,result
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallOutpostUI&&window.StarfallRuntime)",timeout=60000)
  last=page.evaluate("""f=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,h=U.store.items.find(x=>x.id===f.habitatId);
   return{mol:h?.habT09?.scrubberCapacityMol,installed:h?.habT09?.scrubberMediaInstalledKg,
    stock:rt.materials8a.inventory(f.containerId).find(x=>x.id===f.lotId)?.massKg,
    receiptCount:rt.materials8a.operations().filter(x=>x.kind==='HABITAT_SCRUBBER_8I').length};
  }""",fixture)
  assert abs(last['mol']-expected)<1e-8,last
  assert last['installed']==1 and last['stock']==1 and last['receiptCount']==1,last
  print('PASS 8I file:// Chromium: original T09 sorbent +1kg and CO2 capacity, physical ship stock -1kg and battery -50kJ, one durable receipt after reload')
 finally:
  browser.close()
