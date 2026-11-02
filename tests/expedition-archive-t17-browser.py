#!/usr/bin/env python3
"""T17 controlled real file:// Chromium and WebGL2, actual photo bytes and IDB.
Synthetic starting fixture explicitly NOT an authentic 6J/Update-7 save.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
 try:
  ctx=browser.new_context(viewport={'width':1220,'height':800},accept_downloads=True)
  page=ctx.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallExpeditionArchiveUI17&&window.StarfallImagingUI7F)",timeout=60000)
  initial=page.evaluate("""()=>{
   const rt=StarfallRuntime,b=rt.nearest;
   if(!b||!b.radius)throw Error('No real world renderer');
   if(!SF.storageStatus().durable)throw Error('Unable to create durable file:// fixture');
   if(StarfallExpeditionArchiveUI17.storage().durable!==true)throw Error('T17 falsely reports persistent browser unavailable');
   const before=SF.load();
   return{seed:rt.galaxy.seed,credits:before.credits,
     owners:Object.keys(before).length,photoCount:StarfallImagingUI7F.store.photos.length};
  }""")
  assert initial['photoCount']==0,initial
  # The original offscreen WebGL2 renderer MUST generate the photo payload.
  # We then use original 7F owner's put() and original IndexedDB schema.
  real=page.evaluate("""async()=>{
   const rt=StarfallRuntime,b=rt.nearest,eye=b.position.map((x,i)=>x+[0,b.radius+130,0][i]);
   const photo=rt.captureScienceImage({body:b,eye,forward:[0,-1,0],up:[0,0,1],
      size:256,caption:'T17 ORIGINAL PHYSICS WORLD CAMERA'});
   if(!photo.image.startsWith('data:image/')||photo.bytes<1500)throw Error('No genuine rendered image bytes');
   const img=new Image();img.src=photo.image;await img.decode();
   if(img.width!==256||img.height!==256)throw Error('Original image is not 256²');
   const store=StarfallImagingUI7F.store,v=rt.vehicleStore.get('rover');
   const record=store.put({sourceType:'rover',sourceAssetId:v.definition.id,
     bodyId:b.id,systemId:b.systemId,mode:'forward',resolution:256,
     timeS:rt.time,position:eye,bytes:photo.bytes,width:photo.width,height:photo.height,
     mime:photo.mime,caption:'Real world scene; synthetic T17 test request'});
   const db=await new Promise((ok,no)=>{
    const r=indexedDB.open('starfall-7f-images-v1',1);r.onsuccess=()=>ok(r.result);r.onerror=no;
   });
   await new Promise((ok,no)=>{
    const tx=db.transaction('images','readwrite');
    tx.objectStore('images').put({image:photo.image,thumbnail:photo.image},record.id);
    tx.oncomplete=ok;tx.onerror=no;tx.onabort=no;
   });db.close();
   StarfallImagingUI7F.persist();
   if(!SF.load().imaging7f?.photos?.some(x=>x.id===record.id))throw Error('Original image owner metadata not durably saved');
   return{id:record.id,bytes:photo.bytes,seed:rt.galaxy.seed,credits:SF.load().credits};
  }""")
  # Modal discoverability through original GUI, not hidden synthetic API only.
  page.locator('#archive-t17-open').click()
  assert page.locator('#archive-t17').evaluate('(el)=>!el.hidden')
  assert 'DURABLE' in page.locator('#archive-t17-save-status').inner_text()
  assert page.locator('#archive-t17-export-full').count()==1
  # Real browser download includes byte-perfect image plus thumbnail, indexed by its authentic ID.
  with page.expect_download(timeout=60000) as evt:
   page.locator('#archive-t17-export-full').click()
  download=evt.value
  assert download.suggested_filename.endswith('-FULL-MEDIA.json')
  full=page.evaluate("""async()=>{
   const pack=await StarfallExpeditionArchiveUI17.exportBackup(true);
   StarfallArchiveT17.validate(pack,StarfallRuntime.galaxy.seed);
   const r=pack.media[0];
   if(!r?.image?.startsWith('data:image/')||!r?.thumbnail)throw Error('Full backup has no real media');
   return{pack,hash:StarfallArchiveT17.hash(r.image),length:r.image.length};
  }""")
  assert full['pack']['summary']['photos']==1,full['pack']['summary']
  # Corrupt media/checksum and wrong seed must refuse WITHOUT any writes.
  corrupted=page.evaluate("""async pack=>{
   const ui=StarfallExpeditionArchiveUI17;
   const current=localStorage.getItem('starfall_save'),images=await ui.readAllMedia();
   const before=images.get(pack.media[0].id)?.image;
   const corrupt=JSON.parse(JSON.stringify(pack));corrupt.media[0].image+='AAAA';
   const file={size:JSON.stringify(corrupt).length,text:async()=>JSON.stringify(corrupt)};
   let denied=false;try{await ui.importBackup(file,{approved:true});}catch(e){denied=/checksum/.test(e.message);}
   const after=await ui.readAllMedia();
   if(!denied||localStorage.getItem('starfall_save')!==current||
     after.get(pack.media[0].id)?.image!==before)throw Error('Corrupt import damaged original save or photo bytes');
   const wrong=JSON.parse(JSON.stringify(pack));wrong.galaxySeed++;
   const payload={...wrong};delete payload.integrity;
   wrong.integrity={...wrong.integrity,checksum:StarfallArchiveT17.hash(JSON.stringify(payload))};
   let other=false;try{await ui.importBackup({size:JSON.stringify(wrong).length,
      text:async()=>JSON.stringify(wrong)},{approved:true});}catch(e){other=/seed/.test(e.message);}
   if(!other||localStorage.getItem('starfall_save')!==current)
    throw Error('Wrong-seed import modified original save');
   return{badChecksumRejected:denied,badSeedRejected:other,bytes:before.length};
  }""",full['pack'])
  assert corrupted['badChecksumRejected'] and corrupted['badSeedRejected'],corrupted
  # Deliberately remove original media and modify credits before restoration.
  altered=page.evaluate("""async()=>{
   const ui=StarfallExpeditionArchiveUI17;
   if(SF.save({credits:791})===false)throw Error('Cannot persist fixture mutation');
   await ui.replaceMedia(new Map());
   const media=await ui.readAllMedia();
   if(media.size)throw Error('Test failed to remove current browser camera files');
   return{credits:SF.load().credits,binaries:media.size};
  }""")
  assert altered['credits']==791 and altered['binaries']==0,altered
  # Full import must restore ORIGINAL PHOTO BYTES from backup, then reload
  # original owner modules (never assign StarfallImagingUI7F.store directly).
  with page.expect_navigation(wait_until='domcontentloaded',timeout=90000):
   page.evaluate("""pack=>{
    const txt=JSON.stringify(pack),file={size:txt.length,text:async()=>txt};
    StarfallExpeditionArchiveUI17.importBackup(file,{approved:true})
       .catch(e=>{window.__T17_IMPORT_FAILURE=e.message;});
   }""",full['pack'])
  page.wait_for_function("!!(window.StarfallRuntime&&window.StarfallExpeditionArchiveUI17&&window.StarfallImagingUI7F)",timeout=60000)
  recovered=page.evaluate("""async expected=>{
   const state=SF.load(),camera=StarfallImagingUI7F.store.photos,
      media=await StarfallExpeditionArchiveUI17.readAllMedia(),
      p=camera.find(x=>x.id===expected.id),bin=media.get(expected.id);
   if(state.credits!==expected.credits)throw Error('Original durable credits not recovered');
   if(!p||p.bytes!==expected.bytes||camera.length!==1)throw Error('Original 7F source metadata missing after real browser reload');
   if(!bin?.image?.startsWith('data:image/')||bin?.thumbnail!==bin.image)
      throw Error('Original camera and thumbnail bytes were not restored');
   const hash=StarfallArchiveT17.hash(bin.image);
   if(hash!==expected.hash)throw Error('Original binary image hash changed');
   return{credits:state.credits,id:p.id,bytes:p.bytes,hash,photos:camera.length,durable:SF.storageStatus().durable};
  }""",{**real,'hash':full['hash']})
  assert recovered['durable'] and recovered['credits']==real['credits'],recovered
  assert not errors,errors
  print('PASS T17 real file:// Chromium: original WebGL scene camera bytes and thumbnail, full downloaded archive, corrupt/wrong-seed preserves localStorage+IDB, intentionally removed media/credits recovered transactionally, actual reload; SYNTHETIC starting fixture, NOT authentic 6J migration',recovered,corrupted)
 finally:
  browser.close()
