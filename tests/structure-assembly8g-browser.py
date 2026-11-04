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
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
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
        print('PASS 8G Chromium: paid dry rocket + unpressurized habitat physically built, mass conserved, original vehicles retained, save/reload without duplicates')
        # TEST PROFILE ONLY: damage an existing physical stage and stage 8F
        # replacement lots in its REAL 8A cargo container; no production seeds.
        damaged=page.evaluate("""assetId => {
          const rt=StarfallRuntime,p=rt.physical8a.serialize(),m=rt.materials8a.snapshot(),
            a=p.assets.find(x=>x.id===assetId),spec=StarfallStructureRepair8G.SPECS[a.type];
          a.condition=.4;
          let i=0;for(const [materialId,massKg] of Object.entries(spec.parts))
            m.lots.push({id:'repair-browser-test:'+(++i),materialId,massKg,
              volumeM3:massKg*.001,grade:1,containerId:StarfallMining8D.SHIP,
              provenance:'TEST_FIXTURE_ONLY_MANUFACTURED_REPLACEMENT'});
          const before=m.lots.reduce((sum,l)=>sum+l.massKg,0)+
            p.assets.reduce((sum,x)=>sum+x.massKg,0);
          SF.save({physical8a:p,materials8a:m});
          window.__STARFALL_IMPORT_PENDING=true;
          return {assetId,oldCondition:a.condition,before,partsMass:
            Object.values(spec.parts).reduce((sum,x)=>sum+x,0)};
        }""",rocket['id'])
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('StarfallRuntime.landed&&StarfallRuntime.eva&&!!document.getElementById("structure-repair8g")',timeout=45000)
        page.evaluate("""id => STARFALL_DEBUG.placeEvaNearDamagedStructure8G(id)""",rocket['id'])
        repairQuote=page.evaluate("""id => StarfallRuntime.structureRepairQuote8G(id)""",rocket['id'])
        assert repairQuote['ready'] and repairQuote['powered'],repairQuote
        page.locator('#ui21-navigation button[data-route="Engineer"]').click()
        repairPanel=page.locator('#structure-repair8g')
        repairPanel.locator('select[aria-label="Select damaged physical rocket or habitat"]').select_option(rocket['id'])
        repairButton=repairPanel.get_by_role('button',name='REPLACE DAMAGED STRUCTURAL HARDWARE')
        assert repairButton.is_enabled()
        batteryStart=page.evaluate("""() => StarfallRuntime.vehicleStore.get('ship').state.energyJ""")
        repairButton.click()
        page.wait_for_function("""id => StarfallRuntime.physical8a.get(id)?.condition>.6""",
          arg=rocket['id'],timeout=15000)
        repaired=page.evaluate("""id => {
          const rt=StarfallRuntime,p=rt.physical8a.serialize(),m=rt.materials8a.snapshot(),
            a=p.assets.find(x=>x.id===id);
          return {condition:a.condition,state:a.state,assetCount:p.assets.filter(x=>x.id===id).length,
            scratch:m.lots.filter(x=>x.id.startsWith('repair-browser-test:')).length,
            scrap:m.lots.filter(x=>x.id.startsWith('repair-scrap:')),
            combinedMass:m.lots.reduce((sum,x)=>sum+x.massKg,0)+
              p.assets.reduce((sum,x)=>sum+x.massKg,0),
            truck:p.assets.filter(x=>x.id==='truck-expedition-001').length,
            battery:rt.vehicleStore.get('ship').state.energyJ};
        }""",rocket['id'])
        assert abs(repaired['condition']-.65)<1e-8,repaired
        assert repaired['state']['launchReady'] is False and repaired['state']['propellantKg']==0
        assert repaired['scratch']==0 and repaired['assetCount']==1 and repaired['truck']==1
        assert len(repaired['scrap'])==1 and abs(repaired['scrap'][0]['massKg']-damaged['partsMass'])<1e-6
        assert abs(repaired['combinedMass']-damaged['before'])<1e-6,'Repair created or destroyed matter'
        assert abs(batteryStart-repaired['battery']-1250000)<15000,'Repair electricity not debited'
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!StarfallRuntime?.physical8a',timeout=40000)
        storedRepair=page.evaluate("""id => {
          const rt=StarfallRuntime,a=rt.physical8a.get(id);
          return {condition:a.condition,receipts:a.state.repairReceipts.length,
            salvage:rt.materials8a.snapshot().lots.filter(x=>x.id.startsWith('repair-scrap:')).length};
        }""",rocket['id'])
        assert abs(storedRepair['condition']-.65)<1e-8 and storedRepair['receipts']==1 and storedRepair['salvage']==1,storedRepair
        assert not errors,errors
        print('PASS 8G Chromium: real paid EVA structure repair, replacement-parts debit, conserved 8A salvage, no launch flag, persisted original asset')
    finally:
        browser.close()
