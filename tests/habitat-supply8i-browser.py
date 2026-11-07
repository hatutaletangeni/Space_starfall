#!/usr/bin/env python3
"""8I real file:// Chromium UI and durable source-owned habitat-water receipt.

A controlled fixture adds ONLY 8 kg explicitly tagged TEST_FIXTURE_ONLY water
to the existing ship's 8A hold plus one existing T09 outpost habitat. No
production starter stock or real player save is modified by this test.
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
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallRuntime?.galaxy',timeout=60000)
  page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
    previous=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...previous,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
    groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true}});
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>{
   const r=window.StarfallRuntime;
   return !!(r?.landed&&r?.eva&&r?.habitatSupplyWater8I&&
     window.StarfallOutpostUI&&window.StarfallHabitatSupplyUI8I);
  }""",timeout=60000)
  initial=page.evaluate("""()=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,O=StarfallOutposts,
    H=StarfallHabitatT09,c=rt.outpostContext(),body=c.body,ship=rt.vehicleStore.get('ship'),
    containerId=StarfallMining8D.SHIP,lotId='t-fixture-8i-water';
   if(!c.local||!c.shipLocal||!body||!ship)throw Error('Real world, EVA and ship required');
   const added=U.store.add('hab',body,c.local,[1,0,0],()=>0).item;
   const hab=U.store.items.find(x=>x.id===added.id);
   if(!hab)throw Error('Original source-owned habitat unavailable after placement');
   H.ensure(hab,rt.time);
   hab.habT09.waterL=125;
   const container=rt.materials8a.containers().find(x=>x.id===containerId);
   if(!container)throw Error('Original 8A ship hold missing');
   rt.materials8a.importLot({id:lotId,materialId:'water',containerId,
     massKg:8,volumeM3:.008,provenance:'TEST_FIXTURE_ONLY_original_ship_hold'});
   if(ship.state.energyJ<200000||ship.state.powerEnabled===false)
    rt.vehicleStore.update('ship',{...ship.state,energyJ:Math.max(500000,ship.state.energyJ),powerEnabled:true});
   U.persist();
   return{habitatId:hab.id,lotId,waterL:hab.habT09.waterL,
     originalKg:rt.materials8a.inventory(containerId).find(x=>x.id===lotId).massKg,
     energyJ:rt.vehicleStore.get('ship').state.energyJ};
  }""")
  # Visible, chronological Mission interface; no private direct action shortcut.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#habitat-supply8i')
  panel.locator('select[aria-label="Existing T09 habitat water destination"]').select_option(initial['habitatId'])
  panel.locator('select[aria-label="Existing ship-held physical water lot"]').select_option(initial['lotId'])
  panel.locator('input[aria-label="Water to transfer, kg"]').fill('5')
  panel.locator('input[aria-label="Water to transfer, kg"]').dispatch_event('change')
  button=panel.get_by_role('button',name='PUMP SOURCE-PAID WATER TO HABITAT')
  assert button.is_enabled(),panel.inner_text()
  button.click()
  page.wait_for_function("""()=>document.querySelector('#habitat-supply8i [role=status]')
    ?.textContent.includes('TRANSFER COMMITTED')""",timeout=10000)
  after=page.evaluate("""data=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,hab=U.store.items.find(x=>x.id===data.habitatId),
    original=rt.materials8a.inventory(StarfallMining8D.SHIP).find(x=>x.id===data.lotId),
    receipt=rt.materials8a.operations().find(x=>x.kind==='HABITAT_WATER_8I'),
    saved=SF.load();
   return{waterL:hab?.habT09?.waterL,massKg:original?.massKg,
    energyJ:rt.vehicleStore.get('ship').state.energyJ,receipt,
    durableWater:saved.outpost5?.items?.find(x=>x.id===data.habitatId)?.habT09?.waterL,
    durableLot:saved.materials8a?.lots?.find(x=>x.id===data.lotId)?.massKg};
  }""",initial)
  assert abs(after['waterL']-130)<1e-8,after
  assert abs(after['massKg']-3)<1e-8,after
  assert abs(after['energyJ']-(initial['energyJ']-125000))<1e-5,after
  assert after['receipt']['status']=='COMMITTED' and after['receipt']['massKg']==5,after
  assert after['durableWater']==130 and after['durableLot']==3,after
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallOutpostUI&&window.StarfallRuntime)",timeout=60000)
  final=page.evaluate("""data=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI;
   return{water:U.store.items.find(x=>x.id===data.habitatId)?.habT09?.waterL,
    mass:rt.materials8a.inventory(StarfallMining8D.SHIP).find(x=>x.id===data.lotId)?.massKg,
    receipts:rt.materials8a.operations().filter(x=>x.kind==='HABITAT_WATER_8I').length};
  }""",initial)
  assert final=={'water':130,'mass':3,'receipts':1},final
  assert not errors,errors
  print('PASS 8I actual file:// Chromium: source-owned 8A water -5kg, original T09 +5L, ship -125kJ; one exact durable receipt and no reload duplication; Mission Build controls')
 finally:
  browser.close()
