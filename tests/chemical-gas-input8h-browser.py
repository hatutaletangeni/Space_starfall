#!/usr/bin/env python3
"""Real original seed742 file:// Chromium WebGL2 inbound 8H gas UI.
No generated starter inlet gas/kit/pipes, no developer debug owner mutations.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
game=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':800})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(game,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(
   window.StarfallRuntime?.industrialGasInputNativeTick8H &&
   window.StarfallChemicalGasInput8H?.create &&
   window.StarfallOutpostUI?.durableSnapshot &&
   document.getElementById('industrial8e-physical')
  )""",timeout=65000)
  proof=page.evaluate("""()=>{
   const rt=StarfallRuntime,engine=StarfallChemicalGasInput8H;
   const old={
    m:JSON.stringify(rt.materials8a.snapshot()),
    p:JSON.stringify(rt.physical8a.serialize()),
    out:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    battery:rt.vehicleStore.get('ship').state.energyJ,
    saved:JSON.stringify(SF.load())};
   let denied=false;
   try{
    engine.create().prepare({
     chemicalJobId:'chem8e:fake-inlet',reactionId:'sabatier',scaleMol:1,
     stationId:'not-made-station',materials8a:rt.materials8a.snapshot(),
     physical8a:rt.physical8a.serialize(),
     gasManifolds:{},outpost5:StarfallOutpostUI.durableSnapshot(),
     powerReport:null,bodyId:'star-0-p0',bodyRadius:1000,timeS:0
    });
   }catch(e){denied=true;}
   const now={
    m:JSON.stringify(rt.materials8a.snapshot()),
    p:JSON.stringify(rt.physical8a.serialize()),
    out:JSON.stringify(StarfallOutpostUI.durableSnapshot()),
    battery:rt.vehicleStore.get('ship').state.energyJ,
    saved:JSON.stringify(SF.load())};
   return{
    seed:rt.galaxy.seed,
    ship:rt.physical8a.get('ship-main')?.id,
    trucks:rt.physical8a.list().filter(x=>x.type==='truck').length,
    state:rt.chemicalGasInput8h,denied,
    unchanged:JSON.stringify(old)===JSON.stringify(now)};
  }""")
  assert proof['seed']==742 and proof['ship']=='ship-main' and proof['trucks']==1,proof
  assert proof['state']['schema']==1 and isinstance(proof['state']['jobs'],list),proof
  assert proof['denied'] and proof['unchanged'],proof
  # UI22: navigate through visible Mission workspace; keep all behavior assertions.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  panel=page.locator('#industrial8e-physical')
  assert panel.is_visible(),'Original Engineer physical chemical plant must render'
  page.wait_for_function("""()=>{
   const t=document.querySelector('#industrial8e-physical')?.innerText||'';
   return t.includes('INBOUND ORIGINAL 8A GAS')&&
    t.includes('REACTOR MAY USE GAS ONLY WHEN ALL ORIGINAL PHYSICAL INLET JOBS ARE READY')&&
    t.includes('80 L');
  }""",timeout=15000)
  assert not errors,errors
  print('PASS original seed742 offline Chromium/WebGL2 real source-owned 80L inlet gas dashboard, no fake assets/cargo/electricity/save and genuine original ship/truck')
 finally:
  browser.close()
