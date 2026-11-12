#!/usr/bin/env python3
"""9G UI smoke against the REAL desktop/mobile standalone game & WebGL2.
A test-only EVA context override is used to avoid requiring a long game voyage.
Timed science ownership/power tests live in eva-multitool9g.test.cjs.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'multitool9g'
OUT.mkdir(parents=True,exist_ok=True)
results=[]
def verify(browser,filename,viewport):
 page=browser.new_page(viewport=viewport)
 errors,requests=[],[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('request',lambda req:requests.append(req.url) if req.url.startswith(('http://','https://')) else None)
 page.goto((ROOT/filename).as_uri(),wait_until='domcontentloaded',timeout=95000)
 page.wait_for_function('!!(window.StarfallRuntime && window.StarfallScienceUI && window.StarfallMultitool9G && window.Starfall3D)',timeout=50000)
 not_eva=page.evaluate('document.getElementById("multitool9g-open").hidden')
 assert not_eva,'scanner control is hidden outside EVA'
 # Set a narrow synthetic EVA context for interface validation; graphics/physics
 # and real game startup remain untouched, and the test does not assert a scan
 # can be performed without playing a full landed expedition.
 page.evaluate("""() => {
   const RT=window.StarfallRuntime;
   const body={id:'test-scanner-world',name:'Scanner Test World',kind:'planet',
     type:'Lush',landable:true,radius:1500,position:[0,0,0]};
   RT.scienceContext=()=>({body,bodyId:body.id,mode:'EVA',local:[0,1,0],
     landed:true,altitudeM:.6,simTime:15});
   RT.outpostContext=()=>({body,bodyId:body.id,local:[0,1,0],
     shipLocal:[0,1,0],eva:true,landed:true,
     position:[0,1500,0],forward:[0,0,1]});
 }""")
 page.wait_for_function('!document.getElementById("multitool9g-open").hidden',timeout=5000)
 page.locator('#multitool9g-open').click()
 assert not page.locator('#multitool9g-panel').is_hidden(),'scanner panel did not open'
 page.select_option('#multitool9g-mode','thermometer')
 info=page.evaluate("""() => ({mode:StarfallMultitool9G.mode,charge:StarfallMultitool9G.chargeJ,
  ready:!document.getElementById('multitool9g-trigger').disabled,
  label:document.getElementById('multitool9g-title').textContent,
  gl:document.getElementById('universe').getContext('webgl2').getParameter(
    document.getElementById('universe').getContext('webgl2').VERSION)})""")
 assert info['mode']=='thermometer' and info['ready'],info
 assert 'THERMOMETER' in info['label'],info
 page.screenshot(path=str(OUT/(filename.replace('.html','').lower()+'-scanner.png')))
 if filename.endswith('MOBILE.html'):
  dismiss=page.locator('#multitool9g-dismiss')
  assert dismiss.is_visible(),'dedicated landscape close button is not visible'
  box=dismiss.bounding_box()
  assert box and box['x']>=0 and box['y']>=0 and box['x']+box['width']<=viewport['width'] and box['y']+box['height']<=viewport['height'],f'close button not within viewport: {box}'
  dismiss.click(timeout=5000)
 else:
  page.locator('#multitool9g-close').click(timeout=5000)
 assert page.locator('#multitool9g-panel').is_hidden(),'close button failed'
 assert not errors,errors[:6]
 assert not requests,requests[:6]
 results.append({'edition':filename,'scanner':info,'pageErrors':errors,'requests':requests,
                 'qualification':'synthetic EVA context for UI inspection, authentic game renderer'})
 page.close()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  verify(browser,'PLAY-STARFALL.html',{'width':1280,'height':800})
  verify(browser,'PLAY-STARFALL-MOBILE.html',{'width':920,'height':480})
 finally:
  browser.close()
(OUT/'scanner-interface-observations.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print('PASS 9G: authentic desktop/mobile WebGL2 startup, scanner panel, sensor mode, EVA gating, CSS and screenshots')
