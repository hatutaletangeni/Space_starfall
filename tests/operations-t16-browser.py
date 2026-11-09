#!/usr/bin/env python3
"""T16 actual file:// Chromium, original owners and original UI event handlers.
Fixture uses saved landed spacecraft; not evidence of manual landing or GPU FPS.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx=browser.new_context(viewport={'width':1250,'height':820})
  errors=[]
  boot=ctx.new_page();boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(url,wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function('!!(window.StarfallRuntime&&window.StarfallCommsT03&&window.StarfallOperationsUI16)',timeout=50000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,s=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
    groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  boot.close()
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallRuntime&&window.StarfallOperationsUI16)',timeout=50000)
  page.evaluate("""state=>{
   window.__STARFALL_IMPORT_PENDING=true;
   localStorage.setItem('starfall_save',JSON.stringify(state));
  }""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallOperationsUI16&&window.StarfallCommsT03&&window.StarfallAssetUI7A1)',timeout=50000)
  original=page.evaluate("""()=>{
   const ui=StarfallOperationsUI16,rt=StarfallRuntime;
   if(!rt.landed)throw Error('Expected original saved landed ship');
   const list=ui.realAssets(),ship=ui.report('starfall-ship');
   if(list.some(x=>x.kind==='satellite')||list.some(x=>x.kind==='remote-rover'))
    throw Error('Old save fabricated deployed hardware');
   if(ship.id!=='starfall-ship'||ship.packet.stage!=='READY'||ship.photo.stage!=='READY')
    throw Error('New T16 invented an ACK or photo without source records');
   if(document.querySelectorAll('.op16-card').length<7)
    throw Error('Original operational modal cards were not mounted');
   if(ui.report('ghost-satellite')!==null)throw Error('Phantom asset can be inspected as operating');
   return{energyJ:ship.energyJ,world:ship.bodyId,count:list.length,panels:document.querySelectorAll('.op16-card').length};
  }""")
  assert page.locator('#op16-asset option[value="starfall-ship"]').count()==1
  assert 'READY' in page.locator('#panel-body .op16-state').inner_text()
  stage=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.nearest,radio=StarfallCommsT03,old=radio.transport.packets.length;
   const packet=radio.transport.queue({id:'ops16-browser-status-1',type:'TELEMETRY',
    sourceId:'starfall-ship',destId:'starfall-rover',bodyId:b.id,systemId:b.systemId,
    bytes:128,createdS:rt.time,ref:{test:'status-only'}});
   const ui=StarfallOperationsUI16;ui.refresh();
   const s=ui.report('starfall-ship');
   if(s.packet.label==='NO COMMAND RECEIPT'||s.packet.stage==='COMPLETE')
    throw Error('Queued packet was reported as ACKed or disappeared');
   if(radio.transport.packets.length!==old+1)throw Error('UI corrupted original packet owner');
   return{phase:s.packet.stage,ack:s.packet.label,bytes:s.packet.sentBytes};
  }""")
  assert stage['phase']=='IN_PROGRESS',stage
  assert page.locator('#op16-log-rows').inner_text().find('ops16')<0 or page.locator('#op16-log-rows').count()==1
  # The source-owned T16 status card remains under the Overview page. UI22
  # collapses the legacy reconnaissance panel on boot. Open its visible
  # Navigate workspace before operating the genuine log filters.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Navigate').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  page.locator('#op16-filter-severity').select_option('info')
  assert page.locator('#op16-filter-severity').input_value()=='info'
  page.locator('#op16-asset').select_option('starfall-ship')
  page.locator('#op16-open').click()
  page.wait_for_function("!document.getElementById('workbench').hidden",timeout=15000)
  assert page.locator('#workbench .op16-card').count()==1
  assert 'starfall-ship' in page.locator('#workbench .op16-card').inner_text()
  # Tab focus stays inside the visible modal even when its final button is active.
  focus=page.evaluate("""()=>{
   const modal=document.getElementById('workbench'),
      choices=[...modal.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled])')]
       .filter(el=>el.getClientRects().length>0);
   choices.at(-1).focus();
   return{last:choices.at(-1).id,length:choices.length};
  }""")
  page.keyboard.press('Tab')
  assert page.evaluate("document.getElementById('workbench').contains(document.activeElement)"),focus
  page.locator('#wb-close').click()
  page.wait_for_function("document.getElementById('workbench').hidden",timeout=15000)
  # UI22: use the genuinely visible Build-stage Rocket Lab action, not hidden legacy page controls.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-action').filter(has_text='ROCKET LAB').click()
  page.wait_for_function("!document.getElementById('launch-dialog').hidden",timeout=15000)
  assert page.locator('#launch-dialog .op16-card').count()==2, 'Rocket Lab and nested Satellite Operations each own a distinct source card'
  assert page.locator('#sat7c-section .op16-card').count()==1
  assert page.locator('#launch-emergency').count()==1,'Original emergency stop retained'
  page.locator('#launch-close').click()
  # UI22: navigate through visible Mission workspace; keep all behavior assertions.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Operate').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  page.locator('#imaging7f-open').click()
  page.wait_for_function("!document.getElementById('imaging7f').hidden",timeout=15000)
  assert page.locator('#imaging7f .op16-card').count()==1
  page.locator('#imaging7f-close').click()
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallOperationsUI16",timeout=50000)
  assert page.locator('#op16-asset').count()==1
  assert page.evaluate("StarfallOperationsUI16.report('starfall-ship').id==='starfall-ship'")
  assert not errors,errors
  print('PASS T16 real file:// Chromium: no phantom hardware/ACK/photos, actual T03 queued packet, status/log/filter, original UI actions, focus-trapped Workbench and unchanged STOP, save reload',original,stage)
 finally:
  browser.close()
