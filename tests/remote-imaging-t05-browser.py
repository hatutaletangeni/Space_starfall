#!/usr/bin/env python3
"""T05 real WebGL2: planet outside live catalog, source-faithful seeded geometry,
isolated camera pose, 7F IndexDB photo, durable failed capture, reload.
No invented radio connection: pre-accepted onboard camera task only.
"""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
artifacts=root/'artifacts'/'t05-camera-evidence'
artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
  '--enable-webgl','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'])
 try:
  page=browser.new_page(viewport={'width':1260,'height':830})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto((root/'PLAY-STARFALL.html').as_uri(),wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRemoteImagingT05 && window.StarfallRuntime && window.StarfallImagingUI7F)",timeout=45000)
  prepared=page.evaluate("""()=>{
    const rt=StarfallRuntime,clone=StarfallGalaxy.generateGalaxy(rt.galaxy.seed,64),
      dormant=clone.byId.get('catalog-0');
    if(!dormant?.dormant||!rt.galaxy.byId.get(dormant.id)?.dormant)throw Error('Clone source must start dormant in both isolated and original catalogs');
    clone.activate(dormant);clone.update(rt.time);
    const b=dormant.planets.find(x=>x.landable);
    if(!b||rt.galaxy.byId.has(b.id))throw Error('Destination is not truly absent from main world cache');
    const rover={id:'t05-remote-rover',bodyId:b.id,systemId:b.systemId,
      bodySnapshot:{...b},local:[0,1,0],heading:0,batteryJ:2000000,
      commands:[],index:0,lastS:rt.time,status:'parked',records:[]};
    StarfallLaunchUI.store.rovers.push(rover);
    const axis=b.spinAxis||[0,1,0],v=Starfall3D.V,rad=v.rot(rover.local,axis,b.spinAngle||0),
      eye=v.add(b.position,v.mul(rad,b.radius+Starfall3D.groundHeight(rover.local,b)+3.3)),
      basis=v.norm(v.cross(rad,Math.abs(rad[1])>.9?[1,0,0]:[0,1,0])),
      forward=v.norm(v.add(v.mul(basis,.985),v.mul(rad,-.17)));
    const before={body:rt.nearest.id,target:rt.target.id,originCache:rt.galaxy.byId.size,
      pos:rt.outpostContext().position.slice()};
    const shot=StarfallRemoteImagingT05.capture({asset:rover,eye,forward,up:rad,size:256,mode:'forward',timeS:rt.time});
    if(!shot.image.startsWith('data:image/')||shot.bytes<1200)throw Error('Remote render invalid bytes');
    const after={body:rt.nearest.id,target:rt.target.id,originCache:rt.galaxy.byId.size,
      pos:rt.outpostContext().position.slice()};
    if(JSON.stringify(before)!==JSON.stringify(after)||rt.galaxy.byId.has(b.id))
      throw Error('REMOTE IMAGE MUTATED player camera or active galaxy');
    StarfallLaunchUI.persist();
    return{worldId:b.id,worldName:b.name,seed:b.seed,mainBody:before.body,
      bytes:shot.bytes,original:shot.image,at:rt.time,roverBattery:rover.batteryJ};
  }""")
  assert prepared['worldId']!=prepared['mainBody'] and prepared['bytes']>1200,prepared
  (artifacts/'actual-unloaded-planet.webp').write_bytes(base64.b64decode(prepared['original'].split(',',1)[1]))
  # Camera 7F receives an already accepted onboard command; T08 is required
  # for a genuinely delivered Planet A->B uplink. No fake radio is installed.
  result=page.evaluate("""()=>{
    const ui=StarfallImagingUI7F,rt=StarfallRuntime,s=ui.store;
    const rover=StarfallLaunchUI.store.rovers.find(x=>x.id==='t05-remote-rover');
    const check=StarfallCommsT03.routeFor({sourceId:'starfall-ship',destId:rover.id,
      bodyId:rover.bodyId,systemId:rover.systemId},rt.time);
    if(check.connected)throw Error('Interplanetary T08 cannot be faked in T05');
    const job=s.request('rover',rover.id,'forward',256,rt.time);
    s.markDelivered(job.id,rt.time);ui.persist();
    ui.tick(5);
    return{job:job.id,radio:check.reason,mainBody:rt.nearest.id};
  }""")
  page.wait_for_function("window.StarfallImagingUI7F.store.photos.some(p=>p.sourceAssetId==='t05-remote-rover')",timeout=75000)
  photo=page.evaluate("""async()=>{
    const ui=StarfallImagingUI7F,rt=StarfallRuntime;
    const p=ui.store.photos.find(x=>x.sourceAssetId==='t05-remote-rover');
    const db=await new Promise((ok,no)=>{const r=indexedDB.open('starfall-7f-images-v1');r.onsuccess=()=>ok(r.result);r.onerror=no;});
    const stored=await new Promise((ok,no)=>{const r=db.transaction('images').objectStore('images').get(p.id);r.onsuccess=()=>ok(r.result);r.onerror=no;});
    const image=new Image();image.src=stored.image;await image.decode();
    const cv=document.createElement('canvas');cv.width=image.width;cv.height=image.height;
    const ctx=cv.getContext('2d');ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,image.width,image.height).data;
    const unique=new Set();for(let i=1200;i<pixels.length;i+=271)unique.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    return{id:p.id,bodyId:p.bodyId,render:p.renderSource,version:p.sceneSnapshotVersion,status:p.status,
      jobRef:p.cameraJobId,bytes:p.bytes,image:stored.image,hasThumb:stored.thumbnail.startsWith('data:image/'),
      pixelDiversity:unique.size,mainBody:rt.nearest.id};
  }""")
  assert photo['status']!='downlinked' and photo['render']=='ISOLATED_STARFALL_WEBGL2',photo
  assert photo['bodyId']==prepared['worldId'] and photo['mainBody']==prepared['mainBody'],photo
  assert photo['version']==1 and photo['jobRef']==result['job'] and photo['hasThumb'] and photo['pixelDiversity']>20,photo
  assert photo['bytes']>1200 and photo['image'].startswith('data:image/'),photo
  (artifacts/'actual-onboard-7f-planet-b.webp').write_bytes(base64.b64decode(photo['image'].split(',',1)[1]))
  page.evaluate("StarfallImagingUI7F.persist();StarfallLaunchUI.persist();StarfallCommsT03.persist();")
  page.reload(wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!window.StarfallImagingUI7F?.store",timeout=30000)
  saved=page.evaluate("""async()=>{
    const p=StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId==='t05-remote-rover');
    const db=await new Promise((ok,no)=>{const r=indexedDB.open('starfall-7f-images-v1');r.onsuccess=()=>ok(r.result);r.onerror=no;});
    const rec=await new Promise((ok,no)=>{const r=db.transaction('images').objectStore('images').get(p.id);r.onsuccess=()=>ok(r.result);r.onerror=no;});
    return{photo:p,hasRealImage:!!rec?.image?.startsWith('data:image/'),mainWorld:StarfallRuntime.nearest.id,
      targetStillUnloaded:!StarfallRuntime.galaxy.byId.has(p.bodyId)};
  }""")
  assert saved['hasRealImage'] and saved['photo']['status']!='downlinked',saved
  assert saved['targetStillUnloaded'] and saved['mainWorld']==prepared['mainBody'],saved
  assert not errors,errors
  print('PASS T05 true remote WebGL: body '+prepared['worldId']+' unloaded from main cache, '+str(photo['bytes'])+
   ' photo bytes, '+str(photo['pixelDiversity'])+' real pixel variants; 7F onboard photo/thumbnail persisted, no fake interplanetary ACK, no teleport, no HTTP')
 finally:
  browser.close()
