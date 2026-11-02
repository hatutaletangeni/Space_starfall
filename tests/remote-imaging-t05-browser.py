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
  comparison=page.evaluate("""async()=>{
    const rt=StarfallRuntime,V=Starfall3D.V,b=rt.nearest,local=[0,1,0],up=V.rot(local,b.spinAxis||[0,1,0],b.spinAngle||0);
    const eye=V.add(b.position,V.mul(up,b.radius+Starfall3D.groundHeight(local,b)+3.3));
    const along=V.norm(V.cross(up,Math.abs(up[1])>.9?[1,0,0]:[0,1,0]));
    const forward=V.norm(V.add(V.mul(along,.985),V.mul(up,-.17)));
    const near=rt.captureScienceImage({body:b,eye,forward,up,size:256});
    const isolated=StarfallRemoteImagingT05.capture({asset:{bodyId:b.id,systemId:b.systemId,bodySnapshot:b},
      eye,forward,up,size:256,mode:'forward',timeS:rt.time});
    const decode=async(data)=>{const image=new Image();image.src=data;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,256,256).data;};
    const n=await decode(near.image),r=await decode(isolated.image);
    let diff=0,count=0;for(let i=1200;i<n.length;i+=17)if(i%4!==3){diff+=Math.abs(n[i]-r[i]);count++;}
    return{meanChannelDelta:diff/count,localBytes:near.bytes,isolatedBytes:isolated.bytes,
      playerUnchanged:rt.nearest.id===b.id};
  }""")
  assert comparison['localBytes']>1200 and comparison['isolatedBytes']>1200 and comparison['playerUnchanged'],comparison
  assert comparison['meanChannelDelta']<105,'Same-world near/isolated rendering differs too much: '+str(comparison)

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
  page.locator('#imaging7f-open').evaluate('(e)=>e.click()')
  with page.expect_download(timeout=30000) as exporting:
   page.locator('#imaging7f-export-archive').evaluate('(e)=>e.click()')
  download=exporting.value
  archive_path=download.path()
  assert archive_path.stat().st_size>photo['bytes']
  # Explicitly remove only this controlled photo to test archive recovery.
  removed=page.evaluate("""async()=>{
    const ui=StarfallImagingUI7F,p=ui.store.photos.find(p=>p.sourceAssetId==='t05-remote-rover');
    const db=await new Promise((ok,no)=>{const r=indexedDB.open('starfall-7f-images-v1');r.onsuccess=()=>ok(r.result);r.onerror=no;});
    await new Promise((ok,no)=>{const t=db.transaction('images','readwrite');t.objectStore('images').delete(p.id);
      t.oncomplete=ok;t.onerror=no;});
    ui.store.remove(p.id);ui.persist();return p.id;
  }""")
  assert page.evaluate("StarfallImagingUI7F.store.photos.length")==0
  page.locator('#imaging7f-archive-file').set_input_files(str(archive_path))
  page.wait_for_function("window.StarfallImagingUI7F.store.photos.some(p=>p.sourceAssetId==='t05-remote-rover')",timeout=30000)
  imported=page.evaluate("""async()=>{
    const p=StarfallImagingUI7F.store.photos.find(x=>x.sourceAssetId==='t05-remote-rover');
    const db=await new Promise((ok,no)=>{const r=indexedDB.open('starfall-7f-images-v1');r.onsuccess=()=>ok(r.result);r.onerror=no;});
    const rec=await new Promise((ok,no)=>{const r=db.transaction('images').objectStore('images').get(p.id);r.onsuccess=()=>ok(r.result);r.onerror=no;});
    return{restored:p.restoredArchive,hasMedia:!!rec?.image?.startsWith('data:image/'),status:p.status,id:p.id};
  }""")
  assert imported['id']==removed and imported['restored'] and imported['hasMedia'] and imported['status']!='downlinked',imported
  assert not errors,errors
  print('PASS T05 real world photo / near-vs-remote scene difference '+str(comparison['meanChannelDelta'])+' / portable archive restoration: '+str(imported['restored'])+'; true remote WebGL: body '+prepared['worldId']+' unloaded from main cache, '+str(photo['bytes'])+
   ' photo bytes, '+str(photo['pixelDiversity'])+' real pixel variants; 7F onboard photo/thumbnail persisted, no fake interplanetary ACK, no teleport, no HTTP')
 finally:
  browser.close()
