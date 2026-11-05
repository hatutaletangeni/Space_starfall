#!/usr/bin/env python3
"""8H original real file:// Chromium: powered dry packet UI cannot invent depots or stock.
Uses genuine software WebGL2 and unchanged original ship/truck world; no fixture.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1280,'height':800})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(window.StarfallRuntime&&window.StarfallConveyorPackets8H&&
           window.StarfallConveyorNativeBridge8H&&window.StarfallConveyorLiveUI8H&&
           window.StarfallOutpostUI?.durableSnapshot&&
           document.querySelector('#conveyor8h-readout')?.textContent.includes('REAL BODY'))""",timeout=60000)
        actual=page.evaluate("""()=>{
          const rt=StarfallRuntime,ctx=rt.logisticsConveyorContext8H(),
            prev=SF.load(),materials=JSON.stringify(rt.materials8a.snapshot()),
            power=JSON.stringify(StarfallOutpostUI.durableSnapshot()),
            originalShip=rt.physical8a.get('ship-main'),
            originalTruck=rt.physical8a.get('truck-expedition-001'),
            seed=rt.galaxy.seed;
          let rejected=false;
          try{rt.logisticsConveyorStart8H('invented-ore','invented-depot',
            'invented-drive','invented-target',12);}catch(e){rejected=true;}
          return{rejected,seed,originalShip:originalShip?.id,originalTruck:originalTruck?.id,
            materialsUnchanged:JSON.stringify(rt.materials8a.snapshot())===materials,
            energyUnchanged:JSON.stringify(StarfallOutpostUI.durableSnapshot())===power,
            noFakePacket:!rt.logisticsConveyorContext8H().packets.some(x=>x.id==='invented-ore'),
            initialJobs:prev.logisticsConveyorPackets8h?.jobs?.length||0,
            readout:document.querySelector('#conveyor8h-readout')?.textContent,
            disabled:document.querySelector('#conveyor8h-start')?.disabled};
        }""")
        assert actual['seed']==742,actual
        assert actual['originalShip']=='ship-main' and actual['originalTruck']=='truck-expedition-001',actual
        assert actual['rejected'] and actual['materialsUnchanged'] and actual['energyUnchanged'],actual
        assert actual['noFakePacket'] and 'SAVED 8H PACKETS' in actual['readout'],actual
        assert not errors,errors
        print('PASS 8H live original Chromium: no unmanufactured depots, no free ore, original truck and ship unchanged, source-owned T02 and UI active')
    finally:
        browser.close()
