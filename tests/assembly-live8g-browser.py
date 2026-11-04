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
          // Ship power is OFF by default. Engage the actual existing switch;
          // no energy is created by this controlled browser fixture.
          rt.vehicleStore.setPower('ship',true);
          rt.persistVehicles();
          p.assets.push({id:'8g-test-pad',type:'industrial_plant',massKg:760,volumeM3:2.8,
            condition:1,provenance:'TEST_FIXTURE_ONLY',
            location:{kind:'surface',bodyId:c.bodyId,local:[...c.local]},
            state:{station:'vehicle_assembly',enabled:true}});
          let i=0;
          for(const [materialId,massKg] of Object.entries(def.parts))
            m.lots.push({id:'8g-test-lot:'+(++i),materialId,massKg,volumeM3:massKg*.001,
              containerId:ship,grade:1,provenance:'TEST_FIXTURE_ONLY'});
          SF.save({physical8a:p,materials8a:m});
          // Stop the old in-memory runtime from overwriting this controlled
          // import during pagehide. Same rule as the official save restore path.
          window.__STARFALL_IMPORT_PENDING=true;
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
        separation=page.evaluate("""() => {
          const rt=StarfallRuntime,frame=rt.physical8a.list().find(a=>a.type==='vehicle_frame'),
            pad=rt.physical8a.get('8g-test-pad');
          const a=frame.location.local,b=pad.location.local,
            dot=Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0)));
          return Math.acos(dot)*rt.galaxy.byId.get(frame.location.bodyId).radius;
        }""")
        assert separation>=15,'Frame overlaps the real assembly pad footprint: '+str(separation)
        assert made['frames'][0]['state']['operational'] is False
        assert abs(made['frames'][0]['massKg']-fixture['expectedKg'])<1e-6
        assert len(made['truck'])==1 and made['truck'][0]['location']==fixture['truck']
        assert len(made['paid'])==1 and made['unspent']==0
        # Ship's live bus has independent generation and hotel loads between
        # browser interactions. Charge receipt is exact; net battery shift may
        # contain those real intervening flows, not phantom assembly energy.
        assert made['paid'][0]['energyJ']==200000
        assert 190000<=prior['energy']-made['energy']<=210000,(prior,made['energy'])
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
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("frame-cargo8g")',timeout=30000)
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        cargo=page.locator('#frame-cargo8g')
        frame_id=made['frames'][0]['id']
        cargo.locator('select[aria-label="Select manufactured frame cargo"]').select_option(frame_id)
        cargo.get_by_role('button',name='WINCH FRAME INTO SHIP').click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.location?.slot==='engineering-frame-cradle'""",arg=frame_id,timeout=15000)
        after_load=page.evaluate("""id => ({
          custody:StarfallRuntime.physical8a.get(id).location,
          truck:StarfallRuntime.physical8a.get('truck-expedition-001').location,
          receipt:StarfallRuntime.physical8a.serialize().transfers.filter(x=>x.reason==='8G_FRAME_LOAD'),
          cargoMass:StarfallRuntime.shipCargoMass8A()
        })""",frame_id)
        assert len(after_load['receipt'])==1,after_load
        assert after_load['receipt'][0]['energyJ']==30000,after_load
        assert after_load['truck']==fixture['truck'],'Loading frame moved or duplicated original truck'
        assert after_load['cargoMass']>=made['frames'][0]['massKg']
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("frame-cargo8g")',timeout=40000)
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        cargo=page.locator('#frame-cargo8g')
        cargo.locator('select[aria-label="Select manufactured frame cargo"]').select_option(frame_id)
        cargo.get_by_role('button',name='UNLOAD FRAME ONTO CLEAR GROUND').click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.location?.kind==='surface'""",arg=frame_id,timeout=15000)
        after_unload=page.evaluate("""id => ({
          frame:StarfallRuntime.physical8a.get(id),
          trucks:StarfallRuntime.physical8a.list().filter(x=>x.id==='truck-expedition-001'),
          moves:StarfallRuntime.physical8a.serialize().transfers.filter(x=>x.reason?.startsWith('8G_FRAME_'))
        })""",frame_id)
        assert len(after_unload['moves'])==2,after_unload
        assert len(after_unload['trucks'])==1 and after_unload['trucks'][0]['location']==fixture['truck']
        assert after_unload['frame']['state']['operational'] is False
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        activation=page.locator('#vehicle-activation8g')
        activation.locator('select[aria-label="Select physical manufactured vehicle"]').select_option(frame_id)
        button=activation.get_by_role('button',name='CALIBRATE & CHARGE')
        assert button.is_enabled(),'Paid 8G activation control is unexpectedly disabled'
        button.click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.state?.operational===true""",arg=frame_id,timeout=15000)
        activated=page.evaluate("""id => {
          const rt=StarfallRuntime,a=rt.physical8a.get(id);
          return{asset:a,truck:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001'),
          shipCharge:rt.vehicleStore.get('ship').state.energyJ};
        }""",frame_id)
        assert activated['asset']['state']['rideable'] is True
        assert activated['asset']['state']['drive']['batteryEnergyJ']==2000000
        assert activated['asset']['state']['activationReceipt']['energyJ']==2500000
        assert len(activated['truck'])==1 and activated['truck'][0]['location']==fixture['truck']
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed && StarfallRuntime.eva',timeout=40000)
        assert page.evaluate("""id => StarfallRuntime.physical8a.get(id)?.state?.operational===true""",frame_id)
        # Test-only physical placement by the already verified unique frame.
        # Then use the actual X boarding / WASD input rather than teleporting
        # the vehicle or modifying the authoritative 8A custody directly.
        page.evaluate("""id => STARFALL_DEBUG.placeEvaNearManufactured8G(id)""",frame_id)
        assert page.evaluate("""() => StarfallRuntime.enterManufactured8G()""") is True
        initial_drive=page.evaluate("""id => {
          const s=StarfallRuntime.physical8a.get(id).state;
          return s.batteryEnergyJ ?? s.drive.batteryEnergyJ;
        }""",frame_id)
        page.keyboard.down('w')
        page.wait_for_timeout(1200)
        page.keyboard.up('w')
        driven=page.evaluate("""id => ({
          occupied:StarfallRuntime.manufacturedOccupied8G,
          frame:StarfallRuntime.physical8a.get(id),
          original:StarfallRuntime.physical8a.list().filter(a=>a.id==='truck-expedition-001')
        })""",frame_id)
        assert driven['occupied']==frame_id,driven
        assert driven['frame']['state']['distanceM']>0,driven
        assert driven['frame']['state']['batteryEnergyJ']<initial_drive,driven
        assert len(driven['original'])==1 and driven['original'][0]['location']==fixture['truck']
        # Force an actual complete stop; powered winch may not load moving frames.
        page.keyboard.down('space')
        page.wait_for_timeout(900)
        page.keyboard.up('space')
        stopped=page.evaluate("""id => StarfallRuntime.physical8a.get(id).state.speedMS""",frame_id)
        assert abs(stopped)<.05,'Braking did not reach safe loading speed: '+str(stopped)
        assert page.evaluate("""() => StarfallRuntime.exitManufactured8G()""") is True
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        cargo=page.locator('#frame-cargo8g')
        cargo.locator('select[aria-label="Select manufactured frame cargo"]').select_option(frame_id)
        cargo.get_by_role('button',name='WINCH FRAME INTO SHIP').click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.location?.slot==='engineering-frame-cradle'""",
          arg=frame_id,timeout=15000)
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("frame-cargo8g")',timeout=40000)
        assert page.evaluate("""id => {
          const a=StarfallRuntime.physical8a.get(id);
          return a.location.slot==='engineering-frame-cradle' && a.state.operational===true &&
            a.state.batteryEnergyJ<2000000;
        }""",frame_id),'Driven prototype lost custody, operational status or battery during ship load/reload'
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        cargo=page.locator('#frame-cargo8g')
        cargo.locator('select[aria-label="Select manufactured frame cargo"]').select_option(frame_id)
        cargo.get_by_role('button',name='UNLOAD FRAME ONTO CLEAR GROUND').click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.location?.kind==='surface'""",
          arg=frame_id,timeout=15000)
        assert page.evaluate("""id => {
          const a=StarfallRuntime.physical8a.get(id);
          return a.state.operational===true && a.state.distanceM>0 &&
            StarfallRuntime.physical8a.list().filter(x=>x.id==='truck-expedition-001').length===1;
        }""",frame_id),'Unloaded vehicle lost driving progress or original truck ownership'
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=40000)
        assert page.evaluate("""id => StarfallRuntime.physical8a.get(id).state.distanceM>0""",frame_id)
        assert not errors,errors
        print('PASS 8G Chromium activation: complete manufactured frame calibrated and charged 2.5MJ, distinct rideable vehicle saved without cloning expedition truck')
        assert not errors,errors
        print('PASS 8G file:// Chromium: manufactured frame built, conserved, loaded in dedicated cradle, paid energy, restored and unloaded; original truck untouched')
    finally:
        browser.close()
