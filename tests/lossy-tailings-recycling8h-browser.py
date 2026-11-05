#!/usr/bin/env python3
"""8H: REAL offline Chromium STARFALL Engineering UI retains true stock:
new lossy recycling cannot start from empty ship or fake source documents.
This is a UI precondition test, not proof of an unbroken mined expedition.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
   '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':800})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime?.refineryQuote8E && window.StarfallRefinery8E && document.querySelector('#refinery8e-panel'))",timeout=60000)
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  panel=page.locator('#refinery8e-panel')
  assert panel.is_visible(),'Original Engineer refinery console must remain available offline'
  q=page.evaluate("""()=>{
   const rt=StarfallRuntime,oreBefore=JSON.stringify(rt.materials8a.snapshot()),
    energyBefore=rt.vehicleStore.get('ship').state.energyJ,
    saveBefore=JSON.stringify(SF.load()),
    physical=rt.physical8a.list(),modes=Object.keys(StarfallRefinery8E.MODES);
   const attempts={};
   for(const mode of ['iron_tailings_reclaim','copper_tailings_reclaim']){
     try{rt.refineryQuote8E(mode);attempts[mode]='UNSAFE_FREE_RECYCLE';}
     catch(e){attempts[mode]=String(e.message||e);}
   }
   return{seed:rt.galaxy.seed,trucks:physical.filter(x=>x.type==='truck').length,
    modes,attempts,
    oreSame:oreBefore===JSON.stringify(rt.materials8a.snapshot()),
    chargeSame:energyBefore===rt.vehicleStore.get('ship').state.energyJ,
    saveSame:saveBefore===JSON.stringify(SF.load())};
  }""")
  assert q['seed']==742 and q['trucks']==1,q
  for mode in ('iron_tailings_reclaim','copper_tailings_reclaim'):
   assert mode in q['modes'] and q['attempts'][mode]!='UNSAFE_FREE_RECYCLE',q
  opts=panel.locator('select[aria-label="Select actual material processing operation"]')
  assert opts.locator('option[value="iron_tailings_reclaim"]').count()==1
  assert opts.locator('option[value="copper_tailings_reclaim"]').count()==1
  opts.select_option('iron_tailings_reclaim')
  page.wait_for_function("""()=>{
   const p=document.querySelector('#refinery8e-panel');
   return p&&p.querySelector('select')?.value==='iron_tailings_reclaim'&&
    [...p.querySelectorAll('button')].some(b=>b.textContent.includes('START PROCESSING')&&b.disabled);
  }""",timeout=15000)
  assert q['oreSame'] and q['chargeSame'] and q['saveSame'],q
  assert not errors,errors
  print('PASS 8H ORIGINAL real Chromium file:// seed742 Engineer: both actual recycled-tailings modes listed; no free lot, ship battery or save mutation; missing original receipt prevents unsupported recycling')
 finally:
  browser.close()
