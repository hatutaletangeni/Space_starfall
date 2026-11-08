#!/usr/bin/env python3
"""STARFALL 8G real offline Chromium structural-assembly regression.
Controlled material fixtures are test-only; production never grants resources.
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
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=60000)
        seed=page.evaluate("""() => {
          const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
                x=SF.load();
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
        page.wait_for_function('StarfallRuntime.landed&&StarfallRuntime.eva&&StarfallRuntime.outpostContext()?.local',timeout=40000)
        fixture=page.evaluate("""() => {
          const rt=StarfallRuntime,c=rt.outpostContext(),
            m=rt.materials8a.snapshot(),p=rt.physical8a.serialize(),
            ship=StarfallMining8D.SHIP;
          if(!c.bodyId||!Array.isArray(c.local))throw Error('No EVA body-fixed landing');
          rt.vehicleStore.setPower('ship',true);rt.persistVehicles();
          const blueprints=[
            {id:'rocket_stage',station:'rocket_integration',pad:'test-rocket-pad',offset:28,mass:900},
            {id:'habitat_shell',station:'habitat_pad',pad:'test-habitat-pad',offset:-28,mass:1120}];
          let n=0;
          for(const b of blueprints){
            p.assets.push({id:b.pad,type:'industrial_plant',massKg:b.mass,volumeM3:3.7,
              condition:1,provenance:'TEST_FIXTURE_ONLY',
              location:{kind:'surface',bodyId:c.bodyId,local:rt.outpostOffset(b.offset,0)},
              state:{station:b.station,enabled:true}});
            for(const [materialId,massKg] of Object.entries(StarfallAssembly8G.DEFINITIONS[b.id].parts)){
              m.lots.push({id:'struct-test-lot:'+(++n),materialId,massKg,volumeM3:massKg*.001,
                containerId:ship,grade:1,provenance:'TEST_FIXTURE_ONLY'});
            }
          }
          const original=p.assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
              .map(x=>({id:x.id,location:x.location}));
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return {bodyId:c.bodyId,original,initialMass:p.assets.reduce((s,a)=>s+a.massKg,0)+
            m.lots.reduce((s,l)=>s+l.massKg,0)};
        }""")
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed&&StarfallRuntime.eva&&!!document.getElementById("structure-assembly8g")',timeout=40000)
        initial_battery=page.evaluate("""() => StarfallRuntime.vehicleStore.get('ship').state.energyJ""")
        # UI22: navigate through visible Mission workspace; keep all behavior assertions.
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        panel=page.locator('#structure-assembly8g')
        type_sel=panel.locator('select[aria-label="Select dry rocket stage or habitat envelope"]')
        pad_sel=panel.locator('select[aria-label="Select physical rocket or habitat assembly pad"]')
        for blueprint,pad in [('rocket_stage','test-rocket-pad'),
                              ('habitat_shell','test-habitat-pad')]:
            type_sel.select_option(blueprint)
            pad_sel.select_option(pad)
            quote=page.evaluate("""({b,p})=> StarfallRuntime.structureQuote8G(b,p)""",
                                {'b':blueprint,'p':pad})
            assert quote['ready'] and quote['powered'],(blueprint,quote)
            trigger=panel.get_by_role('button',name='ASSEMBLE UNQUALIFIED PHYSICAL STRUCTURE')
            assert trigger.is_enabled(),blueprint
            trigger.click()
            page.wait_for_function("""n => StarfallRuntime.physical8a.list()
              .filter(x=>x.type==='rocket_stage_dry'||x.type==='habitat_envelope').length===n""",
              arg=1 if blueprint=='rocket_stage' else 2,timeout=12000)
        habitat_id=page.evaluate("""() => {
          const h=StarfallRuntime.physical8a.list().find(x=>x.type==='habitat_envelope');
          if(!h)throw Error('Paid physically assembled habitat missing');
          return h.id;
        }""")
        # TEST ONLY: place filled vessels and paid water into the actual
        # 8A inventory; production never seeds any of these resources.
        fixture=page.evaluate("""id => {
          const rt=StarfallRuntime,c=rt.outpostContext(),p=rt.physical8a.serialize(),
            m=rt.materials8a.snapshot(),need=StarfallHabitatCharge8G.requirements();
          // Test-only cylinders are physically separated from each other,
          // midway between the real manufactured habitat and landed ship.
          const normalize=x=>{const len=Math.hypot(...x);return x.map(v=>v/len);};
          const hab=p.assets.find(x=>x.id===id),shipPos=rt.engineeringAssetPoses().shipPose.local;
          const midpoint=normalize(hab.location.local.map((v,i)=>v+shipPos[i]));
          const axis=Math.abs(midpoint[0])<.8?[1,0,0]:[0,0,1];
          const tangent=normalize([midpoint[1]*axis[2]-midpoint[2]*axis[1],
            midpoint[2]*axis[0]-midpoint[0]*axis[2],
            midpoint[0]*axis[1]-midpoint[1]*axis[0]]);
          const cylinderLocal=side=>{
            const ang=side/c.body.radius;
            return normalize(midpoint.map((v,i)=>v*Math.cos(ang)+tangent[i]*Math.sin(ang)));
          };
          const original=p.assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
            .map(x=>({id:x.id,location:x.location}));
          for(const [species,side] of [['oxygen',-15],['nitrogen',15]]){
            const vesselId='hose-fixture:'+species,cid='vessel8e:'+vesselId;
            p.assets.push({id:vesselId,type:'industrial_vessel',massKg:195,volumeM3:4,
              condition:1,provenance:'TEST_FIXTURE_ONLY_8E_VESSEL',
              location:{kind:'surface',bodyId:c.bodyId,local:cylinderLocal(side)},
              state:{materialId:species,containerId:cid,ratedPressurePa:8000000,enabled:true}});
            m.containers.push({id:cid,ownerId:vesselId,kind:'gas pressure vessel',
              maxMassKg:1000,maxVolumeM3:4});
            const molar=species==='oxygen'?.031998:.028014;
            const gasVolumeM3=(need[species]/molar)*8.314462618*293.15/5e6;
            m.lots.push({id:'hose-test:'+species,materialId:species,
              massKg:need[species],volumeM3:gasVolumeM3,containerId:cid,grade:1,
              provenance:'TEST_FIXTURE_ONLY_PROVENANCE'});
          }
          m.lots.push({id:'hose-test:water',materialId:'water',massKg:need.water,
            volumeM3:.02,containerId:StarfallMining8D.SHIP,grade:1,
            provenance:'TEST_FIXTURE_ONLY_SHIP_WATER'});
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return {original,bodyId:c.bodyId,total:p.assets.reduce((s,a)=>s+a.massKg,0)+
              m.lots.reduce((s,l)=>s+l.massKg,0),habitatId:id,
              originalMass:p.assets.find(x=>x.id===id).massKg,
              neededMass:Object.values(need).reduce((s,n)=>s+n,0)};
        }""",habitat_id)
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed && StarfallRuntime.eva && !!document.getElementById("habitat-hose8g")',timeout=45000)
        # Use the real 8G gantry to carry the oxygen pressure vessel aboard.
        # The hose must still see the original rated vessel OWN its gas, not
        # hallucinate a generic oxygen stock lot in the ship hold.
        page.evaluate("""() => STARFALL_DEBUG.placeEvaNearGasVessel8G('hose-fixture:oxygen')""")
        # UI22: navigate through visible Mission workspace; keep all behavior assertions.
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        crane=page.locator('#gas-vessel-cargo8g')
        crane.locator('select[aria-label="Select physical nitrogen or oxygen vessel"]').select_option('hose-fixture:oxygen')
        crane.get_by_role('button',name='WINCH GAS VESSEL INTO SHIP').click()
        page.wait_for_function("""() =>
          StarfallRuntime.physical8a.get('hose-fixture:oxygen')?.location?.slot==='engineering-gas-cradle'""",timeout=15000)
        assert page.evaluate("""() => {
          const a=StarfallRuntime.physical8a.get('hose-fixture:oxygen');
          return a.location.kind==='ship'&&
            StarfallRuntime.materials8a.inventory(a.state.containerId).length===1;
        }""")
        # Physically walk back to the fabricated envelope before using the hose.
        page.evaluate("""id => STARFALL_DEBUG.placeEvaNearRepairAsset8G(id)""",habitat_id)
        ready=page.evaluate("""id => StarfallRuntime.habitatHoseQuote8G(id,
          'hose-fixture:oxygen','hose-fixture:nitrogen')""",habitat_id)
        assert ready['ready'] and ready['powered'],ready
        assert 95<ready['pressureKPa']<105 and 20<ready['oxygenPartialKPa']<22,ready
        charge_before=page.evaluate("""() => StarfallRuntime.vehicleStore.get('ship').state.energyJ""")
        # UI22: navigate through visible Mission workspace; keep all behavior assertions.
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        ui=page.locator('#habitat-hose8g')
        ui.locator('select[aria-label="Select unfinished habitat for rated gas charge"]').select_option(habitat_id)
        ui.locator('select[aria-label="Select actual rated oxygen source"]').select_option('hose-fixture:oxygen')
        ui.locator('select[aria-label="Select actual rated nitrogen source"]').select_option('hose-fixture:nitrogen')
        button=ui.get_by_role('button',name='METER O₂ + N₂ + SHIP WATER')
        assert button.is_enabled(),'Real paid hose action disabled'
        button.click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.state?.meteredCharge8g?.status==='COMMITTED'""",
          arg=habitat_id,timeout=15000)
        paid=page.evaluate("""id => {
          const rt=StarfallRuntime,p=rt.physical8a.serialize(),m=rt.materials8a.snapshot(),
            h=rt.physical8a.get(id);
          const t09=StarfallHabitatT09.inspect({kind:'hab',id,bodyId:h.location.bodyId,
            enabled:false,condition:h.condition,habT09:h.state.habT09},null,false);
          return{habitat:h,t09,gasLots:m.lots.filter(x=>x.id.startsWith('hose-test:')),
            originals:p.assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
              .map(x=>({id:x.id,location:x.location})),
            vessels:p.assets.filter(x=>x.id.startsWith('hose-fixture:')).map(x=>({id:x.id,massKg:x.massKg})),
            total:p.assets.reduce((s,x)=>s+x.massKg,0)+m.lots.reduce((s,x)=>s+x.massKg,0),
            energy:rt.vehicleStore.get('ship').state.energyJ};
        }""",habitat_id)
        assert len(paid['gasLots'])==0 and len(paid['vessels'])==2,paid
        assert paid['originals']==fixture['original'],paid
        assert abs(paid['total']-fixture['total'])<1e-6,paid
        assert abs(paid['habitat']['massKg']-fixture['originalMass']-fixture['neededMass'])<1e-6,paid
        assert abs(charge_before-paid['energy']-1500000)<15000,paid
        assert 95<paid['t09']['pressureKPa']<105 and 20<paid['t09']['oxygenKPa']<22,paid
        assert paid['t09']['serviceReady'] is False and paid['habitat']['state']['habitable'] is False,paid
        assert paid['habitat']['state']['habT09']['oxygenTankMol']==0 and paid['habitat']['state']['habT09']['scrubberCapacityMol']==0
        # The old raw ship-gas pathway must now reject a previously metered
        # habitat so the two charging workflows cannot mint double gas.
        assert page.evaluate("""id => {
          try{StarfallRuntime.habitatChargeQuote8G(id);return false}
          catch(e){return /already|uncharged/.test(String(e.message))}
        }""",habitat_id)
        assert not errors,errors
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=45000)
        persisted=page.evaluate("""id => {
          const rt=StarfallRuntime,h=rt.physical8a.get(id);
          return{kg:h.massKg,pressurePa:h.state.pressurePa,receipts:h.state.meteredCharge8g?.consumedLots?.length,
            habitable:h.state.habitable,lifeSupportOnline:h.state.lifeSupportOnline,
            oldTrucks:rt.physical8a.list().filter(a=>a.id==='truck-expedition-001').length,
            restGasLots:rt.materials8a.inventory().filter(x=>x.id.startsWith('hose-test:')).length};
        }""",habitat_id)
        assert abs(persisted['kg']-paid['habitat']['massKg'])<1e-6
        assert persisted['pressurePa']>95000 and persisted['receipts']==3
        assert not persisted['habitable'] and not persisted['lifeSupportOnline']
        assert persisted['oldTrucks']==1 and persisted['restGasLots']==0
        assert not errors,errors
        print('PASS 8G Chromium: physically assembled habitat + two rated source vessels + ship water, metered 1.5 MJ O2/N2 charge, T09 pressure, strict 8A mass and durable uninhabitable state')
    finally:
        browser.close()
