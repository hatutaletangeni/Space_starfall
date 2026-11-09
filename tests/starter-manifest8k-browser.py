#!/usr/bin/env python3
"""8K actual offline new-expedition manifest and original truck uniqueness.
Uses real SF.startNewExpedition, never manually inserts stock; reload idempotent.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':860})
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.SF&&window.StarfallRuntime?.materials8a)",timeout=60000)
  prior=page.evaluate("""()=>{
   const m=StarfallRuntime.materials8a.snapshot(),
    ok=SF.storageStatus().durable;
   if(!ok)throw Error('8K requires durable original browser storage');
   const receipt=SF.startNewExpedition(742);
   return{oldLots:m.lots.length,receipt};
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.materials8a&&
    window.StarfallStarterManifest8K&&SF.load().initialIndustrialManifest8k)""",timeout=60000)
  first=page.evaluate("""()=>{
   const rt=StarfallRuntime,M=StarfallStarterManifest8K,s=SF.load(),
    a=rt.materials8a.snapshot(),truck=rt.physical8a.list().filter(x=>x.id==='truck-expedition-001');
   return{manifest:s.initialIndustrialManifest8k,expedition:s.freshExpedition,
    mass:a.lots.reduce((v,l)=>v+l.massKg,0),
    volume:a.lots.reduce((v,l)=>v+l.volumeM3,0),
    lots:a.lots.length,declared:M.SUM,allOwned:a.lots.every(x=>x.containerId==='8d:ship-main:materials'&&
      x.provenance.startsWith('preexisting_ship_manifest8k:')),
    trucks:truck.length,truckLocation:truck[0]?.location};
  }""")
  assert first['lots']==first['declared']['uniqueLots'],first
  assert abs(first['mass']-first['declared']['massKg'])<1e-7,first
  assert abs(first['volume']-first['declared']['volumeM3'])<1e-7,first
  assert first['allOwned'] and first['trucks']==1,first
  assert first['manifest']['status']=='COMMITTED',first
  page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime?.materials8a&&window.StarfallStarterManifest8K)",timeout=60000)
  after=page.evaluate("""()=>{
   const rt=StarfallRuntime,s=SF.load();
   return{manifestId:s.initialIndustrialManifest8k?.id,
    lotCount:rt.materials8a.snapshot().lots.length,
    mass:rt.materials8a.snapshot().lots.reduce((v,l)=>v+l.massKg,0),
    truckCount:rt.physical8a.list().filter(x=>x.id==='truck-expedition-001').length};
  }""")
  assert after['manifestId']==first['manifest']['id'],after
  assert after['lotCount']==first['lots'] and after['mass']==first['mass'],after
  assert after['truckCount']==1,after
  print('PASS 8K original file://: real new expedition seeded exactly one finite prebuilt manifest, one original truck and strict mass/volume ownership, no duplication across restart')
 finally:browser.close()
