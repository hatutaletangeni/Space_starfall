#!/usr/bin/env python3
"""T07 real file:// Chromium integrated satellite bus:
 genuine 7B Kepler elements, 7C attitude + exposure, original 7F GPU camera,
 T03 powered LOS ACK and blackout, one science receipt/footprint, save/reload.
 Uses a controlled post-orbit satellite fixture; not a physically flown rocket.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
target=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
   '--enable-webgl','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx=browser.new_context(viewport={'width':1290,'height':870},accept_downloads=True)
  boot=ctx.new_page();errors=[]
  boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function('!!window.StarfallOrbitalBusT07 && !!window.StarfallRuntime',timeout=30000)
  saved=boot.evaluate("""()=>{
    const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),o=SF.load().flightGalaxy||{};
    SF.save({flightGalaxy:{...o,seed:rt.galaxy.seed,time:0,
      position:[b.position[0],b.position[1]+b.radius+8,b.position[2]],
      target:b.id,attached:b.id,groundDirection:[0,1,0],forward:[0,0,1],
      up:[0,1,0],landed:true}});
    return SF.load();
  }""")
  ctx.add_init_script("(()=>{if(localStorage.getItem('t07-ship-fixture'))return;localStorage.setItem('starfall_save',"+json.dumps(json.dumps(saved))+");localStorage.setItem('t07-ship-fixture','1');})()")
  page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallSatelliteOpsUI && window.StarfallCommsT03 && window.StarfallMissionOperationsUI)',timeout=30000)
  boot.close()
  setup=page.evaluate("""()=>{
    const rt=StarfallRuntime,b=rt.nearest,op=StarfallMissionOperationsUI,
      ctx=rt.outpostContext(),S=StarfallSatelliteOps7C,B=StarfallOrbitalBusT07,
      L=StarfallLaunch,ship=rt.engineeringAssetPoses().shipPose;
    if(!rt.landed||!ship)throw Error('No real landed ship transceiver for orbital downlink');
    const t=op.clock.lastSimulatedS,unit=StarfallPhysics.SCENE_METERS_PER_UNIT,rad=b.radius*unit,
      mu=b.gravity*9.80665*rad*rad,orbitalRadius=rad+360000;
    const sat={id:'sat-t07-real-browser',kind:'observatory',bodyId:b.id,systemId:b.systemId,
      launchId:'controlled-achieved-orbit',altitudeM:360000,epochS:t,phase:0,axis:[1,0,0],mu,
      inertial2d:{x:orbitalRadius,y:0,vx:0,vy:Math.sqrt(mu/orbitalRadius)*1.012,
       mu,epochS:t,launchUp:[0,1,0]},
      bodySnapshot:{...b},powerJ:4.8e6};
    StarfallLaunchUI.store.satellites.push(sat);
    const star=rt.galaxy.byId.get(sat.systemId)?.star?.position||rt.galaxy.byId.get(sat.systemId)?.position;
    const g=S.geometry(sat,b,star,t,unit,L.orbit),view=B.inspect(sat,b,star,t,unit,L.orbit);
    const route=StarfallCommsT03.routeFor({sourceId:sat.id,destId:'starfall-ship',
      bodyId:b.id,systemId:b.systemId},t);
    if(!route.connected)throw Error('No real orbital ship RF LOS: '+JSON.stringify({reason:route.reason,altitude:g.altitudeM,relative:g.relative}));
    B.command(sat,'SAFE',t);
    if(S.relayOperational(sat))throw Error('SAFE did not immediately cut spacecraft radio');
    const blocked=B.schedule(sat,'spectrometer',t);
    op.advanceTo(t+25);
    if(S.ensure(sat).storage.length)throw Error('SAFE permitted unpointed science');
    B.command(sat,'NADIR_IMAGING',t+25);
    for(let at=t+30;at<=t+70;at+=5)op.advanceTo(at);
    if(S.ensure(sat).storage.length!==1)throw Error('No completed actual timed spectrometer exposure: '+JSON.stringify(B.bus(sat).jobs));
    StarfallLaunchUI.persist();
    return{id:sat.id,blockedJob:blocked.id,at:op.clock.lastSimulatedS,
      orbit:view.orbit,solar:view.solarRatedW,first:S.ensure(sat).storage[0].id,
      firstJob:S.ensure(sat).storage[0].t07JobId,kind:sat.kind,route:route.hops};
  }""")
  assert setup['orbit']['eccentricity']>0 and setup['orbit']['periapsisM']>25000,setup
  assert setup['firstJob']==setup['blockedJob'],setup
  page.locator('#launch-open').evaluate('(e)=>e.click()')
  page.evaluate("StarfallSatelliteOpsUI.refresh()")
  page.locator('#sat7c-list').select_option(setup['id'])
  page.evaluate("StarfallSatelliteOpsUI.refresh()")
  metrics=page.locator('#sat7c-t07-status').inner_text()
  assert 'PERIAPSIS' in metrics and 'SOLAR' in metrics and 'MANEUVERS UNAVAILABLE' in metrics,metrics
  sequence=page.evaluate("""id=>{
    const s=StarfallLaunchUI.store.satellites.find(x=>x.id===id),
      rt=StarfallRuntime,B=StarfallOrbitalBusT07,S=StarfallSatelliteOps7C,
      ops=StarfallMissionOperationsUI,comms=StarfallCommsT03;
    const t=ops.clock.lastSimulatedS,
      b=ops.resolveBody(s,t),sys=rt.galaxy.byId.get(s.systemId),
      star=sys?.star?.position||sys?.position;
    let at=t;
    for(let i=0;i<400;i++){
      at+=5;ops.advanceTo(at);
      const body=ops.resolveBody(s,at),g=S.geometry(s,body,star,at,StarfallPhysics.SCENE_METERS_PER_UNIT,StarfallLaunch.orbit),
        link=comms.routeFor({sourceId:s.id,destId:'starfall-ship',bodyId:s.bodyId,systemId:s.systemId},at);
      if(g.sunlit&&link.connected&&B.bus(s).pointingErrorDeg<=2.2)break;
    }
    const job=B.schedule(s,'camera',at);
    for(let z=1;z<=5;z++)ops.advanceTo(at+z*5);
    const measurement=S.ensure(s).storage.find(x=>x.t07JobId===job.id);
    const gpu=StarfallImagingUI7F.store.jobs.find(x=>x.t07JobId===job.id);
    if(!measurement||!gpu)throw Error('T07 failed to link real numeric camera and accepted-onboard GPU job: '+JSON.stringify({job,obs:S.ensure(s).storage,imaging:StarfallImagingUI7F.store.jobs,point:B.bus(s)}));
    // T03 leaves both legitimate numeric measurements in original 7C store
    // until real ACK. Disable satellite transmitter and prove blocked custody.
    S.ensure(s).radioEnabled=false;
    const packets=comms.queueSatellite(s,ops.clock.lastSimulatedS);
    const first=comms.transport.get(packets[0].id);
    for(let i=1;i<=4;i++)ops.advanceTo(ops.clock.lastSimulatedS+5);
    const before=comms.transport.get(first.id);
    if(before.state==='ACKED'||before.sendBytes>0)throw Error('Radio-off satellite shipped data');
    S.ensure(s).radioEnabled=true;
    for(let i=0;i<180;i++){ops.advanceTo(ops.clock.lastSimulatedS+5);
      if(packets.every(x=>comms.transport.get(x.id)?.state==='ACKED'))break;}
    comms.persist();StarfallLaunchUI.persist();ops.persist();
    return{numericId:measurement.id,jobId:job.id,photoJob:gpu.id,
      originalImageNotInvented:!measurement.image,
      encodedSize:measurement.dataBytes,transfers:packets.map(x=>comms.transport.get(x.id)),
      journal:StarfallScienceUI.journal.filter(x=>x.satelliteId===s.id).map(x=>x.id),
      onboard:S.ensure(s).storage.map(x=>x.id),sunlit:S.ensure(s).lastEclipse===false};
  }""",setup['id'])
  assert sequence['originalImageNotInvented'],sequence
  assert all(x['state']=='ACKED' for x in sequence['transfers']),sequence
  assert len(sequence['journal'])==2 and len(set(sequence['journal']))==2,sequence
  assert sequence['onboard']==[],sequence
  page.wait_for_function("window.StarfallImagingUI7F.store.photos.some(p=>p.sourceAssetId==='sat-t07-real-browser')",timeout=75000)
  image=page.evaluate("""id=>{
    const p=StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId===id);
    return{status:p.status,bytes:p.bytes,mime:p.mime,bodyId:p.bodyId,sensor:p.mode,
      jobs:StarfallImagingUI7F.store.jobs.length,
      completed:StarfallOrbitalBusT07.bus(StarfallLaunchUI.store.satellites.find(x=>x.id===id)).completed.length};
  }""",setup['id'])
  assert image['bytes']>300 and image['status']!='downlinked',image
  page.evaluate("""()=>{
   StarfallLaunchUI.persist();StarfallCommsT03.persist();
   StarfallMissionOperationsUI.persist();StarfallImagingUI7F.persist();
   const rt=StarfallRuntime,t=StarfallMissionOperationsUI.clock.lastSimulatedS,old=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:t}});
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallOrbitalBusT07 && !!window.StarfallCommsT03",timeout=30000)
  after=page.evaluate("""id=>{
    const s=StarfallLaunchUI.store.satellites.find(x=>x.id===id);
    const b=s&&StarfallOrbitalBusT07.bus(s),o=s&&StarfallSatelliteOps7C.ensure(s),
     journal=StarfallScienceUI.journal.filter(x=>x.satelliteId===id);
    return{hasSatellite:!!s,received:o?.received.map(x=>x.id),
      journal:journal.map(x=>x.id),completed:b?.completed.length,
      photo:StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId===id)?.id,
      orbitalState:b?.lastOrbit,energy:o?.energyJ};
  }""",setup['id'])
  assert after['hasSatellite'] and len(after['received'])==2 and len(set(after['journal']))==2,after
  assert after['completed']==2 and after['photo'] and after['energy']>0,after
  assert not errors,errors
  print('PASS T07 real file:// Chromium: actual 7B achieved eccentric Kepler ephemeris, SAFE rejects science and radio, finite NADIR slew, 2 timed 7C acquisitions, real 7F GPU photo, satellite radio outage blocks T03 bytes, powered LOS ACKs both numeric records exactly once, persisted 7C+T07+7F+T03 across reload')
 finally:
  browser.close()
