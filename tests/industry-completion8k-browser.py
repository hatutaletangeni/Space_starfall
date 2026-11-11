#!/usr/bin/env python3
"""Real offline UI / atomic source owners / native rocket ticks.
CONTROLLED PROTOCOL FIXTURE: supplied completed stage, source gas, greenhouse
and fabricated recycler evidence; this is not a fresh no-cheat expedition.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/'industry-completion';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,file,width,height in [('desktop','PLAY-STARFALL.html',1200,800),('mobile','PLAY-STARFALL-MOBILE.html',932,430)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=name=='mobile');page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto((ROOT/file).as_uri(),wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallRuntime?.industryCompletion8K')
   page.evaluate('SF.startNewExpedition(742);window.__STARFALL_IMPORT_PENDING=true');page.reload(wait_until='domcontentloaded')
   page.wait_for_function('!!SF.load().initialIndustrialManifest8k')
   page.evaluate((ROOT/'tests/helpers/industry-browser-fixture.js').read_text(),'sounding')
   page.reload(wait_until='domcontentloaded');page.wait_for_function('!!(window.StarfallRuntime?.landed&&StarfallRuntime.eva)')
   page.evaluate("STARFALL_DEBUG.placeEvaNearGasVessel8G('protocol-oxygen')")
   def activate(locator):
    if name=='mobile':locator.tap()
    else:locator.click()
   if name=='mobile':activate(page.locator('#sfmobile-hud [data-mobile-action="mission"]'))
   else:activate(page.locator('#sf-mission-button'))
   activate(page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build'))
   activate(page.locator('#sf-mission-flow .sf-flow-workspace'))
   page.screenshot(path=str(OUT/(name+'-fixture-ready.png')))
   section=page.locator('#industrial-completion8k');activate(section.locator('summary').filter(has_text='Manufactured rocket flight'))
   section.get_by_label('Manufactured rocket stage',exact=True).select_option('protocol-stage')
   section.get_by_label('Actual hydrogen vessel',exact=True).select_option('protocol-hydrogen')
   section.get_by_label('Actual oxygen vessel',exact=True).select_option('protocol-oxygen')
   activate(section.get_by_role('button',name='HOT-FIRE & LAUNCH MANUFACTURED STAGE',exact=True))
   page.wait_for_function("StarfallLaunchUI.store.launches.some(m=>m.sourcePaid8g)")
   assert page.evaluate("!StarfallRuntime.physical8a.get('protocol-stage')")
   page.wait_for_function("StarfallLaunchUI.store.launches.find(m=>m.sourcePaid8g).flight.integratedS>0")
   activate(section.locator('summary').filter(has_text='Habitat regenerative loop'))
   section.get_by_label('Greenhouse habitat',exact=True).select_option('protocol-hab')
   activate(section.get_by_role('button',name='INSTALL MANUFACTURED RECYCLER',exact=True))
   page.wait_for_function("!!StarfallOutpostUI.store.items.find(h=>h.id==='protocol-hab').habT09.regenerative8i")
   before=page.evaluate("""()=>{
    const r=StarfallRuntime,v=r.physical8a.get('protocol-oxygen'),l=r.materials8a.inventory(v.state.containerId)[0];
    r.atmosphericRelease8J(v.id,l.id,1);
    return r.materials8a.inventory(v.state.containerId).reduce((s,l)=>s+l.massKg,0);
   }""")
   activate(section.locator('summary').filter(has_text='Atmospheric capture & climate'))
   section.get_by_label('Manufactured atmospheric capture plant',exact=True).select_option('protocol-collector')
   section.get_by_label('Atmospheric capture receiving vessel',exact=True).select_option('protocol-oxygen')
   section.get_by_label('Atmospheric capture kg',exact=True).fill('0.5')
   activate(section.get_by_role('button',name='CAPTURE SOURCE-INVENTORIED ATMOSPHERIC GAS',exact=True))
   try:page.wait_for_function("SF.load().materials8a.operations.some(o=>o.kind==='ATMOSPHERIC_CAPTURE')",timeout=10000)
   except Exception as e:
    page.screenshot(path=str(OUT/(name+'-capture-failure.png')))
    raise AssertionError({'status':section.get_by_role('status').inner_text(),'errors':errors}) from e
   conservation=page.evaluate("""(before)=>{
    const r=StarfallRuntime,c=r.atmosphericContext8J(),v=r.physical8a.get('protocol-oxygen'),
     receipt=SF.load().materials8a.operations.find(o=>o.kind==='ATMOSPHERIC_CAPTURE'),w=SF.load().terraformWorlds8j[c.bodyId];
    return{debit:receipt.energyJ,added:r.materials8a.inventory(v.state.containerId).reduce((s,l)=>s+l.massKg,0)-before,
     delta:w.netAddedKg,pressure:w.pressureDeltaPa};
   }""",before)
   assert abs(conservation['added']-.5)<1e-7 and abs(conservation['delta']-.5)<1e-7 and conservation['debit']>1e6,conservation
   # Extract a canonical baseline gas that was never emitted by this fixture.
   section.get_by_label('Atmospheric source',exact=True).select_option('baseline')
   section.get_by_label('Atmospheric capture receiving vessel',exact=True).select_option('protocol-nitrogen')
   section.get_by_label('Atmospheric capture kg',exact=True).fill('0.001')
   activate(section.get_by_role('button',name='CAPTURE SOURCE-INVENTORIED ATMOSPHERIC GAS',exact=True))
   page.wait_for_function("Object.values(SF.load().terraformWorlds8j).some(w=>w.baselineCapturedSpeciesKg?.nitrogen>=0.001)")
   page.wait_for_function("Object.values(StarfallRuntime.terraformWorlds8j||SF.load().terraformWorlds8j).some(w=>w.climate8j?.schema===2)")
   section.scroll_into_view_if_needed();page.screenshot(path=str(OUT/(name+'-controls.png')))
   page.evaluate("window.dispatchEvent(new Event('pagehide'))")
   page.reload(wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallRuntime?.industryCompletion8K')
   assert page.evaluate("!StarfallRuntime.physical8a.get('protocol-stage')&&StarfallLaunchUI.store.launches.filter(m=>m.sourcePaid8g).length===1")
   assert page.evaluate("!!StarfallOutpostUI.store.items.find(h=>h.id==='protocol-hab').habT09.regenerative8i")
   assert not errors,errors
   (OUT/(name+'-result.json')).write_text(json.dumps({'result':'PASS','scope':'controlled protocol fixtures; native UI, flight, custody and reload','capture':conservation},indent=2))
   print('PASS native',name,'manufactured rocket, recycler, capture, source power and save/reload',flush=True);context.close()
 finally:browser.close()
