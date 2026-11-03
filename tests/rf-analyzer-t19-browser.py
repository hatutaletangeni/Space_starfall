#!/usr/bin/env python3
"""T19A actual offline file:// Chromium real original UI. Only landed-world
starting snapshot is seeded; antennas, energy and wires use real game controls.
No fake route, no custom RF packet, no synthetic ACK or hardware energy.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
uri=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  context=browser.new_context(viewport={'width':1240,'height':860},accept_downloads=True)
  page=context.new_page();errors=[];internet=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:internet.append(r.url) if r.url.startswith(('https://','http://')) else None)
  page.goto(uri,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallRFAnalyzerT19&&window.StarfallRFAnalyzerUI19)",timeout=50000)
  fixture=page.evaluate("""()=>{
    const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),s=SF.load().flightGalaxy||{},p=b.position;
    SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,position:[p[0],p[1]+b.radius+8,p[2]],
     target:b.id,attached:b.id,groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
    return{state:SF.load(),seed:rt.galaxy.seed,bodyId:b.id};
  }""")
  page.evaluate("""s=>{
    window.__STARFALL_IMPORT_PENDING=true;
    localStorage.setItem('starfall_save',JSON.stringify(s));
  }""",fixture['state'])
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRFAnalyzerUI19&&window.StarfallOutpostUI&&window.StarfallCommsT03)",timeout=50000)
  assert page.evaluate("StarfallRuntime.landed && StarfallRuntime.eva")
  page.locator('#outpost-open').click()
  ids={}
  for kind in ['battery','solar','antenna']:
   result=page.evaluate("""kind=>{
    const ui=StarfallOutpostUI,body=StarfallRuntime.outpostContext().body,
      type=document.getElementById('outpost-type'),f=document.getElementById('outpost-forward'),
      right=document.getElementById('outpost-right'),build=document.getElementById('outpost-place'),
      base=ui.store.items.find(x=>x.bodyId===body.id);
    type.value=kind;type.dispatchEvent(new Event('change',{bubbles:true}));
    for(const forward of [65,75,85,95,105,115,55,125])
      for(const offset of [0,-22,22,-44,44]){
       f.value=forward;right.value=offset;
       f.dispatchEvent(new Event('input',{bubbles:true}));
       right.dispatchEvent(new Event('input',{bubbles:true}));
       if(!document.getElementById('outpost-placement').textContent.startsWith('VALID LOCATION'))continue;
       const pos=StarfallRuntime.outpostOffset(forward,offset);
       if(base&&StarfallOutposts.arc(base.local,pos,body.radius)>65)continue;
       const before=ui.store.items.length;
       build.click();
       if(ui.store.items.length===before+1)return{kind,id:ui.store.items.at(-1).id};
      }
    throw Error('Actual original UI could not build '+kind+': '+document.getElementById('outpost-status').textContent);
   }""",kind)
   assert result['kind']==kind
   ids[kind]=result['id']
  page.locator('[data-outpost-tab="power"]').click()
  for kind in ['solar','antenna']:
   page.locator('#outpost-node-a').select_option(ids['battery'])
   page.locator('#outpost-node-b').select_option(ids[kind])
   page.locator('#outpost-connect').click()
   assert page.evaluate("""v=>StarfallOutpostUI.store.wires.some(w=>w.a===v[0]&&w.b===v[1]||w.a===v[1]&&w.b===v[0])""",[ids['battery'],ids[kind]])
  page.wait_for_timeout(700)
  page.locator('[data-outpost-tab="comms"]').click()
  page.locator('#outpost-radio-device').select_option(ids['antenna'])
  page.locator('#rf-t19-target').select_option('starfall-ship')
  page.locator('#rf-t19-refresh').click()
  initial=page.evaluate("""id=>{
   const item=StarfallOutpostUI.store.items.find(x=>x.id===id);
   const ui=StarfallRFAnalyzerUI19,report=StarfallOutpostUI.powerReports.get(item.bodyId).byId[id],
      real=ui.inspect();
   return{connected:real.connected,quality:real.quality,volts:real.supplyV,
     watts:real.watts,route:real.hops,packets:StarfallCommsT03.transport.packets.length,
     sourceEnergy:StarfallOutpostUI.store.items.find(x=>x.kind==='battery').energyJ,
     bodyId:item.bodyId};
  }""",ids['antenna'])
  assert initial['connected'] and initial['volts']>0 and initial['watts']>0 and initial['packets']==0,initial
  page.locator('#rf-t19-measure').click()
  history=page.evaluate("""id=>{
    const r=StarfallOutpostUI.store.items.find(x=>x.id===id).radioT04;
    const samples=StarfallRFAnalyzerT19.restore(r.budgetT19).samples;
    return{length:samples.length,quality:samples.at(-1)?.quality,ack:samples.at(-1)?.ackId,
     saved:SF.load().outpost5.items.find(x=>x.id===id).radioT04.budgetT19.samples.length,
     packetCount:StarfallCommsT03.transport.packets.length};
  }""",ids['antenna'])
  assert history['length']==1 and history['saved']==1 and history['ack'] is None and history['packetCount']==0,history
  # Actual T04 tracking modification (extra 35 W) preserves T19 trace.
  page.locator('#outpost-radio-mode').select_option('tracking')
  page.locator('#outpost-radio-target').select_option('starfall-ship')
  page.locator('#outpost-radio-apply').click()
  assert page.evaluate("""id=>{
    const r=StarfallOutpostUI.store.items.find(x=>x.id===id).radioT04;
    return r.mode==='tracking'&&r.targetId==='starfall-ship'&&
      StarfallRFAnalyzerT19.restore(r.budgetT19).samples.length===1;
  }""",ids['antenna'])
  # Original breaker OFF -> route offline, then ON -> original T02 resumes.
  page.locator('[data-outpost-tab="power"]').click()
  page.locator('#outpost-node-a').select_option(ids['antenna'])
  page.locator('#outpost-toggle-power').click()
  assert not page.evaluate("id=>StarfallOutpostUI.store.items.find(x=>x.id===id).enabled",ids['antenna'])
  page.locator('[data-outpost-tab="comms"]').click()
  page.locator('#rf-t19-refresh').click()
  assert 'OFFLINE' in page.locator('#rf-t19-status').inner_text()
  page.locator('#rf-t19-measure').click()
  offline=page.evaluate("""id=>{
    const trace=StarfallRFAnalyzerT19.restore(StarfallOutpostUI.store.items.find(x=>x.id===id).radioT04.budgetT19).samples;
    return{count:trace.length,connected:trace.at(-1)?.connected,
     quality:trace.at(-1)?.quality,reason:trace.at(-1)?.reason};
  }""",ids['antenna'])
  assert offline['count']==2 and offline['connected'] is False and offline['quality'] is None,offline
  page.locator('[data-outpost-tab="power"]').click()
  page.locator('#outpost-node-a').select_option(ids['antenna'])
  page.locator('#outpost-toggle-power').click()
  page.locator('[data-outpost-tab="comms"]').click()
  page.locator('#rf-t19-refresh').click()
  recovered=page.evaluate("""id=>{
    const i=StarfallOutpostUI.store.items.find(x=>x.id===id);
    return{on:i.enabled,history:StarfallRFAnalyzerT19.restore(i.radioT04.budgetT19).samples.length,
       sourcePower:StarfallOutpostUI.powerReports.get(i.bodyId)?.byId?.[id]?.power,
       packetCount:StarfallCommsT03.transport.packets.length};
  }""",ids['antenna'])
  assert recovered['on'] and recovered['history']==2 and recovered['packetCount']==0,recovered
  # A real user download, no fake report text in lieu of file.
  with page.expect_download(timeout=30000) as evt:
   page.locator('#rf-t19-export').click()
  assert evt.value.suggested_filename.endswith('.json')
  page.locator('#outpost-close').click()
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRFAnalyzerUI19&&window.StarfallCommsT03)",timeout=60000)
  final=page.evaluate("""id=>{
    const item=StarfallOutpostUI.store.items.find(x=>x.id===id),
      sample=StarfallRFAnalyzerT19.restore(item.radioT04.budgetT19).samples;
    return{count:sample.length,on:item.enabled,mode:item.radioT04.mode,target:item.radioT04.targetId,
     savedCount:SF.load().outpost5.items.find(x=>x.id===id).radioT04.budgetT19.samples.length,
     packetCount:StarfallCommsT03.transport.packets.length};
  }""",ids['antenna'])
  assert final['count']==2 and final['savedCount']==2 and final['mode']=='tracking' and final['on'] and final['packetCount']==0,final
  assert not errors and not internet,(errors,internet)
  print('PASS T19A REAL browser: original UI-built and wired DC antenna, source T03 physical route, no fake test packet, actual 165 W hardware load, trace persistence, original T04 tracking, breaker-off failure and recovery, download/reload',initial,offline,final)
 finally:
  browser.close()
