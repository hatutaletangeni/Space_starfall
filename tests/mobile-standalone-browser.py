import json
#!/usr/bin/env python3
"""Real offline mobile Chromium smoke with touchscreen and landscape/portrait assertions."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL-MOBILE.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox'])
 ctx=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2)
 page=ctx.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='domcontentloaded',timeout=90000)
 page.locator('#sfmobile-hud').wait_for(state='visible',timeout=30000)
 assert page.locator('#sfmobile-hud [data-control="KeyW"]').count()==1
 assert page.locator('.mobile-controls [data-control="KeyW"]').count()==1,'Keep original desktop touch controls unchanged'
 assert page.locator('[data-mobile-key="KeyX"]').count()==1
 assert page.locator('[data-mobile-key="KeyB"]').count()==1
 assert page.locator('[data-mobile-key="KeyI"]').count()==1
 assert page.locator('#sfmobile-rotate').is_hidden()
 assert page.locator('[data-mobile-key="KeyX"]').evaluate("(e)=>getComputedStyle(e).userSelect")=='none'
 page.evaluate("""()=>{window.__touchCodes=[];window.addEventListener('keydown',e=>window.__touchCodes.push(e.code),{capture:true})}""")
 page.locator('[data-mobile-key="KeyT"]').dispatch_event('pointerdown',{'pointerId':31,'pointerType':'touch','button':0})
 assert 'KeyT' in page.evaluate('window.__touchCodes')
 page.locator('[data-mobile-action="hide"]').dispatch_event('pointerdown',{'pointerId':32,'pointerType':'touch','button':0})
 assert 'sfm-compact' in page.locator('#sfmobile-hud').get_attribute('class')
 page.locator('[data-mobile-action="hide"]').dispatch_event('pointerdown',{'pointerId':33,'pointerType':'touch','button':0})
 assert 'sfm-compact' not in page.locator('#sfmobile-hud').get_attribute('class')
 page.set_viewport_size({'width':390,'height':844})
 assert page.locator('#sfmobile-rotate').is_visible()
 assert page.locator('#sfmobile-hud').is_hidden()
 assert not errors,errors[:3]
 # Make a genuine saved stranded-truck fixture in a NEW file:// browser
 # context, before src/flight.js loads. Reloading the live game to seed its
 # state would invoke the original pagehide saver and overwrite the fixture.
 fixture=page.evaluate("""() => {
  const previous=SF.load(),assets=StarfallPhysical8A.create(StarfallRuntime.physical8a.serialize());
  if(assets.get('truck-expedition-001').location.kind!=='ship')
   throw Error('Original starter truck missing from initial ship cargo');
  assets.move('truck-expedition-001',
   {kind:'surface',bodyId:'stranded-water-world',local:[0,1,0]},'test:strand');
  assets.setSurface('truck-expedition-001','stranded-water-world',[0,1,0],{batteryJ:1234567});
  return {...previous,physical8a:assets.serialize(),flightGalaxy:{
   ...(previous.flightGalaxy||{}),
   shipCargo8b:{schema:1,mode:'ground',pose:{x:16.5,z:39,y:-7.25},counter:2}
  }};
 }""")
 rescue_context=browser.new_context(viewport={'width':844,'height':390},
  is_mobile=True,has_touch=True,device_scale_factor=2)
 rescue_context.add_init_script("""(() => {
  if(!sessionStorage.getItem('sfmobile-fixture-installed')){
   localStorage.setItem('starfall_save',JSON.stringify("""+json.dumps(fixture)+"""));
   sessionStorage.setItem('sfmobile-fixture-installed','1');
  }
 })();""")
 rescue_page=rescue_context.new_page()
 rescue_page.goto(URL,wait_until='domcontentloaded',timeout=90000)
 rescue_page.wait_for_function("() => !!window.StarfallRuntime?.physical8a",timeout=60000)
 recovered=rescue_page.evaluate("""() => ({
  kind:StarfallRuntime.physical8a.get('truck-expedition-001').location.kind,
  battery:StarfallRuntime.physical8a.get('truck-expedition-001').state.batteryJ,
  trucks:StarfallRuntime.physical8a.list().filter(a=>a.id==='truck-expedition-001').length,
  cargo:StarfallRuntime.cargo8b.mode,
  record:SF.load().assistedTruckRecovery8b,
  receipts:StarfallRuntime.physical8a.serialize().transfers
   .filter(t=>t.id==='8b-assisted-mobile-recovery-v1').length
 })""")
 assert recovered['kind']=='ship' and recovered['cargo']=='secured',recovered
 assert recovered['trucks']==1 and recovered['receipts']==1,recovered
 assert recovered['battery']==1234567,'No free original truck battery after assisted recovery'
 assert recovered['record']['notPhysical8HDelivery'] is True,recovered
 rescue_page.reload(wait_until='domcontentloaded',timeout=90000)
 rescue_page.wait_for_function("() => !!window.StarfallRuntime?.physical8a",timeout=60000)
 assert rescue_page.evaluate("StarfallRuntime.physical8a.serialize().transfers.filter(t=>t.id==='8b-assisted-mobile-recovery-v1').length")==1
 rescue_context.close()
 ctx.close();browser.close()
print('PASS: real offline mobile Chromium, landscape touch dispatch, text deselection, portrait guidance')
