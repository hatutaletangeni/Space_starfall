from ui22_browser_nav import open_route
#!/usr/bin/env python3
"""STARFALL 8H — actual original seed742 file:// Chromium WebGL2.
Original ENGINEER dry intake visible without new/free depot, truck, ore,
T02 motor, 8E kits, power or save mutation. Authentic paid original
physics and 8A ledger handoffs are covered by focused Node receipt tests.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
src=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl',
  '--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':800})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(src,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(
   window.StarfallRuntime?.industrialDryFeedTransfer8H &&
   window.StarfallRuntime?.industrialDryFeedContext8H &&
   window.StarfallIndustrialDryFeed8H?.transfer &&
   document.getElementById('industrial8h-surface-feed')
  )""",timeout=65000)
  report=page.evaluate("""()=>{
   const rt=StarfallRuntime;
   const before={material:JSON.stringify(rt.materials8a.snapshot()),
    physical:JSON.stringify(rt.physical8a.serialize()),
    power:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    saved:JSON.stringify(SF.load()),
    energy:rt.vehicleStore.get('ship').state.energyJ};
   const ctx=rt.industrialDryFeedContext8H();
   let denied;
   try{rt.industrialDryFeedTransfer8H('depot-fake','plant-fake','ore-fake',5);
   }catch(e){denied=String(e.message||e);}
   const after={material:JSON.stringify(rt.materials8a.snapshot()),
    physical:JSON.stringify(rt.physical8a.serialize()),
    power:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    saved:JSON.stringify(SF.load()),
    energy:rt.vehicleStore.get('ship').state.energyJ};
   return{seed:rt.galaxy.seed,ship:rt.physical8a.get('ship-main')?.id,
    originalTruck:rt.physical8a.get('truck-expedition-001')?.id,
    originalRover:rt.physical8a.get('rover-science-001')?.id,
    surfaceHoppers:ctx.stations.length,
    onFoot:ctx.onFoot,denied,noMutation:
     JSON.stringify(before)===JSON.stringify(after)};
  }""")
  assert report['seed']==742 and report['ship']=='ship-main',report
  assert report['originalTruck']=='truck-expedition-001',report
  assert report['originalRover']=='rover-science-001',report
  assert report['denied'] and not report['onFoot'],report
  assert report['noMutation'],report
  assert report['surfaceHoppers']==0,'No FREE 8E factory provided on a fresh original save: '+str(report)
  open_route(page,'Engineer')
  panel=page.locator('#industrial8h-surface-feed')
  assert panel.is_visible(),'Original Engineering panel must show genuine dry dock/hopper controls'
  text=panel.inner_text()
  assert '20 kg' in text and '120 kg' in text,text
  assert '250 W' in text and 'MANUAL' in text,text
  assert 'ACTUAL 8A SURFACE PLANT FEED HOPPER' in page.locator('#industrial8e-physical').inner_text(),text
  assert not errors,errors
  print('PASS original standalone seed742 real Chromium/WebGL2 paid surface dry intake in Engineer; no free station/ore/truck/motor/energy or altered original save')
 finally:
  browser.close()
