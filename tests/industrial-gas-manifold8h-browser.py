#!/usr/bin/env python3
"""8H native file:// Chromium WebGL2 chemical-manifold safety gate.
The ORIGINAL game is loaded without synthetic gas, free kits, batteries or
an extra ship. A missing certified powered flange must fail closed and must
not alter original saved inventory or charge. Model-level real certified
fixtures live in industrial-gas-manifold8h.test.cjs.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
url=(root/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl',
  '--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':800})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.industrialQuote8E &&
   window.StarfallIndustrialGasManifold8H?.inspect &&
   window.StarfallOutpostUI?.durableSnapshot &&
   document.querySelector('#industrial8e-physical'))""",timeout=65000)
  report=page.evaluate("""()=>{
   const rt=StarfallRuntime,ui=StarfallOutpostUI,
    old={materials:JSON.stringify(rt.materials8a.snapshot()),
     physical:JSON.stringify(rt.physical8a.serialize()),
     grid:JSON.stringify(ui.durableSnapshot()),
     charge:rt.vehicleStore.get('ship').state.energyJ,
     saved:JSON.stringify(SF.load())};
   const original=rt.physical8a.list(),vessels=original.filter(x=>
      x.type==='industrial_vessel'),pipes=original.filter(x=>
      x.type==='industrial_plant'&&x.state?.station==='pressure_pipeline');
   let error=null;
   try{rt.industrialQuote8E('sabatier','nonexistent-8e-station',1);}
   catch(e){error=String(e.message||e);}
   const next={materials:JSON.stringify(rt.materials8a.snapshot()),
     physical:JSON.stringify(rt.physical8a.serialize()),
     grid:JSON.stringify(ui.durableSnapshot()),
     charge:rt.vehicleStore.get('ship').state.energyJ,
     saved:JSON.stringify(SF.load())};
   return{seed:rt.galaxy.seed,ship:rt.physical8a.get('ship-main')?.id,
    truck:rt.physical8a.get('truck-expedition-001')?.id,
    vessels:vessels.length,pipes:pipes.length,error,
    unchanged:JSON.stringify(old)===JSON.stringify(next)};
  }""")
  assert report['seed']==742 and report['ship']=='ship-main',report
  assert report['truck']=='truck-expedition-001',report
  assert report['error'] and 'real' in report['error'].lower(),report
  assert report['unchanged'],'A failed chemistry quote unexpectedly changed original 8A stock, battery, T02 or save: '+str(report)
  panel=page.locator('#industrial8e-physical')
  assert panel.count()==1
  text=panel.inner_text()
  assert '420 W' in text and '8 MPa' in text and '12 scene units' in text,text
  assert not errors,errors
  print('PASS original STARFALL seed742 WebGL2 file:// chemical pressure manifold no-free hardware: ORIGINAL ship/truck, no invisible 75m chemistry, original 8A/T02/battery/SF.save bytes unchanged')
 finally:
  browser.close()
