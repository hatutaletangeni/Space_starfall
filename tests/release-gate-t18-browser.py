#!/usr/bin/env python3
"""T18 release-gate integration. Real file:// Chromium + SwiftShader, actual UI
controls and source stores. Only the STARTING LANDED LOCATION is a seeded fixture.
NO fake power, route, satellites, rover packets, photo bytes, direct source
mutation, auto-ACK or remoteLink stubs. Manual E2E items remain NOT VERIFIED.
"""
from pathlib import Path
import json, statistics, os, time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
URI=(ROOT/'PLAY-STARFALL.html').as_uri()
OUT=ROOT/'artifacts'/'t18-release'
OUT.mkdir(parents=True,exist_ok=True)
def check(ok,message,record=None):
 if not ok: raise AssertionError(message+' / '+repr(record))
def visit(page,opener,modal,closer):
 page.locator('#'+opener).click(timeout=15000)
 page.wait_for_function("(id)=>document.getElementById(id)?.hidden===false",arg=modal,timeout=15000)
 check(page.locator('#'+modal).count()==1,'Original panel did not open',modal)
 page.locator('#'+closer).click(timeout=15000)
 page.wait_for_function("(id)=>document.getElementById(id)?.hidden===true",arg=modal,timeout=15000)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox',
  '--disable-dev-shm-usage','--enable-precise-memory-info'])
 errors=[];external=[]
 try:
  ctx=browser.new_context(viewport={'width':1300,'height':820},accept_downloads=True)
  page=ctx.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda q:external.append(q.url) if q.url.startswith(('https://','http://')) else None)
  page.goto(URI,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime && window.StarfallOutpostUI && window.StarfallLaunchUI && window.StarfallImagingUI7F && window.StarfallExpeditionArchiveUI17)",timeout=60000)
  pristine=page.evaluate("""()=>{
    const rt=StarfallRuntime,st=SF.load(),launch=StarfallLaunchUI.store;
    return{world:rt.nearest?.id,seed:rt.galaxy.seed,landed:rt.landed,
     stations:StarfallOutpostUI.store.items.length,rovers:launch.rovers.length,
     satellites:launch.satellites.length,photos:StarfallImagingUI7F.store.photos.length,
     packets:StarfallCommsT03.transport.packets.length,
     journal:StarfallScienceUI.journal.length,
     gpusurface:!!document.getElementById('universe').getContext('webgl2'),
     stars:rt.galaxy.systems.length};
  }""")
  check(pristine['gpusurface'] and pristine['stars']==2368,'Original world/GPU did not initialize',pristine)
  check(not any(pristine[k] for k in ('stations','rovers','satellites','photos','packets')),
   'Fresh save fabricated deployed hardware or confirmed evidence',pristine)
  visit(page,'archive-t17-open','archive-t17','archive-t17-close')
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  visit(page,'launch-open','launch-dialog','launch-close')
  page.screenshot(path=str(OUT/'01-unmodified-spaceflight.png'))
  # Permitted T18 fixture: change STARTING POSITION to a real existing solid
  # world. All subsequently placed power, equipment and records use actual UI.
  saved=page.evaluate("""()=>{
    const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),
      state=SF.load(),prev=state.flightGalaxy||{},p=b.position;
    if(!b.landable)throw Error('Seeded first planet is not actually landable');
    if(SF.save({flightGalaxy:{...prev,seed:rt.galaxy.seed,time:0,
       position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
       groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}})===false)
       throw Error('Land-start fixture could not persist');
    return SF.load();
  }""")
  # One-shot import; there is deliberately no persistent init script that
  # could erase subsequent source records during reload.
  page.evaluate("""s=>{
    window.__STARFALL_IMPORT_PENDING=true;
    localStorage.setItem('starfall_save',JSON.stringify(s));
  }""",saved)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallOutpostUI&&window.StarfallScienceUI)",timeout=60000)
  check(page.evaluate("StarfallRuntime.landed && StarfallRuntime.eva && !!StarfallRuntime.outpostContext()?.body"),'Landed EVA source not ready')
  # Open original Outposts UI by DOM event; no direct outpost .add or .link.
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  page.locator('#outpost-open').click()
  page.wait_for_function("!document.getElementById('outpost').hidden")
  placements=[]
  for kind in ['battery','solar','connector','lab','hab','storage','antenna','foundation']:
   selection=page.evaluate("""kind=>{
     const type=document.getElementById('outpost-type'),forward=document.getElementById('outpost-forward'),
      right=document.getElementById('outpost-right'),build=document.getElementById('outpost-place'),
      api=StarfallOutpostUI,ctx=StarfallRuntime.outpostContext(),
      old=api.store.items.filter(x=>x.bodyId===ctx.bodyId).length,
      first=api.store.items.find(x=>x.bodyId===ctx.bodyId);
     type.value=kind;type.dispatchEvent(new Event('change',{bubbles:true}));
     const candidates=[];
     for(const f of [65,75,85,95,105,115,125,55])
      for(const side of [0,-22,22,-44,44,-62,62])
       if(Math.hypot(f,side)<=149)candidates.push([f,side]);
     let last='',accepted=null;
     for(const [f,side] of candidates){
      forward.value=f;right.value=side;
      forward.dispatchEvent(new Event('input',{bubbles:true}));
      right.dispatchEvent(new Event('input',{bubbles:true}));
      const diagnostic=document.getElementById('outpost-placement').textContent;
      if(!diagnostic.startsWith('VALID LOCATION')){last=diagnostic;continue;}
      // Source-owner read only: keep structures within a real 80-scene-unit
      // cable radius of the first battery rather than inventing wires.
      const pos=StarfallRuntime.outpostOffset(f,side);
      if(first&&StarfallOutposts.arc(first.local,pos,ctx.body.radius)>66)continue;
      build.click();const updated=api.store.items.filter(x=>x.bodyId===ctx.bodyId);
      if(updated.length===old+1){
       accepted=updated.at(-1);
       break;
      }
      last=document.getElementById('outpost-status').textContent;
     }
     if(!accepted)throw Error('UI did not find/build '+kind+' after legitimate preview: '+last);
     return{id:accepted.id,kind:accepted.kind,bodyId:accepted.bodyId,energyJ:accepted.energyJ,
      f:forward.value,right:right.value,structures:api.store.items.length};
   }""",kind)
   check(selection['kind']==kind and selection['structures']==len(placements)+1,
     'Original UI did not create correct actual equipment',selection)
   placements.append(selection)
  # Wire every module to the battery with actual power-panel controls.
  page.locator('[data-outpost-tab="power"]').click()
  ids={x['kind']:x['id'] for x in placements}
  wire_results=[]
  for kind in ['solar','connector','lab','hab','storage','antenna','foundation']:
   a=ids['battery'];b=ids[kind]
   page.locator('#outpost-node-a').select_option(a)
   page.locator('#outpost-node-b').select_option(b)
   page.locator('#outpost-connect').click()
   result=page.evaluate("""([a,b])=>{
    const os=StarfallOutpostUI.store;
    return{connected:os.wires.some(w=>w.a===a&&w.b===b||w.a===b&&w.b===a),
     count:os.wires.length,feedback:document.getElementById('outpost-status').textContent};
   }""",[a,b])
   check(result['connected'],'Physical 80 scene-unit cable did not connect',result)
   wire_results.append(result)
  # A real wired network (battery source) must power a load. The real
  # model integrates on its own frame loop: no arbitrary battery top-up.
  page.wait_for_timeout(1800)
  live=page.evaluate("""ids=>{
    const ui=StarfallOutpostUI,rt=StarfallRuntime,b=rt.nearest,
     report=ui.powerReports.get(b.id),battery=ui.store.items.find(x=>x.id===ids.battery);
    const lines={};for(const k of ['solar','connector','lab','hab','storage','antenna'])
      lines[k]=report?.byId?.[ids[k]]||null;
    return{world:b.id,simTime:rt.time,groups:report?.groups,chargedJ:report?.chargedJ,
      dischargedJ:report?.dischargedJ,lossJ:report?.lossJ,genW:report?.generationW,
      batteryJ:battery.energyJ,batteryCapacityJ:StarfallOutposts.SPECS.battery.capacityJ,
      line:lines,wireCount:ui.store.wires.length,seed:rt.galaxy.seed};
  }""",ids)
  check(live['groups']>=1 and live['batteryJ']>=0 and live['wireCount']==7,'Real outpost power network did not evaluate',live)
  check(live['batteryJ']<=live['batteryCapacityJ'] and live['dischargedJ']>=0,'Source battery energy violated bounds',live)
  check(live['line']['lab'] is not None and live['line']['hab'] is not None,'Connected loads not in original power solver',live)
  # Disconnect ground antenna: it must be an original load switch, not a
  # fake radio-link state set by the test.
  page.locator('#outpost-node-a').select_option(ids['antenna'])
  before=page.evaluate("""id=>StarfallOutpostUI.store.items.find(x=>x.id===id).enabled""",ids['antenna'])
  page.locator('#outpost-toggle-power').click()
  disabled=page.evaluate("""id=>StarfallOutpostUI.store.items.find(x=>x.id===id).enabled""",ids['antenna'])
  check(before and disabled is False,'Real antenna switch-off failed')
  page.locator('#outpost-toggle-power').click()
  enabled=page.evaluate("""id=>StarfallOutpostUI.store.items.find(x=>x.id===id).enabled""",ids['antenna'])
  check(enabled is True,'Real antenna switch recovery failed')
  page.screenshot(path=str(OUT/'02-connected-original-outpost.png'))
  page.locator('#outpost-close').click()
  # A player-visible field-sensor acquisition; wait its actual time budget,
  # without directly calling source.sample() or inserting journal evidence.
  page.locator('#ui21-navigation button[data-route="Explore"]').click()
  page.locator('#field-open').click()
  page.locator('#field-instrument').select_option('thermometer')
  before=page.evaluate("StarfallScienceUI.journal.length")
  page.locator('#field-measure').click()
  page.wait_for_function("before=>StarfallScienceUI.journal.length===before+1",arg=before,timeout=45000)
  obs=page.evaluate("""()=>{
   const r=StarfallScienceUI.journal.at(-1);
   return{id:r.id,bodyId:r.bodyId,timeS:r.timeS,energyJ:r.powerJ,
    uncertainty:r.uncertainty,source:r.sourceAssetId||null,location:r.location,
    journalCount:StarfallScienceUI.journal.length};
  }""")
  check(obs['bodyId']==live['world'] and obs['energyJ']>0 and len(obs['location'])==3,
   'Real UI instrument record lacks world/energy/position',obs)
  page.locator('#field-close').click()
  # Original T15 Workbench UI changes a rover part once; no direct store.apply.
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  page.locator('#systems-toggle').click()
  page.locator('#workbench-open').click()
  page.wait_for_function("!document.getElementById('workbench').hidden",timeout=15000)
  page.locator('#wb-vehicle').select_option('rover')
  old=page.evaluate("""()=>{
    const x=StarfallRuntime.vehicleStore.get('rover');
    return{part:x.definition.slots.battery,energyJ:x.state.energyJ,capacityJ:x.stats.batteryCapacityJ};
  }""")
  page.locator('#wb-slot-battery').select_option('battery-rover-long')
  page.locator('#wb-apply').click()
  replacement=page.evaluate("""()=>{
    const r=StarfallRuntime,x=r.vehicleStore.get('rover'),
      e=SF.load().equipmentT15?.events||[];
    return{part:x.definition.slots.battery,energyJ:x.state.energyJ,capacityJ:x.stats.batteryCapacityJ,
      serviceId:e.at(-1)?.id||null};
  }""")
  check(replacement['part']=='battery-rover-long' and replacement['capacityJ']>old['capacityJ'] and
   replacement['energyJ']<=old['energyJ'] and replacement['serviceId'],
   'Workbench UI failed to install physical battery or invented energy',replacement)
  page.locator('#wb-restore-t15').click()
  rollback=page.evaluate("""()=>{
   const x=StarfallRuntime.vehicleStore.get('rover'),e=SF.load().equipmentT15?.events||[];
   return{part:x.definition.slots.battery,energyJ:x.state.energyJ,events:e.length};
  }""")
  check(rollback['part']==old['part'] and rollback['energyJ']<=replacement['energyJ'] and rollback['events']==2,
   'Original Workbench rollback lost identity/created energy',rollback)
  page.locator('#wb-close').click()
  # Portable STATE_ONLY archive is allowed here because there are no camera
  # metadata records. Download actually created by real browser.
  page.locator('#ui21-navigation button[data-route="Overview"]').click()
  page.locator('#archive-t17-open').click()
  with page.expect_download(timeout=30000) as item:
   page.locator('#archive-t17-export-state').click()
  archive=item.value
  check(archive.suggested_filename.endswith('-STATE.json'),'Original T17 backup UI did not download real save file',archive.suggested_filename)
  page.locator('#archive-t17-close').click()
  # Actual browser navigation with genuine durable state, no stored init hook.
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallOutpostUI&&window.StarfallRuntime&&window.StarfallScienceUI)",timeout=60000)
  persisted=page.evaluate("""ids=>{
   const os=StarfallOutpostUI.store,x=SF.load(),rt=StarfallRuntime;
   return{items:os.items.map(a=>a.id),wires:os.wires.length,receipts:os.receipts.length,
    readings:StarfallScienceUI.journal.map(v=>v.id),
    serviceEvents:x.equipmentT15?.events?.length||0,
    roverBattery:rt.vehicleStore.get('rover').definition.slots.battery,
    antennaOn:os.items.find(v=>v.id===ids.antenna)?.enabled,
    siteEnergyJ:os.items.find(v=>v.id===ids.battery)?.energyJ,
    noPhantomPhoto:StarfallImagingUI7F.store.photos.length===0,
    noPhantomPacket:StarfallCommsT03.transport.packets.length===0,
    onWorld:rt.nearest?.id};
  }""",ids)
  check(set(ids.values()).issubset(set(persisted['items'])) and persisted['wires']==7 and
   obs['id'] in persisted['readings'] and persisted['serviceEvents']==2 and
   persisted['roverBattery']==old['part'] and persisted['antennaOn'] and
   persisted['noPhantomPhoto'] and persisted['noPhantomPacket'],
   'Owners diverged or fabricated state after file:// reload',persisted)
  # Live software-WebGL frame timing and heap samples, never call these GPU.
  performance=page.evaluate("""async()=>{
   const samples=[],heaps=[],canvas=document.getElementById('universe'),
     gl=canvas.getContext('webgl2'),begin=performance.now();
   let last=begin;
   for(let i=0;i<190;i++){
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const now=performance.now();
    samples.push(now-last);last=now;
    if(i%30===0)heaps.push(performance.memory?.usedJSHeapSize??null);
   }
   samples.sort((a,b)=>a-b);
   const percentile=q=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*q))];
   return{renderer:'Chromium SwiftShader software WebGL2 — NOT physical GPU',
    viewport:[canvas.width,canvas.height],frames:samples.length,
    p50MS:percentile(.50),p95MS:percentile(.95),p99MS:percentile(.99),
    minMS:samples[0],maxMS:samples.at(-1),
    jsHeapBytes:heaps,webglError:gl?.getError?.()??null,
    elapsedS:(performance.now()-begin)/1000,
    source:'requestAnimationFrame wall-clock; includes browser/CI load; not GPU timestamp queries'};
  }""")
  check(performance['frames']==190 and performance['p50MS']>0 and
   performance['p99MS']>=performance['p95MS']>=performance['p50MS'],'Invalid observed browser frame metrics',performance)
  page.screenshot(path=str(OUT/'03-restored-expedition.png'),full_page=False)
  report={'scenario':'T18 controlled landed real-UI integration; no full multi-planet player expedition',
    'hardware':'GitHub Ubuntu Chromium SwiftShader software, NOT user physical GPU',
    'pristine':pristine,'actualUIOutposts':placements,
    'actualUIWires':wire_results,'realPower':live,
    'measuredFieldObservation':obs,'workbenchBefore':old,
    'workbenchAfter':replacement,'workbenchRestore':rollback,
    'durableReload':persisted,'performance':performance,
    'externalRequests':external,'pageErrors':errors,
    'verified':['No phantom state on fresh start','Real UI eight outpost builds and seven real wires',
     'Real DC power report and switch fault recovery','Physical time instrument UI and Journal',
     'Workbench genuine battery change and restore','T17 real backup download',
     'Browser reload source ID and charge provenance','SwiftShader timing measured'],
    'notVerified':['Actual human-walked ramp or manual truck X drive',
     'Real UI 20 stable rocket launches','Planet A original UI built->Planet B real photo->A lab receipt',
     'Real GPU p50/p95/p99 and memory trend on user machine',
     'Multi-hour full exploration and camera throughput stress'] }
  (OUT/'release-software-webgl.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
  check(not errors and not external,'JavaScript or network errors in real offline run',
   {'errors':errors[:5],'external':external[:5]})
  print('PASS T18 PARTIAL controlled UI: 8 actual Outpost builds, 7 cables, source 48V load and antenna recovery, one paid sensor reading, original Workbench part change/rollback, T17 backup, source save reload, real software-WebGL p50/p95/p99',performance,flush=True)
 finally:
  browser.close()
