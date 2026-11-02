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
        page.wait_for_function('!!(window.StarfallRuntime?.captureScienceImage && window.StarfallImagingUI7F?.store && window.StarfallImaging7F)',timeout=90000)
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
        page.locator('#imaging7f-open').click()
        assert page.locator('#imaging7f').evaluate('(el)=>!el.hidden')
        assert 'Camera' in page.locator('#imaging7f-title').inner_text()
        page.locator('#imaging7f-close').click()
        assert page.locator('#imaging7f').evaluate('(el)=>el.hidden')
        assert not any('StarfallImaging' in e for e in errors),errors[:5]
        print('PASS 7F: actual 256px WebGL2 offscreen world render, encoded diverse pixels, mission camera UI open/close ·',photo)
    finally:
        browser.close()
