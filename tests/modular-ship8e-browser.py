#!/usr/bin/env python3
"""8E real file:// WebGL2 smoke. Verifies actual renderer, module inspector,
default ship identity and save/reload without claiming manual interior traversal.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from mission_ui22_navigation import open_mission_route
root=Path(__file__).resolve().parents[1]
target=(root/'PLAY-STARFALL.html').resolve()
out=root/'artifacts'/'8e-ship-chromium'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':900})
  errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime && window.StarfallShipWalk8E && window.StarfallShip8EUI && window.Starfall3D)",timeout=60000)
  assert page.evaluate("""()=>{
    const rt=StarfallRuntime;
    return rt.modularShip8e.list().length===10
      && StarfallShipWalk8E.reachable(0,25)
      && rt.physical8a.list().filter(a=>a.type==='truck').length===1
      && rt.modularShip8e.describe('cargo').name.includes('cargo');
   }"""),'Failed stable ship modules or truck custody'
  page.wait_for_function("STARFALL_DEBUG.state.fps>0 && STARFALL_DEBUG.state.renderedBodies>=0",timeout=20000)
  page.screenshot(path=str(out/'starfall-8e-exterior-software-webgl.png'))
  open_mission_route(page, "Engineer")
  page.locator('button.ui21-link',has_text='Expedition Vessel').click()
  assert page.locator('#ship8e-modules').is_visible()
  assert 'Internal vehicle cargo hold' in page.locator('#ship8e-modules').inner_text()
  assert 'SOLAR' in page.locator('#ship8e-modules').inner_text().upper()
  page.screenshot(path=str(out/'starfall-8e-engineer-modules.png'))
  page.evaluate("""()=>{
    const rt=StarfallRuntime;
    SF.save({modularShip8e:rt.modularShip8e.snapshot(),
             flightGalaxy:{...SF.load().flightGalaxy,shipWalk8e:{x:0,z:-40,heading:0}}});
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime?.modularShip8e)",timeout=60000)
  assert page.evaluate("StarfallRuntime.modularShip8e.list().length===10")
  assert page.evaluate("SF.load().flightGalaxy.shipWalk8e.z") == -40
  assert not errors,errors
  assert not requests,requests[:5]
  print('PASS 8E software WebGL: module inspector and exterior render, unchanged sole truck, save reload, zero page/network errors; real ramp/deck walking not asserted here')
 finally:
  browser.close()
