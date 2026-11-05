#!/usr/bin/env python3
"""STARFALL 8H live source-owned electrical port: REAL file:// WebGL2 Chromium.
Reject invented kit/drive on the actual freshly loaded game and ensure no
original outpost, 8A source or original ship/truck changes are caused.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1280,'height':800})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(globalThis.StarfallConveyorPowerPort8H&&
          globalThis.StarfallRuntime?.logisticsConveyorInstallPort8H&&
          globalThis.StarfallOutpostUI?.durableSnapshot&&
          document.querySelector('#conveyor8h-install-port')&&
          document.querySelector('#conveyor8h-open-wiring')&&
          document.querySelector('#conveyor8h-port-drive'))""",timeout=60000)
        result=page.evaluate("""()=>{
           const rt=StarfallRuntime,source=JSON.stringify(rt.materials8a.snapshot()),
             originalHardware=JSON.stringify(rt.physical8a.serialize()),
             t02=JSON.stringify(StarfallOutpostUI.durableSnapshot()),
             nativeTruck=rt.physical8a.get('truck-expedition-001')?.id,
             nativeShip=rt.physical8a.get('ship-main')?.id;
           let error='',message='';
           try{rt.logisticsConveyorInstallPort8H('imaginary-free-8h-drive');}
           catch(e){error=String(e.message||e);}
           const port=document.querySelector('#conveyor8h-install-port'),
             wiring=document.querySelector('#conveyor8h-open-wiring');
           return{error,freePortDenied:!!error,
             nativeTruck,nativeShip,seed:rt.galaxy.seed,
             physicalUnchanged:JSON.stringify(rt.physical8a.serialize())===originalHardware,
             materialUnchanged:JSON.stringify(rt.materials8a.snapshot())===source,
             powerUnchanged:JSON.stringify(StarfallOutpostUI.durableSnapshot())===t02,
             installControl:port.textContent,
             wiringControl:wiring.textContent,
             inspector:rt.logisticsConveyorContext8H().unwiredDrives};
         }""")
        assert result['seed']==742,result
        assert result['nativeTruck']=='truck-expedition-001',result
        assert result['nativeShip']=='ship-main',result
        assert result['freePortDenied'],result
        assert result['physicalUnchanged'] and result['materialUnchanged'] and result['powerUnchanged'],result
        assert '250 W' in result['installControl'],result
        assert 'WIRING' in result['wiringControl'],result
        assert not errors,errors
        print('PASS 8H real WebGL2 original game: installed-port UI, rejected unmanufactured drive, no 8A/T02 energy/material/source changes')
    finally:
        browser.close()
