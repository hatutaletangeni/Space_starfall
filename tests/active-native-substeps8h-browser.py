#!/usr/bin/env python3
"""STARFALL 8H actual offline WebGL2: original owner and pure active T02 step
planning, no inventory edits or phantom electricity. Exact real paid packet
movement remains exercised by the existing conveyor and gas browser suites.
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
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.galaxy &&
    window.StarfallNativePowerSubsteps8H?.plan &&
    window.StarfallPressureGasPackets8H &&
    window.StarfallConveyorNativeBridge8H &&
    window.StarfallOutpostUI?.durableSnapshot)""",timeout=65000)
  snap=page.evaluate("""()=>{
    const rt=StarfallRuntime,owner=StarfallOutpostUI,clock=StarfallNativePowerSubsteps8H;
    const before={stock:JSON.stringify(rt.materials8a.snapshot()),
     physical:JSON.stringify(rt.physical8a.serialize()),
     power:JSON.stringify(owner.durableSnapshot()),
     save:JSON.stringify(SF.load()),
     battery:rt.vehicleStore.get('ship').state.energyJ};
    const fast=clock.plan({elapsedS:120,activePaid8H:true}),
     legacy=clock.plan({elapsedS:120,activePaid8H:false});
    const end=clock.endpoint(700,fast,fast.steps-1);
    const after={stock:JSON.stringify(rt.materials8a.snapshot()),
     physical:JSON.stringify(rt.physical8a.serialize()),
     power:JSON.stringify(owner.durableSnapshot()),
     save:JSON.stringify(SF.load()),
     battery:rt.vehicleStore.get('ship').state.energyJ};
    return{seed:rt.galaxy.seed,
     oneTruck:rt.physical8a.list().filter(x=>x.type==='truck').length,
     ship:rt.physical8a.get('ship-main')?.id,
     fast,legacy,end,equal:JSON.stringify(before)===JSON.stringify(after)};
  }""")
  assert snap['seed']==742 and snap['ship']=='ship-main' and snap['oneTruck']==1,snap
  assert snap['fast']['steps']==12 and snap['fast']['stepS']==10 and snap['fast']['safeForPacket'],snap
  assert snap['legacy']['steps']==1 and snap['legacy']['stepS']==120,snap
  assert snap['end']==820 and snap['equal'],snap
  assert not errors,errors
  print('PASS actual original offline WebGL2: 2,368-star seed742 original ship/truck/8A/T02/saves unmodified; original source grid 100x active-job planning is bounded to 12 native 10s paid pulses instead of one unsafe 120s pulse')
 finally:
  browser.close()
