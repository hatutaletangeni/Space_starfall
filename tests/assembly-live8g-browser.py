#!/usr/bin/env python3
"""Actual file:// Chromium 8G integration smoke; controlled certified-lot fixture.
Does not grant stock in ordinary Industrial gameplay.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
uri=(root/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1300,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(uri,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!window.StarfallRuntime?.physical8a',timeout=60000)
        seed=page.evaluate("""() => {
          const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position;
          const x=SF.load();
          SF.save({physical8a:rt.physical8a.serialize(),materials8a:rt.materials8a.snapshot(),
            flightGalaxy:{...x.flightGalaxy,seed:rt.galaxy.seed,time:0,
            position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
            groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
          return SF.load();
        }""")
        page.evaluate("""s => {
          window.__STARFALL_IMPORT_PENDING=true;
          localStorage.setItem('starfall_save',JSON.stringify(s));
        }""",seed)
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed&&StarfallRuntime.eva&&StarfallRuntime.outpostContext()?.local',timeout=30000)
        fixture=page.evaluate("""() => {
          const rt=StarfallRuntime,c=rt.outpostContext(),m=rt.materials8a.snapshot(),
            p=rt.physical8a.serialize(),ship=StarfallMining8D.SHIP,
            def=StarfallAssembly8G.DEFINITIONS.science_rover;
          if(!c.bodyId||!Array.isArray(c.local))throw Error('Missing EVA surface anchor');
          p.assets.push({id:'8g-test-pad',type:'industrial_plant',massKg:760,volumeM3:2.8,
            condition:1,provenance:'TEST_FIXTURE_ONLY',
            location:{kind:'surface',bodyId:c.bodyId,local:[...c.local]},
            state:{station:'vehicle_assembly',enabled:true}});
          let i=0;
          for(const [materialId,massKg] of Object.entries(def.parts))
            m.lots.push({id:'8g-test-lot:'+(++i),materialId,massKg,volumeM3:massKg*.001,
              containerId:ship,grade:1,provenance:'TEST_FIXTURE_ONLY'});
          SF.save({physical8a:p,materials8a:m});
          return {bodyId:c.bodyId,truck:p.assets.find(x=>x.id==='truck-expedition-001')?.location,
             expectedKg:Object.values(def.parts).reduce((a,b)=>a+b,0)};
        }""")
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed&&StarfallRuntime.eva&&!!document.getElementById("assembly-inspector8g-panel")',timeout=40000)
        diagnostic=page.evaluate("""() => ({
          context:StarfallRuntime.assemblyContext8G(),
          outpost:StarfallRuntime.outpostContext(),
          ship:StarfallRuntime.vehicleStore.get('ship').state,
          physical:StarfallRuntime.physical8a.get('8g-test-pad')
        })""")
        print('8G diagnostic:',diagnostic,flush=True)
        quote=page.evaluate("""() => StarfallRuntime.assemblyQuote8G('science_rover','8g-test-pad')""")
        assert quote['ready'] is True,quote
        prior=page.evaluate("""() => ({
          energy:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
          count:StarfallRuntime.physical8a.list().length,
          lots:StarfallRuntime.materials8a.inventory().filter(x=>x.id.startsWith('8g-test-lot:')).length
        })""")
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        panel=page.locator('#assembly-inspector8g-panel')
        panel.locator('select[aria-label="Inspect future vehicle bill of materials"]').select_option('science_rover')
        panel.locator('select[aria-label="Physical assembly pad"]').select_option('8g-test-pad')
        trigger=panel.get_by_role('button',name='ASSEMBLE REAL FRAME')
        assert trigger.is_enabled(),'Live 8G build action incorrectly disabled'
        trigger.click()
        page.wait_for_function("""() => StarfallRuntime.physical8a.list().some(x => x.id.startsWith('vehicle8g:')&&x.type==='vehicle_frame')""",timeout=15000)
        made=page.evaluate("""() => {
          const rt=StarfallRuntime,a=rt.physical8a.list().filter(x=>x.type==='vehicle_frame'),
          m=rt.materials8a.inventory().filter(x=>x.id.startsWith('8g-test-lot:'));
          return {frames:a,truck:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001'),
            paid:SF.load().vehicleAssembly8g.receipts,
            energy:rt.vehicleStore.get('ship').state.energyJ,unspent:m.length};
        }""")
        assert len(made['frames'])==1,made
        assert made['frames'][0]['state']['operational'] is False
        assert abs(made['frames'][0]['massKg']-fixture['expectedKg'])<1e-6
        assert len(made['truck'])==1 and made['truck'][0]['location']==fixture['truck']
        assert len(made['paid'])==1 and made['unspent']==0
        assert abs(prior['energy']-made['energy']-200000)<1e-5
        assert not errors,errors
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=60000)
        persisted=page.evaluate("""() => ({
          frames:StarfallRuntime.physical8a.list().filter(x=>x.type==='vehicle_frame').length,
          receipts:SF.load().vehicleAssembly8g.receipts.length,
          trucks:StarfallRuntime.physical8a.list().filter(x=>x.id==='truck-expedition-001').length
        })""")
        assert persisted=={'frames':1,'receipts':1,'trucks':1},persisted
        assert not errors,errors
        print('PASS 8G file:// browser: actual Engineer UI paid for one finite chassis, original truck conserved, 200 kJ debited, frame and receipt survive reload')
    finally:
        browser.close()
