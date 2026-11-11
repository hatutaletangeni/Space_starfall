#!/usr/bin/env python3
"""Boot authentic historical games, export their actual live saves, and import
through current T17 UI. No invented legacy-state JSON and no stock injection.
These generated historical saves do not replace testing a user's private saves.
"""
from pathlib import Path
import json,subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/'8k-historical-saves';OUT.mkdir(parents=True,exist_ok=True)
REVISIONS=('9536bc4','f6fa832','1d2b9a4')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  reports=[]
  for rev in REVISIONS:
   # The CI job fetches full history once; source bytes are immutable git blobs.
   data=subprocess.check_output(['git','show',rev+':PLAY-STARFALL.html'],cwd=ROOT)
   old=OUT/(rev+'-original.html');old.write_bytes(data)
   oldctx=browser.new_context(viewport={'width':1200,'height':760});page=oldctx.new_page()
   page.goto(old.as_uri(),wait_until='domcontentloaded',timeout=90000)
   page.wait_for_function('!!(window.SF&&window.StarfallRuntime?.galaxy)',timeout=60000)
   page.keyboard.down('w');page.wait_for_timeout(300);page.keyboard.up('w')
   # Exercise the historical game's own lifecycle save handlers.
   page.evaluate("window.dispatchEvent(new Event('pagehide'))")
   page.wait_for_function('!!SF.load().flightGalaxy',timeout=10000)
   saved=page.evaluate('SF.load()');assert saved['flightGalaxy']['seed']==742,saved
   oldctx.close()
   context=browser.new_context(viewport={'width':1200,'height':760});current=context.new_page();errors=[]
   current.on('pageerror',lambda e:errors.append(str(e)))
   current.on('dialog',lambda d:d.accept())
   current.goto((ROOT/'PLAY-STARFALL.html').as_uri(),wait_until='domcontentloaded',timeout=90000)
   current.wait_for_function('!!(window.StarfallRuntime&&window.StarfallExpeditionArchiveUI17)',timeout=60000)
   pack=current.evaluate('(state)=>StarfallArchiveT17.create({state,galaxySeed:742})',saved)
   backup=OUT/(rev+'-actual-save.json');backup.write_text(json.dumps(pack),encoding='utf-8')
   with current.expect_navigation(wait_until='domcontentloaded',timeout=90000):
    current.locator('#archive-t17-file').set_input_files(str(backup))
   current.wait_for_function('!!window.StarfallRuntime?.physical8a',timeout=60000)
   restored=current.evaluate("""()=>({state:SF.load(),trucks:StarfallRuntime.physical8a.list().filter(x=>x.type==='truck'),
    inventory:StarfallRuntime.materials8a.inventory(),seed:StarfallRuntime.galaxy.seed})""")
   assert restored['seed']==742
   assert len(restored['trucks'])==1,restored
   assert not restored['state'].get('initialIndustrialManifest8k'),'Historical import cannot grant new-expedition supplies'
   for row in saved.get('discoveries',[]):
    assert any(d['id']==row['id'] for d in restored['state']['discoveries']),row
   assert restored['state']['flightGalaxy']['target']==saved['flightGalaxy']['target']
   assert restored['state']['credits']==saved['credits']
   original_lots=(saved.get('materials8a') or {}).get('lots',[])
   assert restored['inventory']==original_lots,'Historical stock must not be topped up or reset'
   current.screenshot(path=str(OUT/(rev+'-imported.png')))
   current.reload(wait_until='domcontentloaded',timeout=90000)
   current.wait_for_function('!!window.StarfallRuntime?.physical8a',timeout=60000)
   assert current.evaluate("StarfallRuntime.physical8a.list().filter(x=>x.type==='truck').length")==1
   assert current.evaluate('StarfallRuntime.materials8a.inventory()')==original_lots
   assert not errors,errors
   reports.append({'revision':rev,'source':'actual historical standalone lifecycle save','result':'PASS',
    'discoveriesPreserved':len(saved.get('discoveries',[])),'lotCount':len(original_lots),'truckCount':1})
   context.close();print('PASS genuine historical game save import/reload:',rev,flush=True)
  (OUT/'historical-save-results.json').write_text(json.dumps(reports,indent=2))
 finally:browser.close()
