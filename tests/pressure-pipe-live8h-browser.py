#!/usr/bin/env python3
"""STARFALL 8H real original file:// WebGL2 pressure-pipe Engineer:
No forged vessel, empty manufactured pipe, unpaid 420W load or fake gas
can cause material/power changes or alter the original 742 ship and truck.
This browser smoke is NOT a player-mined complete offworld acceptance run.
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
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(window.StarfallRuntime?.logisticsPressureStart8H &&
          window.StarfallRuntime?.logisticsPressureInstallPort8H &&
          window.StarfallPressureGasPackets8H?.create &&
          window.StarfallPressurePipePowerPort8H?.attach &&
          window.StarfallPressurePipeLiveUI8H?.refresh &&
          window.StarfallOutpostUI?.durableSnapshot &&
          document.querySelector('#pressure8h-readout')?.textContent.includes('REAL WORLD'))""",timeout=65000)
        response=page.evaluate("""()=>{
          const rt=StarfallRuntime,c=rt.logisticsPressureContext8H(),
           material=JSON.stringify(rt.materials8a.snapshot()),
           physical=JSON.stringify(rt.physical8a.serialize()),
           power=JSON.stringify(StarfallOutpostUI.durableSnapshot()),
           save=JSON.stringify(SF.load().logisticsPressureGasPackets8h||null),
           ship=rt.physical8a.get('ship-main')?.id,
           truck=rt.physical8a.get('truck-expedition-001')?.id;
          let blockedPort='',blockedFlow='';
          try{rt.logisticsPressureInstallPort8H('imaginary-pump');}
          catch(e){blockedPort=String(e.message||e);}
          try{rt.logisticsPressureStart8H('free-h2','imaginary-source',
             'imaginary-pump','imaginary-target',3);}
          catch(e){blockedFlow=String(e.message||e);}
          const after=rt.logisticsPressureContext8H();
          return{seed:rt.galaxy.seed,ship,truck,blockedPort,blockedFlow,
           sameMaterial:JSON.stringify(rt.materials8a.snapshot())===material,
           samePhysical:JSON.stringify(rt.physical8a.serialize())===physical,
           sameNativePower:JSON.stringify(StarfallOutpostUI.durableSnapshot())===power,
           sameSavedPackets:JSON.stringify(SF.load().logisticsPressureGasPackets8h||null)===save,
           panels:[!!document.querySelector('#pressure8h-install-port'),
             !!document.querySelector('#pressure8h-open-wiring'),
             !!document.querySelector('#pressure8h-start')],
           status:document.querySelector('#pressure8h-readout')?.textContent,
           packets:after.packets.length,onFoot:c.onFoot};
        }""")
        assert response['seed']==742,response
        assert response['ship']=='ship-main' and response['truck']=='truck-expedition-001',response
        assert response['blockedPort'] and response['blockedFlow'],response
        assert response['sameMaterial'] and response['samePhysical'] and response['sameNativePower'],response
        assert response['sameSavedPackets'],response
        assert all(response['panels']),response
        assert 'PIPE PRESSURE' in response['status'] and '420W' in response['status'],response
        assert not errors,errors
        print('PASS 8H real Chromium/WebGL2 source-owned 8MPa pipeline controls: forged electrical load/3kg fake gas rejected, original ship/truck, native T02 and 8A materials unchanged')
    finally:
        browser.close()
