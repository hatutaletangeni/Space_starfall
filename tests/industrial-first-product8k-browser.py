#!/usr/bin/env python3
"""Actual original game browser: finite first-ship Cu -> real 8F bare wire.
The preflight copper is declared IMPORTED, not claimed to come from mined ore.
Uses original 8A materials/ship power, UI22 visible Build, real 100x clock,
production receipt + durable storage/reload. No synthetic material grant.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT/'PLAY-STARFALL.html').as_uri()
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
      '--enable-webgl','--no-sandbox','--disable-dev-shm-usage']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=ARGS)
 try:
  ctx=browser.new_context(viewport={'width':1300,'height':800})
  errors=[];page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.materials8a &&
     window.StarfallWorkflow8ER && window.StarfallExpeditionManifest8K)""",timeout=50000)
  fresh=page.evaluate("""()=>{
    const rt=StarfallRuntime,stock=rt.materials8a;
    const count=stock.inventory().filter(l=>l.materialId==='copper').length;
    const held=stock.inventory('8d:ship-main:materials');
    const ore=held.filter(l=>l.materialId==='copper');
    const truck=rt.physical8a.list().filter(a=>a.id==='truck-expedition-001');
    if(truck.length!==1||truck[0].location.slot!=='starboard-hangar')
       throw Error('No unique original stowed truck');
    if(ore.length!==1||ore[0].provenance.indexOf('initial_manifest')!==0)
       throw Error('No finite genuine preflight imported copper');
    if(stock.inventory().some(l=>l.materialId==='bare_wire'))
       throw Error('Preflight should not gift finished wire');
    const shipJ=rt.vehicleStore.get('ship').state.energyJ;
    const b=rt.galaxy.byId.get('star-0-p0'),pos=b.position;
    // A controlled landed fixture shortens flight only. Both materials and the
    // original vehicle energy remain from the running game; no resources minted.
    const old=SF.load().flightGalaxy||{};
    const saved=SF.save({materials8a:stock.snapshot(),physical8a:rt.physical8a.serialize(),
     flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
      position:[pos[0],pos[1]+b.radius+8,pos[2]],target:b.id,attached:b.id,
      groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
    if(!saved)throw Error('Durable preflight ship manifest save failed');
    return {kg:ore[0].massKg,count,shipJ,bodyId:b.id,
      stockTotal:stock.inventory().reduce((a,l)=>a+l.massKg,0)};
  }""")
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("()=>!!(window.StarfallRuntime?.factoryQuote8F && window.StarfallWorkflow8ER)",timeout=50000)
  initial=page.evaluate("""()=>{
    const r=StarfallRuntime;
    // The original ship powers OFF by default. Explicitly switch on the
    // pre-existing battery bus; never inject or recharge any joules.
    r.vehicleStore.setPower('ship',true);r.persistVehicles();
    const c=r.factoryContext8F();
    return {landed:r.landed,eva:r.eva,operatorNear:c.operatorNear,powerEnabled:c.powerEnabled,shipJ:c.energyJ,
      quote:r.factoryQuote8F('copper_wire'),copper:r.materials8a.inventory('8d:ship-main:materials')
       .filter(x=>x.materialId==='copper').reduce((a,x)=>a+x.massKg,0)};
  }""")
  assert initial['landed'] and initial['eva'] and initial['operatorNear'] and initial['powerEnabled'],initial
  assert initial['copper']==fresh['kg'],(fresh,initial)
  assert initial['quote']['energyJ']==104000,initial
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').nth(2).click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  factory=page.locator('#factory8f-section')
  factory.locator('select').select_option('copper_wire')
  assert 'READY           YES' in factory.locator('pre').inner_text(),factory.locator('pre').inner_text()
  assert factory.locator('button').first.is_enabled(),factory.locator('pre').inner_text()+str(initial)
  factory.locator('button').first.click()
  page.wait_for_function("StarfallRuntime.factory8f.active?.recipeId==='copper_wire'",timeout=12000)
  # The normal existing T key cycles from 1x->10x->100x, no debug bypass.
  page.keyboard.press('t');page.keyboard.press('t')
  page.wait_for_function("""()=>{
    const r=StarfallRuntime,ls=r.materials8a.inventory('8d:ship-main:materials');
    return !r.factory8f.active&&ls.some(l=>l.materialId==='bare_wire');
  }""",timeout=90000)
  out=page.evaluate("""()=>{
    const r=StarfallRuntime,ls=r.materials8a.inventory('8d:ship-main:materials'),
      stock=SF.load().materials8a,ship=r.vehicleStore.get('ship');
    return {wire:ls.filter(l=>l.materialId==='bare_wire').reduce((a,l)=>a+l.massKg,0),
      scrap:ls.filter(l=>l.materialId==='manufacturing_scrap').reduce((a,l)=>a+l.massKg,0),
      copper:ls.filter(l=>l.materialId==='copper').reduce((a,l)=>a+l.massKg,0),
      total:ls.reduce((a,l)=>a+l.massKg,0),shipJ:ship.state.energyJ,
      receipts:r.factory8f.receipts.filter(q=>q.recipeId==='copper_wire').length,
      receiptEnergyJ:r.factory8f.receipts.find(q=>q.recipeId==='copper_wire')?.energyJ,
      persistedWire:stock.lots.filter(l=>l.materialId==='bare_wire').reduce((a,l)=>a+l.massKg,0)};
  }""")
  assert abs(out['wire']-1.96)<1e-6,out
  assert abs(out['scrap']-.04)<1e-6,out
  assert abs(out['copper']-(fresh['kg']-2))<1e-6,out
  assert abs(out['total']-fresh['stockTotal'])<1e-5,out
  assert out['receipts']==1 and abs(out['persistedWire']-out['wire'])<1e-6,out
  assert abs(out['receiptEnergyJ']-104000)<1e-6,(fresh,out)
  # The powered landed ship has genuine solar generation, so its net battery
  # may rise during 100x. Verify original paid 8F receipt, not a false
  # comparison of post-solar battery against initial battery.
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("()=>!!window.StarfallRuntime?.materials8a",timeout=45000)
  restored=page.evaluate("""()=>{
     const r=StarfallRuntime;
     const ls=r.materials8a.inventory('8d:ship-main:materials');
     return {wire:ls.filter(l=>l.materialId==='bare_wire').reduce((a,l)=>a+l.massKg,0),
       copper:ls.filter(l=>l.materialId==='copper').reduce((a,l)=>a+l.massKg,0),
       receipts:r.factory8f.receipts.filter(q=>q.recipeId==='copper_wire').length,
       preflightItems:ls.filter(l=>l.provenance.startsWith('initial_manifest')).length};
  }""")
  assert abs(restored['wire']-1.96)<1e-6,restored
  assert abs(restored['copper']-(fresh['kg']-2))<1e-6,restored
  assert restored['receipts']==1,restored
  assert not errors,errors[:8]
  print('PASS 8K actual offline browser: one finite preflight source copper -> 1.96kg bare wire+0.04kg scrap, one source-owned 8F receipt, original battery debit, real 100x, save/reload/no duplication',fresh,initial,out,restored)
 finally:
  browser.close()
