#!/usr/bin/env python3
"""Real file:// Chromium desktop and mobile resource navigation smoke.
No mined ore, gas, power, new assets or user save data are injected.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
      '--enable-webgl','--no-sandbox','--disable-dev-shm-usage']
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=ARGS)
    try:
        for name,viewport in [
            ('PLAY-STARFALL.html',{'width':1280,'height':800}),
            ('PLAY-STARFALL-MOBILE.html',{'width':844,'height':390})
        ]:
            page=browser.new_page(viewport=viewport,device_scale_factor=1)
            errors=[]
            requests=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:requests.append(r.url)
                    if r.url.startswith(('http://','https://')) else None)
            page.goto((ROOT/name).as_uri(),wait_until='domcontentloaded',timeout=90000)
            page.wait_for_function("""()=>!!(
                window.StarfallRuntime?.materials8a &&
                window.StarfallResourceTestLab8H?.open &&
                document.getElementById('resource8h-open') &&
                document.getElementById('mining8d-panel') &&
                document.getElementById('factory8f-section') &&
                document.getElementById('air-fractionation8g') &&
                document.getElementById('gas-vessel-cargo8g')
            )""",timeout=70000)
            before=page.evaluate("""()=>{
              const rt=StarfallRuntime;
              return {
               materials:JSON.stringify(rt.materials8a.snapshot()),
               physical:JSON.stringify(rt.physical8a.serialize()),
               seed:rt.galaxy.seed,
               truck:rt.physical8a.list().filter(a=>a.id==='truck-expedition-001').length
              };
            }""")
            assert before['seed']==742 and before['truck']==1,before
            page.evaluate("StarfallResourceTestLab8H.open('mining')")
            modal=page.locator('#resource8h-dialog')
            assert modal.is_visible(),name
            assert page.locator('#resource8h-dialog .resource-steps button').count()==7
            assert 'SURVEY' in page.locator('#resource8h-status').inner_text()
            assert 'TRUCK' in page.locator('#resource8h-status').inner_text()
            page.locator('#resource8h-dialog [data-chain="gas"]').click()
            assert page.locator('#resource8h-dialog .resource-steps button').count()==6
            gastext=page.locator('#resource8h-status').inner_text()
            assert 'RATED N₂ VESSELS:' in gastext and '420 W' in gastext,gastext
            page.locator('#resource8h-dialog .resource-steps button').nth(1).click()
            assert modal.is_hidden(),name
            assert page.locator('#air-fractionation8g').count()==1
            assert page.evaluate("document.querySelector('#ui21-navigation [data-route=\"Engineer\"]').getAttribute('aria-current')")=='true'
            after=page.evaluate("""()=>{
              const rt=StarfallRuntime;
              return {
               materials:JSON.stringify(rt.materials8a.snapshot()),
               physical:JSON.stringify(rt.physical8a.serialize())
              };
            }""")
            assert after['materials']==before['materials'],name+' resource guide minted/changed material stock'
            assert after['physical']==before['physical'],name+' resource guide changed owned assets'
            assert not errors,(name,errors[:6])
            assert not requests,(name,requests[:6])
            page.close()
            print('PASS actual offline Chromium '+name+': source-owned mining/gas panels, click-through, responsive UI, no new ore/gas/asset and no network')
    finally:
        browser.close()
