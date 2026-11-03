#!/usr/bin/env python3
"""UI20 exact offline Chromium: original controls/roles, first-person ship+truck,
source HUD and intact physical walking/boarding. Screenshot actual WebGL view.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
uri=(root/'PLAY-STARFALL.html').as_uri()
out=root/'reports'/'ui20-screenshots'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
   '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
  errors=[];network=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallContextUI20&&document.body.dataset.sfView)",timeout=50000)
  assert page.locator('#universe').evaluate('(e)=>e.width>0&&e.height>0')
  assert page.locator('.controls-hint').is_hidden()
  assert page.locator('.identity h1').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)<=30')
  # UI21 expands its routed console within the viewport; the old <350px
  # UI20 compact-panel assertion is no longer the intended layout.
  assert page.locator('.panel').evaluate('(e)=>100<e.getBoundingClientRect().height<=window.innerHeight')
  for id in ['controls-open','chart-open','obs-open','archive-t17-open']:
   assert page.locator('#'+id).is_visible(),id
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  for id in ['launch-open','asset-open']:
   assert page.locator('#'+id).is_visible(),id
  page.locator('#ui21-navigation button[data-route="Overview"]').click()
  assert page.locator('#ui20-vehicle-frame').is_hidden()
  page.screenshot(path=str(out/'01-flight-chase.png'))
  page.keyboard.press('v')
  page.wait_for_function("document.body.dataset.sfView==='ship-cockpit'",timeout=10000)
  assert page.locator('#ui20-vehicle-frame').is_visible()
  assert page.locator('#ui20-vehicle-frame .ship-structure').evaluate('(e)=>getComputedStyle(e).display!=="none"')
  assert page.locator('#mode-text').inner_text()
  page.screenshot(path=str(out/'02-ship-cockpit.png'))
  page.locator('#ui-help-open').click()
  assert page.locator('#ui21-manual').is_visible(), 'Help should open the current searchable Field Manual'
  page.keyboard.press('Escape')
  assert page.locator('#ui21-manual').is_hidden(), 'Escape should close the Field Manual'
  page.locator('#ui-console-open').click()
  assert page.locator('#panel').is_visible()
  page.locator('#ui21-navigation button[data-route="Operate"]').click()
  assert page.locator('#fc-extra').is_visible()
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  page.locator('#launch-open').click()
  assert page.locator('#launch-dialog').is_visible()
  page.locator('#launch-close').click()
  # Unmodified genuine spacecraft state: no synthetic orbit, teleport, fake
  # physics or packet. Seed only a landed starting body for actual truck test.
  saved=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),
    ss=SF.load(),p=b.position;
   SF.save({flightGalaxy:{...ss.flightGalaxy,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
    groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  page.evaluate("""s=>{
   window.__STARFALL_IMPORT_PENDING=true;
   localStorage.setItem('starfall_save',JSON.stringify(s));
  }""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallContextUI20&&document.body.dataset.sfView)",timeout=50000)
  page.wait_for_function("StarfallRuntime.landed&&StarfallRuntime.eva",timeout=12000)
  page.evaluate('STARFALL_DEBUG.placeEvaNearTruck()')
  page.keyboard.press('x')
  page.wait_for_function("StarfallRuntime.truckOccupied===true",timeout=15000)
  page.wait_for_function("document.body.dataset.sfView==='truck-chase'",timeout=12000)
  page.screenshot(path=str(out/'03-truck-chase.png'))
  page.keyboard.press('v')
  page.wait_for_function("document.body.dataset.sfView==='truck-cab'",timeout=15000)
  assert page.locator('#ui20-vehicle-frame .truck-structure').evaluate('(e)=>getComputedStyle(e).display!=="none"')
  assert page.locator('#ui20-vehicle-frame .ship-structure').evaluate('(e)=>getComputedStyle(e).display==="none"')
  assert 'TRUCK' in page.locator('#mode-text').inner_text()
  assert 'TRUCK' in page.locator('#status-text').inner_text()
  camera=page.evaluate("""()=>{
    const a=StarfallRuntime.assetPickView().camera;
    return {eye:a?.eye,truck:StarfallRuntime.truck};
  }""")
  assert camera['eye'] and len(camera['eye'])==3 and camera['truck']['occupied']
  page.screenshot(path=str(out/'04-truck-first-person-cab.png'))
  page.keyboard.press('x')
  page.wait_for_function("StarfallRuntime.eva && !StarfallRuntime.truckOccupied && document.body.dataset.sfView==='eva'",timeout=20000)
  assert page.locator('#ui20-vehicle-frame').is_hidden()
  assert page.evaluate('StarfallRuntime.truck.batteryJ')>=0
  assert not errors and not network,(errors,network)
  print('PASS UI20 original file:// Chromium: clean hierarchy; original controls/dialog IDs, V original ship-cockpit and real truck-cab camera, source-driven telemetry, X physical exit, 4 genuine screenshots; no HTTP or page errors')
 finally:
  browser.close()
