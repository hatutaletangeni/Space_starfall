#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("() => !!window.StarfallRuntime?.physical8a && !!document.querySelector('#truck-plot-course8b')",timeout=60000)
  result=page.evaluate("""() => {
   const rt=StarfallRuntime,truck=rt.physical8a.get('truck-expedition-001');
   const before=JSON.stringify(rt.physical8a.serialize());
   const shipped=rt.truckDestination8B();
   rt.physical8a.move('truck-expedition-001',{kind:'surface',bodyId:'star-47-p9',local:[0,1,0]},'test-route-only');
   const original=JSON.stringify(rt.physical8a.serialize());
   const route=rt.plotTruckDestination8B();
   return {shipped:shipped.status,route:route.status,world:route.worldName,system:route.systemName,
     pinned:rt.galaxy.pinnedSystemId,original,after:JSON.stringify(rt.physical8a.serialize()),
     target:rt.truckDestination8B().world.id,before:before.length};
  }""")
  assert result['shipped']=='SHIP',result
  assert result['route']=='SURFACE' and result['world']=='Lyra-884 k',result
  assert result['pinned']=='star-47' and result['target']=='star-47-p9',result
  assert result['original']==result['after'],'Plotting navigational waypoint mutated truck inventory'
  assert not errors,errors[:6]
  print('PASS browser: Locate Original Truck resolves real planet and plots named course; one original truck unchanged')
 finally:browser.close()
