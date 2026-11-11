#!/usr/bin/env python3
"""Controlled hardware/recharge protocol. Real orbital UI and native integration.
Not a no-cheat expedition: the fixture supplies manufactured stocks and source
refills/recharges, then pays every conditioning operation through the model.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/industry-completion';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,file,width,height in [('desktop','PLAY-STARFALL.html',1200,800),('mobile','PLAY-STARFALL-MOBILE.html',932,430)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=name=='mobile');page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto((ROOT/file).as_uri(),wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallRuntime?.industryCompletion8K')
   page.evaluate('SF.startNewExpedition(742);window.__STARFALL_IMPORT_PENDING=true');page.reload(wait_until='domcontentloaded');page.wait_for_function('!!SF.load().initialIndustrialManifest8k')
   page.evaluate((ROOT/'tests/helpers/industry-browser-fixture.js').read_text(),'orbital');page.reload(wait_until='domcontentloaded')
   page.wait_for_function('!!(window.StarfallRuntime?.landed&&StarfallRuntime.eva)');page.evaluate("STARFALL_DEBUG.placeEvaNearGasVessel8G('protocol-oxygen')")
   def activate(locator):
    if name=='mobile':locator.tap()
    else:locator.click()
   activate(page.locator('#sfmobile-hud [data-mobile-action="mission"]') if name=='mobile' else page.locator('#sf-mission-button'))
   activate(page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build'));activate(page.locator('#sf-mission-flow .sf-flow-workspace'))
   section=page.locator('#industrial-completion8k');activate(section.locator('summary').filter(has_text='Manufactured rocket flight'))
   section.get_by_label('Manufactured rocket stage',exact=True).select_option('protocol-stage');section.get_by_label('Actual hydrogen vessel',exact=True).select_option('protocol-hydrogen');section.get_by_label('Actual oxygen vessel',exact=True).select_option('protocol-oxygen')
   section.get_by_label('Manufactured propulsion mode',exact=True).select_option('orbital');section.get_by_label('Rocket hydrogen kg',exact=True).fill('0.1')
   activate(section.get_by_role('button',name='CONDITION ORBITAL PROPELLANT BATCH',exact=True))
   try:page.wait_for_function("SF.load().materials8a.operations.filter(o=>o.kind==='ORBITAL_PROPELLANT_CONDITIONING').length===13",timeout=10000)
   except Exception as e:raise AssertionError(section.get_by_role('status').inner_text()) from e
   activate(section.get_by_role('button',name='HOT-FIRE & LAUNCH MANUFACTURED STAGE',exact=True))
   try:page.wait_for_function("StarfallLaunchUI.store.launches.some(m=>m.sourcePaid8g&&m.propulsion==='orbital')",timeout=10000)
   except Exception as e:raise AssertionError(section.get_by_role('status').inner_text()) from e
   # Advance the ORIGINAL mission integrator in bounded 100x-equivalent chunks.
   result=page.evaluate("""()=>{const U=StarfallLaunchUI,r=StarfallRuntime,m=U.store.launches.find(x=>x.propulsion==='orbital');for(let n=0;n<80&&!['failed','test-orbit','manufactured-orbit'].includes(m.phase);n++)U.store.tick(m.lastUpdateS+100,id=>r.galaxy.byId.get(id));return{phase:m.phase,flight:m.flight,profile:m.profile,orbit:StarfallRocketFlight7B.elements(m.flight,m.profile.mu,m.profile.radiusM),satellites:U.store.satellites.length,sourceGone:!r.physical8a.get('protocol-stage')};}""")
   assert result['phase'] in ['test-orbit','manufactured-orbit'],result
   assert result['orbit']['energyJkg']<0 and result['orbit']['periapsisM']>=25000 and result['sourceGone'] and result['satellites']==0,result
   page.screenshot(path=str(OUT/(name+'-orbital.png')));page.evaluate("window.dispatchEvent(new Event('pagehide'))");page.reload(wait_until='domcontentloaded');page.wait_for_function('!!window.StarfallLaunchUI?.store')
   assert page.evaluate("StarfallLaunchUI.store.launches.filter(m=>m.propulsion==='orbital').length===1&&!StarfallRuntime.physical8a.get('protocol-stage')")
   assert not errors,errors
   (OUT/(name+'-orbital.json')).write_text(json.dumps({'result':'PASS','scope':'controlled source/refill/recharge fixture; real UI, native bound orbit and reload','orbit':result['orbit']},indent=2));print('PASS',name,'source-paid orbital integration and reload',flush=True);context.close()
 finally:browser.close()
