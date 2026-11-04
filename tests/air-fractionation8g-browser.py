#!/usr/bin/env python3
"""Real file:// Chromium extraction test: no production air or stock fixtures.
 Fixture installations are isolated to the test browser save/profile only.
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
        page=browser.new_page(viewport={'width':1320,'height':900})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(uri,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!window.StarfallRuntime?.galaxy?.byId',timeout=60000)
        seed=page.evaluate("""() => {
          const rt=StarfallRuntime;
          const b=[...rt.galaxy.byId.values()].find(x=>x.kind==='planet'&&x.landable&&
            StarfallCompositionCW01.forBody(x,rt.galaxy).atmosphereMoleFractions?.N2>=.03);
          if(!b)throw Error('No atmospheric landable planet in current 8G galaxy');
          const session=SF.load(),p=b.position;
          SF.save({flightGalaxy:{...session.flightGalaxy,seed:rt.galaxy.seed,time:0,
             position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
             groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
          return {world:b.id,kind:b.type};
        }""")
        page.evaluate("""() => {window.__STARFALL_IMPORT_PENDING=true;}""")
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed && StarfallRuntime.eva && !!StarfallRuntime.outpostContext()?.local',
            timeout=45000)
        fixture=page.evaluate("""() => {
          const rt=StarfallRuntime,c=rt.outpostContext(),p=rt.physical8a.serialize(),
             m=rt.materials8a.snapshot();
          if(!c.bodyId)throw Error('EVA did not reach atmospheric world');
          const a=StarfallCompositionCW01.forBody(c.body,rt.galaxy);
          if(!(a.atmosphereMoleFractions?.N2>=.03))throw Error('Selected world does not contain modeled N2');
          rt.vehicleStore.setPower('ship',true);rt.persistVehicles();
          const location=(dist)=>({kind:'surface',bodyId:c.bodyId,local:rt.outpostOffset(dist,0)});
          p.assets.push({id:'air-test-plant',type:'industrial_plant',condition:1,
             massKg:740,volumeM3:2.4,provenance:'TEST_FIXTURE_ONLY_NOT_PRODUCTION',
             location:location(24),
             state:{station:'air_fractionation',enabled:true,
               tools:[...StarfallAirFractionation8G.REQUIRED_TOOLS]}});
          p.assets.push({id:'air-test-nitrogen-vessel',type:'industrial_vessel',
             condition:1,massKg:195,volumeM3:4,provenance:'TEST_FIXTURE_ONLY_NOT_PRODUCTION',
             location:location(42),
             state:{materialId:'nitrogen',containerId:'vessel8e:air-test-nitrogen-vessel',
               ratedPressurePa:8000000,enabled:true}});
          m.containers.push({id:'vessel8e:air-test-nitrogen-vessel',
             ownerId:'air-test-nitrogen-vessel',kind:'gas pressure vessel',
             maxMassKg:1000,maxVolumeM3:4});
          const original=p.assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
           .map(x=>({id:x.id,location:x.location}));
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return {bodyId:c.bodyId,original};
        }""")
        assert fixture['bodyId']==seed['world'],(fixture,seed)
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed && StarfallRuntime.eva && !!document.getElementById("air-fractionation8g")',
           timeout=45000)
        before=page.evaluate("""() => ({
          energy:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
          gas:StarfallRuntime.materials8a.inventory('vessel8e:air-test-nitrogen-vessel').length
        })""")
        quote=page.evaluate("""() => StarfallRuntime.airFractionationQuote8G('air-test-plant','air-test-nitrogen-vessel')""")
        assert quote['ready'] and quote['powered'],quote
        assert quote['availableAirKg']==2400,quote
        assert 0<quote['nitrogenKg']<quote['airBatchKg']
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        control=page.locator('#air-fractionation8g')
        control.locator('select[aria-label="Select physical air separator"]').select_option('air-test-plant')
        control.locator('select[aria-label="Select physical nitrogen vessel"]').select_option('air-test-nitrogen-vessel')
        action=control.get_by_role('button',name='SEPARATE 20 KG ATMOSPHERIC AIR')
        assert action.is_enabled()
        action.click()
        page.wait_for_function('StarfallRuntime.atmosphere8g.snapshot().harvests.length===1',timeout=12000)
        output=page.evaluate("""() => {
          const rt=StarfallRuntime,gas=rt.materials8a.inventory('vessel8e:air-test-nitrogen-vessel'),
            h=rt.atmosphere8g.snapshot().harvests,assets=rt.physical8a.list();
          return {gas,harvests:h,energy:rt.vehicleStore.get('ship').state.energyJ,
            original:assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
              .map(x=>({id:x.id,location:x.location}))};
        }""")
        assert len(output['gas'])==1 and output['gas'][0]['materialId']=='nitrogen'
        assert len(output['harvests'])==1
        r=output['harvests'][0]
        assert abs(r['airKg']-r['nitrogenKg']-r['ventKg'])<1e-6
        assert abs(output['gas'][0]['massKg']-r['nitrogenKg'])<1e-6
        assert output['original']==fixture['original'],output
        assert abs(before['energy']-output['energy']-810000)<15000,output
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.atmosphere8g',timeout=40000)
        saved=page.evaluate("""() => {
          const rt=StarfallRuntime,h=rt.atmosphere8g.snapshot().harvests;
          return{records:h.length,lotCount:rt.materials8a.inventory('vessel8e:air-test-nitrogen-vessel').length,
            remaining:rt.atmosphere8g.remaining(StarfallAirFractionation8G.parcel(
              rt.galaxy.byId.get(h[0].bodyId),rt.galaxy,rt.physical8a.get('air-test-plant').location.local))};
        }""")
        assert saved['records']==1 and saved['lotCount']==1,saved
        assert abs(saved['remaining']-2380)<1e-7,saved
        # Second physical collection must have a distinct lot and permanently
        # further deplete the same modeled surface cell, not reset at reload.
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("air-fractionation8g")',timeout=40000)
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        ui=page.locator('#air-fractionation8g')
        ui.locator('select[aria-label="Select physical air separator"]').select_option('air-test-plant')
        ui.locator('select[aria-label="Select physical nitrogen vessel"]').select_option('air-test-nitrogen-vessel')
        ui.get_by_role('button',name='SEPARATE 20 KG ATMOSPHERIC AIR').click()
        page.wait_for_function('StarfallRuntime.atmosphere8g.snapshot().harvests.length===2',timeout=12000)
        twice=page.evaluate("""() => {
          const rt=StarfallRuntime,h=rt.atmosphere8g.snapshot().harvests,plant=rt.physical8a.get('air-test-plant');
          const p=StarfallAirFractionation8G.parcel(rt.galaxy.byId.get(plant.location.bodyId),rt.galaxy,plant.location.local);
          return{count:h.length,ids:h.map(x=>x.outputLotId),remaining:rt.atmosphere8g.remaining(p),
            lots:rt.materials8a.inventory('vessel8e:air-test-nitrogen-vessel').length};
        }""")
        assert twice['count']==2 and len(set(twice['ids']))==2 and twice['lots']==2,twice
        assert abs(twice['remaining']-2360)<1e-6,twice
        # Move the actual filled, pressure-rated vessel. It stays one 8A asset,
        # and both nitrogen lots remain in its vessel-owned container. No
        # nitrogen is transferred into unsecured ship material cargo.
        page.evaluate("""() => STARFALL_DEBUG.placeEvaNearGasVessel8G('air-test-nitrogen-vessel')""")
        before_winch=page.evaluate("""() => ({
          shipCargoKg:StarfallRuntime.shipCargoMass8A(),
          energyJ:StarfallRuntime.vehicleStore.get('ship').state.energyJ,
          gas:StarfallRuntime.materials8a.inventory('vessel8e:air-test-nitrogen-vessel')
        })""")
        panel=page.locator('#gas-vessel-cargo8g')
        assert panel.is_visible(),'Missing playable Engineer gas gantry'
        panel.locator('select[aria-label="Select rated gas vessel cargo"]').select_option('air-test-nitrogen-vessel')
        load=panel.get_by_role('button',name='WINCH PRESSURE VESSEL INTO SHIP')
        assert load.is_enabled()
        load.click()
        page.wait_for_function("""() => StarfallRuntime.physical8a.get('air-test-nitrogen-vessel')
          ?.location?.slot==='engineering-gas-cradle'""",timeout=12000)
        aboard=page.evaluate("""() => {
          const rt=StarfallRuntime,v=rt.physical8a.get('air-test-nitrogen-vessel'),
            gas=rt.materials8a.inventory(v.state.containerId);
          return{vessel:v,gas,flightMassKg:rt.shipCargoMass8A(),
            powerJ:rt.vehicleStore.get('ship').state.energyJ,
            truck:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
        }""")
        assert aboard['vessel']['massKg']==195 and aboard['truck']==1,aboard
        assert aboard['gas']==before_winch['gas']
        assert abs(aboard['flightMassKg']-before_winch['shipCargoKg']-
          195-sum(x['massKg'] for x in aboard['gas']))<1e-6,aboard
        assert abs(before_winch['energyJ']-aboard['powerJ']-120000)<15000,aboard
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a&&StarfallRuntime.eva',timeout=45000)
        persisted_gas=page.evaluate("""() => {
          const rt=StarfallRuntime,v=rt.physical8a.get('air-test-nitrogen-vessel');
          return{vessel:v,gas:rt.materials8a.inventory(v.state.containerId),
            mass:rt.shipCargoMass8A(),truck:rt.physical8a.list()
              .filter(x=>x.id==='truck-expedition-001').length};
        }""")
        assert persisted_gas['vessel']['location']['slot']=='engineering-gas-cradle'
        assert persisted_gas['gas']==aboard['gas'] and persisted_gas['truck']==1
        assert abs(persisted_gas['mass']-aboard['flightMassKg'])<1e-6
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        panel=page.locator('#gas-vessel-cargo8g')
        panel.locator('select[aria-label="Select rated gas vessel cargo"]').select_option('air-test-nitrogen-vessel')
        panel.get_by_role('button',name='UNLOAD PRESSURE VESSEL TO CLEAR SURFACE').click()
        page.wait_for_function("""() => StarfallRuntime.physical8a.get('air-test-nitrogen-vessel')
          ?.location?.kind==='surface'""",timeout=12000)
        unpacked=page.evaluate("""() => {
          const rt=StarfallRuntime,v=rt.physical8a.get('air-test-nitrogen-vessel');
          return{bodyId:v.location.bodyId,gas:rt.materials8a.inventory(v.state.containerId),
            mass:rt.shipCargoMass8A(),original:rt.physical8a.list()
              .filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
              .map(x=>({id:x.id,location:x.location}))};
        }""")
        assert unpacked['bodyId']==fixture['bodyId']
        assert unpacked['gas']==aboard['gas'] and unpacked['original']==fixture['original']
        assert abs(unpacked['mass']-before_winch['shipCargoKg'])<1e-6
        assert not errors,errors
        print('PASS offline Chromium: CW01 modeled real N2 planet, powered machine + rated vessel, 20 kg finite air depleted, 8A gas lot mass and 810 kJ conserved, original truck and save/reload protected')
    finally:
        browser.close()
