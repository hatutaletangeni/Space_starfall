#!/usr/bin/env python3
"""T13 real Chromium file:// regression. Controlled landed-fixture setup, real
in-game owners and integrated DOM; no claim of physical landing/flight test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx=browser.new_context(viewport={'width':1240,'height':800})
  errors=[]
  boot=ctx.new_page();boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(url,wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function("!!(window.StarfallRuntime&&window.StarfallShipT13&&window.StarfallEngineeringUI)",timeout=45000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,s=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
    groundDirection:[0,1,0],forward:[0,0,1],up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  # Use the SAME real file:// page to bootstrap the landed flight from the
  # real browser save. Suppress only the obsolete orbital pagehide write
  # during this controlled test-fixture reload. Unlike context init scripts,
  # this never rewrites the later physical docking receipt on genuine reload.
  boot.evaluate("window.__STARFALL_IMPORT_PENDING=true")
  page=boot
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallShipT13&&window.StarfallRuntime&&window.StarfallScienceUI&&window.StarfallLaunchUI)",timeout=45000)
  initial=page.evaluate("""()=>{
   const rt=StarfallRuntime;
   if(!rt.landed||!rt.eva||rt.truckOccupied)throw Error('True landed EVA ship expected');
   const poses=rt.engineeringAssetPoses();
   if(!poses.shipPose?.local||!poses.roverPose?.local)throw Error('Actual local rover/ship not present');
   if(!rt.shipServiceTargetsT13().some(x=>x.kind==='local-rover'))throw Error('No real nearby local rover to dock');
   const ship=rt.vehicleStore.get('ship');
   const v=rt.shipServiceSnapshotT13();
   if(!v.radio.ready||v.connectedTarget!=='none')throw Error('Legacy ship emergency must be battery-powered and disconnected');
   rt.vehicleStore.setPower('ship',true);
   rt.persistVehicles();
   return{shipId:ship.definition.id,roverId:rt.vehicleStore.get('rover').definition.id,bodyId:rt.nearest.id,
    shipPose:poses.shipPose,roverPose:poses.roverPose};
  }""")
  page.wait_for_function("""()=>{
   const r=StarfallRuntime.engineeringSystemReport().ship,v=StarfallRuntime.vehicleStore.get('ship');
   return !!(r&&r.draws.avionics>=v.stats.avionicsW&&r.draws.instruments>=v.stats.instrumentsW);
  }""",timeout=15000)
  # UI21 places electrical systems under the Engineer route; click the visible route first.
  # UI22 deliberately hides the legacy nav. Open the visible Mission → Build
  # workspace, which selects the original Engineer route and keeps its controls.
  page.locator('#sf-mission-button').click()
  page.locator('#sf-mission-flow .sf-flow-step').filter(has_text='Build').click()
  page.locator('#sf-mission-flow .sf-flow-workspace').click()
  page.locator('#systems-toggle').click()
  page.wait_for_function("!document.querySelector('#systems-inner').hidden && !document.querySelector('#ship-t13-panel').hidden")
  status=page.locator('#ship-t13-readout').inner_text()
  assert 'DOCK UNDOCKED' in status and 'SHIP' in status,status
  complete=page.evaluate("""id=>{
   const rt=StarfallRuntime,v=rt.vehicleStore,before=rt.engineeringAssetPoses(),
    shipBefore=v.get('ship').state.energyJ,roverBefore=v.get('rover').state.energyJ;
   const check=rt.shipDockConnectT13(id);
   if(check.state!=='LATCHED'||rt.safeToReconfigure('ship'))throw Error('Dock latch or Workbench takeoff interlock failed');
   if(JSON.stringify(before.shipPose)!==JSON.stringify(rt.engineeringAssetPoses().shipPose)||
      JSON.stringify(before.roverPose)!==JSON.stringify(rt.engineeringAssetPoses().roverPose))
     throw Error('Docking magically relocated vehicle');
   const obs=StarfallScienceUI.measure('thermometer',true);
   if(obs.sourceAssetId!==id||obs.probeId!==id)throw Error('Local rover measurement lacks source ID');
   const d=rt.shipDockReceiveT13(obs.id),again=rt.shipDockReceiveT13(obs.id);
   if(d.duplicate||!again.duplicate||again.energyJ!==d.energyJ)throw Error('Double billed or duplicated observation');
   const thermal=rt.shipThermalObserveT13();
   if(thermal.sourceAssetId!=='starfall-ship'||!StarfallScienceUI.journal.some(x=>x.id===thermal.id))throw Error('Ship sensor not in source-owned Science Journal');
   const afterSensor=v.get('ship').state.energyJ,rv=v.get('rover').state.energyJ;
   const e=rt.shipDockChargeT13();
   const shipAfter=v.get('ship').state.energyJ,roverAfter=v.get('rover').state.energyJ;
   if(!(e.drawnJ>e.deliveredJ&&e.deliveredJ>0&&e.lossJ>0))throw Error('T02 transfer has no real efficiency loss');
   if(Math.abs((roverAfter-rv)-e.deliveredJ)>1e-5||Math.abs((afterSensor-shipAfter)-e.drawnJ)>1e-5)
    throw Error('Ship-to-rover energy owners did not get exact debit/credit');
   if(!rt.landed||rt.truckOccupied||!rt.eva)throw Error('Docking unexpectedly boarded/moved avatar');
   const s=SF.load().flightGalaxy.shipDockT13;
   if(s.state!=='LATCHED'||s.receipts.filter(x=>x.observationId===obs.id).length!==1)throw Error('Saved ship latch or custody receipt missing');
   return{observationId:obs.id,thermalId:thermal.id,sourceShipJ:shipBefore,sourceRoverJ:roverBefore,
    lossJ:e.lossJ,drawnJ:e.drawnJ,deliveredJ:e.deliveredJ,receiptCount:s.receipts.length};
  }""",initial['roverId'])
  # Validate the actual durable browser bytes, not only SF.load()'s in-memory
  # fallback, before asking a new page instance to restore T13 custody.
  durable=page.evaluate("""ids=>{
   const status=SF.storageStatus(),raw=localStorage.getItem('starfall_save');
   let disk=null;try{disk=raw?JSON.parse(raw):null;}catch(error){throw Error('T13 save JSON is corrupt: '+error.message)}
   const dock=disk?.flightGalaxy?.shipDockT13;
   return{status,bytes:raw?.length||0,rawState:dock?.state||null,
    targetId:dock?.targetId||null,receiptCount:dock?.receipts?.length||0,
    foundReceipt:!!dock?.receipts?.some(x=>x.observationId===ids.observationId),
    memoryState:StarfallRuntime.shipServiceSnapshotT13().state};
  }""",complete)
  assert durable['status']['durable'],f"T13 browser storage is not durable: {durable}"
  assert durable['rawState']=='LATCHED' and durable['foundReceipt'],f"T13 save did not reach localStorage: {durable}"
  page.on('console',lambda msg: print('T13 CONSOLE',msg.text) if 'T13 reload diagnostic' in msg.text else None)
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallShipT13&&window.StarfallScienceUI)",timeout=45000)
  restored=page.evaluate("""ids=>{
   const rt=StarfallRuntime,info=rt.shipServiceSnapshotT13(),saved=SF.load().flightGalaxy.shipDockT13;
   const raw=localStorage.getItem('starfall_save');let disk=null;
   try{disk=raw?JSON.parse(raw):null;}catch(e){}
   const persisted=disk?.flightGalaxy?.shipDockT13;
   console.info('T13 reload diagnostic',JSON.stringify({runtime:info.state,loaded:saved?.state,
    persisted:persisted?.state,loadedReceipts:saved?.receipts?.length,
    persistedReceipts:persisted?.receipts?.length,expected:ids.observationId,
    loadedHasReceipt:saved?.receipts?.some(x=>x.observationId===ids.observationId),
    persistedHasReceipt:persisted?.receipts?.some(x=>x.observationId===ids.observationId),
    landed:rt.landed,storage:SF.storageStatus()}));
   if(info.state!=='LATCHED'||!saved.receipts.some(x=>x.observationId===ids.observationId))
    throw Error('Docking/received record did not survive genuine localStorage reload');
   if(!StarfallScienceUI.journal.some(x=>x.id===ids.thermalId))throw Error('Ship sensor scientific reading missing after reload');
   const before=rt.engineeringAssetPoses();
   rt.shipDockUndockT13();
   if(!rt.safeToReconfigure('ship')||rt.shipServiceSnapshotT13().state!=='UNDOCKED')throw Error('Undock did not unlock original ship Workbench');
   if(JSON.stringify(before.shipPose)!==JSON.stringify(rt.engineeringAssetPoses().shipPose)||
      JSON.stringify(before.roverPose)!==JSON.stringify(rt.engineeringAssetPoses().roverPose))
      throw Error('Undocking moved ship or rover');
   return{receiptCount:saved.receipts.length,shipTemperatureK:rt.vehicleStore.get('ship').state.temperatureK};
  }""",complete)
  assert not errors,errors
  print('PASS T13 real file:// software WebGL: powered ship radio, actual physical dock, 48V ship-to-rover metered joules, actual rover measurement receipt once, hull thermistor Journal, save/reload latch, undock no reposition',initial['bodyId'],complete,restored)
 finally:
  browser.close()
