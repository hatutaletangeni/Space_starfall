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
        # UI22 visible mission workflow; all original scenario assertions remain.
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
        made=page.evaluate("""() => {
          const rt=StarfallRuntime,assets=rt.physical8a.list();
          const built=assets.filter(x=>x.type==='rocket_stage_dry'||x.type==='habitat_envelope');
          const stock=rt.materials8a.snapshot().lots.filter(x=>x.id.startsWith('struct-test-lot:'));
          return {built,stock:stock.length,
            originals:assets.filter(x=>x.id==='truck-expedition-001'||x.id==='rover-science-001')
              .map(x=>({id:x.id,location:x.location})),
            mass:assets.reduce((s,a)=>s+a.massKg,0)+
              rt.materials8a.snapshot().lots.reduce((s,l)=>s+l.massKg,0),
            receipts:SF.load().vehicleAssembly8g.receipts.filter(x=>x.id.startsWith('structure8g:')),
            battery:rt.vehicleStore.get('ship').state.energyJ};
        }""")
        assert len(made['built'])==2,made
        assert made['stock']==0,'Consumed parts magically remain available'
        assert made['originals']==fixture['original'],'Original truck or rover custody changed'
        assert abs(made['mass']-fixture['initialMass'])<1e-6,'Global mass conservation violated'
        assert len(made['receipts'])==2 and len(set(x['assetId'] for x in made['receipts']))==2
        assert all(x['status']=='ASSEMBLED_NOT_OPERATIONAL' for x in made['receipts'])
        assert abs(initial_battery-made['battery']-7000000)<15000,'Unpaid structural energy or unrelated excessive bus load'
        rocket=next(x for x in made['built'] if x['type']=='rocket_stage_dry')
        habitat=next(x for x in made['built'] if x['type']=='habitat_envelope')
        assert rocket['state']['launchReady'] is False and rocket['state']['propellantKg']==0
        assert habitat['state']['habitable'] is False and habitat['state']['pressurePa']==0
        assert not errors,errors
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=40000)
        persisted=page.evaluate("""() => ({
          structures:StarfallRuntime.physical8a.list().filter(x=>
            ['rocket_stage_dry','habitat_envelope'].includes(x.type)).map(x=>x.id),
          receipts:SF.load().vehicleAssembly8g.receipts.filter(x=>x.id.startsWith('structure8g:')).length,
          originalTruck:StarfallRuntime.physical8a.list().filter(x=>x.id==='truck-expedition-001').length
        })""")
        assert persisted['structures']==[x['id'] for x in made['built']],persisted
        assert persisted['receipts']==2 and persisted['originalTruck']==1,persisted
        assert not errors,errors
        # Test-fixture damage to one actually constructed 8G stage; add one
        # distinguishable genuine-part surrogate only in this isolated test.
        # Ordinary gameplay never grants stocks or changes condition for free.
        before_repair=page.evaluate("""id => {
          const rt=StarfallRuntime,p=rt.physical8a.serialize(),
            m=rt.materials8a.snapshot(),a=p.assets.find(x=>x.id===id),
            rule=StarfallFieldRepair8G.REPAIRS[a.type];
          a.condition=.60;
          m.lots.push({id:'repair-spare-fixture',materialId:rule.part,
            massKg:rule.kg,volumeM3:.005,grade:1,
            containerId:StarfallMining8D.SHIP,provenance:'TEST_FIXTURE_ONLY_8F_SPARE'});
          const total=p.assets.reduce((n,x)=>n+x.massKg,0)+
            m.lots.reduce((n,x)=>n+x.massKg,0);
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return{assetId:id,part:rule.part,kg:rule.kg,workJ:rule.workJ,total,
            shipEnergyJ:rt.vehicleStore.get('ship').state.energyJ};
        }""",rocket['id'])
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("field-repair8g")',timeout=40000)
        page.evaluate("""id => STARFALL_DEBUG.placeEvaNearRepairAsset8G(id)""",rocket['id'])
        # UI22 visible mission workflow; all original scenario assertions remain.
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        repair_panel=page.locator('#field-repair8g')
        repair_panel.locator('select[aria-label="Select damaged manufactured structure"]').select_option(rocket['id'])
        repair_btn=repair_panel.get_by_role('button',name='REPLACE DAMAGED PHYSICAL PART')
        assert repair_btn.is_enabled(),'Physical 8G repair control disabled despite actual part and power'
        repair_btn.click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id).condition>.60""",
          arg=rocket['id'],timeout=12000)
        repaired=page.evaluate("""id => {
          const rt=StarfallRuntime,a=rt.physical8a.get(id),
            p=rt.physical8a.serialize(),m=rt.materials8a.snapshot();
          return{asset:a,
            scrap:m.lots.find(x=>x.id==='scrap:repair8g:'+id+':1'),
            spare:m.lots.filter(x=>x.id==='repair-spare-fixture').length,
            total:p.assets.reduce((n,x)=>n+x.massKg,0)+
              m.lots.reduce((n,x)=>n+x.massKg,0),
            shipEnergyJ:rt.vehicleStore.get('ship').state.energyJ,
            originalTruck:p.assets.filter(x=>x.id==='truck-expedition-001').length};
        }""",rocket['id'])
        assert abs(repaired['asset']['condition']-.78)<.0001,repaired
        assert repaired['scrap'] and abs(repaired['scrap']['massKg']-before_repair['kg'])<1e-7,repaired
        assert repaired['spare']==0 and repaired['originalTruck']==1,repaired
        assert abs(repaired['total']-before_repair['total'])<1e-7,repaired
        assert abs(before_repair['shipEnergyJ']-repaired['shipEnergyJ']-before_repair['workJ'])<15000,repaired
        assert repaired['asset']['state']['launchReady'] is False
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=40000)
        restored=page.evaluate("""id => {
          const a=StarfallRuntime.physical8a.get(id),m=StarfallRuntime.materials8a.snapshot();
          return{condition:a.condition,repairs:a.state.fieldRepairs8g?.length,
            scrap:m.lots.some(x=>x.id==='scrap:repair8g:'+id+':1'),
            truck:StarfallRuntime.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
        }""",rocket['id'])
        assert abs(restored['condition']-.78)<.0001 and restored['repairs']==1,restored
        assert restored['scrap'] and restored['truck']==1,restored
        assert not errors,errors
        # Supply exactly accounted gases and water to the physically built
        # habitat. This fixture is isolated and never available to players.
        before_charge=page.evaluate("""id => {
          const rt=StarfallRuntime,p=rt.physical8a.serialize(),
            m=rt.materials8a.snapshot(),requirements=StarfallHabitatCharge8G.requirements();
          for(const [materialId,massKg] of Object.entries(requirements)){
            m.lots.push({id:'hab-charge-fixture:'+materialId,materialId,massKg,
              volumeM3:massKg/1000,grade:1,containerId:StarfallMining8D.SHIP,
              provenance:'TEST_FIXTURE_ONLY_NO_FREE_PRODUCTION'});
          }
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return{assetId:id,required:requirements,
            total:p.assets.reduce((s,x)=>s+x.massKg,0)+m.lots.reduce((s,x)=>s+x.massKg,0),
            assetMass:p.assets.find(x=>x.id===id).massKg};
        }""",habitat['id'])
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.eva && !!document.getElementById("habitat-charge8g")',timeout=40000)
        page.evaluate("""id => STARFALL_DEBUG.placeEvaNearRepairAsset8G(id)""",habitat['id'])
        quote=page.evaluate("""id => StarfallRuntime.habitatChargeQuote8G(id)""",habitat['id'])
        assert quote['ready'] and quote['powered'],quote
        assert quote['estimatedPressureKPa']>95 and quote['oxygenPartialKPa']>20,quote
        # UI22 visible mission workflow; all original scenario assertions remain.
        page.locator('#sf-mission-button').click()
        page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
        page.locator('#sf-mission-flow .sf-flow-workspace').click()
        charge_panel=page.locator('#habitat-charge8g')
        charge_panel.locator('select[aria-label="Select physical habitat envelope to charge"]').select_option(habitat['id'])
        button=charge_panel.get_by_role('button',name='INSTALL FINITE AIR & WATER')
        assert button.is_enabled(),'T09 charge action disabled despite physical consumables'
        button.click()
        page.wait_for_function("""id => !!StarfallRuntime.physical8a.get(id)?.state?.habitatCharge8g""",
          arg=habitat['id'],timeout=15000)
        charged=page.evaluate("""id => {
          const rt=StarfallRuntime,a=rt.physical8a.get(id),
            m=rt.materials8a.snapshot(),p=rt.physical8a.serialize();
          const item={kind:'hab',id:a.id,bodyId:a.location.bodyId,enabled:false,
            condition:a.condition,habT09:a.state.habT09};
          const t09=StarfallHabitatT09.inspect(item,null,false);
          return{asset:a,pressure:t09,spares:m.lots.filter(l=>l.id.startsWith('hab-charge-fixture:')),
            total:p.assets.reduce((s,x)=>s+x.massKg,0)+m.lots.reduce((s,x)=>s+x.massKg,0),
            originalTruck:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
        }""",habitat['id'])
        assert charged['originalTruck']==1 and len(charged['spares'])==0,charged
        assert abs(charged['total']-before_charge['total'])<1e-6,charged
        assert abs(charged['asset']['massKg']-before_charge['assetMass']-
          sum(before_charge['required'].values()))<1e-6,charged
        assert 95<charged['pressure']['pressureKPa']<105 and 20<charged['pressure']['oxygenKPa']<22
        assert not charged['asset']['state']['habitable'] and not charged['pressure']['serviceReady']
        assert charged['asset']['state']['habT09']['oxygenTankMol']==0
        assert charged['asset']['state']['habT09']['inertTankMol']==0
        assert charged['asset']['state']['habT09']['scrubberCapacityMol']==0
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=40000)
        saved_charge=page.evaluate("""id => {
          const a=StarfallRuntime.physical8a.get(id);
          return{massKg:a.massKg,charged:!!a.state.habitatCharge8g,
            pressurePa:a.state.pressurePa,oxygenKg:a.state.oxygenKg,waterKg:a.state.waterKg,
            habitable:a.state.habitable};
        }""",habitat['id'])
        assert saved_charge['charged'] and saved_charge['pressurePa']>95000
        assert not saved_charge['habitable']
        assert abs(saved_charge['massKg']-charged['asset']['massKg'])<1e-6
        assert not errors,errors
        print('PASS 8G Chromium: finite T09 oxygen/nitrogen/water charged into built habitat, mass conserved, unsafe life-support state and source stock preserved on reload')
    finally:
        browser.close()
