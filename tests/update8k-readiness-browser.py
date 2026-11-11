#!/usr/bin/env python3
"""Actual offline desktop/mobile UI, finite revised manifest and drill service.

CONTROLLED NAVIGATION/WEAR FIXTURE: restore the original ship/truck on a real
seed-742 world and mark its existing drill worn. No material, machine, vehicle,
energy or manufacturing receipt is injected. This is NOT a piloted expedition,
real phone/GPU benchmark, or upstream manufacturing certification.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'8k-readiness-browser';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  for edition,name,width,height in [('desktop','PLAY-STARFALL.html',1280,860),
                                     ('mobile','PLAY-STARFALL-MOBILE.html',932,430)]:
   context=browser.new_context(viewport={'width':width,'height':height},has_touch=edition=='mobile')
   page=context.new_page();errors=[];network=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda q:network.append(q.url) if q.url.startswith(('http://','https://')) else None)
   page.goto((ROOT/name).as_uri(),wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('!!window.StarfallRuntime?.materials8a',timeout=60000)
   page.evaluate('SF.startNewExpedition(742);window.__STARFALL_IMPORT_PENDING=true')
   page.reload(wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('!!SF.load().initialIndustrialManifest8k',timeout=60000)
   manifest=page.evaluate("""()=>{
    const r=StarfallRuntime,s=SF.load(),lots=r.materials8a.inventory(StarfallMining8D.SHIP);
    if(!lots.some(l=>l.materialId==='plant_kit_reduction_furnace')||
       !lots.some(l=>l.materialId==='vessel_kit_carbon_monoxide')||
       !lots.some(l=>l.materialId==='plant_kit_pressure_pipeline')||
       !lots.some(l=>l.materialId==='machine_kit_cnc'))throw Error('Missing sealed bootstrap kit');
    if(r.physical8a.list().some(a=>a.type==='industrial_machine'||a.type==='industrial_plant'))
     throw Error('Manifest kits must NOT already be installed');
    return{mass:r.materials8a.used(StarfallMining8D.SHIP).massKg,
     volume:r.materials8a.used(StarfallMining8D.SHIP).volumeM3,
     version:s.initialIndustrialManifest8k.manifestVersion,
     heads:lots.filter(l=>l.materialId==='drill_head').reduce((n,l)=>n+l.massKg,0)};
   }""")
   assert manifest['version']==2 and manifest['mass']<9000 and manifest['volume']<16,manifest
   assert manifest['heads']==4,manifest
   page.evaluate("""()=>{
    const r=StarfallRuntime,s=SF.load(),b=r.galaxy.byId.get('star-0-p0'),p=b.position,
      physical=r.physical8a.serialize(),truck=physical.assets.find(a=>a.id==='truck-expedition-001'),
      local=[Math.sin(40/b.radius),Math.cos(40/b.radius),0],mining=r.mining8d.snapshot();
    if(!b.landable)throw Error('Controlled real world is not landable');
    truck.location={kind:'surface',bodyId:b.id,local};
    mining.toolCondition=.05; // Explicit wear fixture; never manufacture resources.
    SF.save({physical8a:physical,mining8d:mining,
     assistedTruckRecovery8b:{id:'TEST_FIXTURE_SKIP_MOBILE_ASSISTED_RECOVERY'},
     flightGalaxy:{...s.flightGalaxy,seed:r.galaxy.seed,time:0,
      position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,
      groundDirection:[0,1,0],up:[0,1,0],forward:[1,0,0],landed:true,
      shipCargo8b:{schema:1,mode:'ground',counter:0},
      truckPose:{bodyId:b.id,local,forward:[1,0,0],batteryJ:truck.state.batteryJ,cargo:0}}});
    window.__STARFALL_IMPORT_PENDING=true;
   }""")
   page.reload(wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('!!(window.StarfallRuntime?.landed&&window.StarfallRuntime?.eva)',timeout=60000)
   page.evaluate('STARFALL_DEBUG.placeEvaNearTruck()')
   before=page.evaluate("""()=>({ctx:StarfallRuntime.miningContext8D(),
     mass:StarfallRuntime.materials8a.inventory().reduce((n,l)=>n+l.massKg,0)})""")
   assert before['ctx']['truckNearShip'] and before['ctx']['operatorNear'],before
   page.locator('#sf-mission-button').click()
   page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Operate').click()
   page.locator('#sf-mission-flow .sf-flow-workspace').click()
   panel=page.locator('#mining8d-panel');button=panel.get_by_role('button',name='REPLACE DRILL HEAD / 60 S')
   assert button.is_enabled(),panel.inner_text()
   page.screenshot(path=str(OUT/(edition+'-drill-service.png')))
   button.click()
   page.keyboard.press('t');page.keyboard.press('t')
   page.wait_for_function("""()=>StarfallRuntime.mining8d.snapshot().history.some(h=>
    h.type==='SERVICE'&&h.status==='COMMITTED')""",timeout=60000)
   after=page.evaluate("""()=>{
    const r=StarfallRuntime,lots=r.materials8a.inventory();
    return{condition:r.mining8d.toolCondition,headKg:lots.filter(l=>l.materialId==='drill_head').reduce((n,l)=>n+l.massKg,0),
     scrapKg:lots.filter(l=>l.provenance.startsWith('retired-drill-head:')).reduce((n,l)=>n+l.massKg,0),
     mass:lots.reduce((n,l)=>n+l.massKg,0),energy:r.miningContext8D().energyJ,
     receipts:r.materials8a.operations().filter(o=>o.kind==='DRILL_SERVICE_8D').length,
     trucks:r.physical8a.list().filter(a=>a.type==='truck').length};
   }""")
   assert after['condition']==1 and after['headKg']==2 and after['scrapKg']==2,after
   assert abs(after['mass']-before['mass'])<1e-6,after
   assert abs(before['ctx']['energyJ']-after['energy']-120000)<1e-5,after
   assert after['receipts']==1 and after['trucks']==1,after
   expect(button).to_be_disabled(timeout=5000)
   page.evaluate('window.__STARFALL_IMPORT_PENDING=true')
   page.reload(wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('!!window.StarfallRuntime?.mining8d',timeout=60000)
   assert page.evaluate('StarfallRuntime.mining8d.toolCondition')==1
   assert page.evaluate("StarfallRuntime.materials8a.operations().filter(o=>o.kind==='DRILL_SERVICE_8D').length")==1
   assert not errors,errors
   assert not network,network
   print('PASS '+edition+': finite source manifest, original truck, actual touch/click service, KeyT 100x, 120kJ, 2kg head->scrap, offline reload. Controlled navigation/wear fixture; software WebGL.')
   context.close()
 finally:browser.close()
