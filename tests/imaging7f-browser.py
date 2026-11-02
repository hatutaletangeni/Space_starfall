#!/usr/bin/env python3
"""Update 7F: real offscreen WebGL2 scene readback; no screenshot/HUD fake."""
from pathlib import Path
from playwright.sync_api import sync_playwright
game=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1100,'height':730})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(game,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!window.StarfallRuntime',timeout=15000)
        page.wait_for_timeout(400)
        diagnostic=page.evaluate("""()=>({model:typeof window.StarfallImaging7F,ui:typeof window.StarfallImagingUI7F,
          renderer:typeof window.StarfallRuntime?.captureScienceImage,
          root:typeof window.Starfall3D,
          modal:!!document.getElementById('imaging7f'),
          button:!!document.getElementById('imaging7f-open'),
          scriptTail:[...document.scripts].slice(-4).map(s=>s.textContent.slice(0,95))})""")
        print('7F diagnostic:', diagnostic, 'page errors:', errors[:8],flush=True)
        assert diagnostic['model']=='object' and diagnostic['ui']=='object' and diagnostic['renderer']=='function',diagnostic
        page.wait_for_timeout(350)
        photo=page.evaluate("""async()=>{
          const rt=window.StarfallRuntime,b=rt.nearest;
          const eye=b.position.map((x,i)=>x+([0,b.radius+150,0][i]));
          const out=rt.captureScienceImage({body:b,eye,forward:[0,-1,0],up:[0,0,1],size:256,caption:'STARFALL IMAGER · MODEL TEST'});
          if(!out.image.startsWith('data:image/')||out.bytes<1500||out.width!==256)throw Error('Offscreen image data not produced');
          const image=new Image();image.src=out.image;await image.decode();
          const cv=document.createElement('canvas');cv.width=256;cv.height=256;const ctx=cv.getContext('2d');
          ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,256,256).data;
          const pixels=new Set();for(let i=1000;i<d.length;i+=517) pixels.add(d[i]+','+d[i+1]+','+d[i+2]);
          if(pixels.size<7)throw Error('Captured scene appears blank or uniform');
          return {mime:out.mime,bytes:out.bytes,colorSamples:pixels.size};
        }""")
        assert photo['bytes']>1500
        page.locator('#imaging7f-open').evaluate('(el)=>el.click()')
        assert page.locator('#imaging7f').evaluate('(el)=>!el.hidden')
        assert 'Camera' in page.locator('#imaging7f-title').inner_text()
        page.locator('#imaging7f-close').click()
        assert page.locator('#imaging7f').evaluate('(el)=>el.hidden')
        # Exercise a rover camera through the real UI, render target and IndexedDB.
        # Only the radio availability of the fixture is stubbed: the world pixels are
        # rendered by the production offscreen WebGL2 renderer, not supplied by a mock.
        page.evaluate("""()=>{
          const rt=window.StarfallRuntime,b=rt.nearest,launch=window.StarfallLaunchUI;
          launch.store.rovers.push({id:'test-photo-rover',bodyId:b.id,systemId:b.systemId,
            local:[0,1,0],heading:0,batteryJ:2e7,records:[],commands:[],index:0,remaining:0,status:'parked',lastS:rt.time});
          const old=launch.remoteLink;launch.remoteLink=(r,t)=>r.id==='test-photo-rover'
            ?{connected:true,quality:1,delayS:.001}:old(r,t);
        }""")
        page.locator('#imaging7f-open').evaluate('(el)=>el.click()')
        page.locator('#imaging7f-source').select_option('remote:test-photo-rover')
        page.locator('#imaging7f-mode').select_option('forward')
        page.locator('#imaging7f-resolution').select_option('256')
        page.locator('#imaging7f-request').click()
        page.evaluate("""()=>{
          const rt=window.StarfallRuntime,i=window.StarfallImagingUI7F;
          i.tick(1);window.STARFALL_DEBUG.setSimulationTime(rt.time+1);i.tick(1);
        }""")
        page.wait_for_function('window.StarfallImagingUI7F.store.photos.length===1',timeout=45000)
        assert page.evaluate("""async()=>{
          const p=window.StarfallImagingUI7F.store.photos[0];
          const db=await new Promise((ok,no)=>{const r=indexedDB.open('starfall-7f-images-v1',1);r.onsuccess=()=>ok(r.result);r.onerror=no;});
          const rec=await new Promise((ok,no)=>{const r=db.transaction('images').objectStore('images').get(p.id);r.onsuccess=()=>ok(r.result);r.onerror=no;});
          return p.sourceType==='rover' && rec?.image?.startsWith('data:image/')&&rec?.thumbnail?.startsWith('data:image/');
        }"""),'Real rover photo and one-time thumbnail must be stored in IndexedDB'
        for _ in range(12):
            if page.evaluate("window.StarfallImagingUI7F.store.photos[0].status")=='downlinked':
                break
            page.evaluate("""()=>{window.STARFALL_DEBUG.setSimulationTime(window.StarfallRuntime.time+12);window.StarfallImagingUI7F.tick(12);}""")
        assert page.evaluate("window.StarfallImagingUI7F.store.photos[0].status")=='downlinked'
        page.locator('#imaging7f-list .im7f-card').first.evaluate('(el)=>el.click()')
        page.wait_for_function("document.getElementById('imaging7f-photo').src.startsWith('data:image/')",timeout=10000)
        page.evaluate('window.StarfallImagingUI7F.refresh()')
        page.wait_for_selector('#imaging7f-list .im7f-thumb',timeout=10000)
        assert page.locator('#imaging7f-list .im7f-thumb').count()==1
        # Authoritative orbit coordinates must produce a second genuine world image.
        satellite=page.evaluate("""()=>{
          const rt=window.StarfallRuntime,b=rt.nearest,X=window.StarfallLaunch,
            unit=window.StarfallPhysics.SCENE_METERS_PER_UNIT;
          const mu=(b.gravity||1)*9.80665*Math.pow(b.radius*unit,2),t=rt.time;
          const sat={id:'test-camera-satellite',bodyId:b.id,systemId:b.systemId,
            altitudeM:180000,epochS:t,phase:0,axis:[0,1,0],mu,kind:'observatory',powerJ:5e6};
          const q=X.orbit(sat,b,t,unit),f=b.position.map((x,i)=>x-q.position[i]),n=Math.hypot(...f);
          const shot=rt.captureScienceImage({body:b,eye:q.position,forward:f.map(v=>v/n),
            up:[0,1,0],size:256,wide:true,caption:'STARFALL ORBITAL IMAGER'});
          return {bytes:shot.bytes,mime:shot.mime,period:q.periodS};
        }""")
        assert satellite['bytes']>1500 and satellite['period']>0
        page.reload(wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('!!window.StarfallImagingUI7F?.store',timeout=90000)
        assert page.evaluate('window.StarfallImagingUI7F.store.photos.length')==1
        assert page.evaluate('window.StarfallImagingUI7F.store.photos[0].status')=='downlinked'
        print('PASS 7F rover photograph + IDB thumbnail + bandwidth downlink + reload and orbit-camera scene:',satellite)
        assert not any('StarfallImaging' in e for e in errors),errors[:5]
        print('PASS 7F: actual 256px WebGL2 offscreen world render, encoded diverse pixels, mission camera UI open/close ·',photo)
    finally:
        browser.close()
