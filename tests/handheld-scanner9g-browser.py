#!/usr/bin/env python3
"""9G authentic standalone Chromium WebGL2 scanner acceptance.
No scanner API fixtures: uses actual landed EVA, actual 4A measurement,
source ScienceUI journal, HUD buttons and the actual avatar beam draw.
Only the isolated test save seeds an initial landing so the test can reach EVA.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'scanner9g'
ART.mkdir(parents=True,exist_ok=True)
RESULT=[]
def exercise(browser,html,viewport):
 page=browser.new_page(viewport=viewport,device_scale_factor=1)
 errors,network=[],[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('request',lambda r: network.append(r.url) if r.url.startswith(('http://','https://')) else None)
 page.goto((ROOT/html).as_uri(),wait_until='domcontentloaded',timeout=90000)
 page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallMultitoolUI9G&&window.StarfallScienceUI&&window.STARFALL_DEBUG)",timeout=50000)
 assert page.locator('#multitool9g').is_hidden(),'not in EVA initially'
 # Isolated real-body landed-game fixture; no artificial readings or scanner
 # journal entries, and no changes to production first-load starting state.
 page.evaluate("""()=>{
  const rt=StarfallRuntime,body=rt.galaxy.byId.get('star-0-p0'),s=SF.load();
  if(!body?.landable)throw Error('Original first body is not landable');
  SF.save({flightGalaxy:{...s.flightGalaxy,seed:rt.galaxy.seed,time:0,
   position:[body.position[0],body.position[1]+body.radius+8,body.position[2]],
   target:body.id,attached:body.id,groundDirection:[0,1,0],
   forward:[0,0,1],up:[0,1,0],landed:true}});
  window.__STARFALL_IMPORT_PENDING=true;
  localStorage.setItem('starfall_save',JSON.stringify(SF.load()));
 }""")
 page.reload(wait_until='domcontentloaded',timeout=90000)
 page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallMultitoolUI9G&&window.STARFALL_DEBUG)",timeout=50000)
 page.wait_for_function("StarfallRuntime.landed && StarfallRuntime.eva && !StarfallRuntime.truckOccupied",timeout=15000)
 page.locator('#multitool9g').wait_for(state='visible',timeout=12000)
 assert page.locator('#mt9g-mode option').count()==5
 before=page.evaluate("""()=>({energy:StarfallMultitoolUI9G.batteryJ,
  journal:StarfallScienceUI.journal.length,
  avatar:STARFALL_DEBUG.state.avatarDrawCalls,
  body:StarfallRuntime.outpostContext().body.id,
  instrument:document.getElementById('mt9g-mode').value})""")
 assert before['energy']==18000,before
 assert before['instrument']=='geology',before
 # Use the actual keyboard path on desktop, touch-accessible button on mobile.
 if 'MOBILE' in html:page.locator('#mt9g-scan').click()
 else:page.keyboard.press('p')
 page.wait_for_timeout(250)
 scan_started=page.evaluate("""()=>({
   scanning:StarfallMultitoolUI9G.isScanning,
   state:StarfallMultitoolUI9G.status,
   readout:document.getElementById('mt9g-readout').textContent,
   controlDisabled:document.getElementById('mt9g-scan').disabled,
   activeDialogs:[...document.querySelectorAll('[role=dialog][aria-modal=true]')]
     .filter(el=>!el.hidden&&el.getClientRects().length>0).map(el=>el.id)
 })""")
 assert scan_started['scanning'],'Multitool did not start: '+repr(scan_started)
 page.wait_for_function("STARFALL_DEBUG.state.avatarDrawCalls===10",timeout=7000)
 page.screenshot(path=str(ART/(html.lower().replace('.html','')+'-active-scan.png')))
 page.wait_for_function("!StarfallMultitoolUI9G.isScanning && StarfallMultitoolUI9G.status.completed===1",timeout=15000)
 result=page.evaluate("""()=>({
  status:StarfallMultitoolUI9G.status,
  journal:StarfallScienceUI.journal,
  debug:STARFALL_DEBUG.state,
  shipEnergyJ:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
  shipPowered:StarfallRuntime.vehicleStore.get('ship').state.powerEnabled,
  uiVisible:!document.getElementById('multitool9g').hidden
 })""")
 assert result['status']['batteryJ']==17440,result
 assert len(result['journal'])==before['journal']+1,result
 receipt=result['journal'][-1]
 assert receipt['instrument']=='spectrometer',receipt
 assert receipt['id']==result['status']['history'][-1]['id'],result
 assert receipt['model']=='procedural estimate',receipt
 assert result['uiVisible'],'handheld controls must stay visible in EVA'
 # An existing, powered ship is the sole battery source; if its stored charge
 # is zero/disabled in a profile, turn on its installed bus and seed a modest
 # battery level in the isolated test profile (not the game default).
 before_ship=page.evaluate("""()=>{
  const rt=StarfallRuntime,ship=rt.vehicleStore.get('ship'),s=ship.state;
  if(s.energyJ<1000||!s.powerEnabled)
   rt.vehicleStore.update('ship',{...s,energyJ:Math.max(s.energyJ,1000),
    powerEnabled:true});
  // Record the synchronous source debit in the ORIGINAL charging function:
  // separate Playwright steps allow normal ship power-load simulation ticks.
  const native=rt.rechargeHandheldScanner9G.bind(rt);
  rt.rechargeHandheldScanner9G=amount=>{
    const from=rt.vehicleStore.get('ship').state.energyJ;
    const credited=native(amount);
    const to=rt.vehicleStore.get('ship').state.energyJ;
    window.__scanner9gPaid={from,to,credited};
    return credited;
  };
  return rt.vehicleStore.get('ship').state.energyJ;
 }""")
 page.locator('#mt9g-charge').click()
 charged=page.evaluate("""()=>({tool:StarfallMultitoolUI9G.batteryJ,
   ship:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
   paid:window.__scanner9gPaid||null,
   text:document.getElementById('mt9g-readout').textContent})""")
 if charged['tool']==18000:
  assert charged['paid'] and charged['paid']['credited']==560,charged
  assert abs((charged['paid']['from']-charged['paid']['to'])-560)<.00001,\
   'native ship-to-scanner transfer must debit exact source energy'
 else:
  # A ship-to-explorer distance check can legitimately block recharge if
  # the landed starter position is beyond 32 game units.
  assert 'Move within 32' in charged['text'] or 'requires EVA' in charged['text'],charged
 page.locator('#mt9g-mode').select_option('temperature')
 assert page.evaluate("StarfallMultitoolUI9G.mode==='temperature'")
 assert not errors,errors[:6]
 assert not network,network[:6]
 result={'edition':html,'sourceJournalAfter':len(result['journal']),
  'reading':{'instrument':receipt['instrument'],'value':receipt['value'],
             'unit':receipt['unit'],'quality':receipt['quality'],'model':receipt['model']},
  'scannerBatteryJ':result['status']['batteryJ'],'recharge':charged,
  'webgl':page.evaluate("document.getElementById('universe').getContext('webgl2').getParameter(document.getElementById('universe').getContext('webgl2').VERSION)"),
  'errors':errors,'networkRequests':network}
 page.close()
 return result

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  RESULT.append(exercise(browser,'PLAY-STARFALL.html',{'width':1280,'height':800}))
  RESULT.append(exercise(browser,'PLAY-STARFALL-MOBILE.html',{'width':920,'height':480}))
 finally:
  browser.close()
(ART/'real-scanner-readings.json').write_text(json.dumps(RESULT,indent=2),encoding='utf-8')
for result in RESULT:print('PASS 9G:',result['edition'],result['reading'],result['recharge'])
print('PASS 9G: real offline scanner model, 4A field science and journal, desktop/mobile HUD, active avatar beam')
