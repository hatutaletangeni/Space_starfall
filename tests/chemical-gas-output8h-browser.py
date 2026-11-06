#!/usr/bin/env python3
"""STARFALL 8H: actual ORIGINAL file:// Chromium/WebGL2 Engineer UI.
No fake gas/energy/truck/ship fixtures. Timed actual pipe movement tested
with separate original 8A + 420W source-owner Node transaction fixtures.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from mission_ui22_navigation import open_mission_route
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
  page.wait_for_function("""()=>!!(
   window.StarfallRuntime?.industrialGasOutputNativeTick8H &&
   window.StarfallChemicalGasOutput8H?.create &&
   window.StarfallOutpostUI?.durableSnapshot &&
   document.getElementById('industrial8e-physical')
  )""",timeout=60000)
  q=page.evaluate("""()=>{
   const rt=StarfallRuntime,gas=StarfallChemicalGasOutput8H;
   const before={m:JSON.stringify(rt.materials8a.snapshot()),
    p:JSON.stringify(rt.physical8a.serialize()),
    n:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    saved:JSON.stringify(SF.load()),
    battery:rt.vehicleStore.get('ship').state.energyJ};
   const empty=gas.create().snapshot();
   let denied;
   try{gas.create().prepare({
    receipt:{id:'forged',status:'COMMITTED',outputs:{hydrogen:.2}},
    materials8a:rt.materials8a.snapshot(),physical8a:rt.physical8a.serialize(),
    gasManifolds:{},bodyId:'star-0-p0',bodyRadius:1000,timeS:0
   });denied=false;}catch(e){denied=true;}
   const after={m:JSON.stringify(rt.materials8a.snapshot()),
    p:JSON.stringify(rt.physical8a.serialize()),
    n:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    saved:JSON.stringify(SF.load()),
    battery:rt.vehicleStore.get('ship').state.energyJ};
   return{seed:rt.galaxy.seed,ship:rt.physical8a.get('ship-main')?.id,
     trucks:rt.physical8a.list().filter(x=>x.type==='truck').length,
     gasJobs:rt.chemicalGasOutput8h,empty,denied,
     noMutation:JSON.stringify(before)===JSON.stringify(after)};
  }""")
  assert q['seed']==742 and q['ship']=='ship-main' and q['trucks']==1,q
  assert q['gasJobs']['schema']==1 and isinstance(q['gasJobs']['jobs'],list),q
  assert q['empty']=={'schema':1,'jobs':[]},q
  assert q['denied'] and q['noMutation'],q
  open_mission_route(page, "Engineer")
  panel=page.locator('#industrial8e-physical')
  assert panel.is_visible(),'Original Engineer Chemical Plant panel must be visible'
  text=panel.inner_text()
  assert '80 L' in text and '420 W' in text,text
  page.wait_for_function("""()=>{
   const t=document.querySelector('#industrial8e-physical')?.innerText||'';
   return t.includes('ACTUAL 8A PRODUCT GAS TRANSIT')&&
     t.includes('INBOUND ORIGINAL 8A GAS')&&
     t.includes('REACTOR MAY USE GAS ONLY WHEN ALL ORIGINAL PHYSICAL INLET JOBS ARE READY');
  }""",timeout=15000)
  assert not errors,errors
  print('PASS real original STARFALL file:// WebGL2 seed742: physical 80L outbound and inbound gas transit Engineer, unchanged ship/truck/source-owned 8A/T02/saves, no forged gas, reactor READY inlet gating')
 finally:
  browser.close()
