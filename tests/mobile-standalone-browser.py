#!/usr/bin/env python3
"""Real offline mobile Chromium smoke with touchscreen and landscape/portrait assertions."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL-MOBILE.html').as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-gpu-sandbox'])
 ctx=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2)
 page=ctx.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='domcontentloaded',timeout=90000)
 page.locator('#sfmobile-hud').wait_for(state='visible',timeout=30000)
 assert page.locator('[data-control="KeyW"]').count()==1
 assert page.locator('[data-mobile-key="KeyX"]').count()==1
 assert page.locator('[data-mobile-key="KeyB"]').count()==1
 assert page.locator('[data-mobile-key="KeyI"]').count()==1
 assert page.locator('#sfmobile-rotate').is_hidden()
 assert page.locator('[data-mobile-key="KeyX"]').evaluate("(e)=>getComputedStyle(e).userSelect")=='none'
 page.evaluate("""()=>{window.__touchCodes=[];window.addEventListener('keydown',e=>window.__touchCodes.push(e.code),{capture:true})}""")
 page.locator('[data-mobile-key="KeyT"]').dispatch_event('pointerdown',{'pointerId':31,'pointerType':'touch','button':0})
 assert 'KeyT' in page.evaluate('window.__touchCodes')
 page.locator('[data-mobile-action="hide"]').dispatch_event('pointerdown',{'pointerId':32,'pointerType':'touch','button':0})
 assert 'sfm-compact' in page.locator('#sfmobile-hud').get_attribute('class')
 page.locator('[data-mobile-action="hide"]').dispatch_event('pointerdown',{'pointerId':33,'pointerType':'touch','button':0})
 assert 'sfm-compact' not in page.locator('#sfmobile-hud').get_attribute('class')
 page.set_viewport_size({'width':390,'height':844})
 assert page.locator('#sfmobile-rotate').is_visible()
 assert page.locator('#sfmobile-hud').is_hidden()
 assert not errors,errors[:3]
 ctx.close();browser.close()
print('PASS: real offline mobile Chromium, landscape touch dispatch, text deselection, portrait guidance')
