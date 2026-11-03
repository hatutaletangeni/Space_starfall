#!/usr/bin/env python3
"""T12 real offline Chromium smoke: actual STARFALL boot, UI wiring, field model,
safe rejection of cross-world/remote repair. Manual joystick/GPU play is separate.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1240,'height':800})
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallFieldServiceT12&&window.StarfallRuntime&&window.StarfallLaunchUI&&window.StarfallOutpostUI)",timeout=45000)
  initial=page.evaluate("""()=>{
    const rt=StarfallRuntime,T=StarfallFieldServiceT12;
    const report=rt.fieldServiceStatus();
    if(typeof rt.fieldRepair!=='function'||typeof rt.truckWinch!=='function'||typeof rt.roverRechargeLocal!=='function')throw Error('Missing real runtime service bindings');
    if(report.nearby)throw Error('Unlanded truck unexpectedly grants rover field access');
    const foreign={id:'rover-far',bodyId:'foreign-world',local:[0,1,0],status:'parked',roverT06:{state:'READY'}};
    let reason='';
    try{rt.fieldRepair('motor',foreign);}catch(e){reason=e.message;}
    if(!reason.includes('within 18 scene units'))throw Error('Remote field repair not rejected: '+reason);
    return {module:!!T,nearby:report.nearby,remoteFault:reason,assetCount:rt.galaxy.allWorlds.length};
  }""")
  page.locator('#launch-open').evaluate('(e)=>e.click()')
  page.wait_for_function("document.querySelector('#launch-dialog').hidden===false")
  page.locator('#launch-t12-target').select_option('local')
  page.locator('#launch-t12-slot').select_option('motor')
  page.locator('#launch-t12-inspect').click()
  diagnostic=page.locator('#launch-t12-status').inner_text()
  assert 'OUT OF RANGE' in diagnostic,diagnostic
  page.locator('#launch-t12-repair').click()
  error_message=page.locator('#launch-status').inner_text()
  assert 'within 18 scene units' in error_message,error_message
  page.locator('#launch-close').click()
  assert not errors,errors
  print('PASS T12 real file:// Chromium: loaded offline game, new repair controls, non-EVA and cross-world repair blocked, diagnostics and UI wired',initial)
 finally:
  browser.close()
