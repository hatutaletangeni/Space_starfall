#!/usr/bin/env python3
"""8D genuine offline Chromium integration: native UI, unmined stock,
one-truck authority, source-backed containers, save/reload, zero network.
This is not a full 24-second physical-drill playthrough.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
uri=(root/'PLAY-STARFALL.html').resolve().as_uri()
out=root/'artifacts'/'8d-mining-chromium'
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1100,'height':720},device_scale_factor=1)
  errors=[];network=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime?.mining8d && !!document.getElementById('mining8d-panel')",timeout=60000)
  state=page.evaluate("""()=>{
    const r=StarfallRuntime,m=r.materials8a,n=r.mining8d;
    return {
      trucks:r.physical8a.list().filter(a=>a.type==='truck').length,
      bins:m.containers().filter(x=>[StarfallMining8D.TRUCK,StarfallMining8D.SHIP].includes(x.id)).length,
      ore:m.inventory().reduce((q,x)=>q+x.massKg,0),
      depleted:r.resources8c.depleted().length,
      active:n.active,drillStatus:n.toolCondition,ctx:r.miningContext8D()
    };
  }""")
  assert state['trucks']==1,state
  assert state['bins']==2,state
  assert state['ore']==0 and state['depleted']==0,state
  assert state['active'] is None,state
  # UI22 visible mission workflow; all original scenario assertions remain.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Operate').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  assert page.locator('#mining8d-panel').is_visible()
  assert page.get_by_role('button',name='START 20 KG BORE / 24 S').is_disabled()
  assert page.get_by_role('button',name='LOAD 50 KG INTO SHIP / 16 S').is_disabled()
  page.screenshot(path=str(out/'8d-operate-mining-panel.png'))
  page.evaluate("SF.save({mining8d:StarfallRuntime.mining8d.snapshot(),materials8a:StarfallRuntime.materials8a.snapshot(),resources8c:StarfallRuntime.resources8c.serialize()})")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallRuntime?.mining8d",timeout=60000)
  assert page.evaluate("StarfallRuntime.physical8a.list().filter(a=>a.type==='truck').length") == 1
  assert page.evaluate("StarfallRuntime.materials8a.inventory().reduce((a,x)=>a+x.massKg,0)") == 0
  assert page.evaluate("StarfallRuntime.resources8c.depleted().length") == 0
  assert not errors,errors[:8]
  assert not network,network[:8]
  print('PASS 8D actual offline Chromium UI: disabled no-survey mining, one physical truck, empty genuine resource stores, save/reload, no page errors or HTTP requests')
 finally:
  browser.close()
