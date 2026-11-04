#!/usr/bin/env python3
"""Read-only 8G browser smoke: real offline WebGL2 + cargo inspector + no spawned truck."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1250,'height':850})
  errors=[];network=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.goto((root/'PLAY-STARFALL.html').resolve().as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""() => !!window.StarfallRuntime?.physical8a &&
    !!window.StarfallAssemblyInspector8G && !!document.querySelector('#assembly-inspector8g-panel')""",timeout=60000)
  assert page.evaluate("""() => {
   const v=StarfallRuntime.physical8a.list();
   return v.filter(x=>x.id==='truck-expedition-001').length===1 &&
     v.filter(x=>x.id==='rover-science-001').length===1 &&
     StarfallAssemblyInspector8G.report({blueprintId:'truck',materials:StarfallRuntime.materials8a.snapshot(),
      physical:StarfallRuntime.physical8a.serialize(),containerId:StarfallMining8D.SHIP,
      bodyId:'world-unavailable',shipLanded:false,powerEnabled:false,operatorNear:false}).canCommission===false;
  }"""),'Missing persistent expedition vehicles or inspector authorizes commissioning'
  before=page.evaluate("""() => JSON.stringify(StarfallRuntime.physical8a.serialize())""")
  page.evaluate("""() => StarfallUI21.openRoute('Engineer')""")
  page.wait_for_function("""() => !!document.querySelector('#assembly-inspector8g-panel pre')?.textContent.includes('COMMISSIONING: DISABLED')""",timeout=20000)
  assert page.locator('#assembly-inspector8g-panel select option').count()>=5
  page.locator('#assembly-inspector8g-panel select').select_option('science_rover')
  page.wait_for_timeout(1100)
  assert 'science_rover' in page.locator('#assembly-inspector8g-panel pre').inner_text()
  page.get_by_role('button',name='OPEN TRUCK & CARGO INVENTORY').click()
  assert not page.locator('#physical8a-dialog').evaluate('(e)=>e.hidden'),'Cargo inspector did not open'
  assert 'truck-expedition-001' in page.locator('#physical8a-dialog').inner_text()
  page.get_by_role('button',name='Close').last.click()
  after=page.evaluate("""() => JSON.stringify(StarfallRuntime.physical8a.serialize())""")
  assert before==after,'Read-only inspector unexpectedly changed vehicle or physical registry'
  assert not network,'Offline STARFALL attempted remote network requests: '+str(network[:3])
  assert not errors,'JavaScript errors: '+str(errors[:3])
  print('PASS: live offline 8G Engineer inspector, original truck locator and zero commissioning or external requests')
 finally:
  browser.close()
