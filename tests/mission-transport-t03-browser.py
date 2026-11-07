#!/usr/bin/env python3
"""T03 real offline Chromium link: actual ship battery, actual rover geometry,
existing radioLink occlusion, program transfer, blackout and reload.
No stubbed link/connectivity; controlled installed rover fixture only.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        context=browser.new_context(viewport={'width':1200,'height':760})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallRuntime && window.StarfallCommsT03 && window.StarfallMissionOperationsUI)",timeout=30000)
        # Use actual saved landed flight, not stubbing the transceiver endpoint.
        landed_save=page.evaluate("""()=>{
          const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,
          up=[0,1,0],save=SF.load().flightGalaxy||{};
          SF.save({flightGalaxy:{...save,seed:rt.galaxy.seed,time:0,
            position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,
            attached:b.id,groundDirection:up,forward:[0,0,1],up,landed:true}});
          return SF.load();
        }""")
        # The live first tab can autosave its orbital position while a second WebGL
        # tab boots; initialize the landed record before that tab's JS starts.
        # A localStorage sentinel survives file:// reloads reliably; sessionStorage may not.
        snapshot=json.dumps(json.dumps(landed_save))
        # Do not replace a newer real rover/comms save with the old landed
        # fixture if file:// origin policy drops an auxiliary localStorage key.
        # The marker alone is insufficient proof that the save is still the
        # original fixture; inspect actual persisted mission custody first.
        context.add_init_script("""(()=>{
          // Never replay the old landed fixture on a true reload. A reload
          // must prove genuine packet and rover persistence, not reseed it.
          if(performance.getEntriesByType('navigation')[0]?.type==='reload')return;
          const raw=localStorage.getItem('starfall_save');
          let state=null;try{state=raw?JSON.parse(raw):null;}catch(_){}
          if(state?.commsT03?.packets?.length||state?.launch7?.rovers?.length)return;
          if(localStorage.getItem('t03-fixture-installed'))return;
          localStorage.setItem('starfall_save',__T03_FIXTURE__);
          localStorage.setItem('t03-fixture-installed','1');
        })()""".replace('__T03_FIXTURE__',snapshot))
        # Close the old simulation BEFORE the new one boots. Otherwise its
        # pagehide save can overwrite source-owned launched rover packet state.
        # The init-script now restores the precise landed fixture on the new tab.
        page.close()
        page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallRuntime && window.StarfallCommsT03)",timeout=30000)
        setup=page.evaluate("""()=>{
          const rt=StarfallRuntime,UI=StarfallLaunchUI,O=StarfallOutposts,T=StarfallCommsT03,
            body=rt.nearest,ship=rt.engineeringAssetPoses().shipPose;
          if(!rt.landed||!ship)throw Error('Genuine ship ground transceiver not present: '+JSON.stringify({landed:rt.landed,pose:rt.engineeringAssetPoses(),ctx:rt.outpostContext(),save:SF.load().flightGalaxy?.landed,bodyId:body.id}));
          const local=O.offset(ship.local,[1,0,0],6,0,body.radius);
          const rover={id:'t03-live-probe',bodyId:body.id,systemId:body.systemId,
            local,batteryJ:5000000,status:'parked',heading:0,lastS:rt.time,
            commands:[],index:0,records:[]};
          UI.store.rovers.push(rover);
          const direct=T.routeFor({bodyId:body.id,systemId:body.systemId,
            sourceId:'starfall-ship',destId:rover.id},rt.time);
          if(!direct.connected)throw Error('Actual same-body radio geometry failed: '+direct.reason);
          const q=T.command(rover,['WAIT 5','STOP'].join(String.fromCharCode(10)),rt.time);
          T.persist();
          return{landed:rt.landed,bodyId:body.id,route:direct.hops,
            packet:q.id,shipEnergy:rt.vehicleStore.get('ship').state.energyJ};
        }""")
        assert setup['landed'] and setup['route']==['starfall-ship','t03-live-probe'],setup
        state=page.evaluate("""()=>{
          const rt=StarfallRuntime,ops=StarfallMissionOperationsUI,T=StarfallCommsT03;
          const rover=StarfallLaunchUI.store.rovers.find(r=>r.id==='t03-live-probe');
          for(let i=0;i<12;i++)ops.advanceTo((i+1)*5);
          return {packet:T.transport.list()[0],roverStatus:rover.status,
            shipEnergy:rt.vehicleStore.get('ship').state.energyJ,
            commands:rover.commands.map(c=>c.op)};
        }""")
        assert state['packet']['state']=='ACKED',state
        assert state['shipEnergy']<setup['shipEnergy'],state
        assert state['commands']==['WAIT','STOP'],state
        # Real receiver loses power; packet waits without a fake ACK.
        blocked=page.evaluate("""()=>{
          const rt=StarfallRuntime,T=StarfallCommsT03,v=rt.vehicleStore.get('ship');
          rt.vehicleStore.update('ship',{...v.state,energyJ:0});
          const r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t03-live-probe'),
          q=T.command(r,'STOP',70,true);
          for(let t=65;t<=90;t+=5)StarfallMissionOperationsUI.advanceTo(t);
          return {packet:T.transport.get(q.id),route:T.routeFor(q,90)};
        }""")
        assert blocked['packet']['state'] in ('WAITING_FOR_ROUTE','OFFLINE','PAUSED'),blocked
        assert blocked['packet']['sendBytes']==0,blocked
        assert not blocked['route']['connected'],blocked
        # Put battery back and persist a currently queued packet.
        persisted=page.evaluate("""()=>{
          const rt=StarfallRuntime,v=rt.vehicleStore.get('ship');
          rt.vehicleStore.update('ship',{...v.state,energyJ:2000000});
          const at=StarfallMissionOperationsUI.clock.lastSimulatedS;
          STARFALL_DEBUG.setSimulationTime(at);
          StarfallCommsT03.persist();
          StarfallMissionOperationsUI.persist();
          const old=SF.load().flightGalaxy||{};
          SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:at}});
          const value=SF.load(),raw=JSON.parse(localStorage.getItem('starfall_save')||'{}');
          return{packets:value.commsT03?.packets?.length||0,rovers:value.launch7?.rovers?.length||0,
            diskPackets:raw.commsT03?.packets?.length||0,diskRovers:raw.launch7?.rovers?.length||0,
            guard:localStorage.getItem('t03-fixture-installed'),bytes:JSON.stringify(raw).length};
        }""")
        assert persisted['packets']>=2 and persisted['rovers']>=1 and persisted['diskPackets']>=2 and persisted['diskRovers']>=1,persisted
        # Flight pagehide is an independent owner and can issue a stale save
        # while the browser closes this page. Read back the REAL source owner
        # first (above), then prevent only that old-page overwrite on reload.
        # After reload the fresh runtime must independently restore all IDs.
        page.evaluate("window.__STARFALL_IMPORT_PENDING=true")
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("!!(window.StarfallCommsT03 && window.StarfallLaunchUI)",timeout=30000)
        restored=page.evaluate("""()=>{
          const T=StarfallCommsT03,ops=StarfallMissionOperationsUI,
          r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t03-live-probe');
          const pending=T.transport.list().find(p=>p.type==='EMERGENCY_STOP');
          if(!r||!pending)throw Error('Queued real packet or rover missing after save: '+JSON.stringify({
           savedRovers:SF.load().launch7?.rovers?.map(v=>v.id),loadedRovers:StarfallLaunchUI.store.rovers.map(v=>v.id),
           savedPackets:SF.load().commsT03?.packets?.map(v=>v.id),loadedPackets:T.transport.list().map(v=>v.id),
           savedLaunchSeed:SF.load().launch7?.seed,runtimeSeed:StarfallRuntime.galaxy.seed,
           storedByteCount:localStorage.getItem('starfall_save')?.length||0
          }));
          for(let i=0;i<10;i++)ops.advanceTo(95+i*5);
          const p=T.transport.get(pending.id);
          const rt=StarfallRuntime,ship=rt.vehicleStore.get('ship'),pose=rt.engineeringAssetPoses(),route=T.routeFor(p,ops.clock.lastSimulatedS);
          const disk=SF.load();
          return {packet:p,rover:r.status,receipts:T.transport.receipts.filter(x=>x===pending.id).length,
            diagnostic:{landed:rt.landed,attached:rt.attached?.id||rt.attached,
              nearest:rt.nearest?.id,shipPose:pose.shipPose,
              shipEnergyJ:ship?.state?.energyJ,route,
              clockS:ops.clock.lastSimulatedS,
              savedFlight:{landed:disk.flightGalaxy?.landed,attached:disk.flightGalaxy?.attached,
                position:disk.flightGalaxy?.position,time:disk.flightGalaxy?.time},
              roverLocal:r.local,roverBatteryJ:r.batteryJ,
              persistedPacketCount:disk.commsT03?.packets?.length}};
        }""")
        assert restored['packet']['state']=='ACKED',restored
        assert restored['receipts']==1,restored
        assert not errors,errors
        print('PASS T03 real browser: powered landed ship→real geometry rover command; battery draw, receiver power blackout blocks radio, file:// persisted packet resumes and ACKs exactly once')
    finally:
        browser.close()
