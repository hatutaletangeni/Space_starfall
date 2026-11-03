#!/usr/bin/env python3
"""8E physical EVA->ramp->onboard walk smoke; software WebGL, real keyboard events.
Does not certify all rooms, wall collisions, upgrades, or actual user GPU.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
uri=(root/'PLAY-STARFALL.html').resolve().as_uri()
out=root/'artifacts'/'8e-ship-chromium'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1300,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime",timeout=45000)
  # Genuine saved landed position, then rely on the live landing/EVA ramp and
  # physical keyboard movement. No debug teleport or direct boardShip() call.
  saved=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),
     s=SF.load(),p=b.position;
   SF.save({flightGalaxy:{...s.flightGalaxy,seed:rt.galaxy.seed,time:0,
      position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
      groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  page.evaluate("""s=>{window.__STARFALL_IMPORT_PENDING=true;
    localStorage.setItem('starfall_save',JSON.stringify(s));}""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime && StarfallRuntime.landed && StarfallRuntime.eva",timeout=45000)
  page.wait_for_timeout(1900)
  page.keyboard.down('w')
  try:
   page.wait_for_function("StarfallRuntime.shipWalking8e===true",timeout=19000)
  finally:
   page.keyboard.up('w')
  assert page.evaluate("StarfallRuntime.shipWalking8e"),'Did not walk onto ship'
  assert page.evaluate("StarfallShipWalk8E.reachable(StarfallRuntime.shipWalkAt8e.x,StarfallRuntime.shipWalkAt8e.z)")
  page.screenshot(path=str(out/'8e-live-walkable-deck.png'))
  before=page.evaluate("StarfallRuntime.shipWalkAt8e.z")
  page.keyboard.down('w');page.wait_for_timeout(850);page.keyboard.up('w')
  after=page.evaluate("StarfallRuntime.shipWalkAt8e.z")
  assert after<before-.1,(before,after)
  assert page.evaluate("StarfallRuntime.physical8a.list().filter(a=>a.type==='truck').length") == 1
  assert not errors,errors
  print('PASS 8E real keyboard: EVA walked up the actual ship ramp into one ship, interior corridor moved, software WebGL screenshot and one-truck custody')
 finally:
  browser.close()
