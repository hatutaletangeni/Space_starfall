#!/usr/bin/env python3
"""True file:// Chromium UI guard for pre-8K 8I/8J.
No synthetic stock is created; negative actions must neither debit nor mint.
This is NOT proof of a full habitat/planetary expedition or a hardware GPU.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1366,'height':820})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""() => !!(window.StarfallRuntime &&
            window.StarfallEnvironmentUI8IJ &&
            window.StarfallTerraformOperations8J &&
            window.StarfallManufacturedECLSS8I)""",timeout=60000)
        before=page.evaluate("""() => {
          const rt=StarfallRuntime,lot=rt.materials8a.inventory(),
            asset=rt.physical8a.list(),energy=rt.vehicleStore.get('ship').state.energyJ;
          return {energy,lotMass:lot.reduce((s,x)=>s+x.massKg,0),
            count:lot.length,assetCount:asset.length,
            terraform:SF.load().terraformOperations8j||{schema:1,worlds:{}}};
        }""")
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        page.locator('#hab-8i-select').wait_for(state='visible',timeout=15000)
        page.locator('#terra-8j-vessel').wait_for(state='visible',timeout=15000)
        page.locator('#terra-8j-measure').click()
        page.locator('#terra-8j-vent').click()
        assert 'BLOCKED:' in page.locator('#terra-8j-status').inner_text()
        page.locator('#hab-8i-commission').click()
        assert 'BLOCKED:' in page.locator('#hab-8i-status').inner_text()
        after=page.evaluate("""() => {
          const rt=StarfallRuntime,lot=rt.materials8a.inventory(),
            asset=rt.physical8a.list(),energy=rt.vehicleStore.get('ship').state.energyJ;
          return {energy,lotMass:lot.reduce((s,x)=>s+x.massKg,0),
            count:lot.length,assetCount:asset.length,
            terraform:SF.load().terraformOperations8j||{schema:1,worlds:{}}};
        }""")
        assert before==after,(before,after)
        assert not errors,errors
        print('PASS real offline Chromium UI22→Engineer 8I/8J context: blocked actions preserve original Joules, lots, assets and world deltas; no page errors')
    finally:
        browser.close()
