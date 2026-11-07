#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1280,'height':900})
  errors=[];remoteRequests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda q:remoteRequests.append(q.url) if q.url.startswith(('http://','https://')) else None)
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("() => !!window.StarfallRuntime?.physical8a && !!document.querySelector('#truck-custody8b-asset-manager')",timeout=60000)
  initial=page.evaluate("""() => ({
   owner:StarfallRuntime.physical8a.get('truck-expedition-001')?.location.kind,
   mode:StarfallRuntime.cargo8b.mode,
   count:StarfallRuntime.physical8a.list().filter(x=>x.type==='truck').length,
   label:document.querySelector('#truck-custody8b-asset-manager').textContent
  })""")
  assert initial['owner']=='ship' and initial['mode']=='secured' and initial['count']==1,initial
  assert 'SECURED INSIDE SHIP' in initial['label'],initial
  # Follow the actual visible UI22 Mission → Build → Asset Manager route.
  page.locator('#sf-mission-button').click()
  page.get_by_role('button',name='03 · Build').click()
  page.get_by_role('button',name='ASSET MANAGER',exact=True).click()
  assert page.locator('#asset-manager').is_visible()
  assert page.locator('#truck-custody8b-asset-manager').is_visible()
  page.locator('#asset-close').click()
  page.evaluate("""() => {
   const r=StarfallRuntime;
   r.physical8a.move('truck-expedition-001',{kind:'surface',bodyId:'test-world-remote',local:[0,1,0]},'test:remote');
   const old=SF.load().flightGalaxy||{};
   SF.save({physical8a:r.physical8a.serialize(),
    flightGalaxy:{...old,shipCargo8b:{schema:1,mode:'secured',pose:{x:16.5,y:-1.2,z:5.7},counter:2}}});
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("() => !!window.StarfallRuntime?.physical8a && !!document.querySelector('#truck-custody8b-asset-manager')",timeout=60000)
  after=page.evaluate("""() => ({
   truck:StarfallRuntime.physical8a.get('truck-expedition-001'),
   mode:StarfallRuntime.cargo8b.mode,
   count:StarfallRuntime.physical8a.list().filter(x=>x.type==='truck').length,
   label:document.querySelector('#truck-custody8b-asset-manager').textContent
  })""")
  assert after['truck']['location']['bodyId']=='test-world-remote',after
  assert after['mode']=='ground' and after['count']==1,after
  assert 'test-world-remote' in after['label'],after
  assert not errors,errors[:5]
  assert not remoteRequests,remoteRequests[:5]
  print('PASS genuine offline WebGL2: ship truck custody, remote world persistence, one original truck, correct Asset Manager status')
 finally:browser.close()
