#!/usr/bin/env python3
"""T08 actual file:// Chromium flagship: Planet A landed ship + WIRED station,
Planet B WIRED station + real deployed rover, physical T04/T08 route and T03
byte ACK, autonomous on-world camera, offscreen T05 7F image, actual B->A
image download and science journal receipt. No remoteLink, route or GL stubs.
Controlled pre-placed assets, NOT a human expedition or rocket insertion.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
file=(root/'PLAY-STARFALL.html').resolve()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  context=browser.new_context(viewport={'width':1240,'height':800},accept_downloads=True)
  boot=context.new_page();boot.goto(file.as_uri(),wait_until='domcontentloaded',timeout=90000)
  boot.wait_for_function('!!window.StarfallDeepSpaceT08 && !!window.StarfallRuntime',timeout=45000)
  saved=boot.evaluate("""()=>{
    const rt=StarfallRuntime,V=StarfallOutposts.V,A=rt.galaxy.byId.get('star-0-p0'),
      B=[...rt.galaxy.byId.values()].find(v=>v.id!==A.id&&v.systemId===A.systemId&&v.landable&&v.kind!=='star');
    if(!B)throw Error('No second valid solid planet in the original loaded star system');
    const posA=A.position,posB=B.position,
      dir=V.norm(V.sub(posB,posA)),
      local=StarfallOutposts.rotate(dir,A.spinAxis||[0,1,0],-(A.spinAngle||0)),
      world=V.add(posA,V.mul(dir,A.radius+8)),old=SF.load().flightGalaxy||{};
    SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,time:0,position:world,target:A.id,attached:A.id,
      groundDirection:local,forward:[0,0,1],up:dir,landed:true}});
    return{state:SF.load(),targetId:B.id};
  }""")
  context.add_init_script("(()=>{if(localStorage.getItem('t08-initialized'))return;localStorage.setItem('starfall_save',"+json.dumps(json.dumps(saved['state']))+");localStorage.setItem('t08-initialized','1');})()")
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(file.as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function('!!(window.StarfallMissionOperationsUI && window.StarfallCommsT03 && window.StarfallOutpostUI && window.StarfallImagingUI7F)',timeout=45000)
  boot.close()
  fixture=page.evaluate("""targetId=>{
    const rt=StarfallRuntime,O=StarfallOutposts,T=StarfallDeepSpaceT08,
      site=StarfallOutpostUI,launch=StarfallLaunchUI,
      ops=StarfallMissionOperationsUI,comms=StarfallCommsT03,
      A=rt.nearest,B=rt.galaxy.byId.get(targetId),ship=rt.engineeringAssetPoses().shipPose;
    if(!rt.landed||A.id===B.id||!ship?.local)throw Error('Not landed on planet A with real ship pose');
    const dir=O.V.norm(O.V.sub(B.position,A.position)),
      aFace=ship.local,
      bFace=O.rotate(O.V.mul(dir,-1),B.spinAxis||[0,1,0],-(B.spinAngle||0));
    function create(body,base,sign){
      const forward=[0,0,1],position=(dx)=>O.offset(base,forward,dx,0,body.radius);
      const x=site.store.add('antenna',body,position(15),forward,()=>0).item;
      const battery=site.store.add('battery',body,position(36),forward,()=>0).item;
      const solar=site.store.add('solar',body,position(58),forward,()=>0).item;
      site.store.link(x.id,battery.id,body);site.store.link(battery.id,solar.id,body);
      const antenna=site.store.items.find(i=>i.id===x.id);
      return{antenna,batteryId:battery.id,solarId:solar.id};
    }
    const a=create(A,aFace,1),b=create(B,bFace,-1);
    T.configure(a.antenna,'HIGH_GAIN',b.antenna.id,ops.clock.lastSimulatedS);
    T.configure(b.antenna,'HIGH_GAIN',a.antenna.id,ops.clock.lastSimulatedS);
    const now=ops.clock.lastSimulatedS;
    // A real remote rover: not a new vehicle class; original 7B owner.
    const rover={id:'probe-t08-planet-b',launchId:'controlled-t08-predeployed',
      bodyId:B.id,systemId:B.systemId,bodySnapshot:{...B},
      local:O.offset(bFace,[0,0,1],26,0,B.radius),heading:0,batteryJ:12e6,
      commands:[],index:0,remaining:0,records:[],status:'parked',lastS:now};
    const hw=StarfallRoverT06.hardware(rover);hw.state='READY';hw.homeLocal=rover.local;
    launch.store.rovers.push(rover);
    site.advancePowerTo(now,(asset,t)=>ops.resolveBody(asset,t));
    const ar=site.powerReports.get(A.id)?.byId[a.antenna.id],
      br=site.powerReports.get(B.id)?.byId[b.antenna.id];
    const infoA=T.inspected(a.antenna,site.powerReports.get(A.id)),
      infoB=T.inspected(b.antenna,site.powerReports.get(B.id));
    const pkt={sourceId:'starfall-ship',destId:rover.id,bodyId:B.id,systemId:B.systemId,encodedBytes:320};
    const route=comms.routeFor(pkt,now);
    if(!route.connected)throw Error('Genuine cross-body station route missing: '+JSON.stringify({
     route,ship,position:rt.outpostContext().position,source:a.antenna.local,target:b.antenna.local,
     aState:infoA,bState:infoB,repA:ar,repB:br,
     worldA:A.position,worldB:B.position,near:rt.nearest.id,bodyB:B.id}));
    if(route.hops.length!==4||route.hops[0]!=='starfall-ship'||route.hops[3]!==rover.id)
      throw Error('Not a fully physical four-node cross-body route: '+JSON.stringify(route));
    launch.persist();site.persist();comms.persist();ops.persist();
    return{origin:A.id,destination:B.id,rover:rover.id,antennaA:a.antenna.id,antennaB:b.antenna.id,
      installedA:infoA,installedB:infoB,route:route.hops,delayS:route.delayS,
      rateBps:route.bandwidthBps,at:now};
  }""",saved['targetId'])
  assert fixture['installedA']['powered'] and fixture['installedB']['powered'] and fixture['delayS']>0,fixture
  assert len(fixture['route'])==4 and fixture['rateBps']>100,fixture
  # A physically unavailable remote station must prevent transmission; T03
  # must retain packet bytes and command. Re-enable and continue same ID.
  sent=page.evaluate("""id=>{
    const r=StarfallLaunchUI.store.rovers.find(x=>x.id===id),
      comms=StarfallCommsT03,ops=StarfallMissionOperationsUI,
      q=comms.command(r,'CAPTURE forward 256'+String.fromCharCode(10)+'SAMPLE thermometer',
         ops.clock.lastSimulatedS);
    comms.persist();return{id:q.id,now:ops.clock.lastSimulatedS};
  }""",fixture['rover'])
  offline=page.evaluate("""data=>{
    const site=StarfallOutpostUI,ops=StarfallMissionOperationsUI,comms=StarfallCommsT03,
     item=site.store.items.find(x=>x.id===data.antennaB);
    site.store.setEnabled(item.id,false);
    site.advancePowerTo(ops.clock.lastSimulatedS,(asset,t)=>ops.resolveBody(asset,t));
    ops.advanceTo(ops.clock.lastSimulatedS+10);
    const pkt=comms.transport.get(data.packet);
    const remaining=StarfallLaunchUI.store.rovers.find(x=>x.id===data.rover).commands.length;
    return{state:pkt.state,sendBytes:pkt.sendBytes,remaining,
      route:comms.routeFor({sourceId:'starfall-ship',destId:data.rover,bodyId:data.dest,systemId:data.sys},ops.clock.lastSimulatedS)};
  }""",{'antennaB':fixture['antennaB'],'packet':sent['id'],'rover':fixture['rover'],
           'dest':fixture['destination'],'sys':'star-0'})
  assert offline['sendBytes']==0 and offline['remaining']==0 and not offline['route']['connected'],offline
  online=page.evaluate("""data=>{
    const site=StarfallOutpostUI,ops=StarfallMissionOperationsUI,comms=StarfallCommsT03,
      item=site.store.items.find(x=>x.id===data.antennaB);
    site.store.setEnabled(item.id,true);
    site.advancePowerTo(ops.clock.lastSimulatedS,(asset,t)=>ops.resolveBody(asset,t));
    let ack=null;
    for(let i=0;i<90;i++){ops.advanceTo(ops.clock.lastSimulatedS+5);
       ack=comms.transport.get(data.packet);
       if(ack?.state==='ACKED')break;}
    ops.persist();comms.persist();site.persist();
    return{state:ack?.state,hops:ack?.route,bytes:ack?.sendBytes,
      source:ack?.sourceCustody,lastLink:ack?.lastLink};
  }""",{'antennaB':fixture['antennaB'],'packet':sent['id']})
  assert online['state']=='ACKED' and online['hops']==fixture['route'],online
  # Already accepted onboard remote program must run despite A not on B.
  science=page.evaluate("""id=>{
    const ops=StarfallMissionOperationsUI,comms=StarfallCommsT03;
    for(let i=0;i<14;i++)ops.advanceTo(ops.clock.lastSimulatedS+5);
    const r=StarfallLaunchUI.store.rovers.find(x=>x.id===id);
    return{readings:r.records.map(x=>x.instrument),
      job:StarfallImagingUI7F.store.jobs.find(x=>x.assetId===id)?.id||null,
      received:StarfallScienceUI.journal.filter(x=>x.probeId===id).map(x=>x.id),
      activePlanet:StarfallRuntime.nearest.id};
  }""",fixture['rover'])
  assert 'thermometer' in science['readings'] and science['activePlanet']==fixture['origin'],science
  page.wait_for_function("window.StarfallImagingUI7F.store.photos.some(x=>x.sourceAssetId==='probe-t08-planet-b')",timeout=75000)
  remote=page.evaluate("""id=>{
    const rt=StarfallRuntime,comms=StarfallCommsT03,ops=StarfallMissionOperationsUI;
    const photo=StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId===id),
      before=comms.transport.get('comms-photo-'+photo.id);
    for(let i=0;i<25;i++)ops.advanceTo(ops.clock.lastSimulatedS+5);
    const after=comms.transport.get('comms-photo-'+photo.id);
    const recent=StarfallImagingUI7F.store.get(photo.id);
    ops.persist();comms.persist();StarfallLaunchUI.persist();StarfallImagingUI7F.persist();
    return{photoId:photo.id,render:photo.renderSource,bytes:photo.bytes,bodyId:photo.bodyId,
      state:after?.state,sendBytes:after?.sendBytes,recvBytes:after?.recvBytes,
      status:recent.status,delay:after?.lastLink?.delayS,route:after?.route,
      noPlanetTeleport:rt.nearest.id!=='__B__',
      journals:StarfallScienceUI.journal.filter(x=>x.probeId===id).length};
  }""".replace('__B__',fixture['destination']),fixture['rover'])
  assert remote['bytes']>300 and remote['bodyId']==fixture['destination'],remote
  assert remote['state']=='ACKED' and remote['status']=='downlinked',remote
  assert remote['journals']==1 and remote['noPlanetTeleport'],remote
  assert remote['route'][0]==fixture['rover'] and remote['route'][-1]=='starfall-ship',remote
  page.evaluate("""()=>{
    const rt=StarfallRuntime,old=SF.load().flightGalaxy||{};
    StarfallCommsT03.persist();StarfallLaunchUI.persist();StarfallImagingUI7F.persist();
    StarfallMissionOperationsUI.persist();StarfallOutpostUI.persist();
    SF.save({flightGalaxy:{...old,seed:rt.galaxy.seed,
      time:StarfallMissionOperationsUI.clock.lastSimulatedS}});
  }""")
  stored=page.evaluate("""()=>{
   const raw=localStorage.getItem('starfall_save')||'{}',v=JSON.parse(raw);
   return{length:raw.length,launcher:!!v.launch7,rovers:v.launch7?.rovers?.length||0,
     antennas:v.outpost5?.items?.filter(x=>x.kind==='antenna').length||0,
     photo:v.imaging7f?.photos?.length||0,packet:v.commsT03?.packets?.length||0,
     fromSF:SF.load().launch7?.rovers?.length||0,lock:!!window.__STARFALL_IMPORT_PENDING};
  }""")
  assert stored['launcher'] and stored['rovers']>=1 and stored['antennas']>=2 and stored['photo']>0 and stored['packet']>0,stored
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallDeepSpaceT08 && !!window.StarfallCommsT03",timeout=45000)
  resumed=page.evaluate("""data=>{
    const ui=StarfallOutpostUI,T=StarfallDeepSpaceT08,r=StarfallLaunchUI.store.rovers.find(x=>x.id===data.rover);
    const a=ui.store.items.find(x=>x.id===data.antennaA),b=ui.store.items.find(x=>x.id===data.antennaB);
    const p=StarfallImagingUI7F.store.get(data.photoId);
    const x=StarfallCommsT03.transport.get('comms-photo-'+data.photoId);
    return{antennaA:T.repair(a?.radioT04?.deepT08),antennaB:T.repair(b?.radioT04?.deepT08),
      world:StarfallRuntime.nearest?.id,rover:r?.id,photo:p?.id,bytes:p?.bytes,
      status:p?.status,packet:x?.state,receipts:StarfallScienceUI.journal.filter(x=>x.probeId===data.rover).length};
  }""",{**fixture,'photoId':remote['photoId']})
  assert resumed['world']==fixture['origin'] and resumed['packet']=='ACKED' and resumed['status']=='downlinked',resumed
  assert resumed['receipts']==1 and resumed['photo'] and resumed['antennaA']['mode']=='HIGH_GAIN',resumed
  assert resumed['antennaB']['peerId']==fixture['antennaA'],resumed
  assert not errors,errors
  print('PASS T08 real file:// Chromium FLAGSHIP controlled assets: from Planet A real powered 4-hop link to Planet B rover, blackout blocks/holds command, actual T03 ACK, offworld T05 WebGL rover photograph, physical B→A bytes+latency, exactly-one science receipt and Gallery ACK across reload; no route stubs or teleport')
 finally:
  browser.close()
