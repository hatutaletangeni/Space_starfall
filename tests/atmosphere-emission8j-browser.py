#!/usr/bin/env python3
"""8J real file:// refusal of non-industrial gas fixture on a sterile world.
Fixture gas and infrastructure are explicitly TEST_FIXTURE_ONLY and may never be industrially vented.
This is a negative safety test, NOT a successful no-cheat emission playthrough.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1300,'height':900})
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!StarfallRuntime?.galaxy',timeout=60000)
  selected=page.evaluate("""()=>{
   const rt=StarfallRuntime;
   const b=[...rt.galaxy.byId.values()].find(x=>x.landable&&x.kind==='planet'&&
    (!x.life||x.life==='none'||x.life==='None')&&
    !x.sites?.some(s=>/ruin|artifact|ancient|archaeolog/i.test(String(s.type||s.name||''))));
   if(!b)throw Error('No sterile landable world: no protected planet will be used as fixture');
   const p=b.position,previous=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...previous,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
    groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true}});
   return b.id;
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(StarfallRuntime?.landed&&StarfallRuntime?.eva&&StarfallRuntime.atmosphericRelease8J)',timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,ctx=rt.atmosphericContext8J(),
    a=rt.physical8a.serialize(),m=rt.materials8a.snapshot();
   if(ctx.protectedWorld)throw Error('Original world is protected; fixture cannot override it');
   const vesselId='8j-test-inert-vessel',lotId='8j-test-inert-lot',containerId='8j-test-rated-gas';
   a.assets.push({id:vesselId,type:'industrial_vessel',condition:1,massKg:195,volumeM3:3,
    provenance:'TEST_FIXTURE_ONLY_not_production',
    location:{kind:'ship',parentId:'ship-main',slot:'engineering-gas-cradle'},
    state:{materialId:'nitrogen',enabled:true,ratedPressurePa:5000000,containerId}});
   m.containers.push({id:containerId,ownerId:vesselId,kind:'rated-gas',maxMassKg:50,maxVolumeM3:1});
   m.lots.push({id:lotId,containerId,materialId:'nitrogen',massKg:3,volumeM3:.08,grade:1,
    provenance:'TEST_FIXTURE_ONLY_previously_manufactured_N2'});
   rt.vehicleStore.setPower('ship',true);rt.persistVehicles();
   SF.save({physical8a:a,materials8a:m});
   window.__STARFALL_IMPORT_PENDING=true;
   return{vesselId,lotId,containerId,bodyId:ctx.bodyId};
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(StarfallRuntime?.atmosphericContext8J&&window.StarfallAtmosphereEmissionUI8J)',timeout=60000)
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#atmosphere-emission8j')
  panel.locator('select[aria-label="Actual planet atmospheric emission vessel"]').select_option(fixture['vesselId'])
  panel.locator('select[aria-label="Gas lot for planetary emission"]').select_option(fixture['lotId'])
  q=panel.locator('input[aria-label="Gas to release in kg"]');q.fill('1');q.dispatch_event('change')
  button=panel.get_by_role('button',name='VENT SOURCE-PAID GAS TO PLANET')
  assert button.is_enabled(),panel.inner_text()
  before=page.evaluate("""fixture=>{
   const rt=StarfallRuntime,s=SF.load();
   return {
    gasKg:rt.materials8a.inventory(fixture.containerId).find(x=>x.id===fixture.lotId)?.massKg,
    savedGasKg:s.materials8a?.lots.find(x=>x.id===fixture.lotId)?.massKg,
    world:s.terraformWorlds8j?.[fixture.bodyId]||null,
    emissions:rt.materials8a.operations().filter(x=>x.kind==='PLANET_ATMOSPHERE_EMISSION_8J').length
   };
  }""",fixture)
  button.click()
  page.wait_for_timeout(350)
  current=panel.locator('[role=status]').inner_text()
  assert 'BLOCKED' in current and 'pure gas lot' in current,{'status':current,'panel':panel.inner_text()}
  after=page.evaluate("""fixture=>{
   const rt=StarfallRuntime,s=SF.load();
   return {
    gasKg:rt.materials8a.inventory(fixture.containerId).find(x=>x.id===fixture.lotId)?.massKg,
    savedGasKg:s.materials8a?.lots.find(x=>x.id===fixture.lotId)?.massKg,
    world:s.terraformWorlds8j?.[fixture.bodyId]||null,
    emissions:rt.materials8a.operations().filter(x=>x.kind==='PLANET_ATMOSPHERE_EMISSION_8J').length
   };
  }""",fixture)
  assert after==before,{'before':before,'after':after}
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!StarfallRuntime?.atmosphericContext8J',timeout=60000)
  reloaded=page.evaluate("""fixture=>{
   const rt=StarfallRuntime,s=SF.load();
   return {
    gasKg:rt.materials8a.inventory(fixture.containerId).find(x=>x.id===fixture.lotId)?.massKg,
    savedGasKg:s.materials8a?.lots.find(x=>x.id===fixture.lotId)?.massKg,
    world:s.terraformWorlds8j?.[fixture.bodyId]||null,
    emissions:rt.materials8a.operations().filter(x=>x.kind==='PLANET_ATMOSPHERE_EMISSION_8J').length
   };
  }""",fixture)
  assert reloaded==before,{'before':before,'reloaded':reloaded}
  print('PASS 8J file:// Chromium industrial rejection: TEST_FIXTURE_ONLY gas cannot be emitted; inventory, planet pressure and receipts unchanged, including after reload')

 finally:browser.close()
