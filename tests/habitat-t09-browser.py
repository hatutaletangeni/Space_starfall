#!/usr/bin/env python3
"""T09: actual STARFALL file:// Chromium 680 W hab power, finite gas, brownout
and leak, guard airlock, repair from finite tanks and on-disk reload.
Controlled existing Outpost Store fixture; no fake UI world or engine stub.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx=browser.new_context(viewport={'width':1270,'height':870})
  boot=ctx.new_page()
  boot.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function('!!window.StarfallHabitatT09 && !!window.StarfallRuntime',timeout=30000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,old=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
    position:[p[0],p[1]+b.radius+8,p[2]],attached:b.id,target:b.id,groundDirection:[0,1,0],
    up:[0,1,0],forward:[1,0,0],landed:true}});
   return SF.load();
  }""")
  # The sessionStorage marker can vanish across file:// page contexts. Do not
  # overwrite a genuinely persisted T09 habitat/wire graph with the original
  # empty landed boot fixture just because that auxiliary marker is missing.
  # Source-owned outpost data always wins over test initialization.
  ctx.add_init_script("""(()=>{
    let prior=null;
    try{prior=JSON.parse(localStorage.getItem('starfall_save')||'null');}catch(_){}
    // window.name is page-scoped and survives reload even if file://
    // sessionStorage is lost; this fixture must only seed a NEW page once.
    if(window.name==='starfall-t09-fixture-applied')return;
    if(prior?.outpost5?.items?.length||prior?.outpost5?.wires?.length){
      window.name='starfall-t09-fixture-applied';return;
    }
    if(sessionStorage.getItem('t09-fixture')){
      window.name='starfall-t09-fixture-applied';return;
    }
    localStorage.setItem('starfall_save',__T09_SAVED__);
    sessionStorage.setItem('t09-fixture','1');
    window.name='starfall-t09-fixture-applied';
  })()""".replace('__T09_SAVED__',json.dumps(json.dumps(saved))))
  boot.close()
  page=ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallOutpostUI && !!window.StarfallMissionOperationsUI && !!window.StarfallHabitatT09',timeout=40000)
  initial=page.evaluate("""()=>{
    const rt=StarfallRuntime,O=StarfallOutposts,H=StarfallHabitatT09,U=StarfallOutpostUI,
      ops=StarfallMissionOperationsUI,body=rt.nearest,ship=rt.engineeringAssetPoses().shipPose,
      store=U.store;
    if(!rt.landed||!ship?.local)throw Error('Actual landed ship fixture unavailable');
    const local=d=>O.offset(ship.local,[1,0,0],d,0,body.radius);
    const hab=store.add('hab',body,local(15),[1,0,0],()=>0).item,
      bat=store.add('battery',body,local(35),[1,0,0],()=>0).item,
      solar=store.add('solar',body,local(55),[1,0,0],()=>0).item;
    const h=store.items.find(x=>x.id===hab.id);
    if(H.inspect(h,body).enabled||H.inspect(h,body).state!=='STANDBY')
      throw Error('Existing habitat migration must be opt-in informational');
    let wire=U.powerReports.get(body.id)?.byId?.[hab.id];
    store.link(hab.id,bat.id,body);store.link(bat.id,solar.id,body);
    U.advancePowerTo(ops.clock.lastSimulatedS,(asset,t)=>ops.resolveBody(asset,t));
    const line=U.powerReports.get(body.id)?.byId?.[hab.id];
    if(!line?.power||line.servedW!==680)throw Error('Habitat NOT consuming actual 680W from original T02 bus '+JSON.stringify(line));
    H.command(h,'ENABLE',{near:true,powered:true,now:ops.clock.lastSimulatedS,body});
    U.advancePowerTo(ops.clock.lastSimulatedS+600,(asset,t)=>ops.resolveBody(asset,t));
    const status=H.inspect(h,body,U.powerReports.get(body.id)?.byId?.[hab.id]?.power===true);
    if(status.state!=='PRESSURIZED')throw Error('Controlled pressure after original wired grid '+JSON.stringify(status));
    U.persist();ops.persist();
    return{id:hab.id,batteryId:bat.id,solarId:solar.id,bodyId:body.id,at:ops.clock.lastSimulatedS,
      pressure:status.pressureKPa,temperature:status.temperatureK,
      o2:status.oxygenTankMol,served:line.servedW};
  }""")
  assert initial['served']==680 and initial['pressure']>70,initial
  page.locator('#ui21-navigation button[data-route="Engineer"]').click()
  page.locator('#outpost-open').click()
  page.locator('[data-outpost-tab="habitat"]').click()
  page.locator('#hab-t09-select').select_option(initial['id'])
  output=page.locator('#hab-t09-diagnostic').inner_text()
  assert 'PRESSURIZED' in output and '680 W' in output and 'OXYGEN' in output,output
  damaged=page.evaluate("""data=>{
   const H=StarfallHabitatT09,U=StarfallOutpostUI,ops=StarfallMissionOperationsUI,
     hab=U.store.items.find(x=>x.id===data.id),body=StarfallRuntime.nearest;
   // Actual physical wire disconnection, not a mocked report or radio response.
   U.store.unlink(data.id,data.batteryId);
   hab.habT09.seal=.32; // controlled meteorite seal-failure fixture
   U.advancePowerTo(hab.habT09.lastS+1300,(asset,t)=>ops.resolveBody(asset,t));
   const report=U.powerReports.get(hab.bodyId)?.byId?.[hab.id],
    state=H.inspect(hab,body,report?.power===true);
   let cycleError=null;try{H.command(hab,'CYCLE_OUT',{near:true,powered:true,body,now:state.lastS});}
    catch(e){cycleError=e.message;}
   U.persist();ops.persist();
   return{status:state.state,pressure:state.pressureKPa,temp:state.temperatureK,
    alarm:state.alarms,mode:state.airlock,wirePowered:report?.power,
    cycleError,oxygen:state.oxygenTankMol};
  }""",initial)
  assert damaged['wirePowered']==False and damaged['pressure']<70,damaged
  assert 'LEAK' in damaged['alarm'] and 'PRESSURE_UNSAFE' in damaged['alarm'],damaged
  assert 'HABITAT_UNSAFE' in damaged['cycleError'] and damaged['mode']=='CLOSED',damaged
  restored=page.evaluate("""data=>{
   const H=StarfallHabitatT09,U=StarfallOutpostUI,ops=StarfallMissionOperationsUI,
     hab=U.store.items.find(x=>x.id===data.id),body=StarfallRuntime.nearest,
     battery=U.store.items.find(x=>x.id===data.batteryId);
   const stamp=hab.habT09.lastS;
   U.store.link(data.id,data.batteryId,body);
   H.command(hab,'REPAIR',{near:true,now:stamp,powered:true,body});
   const low=H.inspect(hab,body,true).pressureKPa;
   U.advancePowerTo(stamp+2500,(asset,t)=>ops.resolveBody(asset,t));
   const powered=U.powerReports.get(body.id)?.byId?.[hab.id]?.power===true,
     state=H.inspect(hab,body,powered);
   if(!powered)throw Error('Real grid failed after reconnect');
   if(state.pressureKPa<=low)throw Error('Repair invented no pressure recovery using finite real tank');
   const inventory=state.oxygenTankMol;
   U.persist();ops.persist();
   return{pressure:state.pressureKPa,pre:low,seal:state.seal,energy:battery.energyJ,
    inventory,at:state.lastS,healthy:state.healthy,mode:state.state,
    sourceA:U.powerReports.get(body.id)?.byId?.[hab.id]?.sourceIds};
  }""",initial)
  assert restored['pressure']>damaged['pressure'] and restored['inventory']<damaged['oxygen'],restored
  # Inspect UI after full site recovery; the controls must preserve other game bindings.
  page.evaluate("StarfallOutpostUI.refresh()")
  output=page.locator('#hab-t09-diagnostic').inner_text()
  assert initial['id'] in output and 'O₂ CYLINDER' in output and 'AIRLOCK' in output,output
  page.evaluate("""()=>{
    const rt=StarfallRuntime,clock=StarfallMissionOperationsUI.clock,
      old=SF.load().flightGalaxy||{};
    StarfallOutpostUI.persist();StarfallMissionOperationsUI.persist();
    SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:clock.lastSimulatedS}});
  }""")
  savedCheck=page.evaluate("""id=>{
    const raw=JSON.parse(localStorage.getItem('starfall_save')||'{}'),
     hab=raw.outpost5?.items?.find(x=>x.id===id);
    return{items:raw.outpost5?.items?.length,hasHab:!!hab,
      schema:hab?.habT09?.schema,last:hab?.habT09?.lastS,
      oxygen:hab?.habT09?.oxygenTankMol,pressure:hab?.habT09?.totalKPa,
      wires:raw.outpost5?.wires?.length};
  }""",initial['id'])
  assert savedCheck['hasHab'] and savedCheck['schema']==1 and savedCheck['wires']==2,savedCheck
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!window.StarfallHabitatT09 && !!window.StarfallOutpostUI',timeout=40000)
  after=page.evaluate("""id=>{
    const U=StarfallOutpostUI,hab=U.store.items.find(x=>x.id===id),
     b=StarfallRuntime.galaxy.byId.get(hab?.bodyId),H=StarfallHabitatT09;
    const raw=JSON.parse(localStorage.getItem('starfall_save')||'{}'),state=SF.load();
    return{exists:!!hab,config:hab?.habT09?.schema,pressure:hab?.habT09?.totalKPa,
     tank:hab?.habT09?.oxygenTankMol,wires:U.store.wires.length,
     mode:hab?H.inspect(hab,b,true).state:'NO_SOURCE_HABITAT',
     gridLoad:StarfallOutposts.SPECS.hab.watts,
     xControlStillExists:!!document.getElementById('controls-modal'),
     debug:{sessionMarker:sessionStorage.getItem('t09-fixture'),
       runtimeSeed:StarfallRuntime.galaxy.seed,storeSeed:U.store.seed,
       rawItems:raw.outpost5?.items?.length,rawIds:raw.outpost5?.items?.map(x=>x.id),
       sfItems:state.outpost5?.items?.length,
       rawStoredHab:raw.outpost5?.items?.find(x=>x.id===id)?.habT09?.schema,
       rawBytes:(localStorage.getItem('starfall_save')||'').length,
       restoreCount:U.store.items.length}};

  }""",initial['id'])
  assert after['exists'] and after['config']==1 and after['wires']==2,after
  assert abs(after['tank']-savedCheck['oxygen'])<1e-3,after
  assert after['gridLoad']==680 and after['xControlStillExists'],after
  assert not errors,errors
  print('PASS T09 real file:// Chromium: real Outpost hab and wired 48V 680 W battery/solar, finite gas/HVAC, unplug+leak pressure fault, unsafe airlock blocked, physical reconnect+repair, real saved gas inventory and cables reload, original EVA/ship controls retained')
 finally:
  browser.close()
