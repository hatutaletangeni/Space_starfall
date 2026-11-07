#!/usr/bin/env python3
"""8K original offline Records acceptance: factual audit, no fake completion.

This does not claim a full unassisted industrial expedition was played.
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
  page.wait_for_function("""()=>!!(window.StarfallRuntime?.materials8a&&
   window.StarfallExpeditionAudit8K&&window.StarfallExpeditionAuditUI8K)""",timeout=60000)
  saved=page.evaluate("""()=>{
    const digest=()=>{const s=SF.load();return JSON.stringify({
      materials8a:s.materials8a,physical8a:s.physical8a,
      terraformWorlds8j:s.terraformWorlds8j,vehicleAssembly8g:s.vehicleAssembly8g,
      logisticsOffworldManifests8h:s.logisticsOffworldManifests8h});};
    const before=digest(),report=StarfallExpeditionAudit8K.evaluate(SF.load()),
      after=digest();
    return{before,after,report};
  }""")
  assert saved['before']==saved['after'],'Audit must be read-only'
  assert saved['report']['certified'] is False,saved['report']
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Records').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  audit=page.locator('#expedition-audit8k')
  assert audit.count()==1,'Original Records pane missing the 8K audit'
  audit.locator('summary').click()
  audit.get_by_role('button',name='REFRESH ORIGINAL EXPEDITION EVIDENCE').click()
  text=audit.inner_text()
  assert 'NOT RELEASE CERTIFIED' in text,text
  assert 'NOT VERIFIED' in text,text
  assert 'Original truck identity' in text,text
  assert 'Real GPU and sustained frame-time test' in text,text
  # A running industrial scene may legitimately autosave original vehicle poses,
  # power receipts and material jobs between UI clicks. Verify the evidence
  # audit itself is read-only in one JS event turn rather than freezing physics.
  unchanged=page.evaluate("""()=>{
    const before=JSON.stringify(SF.load()),a=StarfallExpeditionAudit8K.evaluate(SF.load()),
      after=JSON.stringify(SF.load());
    return{unchanged:before===after,certified:a.certified,
      suspicious:a.integrity.suspiciousFixtureLots};
  }""")
  assert unchanged['unchanged'] and unchanged['certified'] is False,unchanged
  assert not errors,errors
  print('PASS 8K real file:// Records: truthful read-only evidence from actual save, full expedition and GPU remain NOT VERIFIED, no stock changes')
 finally:
  browser.close()
