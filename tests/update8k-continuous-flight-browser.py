#!/usr/bin/env python3
"""Original continuous Flight.js navigation with only normal target plotting,
keyboard alignment/thrust/warp, screenshots and reload. No SF.save injection,
debug APIs, position setters, simulated-time setters or created cargo.
This verifies flight separately from the source-chain industrial tests.
"""
from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/'8k-continuous-flight';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1100,'height':720});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((ROOT/'PLAY-STARFALL.html').as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallRuntime?.galaxy',timeout=60000)
  page.evaluate('SF.startNewExpedition(742)')
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallRuntime?.galaxy&&SF.load().initialIndustrialManifest8k)',timeout=60000)
  original=page.evaluate("""()=>({body:StarfallRuntime.nearest.id,
   truck:StarfallRuntime.physical8a.get('truck-expedition-001'),
   lots:StarfallRuntime.materials8a.inventory(),manifest:SF.load().initialIndustrialManifest8k.id})""")
  destination=page.evaluate("""()=>{
   const r=StarfallRuntime,b=r.galaxy.byId.get('star-0-p1');
   r.plotSurfaceWaypoint(b.id,[0,1,0],'8K navigation acceptance');return{id:b.id,name:b.name};
  }""")
  # Plotting an existing waypoint only changes the target. G is the original
  # alignment control; W/Shift are integrated by the actual gameplay loop.
  trace=[];deadline=time.monotonic()+360
  page.keyboard.down('w');page.keyboard.down('Shift')
  try:
   while time.monotonic()<deadline:
    page.keyboard.press('g');page.wait_for_timeout(750)
    state=page.evaluate("""()=>({body:StarfallRuntime.nearest.id,landed:StarfallRuntime.landed,
     eva:StarfallRuntime.eva,pos:[...StarfallRuntime.scenePosition],timeS:StarfallRuntime.time,
     target:StarfallRuntime.target.id,truck:StarfallRuntime.physical8a.get('truck-expedition-001').location})""")
    trace.append(state)
    if state['landed'] and state['body']==destination['id']:break
   else:raise AssertionError({'reason':'Actual piloted flight did not land within 360 s','last':trace[-5:]})
  finally:
   page.keyboard.up('w');page.keyboard.up('Shift')
  assert original['body']!=destination['id']
  assert len(trace)>4 and len({tuple(x['pos']) for x in trace})>4,'Continuous motion evidence required'
  assert all(x['truck']['kind']=='ship' for x in trace),'Original cargo must remain source-owned during flight'
  final=page.evaluate("""()=>({truck:StarfallRuntime.physical8a.get('truck-expedition-001'),
   lots:StarfallRuntime.materials8a.inventory(),count:StarfallRuntime.physical8a.list().filter(x=>x.type==='truck').length})""")
  assert final['truck']['id']==original['truck']['id'] and final['count']==1
  assert final['lots']==original['lots'],'Flight must not create, spend or teleport original cargo lots'
  page.screenshot(path=str(OUT/'actual-second-world-landing.png'))
  page.evaluate("window.dispatchEvent(new Event('pagehide'))")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallRuntime?.galaxy',timeout=60000)
  assert page.evaluate('StarfallRuntime.landed&&StarfallRuntime.nearest.id')==destination['id']
  assert page.evaluate("StarfallRuntime.physical8a.list().filter(x=>x.type==='truck').length")==1
  assert not errors,errors
  (OUT/'continuous-flight.json').write_text(json.dumps({'result':'PASS','origin':original['body'],
   'destination':destination,'trace':trace,'controls':['native waypoint','G','W','Shift'],
   'limitations':'Actual original-cargo flight; full industrial chain is a separate source integration.'},indent=2))
  print('PASS continuously piloted original Flight.js cargo journey and actual second-world landing/reload',destination,flush=True)
 finally:browser.close()
