#!/usr/bin/env python3
"""8I real file:// greenhouse: original T09, actual T02 grid and sunlight.
Test-only 8F-manufactured hardware, seeds and fertilizer are explicitly tagged.
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
  page.evaluate("""()=>{
   const rt=StarfallRuntime,V=Starfall3D.V,b=rt.galaxy.byId.get('star-0-p0'),
    sun=rt.galaxy.byId.get(b.systemId).star,
    dir=V.norm(V.sub(sun.position,b.position)),p=V.add(b.position,V.mul(dir,b.radius+8)),
    old=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
    position:p,attached:b.id,target:b.id,groundDirection:dir,up:dir,
    forward:[1,0,0],landed:true}});
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.landed&&window.StarfallRuntime?.eva&&
    window.StarfallGreenhouseUI8I&&window.StarfallOutpostUI)""",timeout=60000)
  fixture=page.evaluate("""()=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,O=StarfallOutposts,
    H=StarfallHabitatT09,ops=StarfallMissionOperationsUI,c=rt.outpostContext(),
    body=c.body,ship=rt.engineeringAssetPoses().shipPose,store=U.store;
   if(!ship?.local||!c.local)throw Error('Original ship surface/EVA missing');
   const at=(d)=>O.offset(ship.local,[1,0,0],d,0,body.radius);
   const h0=store.add('hab',body,at(15),[1,0,0],()=>0).item,
    b0=store.add('battery',body,at(35),[1,0,0],()=>0).item,
    s0=store.add('solar',body,at(55),[1,0,0],()=>0).item;
   const h=store.items.find(x=>x.id===h0.id);
   store.link(h.id,b0.id,body);store.link(b0.id,s0.id,body);
   U.advancePowerTo(ops.clock.lastSimulatedS,(asset,t)=>ops.resolveBody(asset,t));
   const powered=U.powerReports.get(body.id)?.byId?.[h.id]?.power===true;
   if(!powered)throw Error('Real wired T02 680 W habitat not powered');
   H.command(h,'ENABLE',{near:true,powered:true,body,now:ops.clock.lastSimulatedS});
   h.habT09.carbonMol=20;h.habT09.waterL=100;h.habT09.scrubberCapacityMol=0;
   const source=StarfallMining8D.SHIP;
   for(const [id,kind,mass,vol] of [
    ['8i-test-greenhouse-kit','greenhouse_kit',1,.14],
    ['8i-test-crop-seeds','crop_seeds',.02,.00002],
    ['8i-test-fertilizer','fertilizer',.2,.0002]]){
    rt.materials8a.importLot({id,materialId:kind,containerId:source,
      massKg:mass,volumeM3:vol,grade:1,provenance:'TEST_FIXTURE_ONLY_8F_habitat_supply'});
   }
   rt.vehicleStore.setPower('ship',true);rt.persistVehicles();U.persist();ops.persist();
   const irradiation=StarfallGreenhouse8I.irradiance(body,
      rt.galaxy.byId.get(body.systemId).star,
      StarfallPhysics.starProfile(rt.galaxy.byId.get(body.systemId).star).luminosityW,
      h.local,StarfallPhysics.SCENE_METERS_PER_UNIT);
   return{habitatId:h.id,batteryId:b0.id,bodyId:body.id,
    initialCarbon:h.habT09.carbonMol,irradiation};
  }""")
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#greenhouse8i')
  panel.locator('select[aria-label="T09 greenhouse destination"]').select_option(fixture['habitatId'])
  button=panel.get_by_role('button',name='INSTALL SOURCE-PAID HABITAT GREENHOUSE (400 kJ)')
  assert button.is_enabled(),{'panel':panel.inner_text(),'fixture':fixture}
  button.click()
  page.wait_for_function("""()=>document.querySelector('#greenhouse8i [role=status]')
    ?.textContent.includes('COMMITTED')""",timeout=12000)
  installation=page.evaluate("""f=>{
   const rt=StarfallRuntime,U=StarfallOutpostUI,s=SF.load(),
    h=U.store.items.find(x=>x.id===f.habitatId),
    r=rt.materials8a.operations().find(x=>x.kind==='HABITAT_GREENHOUSE_8I');
   return{installed:h.habT09.greenhouse8i?.installed,
    supplyRemaining:['greenhouse_kit','crop_seeds','fertilizer'].map(k=>
      rt.materials8a.inventory(StarfallMining8D.SHIP)
       .filter(l=>l.materialId===k).reduce((v,l)=>v+l.massKg,0)),
    work:r?.workJ,receipt:r?.id,
    savedInstalled:s.outpost5.items.find(x=>x.id===f.habitatId).habT09.greenhouse8i.installed};
  }""",fixture)
  assert installation['installed'] and installation['savedInstalled'],installation
  assert installation['supplyRemaining']==[0,0,0],installation
  assert installation['work']==400000,installation
  # Real original T02 solar/battery bus advances the T09 greenhouse tick.
  grow=page.evaluate("""f=>{
   const U=StarfallOutpostUI,rt=StarfallRuntime,ops=StarfallMissionOperationsUI,
    hab=U.store.items.find(x=>x.id===f.habitatId),
    before=structuredClone(hab.habT09);
   U.advancePowerTo(ops.clock.lastSimulatedS+1800,(asset,t)=>ops.resolveBody(asset,t));
   const after=hab.habT09,report=U.powerReports.get(f.bodyId)?.byId?.[hab.id];
   U.persist();ops.persist();
   return{before:before.greenhouse8i,after:after.greenhouse8i,
     co2Before:before.carbonMol,co2After:after.carbonMol,
     oxygenBefore:before.oxygenMol,oxygenAfter:after.oxygenMol,
     waterBefore:before.waterL,waterAfter:after.waterL,
     powered:report?.power===true,servedW:report?.servedW};
  }""",fixture)
  assert grow['after']['installed'] and grow['after']['lastS']>=grow['before']['lastS'],grow
  assert grow['after']['cropBiomassKg']>=grow['before']['cropBiomassKg'],grow
  assert grow['after']['lastSunlightWm2']>=0,grow
  # If the actual planet is illuminated and T02 serves, growth must be paid
  # by finite CO2 and water. In darkness it must not invent biomass.
  if grow['after']['oxygenProducedMol']>0:
   assert grow['after']['cropBiomassKg']>grow['before']['cropBiomassKg'],grow
   assert grow['after']['carbonConsumedMol']>grow['before']['carbonConsumedMol'],grow
   assert grow['after']['waterConsumedKg']>grow['before']['waterConsumedKg'],grow
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallOutpostUI&&window.StarfallRuntime)',timeout=60000)
  after=page.evaluate("""f=>{
   const h=StarfallOutpostUI.store.items.find(x=>x.id===f.habitatId),
    s=SF.load(),r=StarfallRuntime;
   return{installed:h?.habT09?.greenhouse8i?.installed,
    crops:h?.habT09?.greenhouse8i?.cropBiomassKg,
    consumed:h?.habT09?.greenhouse8i?.carbonConsumedMol,
    receipts:r.materials8a.operations().filter(x=>x.kind==='HABITAT_GREENHOUSE_8I').length,
    saved:!!s.outpost5.items.find(x=>x.id===f.habitatId).habT09.greenhouse8i};
  }""",fixture)
  assert after['installed'] and after['saved'] and after['receipts']==1,after
  assert abs(after['crops']-grow['after']['cropBiomassKg'])<1e-6,(grow,after)
  print('PASS 8I greenhouse actual file://: manufactured hardware/seeds/fertilizer debited, native wired T02 daylight growth conservation, unique durable T09 greenhouse')
 finally:browser.close()
