#!/usr/bin/env python3
"""8J real file:// browser acceptance: physical feasibility is strictly read-only.

No test claims planetary terraforming, imported gas, climate changes, or
rendered haze. The UI must show canonical mass budgets and a locked actuator.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':860})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.galaxy
    &&window.StarfallTerraform8J?.feasibility&&window.StarfallTerraformFeasibilityUI8J)""",timeout=60000)
  baseline=page.evaluate("""()=>{
   const r=StarfallRuntime,b=r.outpostContext().body,
    old=SF.load(),physical=r.materials8a.snapshot();
   return{world:b.id,physical,worldEntry:old.terraform8j||null};
  }""")
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#terraform-feasibility8j')
  target=panel.locator('input[aria-label="Hypothetical target mean surface pressure in kPa"]')
  target.fill('200')
  target.dispatch_event('input')
  view=panel.locator(':scope > pre').inner_text()
  assert baseline['world'] in view and 'MODEL RADIUS' in view,view
  assert 'NET IMPORT FOR TARGET:' in view and 'REAL INDUSTRIAL ACTION: LOCKED / NOT IMPLEMENTED' in view,view
  assert 'Planning only' in view and 'no 8A gas lots' in view,view
  proof=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.outpostContext().body,P=StarfallPhysics,
    s=rt.galaxy.byId.get(b.systemId),p=P.bodyProfile(b,P.starProfile(s.star)),
    q=StarfallTerraform8J.feasibility(p,{targetPressurePa:200000,
      externalImportKgS:1,nativeLife:true});
   const unchanged=rt.materials8a.snapshot(),saved=SF.load();
   return{modelMassKg:q.requiredImportKg,
    theoreticalKg:Math.max(0,(200000-p.atmospherePressurePa))*4*Math.PI*p.radiusM**2/p.surfaceGravityMS2,
    locked:q.globalActionPermitted===false,material:unchanged,worldEntry:saved.terraform8j||null};
  }""")
  assert proof['locked'] and proof['modelMassKg']>0,proof
  assert abs(proof['modelMassKg']-proof['theoreticalKg'])<max(1,proof['modelMassKg']*1e-10),proof
  assert proof['material']==baseline['physical'],proof
  assert proof['worldEntry']==baseline['worldEntry'],proof
  assert not errors,errors
  print('PASS 8J file:// Chromium: real canonical world pressure/mass feasibility, real Mission Engineer controls, global intervention locked, zero inventory/world mutation')
 finally:
  browser.close()
