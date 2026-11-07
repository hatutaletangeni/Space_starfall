#!/usr/bin/env python3
"""T01 real offline Chromium integration (software WebGL, NOT GPU/manual acceptance).
Checks authoritative unloaded-world model, saved cursor and deterministic resume.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1100,'height':780})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallMissionOperationsUI && window.StarfallLaunchUI && window.StarfallRuntime)",timeout=30000)
        before=page.evaluate("""()=>{
          const rt=StarfallRuntime,ops=StarfallMissionOperationsUI,store=StarfallLaunchUI.store;
          const planet=rt.galaxy.byId.get('star-1-p0');
          if(!planet||planet.id===rt.nearest.id)throw Error('Distant test planet absent');
          const t=ops.clock.lastSimulatedS;
          const r={id:'test-t01-remote-rover',systemId:planet.systemId,bodyId:planet.id,
            local:[0,1,0],batteryJ:2000000,status:'running',lastS:t,records:[],heading:0,
            commands:[{op:'WAIT',value:20},{op:'STOP'}],index:0,remaining:0};
          const s={id:'test-t01-remote-sat',kind:'observatory',systemId:planet.systemId,bodyId:planet.id,
            epochS:t,altitudeM:100000,phase:0,axis:[0,1,0],
            mu:planet.gravity*9.80665*Math.pow(planet.radius*1000,2),powerJ:5000000};
          store.rovers.push(r);store.satellites.push(s);
          const report=ops.advanceTo(t+60);
          // Capture and persist every owner at one authoritative mission time
          // in this SAME JS turn. Leaving this to a later page.evaluate()
          // permits requestAnimationFrame to consume an extra fraction/step
          // of battery between the asserted snapshot and saved evidence.
          const at=ops.clock.lastSimulatedS,old=SF.load().flightGalaxy||{};
          STARFALL_DEBUG.setSimulationTime(at);
          SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:at}});
          ops.persist();
          const disk=SF.load(),savedSat=disk.launch7?.satellites?.find(x=>x.id===s.id);
          return {savedSatEnergy:savedSat?.ops7c?.energyJ,
            savedSatLast:savedSat?.ops7c?.lastS,
            savedClock:disk.missionOperationsT01?.lastSimulatedS,
            report,beforeRoverEnergy:2000000,roverEnergy:r.batteryJ,status:r.status,
            roverLast:r.ground7d?.lastTickS,satelliteLast:s.ops7c?.lastS,
            satelliteEnergy:s.ops7c?.energyJ,runTo:ops.clock.lastSimulatedS,
            playerBody:rt.nearest.id,remoteBody:planet.id};
        }""")
        assert before['remoteBody']!=before['playerBody'],before
        assert before['report']['status'] in ('CURRENT','CATCHING_UP'),before
        assert before['status'] in ('parked','complete'),before
        assert before['roverEnergy']<before['beforeRoverEnergy'] and before['roverEnergy']>=0,before
        assert before['satelliteLast'] is not None and before['satelliteEnergy']>=0,before
        assert before['savedSatEnergy'] is not None,before
        assert abs(before['savedSatEnergy']-before['satelliteEnergy'])<1e-6,before
        # The preceding atomic simulation turn already persisted the exact source and flight clock.
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallMissionOperationsUI && window.StarfallLaunchUI)",timeout=30000)
        after=page.evaluate("""()=>{
          const ops=StarfallMissionOperationsUI,s=StarfallLaunchUI.store,
          rover=s.rovers.find(x=>x.id==='test-t01-remote-rover'),
          satellite=s.satellites.find(x=>x.id==='test-t01-remote-sat');
          return {present:!!rover&&!!satellite,clock:ops.clock.lastSimulatedS,
            roverEnergy:rover?.batteryJ,roverState:rover?.status,satEnergy:satellite?.ops7c?.energyJ,
            replay:ops.advanceTo(ops.clock.lastSimulatedS).status};
        }""")
        # The 3D runtime RAF continues while Chromium navigates/reloads file://.
        # T01 deterministic model tests check exact saved/replayed mission ticks;
        # browser startup may legitimately debit a FRACTIONAL frame of standby
        # vehicle watts after the snapshot. 1 J on a 2 MJ rover is <0.00005%;
        # a 50 J bounded 7C solar/thermal frame is <0.001% of its 5 MJ pack.
        # These tight thresholds still reject a duplicate 5 s drive,
        # unbounded battery creation, missing owner or a rewind.
        assert after['present'],(before,after)
        assert 0<=after['roverEnergy']<=before['roverEnergy']+1e-6,(before,after)
        assert abs(after['roverEnergy']-before['roverEnergy'])<=1.0,(before,after)
        assert after['satEnergy']>=0 and abs(after['satEnergy']-before['satelliteEnergy'])<=50.0,(before,after)
        assert after['clock']>=before['runTo']-1e-7,(before,after)
        assert not errors,errors
        print('PASS T01 browser: remote rover WAIT/STOP + battery and satellite 7C state updated off-world; saved/reloaded within 1J rover / 50J satellite RAF start tolerance, software-WebGL no JavaScript errors')
    finally:
        browser.close()
