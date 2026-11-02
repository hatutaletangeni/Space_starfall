#!/usr/bin/env python3
"""T04: real browser game, actual antenna grid + LOS, UI aiming, finite source-owned
tower custody, blackout forwarding and journal; no mocked link availability.
Fixtures use the real Outposts Store placement and StarfallFieldScience sampler.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        context=browser.new_context(viewport={'width':1220,'height':800})
        initial=context.new_page()
        failures=[]
        initial.on('pageerror',lambda e:failures.append(str(e)))
        initial.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        initial.wait_for_function('!!(window.StarfallRuntime && window.StarfallCommsT03 && window.StarfallAntennaT04)',timeout=30000)
        saved=initial.evaluate("""()=>{
          const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,up=[0,1,0],old=SF.load().flightGalaxy||{};
          SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,
            position:[p[0],p[1]+b.radius+8,p[2]],target:b.id,attached:b.id,
            groundDirection:up,forward:[0,0,1],up,landed:true}});
          return SF.load();
        }""")
        snapshot=json.dumps(json.dumps(saved))
        context.add_init_script("(()=>{if(localStorage.getItem('t04-fixture-installed'))return;localStorage.setItem('starfall_save',"+snapshot+");localStorage.setItem('t04-fixture-installed','1');})()")
        page=context.new_page()
        page.on('pageerror',lambda e:failures.append(str(e)))
        page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!(window.StarfallRuntime && window.StarfallCommsT03 && window.StarfallAntennaT04)',timeout=30000)
        initial.close()
        setup=page.evaluate("""()=>{
          const rt=StarfallRuntime,site=StarfallOutpostUI,O=StarfallOutposts,T=StarfallCommsT03;
          const body=rt.nearest,ship=rt.engineeringAssetPoses().shipPose,db=site.store;
          if(!rt.landed||!ship?.local)throw Error('Actual landed ship equipment not restored');
          const local=d=>O.offset(ship.local,[1,0,0],d,0,body.radius);
          const add=(kind,d)=>db.add(kind,body,local(d),[1,0,0],()=>0).item.id;
          const solar=add('solar',10),battery=add('battery',24),tower=add('antenna',38);
          db.link(solar,battery,body);db.link(battery,tower,body);
          const rover={id:'t04-real-rover',bodyId:body.id,systemId:body.systemId,
            local:local(72),batteryJ:5000000,status:'parked',heading:0,lastS:rt.time,
            commands:[],index:0,records:[]};
          StarfallLaunchUI.store.rovers.push(rover);
          site.advancePowerTo(rt.time,()=>body);
          const q={sourceId:'starfall-ship',destId:rover.id,bodyId:body.id,systemId:body.systemId};
          const route=T.routeFor(q,rt.time),Opos=body.position;
          const roRad=O.rotate(rover.local,body.spinAxis||[0,1,0],body.spinAngle||0);
          const shRad=O.rotate(ship.local,body.spinAxis||[0,1,0],body.spinAngle||0);
          const a=O.V.add(Opos,O.V.mul(shRad,body.radius+12)),b=O.V.add(Opos,O.V.mul(roRad,body.radius+3));
          const direct=O.radioLink(a,b,[{position:Opos,radius:body.radius}],45,StarfallPhysics.SCENE_METERS_PER_UNIT);
          if(direct.connected)throw Error('The controlled rover must be outside the direct ship mast range');
          if(!route.connected||route.hops.join(',')!==['starfall-ship',tower,rover.id].join(','))throw Error('Expected powered true multi-hop tower route: '+JSON.stringify(route));
          site.persist();T.persist();
          return{solar,battery,tower,bodyId:body.id,route:route.hops,quality:route.quality,
            grid:site.powerReports.get(body.id).byId[tower].loadW};
        }""")
        assert setup['quality']>0 and setup['grid']==165,setup
        page.locator('#outpost-open').evaluate('(el)=>el.click()')
        page.locator('[data-outpost-tab="comms"]').evaluate('(el)=>el.click()')
        page.locator('#outpost-radio-device').select_option(setup['tower'])
        page.evaluate('StarfallOutpostUI.refresh()')
        info=page.locator('#outpost-radio-diagnostic').inner_text()
        assert setup['tower'] in info and 'BUFFER' in info and '165 W' in info,info
        page.locator('#outpost-radio-target').select_option('t04-real-rover')
        page.locator('#outpost-radio-aim').evaluate('(el)=>el.click()')
        away=page.evaluate("""()=>{
          const rt=StarfallRuntime,r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t04-real-rover');
          return StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:r.id,bodyId:r.bodyId,systemId:r.systemId},rt.time);
        }""")
        assert not away['connected'],away
        page.locator('#outpost-radio-reset').evaluate('(el)=>el.click()')
        page.locator('#outpost-radio-mode').select_option('tracking')
        page.locator('#outpost-radio-target').select_option('starfall-ship')
        page.locator('#outpost-radio-apply').evaluate('(el)=>el.click()')
        tracking=page.evaluate("""id=>{
          const b=StarfallRuntime.nearest;
          return StarfallOutpostUI.powerReports.get(b.id).byId[id].servedW;
        }""",setup['tower'])
        assert tracking==200,tracking
        page.locator('#outpost-radio-reset').evaluate('(el)=>el.click()')
        page.locator('#outpost-radio-power').evaluate('(el)=>el.click()')
        offline=page.evaluate("""()=>{
          const rt=StarfallRuntime,r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t04-real-rover');
          return StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:r.id,bodyId:r.bodyId,systemId:r.systemId},rt.time);
        }""")
        assert not offline['connected'],offline
        page.locator('#outpost-radio-power').evaluate('(el)=>el.click()')
        online=page.evaluate("""()=>{
          const rt=StarfallRuntime,r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t04-real-rover');
          return StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:r.id,bodyId:r.bodyId,systemId:r.systemId},rt.time);
        }""")
        assert online['connected'],online
        received=page.evaluate("""()=>{
          const rt=StarfallRuntime,T=StarfallCommsT03,ops=StarfallMissionOperationsUI,site=StarfallOutpostUI;
          const r=StarfallLaunchUI.store.rovers.find(x=>x.id==='t04-real-rover'),G=StarfallGroundOps7D;
          const obs=StarfallFieldScience.sample({body:rt.nearest,seed:rt.galaxy.seed,local:r.local,altitudeM:0.6,
            instrument:'thermometer',simTime:rt.time,nonce:0,energyAvailableJ:r.batteryJ});
          const rec={...obs,id:'t04-test-real-thermometer',probeId:r.id,sourceAssetId:r.id};
          r.batteryJ-=obs.powerJ;r.records.push(rec);G.migrate(r).queuedObservations.push(rec);
          const v=rt.vehicleStore.get('ship');rt.vehicleStore.update('ship',{...v.state,energyJ:0});
          for(let i=0;i<12;i++)ops.advanceTo(5*(i+1));
          const tower=site.store.items.find(x=>x.id==='__TOWER__');
          return{inbox:tower?.radioT04?.inbox||[],packet:T.transport.get('comms-obs-'+rec.id),
            received:!!StarfallScienceUI.journal?.find(x=>x.id===rec.id)};
        }""".replace('__TOWER__',setup['tower']))
        assert len(received['inbox'])==1 and received['packet']['state']=='ACKED',received
        assert not received['received'],'tower custody must not count as ship journal receipt'
        # Restore the actual ship receiver's stored battery for next contact window.
        delivered=page.evaluate("""()=>{
          const rt=StarfallRuntime,v=rt.vehicleStore.get('ship'),ops=StarfallMissionOperationsUI;
          rt.vehicleStore.update('ship',{...v.state,energyJ:2500000});
          for(let t=65;t<=180;t+=5)ops.advanceTo(t);
          const packet=StarfallCommsT03.transport.get('comms-forward-comms-obs-t04-test-real-thermometer'),
            site=StarfallOutpostUI,record=StarfallScienceUI.journal?.find(x=>x.id==='t04-test-real-thermometer');
          return{packet,receipt:!!record,towerInbox:site.store.items.find(x=>x.id==='__TOWER__')?.radioT04?.inbox.length||0};
        }""".replace('__TOWER__',setup['tower']))
        assert delivered['packet']['state']=='ACKED' and delivered['receipt'] and delivered['towerInbox']==0,delivered
        page.evaluate("""()=>{
          StarfallCommsT03.persist();StarfallOutpostUI.persist();StarfallMissionOperationsUI.persist();
          const rt=StarfallRuntime,old=SF.load().flightGalaxy||{};
          SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:StarfallMissionOperationsUI.clock.lastSimulatedS}});
        }""")
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!(window.StarfallAntennaT04 && window.StarfallCommsT03)',timeout=30000)
        after=page.evaluate("""id=>{
          const tower=StarfallOutpostUI.store.items.find(x=>x.id===id);
          return{radio:tower?.radioT04,linked:StarfallOutpostUI.store.wires.some(w=>w.a===id||w.b===id),
            receipt:StarfallCommsT03.transport.receipts.filter(x=>x==='comms-forward-comms-obs-t04-test-real-thermometer').length};
        }""",setup['tower'])
        assert after['radio']['mode']=='omni' and after['linked'] and after['receipt']==1,after
        assert not failures,failures
        print('PASS T04 real file:// Chromium: genuine wired powered antenna, 2-hop LOS, fixed-pointing loss, 35W tracking, radio-off outage, tower custody during ship blackout, forwarded science once, saved radio/reload')
    finally:
        browser.close()
