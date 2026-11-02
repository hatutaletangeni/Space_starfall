#!/usr/bin/env python3
"""T06 real browser: destination-specific capsule entry/descent, actual onboard
robot mission via T03 powered ship LOS, 7D sensor readings + 7F camera, power
blackout and 48V rover battery service. Controlled rocket capsule fixture:
no claim of a fully flown human orbital launch or interplanetary radio.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
target=(root/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  context=browser.new_context(viewport={'width':1240,'height':800})
  errors=[]
  boot=context.new_page()
  boot.on('pageerror',lambda e:errors.append(str(e)))
  boot.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function("!!(window.StarfallRoverT06 && window.StarfallRuntime && window.StarfallMissionOperationsUI)",timeout=45000)
  saved=boot.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.galaxy.byId.get('star-0-p0'),p=b.position,s=SF.load().flightGalaxy||{};
   SF.save({flightGalaxy:{...s,seed:rt.galaxy.seed,time:0,position:[p[0],p[1]+b.radius+8,p[2]],
    target:b.id,attached:b.id,groundDirection:[0,1,0],forward:[0,0,1],
    up:[0,1,0],landed:true}});
   return SF.load();
  }""")
  context.add_init_script("(()=>{if(localStorage.getItem('t06-landed-initialized'))return;localStorage.setItem('starfall_save',"+json.dumps(json.dumps(saved))+");localStorage.setItem('t06-landed-initialized','1');})()")
  page=context.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(target.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallCommsT03 && window.StarfallRoverT06 && window.StarfallImagingUI7F)",timeout=45000)
  boot.close()
  setUp=page.evaluate("""()=>{
    const rt=StarfallRuntime,body=rt.nearest,O=StarfallOutposts,T=StarfallRoverT06,
      UI=StarfallLaunchUI,ship=rt.engineeringAssetPoses().shipPose;
    if(!rt.landed||!ship?.local)throw Error('True landed ship required');
    let point=null,survey=null;
    for(let d=7;d<=42;d+=3){
      const site=O.offset(ship.local,[1,0,0],d,0,body.radius);
      const res=T.footprint(body,site,Starfall3D.groundHeight,StarfallPhysics.SCENE_METERS_PER_UNIT);
      if(res.safe){point=site;survey=res;break;}
    }
    if(!point)throw Error('No safe actual terrain within powered ship radio range; T06 site requirements respected');
    const m={id:'launch-t06-browser',phase:'orbit',payload:'rover',local:ship.local,
     bodyId:body.id,systemId:body.systemId,destinationBodyId:body.id,
     destinationSystemId:body.systemId,destinationSnapshot:{...body},
     landingTargetLocal:point};
    UI.store.launches.push(m);
    if(!UI.store.deploy(m,rt.time,()=>body))throw Error('Capsule rejected: '+m.failure);
    const rover=UI.store.rovers.find(x=>x.launchId===m.id);
    if(rover.roverT06.state!=='ENTRY')throw Error('Capsule falsely deployed instantly');
    if(StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:rover.id,bodyId:body.id,systemId:body.systemId},rt.time).connected)
      throw Error('Unlanded rover has impossible instant radio endpoint');
    UI.store.update(rt.time+12,()=>body);
    if(rover.roverT06.state!=='DESCENT')throw Error('Capsule has no powered descent');
    UI.store.update(rt.time+38,()=>body);
    if(rover.roverT06.state!=='READY')throw Error('Touchdown not physically cleared: '+JSON.stringify(m.landingT06));
    const route=StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:rover.id,bodyId:body.id,systemId:body.systemId},rt.time+38);
    if(!route.connected||!route.hops.includes(rover.id))throw Error('Real powered onboard radio missing: '+JSON.stringify(route));
    const saved=JSON.stringify({pos:rt.outpostContext().position,target:rt.target.id,body:rt.nearest.id});
    StarfallMissionOperationsUI.advanceTo(rt.time+38);
    if(JSON.stringify({pos:rt.outpostContext().position,target:rt.target.id,body:rt.nearest.id})!==saved)throw Error('Autonomy teleported player');
    UI.persist();
    return{id:rover.id,bodyId:body.id,mission:m.id,site:point,terrain:survey,
     route:route.hops,readyAt:StarfallMissionOperationsUI.clock.lastSimulatedS};
  }""")
  assert setUp['route'][0]=='starfall-ship' and setUp['route'][-1]==setUp['id'],setUp
  page.locator('#launch-open').evaluate('(e)=>e.click()')
  page.locator('#launch-probe').select_option(setUp['id'])
  page.evaluate('StarfallLaunchUI.refresh()')
  field=page.locator('#launch-rover-trajectory').inner_text()
  assert 'T06' in field and 'READY' in field and 'CHARGE' in field,field
  cmd=page.evaluate("""()=>{
    const rt=StarfallRuntime,rover=StarfallLaunchUI.store.rovers.find(x=>x.id==='__ID__');
    const program='SAMPLE thermometer'+String.fromCharCode(10)+'SAMPLE magnetometer'+String.fromCharCode(10)+
      'CAPTURE forward 256'+String.fromCharCode(10)+'STATUS'+String.fromCharCode(10)+'WAIT 4'+String.fromCharCode(10)+'STOP';
    const t=StarfallMissionOperationsUI.clock.lastSimulatedS;
    const sent=StarfallCommsT03.command(rover,program,t);
    StarfallCommsT03.persist();return{id:sent.id,at:t};
  }""".replace('__ID__',setUp['id']))
  # Wait until a packet is really ACKed by the physical rover radio, then
  # depower the ship receiver before onboard science produces its readings.
  delivered=page.evaluate("""id=>{
    const ops=StarfallMissionOperationsUI,T=StarfallCommsT03;
    for(let i=1;i<=12;i++){ops.advanceTo(ops.clock.lastSimulatedS+5);
      const p=T.transport.get(id);if(p?.state==='ACKED')return{packet:p,time:ops.clock.lastSimulatedS};}
    return{packet:T.transport.get(id),time:ops.clock.lastSimulatedS};
  }""",cmd['id'])
  assert delivered['packet']['state']=='ACKED',delivered
  mission=page.evaluate("""()=>{
    const rt=StarfallRuntime,ops=StarfallMissionOperationsUI,v=rt.vehicleStore.get('ship'),
      r=StarfallLaunchUI.store.rovers.find(x=>x.id==='__ID__');
    rt.vehicleStore.update('ship',{...v.state,energyJ:0});
    for(let i=1;i<=8;i++)ops.advanceTo(ops.clock.lastSimulatedS+5);
    const jobs=StarfallImagingUI7F.store.jobs.filter(x=>x.assetId===r.id);
    return{state:r.roverT06.state,battery:r.batteryJ,readings:r.records.map(x=>x.instrument),
      jobs:jobs.map(x=>({id:x.id,deliveredS:x.deliveredS})),
      queue:r.ground7d?.queuedObservations.length||0,
      journal:StarfallScienceUI.journal.filter(x=>x.probeId===r.id).length};
  }""".replace('__ID__',setUp['id']))
  assert {'thermometer','magnetometer'}.issubset(set(mission['readings'])),mission
  assert mission['queue']>=2 and mission['jobs'] and mission['journal']==0,mission
  assert all(x['deliveredS'] is not None for x in mission['jobs']),mission
  page.wait_for_function("window.StarfallImagingUI7F.store.photos.some(p=>p.sourceAssetId==='__ID__')".replace('__ID__',setUp['id']),timeout=75000)
  onboard=page.evaluate("""id=>{
    const p=StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId===id);
    return{status:p.status,render:p.renderSource,bytes:p.bytes,owner:p.sourceAssetId};
  }""",setUp['id'])
  assert onboard['status']!='downlinked' and onboard['bytes']>200,onboard
  received=page.evaluate("""()=>{
    const rt=StarfallRuntime,ops=StarfallMissionOperationsUI,v=rt.vehicleStore.get('ship'),
      r=StarfallLaunchUI.store.rovers.find(x=>x.id==='__ID__');
    rt.vehicleStore.update('ship',{...v.state,energyJ:4000000});
    for(let i=1;i<=12;i++)ops.advanceTo(ops.clock.lastSimulatedS+5);
    return{receipts:StarfallScienceUI.journal.filter(x=>x.probeId===r.id).map(x=>x.id),
      packets:StarfallCommsT03.transport.list().filter(x=>x.sourceId===r.id&&x.type==='ROVER_OBSERVATION'),
      charge:r.batteryJ};
  }""".replace('__ID__',setUp['id']))
  assert len(set(received['receipts']))==2 and len(received['receipts'])==2,received
  assert all(x['state']=='ACKED' for x in received['packets']),received
  # Operator service: actual same-world powered battery under 36 scene units.
  service=page.evaluate("""()=>{
    const rt=StarfallRuntime,site=StarfallOutpostUI,body=rt.nearest,O=StarfallOutposts,
      r=StarfallLaunchUI.store.rovers.find(x=>x.id==='__ID__');
    const local=d=>O.offset(r.local,[1,0,0],d,0,body.radius);
    const solar=site.store.add('solar',body,local(12),[1,0,0],()=>0).item;
    const battery=site.store.add('battery',body,local(24),[1,0,0],()=>0).item;
    site.store.link(solar.id,battery.id,body);
    battery.energyJ=5000000;site.advancePowerTo(rt.time,()=>body);
    const before=battery.energyJ,owned=r.batteryJ,at=StarfallMissionOperationsUI.clock.lastSimulatedS;
    const result=StarfallRoverT06.service(r,battery,body,site,at,StarfallPhysics.SCENE_METERS_PER_UNIT);
    site.persist();StarfallLaunchUI.persist();StarfallMissionOperationsUI.persist();StarfallCommsT03.persist();
    return{before,after:battery.energyJ,charged:r.batteryJ-owned,loss:result.lossJ,
      source:result.sourceId,rover:r.id,mode:r.roverT06.state};
  }""".replace('__ID__',setUp['id']))
  assert service['before']>service['after'] and service['charged']>0 and service['loss']>0,service
  page.evaluate("""()=>{
    const rt=StarfallRuntime,at=StarfallMissionOperationsUI.clock.lastSimulatedS,
      old=SF.load().flightGalaxy||{};
    StarfallCommsT03.persist();StarfallLaunchUI.persist();StarfallMissionOperationsUI.persist();
    SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:at}});
  }""")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRoverT06 && window.StarfallCommsT03)",timeout=45000)
  loaded=page.evaluate("""id=>{
    const r=StarfallLaunchUI.store.rovers.find(x=>x.id===id);
    return{state:r?.roverT06?.state,coordinates:r?.local,battery:r?.batteryJ,
      receipts:StarfallScienceUI.journal.filter(x=>x.probeId===id).map(x=>x.id),
      mission:StarfallLaunchUI.store.launches.find(x=>x.id==='launch-t06-browser')?.phase,
      camera:StarfallImagingUI7F.store.photos.filter(x=>x.sourceAssetId===id).map(x=>x.id)};
  }""",setUp['id'])
  assert loaded['mission']=='deployed' and len(loaded['receipts'])==2 and loaded['camera'],loaded
  assert loaded['state'] in ('SAFE_STOP','READY','RECOVERY','TRAVERSING'),loaded
  assert not errors,errors
  print('PASS T06 real file:// Chromium: controlled capsule mission ENTRY→DESCENT→landed, physical rover ship radio ACK, 2 onboard science readings during ship blackout, Camera 7F actual image, source-owned 48V battery charge and exact 2 receipts after reload')
 finally:
  browser.close()
